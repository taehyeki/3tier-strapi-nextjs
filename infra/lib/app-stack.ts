import * as ecs from "aws-cdk-lib/aws-ecs";
import * as cdk from "aws-cdk-lib/core";
import type { Construct } from "constructs";
import { Cdn } from "./cdn";
import { CmsService } from "./cms-service";
import type { DataStack } from "./data-stack";
import { LoadBalancer } from "./load-balancer";
import { WebService } from "./web-service";

/**
 * 앱 스택: 상태가 없는 것(지우고 다시 만들어도 되는 것). 배포할 때마다 바뀌는 쪽.
 *   1층(입구): cdn.ts(CloudFront ×2) → load-balancer.ts(내부 ALB)
 *   2층(앱)  : web-service.ts(Next.js) / cms-service.ts(Strapi). 이미지는 CI 가 ECR 에 올린 것(app-image.ts)
 * 3층(DB·사진)과 VPC·시크릿은 데이터 스택(data-stack.ts)에서 받는다
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

    // 배포 후에 쓰는 값 (Actions 로그와 CloudFormation 콘솔의 "출력"에 표시된다)
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
