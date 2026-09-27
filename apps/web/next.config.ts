import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 実行に必要なファイルだけを .next/standalone に集める(Docker イメージを小さくする)
  output: "standalone",
};

export default nextConfig;
