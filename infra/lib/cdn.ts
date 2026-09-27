import * as cloudfront from "aws-cdk-lib/aws-cloudfront";
import * as origins from "aws-cdk-lib/aws-cloudfront-origins";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import type * as elbv2 from "aws-cdk-lib/aws-elasticloadbalancingv2";
import type * as s3 from "aws-cdk-lib/aws-s3";
import * as cr from "aws-cdk-lib/custom-resources";
import { Construct } from "constructs";

/**
 * 1층: 입구 (CloudFront 2개). 도메인은 쓰지 않고 CloudFront 가 주는 주소(xxxx.cloudfront.net)와 인증서(HTTPS)를 쓴다.
 *   사이트용  : https://<site>/          → ALB:80   → web
 *               https://<site>/uploads/* → S3 (사진)
 *   관리자용  : https://<admin>/         → ALB:1337 → cms
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

    // 헤더·쿠키·쿼리를 모두 앱에 전달한다(캐시는 하지 않음).
    // CloudFront-Forwarded-Proto(브라우저가 HTTPS 로 왔다는 표시)는 Strapi 가 로그인 쿠키에 Secure 를 붙이는 데 쓴다
    const forwardAll = new cloudfront.OriginRequestPolicy(this, "ForwardAll", {
      headerBehavior: cloudfront.OriginRequestHeaderBehavior.all(
        "CloudFront-Forwarded-Proto",
      ),
      cookieBehavior: cloudfront.OriginRequestCookieBehavior.all(),
      queryStringBehavior: cloudfront.OriginRequestQueryStringBehavior.all(),
    });
    // VPC Origin: 인터넷에 공개하지 않은 ALB 에 CloudFront 가 VPC 안으로 직접 들어간다
    const albOrigin = (httpPort: number) =>
      origins.VpcOrigin.withApplicationLoadBalancer(props.alb, {
        httpPort,
        protocolPolicy: cloudfront.OriginProtocolPolicy.HTTP_ONLY, // VPC 안에서는 HTTP
      });

    this.site = new cloudfront.Distribution(this, "Site", {
      comment: "site (Next.js)",
      defaultBehavior: {
        origin: albOrigin(80),
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        cachePolicy: cloudfront.CachePolicy.CACHING_DISABLED, // 요청마다 서버에서 만든다(04장)
        originRequestPolicy: forwardAll,
      },
      additionalBehaviors: {
        "/uploads/*": {
          // OAC: 버킷은 비공개로 두고, 이 CloudFront 만 서명된 요청으로 읽을 수 있게 한다
          origin: origins.S3BucketOrigin.withOriginAccessControl(
            props.mediaBucket,
          ),
          viewerProtocolPolicy:
            cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
          cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED, // 사진은 캐시한다
          // 관리자 화면(다른 주소)에서 사진을 스크립트로 읽을 때(미디어 라이브러리 등)를 위해 CORS 를 허용
          responseHeadersPolicy:
            cloudfront.ResponseHeadersPolicy.CORS_ALLOW_ALL_ORIGINS,
        },
      },
    });

    this.admin = new cloudfront.Distribution(this, "Admin", {
      comment: "admin (Strapi)",
      defaultBehavior: {
        origin: albOrigin(1337),
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        allowedMethods: cloudfront.AllowedMethods.ALLOW_ALL, // 관리자 화면은 저장·업로드(POST 등)를 한다
        cachePolicy: cloudfront.CachePolicy.CACHING_DISABLED,
        originRequestPolicy: forwardAll,
      },
    });

    // ALB 는 "CloudFront 에서 온 것"만 받는다. VPC Origin 이 만드는 전용 보안 그룹을 배포 중에 조회해 허용한다
    // (AWS 문서의 방법. 이 보안 그룹의 ID 는 CloudFormation 으로 바로 얻을 수 없다)
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
    lookup.node.addDependency(this.site, this.admin); // CloudFront 를 만든 뒤에 조회
    const vpcOriginSg = ec2.SecurityGroup.fromSecurityGroupId(
      this,
      "VpcOriginSg",
      lookup.getResponseField("SecurityGroups.0.GroupId"),
    );
    props.alb.connections.allowFrom(
      vpcOriginSg,
      ec2.Port.tcp(80),
      "CloudFront -> web",
    );
    props.alb.connections.allowFrom(
      vpcOriginSg,
      ec2.Port.tcp(1337),
      "CloudFront -> cms",
    );
  }
}
