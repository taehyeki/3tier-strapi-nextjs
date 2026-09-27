import * as ecr from "aws-cdk-lib/aws-ecr";
import * as ecs from "aws-cdk-lib/aws-ecs";
import type { Construct } from "constructs";
import { type AppName, imageRepositoryName } from "./shared";

/**
 * 앱의 컨테이너 이미지. CI(deploy.yml 의 publish job)가 빌드·검사해서 ECR 에 올린 것을 태그(커밋 SHA)로 가리킨다.
 * cdk deploy 는 이미지를 빌드하지 않는다 → 검사를 통과한 그 이미지가 그대로 운영에서 돈다.
 * ECS 가 ECR 에서 이미지를 받아 갈 권한(작업 실행 역할)은 CDK 가 자동으로 붙인다
 */
export function appImage(
  scope: Construct,
  app: AppName,
  tag: string,
): ecs.ContainerImage {
  const repository = ecr.Repository.fromRepositoryName(
    scope,
    "Images",
    imageRepositoryName(app),
  );
  return ecs.ContainerImage.fromEcrRepository(repository, tag);
}
