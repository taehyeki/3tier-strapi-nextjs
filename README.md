# 3tier-strapi-nextjs

3層アーキテクチャ研修用の参考実装です。Strapi(CMS)+ Next.js(画面)で作ったラーメン店のメニューサイトを
ローカルで開発し、GitHub PR → CI/CD → AWS(ECS Fargate / Aurora)へデプロイする流れを示します。

| フォルダ | 内容 |
|---|---|
| `apps/web` | Next.js(画面、:3000) |
| `apps/cms` | Strapi v5(管理画面・API、:1337) |
| `infra` | AWS CDK(インフラ + デプロイ) |
| `docs` | 研修資料(HTML、`docs/ja/`) |

研修資料は [`docs/ja/00-overview.html`](docs/ja/00-overview.html) から読み進めてください。
