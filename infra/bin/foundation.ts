#!/usr/bin/env node
import * as cdk from "aws-cdk-lib/core";
import { FoundationStack } from "../lib/foundation-stack";
import { regionOf } from "../lib/shared";

// 土台アプリ(ECR・GitHub Actions 用 IAM ロール)。CI/CD が使うものなので CI/CD では作れない → 担当者がローカルから1回だけデプロイする:
//   pnpm -F infra foundation deploy --profile <プロファイル> \
//     -c githubSubjectPrefix="$(gh api repos/<owner>/<repo>/actions/oidc/customization/sub --jq .sub_claim_prefix)"
// リポジトリはコードに書かず、実行するときに渡す
const app = new cdk.App();

const githubSubjectPrefix = app.node.tryGetContext("githubSubjectPrefix");
if (!githubSubjectPrefix) {
  throw new Error("-c githubSubjectPrefix=<repo:...> を指定してください");
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
