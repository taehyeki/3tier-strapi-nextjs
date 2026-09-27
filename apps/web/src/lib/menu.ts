// メニューページに必要なデータを Strapi から取ってくる。
import "server-only";
import { connection } from "next/server";
import { cache } from "react";
import type { components, paths } from "@/types/strapi";
import { createStrapiClient } from "./strapi";

// ---- 型: Strapi のスキーマから自動生成されたものをそのまま使う (pnpm gen:types) ----
type Schemas = components["schemas"];
export type Menu = Schemas["ApiMenuMenuDocument"];
export type Topping = Schemas["ApiToppingToppingDocument"];
export type Extra = Schemas["ApiExtraExtraDocument"];
export type Media = Schemas["PluginUploadFileDocument"];
export type Shop =
  paths["/shop"]["get"]["responses"][200]["content"]["application/json"]["data"];

// ---- 取得 ----
// connection(): 「ビルド時ではなく、リクエストが来たときに実行しろ」という印。
//   - ビルド(CI)の時点では Strapi がなくてもビルドが成功する
//   - トークン・URL を実行時の環境変数から読むので、同じイメージをどの環境でも使える
//   - 管理画面で Publish すると、次のリクエストからすぐ反映される
// cache: 1つのリクエストの中で何度呼んでも、Strapi の呼び出しは1回にまとめる
// (ページ本文と <title> の両方で店の情報を使うため)
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
  // API を4つ同時に呼ぶ(1つずつ順番に呼ぶより速い)
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
