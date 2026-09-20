import "server-only";

import { PrismaClient } from "@/generated/prisma/client";
import { createPrismaAdapter } from "@/lib/db/adapter";
import { getDatabaseUrl } from "@/lib/env";

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
  prismaUrl?: string;
  prismaShape?: string;
};

const PRISMA_SHAPE = "billing-plan-features";

function getPrismaClient() {
  const url = getDatabaseUrl();

  if (
    globalForPrisma.prisma &&
    globalForPrisma.prismaUrl === url &&
    globalForPrisma.prismaShape === PRISMA_SHAPE &&
    "auditLog" in globalForPrisma.prisma &&
    "companySubscription" in globalForPrisma.prisma &&
    "billingInvoice" in globalForPrisma.prisma
  ) {
    return globalForPrisma.prisma;
  }

  const client = new PrismaClient({
    adapter: createPrismaAdapter(url),
  });

  globalForPrisma.prisma = client;
  globalForPrisma.prismaUrl = url;
  globalForPrisma.prismaShape = PRISMA_SHAPE;
  return client;
}

export const prisma = new Proxy({} as PrismaClient, {
  get(_target, property) {
    const client = getPrismaClient();
    const value = Reflect.get(client, property, client);
    return typeof value === "function" ? value.bind(client) : value;
  },
});
