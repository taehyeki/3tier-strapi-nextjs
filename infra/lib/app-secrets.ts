import * as ecs from "aws-cdk-lib/aws-ecs";
import * as secretsmanager from "aws-cdk-lib/aws-secretsmanager";
import { Construct } from "constructs";

/** Strapi が署名・暗号化に使う鍵(ローカルでは apps/cms/.env にあった値) */
const STRAPI_KEYS = [
  "APP_KEYS",
  "API_TOKEN_SALT",
  "ADMIN_JWT_SECRET",
  "TRANSFER_TOKEN_SALT",
  "JWT_SECRET",
  "ENCRYPTION_KEY",
] as const;

/**
 * アプリのシークレット(Secrets Manager)。
 * 値はコード・イメージ・GitHub のどこにも置かない。ECS がコンテナを起動するときに取り出して環境変数として渡す(cms-service.ts, web-service.ts)
 */
export class AppSecrets extends Construct {
  /** Strapi の鍵たち。ランダムな値を Secrets Manager が作る */
  readonly strapiKeys: Record<(typeof STRAPI_KEYS)[number], ecs.Secret>;
  /** Next.js → Strapi の API トークン。本番 Strapi の管理画面で発行した値をデプロイ後に入れる */
  readonly apiToken: secretsmanager.Secret;

  constructor(scope: Construct, id: string) {
    super(scope, id);

    this.strapiKeys = Object.fromEntries(
      STRAPI_KEYS.map((name) => [
        name,
        ecs.Secret.fromSecretsManager(
          new secretsmanager.Secret(this, name, {
            generateSecretString: {
              excludePunctuation: true,
              passwordLength: 32,
            },
          }),
        ),
      ]),
    ) as AppSecrets["strapiKeys"];

    this.apiToken = new secretsmanager.Secret(this, "StrapiApiToken", {
      description:
        "Strapi 管理画面で発行した Next.js 用 API トークン(初回デプロイ後に値を入れる)",
    });
  }
}
