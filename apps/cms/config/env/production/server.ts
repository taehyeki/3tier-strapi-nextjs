import type { Core } from "@strapi/strapi";

// 운영(AWS)에서만 쓰는 서버 설정. NODE_ENV=production 일 때 config/server.ts 위에 덮어쓴다 (로컬 개발에는 영향 없음)
const config = ({
  env,
}: Core.Config.Shared.ConfigParams): Partial<Core.Config.Server> => ({
  // 관리자 화면의 공개 주소 (관리자용 CloudFront)
  url: env("PUBLIC_URL"),
  // CloudFront → ALB 뒤에서 동작하므로, 프록시가 붙인 X-Forwarded-* 헤더를 믿는다
  proxy: { koa: true },
});

export default config;
