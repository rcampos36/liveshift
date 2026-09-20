import type { StaffPosition } from "@/lib/staffing/types";

export type NormalizedSalesDay = {
  externalId: string;
  businessDate: string;
  grossSales: number;
  netSales: number;
  foodSales: number;
  alcoholSales: number;
  otherSales: number;
  discounts: number;
  comps: number;
  voids: number;
  tax: number;
  covers: number;
  orderCount: number;
};

export type NormalizedOrder = {
  externalId: string;
  businessDate: string;
  openedAt: string | null;
  closedAt: string | null;
  guestCount: number;
  status: "OPEN" | "CLOSED" | "VOIDED";
  netTotal: number;
  tax: number;
  tip: number;
  discounts: number;
  comps: number;
  foodTotal: number;
  alcoholTotal: number;
  otherTotal: number;
};

export type NormalizedEmployee = {
  externalId: string;
  name: string;
  position: StaffPosition | string;
  hourlyRate: number;
  active: boolean;
};

export type NormalizedMenuItem = {
  externalId: string;
  name: string;
  category: string | null;
};

export type NormalizedPayment = {
  externalId: string;
  orderExternalId: string | null;
  amount: number;
  tip: number;
  method: "CARD" | "CASH" | "GIFT" | "OTHER";
  status: "APPROVED" | "VOIDED" | "REFUNDED";
  processedAt: string;
};
