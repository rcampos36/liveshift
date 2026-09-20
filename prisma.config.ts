import "dotenv/config";
import { defineConfig } from "prisma/config";

// Generate does not connect. `env()` throws when the key is missing, which
// breaks Vercel `postinstall` before project env is always available.
const datasourceUrl =
  process.env.DATABASE_URL_UNPOOLED ||
  process.env.DATABASE_URL ||
  "postgresql://127.0.0.1:5432/liveshift";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    url: datasourceUrl,
  },
});
