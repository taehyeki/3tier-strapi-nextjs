import * as iam from "aws-cdk-lib/aws-iam";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as cdk from "aws-cdk-lib/core";
import { Construct } from "constructs";

/**
 * 3層: 写真の保管場所(S3)。
 * バケットは完全に非公開。写真はサイト用 CloudFront の /uploads/* を通してだけ公開される(cdn.ts)
 * 書き込みは cms のタスクロールだけ(cms-service.ts)
 */
export class MediaBucket extends Construct {
  readonly bucket: s3.Bucket;

  constructor(scope: Construct, id: string) {
    super(scope, id);

    this.bucket = new s3.Bucket(this, "Bucket", {
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      enforceSSL: true,
      encryption: s3.BucketEncryption.S3_MANAGED,
      removalPolicy: cdk.RemovalPolicy.DESTROY, // 研修用: スタックと一緒に削除
      autoDeleteObjects: true,
    });

    // CloudFront(OAC)の読み取りを許可する。普段は CDK が「この配信 ID だけ」で自動的に書いてくれるが、
    // CloudFront はアプリスタック側にあるため、ここで配信 ID を参照すると2つのスタックが互いを待つ循環になる
    // → 「このアカウントの CloudFront が、uploads/ 配下だけ読める」という形で直接書く
    this.bucket.addToResourcePolicy(
      new iam.PolicyStatement({
        principals: [new iam.ServicePrincipal("cloudfront.amazonaws.com")],
        actions: ["s3:GetObject"],
        resources: [this.bucket.arnForObjects("uploads/*")],
        conditions: {
          StringEquals: { "AWS:SourceAccount": cdk.Stack.of(this).account },
        },
      }),
    );
  }
}
