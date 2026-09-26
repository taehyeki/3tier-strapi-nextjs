// 메뉴 페이지에 필요한 데이터를 Strapi 에서 가져온다.
import "server-only";
import { connection } from "next/server";
import { cache } from "react";
import type { components, paths } from "@/types/strapi";
import { createStrapiClient } from "./strapi";

// ---- 타입: Strapi 스키마에서 자동 생성된 것을 그대로 쓴다 (pnpm gen:types) ----
type Schemas = components["schemas"];
export type Menu = Schemas["ApiMenuMenuDocument"];
export type Topping = Schemas["ApiToppingToppingDocument"];
export type Extra = Schemas["ApiExtraExtraDocument"];
export type Media = Schemas["PluginUploadFileDocument"];
export type Shop =
  paths["/shop"]["get"]["responses"][200]["content"]["application/json"]["data"];

// ---- 조회 ----
// connection(): "빌드할 때가 아니라 요청이 올 때 실행하라"는 표시.
//   - 빌드(CI) 시점에는 Strapi 가 없어도 빌드가 성공한다
//   - 토큰·URL 을 실행 시점의 환경변수에서 읽으므로, 같은 이미지를 어느 환경에서든 쓸 수 있다
//   - 관리자 화면에서 Publish 하면 다음 요청부터 바로 반영된다
// cache: 한 요청 안에서 여러 번 불러도 Strapi 호출은 한 번으로 합친다
// (페이지 본문과 <title> 양쪽에서 가게 정보를 쓰기 때문)
export const getShop = cache(async () => {
  await connection();
  const res = await createStrapiClient()
    .single("shop")
    .find({ populate: ["photo"] });
  return res.data as Shop;
});

export async function getMenuPage() {
  await connection();
  const client = createStrapiClient();
  // API 4개를 동시에 호출한다 (하나씩 순서대로 부르는 것보다 빠르다)
  const [shop, menus, toppings, extras] = await Promise.all([
    getShop(),
    client.collection("menus").find({
      sort: "createdAt:asc",
      populate: {
        photo: true,
        sizes: true,
        toppings: { fields: ["name"] },
        extras: { fields: ["name"] },
      },
    }),
    client.collection("toppings").find({
      sort: "createdAt:asc",
      populate: { levels: true },
    }),
    client.collection("extras").find({
      sort: "createdAt:asc",
      populate: ["photo"],
    }),
  ]);
  return {
    shop,
    menus: menus.data as Menu[],
    toppings: toppings.data as Topping[],
    extras: extras.data as Extra[],
  };
}
