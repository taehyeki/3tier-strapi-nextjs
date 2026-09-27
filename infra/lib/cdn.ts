import * as cloudfront from "aws-cdk-lib/aws-cloudfront";
import * as origins from "aws-cdk-lib/aws-cloudfront-origins";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import type * as elbv2 from "aws-cdk-lib/aws-elasticloadbalancingv2";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as cdk from "aws-cdk-lib/core";
import * as cr from "aws-cdk-lib/custom-resources";
import { Construct } from "constructs";

/**
 * 1層: 入口(CloudFront 2個)。ドメインは使わず、CloudFront が発行するアドレス(xxxx.cloudfront.net)と証明書(HTTPS)を使う。
 *   サイト用  : https://<site>/          → ALB:80   → web
 *               https://<site>/uploads/* → S3(写真)
 *   管理者用  : https://<admin>/         → ALB:1337 → cms
 */
export class Cdn extends Construct {
  readonly site: cloudfront.Distribution;
  readonly admin: cloudfront.Distribution;

  constructor(
    scope: Construct,
    id: string,
    props: {
      vpc: ec2.IVpc;
      alb: elbv2.IApplicationLoadBalancer;
      mediaBucket: s3.IBucket;
    },
  ) {
    super(scope, id);

    // ヘッダー・クッキー・クエリをすべてアプリに転送する(キャッシュはしない)。
    // CloudFront-Forwarded-Proto(ブラウザが HTTPS で来たという印)は、Strapi がログインクッキーに Secure を付けるのに使う
    const forwardAll = new cloudfront.OriginRequestPolicy(this, "ForwardAll", {
      headerBehavior: cloudfront.OriginRequestHeaderBehavior.all(
        "CloudFront-Forwarded-Proto",
      ),
      cookieBehavior: cloudfront.OriginRequestCookieBehavior.all(),
      queryStringBehavior: cloudfront.OriginRequestQueryStringBehavior.all(),
    });
    // VPC Origin: インターネットに公開していない ALB に、CloudFront が VPC の中へ直接入っていく
    const albOrigin = (httpPort: number) =>
      origins.VpcOrigin.withApplicationLoadBalancer(props.alb, {
        httpPort,
        protocolPolicy: cloudfront.OriginProtocolPolicy.HTTP_ONLY, // VPC の中では HTTP
      });

    this.site = new cloudfront.Distribution(this, "Site", {
      comment: "site (Next.js)",
      defaultBehavior: {
        origin: albOrigin(80),
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        cachePolicy: cloudfront.CachePolicy.CACHING_DISABLED, // リクエストのたびにサーバーで作る(04章)
        originRequestPolicy: forwardAll,
      },
      additionalBehaviors: {
        "/uploads/*": {
          // OAC: バケットは非公開のまま、この CloudFront だけが署名付きリクエストで読めるようにする
          // バケットポリシーはデータスタックが直接書く(media-bucket.ts)。ここでは参照だけ渡してポリシーには触れない
          origin: origins.S3BucketOrigin.withOriginAccessControl(
            s3.Bucket.fromBucketAttributes(this, "MediaRef", {
              bucketName: props.mediaBucket.bucketName,
              bucketRegionalDomainName:
                props.mediaBucket.bucketRegionalDomainName,
            }),
          ),
          viewerProtocolPolicy:
            cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
          cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED, // 写真はキャッシュする
          // 管理画面(別アドレス)から写真をスクリプトで読む場合(メディアライブラリなど)のために CORS を許可
          responseHeadersPolicy:
            cloudfront.ResponseHeadersPolicy.CORS_ALLOW_ALL_ORIGINS,
        },
      },
    });

    // 上で参照だけ渡したバケットについて、CDK が「ポリシーは自分で直せ」と警告する → media-bucket.ts で直したので確認済みにする
    cdk.Annotations.of(this).acknowledgeWarning(
      "@aws-cdk/aws-cloudfront-origins:updateImportedBucketPolicyOac",
      "bucket policy for OAC is written in the data stack (media-bucket.ts)",
    );

    this.admin = new cloudfront.Distribution(this, "Admin", {
      comment: "admin (Strapi)",
      defaultBehavior: {
        origin: albOrigin(1337),
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        allowedMethods: cloudfront.AllowedMethods.ALLOW_ALL, // 管理画面は保存・アップロード(POST など)を行う
        cachePolicy: cloudfront.CachePolicy.CACHING_DISABLED,
        originRequestPolicy: forwardAll,
      },
    });

    // ALB は「CloudFront から来たもの」だけを受け付ける。VPC Origin が作る専用セキュリティグループをデプロイ中に検索して許可する
    // (AWS 公式ドキュメントの方法。このセキュリティグループの ID は CloudFormation から直接は取得できない)
    const lookup = new cr.AwsCustomResource(this, "VpcOriginSgLookup", {
      onUpdate: {
        service: "ec2",
        action: "describeSecurityGroups",
        parameters: {
          Filters: [
            { Name: "vpc-id", Values: [props.vpc.vpcId] },
            {
              Name: "group-name",
              Values: ["CloudFront-VPCOrigins-Service-SG"],
            },
          ],
        },
        physicalResourceId: cr.PhysicalResourceId.of(
          "CloudFront-VPCOrigins-Service-SG",
        ),
      },
      policy: cr.AwsCustomResourcePolicy.fromSdkCalls({
        resources: cr.AwsCustomResourcePolicy.ANY_RESOURCE,
      }),
    });
    lookup.node.addDependency(this.site, this.admin); // CloudFront を作った後に検索する
    const vpcOriginSg = ec2.SecurityGroup.fromSecurityGroupId(
      this,
      "VpcOriginSg",
      lookup.getResponseField("SecurityGroups.0.GroupId"),
    );
    props.alb.connections.allowFrom(
      vpcOriginSg,
      ec2.Port.tcp(80),
      "from CloudFront to web",
    );
    props.alb.connections.allowFrom(
      vpcOriginSg,
      ec2.Port.tcp(1337),
      "from CloudFront to cms",
    );
  }
}
