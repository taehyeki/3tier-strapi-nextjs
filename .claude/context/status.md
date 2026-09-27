# 진행 상황과 인수인계 (세션이 바뀌어도 이 파일로 이어간다)

작업 단위가 끝날 때마다 이 파일을 갱신한다. 대화 기록에만 있는 결정·사실은 여기 없으면 없는 것으로 본다.

## 목표 (변하지 않음)

- 3층 아키텍처 연수의 **참고 예시**. 연수자(일본인)는 자기 인프라 위에 "개발 → GitHub → CI/CD → 배포"를 자기 사이트로 만든다.
- 기능은 최소(Read), 방식은 베스트 프랙티스 철저, 최신 공식 문서 근거, 모던한 방법.
- 산출물 = `docs/ko/*.html`(승인 후 ja 번역). 저장소 = 담당자용 정답지(문서와 정확히 일치).
- 담당자 학습 노트 `notes/study-notes.html`(git 제외)에 단계마다 무엇/왜/장단점 기록.

## 장 상태

| 장 | 파일 | 상태 |
|---|---|---|
| 00 전체 구조 | docs/ko/00-overview.html | 완료 (AWS 아이콘 구성도, WordPress 차이, 코드/화면 분담) |
| 01 로컬 환경 | docs/ko/01-local-setup.html | 완료, 빈 폴더 재현 테스트 통과 |
| 02 스키마 | docs/ko/02-strapi-schema.html | 완료 (메뉴판 그림으로 4가지 그릇 설명) |
| 03 데이터·API | docs/ko/03-data-and-api.html | 완료 (403/401/200 토큰 원리) |
| 04 Next.js | docs/ko/04-nextjs-page.html | 완료 (타입 자동 생성, 화면은 "받은 값이 어디에 나오나"를 부분 코드+부분 스크린샷으로) |
| 05 GitHub·CI | docs/ko/05-github-ci.html | 한국어 2차안(참고 자료 형식으로 축약, 담당자 검토 대기, PR #2). PR #1 squash 머지(58d6e5a), Ruleset·머지 방식 설정 완료, main CI 통과 |
| 06 배포(CD) | - | **진행 중(PR #3)**: 스택 3개 재설계 완료, 토대 스택 배포·GitHub 시크릿 등록 완료 → 머지 → 첫 배포 → 운영 초기 설정(관리자 등록·데이터·토큰) → 01~06장 문서 정리 |
| 07 변경을 운영까지 | - | 마무리 장(예정): 작은 변경(예: 토핑에 필드 추가 → 타입 재생성 → 화면) → PR → CI → 머지 → CD → 운영 화면에서 반영 확인 |
| 01~04 정리 | - | 나중에 한꺼번에: 참고 자료 형식(핵심·발췌 + "전체: 경로")으로 축약 (담당자 지시, 2026-09-27) |
| 일본어 번역 | docs/ja/ | 담당자 승인 후 |

장별 커밋 (pnpm 12 로 재작성 → 2026-09-27 메시지 일본어화. 이전: `backup/pre-pnpm12`, `backup/pre-ja-msg`):
`a0b54d6 chore: ローカル開発環境を構築` / `e118ddf feat(cms): メニューのスキーマを追加` / `37d5e4c chore(web): Strapi 接続設定の例を追加` / `3057d62 feat(web): メニューページ`.
main 은 push 완료. 05장 코드 = `58d6e5a ci: lefthook・Dockerfile・GitHub Actions の CI を追加 (#1)`. **main 은 Ruleset 으로 보호**(PR 필수·CI 4개 필수·squash 만·force push 금지, bypass 없음) → 문서·설정 변경도 모두 브랜치 → PR.

## 확정된 설계 (근거는 notes/study-notes.html)

- 모노레포 pnpm 12.6 (allowBuilds 전부 false, 공개 1일 미만 버전 거부) / Node 24 / Biome 2.5 (루트 biome.json, preset recommended, svg 제외) / Strapi 5.55 / Next.js 16.3 (App Router)
- 로컬: DB만 Docker(postgres:17, 5432), web :3000·cms :1337 는 `pnpm dev:*`
- Strapi: 스키마·데이터·토큰은 관리자 화면. 코드는 config 만. 토큰 = Custom(find/findOne만)
- Next.js: `@strapi/client`(공식) + `server-only` + 데이터 함수 안에서 `await connection()` (빌드 시 Strapi 불필요, 런타임 env)
- 타입: `pnpm gen:types` = Strapi OpenAPI(experimental) → openapi-typescript → `apps/web/src/types/strapi.d.ts`(커밋). 스키마 변경 시 재실행
- 이미지: `next/image` + `unoptimized` (Next 16 은 localhost 이미지 최적화를 기본 거부)
- AWS(06장): 도쿄, VPC+NAT1, Aurora Serverless v2 PostgreSQL, ECS Fargate(web/cms) + 내부 ALB + CloudFront VPC Origin ×2(도메인 없음), S3 미디어, Secrets Manager, prod 1환경
- 배포: main 머지 → deploy.yml `publish (web/cms)`(빌드·Trivy·ECR push, 태그=커밋 SHA) → `deploy`(3tier-prod 환경, `cdk deploy --all -c imageTag=SHA`, 빌드 안 함). 로컬은 bootstrap·토대 스택(`pnpm -F infra foundation deploy --profile mfa -c githubSubjectPrefix="$(gh api repos/{owner}/{repo}/actions/oidc/customization/sub --jq .sub_claim_prefix)"`)만
- AWS 상태(2026-09-27): CDKToolkit, ThreeTierFoundation(ECR 3tier/web·3tier/cms, ImagePushRole, DeployRole) 배포됨. 옛 ThreeTierGithubOidc 삭제. GitHub 시크릿: 저장소 `AWS_IMAGE_PUSH_ROLE_ARN`, 환경 3tier-prod `AWS_DEPLOY_ROLE_ARN`
- CI: Biome, typecheck, build, gitleaks, Docker 빌드, Trivy + lefthook(커밋 전). GitHub: Ruleset, Environment `3tier-prod`(승인자는 보류 — decisions.md), Secret scanning (public 저장소, 회사 플랜에서 안 되면 생략 가능하게 표기)

## 검증 방법 (문서 ↔ 저장소 일치)

- 01장 문서의 `<p class="file">경로</p><pre>` 블록을 `git show <01장 커밋>:경로` 와 비교 (담당자 전용 .gitignore 줄 제외). 03·04장도 해당 커밋과 비교
- 빈 폴더 재현: 01장 명령을 스크립트로 실행 (포트만 담당자 PC 사정으로 변경)

## 05장 이후에 반드시 반영할 사실 (검증 완료)

- create-next-app 의 `apps/web/.gitignore` 는 `.env*` 를 무시 → `!.env.example` 추가 필요 (03장에 반영함). 하위 .gitignore 가 루트의 예외 규칙보다 우선
- `pnpm format` 은 biome.json 자신도 재정렬함 → 문서에는 포맷 후 모양을 싣는다

- `apps/cms/types/generated` 는 커밋 대상 → CI 에서 Strapi 기동 없이 typecheck 가능
- `pnpm -F web build` 는 Strapi 없이 성공해야 함(`/` = ƒ Dynamic). CI 는 `.env.local` 없이 빌드
- Dockerfile 검증 완료: web 292MB(standalone, 서버는 `apps/web/server.js`), cms 1.09GB. 둘 다 `node` 사용자. cms 는 빈 DB 에 스키마 자동 생성, 토큰 없는 API 403
- pnpm 12 에서는 담당자 PC 의 pnpm 10 이 자동 전환 못 함 → 담당자가 `npx get-pnpm` 필요(그 전까지 Claude 는 scratchpad 의 pnpm 12 사용)
- Docker Desktop 스냅샷 오류("already exists")로 로컬 Trivy 이미지 pull 실패 → Docker Desktop 재시작으로 해결(이전에도 같은 증상)
- GitHub 저장소 설정 변경은 Claude Code auto mode 분류기에 막힐 수 있음 → 담당자가 조작, Claude 는 읽기 전용 캡처·API 확인
- GitHub 캡처는 페이지 안에서 아바타(img[src*=avatars])와 사용자명 텍스트에 CSS blur 를 건 뒤 찍는다. 문서 이미지: docs/assets/img/github/
- 문서 생성: scratchpad 의 05.src.html 틀 + build05.py(`{{FILE:경로}}`·`{{EXCERPT:경로:시작:끝}}` 를 `git show main:경로` 로 채움). 세션이 바뀌면 틀은 docs/ko/05-github-ci.html 을 직접 고친다
- 06장: Strapi `config/plugins.ts`(S3 upload provider), `config/middlewares.ts`(CSP 에 이미지 도메인), 운영 토큰은 운영 Strapi 에서 따로 발급→Secrets Manager, 첫 관리자 등록은 배포 직후 바로(선점 위험)
- 회사 환경 인수 목록: CDK bootstrap 1회, GitHub OIDC Provider 계정당 1개, VPC/EIP 한도, Docker Desktop 라이선스, GitHub 플랜별 기능

## 문서 작성 규칙 요약 (상세: .claude/skills/write-guide)

- **2026-09-27 변경**: 코드는 저장소로도 제공 → 문서는 참고 자료(핵심·짧은 발췌 + "전체: `경로`"). 이전·더 해보기 없음. 05장부터 적용, 01~04장 적용 여부는 담당자 확인 대기

- 톤: "이런 방식으로 한다, 참고해서 자기 것을 만든다". 예시 값은 (예시), 사진 등 소재는 제공 안 함
- 대상은 프론트·백엔드 개념이 처음인 사람. 연결·설정·보안·빌드 코드는 싣고, 화면 코드는 디자인을 뺀 요약으로 "받은 값이 어디에 나오나"만 (실제 화면과 다를 수 있다고 명시)
- 각 장 끝에 커밋 단계 (Conventional Commits)
- 요점에서 벗어난 내용·중복 금지, 스크린샷은 대표 1장, 파일이 바뀌면 📁 상태
- 문서의 코드는 저장소 파일에서 직접 읽어 넣고, 명령은 실제로 실행해 검증

## 세션 재개 시 확인

```bash
pnpm dev:db && pnpm dev:cms   # 다른 터미널에서 pnpm dev:web
(cd docs && python3 -m http.server 8765)   # 문서 미리보기 http://localhost:8765/ko/00-overview.html
```
