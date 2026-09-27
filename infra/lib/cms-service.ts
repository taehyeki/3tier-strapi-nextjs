import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as ecs from "aws-cdk-lib/aws-ecs";
import * as elbv2 from "aws-cdk-lib/aws-elasticloadbalancingv2";
import * as logs from "aws-cdk-lib/aws-logs";
import type * as s3 from "aws-cdk-lib/aws-s3";
import * as cdk from "aws-cdk-lib/core";
import { Construct } from "constructs";
import { appImage } from "./app-image";
import type { AppSecrets } from "./app-secrets";
import type { Database } from "./database";

/**
 * 2層: cms(Strapi)コンテナ。
 * ローカルの apps/cms/.env にあった値を、ここで「環境変数」として渡す:
 *   environment = 秘密でない値(そのままタスク定義に書かれる)
 *   secrets     = 秘密の値(タスク定義には Secrets Manager の場所だけが書かれ、起動時に ECS が値を取り出して入れる)
 * Strapi はローカルと同じく env("DATABASE_HOST") などで読む(config/*.ts, config/env/production/*.ts)
 */
export class CmsService extends Construct {
  readonly service: ecs.FargateService;

  constructor(
    scope: Construct,
    id: string,
    props: {
      cluster: ecs.ICluster;
      /** 本番に載せるイメージのタグ(コミット SHA) */
      imageTag: string;
      listener: elbv2.ApplicationListener;
      database: Database;
      secrets: AppSecrets;
      mediaBucket: s3.IBucket;
      /** 管理画面の公開アドレス(管理者用 CloudFront) */
      adminDomain: string;
      /** 写真の公開アドレス(サイト用 CloudFront) */
      siteDomain: string;
    },
  ) {
    super(scope, id);
    const db = props.database.secret;

    const task = new ecs.FargateTaskDefinition(this, "Task", {
      cpu: 512,
      memoryLimitMiB: 1024,
      runtimePlatform: {
        cpuArchitecture: ecs.CpuArchitecture.ARM64,
        operatingSystemFamily: ecs.OperatingSystemFamily.LINUX,
      },
    });
    task.addContainer("cms", {
      image: appImage(this, "cms", props.imageTag),
      portMappings: [{ containerPort: 1337 }],
      environment: {
        DATABASE_CLIENT: "postgres",
        // DB に SSL で接続する。サーバー証明書はイメージに入れた AWS 証明書バンドルで検証(apps/cms/Dockerfile)
        DATABASE_SSL: "true",
        PUBLIC_URL: `https://${props.adminDomain}`,
        MEDIA_BASE_URL: `https://${props.siteDomain}`,
        MEDIA_HOST: props.siteDomain,
        MEDIA_BUCKET: props.mediaBucket.bucketName,
        AWS_REGION: cdk.Stack.of(this).region,
      },
      secrets: {
        // DB 接続情報: Aurora が作ったシークレット(JSON)の各項目
        DATABASE_HOST: ecs.Secret.fromSecretsManager(db, "host"),
        DATABASE_PORT: ecs.Secret.fromSecretsManager(db, "port"),
        DATABASE_NAME: ecs.Secret.fromSecretsManager(db, "dbname"),
        DATABASE_USERNAME: ecs.Secret.fromSecretsManager(db, "username"),
        DATABASE_PASSWORD: ecs.Secret.fromSecretsManager(db, "password"),
        // Strapi の鍵たち(app-secrets.ts)
        ...props.secrets.strapiKeys,
      },
      logging: ecs.LogDrivers.awsLogs({
        streamPrefix: "cms",
        logGroup: new logs.LogGroup(this, "Logs", {
          retention: logs.RetentionDays.ONE_WEEK,
          removalPolicy: cdk.RemovalPolicy.DESTROY,
        }),
      }),
    });
    // 写真のアップロード・削除の権限。コードに認証情報はなく、このロール(タスクロール)を AWS SDK が自動で使う
    props.mediaBucket.grantReadWrite(task.taskRole);

    this.service = new ecs.FargateService(this, "Service", {
      cluster: props.cluster,
      taskDefinition: task,
      desiredCount: 1,
      minHealthyPercent: 100, // 新しいバージョンが立ち上がってから旧バージョンを落とす(デプロイ中も止めない)
      vpcSubnets: { subnetGroupName: "app" },
      circuitBreaker: { enable: true, rollback: true }, // 新バージョンが立ち上がらなければ自動で旧バージョンに戻す
      healthCheckGracePeriod: cdk.Duration.minutes(3), // Strapi は初回起動(テーブル作成)が遅い
    });

    // cms → DB(5432)を許可。DB のセキュリティグループはデータスタック側にあるので、ルールはこのスタックで作る
    // (データスタック側に作ると、データ → アプリの参照が生まれ、2つのスタックが互いを待つ循環になる)
    const dbConnections = props.database.cluster.connections;
    ec2.SecurityGroup.fromSecurityGroupId(
      this,
      "DbSecurityGroup",
      dbConnections.securityGroups[0].securityGroupId,
    ).addIngressRule(
      this.service.connections.securityGroups[0],
      dbConnections.defaultPort as ec2.Port,
      "from cms",
    );
    props.listener.addTargets("Cms", {
      port: 1337,
      protocol: elbv2.ApplicationProtocol.HTTP,
      targets: [this.service],
      healthCheck: { path: "/_health", healthyHttpCodes: "204" },
      deregistrationDelay: cdk.Duration.seconds(10),
    });
  }
}
