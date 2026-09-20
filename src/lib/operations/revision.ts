import "server-only";

import { prisma } from "@/lib/db/prisma";
import type { RestaurantScope } from "@/lib/operations/scope";

export async function bumpDashboardRevision(scope: RestaurantScope) {
  await prisma.location.updateMany({
    where: { id: scope.locationId, companyId: scope.companyId },
    data: { dashboardRevision: { increment: 1 } },
  });
}

export async function getDashboardRevision(scope: RestaurantScope) {
  const restaurant = await prisma.location.findFirst({
    where: { id: scope.locationId, companyId: scope.companyId },
    select: { id: true, dashboardRevision: true },
  });

  return {
    restaurantId: scope.locationId,
    revision: restaurant?.dashboardRevision ?? 0,
  };
}
