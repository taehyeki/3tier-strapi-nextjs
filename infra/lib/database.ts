import type * as ec2 from "aws-cdk-lib/aws-ec2";
import * as rds from "aws-cdk-lib/aws-rds";
import type * as secretsmanager from "aws-cdk-lib/aws-secretsmanager";
import * as cdk from "aws-cdk-lib/core";
import { Construct } from "constructs";

/**
 * 3層: DB(Aurora Serverless v2 PostgreSQL)。
 * 接続情報(host, port, dbname, username, password)は Secrets Manager のシークレット1つに JSON として作られる → `secret`
 */
export class Database extends Construct {
  readonly cluster: rds.DatabaseCluster;
  readonly secret: secretsmanager.ISecret;

  constructor(scope: Construct, id: string, props: { vpc: ec2.IVpc }) {
    super(scope, id);

    const engine = rds.DatabaseClusterEngine.auroraPostgres({
      // ローカル(postgres:17)と同じメジャーバージョン。マイナーバージョンは Aurora が自動で上げる
      version: rds.AuroraPostgresEngineVersion.of("17.10", "17"),
    });

    this.cluster = new rds.DatabaseCluster(this, "Cluster", {
      engine,
      // 暗号化されていない接続を拒否する(Aurora PostgreSQL の既定値は許可)
      parameterGroup: new rds.ParameterGroup(this, "Params", {
        engine,
        parameters: { "rds.force_ssl": "1" },
      }),
      writer: rds.ClusterInstance.serverlessV2("writer"),
      serverlessV2MinCapacity: 0.5,
      serverlessV2MaxCapacity: 2,
      // ユーザー名だけ決め、パスワードは Secrets Manager がランダムに作る
      credentials: rds.Credentials.fromGeneratedSecret("strapi"),
      defaultDatabaseName: "strapi",
      vpc: props.vpc,
      vpcSubnets: { subnetGroupName: "db" },
      storageEncrypted: true,
      removalPolicy: cdk.RemovalPolicy.SNAPSHOT, // スタックを消しても最後のスナップショットは残す
    });

    this.secret = this.cluster.secret as secretsmanager.ISecret;
  }
}
