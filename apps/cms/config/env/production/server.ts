import type { Core } from "@strapi/strapi";

// 本番(AWS)でだけ使うサーバー設定。NODE_ENV=production のとき config/server.ts の上に上書きする(ローカル開発には影響しない)
const config = ({
  env,
}: Core.Config.Shared.ConfigParams): Partial<Core.Config.Server> => ({
  // 管理画面の公開アドレス(管理者用 CloudFront)
  url: env("PUBLIC_URL"),
  // CloudFront → ALB の後ろで動くので、プロキシが付けた X-Forwarded-* ヘッダーを信頼する
  proxy: { koa: true },
});

export default config;
