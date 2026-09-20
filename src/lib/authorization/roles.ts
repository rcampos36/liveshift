import type { CompanyRole, LocationRole, PlatformRole } from "@/generated/prisma/client";

export const PLATFORM_ROLES = ["SUPER_ADMIN"] as const;
export const COMPANY_ROLES = ["COMPANY_ADMIN", "BILLING_ADMIN"] as const;
export const LOCATION_ROLES = [
  "GENERAL_MANAGER",
  "MANAGER",
  "KITCHEN_MANAGER",
  "EMPLOYEE",
  "VIEW_ONLY",
] as const;

export type AppRole = PlatformRole | CompanyRole | LocationRole;

export const ROLE_RANK: Record<AppRole, number> = {
  VIEW_ONLY: 10,
  BILLING_ADMIN: 12,
  EMPLOYEE: 20,
  KITCHEN_MANAGER: 30,
  MANAGER: 40,
  GENERAL_MANAGER: 50,
  COMPANY_ADMIN: 60,
  SUPER_ADMIN: 70,
};

export function isOperationalCompanyRole(role: AppRole | null | undefined) {
  return role === "SUPER_ADMIN" || role === "COMPANY_ADMIN";
}

export function hasAtLeastRole(actual: AppRole, minimum: AppRole) {
  return ROLE_RANK[actual] >= ROLE_RANK[minimum];
}

export function displayRole(role: AppRole) {
  return role
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
