// ロードバランサー(ALB)のヘルスチェック用。Strapi に依存せず「このサーバーが応答するか」だけを答える
export function GET() {
  return new Response("ok");
}
