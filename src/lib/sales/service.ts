import "server-only";

import { prisma } from "@/lib/db/prisma";
import { recordAuditLog } from "@/lib/audit/log";
import { bumpDashboardRevision } from "@/lib/operations/revision";
import { businessDateFor, money, type RestaurantScope } from "@/lib/operations/scope";
import { dateKey, monthStart, parseBusinessDate, salesWindows, weekStart } from "@/lib/sales/dates";
import type { SalesAction } from "@/lib/sales/schemas";
import type { SalesDay, SalesMetrics, SalesPeriodReport, SalesSnapshot } from "@/lib/sales/types";

function emptyDay(restaurantId: string, businessDate: Date, dailyGoal = 0): SalesDay {
  return {
    restaurantId,
    businessDate: dateKey(businessDate),
    grossSales: 0,
    netSales: 0,
    foodSales: 0,
    alcoholSales: 0,
    otherSales: 0,
    discounts: 0,
    comps: 0,
    voids: 0,
    tax: 0,
    covers: 0,
    orderCount: 0,
    laborCost: 0,
    dailyGoal,
  };
}

function fromRow(
  restaurantId: string,
  row: {
    businessDate: Date;
    salesAmount: { toString(): string } | number;
    salesGoal: { toString(): string } | number;
    covers: number;
    laborCost: { toString(): string } | number;
    grossSales: { toString(): string } | number;
    netSales: { toString(): string } | number;
    foodSales: { toString(): string } | number;
    alcoholSales: { toString(): string } | number;
    otherSales: { toString(): string } | number;
    discounts: { toString(): string } | number;
    comps: { toString(): string } | number;
    voids: { toString(): string } | number;
    tax: { toString(): string } | number;
    orderCount: number;
  },
): SalesDay {
  const netSales = money(row.netSales) || money(row.salesAmount);
  const grossSales = money(row.grossSales) || netSales;
  return {
    restaurantId,
    businessDate: dateKey(row.businessDate),
    grossSales,
    netSales,
    foodSales: money(row.foodSales),
    alcoholSales: money(row.alcoholSales),
    otherSales: money(row.otherSales),
    discounts: money(row.discounts),
    comps: money(row.comps),
    voids: money(row.voids),
    tax: money(row.tax),
    covers: row.covers,
    orderCount: row.orderCount,
    laborCost: money(row.laborCost),
    dailyGoal: money(row.salesGoal),
  };
}

export function salesMetrics(day: Pick<SalesDay, "grossSales" | "netSales" | "foodSales" | "alcoholSales" | "otherSales" | "comps" | "voids" | "covers" | "orderCount">, goal: number): SalesMetrics {
  const mixBase = day.foodSales + day.alcoholSales + day.otherSales || day.netSales || day.grossSales;
  return {
    averageCheck: day.orderCount > 0 ? day.netSales / day.orderCount : 0,
    salesPerCover: day.covers > 0 ? day.netSales / day.covers : 0,
    salesVsGoal: day.netSales - goal,
    goalPercent: goal > 0 ? (day.netSales / goal) * 100 : 0,
    foodPercent: mixBase > 0 ? (day.foodSales / mixBase) * 100 : 0,
    alcoholPercent: mixBase > 0 ? (day.alcoholSales / mixBase) * 100 : 0,
    compsPercent: day.grossSales > 0 ? (day.comps / day.grossSales) * 100 : 0,
    voidsPercent: day.grossSales > 0 ? (day.voids / day.grossSales) * 100 : 0,
  };
}

function sumDays(restaurantId: string, days: SalesDay[], labelDate: Date): SalesDay {
  return days.reduce(
    (total, day) => ({
      ...total,
      grossSales: total.grossSales + day.grossSales,
      netSales: total.netSales + day.netSales,
      foodSales: total.foodSales + day.foodSales,
      alcoholSales: total.alcoholSales + day.alcoholSales,
      otherSales: total.otherSales + day.otherSales,
      discounts: total.discounts + day.discounts,
      comps: total.comps + day.comps,
      voids: total.voids + day.voids,
      tax: total.tax + day.tax,
      covers: total.covers + day.covers,
      orderCount: total.orderCount + day.orderCount,
      laborCost: total.laborCost + day.laborCost,
      dailyGoal: total.dailyGoal + day.dailyGoal,
    }),
    emptyDay(restaurantId, labelDate),
  );
}

function eachDate(start: Date, end: Date) {
  const dates: Date[] = [];
  for (let cursor = start; cursor <= end; cursor = new Date(cursor.getTime() + 86400000)) {
    dates.push(cursor);
  }
  return dates;
}

function goalAmount(
  goals: Array<{ period: string; periodStart: Date; amount: { toString(): string } | number }>,
  period: "DAILY" | "WEEKLY" | "MONTHLY",
  periodStart: Date,
) {
  const match = goals.find(
    (goal) => goal.period === period && dateKey(goal.periodStart) === dateKey(periodStart),
  );
  return match ? money(match.amount) : 0;
}

export async function getSalesSnapshot(
  scope: RestaurantScope,
  restaurantName: string,
  timezone: string,
  canWrite: boolean,
  selectedValue?: string | null,
): Promise<SalesSnapshot> {
  const windows = salesWindows(timezone, parseBusinessDate(selectedValue, businessDateFor(timezone)));
  const rangeStart = windows.weekStart < windows.monthStart ? windows.weekStart : windows.monthStart;
  const rangeEnd = windows.weekEnd > windows.monthEnd ? windows.weekEnd : windows.monthEnd;
  const [rows, goals] = await Promise.all([
    prisma.dailyOperations.findMany({
      where: {
        ...scope,
        businessDate: { gte: rangeStart, lte: rangeEnd },
      },
      orderBy: { businessDate: "asc" },
    }),
    prisma.salesGoal.findMany({
      where: {
        ...scope,
        OR: [
          { period: "DAILY", periodStart: { gte: rangeStart, lte: rangeEnd } },
          { period: "WEEKLY", periodStart: windows.weekStart },
          { period: "MONTHLY", periodStart: windows.monthStart },
        ],
      },
    }),
  ]);

  const byDate = new Map(rows.map((row) => [dateKey(row.businessDate), fromRow(scope.locationId, row)]));
  const dailyGoal = goalAmount(goals, "DAILY", windows.selected) || byDate.get(dateKey(windows.selected))?.dailyGoal || 0;
  const weeklyGoal = goalAmount(goals, "WEEKLY", windows.weekStart);
  const monthlyGoal = goalAmount(goals, "MONTHLY", windows.monthStart);

  function dayFor(date: Date) {
    const existing = byDate.get(dateKey(date)) ?? emptyDay(scope.locationId, date);
    const goal = goalAmount(goals, "DAILY", date) || existing.dailyGoal;
    return { ...existing, dailyGoal: goal };
  }

  const day = dayFor(windows.selected);
  if (dailyGoal && !day.dailyGoal) {
    day.dailyGoal = dailyGoal;
  }

  const weekDays = eachDate(windows.weekStart, windows.weekEnd).map((date) => {
    const existing = dayFor(date);
    return { ...existing, metrics: salesMetrics(existing, existing.dailyGoal) };
  });
  const monthDays = eachDate(windows.monthStart, windows.monthEnd).map((date) => {
    const existing = dayFor(date);
    return { ...existing, metrics: salesMetrics(existing, existing.dailyGoal) };
  });

  const weekTotals = sumDays(scope.locationId, weekDays, windows.weekStart);
  const monthTotals = sumDays(scope.locationId, monthDays, windows.monthStart);

  function report(label: string, start: Date, end: Date, totals: SalesDay, goal: number, days: SalesPeriodReport["days"]): SalesPeriodReport {
    return {
      label,
      start: dateKey(start),
      end: dateKey(end),
      goal,
      totals,
      metrics: salesMetrics(totals, goal),
      days,
    };
  }

  return {
    updatedAt: new Date().toISOString(),
    restaurantId: scope.locationId,
    restaurantName,
    timezone,
    canWrite,
    selectedDate: dateKey(windows.selected),
    goals: { daily: dailyGoal, weekly: weeklyGoal, monthly: monthlyGoal },
    daily: report("Daily", windows.selected, windows.selected, day, dailyGoal || day.dailyGoal, [
      { ...day, metrics: salesMetrics(day, dailyGoal || day.dailyGoal) },
    ]),
    weekly: report("Weekly", windows.weekStart, windows.weekEnd, weekTotals, weeklyGoal, weekDays),
    monthly: report("Monthly", windows.monthStart, windows.monthEnd, monthTotals, monthlyGoal, monthDays),
  };
}

export async function applySalesAction(scope: RestaurantScope, timezone: string, action: SalesAction) {
  if (action.type === "setGoals") {
    const selected = parseBusinessDate(action.businessDate, businessDateFor(timezone));
    const windows = salesWindows(timezone, selected);
    const previous = await prisma.salesGoal.findMany({
      where: {
        ...scope,
        OR: [
          { period: "DAILY", periodStart: windows.selected },
          { period: "WEEKLY", periodStart: windows.weekStart },
          { period: "MONTHLY", periodStart: windows.monthStart },
        ],
      },
    });
    await Promise.all([
      prisma.salesGoal.upsert({
        where: {
          locationId_period_periodStart: {
            locationId: scope.locationId,
            period: "DAILY",
            periodStart: windows.selected,
          },
        },
        create: { ...scope, period: "DAILY", periodStart: windows.selected, amount: action.daily },
        update: { amount: action.daily },
      }),
      prisma.salesGoal.upsert({
        where: {
          locationId_period_periodStart: {
            locationId: scope.locationId,
            period: "WEEKLY",
            periodStart: windows.weekStart,
          },
        },
        create: { ...scope, period: "WEEKLY", periodStart: windows.weekStart, amount: action.weekly },
        update: { amount: action.weekly },
      }),
      prisma.salesGoal.upsert({
        where: {
          locationId_period_periodStart: {
            locationId: scope.locationId,
            period: "MONTHLY",
            periodStart: windows.monthStart,
          },
        },
        create: { ...scope, period: "MONTHLY", periodStart: windows.monthStart, amount: action.monthly },
        update: { amount: action.monthly },
      }),
      prisma.dailyOperations.upsert({
        where: { locationId_businessDate: { locationId: scope.locationId, businessDate: windows.selected } },
        create: { ...scope, businessDate: windows.selected, salesGoal: action.daily },
        update: { salesGoal: action.daily },
      }),
    ]);
    await recordAuditLog({
      scope,
      entity: "SalesGoal",
      entityId: dateKey(windows.selected),
      action: previous.length ? "UPDATE" : "CREATE",
      oldValue: previous.map((goal) => ({ period: goal.period, amount: goal.amount, periodStart: goal.periodStart })),
      newValue: { daily: action.daily, weekly: action.weekly, monthly: action.monthly },
    });
    await bumpDashboardRevision(scope);
    return;
  }

  const businessDate = parseBusinessDate(action.businessDate, businessDateFor(timezone));
  const netSales = action.netSales || action.grossSales;
  const grossSales = action.grossSales || netSales;
  const previousDay = await prisma.dailyOperations.findFirst({
    where: { ...scope, businessDate },
  });

  const day = await prisma.dailyOperations.upsert({
    where: { locationId_businessDate: { locationId: scope.locationId, businessDate } },
    create: {
      ...scope,
      businessDate,
      salesAmount: netSales,
      salesGoal: 0,
      covers: action.covers,
      laborCost: action.laborCost,
      grossSales,
      netSales,
      foodSales: action.foodSales,
      alcoholSales: action.alcoholSales,
      otherSales: action.otherSales,
      discounts: action.discounts,
      comps: action.comps,
      voids: action.voids,
      tax: action.tax,
      orderCount: action.orderCount,
    },
    update: {
      salesAmount: netSales,
      covers: action.covers,
      laborCost: action.laborCost,
      grossSales,
      netSales,
      foodSales: action.foodSales,
      alcoholSales: action.alcoholSales,
      otherSales: action.otherSales,
      discounts: action.discounts,
      comps: action.comps,
      voids: action.voids,
      tax: action.tax,
      orderCount: action.orderCount,
    },
  });
  await recordAuditLog({
    scope,
    entity: "DailyOperations",
    entityId: day.id,
    action: previousDay ? "UPDATE" : "CREATE",
    oldValue: previousDay,
    newValue: day,
  });
  await bumpDashboardRevision(scope);
}

export async function upsertLiveSales(
  scope: RestaurantScope,
  businessDate: Date,
  input: { salesAmount: number; salesGoal: number; covers: number; laborCost: number },
) {
  const previous = await prisma.dailyOperations.findFirst({
    where: { ...scope, businessDate },
  });
  const day = await prisma.dailyOperations.upsert({
    where: { locationId_businessDate: { locationId: scope.locationId, businessDate } },
    create: {
      ...scope,
      businessDate,
      salesAmount: input.salesAmount,
      salesGoal: input.salesGoal,
      covers: input.covers,
      laborCost: input.laborCost,
      grossSales: input.salesAmount,
      netSales: input.salesAmount,
    },
    update: {
      salesAmount: input.salesAmount,
      salesGoal: input.salesGoal,
      covers: input.covers,
      laborCost: input.laborCost,
      grossSales: input.salesAmount,
      netSales: input.salesAmount,
    },
  });

  await prisma.salesGoal.upsert({
    where: {
      locationId_period_periodStart: {
        locationId: scope.locationId,
        period: "DAILY",
        periodStart: businessDate,
      },
    },
    create: { ...scope, period: "DAILY", periodStart: businessDate, amount: input.salesGoal },
    update: { amount: input.salesGoal },
  });
  await recordAuditLog({
    scope,
    entity: "DailyOperations",
    entityId: day.id,
    action: previous ? "UPDATE" : "CREATE",
    oldValue: previous,
    newValue: day,
  });
}

export function periodStarts(timezone: string, selected?: Date) {
  const day = selected ?? businessDateFor(timezone);
  return { day, week: weekStart(day), month: monthStart(day) };
}
