import * as ecr from "aws-cdk-lib/aws-ecr";
import * as iam from "aws-cdk-lib/aws-iam";
import * as cdk from "aws-cdk-lib/core";
import type { Construct } from "constructs";
import { APPS, imageRepositoryName } from "./shared";

export interface FoundationStackProps extends cdk.StackProps {
  /**
   * 이 저장소의 OIDC 토큰 sub 의 앞부분. 이 저장소의 워크플로만 역할을 쓸 수 있게 한다.
   * GitHub API 가 알려 준다: gh api repos/<owner>/<repo>/actions/oidc/customization/sub --jq .sub_claim_prefix
   *   2026-07-15 이후 만든 저장소: repo:<owner>@<ID>/<repo>@<ID> (불변 형식. 이름을 재사용한 다른 저장소와 구별된다)
   *   그 전의 저장소            : repo:<owner>/<repo>
   */
  githubSubjectPrefix: string;
  /** 배포 job 의 GitHub Environment 이름 (deploy.yml 의 environment 와 같아야 한다) */
  githubEnvironment: string;
  /** 계정에 GitHub OIDC 공급자가 이미 있으면 true (공급자는 계정당 1개) */
  useExistingOidcProvider: boolean;
  /** CDK bootstrap 의 qualifier (기본값 hnb659fds) */
  cdkQualifier: string;
}

/**
 * 토대 스택: CI/CD 가 돌기 "전에" 있어야 하는 것. 담당자가 로컬에서 1회 배포한다 (GitHub Actions 는 이 스택을 건드리지 않는다)
 *   - 이미지 저장소(ECR) web·cms : CI 가 이미지를 올리는 곳
 *   - GitHub Actions 용 IAM 역할 2개 : 이미지 올리기(main 브랜치의 job) / 배포(3tier-prod 환경의 job)
 * 액세스 키는 만들지 않는다. GitHub 가 실행마다 발급하는 OIDC 토큰으로 1시간짜리 임시 권한을 받는다
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
    // "이 저장소의, 이런 job 만" 역할을 쓸 수 있다. sub 는 GitHub 가 토큰에 적어 주는 job 의 정체:
    //   <저장소 부분>:environment:<이름>(환경을 지정한 job) / :ref:refs/heads/<브랜치>(그 밖의 job) / :pull_request(PR)
    const githubJob = (sub: string) =>
      new iam.WebIdentityPrincipal(provider.oidcProviderArn, {
        StringEquals: {
          [`${issuer}:aud`]: "sts.amazonaws.com",
          [`${issuer}:sub`]: `${props.githubSubjectPrefix}:${sub}`,
        },
      });

    // ① 이미지 올리기: main 브랜치의 job 만 (PR 의 job 은 거부 → 머지 전 코드는 운영 저장소에 올라가지 않는다)
    //    IAM 역할의 설명에는 영문·숫자·일부 기호만 쓸 수 있다 (CloudFormation 규격)
    const imagePushRole = new iam.Role(this, "ImagePushRole", {
      description: "GitHub Actions (main branch) pushes app images to ECR",
      assumedBy: githubJob("ref:refs/heads/main"),
      maxSessionDuration: cdk.Duration.hours(1),
    });
    for (const app of APPS) {
      const repository = new ecr.Repository(this, `${app}Images`, {
        repositoryName: imageRepositoryName(app),
        // 같은 태그(커밋 SHA)로 다른 이미지를 덮어쓸 수 없게 한다 → "태그 = 그 커밋에서 만든 이미지"가 보장된다
        imageTagMutability: ecr.TagMutability.IMMUTABLE,
        lifecycleRules: [{ maxImageCount: 20 }], // 오래된 이미지는 자동 삭제 (저장 요금)
        removalPolicy: cdk.RemovalPolicy.DESTROY, // 연수용: 스택과 함께 이미지째 삭제
        emptyOnDelete: true,
      });
      repository.grantPullPush(imagePushRole);
      // 같은 커밋의 이미지가 이미 있는지 확인 (워크플로를 다시 실행했을 때 빌드를 건너뛴다)
      repository.grant(imagePushRole, "ecr:DescribeImages");
    }

    // ② 배포: 3tier-prod 환경의 job 만. 직접 권한은 주지 않고 CDK bootstrap 의 배포용 역할로 갈아타는 것만 허용 (최소 권한)
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

    // GitHub 에 시크릿으로 등록한다 (06장): 저장소 시크릿 / 환경(3tier-prod) 시크릿
    new cdk.CfnOutput(this, "ImagePushRoleArn", {
      value: imagePushRole.roleArn,
    });
    new cdk.CfnOutput(this, "DeployRoleArn", { value: deployRole.roleArn });
  }
}
