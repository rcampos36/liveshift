import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const prismaBin = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../node_modules/.bin/prisma",
);

if (!process.env.DATABASE_URL_UNPOOLED && !process.env.DATABASE_URL) {
  if (process.env.VERCEL) {
    console.error("DATABASE_URL or DATABASE_URL_UNPOOLED is required on Vercel so migrations can run.");
    process.exit(1);
  }
  console.log("Skipping prisma migrate deploy (no database URL)");
  process.exit(0);
}

const result = spawnSync(prismaBin, ["migrate", "deploy"], {
  stdio: "inherit",
  env: process.env,
});

process.exit(result.status ?? 1);
