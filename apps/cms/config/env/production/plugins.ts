import type { Core } from "@strapi/strapi";

// 운영(AWS)에서만 쓰는 플러그인 설정. 업로드한 사진을 PC 디스크 대신 S3 에 저장한다
// (컨테이너의 디스크는 재시작하면 사라지므로). config/plugins.ts 위에 덮어쓴다
const config = ({
  env,
}: Core.Config.Shared.ConfigParams): Core.Config.Plugin => ({
  upload: {
    config: {
      provider: "aws-s3",
      providerOptions: {
        // 사진의 공개 주소: 사이트용 CloudFront 의 /uploads/... (버킷 자체는 비공개)
        baseUrl: env("MEDIA_BASE_URL"),
        rootPath: "uploads",
        s3Options: {
          // 자격 증명은 적지 않는다 → ECS 작업에 붙인 IAM 역할을 AWS SDK 가 자동으로 사용
          region: env("AWS_REGION"),
          params: {
            Bucket: env("MEDIA_BUCKET"),
            // 비공개 버킷(ACL 비활성)이므로 ACL 을 보내지 않는다. 생략하면 public-read 가 붙어 업로드가 실패한다
            ACL: undefined,
          },
        },
      },
    },
  },
});

export default config;
