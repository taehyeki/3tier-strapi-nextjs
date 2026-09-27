import type * as ec2 from "aws-cdk-lib/aws-ec2";
import type * as s3 from "aws-cdk-lib/aws-s3";
import * as cdk from "aws-cdk-lib/core";
import type { Construct } from "constructs";
import { AppSecrets } from "./app-secrets";
import { Database } from "./database";
import { MediaBucket } from "./media-bucket";
import { Network } from "./network";

/**
 * データスタック: 消えたら元に戻せないもの(状態)を集める。ほとんど変わらない。
 *   network.ts(VPC) / database.ts(Aurora) / media-bucket.ts(S3、写真) / app-secrets.ts(Strapi の鍵・API トークン)
 * アプリスタック(app-stack.ts)はいつ消して作り直してもよいが、こちらのスタックは削除保護を有効にする(bin/app.ts)。
 * VPC がここにある理由: DB が VPC の中にあるので、VPC を作り直すと DB も作り直しになる
 */
export class DataStack extends cdk.Stack {
  readonly vpc: ec2.IVpc;
  readonly database: Database;
  readonly mediaBucket: s3.IBucket;
  readonly secrets: AppSecrets;

  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    this.vpc = new Network(this, "Network").vpc;
    this.database = new Database(this, "Database", { vpc: this.vpc });
    this.mediaBucket = new MediaBucket(this, "Media").bucket;
    this.secrets = new AppSecrets(this, "Secrets");

    new cdk.CfnOutput(this, "ApiTokenSecretName", {
      value: this.secrets.apiToken.secretName,
    });
  }
}
