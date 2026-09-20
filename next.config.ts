import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["bcryptjs", "@prisma/adapter-neon", "@prisma/adapter-pg", "pg"],
};

export default nextConfig;
