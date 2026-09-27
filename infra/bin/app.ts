#!/usr/bin/env node
import * as cdk from "aws-cdk-lib/core";
import { AppStack } from "../lib/app-stack";
import { GithubOidcStack } from "../lib/github-oidc-stack";

const app = new cdk.App();

// 계정은 실행하는 자격 증명에서 가져온다(코드에 계정 ID 를 적지 않는다).
// 리전은 도쿄로 고정한다(실행 환경에 따라 바뀌지 않게). 다른 리전은 -c region=<리전>
const env = {
  account: process.env.CDK_DEFAULT_ACCOUNT,
  region: app.node.tryGetContext("region") ?? "ap-northeast-1",
};

// 앱 전체 (GitHub Actions 의 deploy 워크플로가 배포)
new AppStack(app, "ThreeTierApp", { env });

// GitHub Actions 용 IAM 역할 (담당자가 로컬에서 1회만 배포). 저장소 이름은 코드에 적지 않고 실행할 때 넘긴다:
//   pnpm -F infra cdk deploy ThreeTierGithubOidc -c githubRepository=<owner/repo> -c githubEnvironment=<환경 이름>
const githubRepository = app.node.tryGetContext("githubRepository");
const githubEnvironment = app.node.tryGetContext("githubEnvironment");
if (githubRepository && githubEnvironment) {
  new GithubOidcStack(app, "ThreeTierGithubOidc", {
    env,
    githubRepository,
    githubEnvironment,
    useExistingOidcProvider:
      app.node.tryGetContext("useExistingOidcProvider") !== "false",
    cdkQualifier: app.node.tryGetContext("cdkQualifier") ?? "hnb659fds",
  });
}
