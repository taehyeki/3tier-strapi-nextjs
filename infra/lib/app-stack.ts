import * as ecs from "aws-cdk-lib/aws-ecs";
import * as cdk from "aws-cdk-lib/core";
import type { Construct } from "constructs";
import { Cdn } from "./cdn";
import { CmsService } from "./cms-service";
import type { DataStack } from "./data-stack";
import { LoadBalancer } from "./load-balancer";
import { WebService } from "./web-service";

/**
 * アプリスタック: 状態を持たないもの(消してもまた作れるもの)。デプロイのたびに変わる側。
 *   1層(入口): cdn.ts(CloudFront ×2) → load-balancer.ts(内部 ALB)
 *   2層(アプリ): web-service.ts(Next.js) / cms-service.ts(Strapi)。イメージは CI が ECR に上げたもの(app-image.ts)
 * 3層(DB・写真)と VPC・シークレットはデータスタック(data-stack.ts)から受け取る
 */
export class AppStack extends cdk.Stack {
  constructor(
    scope: Construct,
    id: string,
    props: cdk.StackProps & { data: DataStack; imageTag: string },
  ) {
    super(scope, id, props);
    const { vpc, database, mediaBucket, secrets } = props.data;
    const { imageTag } = props;

    const lb = new LoadBalancer(this, "LoadBalancer", { vpc });
    const cdn = new Cdn(this, "Cdn", { vpc, alb: lb.alb, mediaBucket });

    const cluster = new ecs.Cluster(this, "Cluster", { vpc });
    new CmsService(this, "Cms", {
      cluster,
      imageTag,
      listener: lb.cmsListener,
      database,
      secrets,
      mediaBucket,
      adminDomain: cdn.admin.distributionDomainName,
      siteDomain: cdn.site.distributionDomainName,
    });
    const web = new WebService(this, "Web", {
      cluster,
      imageTag,
      alb: lb.alb,
      listener: lb.webListener,
      apiToken: secrets.apiToken,
    });

    // デプロイ後に使う値(Actions のログと CloudFormation コンソールの「出力」に表示される)
    new cdk.CfnOutput(this, "SiteUrl", {
      value: `https://${cdn.site.distributionDomainName}`,
    });
    new cdk.CfnOutput(this, "AdminUrl", {
      value: `https://${cdn.admin.distributionDomainName}/admin`,
    });
    new cdk.CfnOutput(this, "ClusterName", { value: cluster.clusterName });
    new cdk.CfnOutput(this, "WebServiceName", {
      value: web.service.serviceName,
    });
  }
}
