import type { Core } from "@strapi/strapi";

// 本番(AWS)でだけ使うプラグイン設定。アップロードした写真を PC のディスクの代わりに S3 に保存する
// (コンテナのディスクは再起動すると消えるため)。config/plugins.ts の上に上書きする
const config = ({
  env,
}: Core.Config.Shared.ConfigParams): Core.Config.Plugin => ({
  upload: {
    config: {
      provider: "aws-s3",
      providerOptions: {
        // 写真の公開アドレス: サイト用 CloudFront の /uploads/...(バケット自体は非公開)
        baseUrl: env("MEDIA_BASE_URL"),
        rootPath: "uploads",
        s3Options: {
          // 認証情報は書かない → ECS タスクに付けた IAM ロールを AWS SDK が自動で使う
          region: env("AWS_REGION"),
          params: {
            Bucket: env("MEDIA_BUCKET"),
            // 非公開バケット(ACL 無効)なので ACL は送らない。省略しないと public-read が付いてアップロードが失敗する
            ACL: undefined,
          },
        },
      },
    },
  },
});

export default config;
