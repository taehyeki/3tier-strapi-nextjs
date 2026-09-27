import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as ecs from "aws-cdk-lib/aws-ecs";
import * as elbv2 from "aws-cdk-lib/aws-elasticloadbalancingv2";
import * as logs from "aws-cdk-lib/aws-logs";
import type * as secretsmanager from "aws-cdk-lib/aws-secretsmanager";
import * as cdk from "aws-cdk-lib/core";
import { Construct } from "constructs";
import { appImage } from "./app-image";

/**
 * 2層: web(Next.js)コンテナ。
 * ローカルの apps/web/.env.local にあった値を、ここで環境変数として渡す。
 * Next.js サーバーはローカルと同じく process.env.STRAPI_URL / STRAPI_API_TOKEN で読む(src/lib/strapi.ts)
 */
export class WebService extends Construct {
  readonly service: ecs.FargateService;

  constructor(
    scope: Construct,
    id: string,
    props: {
      cluster: ecs.ICluster;
      /** 本番に載せるイメージのタグ(コミット SHA) */
      imageTag: string;
      alb: elbv2.IApplicationLoadBalancer;
      listener: elbv2.ApplicationListener;
      apiToken: secretsmanager.ISecret;
    },
  ) {
    super(scope, id);

    const task = new ecs.FargateTaskDefinition(this, "Task", {
      cpu: 256,
      memoryLimitMiB: 512,
      runtimePlatform: {
        cpuArchitecture: ecs.CpuArchitecture.ARM64,
        operatingSystemFamily: ecs.OperatingSystemFamily.LINUX,
      },
    });
    task.addContainer("web", {
      image: appImage(this, "web", props.imageTag),
      portMappings: [{ containerPort: 3000 }],
      environment: {
        // web → cms は VPC の中で内部 ALB の 1337 番へ(サーバー同士の通信なのでブラウザ・CORS とは無関係)
        STRAPI_URL: `http://${props.alb.loadBalancerDnsName}:1337`,
      },
      // トークンは Secrets Manager から起動時に取り出して渡す。ブラウザには渡らない(04章)
      secrets: {
        STRAPI_API_TOKEN: ecs.Secret.fromSecretsManager(props.apiToken),
      },
      logging: ecs.LogDrivers.awsLogs({
        streamPrefix: "web",
        logGroup: new logs.LogGroup(this, "Logs", {
          retention: logs.RetentionDays.ONE_WEEK,
          removalPolicy: cdk.RemovalPolicy.DESTROY,
        }),
      }),
    });

    this.service = new ecs.FargateService(this, "Service", {
      cluster: props.cluster,
      taskDefinition: task,
      desiredCount: 1,
      minHealthyPercent: 100,
      vpcSubnets: { subnetGroupName: "app" },
      circuitBreaker: { enable: true, rollback: true },
    });

    props.listener.addTargets("Web", {
      port: 3000,
      protocol: elbv2.ApplicationProtocol.HTTP,
      targets: [this.service],
      healthCheck: { path: "/healthz" }, // apps/web/src/app/healthz/route.ts
      deregistrationDelay: cdk.Duration.seconds(10),
    });
    // web → ALB:1337 → cms
    props.alb.connections.allowFrom(
      this.service,
      ec2.Port.tcp(1337),
      "from web to cms",
    );
  }
}
