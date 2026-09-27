# 결정 기록 (grilling 과 이후 대화에서 정한 것)

형식: 결정 — 이유 / 버린 대안. `[변경]` 은 나중에 바뀐 결정, `[보류]` 는 아직 쓰지 않는 결정.
새 결정이나 변경이 생기면 여기에 추가한다. 요약·진행 상황은 status.md.

## 연수의 전제

- 연수자: 일본인, 5명 이하, 며칠. 회사 AWS 공유 계정을 **SSO 역할**로 사용. 인증은 각자 알아서 한다(문서에서 다루지 않음).
- 연수자는 WordPress 를 올리는 것을 전제로 3층 인프라를 이미 **각자 설계**했다. 이 자료는 그 위에 앱을 개발·배포하는 **참고 예시**이지 정답이 아니다.
  → 00장에 "WordPress 기준 설계와의 차이 5가지와 적용 방법"을 둔다 (앱 1→2, 분배, 앱 간 통신, DB 는 MySQL 도 가능, 업로드는 S3).
- 목적: WordPress 에서 블랙박스였던 "화면 ↔ 백엔드 ↔ DB" 통신을 직접 만들어 보는 것. 1차 목표는 **Read 만**(간단한 데이터 표시). CRUD 는 연수자 과제.
- 연수자는 프론트·백엔드 개념이 처음이다 → 쉬운 말, 불필요한 기술 설명 최소화.
- `[변경]` 처음: 담당자 템플릿 저장소 → 연수자별 저장소로 코드 배포. → 현재: **코드가 아니라 문서만 배포**, 문서만으로 빈 폴더에서 재현. 저장소는 담당자 정답지.
- 자료 톤: "이런 방식으로 한다, 참고해서 자기 사이트를 만든다". 예시 데이터·사진은 제공하지 않는다.

## 앱

- 프론트 Next.js(App Router) 서버 컴포넌트 — API 토큰을 서버에만 두기 위해 / React SPA 는 토큰이 브라우저에 노출.
- 데이터 가져오기: 요청할 때마다 서버에서 조회(SSR, `connection()`) — 단순, Publish 즉시 반영 / ISR·webhook 은 심화.
- CMS Strapi 5 — 스키마·데이터·토큰은 관리자 화면. 코드는 config 만.
- 예시 사이트: キム系 라멘 가게 **하나**의 메뉴 표시(체인점 아님) — Single/Collection/Component/Relation 이 모두 등장.
  식권 시뮬레이터(옵션 선택·합계)는 **심화 과제로 아이디어만**.
- 사이즈 Enumeration 은 `small/medium/large`(Strapi 가 알파벳 식별자를 요구), 小中大 표시는 화면에서 변환.
- 데이터: 로컬·운영 모두 관리자 화면에서 **수동 입력** — "스키마는 배포되고 데이터는 배포되지 않는다"를 체험 / 시드·`strapi transfer` 는 쓰지 않음.
- API 토큰: 관리자 화면에서 수동 발급(Custom, find/findOne 만) → 로컬 `.env.local`, 운영 Secrets Manager — 시크릿 흐름을 손으로 체험 / 자동 시드 안 함.
- 타입: Strapi OpenAPI(experimental) → openapi-typescript 로 자동 생성 — 스키마 이중 정의 방지 / 손으로 쓴 타입, `@strapi/client` 제네릭(결국 수동 정의).
- 미디어: S3 — 컨테이너는 디스크가 사라짐(stateless) / 로컬 디스크.
- 스택: Node 24, pnpm workspace 모노레포, Biome, Tailwind, TypeScript.
- `[변경]` pnpm 10.18 → **pnpm 12.6** (2026-09-26, 05장 착수 시 발견). push 전이라 01~04장 커밋을 다시 만들었다(기존은 `backup/pre-pnpm12` 브랜치).
  이유: latest 가 12. pnpm 11 부터 `onlyBuiltDependencies` 삭제 → `allowBuilds`, 공개 1일 미만 버전 설치 거부(`minimumReleaseAge`)가 기본값 → 10 기준 문서는 최신 pnpm 에서 동작하지 않음.
  / 버린 대안: 11(이미 최신 아님), 10 유지(문서에 버전 고정 안내 필요).
  - 설치는 `npx get-pnpm`(공식 안내. pnpm 12 는 네이티브 실행 파일, corepack 은 공식 안내에서 빠짐). pnpm 10 의 자동 버전 전환은 12 로 전환하지 못함.
  - `allowBuilds` 는 전부 false — 스크립트 없이 install·dev·build 가 되는 것을 확인. "필요한 것만 허용"의 최소형.
- Biome 2.4 → **2.5.14**. `linter.rules.recommended` 는 폐지 예정 → `"preset": "recommended"`
  (`biome migrate` 가 `"none"`(=전부 끔)으로 잘못 바꾸므로 손으로 씀). 2.5 부터 SVG 도 검사 → `!**/*.svg` 제외(이미지 파일).
- web typecheck = `next typegen && tsc --noEmit` — `next-env.d.ts`·`.next/types` 는 git 제외라 CI(깨끗한 checkout)에서 `LayoutProps` 가 없어 실패. Next 공식 권장.
- 히스토리 재작성 때 함께 바로잡음: `apps/cms/openapi.json` 이 .gitignore 추가 전부터 추적되던 것 제거, 01장 커밋에 섞여 있던 02·04장 산출물(생성 타입·`gen:types`) 제거.

## 로컬 개발

- DB 만 Docker(PostgreSQL 17 = 운영 Aurora 와 같은 메이저), web·cms 는 `pnpm dev` 로 직접 실행(포트 2개) — 핫 리로드 속도 / 전부 compose 는 느림.
- 표준 포트 5432. 담당자 PC 만 git 제외 `compose.override.yaml` 로 5433 (문서에서 포트 이야기는 하지 않음).
- 로컬 = dev 환경, AWS = prod 환경(1개).

## AWS 인프라 (06장에서 구현, 참고 구현이지 연수 대상 아님)

- 리전 도쿄(ap-northeast-1). 담당자 개인 계정에서 먼저 제작(`--profile mfa`), 나중에 회사로 이전.
- VPC + NAT Gateway 1개(단일 AZ) — 표준, 며칠이면 저렴 / VPC 엔드포인트만(오히려 비쌈), NAT 인스턴스(비모던).
- ECS Fargate(web, cms 2서비스) + **내부** ALB — 서버 관리 없음 / EC2+ASG, ECS Express Mode(내부가 가려짐).
- Aurora Serverless v2 **PostgreSQL** — 모던, Strapi 권장 엔진 / RDS t4g.micro, Aurora MySQL.
- 도메인 없음: CloudFront 기본 도메인 **2개**(사이트용·관리자용) + VPC Origin 으로 내부 ALB 에 연결, ALB 는 CloudFront 가 붙인 헤더로 분배 — 도메인 준비 불필요 / 자체 도메인+ACM(연수자 과제).
- 시크릿 Secrets Manager → ECS 가 환경변수로 주입. 이미지 ECR.
- 운영 초기: 배포 직후 관리자 등록(처음 접속자가 최고 관리자가 되므로 선점 위험), 데이터 입력, 운영용 토큰 발급 → Secrets Manager → web 재배포.

## 배포와 CI/CD

- AWS 변경은 GitHub Actions 안의 `cdk deploy` **하나로만**(인프라+앱, `ContainerImage.fromAsset`) — 책임 소재 단순, 드리프트 없음 / Actions 가 ECS 직접 갱신(드리프트), 이미지 빌드 분리.
- 로컬에서 배포하지 않는다. 예외: 최초 `cdk bootstrap`, GitHub OIDC 역할(닭과 달걀).
- `main` 머지 시 `apps/**`·`infra/**` 가 바뀌었을 때만 배포. 인프라만 바뀌면 앱은 CDK 가 필요할 때만 재배포(억지로 재배포하지 않음).
- AWS 인증은 OIDC(액세스 키를 GitHub 에 두지 않음).
- CI(PR): Biome, typecheck, build, gitleaks, Docker 빌드, Trivy(결과는 Security 탭 / 없으면 Job Summary). 로컬: lefthook(커밋 전 Biome·gitleaks).
- GitHub: main Ruleset(PR 필수·CI 통과 필수), Environment `production` 승인, Secret scanning. **Dependabot 은 쓰지 않음**.
- 저장소: 담당자 개인 계정 **public** 으로 모든 기능 체험. 회사 플랜에서 안 되는 기능은 "없으면 생략 가능"으로 표기.

### 05장 구현 결정 (2026-09-26)

- Actions 는 전부 **커밋 SHA 고정** + `# vX.Y.Z` 주석 — 2026-03 trivy-action 태그 탈취 사건(GHSA-69fq-xp46-6x23) / 태그 지정(가변). Dependabot 을 안 쓰므로 SHA 갱신은 수동.
- pnpm 설치는 `pnpm/setup@v3` — pnpm 공식, packageManager·.nvmrc 를 자동으로 읽고 캐시·install 까지 한 단계 / `pnpm/action-setup`+`actions/setup-node`(2단계, 버전 중복).
- CI job 3개(= Ruleset 필수 체크 이름): `check`(biome ci + typecheck), `secrets`(gitleaks 전체 히스토리), `image (web)`·`image (cms)`(Docker 빌드 + Trivy).
  빌드 검증은 Docker 빌드가 겸한다(앱 build 를 따로 돌리지 않음).
- Trivy: 고칠 수 있는(`ignore-unfixed`) HIGH·CRITICAL 이면 실패. 결과는 SARIF → Security 탭(private+GHAS 없음이면 두 단계 삭제 가능).
- gitleaks 는 **Docker 이미지**(`ghcr.io/gitleaks/gitleaks:v8.30.1`)로 lefthook·CI 동일 버전 실행 — Docker 는 01장에서 이미 필요, OS 별 설치 불필요
  / gitleaks-action(조직 저장소는 라이선스 키 필요 → 회사 이전 시 문제), brew 설치(Windows 연수자).
- lefthook 2 는 npm devDependency + `allowBuilds: lefthook: true`(설치 시 hook 등록, lefthook 공식 안내). pre-commit: Biome(`--write` + `stage_fixed`, Biome 공식 레시피), gitleaks(`--staged`).
- Dockerfile: `node:24-alpine`, 멀티 스테이지, 비root(`node`), 빌드 컨텍스트 = 저장소 루트, pnpm 버전은 packageManager 에서 읽어 `npm i -g`.
  web = Next `output: "standalone"`(Next 공식 Docker 예시 기반). cms = `pnpm deploy --prod` + dist, `public/uploads` 생성(없으면 Strapi 기동 실패).
- 머지 방식은 squash 만 — PR 1개 = main 커밋 1개(장별 커밋 원칙, PR 제목이 Conventional Commits 메시지). 승인 인원 0(연수자 1인 저장소).
- Trivy 가 첫 PR 에서 HIGH 를 검출(2026-09-27). 대응 순서 "고칠 수 있으면 올린다 → 실행에 안 쓰면 뺀다 → 둘 다 안 되면 근거·만료일과 예외" 중 앞의 둘만으로 해결(담당자 결정):
  - 실행 이미지에서 npm·corepack 삭제(베이스 이미지 동봉, 실행에 불필요).
  - Strapi 가 정확히 고정한 sharp 0.35.3 → 0.35.4, nodemailer 9.0.1 → 9.1.0 을 `pnpm-workspace.yaml` overrides 로(조건 없는 지정. webpack 플러그인이 sharp 를 `*` peer 로 요구해 `sharp@<0.35.4` 조건은 안 먹음). Strapi 업데이트 시 overrides 삭제 후 재확인.
  - cms: vite 와 vite 전용 esbuild 0.21.5 를 `/out` 에서 빼고 복사(빌드 1단계에서만 사용. 레이어에 남지 않도록 COPY 전에 삭제). esbuild 0.28.x 는 유지 — `strapi` CLI 가 켜질 때 모든 명령을 등록하며 build 코드(`cli/commands/build.js` → `node/build.js` → `node/core/files.js` → esbuild-register → esbuild)까지 require 하므로, start 가 쓰지 않아도 없으면 기동 실패(실험). start 의 설정 읽기는 `dist/config/*.js` 를 일반 require 로 함(@strapi/core `load-config-file.js`, esbuild 무관).
  / 버린 대안: `.trivyignore.yaml` 예외(코드가 이미지에 남음), 기준 완화(CRITICAL 도 있어 무의미).
- 로컬 Strapi `HOST=0.0.0.0`(생성기 기본값) 유지 — 담당자 결정. vite 개발 서버 취약점(Windows)은 같은 네트워크에서 접근 가능할 때만 성립, 위험 낮음.
- Trivy 결과는 ① SARIF → Security 탭(기본 목록은 main 기준이라 머지 후 표시), ② 관문(exit-code 1), ③ 표를 Job Summary 에(`TRIVY_TABLE_MODE=detailed`, 없으면 "없음") — PR 코멘트는 `pull-requests: write` 와 외부 액션이 필요해 안 씀.
  "GitHub Advanced Security / Trivy" 체크와 봇 코멘트는 SARIF 업로드 시 GitHub 이 자동 생성(우리가 만든 job 아님).
- Secret scanning·Push protection 은 public 저장소에서 이미 켜져 있었음(설정 불필요). 담당자 개입은 머지 방식·Ruleset 만.
- SARIF 업로드 **유지**(2026-09-27 담당자 확인). 업로드 한 단계가 GitHub 쪽에서 일으키는 일(경고 생성, 다음 분석에 없으면 fixed 로 자동 종료,
  PR 체크 "Code scanning results / Trivy" 자동 생성, 최초 1회 봇 코멘트, Security 탭 기본 필터는 main 의 열린 경고)을 문서에 표로 싣는다.
  CodeQL(소스 코드 정적 분석)은 켜지 않음(`default-setup: not-configured`). 이미지 경고는 위치가 이미지 안 경로라 PR 줄 주석은 안 뜸.
- 설명 원칙: 설정 하나가 **부수적으로 일으키는 동작까지 미리** 설명한다(담당자가 "설정한 것만 움직이길" 원함. 예상 밖 동작을 나중에 발견하게 하지 않는다).
- GitHub 설정(머지 방식·Ruleset)은 담당자 위임으로 Claude 가 Playwright 로 조작·캡처(2026-09-27).
  → 실제로는 rebase 해제 클릭이 Claude Code auto mode 분류기에 거부됨. merge commit 해제·브랜치 자동 삭제만 Claude 가 하고, 나머지(rebase 해제·squash 메시지·Ruleset)는 담당자가 조작, Claude 는 읽기 전용 캡처·API 확인.
- 러너 `ubuntu-24.04` 고정 — ubuntu-latest 가 2026-10-19 부터 Ubuntu 26 으로 바뀜(연수 중 변동 방지, SHA 고정과 같은 원칙) / ubuntu-latest.
- docker/build-push-action 의 기본 동작(Summary 의 Docker Build summary, Artifacts 의 .dockerbuild 빌드 기록 업로드)은 **유지**, 문서에 "자동으로 하는 일"로 명시(담당자 결정).

## 문서

- 커밋 메시지·PR 제목·본문은 **일본어** (2026-09-27 담당자 지시). 기존 커밋 12개도 메시지만 일본어로 재작성(내용 동일, 이전은 `backup/pre-ja-msg`),
  첫 커밋이 이미 push 돼 있어서 main 은 1회 force push. 문서(ko)의 커밋 명령도 저장소와 같은 일본어 메시지를 싣는다.

- HTML(`docs/ko` → 승인 후 `docs/ja` 자연스러운 일본어). 도식은 AWS 공식 아이콘. 저장소에 둔다(Artifact 공유 안 함).
- 스크린샷: 로컬 화면은 Claude 가 Playwright 로. **GitHub·AWS 콘솔 화면은 담당자가 로그인하고 Claude 가 캡처**(계정 ID 등은 가림). 같은 성격의 조작은 대표 1장.
  - 담당자 개입 방식: Claude 가 "무엇을 / 왜(무엇을 위해) 추가하는지 / 어느 화면에서" 요청 → 담당자가 조작해 화면을 띄움 → Claude 가 캡처.
    화면이 원하는 상태와 다르면 Claude 가 직접 조작해서 찍는다. 개인정보(사용자명·아바타·이메일·계정 ID 등)는 Claude 가 판단해 블러 처리.
- 코드는 연결·설정·보안·빌드만 싣고, 화면 코드는 디자인을 뺀 요약("받은 값이 어디에 나오나"). 핵심 부분만 부분 스크린샷, 나머지는 전체 화면 1장. 장마다 커밋 1개.
- 담당자 학습 노트(`notes/`, 비공개)는 상세히. ADR 은 따로 만들지 않고 이 파일로 대신한다.

## Claude 작업 환경

- CLAUDE.md(→ AGENTS.md import), `.claude/settings.json` 권한(deploy·destroy·push 는 확인, `.env` 읽기 차단), 출력 스타일 Explanatory,
  스킬 `/log-work`·`/write-guide`, 질문은 AskUserQuestion 형식.
- GitHub 작업은 `gh` CLI(GitHub MCP 는 토큰 미설정으로 미사용), Context7 로 최신 문서 확인.
