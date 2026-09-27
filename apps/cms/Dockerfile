# Strapi(cms) 本番用イメージ
# ビルドコンテキストはリポジトリのルート(lockfile がルートにあるため):
#   docker build -f apps/cms/Dockerfile -t cms .

FROM node:24-alpine AS base
WORKDIR /repo

# ---- 1段階目: ビルド ----
FROM base AS build
# package.json の packageManager に書かれた pnpm のバージョンをインストール(バージョンは1か所だけで管理)
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN npm install -g "$(node -p "require('./package.json').packageManager")"
# 依存関係のインストール: ソースより先に package.json だけコピーし、ソースだけ変わればこの段階はキャッシュを使う
COPY apps/cms/package.json apps/cms/
RUN pnpm install --frozen-lockfile --filter cms
COPY apps/cms apps/cms
# 管理画面(React)をビルドし、TypeScript を dist/ に変換する
ENV NODE_ENV=production
RUN pnpm -F cms build
# 実行に必要なものだけを /out に集める(devDependencies は除く)
RUN pnpm --filter cms deploy --prod /out && cp -R apps/cms/dist /out/dist
# 管理画面のビルド道具 vite と、vite 専用について来た古い esbuild(0.21.5)は、上の build でしか使わない。
# Strapi が dependencies として宣言しているため /out に付いてくるので、本番イメージに移す前に取り除く(脆弱性・攻撃対象を減らす)。
# 注意: esbuild は2本ある。新しいバージョン(0.28.x)は start では使われないが、strapi コマンドのプログラムが起動するとき
# build コマンドのコードまでまとめて読み込むので、これがないと起動に失敗する → 残す。
RUN rm -rf /out/node_modules/.pnpm/vite@* /out/node_modules/.pnpm/esbuild@0.21.5 /out/node_modules/.pnpm/@esbuild+*@0.21.5

# ---- 2段階目: 実行 ----
FROM base AS runtime
WORKDIR /app
ENV NODE_ENV=production HOST=0.0.0.0 PORT=1337
# 実行には npm は不要。ベースイメージに入っている npm・corepack を削除し、脆弱性と攻撃の足がかりを減らす
RUN rm -rf /usr/local/lib/node_modules/npm /usr/local/lib/node_modules/corepack \
    /usr/local/bin/npm /usr/local/bin/npx /usr/local/bin/corepack
COPY --from=build --chown=node:node /out ./
# AWS の DB(Aurora)に SSL で接続するとき、サーバー証明書を検証するための AWS 公式証明書バンドル。
# 信頼のよりどころとなるファイルなので、内容(チェックサム)を固定する。Node は NODE_EXTRA_CA_CERTS でこのファイルを追加で信頼する
ADD --chmod=644 --checksum=sha256:e5bb2084ccf45087bda1c9bffdea0eb15ee67f0b91646106e466714f9de3c7e3 \
    https://truststore.pki.rds.amazonaws.com/global/global-bundle.pem /etc/ssl/certs/rds-global-bundle.pem
ENV NODE_EXTRA_CA_CERTS=/etc/ssl/certs/rds-global-bundle.pem
# Strapi は起動時にアップロードフォルダがあるか確認する(.gitkeep はイメージに含まれないので作る)
RUN mkdir -p public/uploads && chown node:node public/uploads
# root ではないユーザーで実行する(コンテナが破られても被害を減らす)
USER node
EXPOSE 1337
CMD ["node_modules/.bin/strapi", "start"]
