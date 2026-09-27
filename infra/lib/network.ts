import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as cdk from "aws-cdk-lib/core";
import { Construct } from "constructs";

/**
 * ネットワーク(VPC)。サブネットを役割ごとに3種類に分ける。
 *   public: NAT Gateway だけを置く(アプリが AWS サービス・外部に出るときの出口)
 *   app   : ALB・ECS。外へは出られるが、外からは入ってこられない
 *   db    : Aurora。インターネットへの経路そのものがない
 */
export class Network extends Construct {
  readonly vpc: ec2.Vpc;

  constructor(scope: Construct, id: string) {
    super(scope, id);

    const { region } = cdk.Stack.of(this);
    this.vpc = new ec2.Vpc(this, "Vpc", {
      // ALB には AZ が2つ以上必要。コードに書いておけば、CDK が AWS に AZ 一覧を問い合わせない
      // (問い合わせるとアカウント ID の入った cdk.context.json ができてしまう)。東京の AZ は a・c・d
      availabilityZones: [`${region}a`, `${region}c`],
      natGateways: 1, // コストを抑えるため1個(研修用)
      subnetConfiguration: [
        { name: "public", subnetType: ec2.SubnetType.PUBLIC },
        { name: "app", subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
        { name: "db", subnetType: ec2.SubnetType.PRIVATE_ISOLATED },
      ],
      // S3 との通信は NAT を経由させない(無料。画像取得・写真アップロードのデータ料金を節約)
      gatewayEndpoints: {
        s3: { service: ec2.GatewayVpcEndpointAwsService.S3 },
      },
    });
  }
}
