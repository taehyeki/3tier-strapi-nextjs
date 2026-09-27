#!/usr/bin/env node
import * as cdk from "aws-cdk-lib/core";
import { FoundationStack } from "../lib/foundation-stack";
import { regionOf } from "../lib/shared";

// 토대 앱 (ECR·GitHub Actions 용 IAM 역할). CI/CD 가 쓰는 것이라 CI/CD 로는 만들 수 없다 → 담당자가 로컬에서 1회 배포:
//   pnpm -F infra foundation deploy -c githubRepository=<owner/repo> --profile <프로필>
// 저장소 이름은 코드에 적지 않고 실행할 때 넘긴다
const app = new cdk.App();

const githubRepository = app.node.tryGetContext("githubRepository");
if (!githubRepository) {
  throw new Error("-c githubRepository=<owner/repo> 를 지정하세요");
}

new FoundationStack(app, "ThreeTierFoundation", {
  env: { region: regionOf(app) },
  githubRepository,
  githubEnvironment:
    app.node.tryGetContext("githubEnvironment") ?? "3tier-prod",
  useExistingOidcProvider:
    app.node.tryGetContext("useExistingOidcProvider") !== "false",
  cdkQualifier: app.node.tryGetContext("cdkQualifier") ?? "hnb659fds",
});
