import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 실행에 필요한 파일만 .next/standalone 에 모은다 (Docker 이미지를 작게)
  output: "standalone",
};

export default nextConfig;
