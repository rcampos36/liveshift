import "server-only";

import { prisma } from "@/lib/db/prisma";
import { hashPassword } from "@/lib/auth/password";
import { createUserSession } from "@/lib/auth/session";
import { companyHomePath } from "@/lib/authorization/permissions";
import { getDemoEmail, getDemoPassword } from "@/lib/env";
import { businessDateFor } from "@/lib/operations/scope";

const DEMO_COMPANY_SLUG = "citlatli";

const DEMO_HOUSES = [
  {
    slug: "citlatli",
    name: "Citlatli",
    timezone: "America/Mexico_City",
    city: "Mexico City",
    state: "CDMX",
    country: "MX",
    sales: 18450,
    goal: 22000,
    labor: 4980,
  },
  {
    slug: "short-pump",
    name: "Short Pump",
    timezone: "America/New_York",
    city: "Short Pump",
    state: "VA",
    country: "US",
    sales: 18420,
    goal: 18059,
    labor: 4126,
  },
  {
    slug: "midlothian",
    name: "Midlothian",
    timezone: "America/New_York",
    city: "Midlothian",
    state: "VA",
    country: "US",
    sales: 16200,
    goal: 17802,
    labor: 4568,
  },
  {
    slug: "richmond",
    name: "Richmond",
    timezone: "America/New_York",
    city: "Richmond",
    state: "VA",
    country: "US",
    sales: 21100,
    goal: 19537,
    labor: 4600,
  },
];

export function isDemoPassword(password: string) {
  return new Set(
    [getDemoPassword(), process.env.SUPER_ADMIN_PASSWORD, "liveshift-demo", "change-me"].filter(Boolean),
  ).has(password);
}

async function ensureDemoCompany() {
  const company = await prisma.company.upsert({
    where: { slug: DEMO_COMPANY_SLUG },
    update: { name: "Citlatli" },
    create: { name: "Citlatli", slug: DEMO_COMPANY_SLUG },
  });

  for (const house of DEMO_HOUSES) {
    const restaurant = await prisma.location.upsert({
      where: { companyId_slug: { companyId: company.id, slug: house.slug } },
      update: {
        name: house.name,
        timezone: house.timezone,
        city: house.city,
        state: house.state,
        country: house.country,
      },
      create: {
        companyId: company.id,
        name: house.name,
        slug: house.slug,
        timezone: house.timezone,
        city: house.city,
        state: house.state,
        country: house.country,
      },
    });
    const businessDate = businessDateFor(house.timezone);
    await prisma.dailyOperations.upsert({
      where: {
        locationId_businessDate: { locationId: restaurant.id, businessDate },
      },
      update: {},
      create: {
        companyId: company.id,
        locationId: restaurant.id,
        businessDate,
        salesAmount: house.sales,
        netSales: house.sales,
        grossSales: house.sales,
        salesGoal: house.goal,
        laborCost: house.labor,
      },
    });
  }

  return company;
}

export async function ensureDemoAccount() {
  const email = getDemoEmail();
  const company = await ensureDemoCompany();
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
  const session = await createUserSession(account.userId, userAgent);
  return {
    session,
    path: companyHomePath(account.companyId, "COMPANY_ADMIN"),
  };
}
