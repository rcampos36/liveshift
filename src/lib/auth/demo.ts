import "server-only";

import { prisma } from "@/lib/db/prisma";
import { hashPassword } from "@/lib/auth/password";
import { createUserSession } from "@/lib/auth/session";
import { companyHomePath } from "@/lib/authorization/permissions";
import { getDemoEmail, getDemoPassword } from "@/lib/env";

const DEMO_COMPANY_SLUG = "citlatli";

export async function ensureDemoAccount() {
  const email = getDemoEmail();
  const company = await prisma.company.findFirst({
    where: { slug: DEMO_COMPANY_SLUG },
    select: { id: true },
  });

  if (!company) {
    return null;
  }

  const passwordHash = await hashPassword(getDemoPassword());
  const user = await prisma.user.upsert({
    where: { email },
    update: {
      passwordHash,
      firstName: "Demo",
      lastName: "Host",
      platformRole: null,
      emailVerifiedAt: new Date(),
    },
    create: {
      email,
      passwordHash,
      firstName: "Demo",
      lastName: "Host",
      platformRole: null,
      emailVerifiedAt: new Date(),
    },
  });

  await prisma.companyMembership.upsert({
    where: { userId_companyId: { userId: user.id, companyId: company.id } },
    update: { role: "COMPANY_ADMIN", status: "ACTIVE" },
    create: { userId: user.id, companyId: company.id, role: "COMPANY_ADMIN", status: "ACTIVE" },
  });

  return { userId: user.id, companyId: company.id };
}

export async function startDemoSession(userAgent?: string | null) {
  const account = await ensureDemoAccount();
  if (!account) {
    return null;
  }

  const session = await createUserSession(account.userId, userAgent);
  return {
    session,
    path: companyHomePath(account.companyId, "COMPANY_ADMIN"),
  };
}
