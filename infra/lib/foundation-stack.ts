import * as ecr from "aws-cdk-lib/aws-ecr";
import * as iam from "aws-cdk-lib/aws-iam";
import * as cdk from "aws-cdk-lib/core";
import type { Construct } from "constructs";
import { APPS, imageRepositoryName } from "./shared";

export interface FoundationStackProps extends cdk.StackProps {
  /**
   * このリポジトリの OIDC トークンの sub の前半部分。このリポジトリのワークフローだけがロールを使えるようにする。
   * GitHub API が教えてくれる: gh api repos/<owner>/<repo>/actions/oidc/customization/sub --jq .sub_claim_prefix
   *   2026-07-15 以降に作ったリポジトリ: repo:<owner>@<ID>/<repo>@<ID>(不変形式。名前を再利用した別のリポジトリと区別される)
   *   それより前のリポジトリ          : repo:<owner>/<repo>
   */
  githubSubjectPrefix: string;
  /** デプロイ job の GitHub Environment 名(deploy.yml の environment と同じにする) */
  githubEnvironment: string;
  /** アカウントに GitHub OIDC プロバイダーがすでにあれば true(プロバイダーはアカウントごとに1つ) */
  useExistingOidcProvider: boolean;
  /** CDK bootstrap の qualifier(既定値 hnb659fds) */
  cdkQualifier: string;
}

/**
 * 土台スタック: CI/CD が動く「前に」必要なもの。担当者がローカルから1回だけデプロイする(GitHub Actions はこのスタックに触れない)
 *   - イメージ保管庫(ECR) web・cms: CI がイメージを上げる場所
 *   - GitHub Actions 用 IAM ロール2つ: イメージを上げる(main ブランチの job) / デプロイする(3tier-prod 環境の job)
 * アクセスキーは作らない。GitHub が実行のたびに発行する OIDC トークンで、1時間だけの一時的な権限を受け取る
 */
export class FoundationStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: FoundationStackProps) {
    super(scope, id, props);

    const issuer = "token.actions.githubusercontent.com";
    const provider = props.useExistingOidcProvider
      ? iam.OidcProviderNative.fromOidcProviderArn(
          this,
          "GithubOidc",
          `arn:${this.partition}:iam::${this.account}:oidc-provider/${issuer}`,
        )
      : new iam.OidcProviderNative(this, "GithubOidc", {
          url: `https://${issuer}`,
          clientIds: ["sts.amazonaws.com"],
        });
    // 「このリポジトリの、こういう job だけ」がロールを使える。sub は GitHub がトークンに書き込む job の正体:
    //   <リポジトリ部分>:environment:<名前>(環境を指定した job) / :ref:refs/heads/<ブランチ>(それ以外の job) / :pull_request(PR)
    const githubJob = (sub: string) =>
      new iam.WebIdentityPrincipal(provider.oidcProviderArn, {
        StringEquals: {
          [`${issuer}:aud`]: "sts.amazonaws.com",
          [`${issuer}:sub`]: `${props.githubSubjectPrefix}:${sub}`,
        },
      });

    // ① イメージを上げる: main ブランチの job だけ(PR の job は拒否 → マージ前のコードは本番用の保管庫に上がらない)
    //    IAM ロールの説明には英数字と一部の記号しか使えない(CloudFormation の仕様)
    const imagePushRole = new iam.Role(this, "ImagePushRole", {
      description: "GitHub Actions (main branch) pushes app images to ECR",
      assumedBy: githubJob("ref:refs/heads/main"),
      maxSessionDuration: cdk.Duration.hours(1),
    });
    for (const app of APPS) {
      const repository = new ecr.Repository(this, `${app}Images`, {
        repositoryName: imageRepositoryName(app),
        // 同じタグ(コミット SHA)で別のイメージを上書きできないようにする → 「タグ = そのコミットで作ったイメージ」が保証される
        imageTagMutability: ecr.TagMutability.IMMUTABLE,
        lifecycleRules: [{ maxImageCount: 20 }], // 古いイメージは自動削除(保管料金)
        removalPolicy: cdk.RemovalPolicy.DESTROY, // 研修用: スタックと一緒にイメージごと削除
        emptyOnDelete: true,
      });
      repository.grantPullPush(imagePushRole);
      // 同じコミットのイメージがすでにあるか確認する(ワークフローを再実行したときにビルドを飛ばすため)
      repository.grant(imagePushRole, "ecr:DescribeImages");
    }

    // ② デプロイ: 3tier-prod 環境の job だけ。直接の権限は与えず、CDK bootstrap のデプロイ用ロールに乗り換えることだけを許可(最小権限)
    const deployRole = new iam.Role(this, "DeployRole", {
      description: "GitHub Actions (deploy environment) runs cdk deploy",
      assumedBy: githubJob(`environment:${props.githubEnvironment}`),
      maxSessionDuration: cdk.Duration.hours(1),
    });
    deployRole.addToPolicy(
      new iam.PolicyStatement({
        actions: ["sts:AssumeRole"],
        resources: [
          `arn:${this.partition}:iam::${this.account}:role/cdk-${props.cdkQualifier}-*`,
        ],
      }),
    );

    // GitHub にシークレットとして登録する(06章): リポジトリシークレット / 環境(3tier-prod)シークレット
    new cdk.CfnOutput(this, "ImagePushRoleArn", {
      value: imagePushRole.roleArn,
    });
    new cdk.CfnOutput(this, "DeployRoleArn", { value: deployRole.roleArn });
  }
}
