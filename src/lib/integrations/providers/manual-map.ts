import { dateKey } from "@/lib/waste/dates";
import type {
  NormalizedEmployee,
  NormalizedMenuItem,
  NormalizedOrder,
  NormalizedPayment,
  NormalizedSalesDay,
} from "@/lib/integrations/models";
import type { ManualPosExport } from "@/lib/integrations/providers/manual-sample";
import type { ProviderQuery } from "@/lib/integrations/types";

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function text(...values: unknown[]) {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
    if (typeof value === "number" && Number.isFinite(value)) {
      return String(value);
    }
  }
  return "";
}

function money(...values: unknown[]) {
  for (const value of values) {
    const amount = typeof value === "number" ? value : typeof value === "string" ? Number(value) : NaN;
    if (Number.isFinite(amount)) {
      return amount;
    }
  }
  return 0;
}

function integer(...values: unknown[]) {
  return Math.round(money(...values));
}

function flag(...values: unknown[]) {
  for (const value of values) {
    if (typeof value === "boolean") {
      return value;
    }
  }
  return true;
}

function inRange(businessDate: string, query: ProviderQuery) {
  const day = new Date(`${businessDate}T00:00:00.000Z`).getTime();
  return day >= query.start.getTime() && day <= query.end.getTime();
}

function businessDateOf(row: Record<string, unknown>, fallback: string) {
  const raw = text(row.businessDate, row.business_date, row.date, row.openedAt, row.opened_at, row.processedAt);
  const match = raw.match(/^(\d{4}-\d{2}-\d{2})/);
  return match?.[1] ?? fallback;
}

export function mapManualSales(exportData: ManualPosExport, query: ProviderQuery): NormalizedSalesDay[] {
  const fallback = dateKey(query.start);
  return (exportData.sales ?? []).flatMap((item, index) => {
    if (!isRecord(item)) return [];
    const businessDate = businessDateOf(item, fallback);
    if (!inRange(businessDate, query)) return [];
    const netSales = money(item.netSales, item.net_sales, item.net);
    const grossSales = money(item.grossSales, item.gross_sales, item.gross) || netSales;
    return [
      {
        externalId: text(item.id, item.guid, item.externalId) || `sales-${businessDate}-${index}`,
        businessDate,
        grossSales,
        netSales: netSales || grossSales,
        foodSales: money(item.foodSales, item.food_sales, item.food),
        alcoholSales: money(item.alcoholSales, item.alcohol_sales, item.alcohol),
        otherSales: money(item.otherSales, item.other_sales, item.other),
        discounts: money(item.discounts, item.discount),
        comps: money(item.comps, item.comp),
        voids: money(item.voids, item.void),
        tax: money(item.tax),
        covers: integer(item.covers, item.guestCount, item.guests),
        orderCount: integer(item.orderCount, item.orders, item.checkCount),
      },
    ];
  });
}

export function mapManualOrders(exportData: ManualPosExport, query: ProviderQuery): NormalizedOrder[] {
  const fallback = dateKey(query.start);
  return (exportData.orders ?? []).flatMap((item, index) => {
    if (!isRecord(item)) return [];
    const businessDate = businessDateOf(item, fallback);
    if (!inRange(businessDate, query)) return [];
    const statusRaw = text(item.status).toUpperCase();
    const status = statusRaw === "OPEN" || statusRaw === "VOIDED" ? statusRaw : "CLOSED";
    return [
      {
        externalId: text(item.id, item.guid, item.orderId) || `order-${index}`,
        businessDate,
        openedAt: text(item.openedAt, item.opened_at) || null,
        closedAt: text(item.closedAt, item.closed_at) || null,
        guestCount: integer(item.guestCount, item.covers, item.guests),
        status,
        netTotal: money(item.netTotal, item.net, item.total),
        tax: money(item.tax),
        tip: money(item.tip, item.gratuity),
        discounts: money(item.discounts, item.discount),
        comps: money(item.comps, item.comp),
        foodTotal: money(item.foodTotal, item.food),
        alcoholTotal: money(item.alcoholTotal, item.alcohol),
        otherTotal: money(item.otherTotal, item.other),
      },
    ];
  });
}

export function mapManualEmployees(exportData: ManualPosExport): NormalizedEmployee[] {
  const rows = exportData.employees ?? exportData.labor ?? [];
  return rows.flatMap((item, index) => {
    if (!isRecord(item)) return [];
    const name = text(item.name, item.displayName, item.fullName);
    if (!name) return [];
    return [
      {
        externalId: text(item.id, item.guid, item.employeeId) || `employee-${index}`,
        name,
        position: text(item.position, item.job, item.jobTitle) || "SERVER",
        hourlyRate: money(item.hourlyRate, item.wage, item.rate),
        active: flag(item.active, item.enabled),
      },
    ];
  });
}

export function mapManualMenuItems(exportData: ManualPosExport): NormalizedMenuItem[] {
  const rows = exportData.menuItems ?? exportData.menu ?? [];
  return rows.flatMap((item, index) => {
    if (!isRecord(item)) return [];
    const name = text(item.name, item.displayName, item.itemName);
    if (!name) return [];
    return [
      {
        externalId: text(item.id, item.guid, item.menuItemId) || `menu-${index}`,
        name,
        category: text(item.category, item.group, item.salesCategory) || null,
      },
    ];
  });
}

export function mapManualPayments(exportData: ManualPosExport, query: ProviderQuery): NormalizedPayment[] {
  const fallback = dateKey(query.start);
  return (exportData.payments ?? []).flatMap((item, index) => {
    if (!isRecord(item)) return [];
    const processedAt = text(item.processedAt, item.paidAt, item.createdAt) || `${fallback}T00:00:00.000Z`;
    if (!inRange(processedAt.slice(0, 10), query)) return [];
    const methodRaw = text(item.method, item.type, item.tender).toUpperCase();
    const method = methodRaw === "CARD" || methodRaw === "CASH" || methodRaw === "GIFT" ? methodRaw : "OTHER";
    const statusRaw = text(item.status).toUpperCase();
    const status = statusRaw === "VOIDED" || statusRaw === "REFUNDED" ? statusRaw : "APPROVED";
    return [
      {
        externalId: text(item.id, item.guid, item.paymentId) || `payment-${index}`,
        orderExternalId: text(item.orderId, item.orderGuid, item.orderExternalId) || null,
        amount: money(item.amount, item.total),
        tip: money(item.tip, item.gratuity),
        method,
        status,
        processedAt,
      },
    ];
  });
}
