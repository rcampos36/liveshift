import { spawnSync } from "node:child_process";

if (!process.env.DATABASE_URL_UNPOOLED && !process.env.DATABASE_URL) {
  console.log("Skipping prisma migrate deploy (no database URL)");
  process.exit(0);
}

const result = spawnSync("prisma", ["migrate", "deploy"], {
  stdio: "inherit",
  env: process.env,
});

process.exit(result.status ?? 1);
