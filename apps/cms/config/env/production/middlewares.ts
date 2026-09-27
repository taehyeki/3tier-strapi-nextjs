import type { Core } from "@strapi/strapi";

// 本番(AWS)でだけ使うミドルウェアの一覧。config/middlewares.ts の代わりにこちらを使う
const config = ({
  env,
}: Core.Config.Shared.ConfigParams): Core.Config.Middlewares => [
  // HTTPS 判定(src/middlewares/cloudfront-proto.ts)。クッキーを作る前に実行されるよう先頭に置く
  "global::cloudfront-proto",
  "strapi::logger",
  "strapi::errors",
  {
    name: "strapi::security",
    config: {
      contentSecurityPolicy: {
        useDefaults: true,
        directives: {
          "connect-src": ["'self'", "https:"],
          // 管理画面から S3 の写真(サイト用 CloudFront 経由)を表示できるように許可
          "img-src": [
            "'self'",
            "data:",
            "blob:",
            "market-assets.strapi.io",
            env("MEDIA_HOST"),
          ],
          "media-src": [
            "'self'",
            "data:",
            "blob:",
            "market-assets.strapi.io",
            env("MEDIA_HOST"),
          ],
          upgradeInsecureRequests: null,
        },
      },
    },
  },
  "strapi::cors",
  "strapi::poweredBy",
  "strapi::query",
  "strapi::body",
  "strapi::session",
  "strapi::favicon",
  "strapi::public",
];

export default config;
