import "server-only";

import { prisma } from "@/lib/db/prisma";
import { getDashboardRevision } from "@/lib/operations/revision";
import { businessDateFor, money, type RestaurantScope } from "@/lib/operations/scope";
import type { LiveBoardData } from "@/lib/operations/types";
import { listOpenManagerLogs } from "@/lib/manager-log/service";
import { MANAGER_LOG_CATEGORY_LABELS } from "@/lib/manager-log/types";
import { STAFF_POSITION_LABELS } from "@/lib/staffing/types";
import { listWorkingStaff } from "@/lib/staffing/service";

export async function getLiveBoard(scope: RestaurantScope, timezone: string): Promise<LiveBoardData> {
  const businessDate = businessDateFor(timezone);

  const [daily, menuStatuses, inventory, waste, issues, tasks, staff, logs, revision] = await Promise.all([
    prisma.dailyOperations.findUnique({
      where: { locationId_businessDate: { locationId: scope.locationId, businessDate } },
    }),
    prisma.menuItemStatus.findMany({
      where: { ...scope, resolvedAt: null, status: { in: ["EIGHTY_SIXED", "LOW_STOCK"] } },
      orderBy: { createdAt: "desc" },
      include: { menuItem: { select: { name: true } } },
    }),
    prisma.inventoryItem.findMany({
      where: { ...scope, active: true },
      orderBy: { name: "asc" },
    }),
    prisma.wasteEntry.findMany({
      where: { ...scope, businessDate },
      orderBy: { createdAt: "desc" },
    }),
    prisma.managerIssue.findMany({
      where: { ...scope, status: "OPEN" },
      orderBy: { createdAt: "desc" },
    }),
    prisma.task.findMany({
      where: { ...scope, status: { in: ["OPEN", "IN_PROGRESS"] } },
      orderBy: [{ priority: "desc" }, { dueAt: "asc" }, { createdAt: "desc" }],
    }),
    listWorkingStaff(scope, timezone),
    listOpenManagerLogs(scope),
    getDashboardRevision(scope),
  ]);

  const sales = money(daily?.netSales) || money(daily?.salesAmount);
  const goal = money(daily?.salesGoal);
  const covers = daily?.covers ?? 0;
  const labor = money(daily?.laborCost);
  const lowStock = inventory.filter((item) => {
    const quantity = money(item.quantityOnHand);
    return quantity <= 0 || quantity <= money(item.reorderLevel) || quantity < money(item.parLevel);
  });
  const eightySix = menuStatuses.filter((item) => item.status === "EIGHTY_SIXED");
  const menuLowStock = menuStatuses.filter((item) => item.status === "LOW_STOCK");

  function statusRow(item: (typeof menuStatuses)[number]) {
    return {
      id: item.id,
      menuItemId: item.menuItemId,
      name: item.menuItem.name,
      remainingQuantity: item.remainingQuantity == null ? null : money(item.remainingQuantity),
      reason: item.reason,
      estimatedAvailableAt: item.estimatedAvailableAt?.toISOString() ?? null,
      createdAt: item.createdAt.toISOString(),
    };
  }

  return {
    updatedAt: new Date().toISOString(),
    revision: revision.revision,
    businessDate: businessDate.toISOString(),
    cards: {
      todaysSales: sales,
      salesGoal: goal,
      goalPercent: goal > 0 ? (sales / goal) * 100 : 0,
      covers,
      averageCheck: covers > 0 ? sales / covers : 0,
      laborPercent: sales > 0 ? (labor / sales) * 100 : 0,
      workingEmployees: staff.length,
      eightySixCount: eightySix.length,
      lowStockCount: menuLowStock.length,
      wasteToday: waste.length,
      openIssues: issues.length,
      openTasks: tasks.length,
    },
    eightySix: eightySix.map(statusRow),
    menuLowStock: menuLowStock.map(statusRow),
    lowStock: lowStock.map((item) => ({
      id: item.id,
      name: item.name,
      quantity: money(item.quantityOnHand),
      reorderPoint: money(item.reorderLevel),
      parLevel: money(item.parLevel),
      unit: item.unit,
    })),
    waste: waste.map((item) => ({
      id: item.id,
      itemName: item.itemName,
      quantity: money(item.quantity),
      unit: item.unit,
      totalCost: money(item.totalCost),
      reason: item.reason,
      createdAt: item.createdAt.toISOString(),
    })),
    issues: issues.map((item) => ({
      id: item.id,
      title: item.title,
      createdAt: item.createdAt.toISOString(),
    })),
    tasks: tasks.map((item) => ({
      id: item.id,
      title: item.title,
      createdAt: item.createdAt.toISOString(),
    })),
    staff: staff.map((item) => ({
      id: item.id,
      name: item.employee,
      station: STAFF_POSITION_LABELS[item.position],
      clockedInAt: item.clockedIn ?? item.scheduledStart,
    })),
    logs: logs.map((item) => ({
      id: item.id,
      body: item.description || item.body,
      createdAt: item.createdAt.toISOString(),
      category: MANAGER_LOG_CATEGORY_LABELS[item.category],
    })),
    daily: daily
      ? {
          salesAmount: sales,
          salesGoal: goal,
          covers,
          laborCost: labor,
        }
      : { salesAmount: 0, salesGoal: 0, covers: 0, laborCost: 0 },
  };
}
