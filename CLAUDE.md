# CLAUDE.md

나한테 설명할 때는 한국어로 설명해줘.

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 이 저장소는 무엇인가

3층 아키텍처 연수의 **참고 구현**. 연수자는 인프라를 각자 설계하고, 이 저장소는 그 위에
"앱 개발환경 → GitHub → CI/CD → 배포" 흐름을 보여준다. 인프라(`infra/`)는 모던하게 만들지만
가르치는 대상이 아니라 흐름을 돌리기 위한 장치다.

- 예시 사이트: 지로계 라멘 가게 하나의 메뉴 표시 (Read 전용. CRUD·식권 시뮬레이터는 연수자 심화 과제)
- 연수자는 일본인. 문서는 한국어로 먼저 쓰고, 담당자 OK 후 일본어로 번역한다.

## 작업 규칙

- **모든 작업마다 무엇을 / 왜 / 장단점(대안)** 을 설명한다. 담당자는 이걸로 공부한다.
- 작업 단위가 끝나면 `/log-work` 로 `notes/study-notes.html`(git 제외, 담당자 전용)에 기록한다.
- 연수자용 문서는 `/write-guide` 규칙을 따른다 (`docs/`, HTML, 간결한 튜토리얼).
- AWS 변경은 GitHub Actions 의 `cdk deploy` 로만 한다. 예외: 최초 `cdk bootstrap` 과 GitHub OIDC 역할 (로컬에서 `--profile mfa`).
- AWS 계정 ID, 토큰 등은 코드·문서에 하드코딩하지 않는다 (public 저장소).
- 회사 환경(공유 계정 + SSO, GitHub 플랜 미정)으로 옮길 것을 전제로, 유료 GitHub 기능은 "없으면 생략 가능"하게 만든다.

## Commands

- Node: `.nvmrc` (24) / 패키지 매니저: pnpm (workspace)
- Install: `pnpm install`
<!-- 단계가 진행되면 dev / build / lint / cdk 명령을 추가 -->

## Architecture

```
apps/web   Next.js (App Router). 서버 컴포넌트가 Strapi API 토큰으로 Read. 로컬 :3000
apps/cms   Strapi v5. 콘텐츠 타입 스키마는 파일(schema.json)로 git 관리. 로컬 :1337
infra      AWS CDK (TypeScript). 도쿄 리전
docs       연수자용 HTML 문서 (ko → ja)
notes      담당자 학습 노트 (gitignore)
```

로컬(dev): web·cms 는 `pnpm dev` 로 직접 실행, DB(PostgreSQL)만 컨테이너.
AWS(prod): CloudFront ×2 (VPC Origin) → 내부 ALB → ECS Fargate (web / cms) → Aurora Serverless v2 PostgreSQL.
미디어는 S3, 시크릿은 Secrets Manager. web → cms 호출은 VPC 내부 통신.
스키마는 배포되지만 **데이터는 배포되지 않는다** (로컬·운영 모두 관리자 화면에서 입력).
