import "server-only";

import { prisma } from "@/lib/db/prisma";
import { recordAuditLog } from "@/lib/audit/log";
import { AuthorizationError } from "@/lib/authorization/guards";
import { bumpDashboardRevision } from "@/lib/operations/revision";
import { money, type RestaurantScope } from "@/lib/operations/scope";
import { dateKey, inferShift, wasteWindows } from "@/lib/waste/dates";
import type { WasteAction } from "@/lib/waste/schemas";
import {
  SERVICE_SHIFT_LABELS,
  WASTE_REASON_LABELS,
  type ServiceShift,
  type WasteBreakdown,
  type WasteEntryRecord,
  type WasteReason,
  type WasteSnapshot,
} from "@/lib/waste/types";

const userName = {
  select: { id: true, firstName: true, lastName: true },
} as const;

function actorName(user: { firstName: string; lastName: string } | null | undefined) {
  return user ? `${user.firstName} ${user.lastName}`.trim() : null;
}

function toRecord(
  row: {
    id: string;
    locationId: string;
    inventoryItemId: string | null;
    itemName: string;
    quantity: { toString(): string } | number;
    unit: string;
    unitCost: { toString(): string } | number;
    totalCost: { toString(): string } | number;
    reason: WasteReason;
    employeeId: string | null;
    shift: ServiceShift;
    notes: string | null;
    businessDate: Date;
    createdAt: Date;
    location?: { name: string };
    employee?: { firstName: string; lastName: string } | null;
  },
): WasteEntryRecord {
  return {
    id: row.id,
    restaurantId: row.locationId,
    restaurantName: row.location?.name ?? "",
    inventoryItemId: row.inventoryItemId,
    itemName: row.itemName,
    quantity: money(row.quantity),
    unit: row.unit,
    unitCost: money(row.unitCost),
    totalCost: money(row.totalCost),
    reason: row.reason,
    employeeId: row.employeeId,
    employeeName: actorName(row.employee),
    shift: row.shift,
    notes: row.notes,
    businessDate: dateKey(row.businessDate),
    createdAt: row.createdAt.toISOString(),
  };
}

function rollup(rows: WasteEntryRecord[], key: (row: WasteEntryRecord) => string, label: (row: WasteEntryRecord) => string) {
  const groups = new Map<string, WasteBreakdown>();
  for (const row of rows) {
    const groupKey = key(row);
    const existing = groups.get(groupKey) ?? { key: groupKey, label: label(row), count: 0, cost: 0 };
    existing.count += 1;
    existing.cost += row.totalCost;
    groups.set(groupKey, existing);
  }
  return [...groups.values()].sort((a, b) => b.cost - a.cost);
}

function sumCost(rows: WasteEntryRecord[]) {
  return rows.reduce((total, row) => total + row.totalCost, 0);
}

export async function recordWaste(scope: RestaurantScope, userId: string, timezone: string, action: WasteAction) {
  const inventoryItem = action.inventoryItemId
    ? await prisma.inventoryItem.findFirst({
        where: { ...scope, id: action.inventoryItemId },
      })
    : action.itemName
      ? await prisma.inventoryItem.findFirst({
          where: { ...scope, name: { equals: action.itemName, mode: "insensitive" } },
        })
      : null;

  if (action.inventoryItemId && !inventoryItem) {
    throw new AuthorizationError("Inventory item not found in this restaurant", 404);
  }

  const itemName = inventoryItem?.name ?? action.itemName;
  if (!itemName) {
    throw new AuthorizationError("Choose a waste item", 400);
  }

  const quantity = action.quantity;
  const unitCost = inventoryItem ? money(inventoryItem.unitCost) : 0;
  const totalCost = quantity * unitCost;
  const shift = action.shift ?? inferShift(timezone);

  await prisma.wasteEntry.create({
    data: {
      ...scope,
      inventoryItemId: inventoryItem?.id ?? null,
      businessDate: wasteWindows(timezone).today,
      itemName,
      quantity,
      unit: action.unit || inventoryItem?.unit || "ea",
      unitCost,
      totalCost,
      reason: action.reason,
      employeeId: action.employeeId ?? userId,
      shift,
      notes: action.notes,
    },
  });
  await recordAuditLog({
    scope,
    userId,
    entity: "WasteEntry",
    entityId: inventoryItem?.id ?? itemName,
    action: "CREATE",
    newValue: { itemName, quantity, unit: action.unit, reason: action.reason, totalCost, shift },
  });
  await bumpDashboardRevision(scope);
}

export async function getWasteSnapshot(input: {
  companyId: string;
  locationId?: string;
  restaurantName: string;
  timezone: string;
  canWrite: boolean;
  currentUserId: string;
}): Promise<WasteSnapshot> {
  const scope = input.locationId
    ? { companyId: input.companyId, locationId: input.locationId }
    : { companyId: input.companyId };
  const windows = wasteWindows(input.timezone);

  const [rawEntries, salesRows, catalog, employees] = await Promise.all([
    prisma.wasteEntry.findMany({
      where: {
        ...scope,
        businessDate: { gte: windows.trendStart },
      },
      orderBy: { createdAt: "desc" },
      include: {
        location: { select: { name: true } },
        employee: userName,
      },
    }),
    prisma.dailyOperations.findMany({
      where: {
        ...scope,
        businessDate: { gte: windows.monthStart },
      },
      select: { locationId: true, businessDate: true, salesAmount: true },
    }),
    input.locationId
      ? prisma.inventoryItem.findMany({
          where: { ...scope, active: true },
          orderBy: { name: "asc" },
          select: { id: true, name: true, unit: true, unitCost: true },
        })
      : Promise.resolve([]),
    prisma.user.findMany({
      where: {
        OR: [
          { id: input.currentUserId },
          { locationMemberships: { some: { location: { companyId: input.companyId }, status: "ACTIVE" } } },
          { companyMemberships: { some: { companyId: input.companyId, status: "ACTIVE" } } },
        ],
      },
      orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
      select: { id: true, firstName: true, lastName: true },
    }),
  ]);

  const entries = rawEntries.map(toRecord);
  const monthEntries = entries.filter((row) => row.businessDate >= dateKey(windows.monthStart));
  const weekEntries = entries.filter((row) => row.businessDate >= dateKey(windows.weekStart));
  const todayEntries = entries.filter((row) => row.businessDate === dateKey(windows.today));
  const salesToday = salesRows
    .filter((row) => dateKey(row.businessDate) === dateKey(windows.today))
    .reduce((total, row) => total + money(row.salesAmount), 0);
  const wasteToday = sumCost(todayEntries);

  const byDay = rollup(monthEntries, (row) => row.businessDate, (row) => row.businessDate);
  const costTrend = Array.from({ length: 14 }, (_, index) => {
    const key = dateKey(new Date(windows.trendStart.getTime() + index * 86400000));
    const match = byDay.find((row) => row.key === key);
    return { key, label: key.slice(5), count: match?.count ?? 0, cost: match?.cost ?? 0 };
  });

  return {
    updatedAt: new Date().toISOString(),
    restaurantId: input.locationId ?? null,
    restaurantName: input.restaurantName,
    timezone: input.timezone,
    canWrite: input.canWrite,
    currentUserId: input.currentUserId,
    defaultShift: inferShift(input.timezone),
    kpis: {
      wasteToday,
      wasteThisWeek: sumCost(weekEntries),
      wasteThisMonth: sumCost(monthEntries),
      wastePercentOfSales: salesToday > 0 ? (wasteToday / salesToday) * 100 : 0,
      wasteCountToday: todayEntries.length,
      salesToday,
    },
    catalog: catalog.map((item) => ({
      id: item.id,
      name: item.name,
      unit: item.unit,
      unitCost: money(item.unitCost),
    })),
    employees: employees.map((user) => ({ id: user.id, name: `${user.firstName} ${user.lastName}`.trim() })),
    entries: todayEntries,
    analytics: {
      byItem: rollup(monthEntries, (row) => row.itemName, (row) => row.itemName),
      byReason: rollup(
        monthEntries,
        (row) => row.reason,
        (row) => WASTE_REASON_LABELS[row.reason],
      ),
      byEmployee: rollup(
        monthEntries,
        (row) => row.employeeId ?? "unassigned",
        (row) => row.employeeName ?? "Unassigned",
      ),
      byShift: rollup(
        monthEntries,
        (row) => row.shift,
        (row) => SERVICE_SHIFT_LABELS[row.shift],
      ),
      byDay,
      byRestaurant: rollup(
        monthEntries,
        (row) => row.restaurantId,
        (row) => row.restaurantName || "Restaurant",
      ),
      topItems: rollup(monthEntries, (row) => row.itemName, (row) => row.itemName).slice(0, 5),
      costTrend,
    },
  };
}
