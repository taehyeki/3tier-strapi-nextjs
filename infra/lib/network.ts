import * as ec2 from "aws-cdk-lib/aws-ec2";
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

    this.vpc = new ec2.Vpc(this, "Vpc", {
      maxAzs: 2, // ALB 는 AZ 2개 이상이 필요
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
