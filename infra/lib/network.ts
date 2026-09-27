import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as cdk from "aws-cdk-lib/core";
import { Construct } from "constructs";

/**
 * 네트워크(VPC). 서브넷을 역할별로 3종류로 나눈다.
 *   public: NAT Gateway 만 둔다 (앱이 AWS 서비스·외부로 나갈 때의 출구)
 *   app   : ALB·ECS. 밖으로 나갈 수는 있지만 밖에서 들어올 수는 없다
 *   db    : Aurora. 인터넷으로 가는 경로 자체가 없다
 */
export class Network extends Construct {
  readonly vpc: ec2.Vpc;

  constructor(scope: Construct, id: string) {
    super(scope, id);

    const { region } = cdk.Stack.of(this);
    this.vpc = new ec2.Vpc(this, "Vpc", {
      // ALB 는 AZ 2개 이상이 필요. 코드에 적어 두면 CDK 가 AWS 에 AZ 목록을 묻지 않는다
      // (물으면 계정 ID 가 들어간 cdk.context.json 이 생긴다). 도쿄의 AZ 는 a·c·d
      availabilityZones: [`${region}a`, `${region}c`],
      natGateways: 1, // 비용을 줄이기 위해 1개 (연수용)
      subnetConfiguration: [
        { name: "public", subnetType: ec2.SubnetType.PUBLIC },
        { name: "app", subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
        { name: "db", subnetType: ec2.SubnetType.PRIVATE_ISOLATED },
      ],
      // S3 통신은 NAT 를 거치지 않게 한다 (무료. 이미지 받기·사진 업로드의 데이터 요금 절약)
      gatewayEndpoints: {
        s3: { service: ec2.GatewayVpcEndpointAwsService.S3 },
      },
    });
  }
}
