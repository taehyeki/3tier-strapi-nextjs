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
 * 2층: cms (Strapi) 컨테이너.
 * 로컬의 apps/cms/.env 에 있던 값을 여기서 "환경변수"로 넣는다:
 *   environment = 비밀이 아닌 값(그대로 작업 정의에 적힌다)
 *   secrets     = 비밀인 값(작업 정의에는 Secrets Manager 의 위치만 적히고, 시작할 때 ECS 가 값을 꺼내 넣는다)
 * Strapi 는 로컬과 똑같이 env("DATABASE_HOST") 등으로 읽는다 (config/*.ts, config/env/production/*.ts)
 */
export class CmsService extends Construct {
  readonly service: ecs.FargateService;

  constructor(
    scope: Construct,
    id: string,
    props: {
      cluster: ecs.ICluster;
      listener: elbv2.ApplicationListener;
      database: Database;
      secrets: AppSecrets;
      mediaBucket: s3.IBucket;
      /** 관리자 화면의 공개 주소 (관리자용 CloudFront) */
      adminDomain: string;
      /** 사진의 공개 주소 (사이트용 CloudFront) */
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
      image: appImage("cms"),
      portMappings: [{ containerPort: 1337 }],
      environment: {
        DATABASE_CLIENT: "postgres",
        // DB 에 SSL 로 접속한다. 서버 인증서는 이미지에 넣은 AWS 인증서 묶음으로 검증 (apps/cms/Dockerfile)
        DATABASE_SSL: "true",
        PUBLIC_URL: `https://${props.adminDomain}`,
        MEDIA_BASE_URL: `https://${props.siteDomain}`,
        MEDIA_HOST: props.siteDomain,
        MEDIA_BUCKET: props.mediaBucket.bucketName,
        AWS_REGION: cdk.Stack.of(this).region,
      },
      secrets: {
        // DB 접속 정보: Aurora 가 만든 시크릿(JSON)의 각 항목
        DATABASE_HOST: ecs.Secret.fromSecretsManager(db, "host"),
        DATABASE_PORT: ecs.Secret.fromSecretsManager(db, "port"),
        DATABASE_NAME: ecs.Secret.fromSecretsManager(db, "dbname"),
        DATABASE_USERNAME: ecs.Secret.fromSecretsManager(db, "username"),
        DATABASE_PASSWORD: ecs.Secret.fromSecretsManager(db, "password"),
        // Strapi 의 키들 (app-secrets.ts)
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
    // 사진 업로드·삭제 권한. 자격 증명은 코드에 없고, 이 역할(작업 역할)을 AWS SDK 가 자동으로 쓴다
    props.mediaBucket.grantReadWrite(task.taskRole);

    this.service = new ecs.FargateService(this, "Service", {
      cluster: props.cluster,
      taskDefinition: task,
      desiredCount: 1,
      minHealthyPercent: 100, // 새 버전이 뜬 뒤에 이전 버전을 내린다 (배포 중에도 끊기지 않게)
      vpcSubnets: { subnetGroupName: "app" },
      circuitBreaker: { enable: true, rollback: true }, // 새 버전이 뜨지 않으면 이전 버전으로 자동 복귀
      healthCheckGracePeriod: cdk.Duration.minutes(3), // Strapi 는 첫 기동(테이블 생성)이 느리다
    });

    props.database.cluster.connections.allowDefaultPortFrom(this.service); // cms → DB(5432)
    props.listener.addTargets("Cms", {
      port: 1337,
      protocol: elbv2.ApplicationProtocol.HTTP,
      targets: [this.service],
      healthCheck: { path: "/_health", healthyHttpCodes: "204" },
      deregistrationDelay: cdk.Duration.seconds(10),
    });
  }
}
