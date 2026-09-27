import * as ecr from "aws-cdk-lib/aws-ecr";
import * as ecs from "aws-cdk-lib/aws-ecs";
import type { Construct } from "constructs";
import { type AppName, imageRepositoryName } from "./shared";

/**
 * アプリのコンテナイメージ。CI(deploy.yml の publish job)がビルド・検査して ECR に上げたものを、タグ(コミット SHA)で指す。
 * cdk deploy はイメージをビルドしない → 検査を通過したそのイメージがそのまま本番で動く。
 * ECS が ECR からイメージを取得する権限(タスク実行ロール)は CDK が自動で付ける
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
