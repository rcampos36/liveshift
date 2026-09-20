import "server-only";

import { prisma } from "@/lib/db/prisma";
import type { AuthUser } from "@/lib/auth/types";
import { isSuperAdmin } from "@/lib/authorization/guards";
import type { AppRole } from "@/lib/authorization/roles";

export type AccessibleLocation = {
  id: string;
  name: string;
  slug: string;
  companyId: string;
  role: AppRole;
};

export type AccessibleCompany = {
  id: string;
  name: string;
  slug: string;
  role: AppRole;
  locations: AccessibleLocation[];
};

export async function getAccessibleScope(user: AuthUser): Promise<AccessibleCompany[]> {
  if (isSuperAdmin(user)) {
    const companies = await prisma.company.findMany({
      orderBy: { name: "asc" },
      include: {
        locations: { orderBy: { name: "asc" } },
      },
    });

    return companies.map((company) => ({
      id: company.id,
      name: company.name,
      slug: company.slug,
      role: "SUPER_ADMIN",
      locations: company.locations.map((location) => ({
        id: location.id,
        name: location.name,
        slug: location.slug,
        companyId: company.id,
        role: "SUPER_ADMIN",
      })),
    }));
  }

  const companies = new Map<string, AccessibleCompany>();

  for (const membership of user.companyMemberships) {
    companies.set(membership.companyId, {
      id: membership.company.id,
      name: membership.company.name,
      slug: membership.company.slug,
      role: membership.role,
      locations: [],
    });
  }

  const adminCompanyIds = user.companyMemberships
    .filter((membership) => membership.role === "COMPANY_ADMIN")
    .map((membership) => membership.companyId);

  if (adminCompanyIds.length > 0) {
    const locations = await prisma.location.findMany({
      where: { companyId: { in: adminCompanyIds } },
      orderBy: { name: "asc" },
    });

    for (const location of locations) {
      const company = companies.get(location.companyId);
      if (!company) continue;

      company.locations.push({
        id: location.id,
        name: location.name,
        slug: location.slug,
        companyId: location.companyId,
        role: company.role,
      });
    }
  }

  for (const membership of user.locationMemberships) {
    const companyId = membership.location.companyId;
    const existingCompany = companies.get(companyId);

    if (!existingCompany) {
      companies.set(companyId, {
        id: membership.location.company.id,
        name: membership.location.company.name,
        slug: membership.location.company.slug,
        role: membership.role,
        locations: [
          {
            id: membership.location.id,
            name: membership.location.name,
            slug: membership.location.slug,
            companyId,
            role: membership.role,
          },
        ],
      });
      continue;
    }

    if (!existingCompany.locations.some((location) => location.id === membership.locationId)) {
      existingCompany.locations.push({
        id: membership.location.id,
        name: membership.location.name,
        slug: membership.location.slug,
        companyId,
        role: membership.role,
      });
    }
  }

  return [...companies.values()].sort((a, b) => a.name.localeCompare(b.name));
}
