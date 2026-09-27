import * as iam from "aws-cdk-lib/aws-iam";
import * as cdk from "aws-cdk-lib/core";
import type { Construct } from "constructs";

export interface GithubOidcStackProps extends cdk.StackProps {
  /** "owner/repo" 형식. 이 저장소의 워크플로만 역할을 쓸 수 있다 */
  githubRepository: string;
  /** GitHub Environment 이름. 이 환경을 지정한 job 만 역할을 쓸 수 있다 (= 승인을 거친 배포만) */
  githubEnvironment: string;
  /** 계정에 GitHub OIDC 공급자가 이미 있으면 true (공급자는 계정당 1개. 역할은 여러 개 만들 수 있다) */
  useExistingOidcProvider: boolean;
  /** CDK bootstrap 의 qualifier (기본값 hnb659fds) */
  cdkQualifier: string;
}

/**
 * GitHub Actions 가 AWS 에 들어올 때 쓰는 IAM 역할.
 * 액세스 키를 GitHub 에 두지 않고, 실행할 때마다 GitHub 가 발급한 토큰(OIDC)으로 1시간짜리 임시 권한을 받는다.
 * 이 역할이 있어야 GitHub 가 AWS 에 들어올 수 있으므로, 이 스택만은 담당자가 로컬에서 1회 배포한다.
 */
export class GithubOidcStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: GithubOidcStackProps) {
    super(scope, id, props);

    const issuer = "token.actions.githubusercontent.com";
    const provider = props.useExistingOidcProvider
      ? iam.OidcProviderNative.fromOidcProviderArn(
          this,
          "Provider",
          `arn:${this.partition}:iam::${this.account}:oidc-provider/${issuer}`,
        )
      : new iam.OidcProviderNative(this, "Provider", {
          url: `https://${issuer}`,
          clientIds: ["sts.amazonaws.com"],
        });

    const role = new iam.Role(this, "DeployRole", {
      // IAM 역할의 설명에는 영문·숫자·일부 기호만 쓸 수 있다 (CloudFormation 규격)
      description:
        "Used by the GitHub Actions deploy workflow to run cdk deploy",
      assumedBy: new iam.WebIdentityPrincipal(provider.oidcProviderArn, {
        StringEquals: {
          [`${issuer}:aud`]: "sts.amazonaws.com",
          // 이 저장소의, 이 Environment 를 지정한 job 만 허용 (다른 저장소·브랜치·job 은 거부)
          [`${issuer}:sub`]: `repo:${props.githubRepository}:environment:${props.githubEnvironment}`,
        },
      }),
      maxSessionDuration: cdk.Duration.hours(1),
    });

    // 직접 권한은 주지 않고, CDK bootstrap 이 만든 배포용 역할로 갈아타는 것만 허용한다 (최소 권한)
    role.addToPolicy(
      new iam.PolicyStatement({
        actions: ["sts:AssumeRole"],
        resources: [
          `arn:${this.partition}:iam::${this.account}:role/cdk-${props.cdkQualifier}-*`,
        ],
      }),
    );

    new cdk.CfnOutput(this, "DeployRoleArn", { value: role.roleArn });
  }
}
