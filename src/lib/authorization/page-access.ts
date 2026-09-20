import "server-only";

import { redirect } from "next/navigation";
import {
  canAccessCompany,
  canAccessLocation,
  requirePageUser,
} from "@/lib/authorization/guards";
import { companyHomePath, roleHasPermission } from "@/lib/authorization/permissions";
import { getAccessibleScope } from "@/lib/authorization/scope";
import type { AppRole } from "@/lib/authorization/roles";

export async function requireCompanyPage(companyId: string) {
  const user = await requirePageUser();
  if (!canAccessCompany(user, companyId)) {
    redirect("/dashboard");
  }

  const companies = await getAccessibleScope(user);
  const company = companies.find((item) => item.id === companyId);
  if (!company) {
    redirect("/dashboard");
  }

  return { user, company, companies };
}

export function assertOperationalCompanyPage(companyId: string, role: AppRole) {
  if (!roleHasPermission(role, "operations.read")) {
    redirect(companyHomePath(companyId, role));
  }
}

export async function requireRestaurantPage(companyId: string, locationId: string) {
  const context = await requireCompanyPage(companyId);
  if (!canAccessLocation(context.user, locationId, companyId)) {
    redirect(companyHomePath(companyId, context.company.role));
  }

  const restaurant = context.company.locations.find((item) => item.id === locationId);
  if (!restaurant) {
    redirect(companyHomePath(companyId, context.company.role));
  }

  return { ...context, restaurant };
}
