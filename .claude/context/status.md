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
| 05 GitHub·CI | - | **다음 작업** |
| 06 배포(CD) | - | 미착수 |
| 일본어 번역 | docs/ja/ | 담당자 승인 후 |

로컬 커밋 완료(아직 push 안 함), 문서의 장별 커밋과 1:1 대응:
`dfa5514 chore: 로컬 개발환경 구성` / `e658687 feat(cms): 메뉴 스키마 추가` / `1091761 chore(web): Strapi 접속 설정 예시 추가` / `f54998a feat(web): 메뉴 페이지`.
docs/·.claude/·assets/ 는 미커밋(담당자 산출물, 별도 커밋 예정). 05장에서 GitHub 에 push 하고, 이후 변경은 브랜치 → PR 로 한다.

## 확정된 설계 (근거는 notes/study-notes.html)

- 모노레포 pnpm 10 / Node 24 / Biome 2.4 (루트 biome.json) / Strapi 5.55 / Next.js 16.3 (App Router)
- 로컬: DB만 Docker(postgres:17, 5432), web :3000·cms :1337 는 `pnpm dev:*`
- Strapi: 스키마·데이터·토큰은 관리자 화면. 코드는 config 만. 토큰 = Custom(find/findOne만)
- Next.js: `@strapi/client`(공식) + `server-only` + 데이터 함수 안에서 `await connection()` (빌드 시 Strapi 불필요, 런타임 env)
- 타입: `pnpm gen:types` = Strapi OpenAPI(experimental) → openapi-typescript → `apps/web/src/types/strapi.d.ts`(커밋). 스키마 변경 시 재실행
- 이미지: `next/image` + `unoptimized` (Next 16 은 localhost 이미지 최적화를 기본 거부)
- AWS(06장): 도쿄, VPC+NAT1, Aurora Serverless v2 PostgreSQL, ECS Fargate(web/cms) + 내부 ALB + CloudFront VPC Origin ×2(도메인 없음), S3 미디어, Secrets Manager, prod 1환경
- 배포: GitHub Actions 에서만 `cdk deploy`(ContainerImage.fromAsset, 변경 경로가 있을 때만). 최초 bootstrap·OIDC 역할만 로컬
- CI: Biome, typecheck, build, gitleaks, Docker 빌드, Trivy + lefthook(커밋 전). GitHub: Ruleset, Environment `production` 승인, Secret scanning (public 저장소, 회사 플랜에서 안 되면 생략 가능하게 표기)

## 검증 방법 (문서 ↔ 저장소 일치)

- 01장 문서의 `<p class="file">경로</p><pre>` 블록을 `git show <01장 커밋>:경로` 와 비교 (담당자 전용 .gitignore 줄 제외). 03·04장도 해당 커밋과 비교
- 빈 폴더 재현: 01장 명령을 스크립트로 실행 (포트만 담당자 PC 사정으로 변경)

## 05장 이후에 반드시 반영할 사실 (검증 완료)

- create-next-app 의 `apps/web/.gitignore` 는 `.env*` 를 무시 → `!.env.example` 추가 필요 (03장에 반영함). 하위 .gitignore 가 루트의 예외 규칙보다 우선
- `pnpm format` 은 biome.json 자신도 재정렬함 → 문서에는 포맷 후 모양을 싣는다

- `apps/cms/types/generated` 는 커밋 대상 → CI 에서 Strapi 기동 없이 typecheck 가능
- `pnpm -F web build` 는 Strapi 없이 성공해야 함(`/` = ƒ Dynamic). CI 는 `.env.local` 없이 빌드
- Dockerfile(web, cms)은 05장에서 작성 (CI 의 Docker 빌드·Trivy 대상). Next 는 `output: "standalone"` 검토
- 06장: Strapi `config/plugins.ts`(S3 upload provider), `config/middlewares.ts`(CSP 에 이미지 도메인), 운영 토큰은 운영 Strapi 에서 따로 발급→Secrets Manager, 첫 관리자 등록은 배포 직후 바로(선점 위험)
- 회사 환경 인수 목록: CDK bootstrap 1회, GitHub OIDC Provider 계정당 1개, VPC/EIP 한도, Docker Desktop 라이선스, GitHub 플랜별 기능

## 문서 작성 규칙 요약 (상세: .claude/skills/write-guide)

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
