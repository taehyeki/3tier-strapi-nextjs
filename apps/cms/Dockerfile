# Strapi(cms) 운영 이미지
# 빌드 컨텍스트는 저장소 루트 (lockfile 이 루트에 있으므로):
#   docker build -f apps/cms/Dockerfile -t cms .

FROM node:24-alpine AS base
WORKDIR /repo

# ---- 1단계: 빌드 ----
FROM base AS build
# package.json 의 packageManager 에 적힌 pnpm 버전을 설치 (버전은 한 곳에서만 관리)
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN npm install -g "$(node -p "require('./package.json').packageManager")"
# 의존성 설치: 소스보다 먼저 package.json 만 복사해서, 소스만 바뀌면 이 단계는 캐시를 쓴다
COPY apps/cms/package.json apps/cms/
RUN pnpm install --frozen-lockfile --filter cms
COPY apps/cms apps/cms
# 관리자 화면(React)을 빌드하고 TypeScript 를 dist/ 로 변환
ENV NODE_ENV=production
RUN pnpm -F cms build
# 실행에 필요한 것만 /out 에 모은다 (devDependencies 제외)
RUN pnpm --filter cms deploy --prod /out && cp -R apps/cms/dist /out/dist
# 관리자 화면 빌드 도구 vite 와, vite 전용으로 딸려 온 옛 esbuild(0.21.5)는 위의 build 에서만 쓴다.
# Strapi 가 dependencies 로 선언해서 /out 에 딸려 오므로, 운영 이미지로 옮기기 전에 뺀다 (취약점·공격 대상 축소).
# 주의: esbuild 는 두 벌 있다. 새 버전(0.28.x)은 start 에서 쓰이지는 않지만, strapi 명령 프로그램이 켜질 때
# build 명령의 코드까지 한꺼번에 불러오면서 함께 불러오므로 없으면 기동에 실패한다 → 남긴다.
RUN rm -rf /out/node_modules/.pnpm/vite@* /out/node_modules/.pnpm/esbuild@0.21.5 /out/node_modules/.pnpm/@esbuild+*@0.21.5

# ---- 2단계: 실행 ----
FROM base AS runtime
WORKDIR /app
ENV NODE_ENV=production HOST=0.0.0.0 PORT=1337
# 실행에는 npm 이 필요 없다. 베이스 이미지에 들어 있는 npm·corepack 을 지워 취약점과 공격 도구를 줄인다
RUN rm -rf /usr/local/lib/node_modules/npm /usr/local/lib/node_modules/corepack \
    /usr/local/bin/npm /usr/local/bin/npx /usr/local/bin/corepack
COPY --from=build --chown=node:node /out ./
# Strapi 는 시작할 때 업로드 폴더가 있는지 확인한다 (.gitkeep 은 이미지에 들어가지 않으므로 만든다)
RUN mkdir -p public/uploads && chown node:node public/uploads
# root 가 아닌 사용자로 실행 (컨테이너가 뚫려도 피해를 줄인다)
USER node
EXPOSE 1337
CMD ["node_modules/.bin/strapi", "start"]
