import "server-only";

import { prisma } from "@/lib/db/prisma";
import {
  AuthorizationError,
  requirePermission,
  requireUser,
} from "@/lib/authorization/guards";
import type { Permission } from "@/lib/authorization/permissions";

export type RestaurantScope = {
  companyId: string;
  locationId: string;
};

export function restaurantScope(companyId: string, locationId: string): RestaurantScope {
  if (!companyId.trim() || !locationId.trim()) {
    throw new AuthorizationError("Operational queries require companyId and restaurantId", 400);
  }

  return { companyId, locationId };
}

export async function requireRestaurantOperations(
  companyId: string,
  locationId: string,
  permission: Permission = "operations.read",
) {
  const user = await requireUser();
  const scope = restaurantScope(companyId, locationId);
  const restaurant = await prisma.location.findFirst({
    where: { id: scope.locationId, companyId: scope.companyId },
    select: { id: true, name: true, timezone: true, companyId: true },
  });

  if (!restaurant) {
    throw new AuthorizationError("Restaurant not found in this company", 404);
  }

  requirePermission(user, permission, {
    companyId: scope.companyId,
    locationId: scope.locationId,
  });

  return { user, restaurant, scope };
}

export function businessDateFor(timezone: string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());

  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  const day = parts.find((part) => part.type === "day")?.value;
  return new Date(`${year}-${month}-${day}T00:00:00.000Z`);
}

export function money(value: { toString(): string } | number | null | undefined) {
  return Number(value ?? 0);
}
