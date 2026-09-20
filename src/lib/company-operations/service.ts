import "server-only";

import { prisma } from "@/lib/db/prisma";
import type { CompanyOperationsSnapshot, HouseAttentionReason, HouseOperationsCard } from "@/lib/company-operations/types";
import { businessDateFor, money } from "@/lib/operations/scope";

const GOAL_ALERT = 95;
const LABOR_ALERT = 28;
const WASTE_ALERT = 250;
const EIGHTY_SIX_ALERT = 3;

export function houseAttention(input: {
  goalPercent: number;
  laborPercent: number;
  wasteCost: number;
  eightySixCount: number;
}): HouseAttentionReason[] {
  const reasons: HouseAttentionReason[] = [];
  if (input.goalPercent > 0 && input.goalPercent < GOAL_ALERT) reasons.push("BEHIND_GOAL");
  if (input.laborPercent > LABOR_ALERT) reasons.push("HIGH_LABOR");
  if (input.wasteCost >= WASTE_ALERT) reasons.push("HIGH_WASTE");
  if (input.eightySixCount >= EIGHTY_SIX_ALERT) reasons.push("MANY_EIGHTY_SIX");
  return reasons;
}

export async function getCompanyOperationsSnapshot(
  companyId: string,
  companyName: string,
  houses: Array<{ id: string; name: string; timezone: string }>,
): Promise<CompanyOperationsSnapshot> {
  if (houses.length === 0) {
    return {
      updatedAt: new Date().toISOString(),
      companyId,
      companyName,
      totals: { sales: 0, wasteCost: 0, eightySixCount: 0, housesNeedingAttention: 0 },
      houses: [],
    };
  }

  const locationIds = houses.map((house) => house.id);
  const dated = houses.map((house) => ({
    ...house,
    businessDate: businessDateFor(house.timezone),
  }));

  const [dailyRows, wasteRows, eightySixRows, revisions] = await Promise.all([
    prisma.dailyOperations.findMany({
      where: {
        companyId,
        OR: dated.map((house) => ({
          locationId: house.id,
          businessDate: house.businessDate,
        })),
      },
    }),
    prisma.wasteEntry.findMany({
      where: {
        companyId,
        OR: dated.map((house) => ({
          locationId: house.id,
          businessDate: house.businessDate,
        })),
      },
      select: { locationId: true, totalCost: true },
    }),
    prisma.menuItemStatus.groupBy({
      by: ["locationId"],
      where: {
        companyId,
        locationId: { in: locationIds },
        resolvedAt: null,
        status: "EIGHTY_SIXED",
      },
      _count: { _all: true },
    }),
    prisma.location.findMany({
      where: { companyId, id: { in: locationIds } },
      select: { id: true, dashboardRevision: true },
    }),
  ]);

  const dailyByHouse = new Map(dailyRows.map((row) => [row.locationId, row]));
  const wasteByHouse = new Map<string, number>();
  for (const row of wasteRows) {
    wasteByHouse.set(row.locationId, (wasteByHouse.get(row.locationId) ?? 0) + money(row.totalCost));
  }
  const eightySixByHouse = new Map(eightySixRows.map((row) => [row.locationId, row._count._all]));
  const revisionByHouse = new Map(revisions.map((row) => [row.id, row.dashboardRevision]));

  const cards: HouseOperationsCard[] = dated.map((house) => {
    const daily = dailyByHouse.get(house.id);
    const sales = money(daily?.netSales) || money(daily?.salesAmount);
    const salesGoal = money(daily?.salesGoal);
    const laborCost = money(daily?.laborCost);
    const goalPercent = salesGoal > 0 ? (sales / salesGoal) * 100 : 0;
    const laborPercent = sales > 0 ? (laborCost / sales) * 100 : 0;
    const wasteCost = wasteByHouse.get(house.id) ?? 0;
    const eightySixCount = eightySixByHouse.get(house.id) ?? 0;
    const attention = houseAttention({ goalPercent, laborPercent, wasteCost, eightySixCount });

    return {
      restaurantId: house.id,
      restaurantName: house.name,
      timezone: house.timezone,
      sales,
      salesGoal,
      goalPercent,
      laborPercent,
      wasteCost,
      eightySixCount,
      needsAttention: attention.length > 0,
      attention,
      revision: revisionByHouse.get(house.id) ?? 0,
    };
  });

  cards.sort((a, b) => Number(b.needsAttention) - Number(a.needsAttention) || a.restaurantName.localeCompare(b.restaurantName));

  return {
    updatedAt: new Date().toISOString(),
    companyId,
    companyName,
    totals: {
      sales: cards.reduce((sum, house) => sum + house.sales, 0),
      wasteCost: cards.reduce((sum, house) => sum + house.wasteCost, 0),
      eightySixCount: cards.reduce((sum, house) => sum + house.eightySixCount, 0),
      housesNeedingAttention: cards.filter((house) => house.needsAttention).length,
    },
    houses: cards,
  };
}
