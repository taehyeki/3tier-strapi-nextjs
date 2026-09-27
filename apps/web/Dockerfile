# Next.js(web) 本番用イメージ
# ビルドコンテキストはリポジトリのルート(lockfile がルートにあるため):
#   docker build -f apps/web/Dockerfile -t web .

FROM node:24-alpine AS base
WORKDIR /repo

# ---- 1段階目: ビルド ----
FROM base AS build
# package.json の packageManager に書かれた pnpm のバージョンをインストール(バージョンは1か所だけで管理)
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN npm install -g "$(node -p "require('./package.json').packageManager")"
# 依存関係のインストール: ソースより先に package.json だけコピーし、ソースだけ変わればこの段階はキャッシュを使う
COPY apps/web/package.json apps/web/
RUN pnpm install --frozen-lockfile --filter web
COPY apps/web apps/web
RUN pnpm -F web build

# ---- 2段階目: 実行(ビルド道具・ソースなし、実行に必要なファイルだけ) ----
FROM base AS runtime
ENV NODE_ENV=production PORT=3000 HOSTNAME=0.0.0.0
# 実行には npm は不要。ベースイメージに入っている npm・corepack を削除し、脆弱性と攻撃の足がかりを減らす
RUN rm -rf /usr/local/lib/node_modules/npm /usr/local/lib/node_modules/corepack \
    /usr/local/bin/npm /usr/local/bin/npx /usr/local/bin/corepack
COPY --from=build --chown=node:node /repo/apps/web/.next/standalone ./
COPY --from=build --chown=node:node /repo/apps/web/.next/static ./apps/web/.next/static
COPY --from=build --chown=node:node /repo/apps/web/public ./apps/web/public
# root ではないユーザーで実行する(コンテナが破られても被害を減らす)
USER node
EXPOSE 3000
CMD ["node", "apps/web/server.js"]
