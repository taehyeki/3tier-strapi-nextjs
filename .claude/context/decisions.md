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

## 문서

- HTML(`docs/ko` → 승인 후 `docs/ja` 자연스러운 일본어). 도식은 AWS 공식 아이콘. 저장소에 둔다(Artifact 공유 안 함).
- 스크린샷: 로컬 화면은 Claude 가 Playwright 로. **GitHub·AWS 콘솔 화면은 담당자가 로그인하고 Claude 가 캡처**(계정 ID 등은 가림). 같은 성격의 조작은 대표 1장.
- 코드는 연결·설정·보안·빌드만 싣고, 화면 코드는 디자인을 뺀 요약("받은 값이 어디에 나오나"). 핵심 부분만 부분 스크린샷, 나머지는 전체 화면 1장. 장마다 커밋 1개.
- 담당자 학습 노트(`notes/`, 비공개)는 상세히. ADR 은 따로 만들지 않고 이 파일로 대신한다.

## Claude 작업 환경

- CLAUDE.md(→ AGENTS.md import), `.claude/settings.json` 권한(deploy·destroy·push 는 확인, `.env` 읽기 차단), 출력 스타일 Explanatory,
  스킬 `/log-work`·`/write-guide`, 질문은 AskUserQuestion 형식.
- GitHub 작업은 `gh` CLI(GitHub MCP 는 토큰 미설정으로 미사용), Context7 로 최신 문서 확인.
