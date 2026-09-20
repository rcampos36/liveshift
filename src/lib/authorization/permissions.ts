import type { AppRole } from "@/lib/authorization/roles";

export const PERMISSIONS = {
  "company.read": ["SUPER_ADMIN", "COMPANY_ADMIN", "BILLING_ADMIN", "GENERAL_MANAGER", "MANAGER", "KITCHEN_MANAGER", "EMPLOYEE", "VIEW_ONLY"],
  "company.manage": ["SUPER_ADMIN", "COMPANY_ADMIN"],
  "location.read": ["SUPER_ADMIN", "COMPANY_ADMIN", "GENERAL_MANAGER", "MANAGER", "KITCHEN_MANAGER", "EMPLOYEE", "VIEW_ONLY"],
  "location.manage": ["SUPER_ADMIN", "COMPANY_ADMIN", "GENERAL_MANAGER"],
  "users.invite": ["SUPER_ADMIN", "COMPANY_ADMIN", "GENERAL_MANAGER", "MANAGER"],
  "users.manage": ["SUPER_ADMIN", "COMPANY_ADMIN", "GENERAL_MANAGER"],
  "operations.read": ["SUPER_ADMIN", "COMPANY_ADMIN", "GENERAL_MANAGER", "MANAGER", "KITCHEN_MANAGER", "EMPLOYEE", "VIEW_ONLY"],
  "operations.write": ["SUPER_ADMIN", "COMPANY_ADMIN", "GENERAL_MANAGER", "MANAGER", "KITCHEN_MANAGER"],
  "waste.read": ["SUPER_ADMIN", "COMPANY_ADMIN", "GENERAL_MANAGER", "MANAGER", "KITCHEN_MANAGER", "EMPLOYEE", "VIEW_ONLY"],
  "waste.write": ["SUPER_ADMIN", "COMPANY_ADMIN", "GENERAL_MANAGER", "MANAGER", "KITCHEN_MANAGER", "EMPLOYEE"],
  "integrations.read": ["SUPER_ADMIN", "COMPANY_ADMIN", "GENERAL_MANAGER", "MANAGER"],
  "integrations.write": ["SUPER_ADMIN", "COMPANY_ADMIN", "GENERAL_MANAGER"],
  "audit.read": ["SUPER_ADMIN", "COMPANY_ADMIN", "GENERAL_MANAGER", "MANAGER"],
  "billing.read": ["SUPER_ADMIN", "COMPANY_ADMIN", "BILLING_ADMIN"],
  "billing.manage": ["SUPER_ADMIN", "BILLING_ADMIN"],
} as const;

export type Permission = keyof typeof PERMISSIONS;

export function roleHasPermission(role: AppRole, permission: Permission) {
  return (PERMISSIONS[permission] as readonly AppRole[]).includes(role);
}

export function companyHomePath(companyId: string, role: AppRole) {
  if (roleHasPermission(role, "operations.read")) {
    return `/dashboard/c/${companyId}`;
  }
  if (roleHasPermission(role, "billing.read")) {
    return `/dashboard/c/${companyId}/billing`;
  }
  return `/dashboard`;
}
