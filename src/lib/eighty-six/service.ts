import "server-only";

import { prisma } from "@/lib/db/prisma";
import { recordAuditLog } from "@/lib/audit/log";
import { AuthorizationError } from "@/lib/authorization/guards";
import { bumpDashboardRevision } from "@/lib/operations/revision";
import { money, type RestaurantScope } from "@/lib/operations/scope";
import type { EightySixAction } from "@/lib/eighty-six/schemas";
import type {
  Actor,
  EightySixSnapshot,
  MenuAvailability,
  MenuItemHistoryRecord,
  MenuItemRecord,
} from "@/lib/eighty-six/types";

const userName = {
  select: { id: true, firstName: true, lastName: true },
} as const;

function actor(user: { id: string; firstName: string; lastName: string } | null | undefined): Actor | null {
  if (!user) return null;
  return { id: user.id, name: `${user.firstName} ${user.lastName}`.trim() };
}

function quantity(value: { toString(): string } | number | null | undefined) {
  return value == null ? null : money(value);
}

function toRecord(
  item: {
    id: string;
    locationId: string;
    name: string;
    category: string | null;
  },
  status:
    | {
        id: string;
        status: MenuAvailability;
        remainingQuantity: { toString(): string } | number | null;
        reason: string | null;
        estimatedAvailableAt: Date | null;
        createdAt: Date;
        createdBy: { id: string; firstName: string; lastName: string };
      }
    | null,
): MenuItemRecord {
  return {
    id: item.id,
    restaurantId: item.locationId,
    menuItemId: item.id,
    name: item.name,
    category: item.category,
    status: status?.status ?? "AVAILABLE",
    remainingQuantity: quantity(status?.remainingQuantity),
    reason: status?.reason ?? null,
    estimatedAvailableAt: status?.estimatedAvailableAt?.toISOString() ?? null,
    statusId: status?.id ?? null,
    createdBy: actor(status?.createdBy),
    createdAt: status?.createdAt.toISOString() ?? null,
  };
}

export async function getEightySixSnapshot(
  scope: RestaurantScope,
  restaurantName: string,
  timezone: string,
  canWrite: boolean,
): Promise<EightySixSnapshot> {
  const [items, history] = await Promise.all([
    prisma.menuItem.findMany({
      where: scope,
      orderBy: [{ category: "asc" }, { name: "asc" }],
      include: {
        statuses: {
          where: { resolvedAt: null },
          orderBy: { createdAt: "desc" },
          take: 1,
          include: { createdBy: userName },
        },
      },
    }),
    prisma.menuItemStatus.findMany({
      where: scope,
      orderBy: { createdAt: "desc" },
      take: 80,
      include: {
        menuItem: { select: { name: true, category: true } },
        createdBy: userName,
        resolvedBy: userName,
      },
    }),
  ]);

  const catalog = items.map((item) => toRecord(item, item.statuses[0] ?? null));
  const eightySixed = catalog.filter((item) => item.status === "EIGHTY_SIXED");
  const lowStock = catalog.filter((item) => item.status === "LOW_STOCK");

  return {
    updatedAt: new Date().toISOString(),
    restaurantId: scope.locationId,
    restaurantName,
    timezone,
    canWrite,
    items: catalog,
    board: { eightySixed, lowStock },
    history: history.map(
      (row): MenuItemHistoryRecord => ({
        id: row.id,
        restaurantId: row.locationId,
        menuItemId: row.menuItemId,
        name: row.menuItem.name,
        category: row.menuItem.category,
        status: row.status,
        remainingQuantity: quantity(row.remainingQuantity),
        reason: row.reason,
        estimatedAvailableAt: row.estimatedAvailableAt?.toISOString() ?? null,
        createdBy: actor(row.createdBy)!,
        createdAt: row.createdAt.toISOString(),
        resolvedBy: actor(row.resolvedBy),
        resolvedAt: row.resolvedAt?.toISOString() ?? null,
      }),
    ),
  };
}

export async function findOrCreateMenuItem(scope: RestaurantScope, name: string, category?: string | null) {
  const existing = await prisma.menuItem.findFirst({
    where: { ...scope, name: { equals: name, mode: "insensitive" } },
  });

  if (existing) {
    return existing;
  }

  return prisma.menuItem.create({
    data: { ...scope, name, category: category || null },
  });
}

export async function applyEightySixAction(scope: RestaurantScope, userId: string, action: EightySixAction) {
  if (action.type === "addMenuItem") {
    const item = await findOrCreateMenuItem(scope, action.name, action.category);
    await recordAuditLog({
      scope,
      userId,
      entity: "MenuItem",
      entityId: item.id,
      action: "CREATE",
      newValue: { name: item.name, category: item.category },
    });
    await bumpDashboardRevision(scope);
    return;
  }

  const menuItem = await prisma.menuItem.findFirst({
    where: { ...scope, id: action.menuItemId },
  });

  if (!menuItem) {
    throw new AuthorizationError("Menu item not found in this restaurant", 404);
  }

  const open = await prisma.menuItemStatus.findFirst({
    where: { ...scope, menuItemId: menuItem.id, resolvedAt: null },
    orderBy: { createdAt: "desc" },
  });

  if (action.type === "restore") {
    if (!open) return;

    await prisma.menuItemStatus.updateMany({
      where: { ...scope, id: open.id, resolvedAt: null },
      data: {
        resolvedById: userId,
        resolvedAt: new Date(),
        reason: action.reason ?? open.reason,
      },
    });
    await recordAuditLog({
      scope,
      userId,
      entity: "MenuItemStatus",
      entityId: open.id,
      action: "RESTORE",
      oldValue: { menuItemId: menuItem.id, name: menuItem.name, status: open.status },
      newValue: { status: "AVAILABLE", reason: action.reason ?? open.reason },
    });
    await bumpDashboardRevision(scope);
    return;
  }

  if (open && open.status === action.status) {
    await prisma.menuItemStatus.updateMany({
      where: { ...scope, id: open.id, resolvedAt: null },
      data: {
        remainingQuantity: action.remainingQuantity,
        reason: action.reason,
        estimatedAvailableAt: action.estimatedAvailableAt,
      },
    });
    await recordAuditLog({
      scope,
      userId,
      entity: "MenuItemStatus",
      entityId: open.id,
      action: "UPDATE",
      oldValue: open,
      newValue: {
        status: action.status,
        remainingQuantity: action.remainingQuantity,
        reason: action.reason,
        estimatedAvailableAt: action.estimatedAvailableAt,
      },
    });
    await bumpDashboardRevision(scope);
    return;
  }

  if (open) {
    await prisma.menuItemStatus.updateMany({
      where: { ...scope, id: open.id, resolvedAt: null },
      data: { resolvedById: userId, resolvedAt: new Date() },
    });
  }

  await prisma.menuItemStatus.create({
    data: {
      ...scope,
      menuItemId: menuItem.id,
      status: action.status,
      remainingQuantity: action.remainingQuantity,
      reason: action.reason,
      estimatedAvailableAt: action.estimatedAvailableAt,
      createdById: userId,
    },
  });
  await recordAuditLog({
    scope,
    userId,
    entity: "MenuItemStatus",
    entityId: menuItem.id,
    action: "UPDATE",
    oldValue: open,
    newValue: {
      name: menuItem.name,
      status: action.status,
      remainingQuantity: action.remainingQuantity,
      reason: action.reason,
    },
  });
  await bumpDashboardRevision(scope);
}
