# AGENTS.md

이 저장소에서 작업하는 모든 AI 에이전트·개발자를 위한 규칙이다 (Claude Code 는 CLAUDE.md 가 이 파일을 불러온다).
진행 상황·다음 작업은 `.claude/context/status.md`, 모든 결정의 이유·버린 대안·변경 이력은 `.claude/context/decisions.md` 에 있다. 작업 전에 반드시 읽는다.

## 이 저장소는 무엇인가

3층 아키텍처 연수의 **참고 예시**. 연수자(일본인, 프론트·백엔드 개념이 처음인 사람)는 인프라를 각자 설계하고,
그 위에 "앱 개발 → GitHub → CI/CD → 배포"를 **자기 사이트로** 만든다. 이 저장소는 그 흐름의 예시다.

- 예시 사이트: キム系 라멘 가게 「麺屋ヤマモリ」의 메뉴 표시 (Read 전용)
- 연수자에게는 **문서(docs/)와, 나중에 이 저장소의 코드**를 제공한다. 문서는 따라 하기가 아니라 **참고 자료**:
  핵심과 짧은 발췌만 싣고 상세는 저장소 파일 경로로 안내한다. 문서에 싣는 발췌·명령·커밋 단위는 저장소와 **정확히 일치**시킨다.
- 문서는 한국어(docs/ko)로 먼저 쓰고, 담당자 승인 후 일본어(docs/ja)로 번역한다.
- 인프라(infra/)는 모던하게 만들지만 가르치는 대상이 아니라 흐름을 돌리기 위한 장치다.

## 원칙

- 기능은 최소(Read), 방식은 베스트 프랙티스 철저 (시크릿 분리, 최소 권한, 설정은 환경변수, 스키마는 코드로 관리).
- 근거는 최신 공식 문서로 확인하고, 명령·코드는 실제로 실행해서 검증한 뒤 문서에 싣는다.
- Strapi 스키마·데이터·토큰은 관리자 화면에서 한다. 코드로 바꾸는 것은 config, Next.js, 배포 설정뿐.
- 굳이 바꿀 필요가 없는 생성물(create-next-app 등)은 그대로 둔다. 변경이 적을수록 연수자가 덜 헷갈린다.
- AWS 계정 ID, 토큰, 조직·저장소 이름은 코드·문서에 하드코딩하지 않는다 (public 저장소, 회사 이전 대비).
- AWS 변경은 GitHub Actions 의 `cdk deploy` 로만 한다. 예외: 최초 `cdk bootstrap` 과 GitHub OIDC 역할.
- 담당자 PC 전용 차이는 git 제외 파일로 처리한다 (예: `compose.override.yaml`).
- 커밋 메시지·PR 제목·PR 본문은 **일본어**로 쓴다 (형식은 Conventional Commits, `종류(대상):` 는 영어). 연수자와 회사 저장소 사람이 읽기 때문.

## 회사 저장소로 이전할 것을 전제로 한다

- 지금은 담당자 개인 GitHub(public)에서 만들고, 나중에 회사 GitHub(플랜 미정, private 가능성)로 옮긴다.
- 이전 방법: 히스토리째 옮긴다 (`git clone --mirror` → 회사 저장소에 `git push --mirror`). 그래서 **커밋 단위와 메시지를 깨끗하게** 유지한다.
- 저장소 밖의 설정(Ruleset, Environments, Variables/Secrets, OIDC 신뢰 조건)은 이전되지 않는다.
  → 재설정 절차를 문서와 스크립트로 남기고, 워크플로·IaC 는 `${{ github.repository }}` 같은 값을 써서 저장소 이름에 의존하지 않게 한다.
- 유료 GitHub 기능(private 에서의 Ruleset·승인·Secret scanning 등)은 "없으면 생략 가능"하게 만든다.
- 담당자 전용: `.claude/`(AI 작업 설정), `assets/sample-images/`. 연수자에게 배포하는 것은 `docs/` 뿐.

## 작업 규칙

- 담당자가 말한 **중요한 방침·결정은 즉시 파일에 동기화**한다. 대화에만 있는 결정은 없는 것으로 본다.
  - 원칙·규칙 → 이 AGENTS.md / 결정(이유·대안) → `.claude/context/decisions.md` / 진행·검증한 사실 → `.claude/context/status.md` / 문서 작성 규칙 → `.claude/skills/write-guide`
- 작업 단위가 끝나면 status.md 를 갱신한다. 세션이 바뀌거나 컨텍스트가 정리돼도 이 파일들만으로 이어갈 수 있어야 한다.
- 문서를 고칠 때는 앞 장과의 일관성도 확인한다 (뒤 장의 결정이 앞 장의 내용을 바꾸는지).

## Commands (저장소 루트)

- Node `.nvmrc`(24) / pnpm workspace / `pnpm install`
- 로컬 기동: `pnpm dev:db` → `pnpm dev:cms`(:1337) / `pnpm dev:web`(:3000)
- 검사: `pnpm lint`, `pnpm format`, `pnpm typecheck`, `pnpm -F web build`
- 스키마 변경 후 타입 재생성: `pnpm gen:types`

## Architecture

```
apps/web   Next.js 16 (App Router). 서버 컴포넌트가 Strapi API 토큰으로 Read. 로컬 :3000
apps/cms   Strapi 5. 스키마는 파일(schema.json)로 git 관리. 로컬 :1337
infra      AWS CDK (TypeScript). 도쿄 리전 (06장에서 작성)
docs       연수자용 HTML 문서 (ko → ja)
notes      담당자 학습 노트 (git 제외)
```

로컬: web·cms 는 직접 실행, DB(PostgreSQL 17)만 컨테이너.
AWS: CloudFront ×2 (VPC Origin) → 내부 ALB → ECS Fargate (web / cms) → Aurora Serverless v2 PostgreSQL. 미디어 S3, 시크릿 Secrets Manager.
스키마는 배포되지만 **데이터는 배포되지 않는다**.
