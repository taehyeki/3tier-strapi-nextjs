// Strapi に接続するクライアント。
// "server-only": このファイルをブラウザ側のコードから import するとビルドエラーになる。
// → API トークンがブラウザに送る JavaScript に混ざってしまう事故を防ぐ。
import "server-only";
import { strapi } from "@strapi/client";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`環境変数 ${name} が設定されていません`);
  }
  return value;
}

export function createStrapiClient() {
  return strapi({
    baseURL: `${requireEnv("STRAPI_URL")}/api`,
    auth: requireEnv("STRAPI_API_TOKEN"),
  });
}

// Strapi の画像 URL をブラウザで表示できる URL にする。
// ローカルでは "/uploads/xxx.png" のような相対パスが来るので、Strapi のアドレスを付ける。
// 本番(S3)では最初から "https://..." の絶対 URL が来るので、そのまま使う。
export function toPublicUrl(url: string): string {
  return url.startsWith("http") ? url : `${requireEnv("STRAPI_URL")}${url}`;
}
