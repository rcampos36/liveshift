import { PrismaNeon } from "@prisma/adapter-neon";
import { PrismaPg } from "@prisma/adapter-pg";

export function isNeonConnectionString(connectionString: string) {
  return connectionString.includes("neon.tech") || connectionString.includes("neon.local");
}

export function createPrismaAdapter(connectionString: string) {
  if (isNeonConnectionString(connectionString)) {
    return new PrismaNeon({ connectionString });
  }

  return new PrismaPg({ connectionString });
}
