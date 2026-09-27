#!/usr/bin/env node
import * as cdk from "aws-cdk-lib/core";
import { AppStack } from "../lib/app-stack";
import { DataStack } from "../lib/data-stack";
import { regionOf } from "../lib/shared";

// サービスアプリ(データスタック + アプリスタック)。GitHub Actions の deploy ワークフローがデプロイする:
//   cdk deploy --all -c imageTag=<コミット SHA>   (Data → App の順序は CDK が守る)
// 土台(ECR・IAM ロール)は別アプリ bin/foundation.ts
const app = new cdk.App();
const env = { region: regionOf(app) };

// 本番に載せるイメージのタグ。CI が ECR に上げたイメージ(タグ = コミット SHA)を指す
const imageTag = app.node.tryGetContext("imageTag");
if (!imageTag) {
  throw new Error(
    "-c imageTag=<イメージタグ(コミット SHA)> を指定してください",
  );
}

const data = new DataStack(app, "ThreeTierData", {
  env,
  terminationProtection: true, // DB・写真があるので、うっかりスタックを消せないようにする
});
new AppStack(app, "ThreeTierApp", { env, data, imageTag });
