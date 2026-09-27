import * as s3 from "aws-cdk-lib/aws-s3";
import * as cdk from "aws-cdk-lib/core";
import { Construct } from "constructs";

/**
 * 3층: 사진 저장소(S3).
 * 버킷은 완전히 비공개. 사진은 사이트용 CloudFront 의 /uploads/* 를 통해서만 공개된다 (cdn.ts)
 */
export class MediaBucket extends Construct {
  readonly bucket: s3.Bucket;

  constructor(scope: Construct, id: string) {
    super(scope, id);

    this.bucket = new s3.Bucket(this, "Bucket", {
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      enforceSSL: true,
      encryption: s3.BucketEncryption.S3_MANAGED,
      removalPolicy: cdk.RemovalPolicy.DESTROY, // 연수용: 스택과 함께 삭제
      autoDeleteObjects: true,
    });
  }
}
