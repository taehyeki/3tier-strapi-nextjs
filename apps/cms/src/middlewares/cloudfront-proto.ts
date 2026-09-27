import type { Core } from "@strapi/strapi";

/**
 * 브라우저 →(HTTPS)→ CloudFront →(HTTP)→ ALB → Strapi 구성에서는
 * ALB 가 X-Forwarded-Proto 를 "http" 로 붙인다. CloudFront 가 알려 주는 원래 프로토콜
 * (CloudFront-Forwarded-Proto)로 바꿔서 Strapi 가 HTTPS 요청으로 인식하게 한다.
 * → 관리자 로그인 쿠키에 Secure(HTTPS 에서만 전송) 가 붙는다.
 */
const cloudfrontProto: Core.MiddlewareFactory = () => async (ctx, next) => {
  const proto = ctx.get("CloudFront-Forwarded-Proto");
  if (proto) {
    ctx.request.headers["x-forwarded-proto"] = proto;
  }
  await next();
};

export default cloudfrontProto;
