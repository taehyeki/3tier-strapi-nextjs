import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as ecs from "aws-cdk-lib/aws-ecs";
import * as elbv2 from "aws-cdk-lib/aws-elasticloadbalancingv2";
import * as logs from "aws-cdk-lib/aws-logs";
import type * as secretsmanager from "aws-cdk-lib/aws-secretsmanager";
import * as cdk from "aws-cdk-lib/core";
import { Construct } from "constructs";
import { appImage } from "./app-image";

/**
 * 2층: web (Next.js) 컨테이너.
 * 로컬의 apps/web/.env.local 에 있던 값을 여기서 환경변수로 넣는다.
 * Next.js 서버는 로컬과 똑같이 process.env.STRAPI_URL / STRAPI_API_TOKEN 으로 읽는다 (src/lib/strapi.ts)
 */
export class WebService extends Construct {
  readonly service: ecs.FargateService;

  constructor(
    scope: Construct,
    id: string,
    props: {
      cluster: ecs.ICluster;
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
      image: appImage("web"),
      portMappings: [{ containerPort: 3000 }],
      environment: {
        // web → cms 는 VPC 안에서 내부 ALB 의 1337 로 (서버끼리의 통신이라 브라우저·CORS 와 무관)
        STRAPI_URL: `http://${props.alb.loadBalancerDnsName}:1337`,
      },
      // 토큰은 Secrets Manager 에서 시작할 때 꺼내 넣는다. 브라우저로는 전달되지 않는다(04장)
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
      "web -> cms",
    );
  }
}
