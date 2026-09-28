import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 개발용 로컬 DB(PGlite)는 WASM 파일을 쓰므로 번들하지 않고 Node에서 그대로 불러온다.
  serverExternalPackages: ["@electric-sql/pglite"],
};

export default nextConfig;
