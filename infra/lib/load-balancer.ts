import type * as ec2 from "aws-cdk-lib/aws-ec2";
import * as elbv2 from "aws-cdk-lib/aws-elasticloadbalancingv2";
import { Construct } from "constructs";

/**
 * 1層: 内部 ALB。インターネットには公開せず、CloudFront(VPC Origin)と web だけが入ってくる(許可は cdn.ts, web-service.ts)
 * ポートでアプリを分ける: 80 → web(Next.js)、1337 → cms(Strapi)
 */
export class LoadBalancer extends Construct {
  readonly alb: elbv2.ApplicationLoadBalancer;
  readonly webListener: elbv2.ApplicationListener;
  readonly cmsListener: elbv2.ApplicationListener;

  constructor(scope: Construct, id: string, props: { vpc: ec2.IVpc }) {
    super(scope, id);

    this.alb = new elbv2.ApplicationLoadBalancer(this, "Alb", {
      vpc: props.vpc,
      internetFacing: false,
      vpcSubnets: { subnetGroupName: "app" },
    });

    // open: false = 「どこからでも許可」というルールを作らない(許可する相手は別途指定する)
    this.webListener = this.alb.addListener("Web", {
      port: 80,
      protocol: elbv2.ApplicationProtocol.HTTP,
      open: false,
    });
    this.cmsListener = this.alb.addListener("Cms", {
      port: 1337,
      protocol: elbv2.ApplicationProtocol.HTTP,
      open: false,
    });
  }
}
