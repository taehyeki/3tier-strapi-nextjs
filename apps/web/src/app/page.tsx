// メニューページ。サーバーコンポーネントなので、このコードはサーバーでしか実行されず、
// ブラウザには完成した HTML だけが渡される(トークンは絶対に渡らない)。
import type { Metadata } from "next";
import Image from "next/image";
import { getMenuPage, getShop, type Media, type Menu } from "@/lib/menu";
import { toPublicUrl } from "@/lib/strapi";

// Enumeration の値(識別子)→ 画面に表示する文字(02章で決めたルール)
// キーの種類("small" | "medium" | "large")は Strapi のスキーマから生成された型と一致させる
const SIZE_LABEL: Record<NonNullable<Menu["sizes"]>[number]["label"], string> =
  {
    small: "小",
    medium: "中",
    large: "大",
  };

const yen = (n: number) => `${n.toLocaleString("ja-JP")}円`;

export async function generateMetadata(): Promise<Metadata> {
  const shop = await getShop();
  return { title: shop.name, description: shop.catchphrase };
}

// 写真は Strapi がくれた URL をそのまま表示する。
// (Next.js 16 の画像最適化は localhost の画像をブロックするので unoptimized)
function Photo({ media, alt }: { media?: Media; alt: string }) {
  if (!media) return null;
  return (
    <Image
      src={toPublicUrl(media.url)}
      alt={media.alternativeText ?? alt}
      width={media.width ?? 1200}
      height={media.height ?? 900}
      unoptimized
      className="aspect-[4/3] w-full object-cover"
    />
  );
}

export default async function Page() {
  const { shop, menus, toppings, extras } = await getMenuPage();

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-10">
      <header className="mb-10 text-center">
        <h1 className="text-4xl font-black tracking-wider">{shop.name}</h1>
        {shop.catchphrase && (
          <p className="mt-2 text-stone-600">{shop.catchphrase}</p>
        )}
      </header>

      <section aria-labelledby="menu" className="mb-12">
        <h2 id="menu" className="mb-4 text-2xl font-bold">
          メニュー
        </h2>
        <div className="grid gap-6 sm:grid-cols-2">
          {menus.map((menu) => (
            <article
              key={menu.documentId}
              className="overflow-hidden rounded-xl border border-stone-200 bg-white"
            >
              <Photo media={menu.photo} alt={menu.name} />
              <div className="p-5">
                <h3 className="text-xl font-bold">{menu.name}</h3>
                {menu.description && (
                  <p className="mt-1 text-sm text-stone-600">
                    {menu.description}
                  </p>
                )}
                <table className="mt-4 w-full text-sm">
                  <tbody>
                    {(menu.sizes ?? []).map((size) => (
                      <tr
                        key={size.label}
                        className="border-t border-stone-100"
                      >
                        <th className="py-2 text-left">
                          {SIZE_LABEL[size.label]}
                        </th>
                        <td className="py-2 text-stone-600">
                          {size.noodleGrams && `麺 ${size.noodleGrams}g`}
                        </td>
                        <td className="py-2 text-right font-bold">
                          {yen(size.price)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <p className="mt-3 text-xs text-stone-500">
                  無料トッピング：
                  {(menu.toppings ?? []).map((t) => t.name).join("・")}
                  <br />
                  追加できるもの：
                  {(menu.extras ?? []).map((e) => e.name).join("・")}
                </p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section aria-labelledby="toppings" className="mb-12">
        <h2 id="toppings" className="mb-4 text-2xl font-bold">
          無料トッピング（コール）
        </h2>
        <ul className="grid gap-3 sm:grid-cols-2">
          {toppings.map((topping) => (
            <li
              key={topping.documentId}
              className="rounded-xl border border-stone-200 bg-white p-4"
            >
              <p className="font-bold">{topping.name}</p>
              {topping.description && (
                <p className="text-sm text-stone-600">{topping.description}</p>
              )}
              <p className="mt-2 flex flex-wrap gap-2">
                {(topping.levels ?? []).map((level) => (
                  <span
                    key={level.label}
                    className="rounded-full bg-amber-100 px-3 py-0.5 text-sm"
                  >
                    {level.label}
                  </span>
                ))}
              </p>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="extras" className="mb-12">
        <h2 id="extras" className="mb-4 text-2xl font-bold">
          追加メニュー
        </h2>
        <ul className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {extras.map((extra) => (
            <li
              key={extra.documentId}
              className="relative overflow-hidden rounded-xl border border-stone-200 bg-white"
            >
              {/* 管理画面で soldOut(売り切れ)を ON にすると、写真を薄くして「売り切れ」を表示する */}
              <div
                className={extra.soldOut ? "opacity-40 grayscale" : undefined}
              >
                <Photo media={extra.photo} alt={extra.name} />
              </div>
              {extra.soldOut && (
                <span className="absolute top-2 left-2 rounded-full bg-red-600 px-3 py-0.5 text-xs font-bold text-white">
                  売り切れ
                </span>
              )}
              <p className="flex justify-between p-3 text-sm">
                <span className="font-bold">{extra.name}</span>
                <span
                  className={
                    extra.soldOut ? "text-stone-400 line-through" : undefined
                  }
                >
                  +{yen(extra.price)}
                </span>
              </p>
            </li>
          ))}
        </ul>
      </section>

      <section
        aria-labelledby="shop"
        className="rounded-xl border border-stone-200 bg-white p-5 text-sm leading-relaxed"
      >
        <h2 id="shop" className="mb-3 text-lg font-bold">
          店舗情報
        </h2>
        <dl className="grid grid-cols-[6rem_1fr] gap-y-2">
          <dt className="text-stone-500">住所</dt>
          <dd>{shop.address}</dd>
          <dt className="text-stone-500">営業時間</dt>
          <dd className="whitespace-pre-line">{shop.businessHours}</dd>
          <dt className="text-stone-500">定休日</dt>
          <dd>{shop.closedDays}</dd>
          <dt className="text-stone-500">食券の買い方</dt>
          <dd className="whitespace-pre-line">{shop.ticketRule}</dd>
        </dl>
      </section>
    </main>
  );
}
