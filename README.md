# 3tier-strapi-nextjs

3층 아키텍처 연수용 참고 구현입니다. Strapi(CMS) + Next.js(화면)로 만든 지로계 라멘 가게 메뉴 사이트를
로컬에서 개발하고, GitHub PR → CI/CD → AWS(ECS Fargate / Aurora)로 배포하는 흐름을 보여줍니다.

| 폴더 | 내용 |
|---|---|
| `apps/web` | Next.js (화면, :3000) |
| `apps/cms` | Strapi v5 (관리자 화면·API, :1337) |
| `infra` | AWS CDK (인프라 + 배포) |
| `docs` | 연수 문서 (HTML) |

> 연수 문서는 작성 중입니다.
