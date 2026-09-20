import "server-only";

import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import type { AuthUser } from "@/lib/auth/types";
import type { AppRole } from "@/lib/authorization/roles";
import { hasAtLeastRole, isOperationalCompanyRole } from "@/lib/authorization/roles";
import type { Permission } from "@/lib/authorization/permissions";
import { roleHasPermission } from "@/lib/authorization/permissions";

export class AuthorizationError extends Error {
  status: number;

  constructor(message: string, status = 403) {
    super(message);
    this.name = "AuthorizationError";
    this.status = status;
  }
}

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) {
    throw new AuthorizationError("Authentication required", 401);
  }
  return user;
}

export async function requirePageUser() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }
  return user;
}

export function isSuperAdmin(user: AuthUser) {
  return user.platformRole === "SUPER_ADMIN";
}

export function getCompanyRole(user: AuthUser, companyId: string): AppRole | null {
  if (isSuperAdmin(user)) {
    return "SUPER_ADMIN";
  }

  const membership = user.companyMemberships.find((item) => item.companyId === companyId);
  return membership?.role ?? null;
}

export function getLocationRole(user: AuthUser, locationId: string, companyId?: string): AppRole | null {
  if (isSuperAdmin(user)) {
    return "SUPER_ADMIN";
  }

  const location = user.locationMemberships.find((item) => item.locationId === locationId);
  const resolvedCompanyId = companyId ?? location?.location.companyId;

  if (resolvedCompanyId) {
    const companyRole = getCompanyRole(user, resolvedCompanyId);
    if (isOperationalCompanyRole(companyRole)) {
      return companyRole;
    }
  }

  return location?.role ?? null;
}

export function canAccessCompany(user: AuthUser, companyId: string) {
  if (isSuperAdmin(user)) {
    return true;
  }

  if (user.companyMemberships.some((item) => item.companyId === companyId)) {
    return true;
  }

  return user.locationMemberships.some((item) => item.location.companyId === companyId);
}

export function canAccessLocation(user: AuthUser, locationId: string, companyId?: string) {
  return getLocationRole(user, locationId, companyId) !== null;
}

export function requireCompanyAccess(user: AuthUser, companyId: string, minimumRole?: AppRole) {
  const role = getCompanyRole(user, companyId);

  if (role) {
    if (minimumRole && !hasAtLeastRole(role, minimumRole)) {
      throw new AuthorizationError("Insufficient company role");
    }
    return role;
  }

  if (!minimumRole && canAccessCompany(user, companyId)) {
    return "VIEW_ONLY" as AppRole;
  }

  throw new AuthorizationError("No access to this company");
}

export function requireLocationAccess(user: AuthUser, locationId: string, minimumRole?: AppRole) {
  const role = getLocationRole(user, locationId);

  if (!role) {
    throw new AuthorizationError("No access to this location");
  }

  if (minimumRole && !hasAtLeastRole(role, minimumRole)) {
    throw new AuthorizationError("Insufficient location role");
  }

  return role;
}

export function requirePermission(
  user: AuthUser,
  permission: Permission,
  scope: { companyId?: string; locationId?: string },
) {
  const role = scope.locationId
    ? getLocationRole(user, scope.locationId, scope.companyId)
    : scope.companyId
      ? getCompanyRole(user, scope.companyId) ??
        (canAccessCompany(user, scope.companyId) ? ("VIEW_ONLY" as AppRole) : null)
      : user.platformRole;

  if (!role || !roleHasPermission(role, permission)) {
    throw new AuthorizationError("Missing required permission");
  }

  return role;
}
