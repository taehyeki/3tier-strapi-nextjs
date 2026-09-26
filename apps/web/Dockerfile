# Next.js(web) 운영 이미지
# 빌드 컨텍스트는 저장소 루트 (lockfile 이 루트에 있으므로):
#   docker build -f apps/web/Dockerfile -t web .

FROM node:24-alpine AS base
WORKDIR /repo

# ---- 1단계: 빌드 ----
FROM base AS build
# package.json 의 packageManager 에 적힌 pnpm 버전을 설치 (버전은 한 곳에서만 관리)
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN npm install -g "$(node -p "require('./package.json').packageManager")"
# 의존성 설치: 소스보다 먼저 package.json 만 복사해서, 소스만 바뀌면 이 단계는 캐시를 쓴다
COPY apps/web/package.json apps/web/
RUN pnpm install --frozen-lockfile --filter web
COPY apps/web apps/web
RUN pnpm -F web build

# ---- 2단계: 실행 (빌드 도구·소스 없이, 실행에 필요한 파일만) ----
FROM base AS runtime
ENV NODE_ENV=production PORT=3000 HOSTNAME=0.0.0.0
COPY --from=build --chown=node:node /repo/apps/web/.next/standalone ./
COPY --from=build --chown=node:node /repo/apps/web/.next/static ./apps/web/.next/static
COPY --from=build --chown=node:node /repo/apps/web/public ./apps/web/public
# root 가 아닌 사용자로 실행 (컨테이너가 뚫려도 피해를 줄인다)
USER node
EXPOSE 3000
CMD ["node", "apps/web/server.js"]
