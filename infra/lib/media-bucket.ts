import * as iam from "aws-cdk-lib/aws-iam";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as cdk from "aws-cdk-lib/core";
import { Construct } from "constructs";

/**
 * 3층: 사진 저장소(S3).
 * 버킷은 완전히 비공개. 사진은 사이트용 CloudFront 의 /uploads/* 를 통해서만 공개된다 (cdn.ts)
 * 쓰기는 cms 의 작업 역할만 (cms-service.ts)
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

    // CloudFront(OAC)의 읽기 허용. 보통은 CDK 가 "이 배포 ID 만"으로 자동으로 쓰지만,
    // CloudFront 는 앱 스택에 있어서 여기서 배포 ID 를 참조하면 두 스택이 서로를 기다리는 순환이 된다
    // → "이 계정의 CloudFront 가, uploads/ 아래만 읽기"로 직접 쓴다
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
