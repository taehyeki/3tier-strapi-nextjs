import * as ecs from "aws-cdk-lib/aws-ecs";
import * as cdk from "aws-cdk-lib/core";
import type { Construct } from "constructs";
import { AppSecrets } from "./app-secrets";
import { Cdn } from "./cdn";
import { CmsService } from "./cms-service";
import { Database } from "./database";
import { LoadBalancer } from "./load-balancer";
import { MediaBucket } from "./media-bucket";
import { Network } from "./network";
import { WebService } from "./web-service";

/**
 * 3층 구성 전체를 조립한다. 각 층의 내용은 같은 폴더의 파일에 있다.
 *   1층(입구): cdn.ts(CloudFront ×2) → load-balancer.ts(내부 ALB)
 *   2층(앱)  : web-service.ts(Next.js) / cms-service.ts(Strapi)
 *   3층(저장): database.ts(Aurora) / media-bucket.ts(S3)
 *   공통     : network.ts(VPC) / app-secrets.ts(Secrets Manager) / app-image.ts(Docker 이미지)
 */
export class AppStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const { vpc } = new Network(this, "Network");
    const database = new Database(this, "Database", { vpc });
    const media = new MediaBucket(this, "Media");
    const secrets = new AppSecrets(this, "Secrets");
    const lb = new LoadBalancer(this, "LoadBalancer", { vpc });
    const cdn = new Cdn(this, "Cdn", {
      vpc,
      alb: lb.alb,
      mediaBucket: media.bucket,
    });

    const cluster = new ecs.Cluster(this, "Cluster", { vpc });
    new CmsService(this, "Cms", {
      cluster,
      listener: lb.cmsListener,
      database,
      secrets,
      mediaBucket: media.bucket,
      adminDomain: cdn.admin.distributionDomainName,
      siteDomain: cdn.site.distributionDomainName,
    });
    const web = new WebService(this, "Web", {
      cluster,
      alb: lb.alb,
      listener: lb.webListener,
      apiToken: secrets.apiToken,
    });

    // 배포 후에 쓰는 값 (Actions 로그와 CloudFormation 콘솔의 "출력"에 표시된다)
    new cdk.CfnOutput(this, "SiteUrl", {
      value: `https://${cdn.site.distributionDomainName}`,
    });
    new cdk.CfnOutput(this, "AdminUrl", {
      value: `https://${cdn.admin.distributionDomainName}/admin`,
    });
    new cdk.CfnOutput(this, "ApiTokenSecretName", {
      value: secrets.apiToken.secretName,
    });
    new cdk.CfnOutput(this, "ClusterName", { value: cluster.clusterName });
    new cdk.CfnOutput(this, "WebServiceName", {
      value: web.service.serviceName,
    });
  }
}
