import * as ecs from "aws-cdk-lib/aws-ecs";
import * as secretsmanager from "aws-cdk-lib/aws-secretsmanager";
import { Construct } from "constructs";

/** Strapi 가 서명·암호화에 쓰는 키 (로컬에서는 apps/cms/.env 에 있던 값들) */
const STRAPI_KEYS = [
  "APP_KEYS",
  "API_TOKEN_SALT",
  "ADMIN_JWT_SECRET",
  "TRANSFER_TOKEN_SALT",
  "JWT_SECRET",
  "ENCRYPTION_KEY",
] as const;

/**
 * 앱의 시크릿 (Secrets Manager).
 * 값은 코드·이미지·GitHub 어디에도 두지 않는다. ECS 가 컨테이너를 시작할 때 꺼내 환경변수로 넣는다 (services.ts)
 */
export class AppSecrets extends Construct {
  /** Strapi 의 키들. 무작위 값을 Secrets Manager 가 만든다 */
  readonly strapiKeys: Record<(typeof STRAPI_KEYS)[number], ecs.Secret>;
  /** Next.js → Strapi 의 API 토큰. 운영 Strapi 관리자 화면에서 발급한 값을 배포 후에 넣는다 */
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
