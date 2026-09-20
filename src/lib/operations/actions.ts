import "server-only";

import { prisma } from "@/lib/db/prisma";
import { recordAuditLog } from "@/lib/audit/log";
import { applyEightySixAction, findOrCreateMenuItem } from "@/lib/eighty-six/service";
import { upsertInventoryCount } from "@/lib/inventory/service";
import { upsertLiveSales } from "@/lib/sales/service";
import { clockInStaff, clockOutStaff } from "@/lib/staffing/service";
import { createManagerNote } from "@/lib/manager-log/service";
import { completeTask, createQuickTask } from "@/lib/tasks/service";
import { recordWaste } from "@/lib/waste/service";
import { bumpDashboardRevision } from "@/lib/operations/revision";
import { businessDateFor, type RestaurantScope } from "@/lib/operations/scope";
import type { OperationsAction } from "@/lib/operations/schemas";

export async function applyOperationsAction(
  scope: RestaurantScope,
  timezone: string,
  userId: string,
  action: OperationsAction,
) {
  const businessDate = businessDateFor(timezone);

  switch (action.type) {
    case "updateSales":
      await upsertLiveSales(scope, businessDate, {
        salesAmount: action.salesAmount,
        salesGoal: action.salesGoal,
        covers: action.covers,
        laborCost: action.laborCost,
      });
      break;

    case "addEightySix": {
      const item = await findOrCreateMenuItem(scope, action.name);
      await applyEightySixAction(scope, userId, {
        type: "setStatus",
        menuItemId: item.id,
        status: "EIGHTY_SIXED",
        remainingQuantity: null,
        reason: null,
        estimatedAvailableAt: null,
      });
      break;
    }

    case "clearEightySix":
      await applyEightySixAction(scope, userId, {
        type: "restore",
        menuItemId: action.menuItemId,
        reason: null,
      });
      break;

    case "upsertInventory":
      await upsertInventoryCount(scope, userId, {
        name: action.name,
        quantityOnHand: action.quantity,
        reorderLevel: action.reorderPoint,
        unit: action.unit,
        reason: "Live ops inventory count",
      });
      break;

    case "addWaste":
      await recordWaste(scope, userId, timezone, {
        type: "record",
        inventoryItemId: null,
        itemName: action.itemName,
        quantity: action.quantity,
        unit: action.unit,
        reason: "OTHER",
        employeeId: userId,
        notes: null,
      });
      break;

    case "addIssue": {
      const issue = await prisma.managerIssue.create({
        data: { ...scope, title: action.title },
      });
      await recordAuditLog({
        scope,
        userId,
        entity: "ManagerIssue",
        entityId: issue.id,
        action: "CREATE",
        newValue: { title: action.title },
      });
      break;
    }

    case "resolveIssue": {
      const previous = await prisma.managerIssue.findFirst({ where: { ...scope, id: action.id } });
      await prisma.managerIssue.updateMany({
        where: { ...scope, id: action.id, status: "OPEN" },
        data: { status: "RESOLVED", resolvedAt: new Date() },
      });
      await recordAuditLog({
        scope,
        userId,
        entity: "ManagerIssue",
        entityId: action.id,
        action: "RESOLVE",
        oldValue: previous,
        newValue: { status: "RESOLVED" },
      });
      break;
    }

    case "addTask":
      await createQuickTask(scope, timezone, userId, action.title);
      break;

    case "completeTask":
      await completeTask(scope, userId, action.id);
      break;

    case "clockIn":
      await clockInStaff(scope, timezone, {
        employee: action.name,
        station: action.station,
      });
      break;

    case "clockOut":
      await clockOutStaff(scope, action.id);
      break;

    case "addLog":
      await createManagerNote(scope, timezone, userId, action.body);
      break;
  }

  await bumpDashboardRevision(scope);
}
