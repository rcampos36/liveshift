import "server-only";

import { prisma } from "@/lib/db/prisma";
import { recordAuditLog } from "@/lib/audit/log";
import { bumpDashboardRevision } from "@/lib/operations/revision";
import { businessDateFor, type RestaurantScope } from "@/lib/operations/scope";
import { dateKey, parseBusinessDate } from "@/lib/staffing/dates";
import { addUtcDays } from "@/lib/waste/dates";
import type { ManagerLogAction } from "@/lib/manager-log/schemas";
import type {
  ManagerLogCategory,
  ManagerLogPriority,
  ManagerLogRecord,
  ManagerLogSnapshot,
} from "@/lib/manager-log/types";

const userName = { select: { id: true, firstName: true, lastName: true } } as const;

function displayName(user: { firstName: string; lastName: string } | null | undefined) {
  if (!user) return null;
  return `${user.firstName} ${user.lastName}`.trim();
}

function toRecord(
  row: {
    id: string;
    locationId: string;
    businessDate: Date;
    category: ManagerLogCategory;
    priority: ManagerLogPriority;
    description: string;
    body: string;
    createdById: string | null;
    createdAt: Date;
    resolved: boolean;
    resolvedById: string | null;
    resolvedAt: Date | null;
    createdBy: { firstName: string; lastName: string } | null;
    resolvedBy: { firstName: string; lastName: string } | null;
  },
  restaurantName: string,
): ManagerLogRecord {
  return {
    id: row.id,
    restaurantId: row.locationId,
    restaurantName,
    businessDate: dateKey(row.businessDate),
    category: row.category,
    priority: row.priority,
    description: row.description || row.body,
    createdById: row.createdById,
    createdByName: displayName(row.createdBy),
    createdAt: row.createdAt.toISOString(),
    resolved: row.resolved,
    resolvedById: row.resolvedById,
    resolvedByName: displayName(row.resolvedBy),
    resolvedAt: row.resolvedAt?.toISOString() ?? null,
  };
}

const logInclude = {
  createdBy: userName,
  resolvedBy: userName,
} as const;

export async function getManagerLogSnapshot(
  scope: RestaurantScope,
  restaurantName: string,
  timezone: string,
  canWrite: boolean,
  currentUserId: string,
  selectedValue?: string | null,
): Promise<ManagerLogSnapshot> {
  const selected = parseBusinessDate(selectedValue, businessDateFor(timezone));
  const previousDate = addUtcDays(selected, -1);

  const rows = await prisma.managerLog.findMany({
    where: {
      ...scope,
      OR: [{ businessDate: selected }, { resolved: false, businessDate: { lte: previousDate } }],
    },
    include: logInclude,
    orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
  });

  const records = rows.map((row) => toRecord(row, restaurantName));
  const today = records.filter((row) => row.businessDate === dateKey(selected));
  const previousShift = records.filter((row) => row.businessDate === dateKey(previousDate) && !row.resolved);
  const carryForward = records.filter((row) => row.businessDate < dateKey(previousDate) && !row.resolved);
  const open = [...previousShift, ...carryForward, ...today.filter((row) => !row.resolved)];

  return {
    updatedAt: new Date().toISOString(),
    restaurantId: scope.locationId,
    restaurantName,
    timezone,
    canWrite,
    currentUserId,
    selectedDate: dateKey(selected),
    previousDate: dateKey(previousDate),
    kpis: {
      today: today.length,
      unresolvedToday: today.filter((row) => !row.resolved).length,
      previousUnresolved: previousShift.length,
      carryForward: carryForward.length,
      urgentOpen: open.filter((row) => row.priority === "URGENT" || row.priority === "HIGH").length,
    },
    previousShift,
    carryForward,
    today,
  };
}

export async function listOpenManagerLogs(scope: RestaurantScope) {
  return prisma.managerLog.findMany({
    where: { ...scope, resolved: false },
    include: logInclude,
    orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
    take: 8,
  });
}

export async function createManagerNote(
  scope: RestaurantScope,
  timezone: string,
  userId: string,
  description: string,
) {
  const businessDate = businessDateFor(timezone);
  await prisma.managerLog.create({
    data: {
      ...scope,
      businessDate,
      category: "SHIFT_NOTE",
      priority: "NORMAL",
      description,
      body: description,
      createdById: userId,
    },
  });
  await recordAuditLog({
    scope,
    userId,
    entity: "ManagerLog",
    entityId: "shift-note",
    action: "CREATE",
    newValue: { description },
  });
}

export async function applyManagerLogAction(
  scope: RestaurantScope,
  timezone: string,
  userId: string,
  action: ManagerLogAction,
) {
  if (action.type === "create") {
    const businessDate = parseBusinessDate(action.businessDate, businessDateFor(timezone));
    const created = await prisma.managerLog.create({
      data: {
        ...scope,
        businessDate,
        category: action.category,
        priority: action.priority,
        description: action.description,
        body: action.description,
        createdById: userId,
      },
    });
    await recordAuditLog({
      scope,
      userId,
      entity: "ManagerLog",
      entityId: created.id,
      action: "CREATE",
      newValue: { category: action.category, priority: action.priority, description: action.description },
    });
    await bumpDashboardRevision(scope);
    return;
  }

  if (action.type === "resolve") {
    const previous = await prisma.managerLog.findFirst({ where: { ...scope, id: action.id } });
    await prisma.managerLog.updateMany({
      where: { ...scope, id: action.id, resolved: false },
      data: { resolved: true, resolvedById: userId, resolvedAt: new Date() },
    });
    await recordAuditLog({
      scope,
      userId,
      entity: "ManagerLog",
      entityId: action.id,
      action: "RESOLVE",
      oldValue: previous,
      newValue: { resolved: true },
    });
    await bumpDashboardRevision(scope);
    return;
  }

  const previous = await prisma.managerLog.findFirst({ where: { ...scope, id: action.id } });
  await prisma.managerLog.updateMany({
    where: { ...scope, id: action.id, resolved: true },
    data: { resolved: false, resolvedById: null, resolvedAt: null },
  });
  await recordAuditLog({
    scope,
    userId,
    entity: "ManagerLog",
    entityId: action.id,
    action: "UPDATE",
    oldValue: previous,
    newValue: { resolved: false },
  });
  await bumpDashboardRevision(scope);
}
