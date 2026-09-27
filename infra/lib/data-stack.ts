import type * as ec2 from "aws-cdk-lib/aws-ec2";
import type * as s3 from "aws-cdk-lib/aws-s3";
import * as cdk from "aws-cdk-lib/core";
import type { Construct } from "constructs";
import { AppSecrets } from "./app-secrets";
import { Database } from "./database";
import { MediaBucket } from "./media-bucket";
import { Network } from "./network";

/**
 * 데이터 스택: 지워지면 되돌릴 수 없는 것(상태)을 모은다. 거의 바뀌지 않는다.
 *   network.ts(VPC) / database.ts(Aurora) / media-bucket.ts(S3 사진) / app-secrets.ts(Strapi 키·API 토큰)
 * 앱 스택(app-stack.ts)은 언제 지우고 다시 만들어도 되지만, 이 스택은 삭제 보호를 켠다(bin/app.ts).
 * VPC 가 여기 있는 이유: DB 가 VPC 안에 있어서, VPC 가 다시 만들어지면 DB 도 다시 만들어진다
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
