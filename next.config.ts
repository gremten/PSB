import type { NextConfig } from "next";
import { execSync } from "node:child_process";

function resolveBuildId() {
  if (process.env.PSB_BUILD_ID) return process.env.PSB_BUILD_ID;
  if (process.env.VERCEL_GIT_COMMIT_SHA) return process.env.VERCEL_GIT_COMMIT_SHA.slice(0, 12);
  try {
    return execSync("git rev-parse --short=12 HEAD", { stdio: ["ignore", "pipe", "ignore"] })
      .toString()
      .trim();
  } catch {
    return `local-${new Date().toISOString().replace(/\D/g, "").slice(0, 14)}`;
  }
}

const buildId = resolveBuildId();

const nextConfig: NextConfig = {
  env: { NEXT_PUBLIC_BUILD_ID: buildId },
  generateBuildId: async () => buildId,
  serverExternalPackages: ["better-sqlite3"],
};

export default nextConfig;
