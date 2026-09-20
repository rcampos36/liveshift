import "server-only";

import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db/prisma";
import { recordAuditLog } from "@/lib/audit/log";
import { AuthorizationError } from "@/lib/authorization/guards";
import { parseInventoryCsv } from "@/lib/inventory/csv";
import type { InventoryAction } from "@/lib/inventory/schemas";
import type {
  InventoryAdjustmentRecord,
  InventoryFlags,
  InventoryItemRecord,
  InventorySnapshot,
} from "@/lib/inventory/types";
import { bumpDashboardRevision } from "@/lib/operations/revision";
import { money, type RestaurantScope } from "@/lib/operations/scope";
import type { InventoryAdjustmentType, InventoryCategory } from "@/generated/prisma/client";

const userName = {
  select: { id: true, firstName: true, lastName: true },
} as const;

function actor(user: { id: string; firstName: string; lastName: string }) {
  return { id: user.id, name: `${user.firstName} ${user.lastName}`.trim() };
}

export function inventoryFlags(item: {
  quantityOnHand: { toString(): string } | number;
  parLevel: { toString(): string } | number;
  reorderLevel: { toString(): string } | number;
  unitCost: { toString(): string } | number;
}): InventoryFlags {
  const quantityOnHand = money(item.quantityOnHand);
  const parLevel = money(item.parLevel);
  const reorderLevel = money(item.reorderLevel);
  const unitCost = money(item.unitCost);

  return {
    outOfStock: quantityOnHand <= 0,
    lowStock: quantityOnHand > 0 && quantityOnHand <= reorderLevel,
    belowPar: quantityOnHand < parLevel,
    value: quantityOnHand * unitCost,
  };
}

function toItem(item: {
  id: string;
  locationId: string;
  name: string;
  category: InventoryCategory;
  sku: string | null;
  unit: string;
  quantityOnHand: { toString(): string } | number;
  parLevel: { toString(): string } | number;
  reorderLevel: { toString(): string } | number;
  unitCost: { toString(): string } | number;
  supplier: string | null;
  active: boolean;
  updatedAt: Date;
}): InventoryItemRecord {
  return {
    id: item.id,
    restaurantId: item.locationId,
    name: item.name,
    category: item.category,
    sku: item.sku,
    unit: item.unit,
    quantityOnHand: money(item.quantityOnHand),
    parLevel: money(item.parLevel),
    reorderLevel: money(item.reorderLevel),
    unitCost: money(item.unitCost),
    supplier: item.supplier,
    active: item.active,
    updatedAt: item.updatedAt.toISOString(),
    ...inventoryFlags(item),
  };
}

async function writeAudit(input: {
  scope: RestaurantScope;
  inventoryItemId: string;
  type: InventoryAdjustmentType;
  quantityBefore: number;
  quantityAfter: number;
  reason?: string | null;
  createdById: string;
}) {
  await prisma.inventoryAdjustment.create({
    data: {
      ...input.scope,
      inventoryItemId: input.inventoryItemId,
      type: input.type,
      quantityBefore: input.quantityBefore,
      quantityAfter: input.quantityAfter,
      quantityDelta: input.quantityAfter - input.quantityBefore,
      reason: input.reason || null,
      createdById: input.createdById,
    },
  });
  await recordAuditLog({
    scope: input.scope,
    userId: input.createdById,
    entity: "InventoryItem",
    entityId: input.inventoryItemId,
    action: input.type,
    oldValue: { quantityOnHand: input.quantityBefore },
    newValue: { quantityOnHand: input.quantityAfter, reason: input.reason ?? null },
  });
}

async function requireItem(scope: RestaurantScope, id: string) {
  const item = await prisma.inventoryItem.findFirst({
    where: { ...scope, id },
  });
  if (!item) {
    throw new AuthorizationError("Inventory item not found in this restaurant", 404);
  }
  return item;
}

export async function getInventorySnapshot(
  scope: RestaurantScope,
  restaurantName: string,
  timezone: string,
  canWrite: boolean,
): Promise<InventorySnapshot> {
  const [items, history] = await Promise.all([
    prisma.inventoryItem.findMany({
      where: scope,
      orderBy: [{ active: "desc" }, { category: "asc" }, { name: "asc" }],
    }),
    prisma.inventoryAdjustment.findMany({
      where: scope,
      orderBy: { createdAt: "desc" },
      take: 100,
      include: {
        createdBy: userName,
        inventoryItem: { select: { name: true, sku: true } },
      },
    }),
  ]);

  const records = items.map(toItem);
  const active = records.filter((item) => item.active);

  return {
    updatedAt: new Date().toISOString(),
    restaurantId: scope.locationId,
    restaurantName,
    timezone,
    canWrite,
    totals: {
      inventoryValue: active.reduce((sum, item) => sum + item.value, 0),
      lowStock: active.filter((item) => item.lowStock).length,
      outOfStock: active.filter((item) => item.outOfStock).length,
      belowPar: active.filter((item) => item.belowPar).length,
      activeItems: active.length,
    },
    items: records,
    history: history.map(
      (row): InventoryAdjustmentRecord => ({
        id: row.id,
        restaurantId: row.locationId,
        inventoryItemId: row.inventoryItemId,
        name: row.inventoryItem.name,
        sku: row.inventoryItem.sku,
        type: row.type,
        quantityBefore: money(row.quantityBefore),
        quantityAfter: money(row.quantityAfter),
        quantityDelta: money(row.quantityDelta),
        reason: row.reason,
        createdBy: actor(row.createdBy),
        createdAt: row.createdAt.toISOString(),
      }),
    ),
  };
}

export async function upsertInventoryCount(
  scope: RestaurantScope,
  userId: string,
  input: {
    name: string;
    quantityOnHand: number;
    reorderLevel: number;
    unit: string;
    reason?: string | null;
    type?: InventoryAdjustmentType;
  },
) {
  const existing = await prisma.inventoryItem.findFirst({
    where: { ...scope, name: { equals: input.name, mode: "insensitive" } },
  });

  if (!existing) {
    const created = await prisma.inventoryItem.create({
      data: {
        ...scope,
        name: input.name,
        unit: input.unit,
        quantityOnHand: input.quantityOnHand,
        reorderLevel: input.reorderLevel,
        parLevel: input.reorderLevel,
      },
    });
    await writeAudit({
      scope,
      inventoryItemId: created.id,
      type: "CREATE",
      quantityBefore: 0,
      quantityAfter: input.quantityOnHand,
      reason: input.reason ?? "Manual inventory entry",
      createdById: userId,
    });
    return created;
  }

  const before = money(existing.quantityOnHand);
  const updated = await prisma.inventoryItem.update({
    where: { id: existing.id },
    data: {
      quantityOnHand: input.quantityOnHand,
      reorderLevel: input.reorderLevel,
      unit: input.unit,
      active: true,
    },
  });
  await writeAudit({
    scope,
    inventoryItemId: existing.id,
    type: input.type ?? "COUNT",
    quantityBefore: before,
    quantityAfter: input.quantityOnHand,
    reason: input.reason ?? "Manual inventory entry",
    createdById: userId,
  });
  return updated;
}

export async function applyInventoryAction(scope: RestaurantScope, userId: string, action: InventoryAction) {
  if (action.type === "import") {
    const rows = parseInventoryCsv(action.csv);
    if (rows.length === 0) {
      throw new AuthorizationError("CSV has no inventory rows", 400);
    }

    for (const row of rows) {
      const existing = row.sku
        ? await prisma.inventoryItem.findFirst({ where: { ...scope, sku: row.sku } })
        : await prisma.inventoryItem.findFirst({
            where: { ...scope, name: { equals: row.name, mode: "insensitive" } },
          });

      if (!existing) {
        const created = await prisma.inventoryItem.create({
          data: { ...scope, ...row },
        });
        await writeAudit({
          scope,
          inventoryItemId: created.id,
          type: "IMPORT",
          quantityBefore: 0,
          quantityAfter: row.quantityOnHand,
          reason: "CSV import",
          createdById: userId,
        });
        continue;
      }

      const before = money(existing.quantityOnHand);
      await prisma.inventoryItem.update({
        where: { id: existing.id },
        data: row,
      });
      await writeAudit({
        scope,
        inventoryItemId: existing.id,
        type: "IMPORT",
        quantityBefore: before,
        quantityAfter: row.quantityOnHand,
        reason: "CSV import",
        createdById: userId,
      });
    }
    await bumpDashboardRevision(scope);
    return;
  }

  if (action.type === "create") {
    let created;
    try {
      created = await prisma.inventoryItem.create({
        data: {
          ...scope,
          name: action.name,
          category: action.category,
          sku: action.sku,
          unit: action.unit,
          quantityOnHand: action.quantityOnHand,
          parLevel: action.parLevel,
          reorderLevel: action.reorderLevel,
          unitCost: action.unitCost,
          supplier: action.supplier,
          active: action.active,
        },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        throw new AuthorizationError("An inventory item with that name already exists in this restaurant", 409);
      }
      throw error;
    }
    await writeAudit({
      scope,
      inventoryItemId: created.id,
      type: "CREATE",
      quantityBefore: 0,
      quantityAfter: action.quantityOnHand,
      reason: "Manual inventory entry",
      createdById: userId,
    });
    await bumpDashboardRevision(scope);
    return;
  }

  const item = await requireItem(scope, action.id);
  const before = money(item.quantityOnHand);

  if (action.type === "update") {
    await prisma.inventoryItem.update({
      where: { id: item.id },
      data: {
        name: action.name,
        category: action.category,
        sku: action.sku,
        unit: action.unit,
        quantityOnHand: action.quantityOnHand,
        parLevel: action.parLevel,
        reorderLevel: action.reorderLevel,
        unitCost: action.unitCost,
        supplier: action.supplier,
        active: action.active,
      },
    });
    await writeAudit({
      scope,
      inventoryItemId: item.id,
      type: before === action.quantityOnHand ? "UPDATE" : "COUNT",
      quantityBefore: before,
      quantityAfter: action.quantityOnHand,
      reason: "Manual inventory update",
      createdById: userId,
    });
    await bumpDashboardRevision(scope);
    return;
  }

  if (action.type === "count") {
    await prisma.inventoryItem.update({
      where: { id: item.id },
      data: { quantityOnHand: action.quantityOnHand },
    });
    await writeAudit({
      scope,
      inventoryItemId: item.id,
      type: "COUNT",
      quantityBefore: before,
      quantityAfter: action.quantityOnHand,
      reason: action.reason ?? "Manual count",
      createdById: userId,
    });
    await bumpDashboardRevision(scope);
    return;
  }

  if (action.type === "adjust") {
    const after = Math.max(0, before + action.quantityDelta);
    await prisma.inventoryItem.update({
      where: { id: item.id },
      data: { quantityOnHand: after },
    });
    await writeAudit({
      scope,
      inventoryItemId: item.id,
      type: "ADJUST",
      quantityBefore: before,
      quantityAfter: after,
      reason: action.reason ?? "Manual quantity adjustment",
      createdById: userId,
    });
    await bumpDashboardRevision(scope);
    return;
  }

  await prisma.inventoryItem.update({
    where: { id: item.id },
    data: { active: action.active },
  });
  await writeAudit({
    scope,
    inventoryItemId: item.id,
    type: action.active ? "ACTIVATE" : "DEACTIVATE",
    quantityBefore: before,
    quantityAfter: before,
    reason: action.reason ?? (action.active ? "Item activated" : "Item deactivated"),
    createdById: userId,
  });
  await bumpDashboardRevision(scope);
}
