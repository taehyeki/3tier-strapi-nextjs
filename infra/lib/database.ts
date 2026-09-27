import type * as ec2 from "aws-cdk-lib/aws-ec2";
import * as rds from "aws-cdk-lib/aws-rds";
import type * as secretsmanager from "aws-cdk-lib/aws-secretsmanager";
import * as cdk from "aws-cdk-lib/core";
import { Construct } from "constructs";

/**
 * 3층: DB (Aurora Serverless v2 PostgreSQL).
 * 접속 정보(host, port, dbname, username, password)는 Secrets Manager 의 시크릿 하나에 JSON 으로 만들어진다 → `secret`
 */
export class Database extends Construct {
  readonly cluster: rds.DatabaseCluster;
  readonly secret: secretsmanager.ISecret;

  constructor(scope: Construct, id: string, props: { vpc: ec2.IVpc }) {
    super(scope, id);

    const engine = rds.DatabaseClusterEngine.auroraPostgres({
      // 로컬(postgres:17)과 같은 메이저. 마이너 버전은 Aurora 가 자동으로 올린다
      version: rds.AuroraPostgresEngineVersion.of("17.10", "17"),
    });

    this.cluster = new rds.DatabaseCluster(this, "Cluster", {
      engine,
      // 암호화하지 않은 접속은 거부한다 (Aurora PostgreSQL 의 기본값은 허용)
      parameterGroup: new rds.ParameterGroup(this, "Params", {
        engine,
        parameters: { "rds.force_ssl": "1" },
      }),
      writer: rds.ClusterInstance.serverlessV2("writer"),
      serverlessV2MinCapacity: 0.5,
      serverlessV2MaxCapacity: 2,
      // 사용자 이름만 정하고, 비밀번호는 Secrets Manager 가 무작위로 만든다
      credentials: rds.Credentials.fromGeneratedSecret("strapi"),
      defaultDatabaseName: "strapi",
      vpc: props.vpc,
      vpcSubnets: { subnetGroupName: "db" },
      storageEncrypted: true,
      removalPolicy: cdk.RemovalPolicy.SNAPSHOT, // 스택을 지워도 마지막 스냅샷은 남긴다
    });

    this.secret = this.cluster.secret as secretsmanager.ISecret;
  }
}
