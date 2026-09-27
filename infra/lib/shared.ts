import type * as cdk from "aws-cdk-lib/core";

/** 앱 이름. Dockerfile 위치(apps/<app>)·이미지 저장소·ECS 서비스에 쓴다 */
export const APPS = ["web", "cms"] as const;
export type AppName = (typeof APPS)[number];

/**
 * 이미지 저장소(ECR) 이름. 세 곳이 같은 이름을 쓴다:
 *   foundation-stack.ts(만든다) / app-image.ts(ECS 가 받아 간다) / .github/workflows/deploy.yml(CI 가 올린다)
 */
export const imageRepositoryName = (app: AppName) => `3tier/${app}`;

/**
 * 배포할 리전. 도쿄로 고정한다(실행 환경에 따라 바뀌지 않게). 다른 리전은 -c region=<리전>
 * 계정은 코드에 적지 않는다 → 배포하는 자격 증명의 계정에 배포된다(코드·캐시 파일에 계정 ID 가 남지 않는다)
 */
export const regionOf = (app: cdk.App): string =>
  app.node.tryGetContext("region") ?? "ap-northeast-1";
