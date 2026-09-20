import { dateKey } from "@/lib/waste/dates";

export type ManualPosExport = {
  sales?: unknown[];
  orders?: unknown[];
  menuItems?: unknown[];
  menu?: unknown[];
  employees?: unknown[];
  labor?: unknown[];
  payments?: unknown[];
};

export function buildManualSampleExport(businessDate: Date): ManualPosExport {
  const day = dateKey(businessDate);
  const opened = `${day}T17:12:00.000Z`;
  const closed = `${day}T18:04:00.000Z`;
  return {
    sales: [
      {
        id: `manual-sales-${day}`,
        businessDate: day,
        grossSales: 12480,
        netSales: 11840,
        foodSales: 8460,
        alcoholSales: 3080,
        otherSales: 300,
        discounts: 260,
        comps: 110,
        voids: 40,
        tax: 640,
        covers: 84,
        orderCount: 51,
      },
    ],
    menuItems: [
      { id: "manual-menu-branzino", name: "POS Import Branzino", category: "Entrees" },
      { id: "manual-menu-gnocchi", name: "POS Import Gnocchi", category: "Entrees" },
      { id: "manual-menu-negroni", name: "POS Import Negroni", category: "Cocktails" },
    ],
    employees: [
      { id: "manual-emp-avery", name: "Avery Cole", position: "SERVER", hourlyRate: 8.5, active: true },
      { id: "manual-emp-jordan", name: "Jordan Hale", position: "COOK", hourlyRate: 18, active: true },
      { id: "manual-emp-riley", name: "Riley Chen", position: "BARTENDER", hourlyRate: 12, active: true },
    ],
    orders: [
      {
        id: "manual-order-1001",
        businessDate: day,
        openedAt: opened,
        closedAt: closed,
        guestCount: 2,
        status: "CLOSED",
        netTotal: 86.4,
        tax: 6.2,
        tip: 16,
        discounts: 0,
        comps: 0,
        foodTotal: 62,
        alcoholTotal: 24.4,
        otherTotal: 0,
      },
      {
        id: "manual-order-1002",
        businessDate: day,
        openedAt: `${day}T19:08:00.000Z`,
        closedAt: `${day}T20:01:00.000Z`,
        guestCount: 4,
        status: "CLOSED",
        netTotal: 164.2,
        tax: 11.8,
        tip: 32,
        discounts: 8,
        comps: 0,
        foodTotal: 121,
        alcoholTotal: 43.2,
        otherTotal: 0,
      },
    ],
    payments: [
      {
        id: "manual-pay-1001",
        orderId: "manual-order-1001",
        amount: 86.4,
        tip: 16,
        method: "CARD",
        status: "APPROVED",
        processedAt: closed,
      },
      {
        id: "manual-pay-1002",
        orderId: "manual-order-1002",
        amount: 164.2,
        tip: 32,
        method: "CASH",
        status: "APPROVED",
        processedAt: `${day}T20:01:00.000Z`,
      },
    ],
  };
}
