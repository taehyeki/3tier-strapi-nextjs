import type * as cdk from "aws-cdk-lib/core";

/** アプリ名。Dockerfile の場所(apps/<app>)・イメージ保管庫・ECS サービスに使う */
export const APPS = ["web", "cms"] as const;
export type AppName = (typeof APPS)[number];

/**
 * イメージ保管庫(ECR)の名前。3か所が同じ名前を使う:
 *   foundation-stack.ts(作る) / app-image.ts(ECS が受け取る) / .github/workflows/deploy.yml(CI が上げる)
 */
export const imageRepositoryName = (app: AppName) => `3tier/${app}`;

/**
 * デプロイするリージョン。東京に固定する(実行環境によって変わらないように)。他のリージョンは -c region=<リージョン>
 * アカウントはコードに書かない → デプロイする認証情報のアカウントにデプロイされる(コード・キャッシュファイルにアカウント ID が残らない)
 */
export const regionOf = (app: cdk.App): string =>
  app.node.tryGetContext("region") ?? "ap-northeast-1";
