import * as fs from "node:fs";
import * as path from "node:path";
import { Platform } from "aws-cdk-lib/aws-ecr-assets";
import * as ecs from "aws-cdk-lib/aws-ecs";

const repoRoot = path.join(__dirname, "..", "..");
const keepAtRoot = [
  "package.json",
  "pnpm-lock.yaml",
  "pnpm-workspace.yaml",
  "apps",
];

/**
 * 앱의 Dockerfile(apps/<app>/Dockerfile)로 ARM64 이미지를 만든다.
 * cdk deploy 가 빌드 → ECR 에 올림 → ECS 가 그 이미지를 쓰도록 연결까지 해 준다.
 *
 * 빌드 범위는 저장소 루트(lockfile 이 루트에 있으므로)지만, 넣는 것은 루트의 패키지 파일 3개 + 그 앱의 폴더뿐.
 * 나머지는 실제 목록을 읽어 모두 제외한다 → 문서·설정·다른 앱이 바뀌어도 이미지가 다시 만들어지지(= 재배포되지) 않는다
 */
export function appImage(app: "web" | "cms"): ecs.ContainerImage {
  return ecs.ContainerImage.fromAsset(repoRoot, {
    file: `apps/${app}/Dockerfile`,
    platform: Platform.LINUX_ARM64, // Fargate 를 Graviton(ARM)으로 실행 (같은 성능에 더 저렴)
    exclude: [
      ...fs.readdirSync(repoRoot).filter((name) => !keepAtRoot.includes(name)),
      ...fs
        .readdirSync(path.join(repoRoot, "apps"))
        .filter((name) => name !== app)
        .map((name) => `apps/${name}`),
      // 앱 폴더 안에서도 PC 에서 만든 것·시크릿은 넣지 않는다
      "**/node_modules",
      "**/.next",
      "**/dist",
      "**/.strapi",
      "**/.env*",
      "apps/cms/public/uploads",
    ],
  });
}
