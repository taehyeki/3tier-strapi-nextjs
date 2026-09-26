// Strapi 에 접속하는 클라이언트.
// "server-only": 이 파일을 브라우저 쪽 코드에서 import 하면 빌드 오류가 난다.
// → API 토큰이 브라우저로 보내는 JavaScript 에 섞여 들어가는 사고를 막는다.
import "server-only";
import { strapi } from "@strapi/client";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`환경변수 ${name} 가 설정되지 않았습니다`);
  }
  return value;
}

export function createStrapiClient() {
  return strapi({
    baseURL: `${requireEnv("STRAPI_URL")}/api`,
    auth: requireEnv("STRAPI_API_TOKEN"),
  });
}

// Strapi 의 이미지 URL 을 브라우저에서 표시할 수 있는 URL 로 만든다.
// 로컬에서는 "/uploads/xxx.png" 같은 상대 경로가 오므로 Strapi 주소를 붙인다.
// 운영(S3)에서는 처음부터 "https://..." 절대 URL 이 오므로 그대로 쓴다.
export function toPublicUrl(url: string): string {
  return url.startsWith("http") ? url : `${requireEnv("STRAPI_URL")}${url}`;
}
