#!/usr/bin/env node
import * as cdk from "aws-cdk-lib/core";
import { AppStack } from "../lib/app-stack";
import { DataStack } from "../lib/data-stack";
import { regionOf } from "../lib/shared";

// 서비스 앱 (데이터 스택 + 앱 스택). GitHub Actions 의 deploy 워크플로가 배포한다:
//   cdk deploy --all -c imageTag=<커밋 SHA>   (Data → App 순서는 CDK 가 지킨다)
// 토대(ECR·IAM 역할)는 별도 앱 bin/foundation.ts
const app = new cdk.App();
const env = { region: regionOf(app) };

// 운영에 올릴 이미지의 태그. CI 가 ECR 에 올린 이미지(태그 = 커밋 SHA)를 가리킨다
const imageTag = app.node.tryGetContext("imageTag");
if (!imageTag) {
  throw new Error("-c imageTag=<이미지 태그(커밋 SHA)> 를 지정하세요");
}

const data = new DataStack(app, "ThreeTierData", {
  env,
  terminationProtection: true, // DB·사진이 있으므로 실수로 스택을 지우지 못하게 한다
});
new AppStack(app, "ThreeTierApp", { env, data, imageTag });
