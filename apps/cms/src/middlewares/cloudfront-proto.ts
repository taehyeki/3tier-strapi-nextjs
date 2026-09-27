import type { Core } from "@strapi/strapi";

/**
 * ブラウザ →(HTTPS)→ CloudFront →(HTTP)→ ALB → Strapi という構成では、
 * ALB が X-Forwarded-Proto に "http" を付けてしまう。CloudFront が教えてくれる本来のプロトコル
 * (CloudFront-Forwarded-Proto)に書き換えて、Strapi が HTTPS のリクエストだと認識できるようにする。
 * → 管理画面のログインクッキーに Secure(HTTPS でしか送らない)が付く。
 */
const cloudfrontProto: Core.MiddlewareFactory = () => async (ctx, next) => {
  const proto = ctx.get("CloudFront-Forwarded-Proto");
  if (proto) {
    ctx.request.headers["x-forwarded-proto"] = proto;
  }
  await next();
};

export default cloudfrontProto;
