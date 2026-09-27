import type * as ec2 from "aws-cdk-lib/aws-ec2";
import * as elbv2 from "aws-cdk-lib/aws-elasticloadbalancingv2";
import { Construct } from "constructs";

/**
 * 1층: 내부 ALB. 인터넷에 공개하지 않고, CloudFront(VPC Origin)와 web 만 들어온다 (허용은 cdn.ts, web-service.ts)
 * 포트로 앱을 나눈다: 80 → web(Next.js), 1337 → cms(Strapi)
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

    // open: false = "어디서든 허용" 규칙을 만들지 않는다 (허용할 곳은 따로 지정)
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
