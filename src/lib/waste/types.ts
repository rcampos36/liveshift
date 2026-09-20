export const WASTE_REASONS = [
  "SPOILAGE",
  "OVERCOOKED",
  "INCORRECT_ORDER",
  "DROPPED",
  "EXPIRED",
  "CUSTOMER_RETURN",
  "PREP_WASTE",
  "EMPLOYEE_MEAL",
  "OTHER",
] as const;

export type WasteReason = (typeof WASTE_REASONS)[number];

export const WASTE_REASON_LABELS: Record<WasteReason, string> = {
  SPOILAGE: "Spoilage",
  OVERCOOKED: "Overcooked",
  INCORRECT_ORDER: "Incorrect order",
  DROPPED: "Dropped",
  EXPIRED: "Expired",
  CUSTOMER_RETURN: "Customer return",
  PREP_WASTE: "Prep waste",
  EMPLOYEE_MEAL: "Employee meal",
  OTHER: "Other",
};

export const SERVICE_SHIFTS = ["BREAKFAST", "LUNCH", "DINNER", "LATE"] as const;

export type ServiceShift = (typeof SERVICE_SHIFTS)[number];

export const SERVICE_SHIFT_LABELS: Record<ServiceShift, string> = {
  BREAKFAST: "Breakfast",
  LUNCH: "Lunch",
  DINNER: "Dinner",
  LATE: "Late",
};

export type WasteEntryRecord = {
  id: string;
  restaurantId: string;
  restaurantName: string;
  inventoryItemId: string | null;
  itemName: string;
  quantity: number;
  unit: string;
  unitCost: number;
  totalCost: number;
  reason: WasteReason;
  employeeId: string | null;
  employeeName: string | null;
  shift: ServiceShift;
  notes: string | null;
  businessDate: string;
  createdAt: string;
};

export type WasteBreakdown = {
  key: string;
  label: string;
  count: number;
  cost: number;
};

export type WasteSnapshot = {
  updatedAt: string;
  restaurantId: string | null;
  restaurantName: string;
  timezone: string;
  canWrite: boolean;
  currentUserId: string;
  defaultShift: ServiceShift;
  kpis: {
    wasteToday: number;
    wasteThisWeek: number;
    wasteThisMonth: number;
    wastePercentOfSales: number;
    wasteCountToday: number;
    salesToday: number;
  };
  catalog: Array<{ id: string; name: string; unit: string; unitCost: number }>;
  employees: Array<{ id: string; name: string }>;
  entries: WasteEntryRecord[];
  analytics: {
    byItem: WasteBreakdown[];
    byReason: WasteBreakdown[];
    byEmployee: WasteBreakdown[];
    byShift: WasteBreakdown[];
    byDay: WasteBreakdown[];
    byRestaurant: WasteBreakdown[];
    topItems: WasteBreakdown[];
    costTrend: WasteBreakdown[];
  };
};
