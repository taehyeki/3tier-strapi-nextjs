#!/usr/bin/env node
import * as cdk from "aws-cdk-lib/core";
import { FoundationStack } from "../lib/foundation-stack";
import { regionOf } from "../lib/shared";

// 토대 앱 (ECR·GitHub Actions 용 IAM 역할). CI/CD 가 쓰는 것이라 CI/CD 로는 만들 수 없다 → 담당자가 로컬에서 1회 배포:
//   pnpm -F infra foundation deploy --profile <프로필> \
//     -c githubSubjectPrefix="$(gh api repos/<owner>/<repo>/actions/oidc/customization/sub --jq .sub_claim_prefix)"
// 저장소는 코드에 적지 않고 실행할 때 넘긴다
const app = new cdk.App();

const githubSubjectPrefix = app.node.tryGetContext("githubSubjectPrefix");
if (!githubSubjectPrefix) {
  throw new Error("-c githubSubjectPrefix=<repo:...> 를 지정하세요");
}

new FoundationStack(app, "ThreeTierFoundation", {
  env: { region: regionOf(app) },
  githubSubjectPrefix,
  githubEnvironment:
    app.node.tryGetContext("githubEnvironment") ?? "3tier-prod",
  useExistingOidcProvider:
    app.node.tryGetContext("useExistingOidcProvider") !== "false",
  cdkQualifier: app.node.tryGetContext("cdkQualifier") ?? "hnb659fds",
});
