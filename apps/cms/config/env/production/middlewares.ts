import type { Core } from "@strapi/strapi";

// 운영(AWS)에서만 쓰는 미들웨어 목록. config/middlewares.ts 대신 이 목록을 쓴다
const config = ({
  env,
}: Core.Config.Shared.ConfigParams): Core.Config.Middlewares => [
  // HTTPS 판별 (src/middlewares/cloudfront-proto.ts). 쿠키를 만들기 전에 실행되도록 맨 앞에 둔다
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
          // 관리자 화면에서 S3 의 사진(사이트용 CloudFront 로 제공)을 표시할 수 있도록 허용
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
