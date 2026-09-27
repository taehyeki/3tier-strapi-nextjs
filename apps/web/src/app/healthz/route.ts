// 로드 밸런서(ALB)의 헬스 체크용. Strapi 에 의존하지 않고 "이 서버가 응답하는가"만 답한다
export function GET() {
  return new Response("ok");
}
