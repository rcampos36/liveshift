import "server-only";

// Provider adapters return Normalized* records. This module upserts those into
// restaurant-scoped tables. A failed or empty provider response must never
// delete DailyOperations, MenuItem, RestaurantEmployee, RestaurantOrder, or
// RestaurantPayment rows.

import type { IntegrationResource } from "@/generated/prisma/client";
import { prisma } from "@/lib/db/prisma";
import { bumpDashboardRevision } from "@/lib/operations/revision";
import type { RestaurantScope } from "@/lib/operations/scope";
import type {
  NormalizedEmployee,
  NormalizedMenuItem,
  NormalizedOrder,
  NormalizedPayment,
  NormalizedSalesDay,
} from "@/lib/integrations/models";
import { STAFF_POSITIONS, type StaffPosition } from "@/lib/staffing/types";

function dateOnly(value: string) {
  return new Date(`${value}T00:00:00.000Z`);
}

function mapPosition(value: string): StaffPosition {
  const normalized = value.trim().toUpperCase().replaceAll(" ", "_");
  if ((STAFF_POSITIONS as readonly string[]).includes(normalized)) {
    return normalized as StaffPosition;
  }
  return "SERVER";
}

async function upsertExternalRef(
  scope: RestaurantScope,
  connectionId: string,
  resource: IntegrationResource,
  externalId: string,
  internalId: string,
) {
  await prisma.integrationExternalRef.upsert({
    where: {
      connectionId_resource_externalId: {
        connectionId,
        resource,
        externalId,
      },
    },
    create: { ...scope, connectionId, resource, externalId, internalId },
    update: { internalId },
  });
}

async function findInternalId(
  scope: RestaurantScope,
  connectionId: string,
  resource: IntegrationResource,
  externalId: string,
) {
  const ref = await prisma.integrationExternalRef.findFirst({
    where: { ...scope, connectionId, resource, externalId },
    select: { internalId: true },
  });
  return ref?.internalId ?? null;
}

export async function persistNormalizedSales(
  scope: RestaurantScope,
  connectionId: string,
  days: NormalizedSalesDay[],
) {
  for (const day of days) {
    const businessDate = dateOnly(day.businessDate);
    const existing = await prisma.dailyOperations.findFirst({
      where: { ...scope, businessDate },
      select: { id: true, salesGoal: true, laborCost: true },
    });

    const row = existing
      ? await prisma.dailyOperations.update({
          where: { id: existing.id },
          data: {
            salesAmount: day.netSales,
            grossSales: day.grossSales,
            netSales: day.netSales,
            foodSales: day.foodSales,
            alcoholSales: day.alcoholSales,
            otherSales: day.otherSales,
            discounts: day.discounts,
            comps: day.comps,
            voids: day.voids,
            tax: day.tax,
            covers: day.covers,
            orderCount: day.orderCount,
          },
        })
      : await prisma.dailyOperations.create({
          data: {
            ...scope,
            businessDate,
            salesAmount: day.netSales,
            salesGoal: 0,
            laborCost: 0,
            grossSales: day.grossSales,
            netSales: day.netSales,
            foodSales: day.foodSales,
            alcoholSales: day.alcoholSales,
            otherSales: day.otherSales,
            discounts: day.discounts,
            comps: day.comps,
            voids: day.voids,
            tax: day.tax,
            covers: day.covers,
            orderCount: day.orderCount,
          },
        });

    await upsertExternalRef(scope, connectionId, "SALES", day.externalId, row.id);
  }

  if (days.length) {
    await bumpDashboardRevision(scope);
  }
  return days.length;
}

export async function persistNormalizedOrders(
  scope: RestaurantScope,
  connectionId: string,
  orders: NormalizedOrder[],
) {
  for (const order of orders) {
    const existingId = await findInternalId(scope, connectionId, "ORDERS", order.externalId);
    const data = {
      businessDate: dateOnly(order.businessDate),
      openedAt: order.openedAt ? new Date(order.openedAt) : null,
      closedAt: order.closedAt ? new Date(order.closedAt) : null,
      guestCount: order.guestCount,
      status: order.status,
      netTotal: order.netTotal,
      tax: order.tax,
      tip: order.tip,
      discounts: order.discounts,
      comps: order.comps,
      foodTotal: order.foodTotal,
      alcoholTotal: order.alcoholTotal,
      otherTotal: order.otherTotal,
    };

    const row = existingId
      ? await prisma.restaurantOrder.update({
          where: { id: existingId },
          data,
        })
      : await prisma.restaurantOrder.create({
          data: { ...scope, ...data },
        });

    await upsertExternalRef(scope, connectionId, "ORDERS", order.externalId, row.id);
  }

  return orders.length;
}

export async function persistNormalizedEmployees(
  scope: RestaurantScope,
  connectionId: string,
  employees: NormalizedEmployee[],
) {
  for (const employee of employees) {
    const existingId = await findInternalId(scope, connectionId, "EMPLOYEES", employee.externalId);
    const byName = existingId
      ? null
      : await prisma.restaurantEmployee.findFirst({
          where: { ...scope, name: employee.name },
          select: { id: true },
        });
    const targetId = existingId ?? byName?.id ?? null;
    const data = {
      name: employee.name,
      position: mapPosition(String(employee.position)),
      hourlyRate: employee.hourlyRate,
      active: employee.active,
    };

    const row = targetId
      ? await prisma.restaurantEmployee.update({ where: { id: targetId }, data })
      : await prisma.restaurantEmployee.create({ data: { ...scope, ...data } });

    await upsertExternalRef(scope, connectionId, "EMPLOYEES", employee.externalId, row.id);
  }

  if (employees.length) {
    await bumpDashboardRevision(scope);
  }
  return employees.length;
}

export async function persistNormalizedMenuItems(
  scope: RestaurantScope,
  connectionId: string,
  items: NormalizedMenuItem[],
) {
  for (const item of items) {
    const existingId = await findInternalId(scope, connectionId, "MENU_ITEMS", item.externalId);
    const byName = existingId
      ? null
      : await prisma.menuItem.findFirst({
          where: { ...scope, name: item.name },
          select: { id: true },
        });
    const targetId = existingId ?? byName?.id ?? null;
    const data = { name: item.name, category: item.category };

    const row = targetId
      ? await prisma.menuItem.update({ where: { id: targetId }, data })
      : await prisma.menuItem.create({ data: { ...scope, ...data } });

    await upsertExternalRef(scope, connectionId, "MENU_ITEMS", item.externalId, row.id);
  }

  if (items.length) {
    await bumpDashboardRevision(scope);
  }
  return items.length;
}

export async function persistNormalizedPayments(
  scope: RestaurantScope,
  connectionId: string,
  payments: NormalizedPayment[],
) {
  for (const payment of payments) {
    const existingId = await findInternalId(scope, connectionId, "PAYMENTS", payment.externalId);
    const orderId = payment.orderExternalId
      ? await findInternalId(scope, connectionId, "ORDERS", payment.orderExternalId)
      : null;
    const data = {
      orderId,
      amount: payment.amount,
      tip: payment.tip,
      method: payment.method,
      status: payment.status,
      processedAt: new Date(payment.processedAt),
    };

    const row = existingId
      ? await prisma.restaurantPayment.update({ where: { id: existingId }, data })
      : await prisma.restaurantPayment.create({ data: { ...scope, ...data } });

    await upsertExternalRef(scope, connectionId, "PAYMENTS", payment.externalId, row.id);
  }

  return payments.length;
}
