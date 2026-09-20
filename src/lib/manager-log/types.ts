export const MANAGER_LOG_CATEGORIES = [
  "STAFFING",
  "CUSTOMER_COMPLAINT",
  "MAINTENANCE",
  "INVENTORY_SHORTAGE",
  "VENDOR",
  "INCIDENT",
  "SHIFT_NOTE",
  "CASH",
  "GENERAL",
] as const;

export type ManagerLogCategory = (typeof MANAGER_LOG_CATEGORIES)[number];

export const MANAGER_LOG_CATEGORY_LABELS: Record<ManagerLogCategory, string> = {
  STAFFING: "Staffing issues",
  CUSTOMER_COMPLAINT: "Customer complaints",
  MAINTENANCE: "Maintenance problems",
  INVENTORY_SHORTAGE: "Inventory shortages",
  VENDOR: "Vendor issues",
  INCIDENT: "Incidents",
  SHIFT_NOTE: "Shift notes",
  CASH: "Cash issues",
  GENERAL: "General notes",
};

export const MANAGER_LOG_PRIORITIES = ["LOW", "NORMAL", "HIGH", "URGENT"] as const;

export type ManagerLogPriority = (typeof MANAGER_LOG_PRIORITIES)[number];

export const MANAGER_LOG_PRIORITY_LABELS: Record<ManagerLogPriority, string> = {
  LOW: "Low",
  NORMAL: "Normal",
  HIGH: "High",
  URGENT: "Urgent",
};

export type ManagerLogRecord = {
  id: string;
  restaurantId: string;
  restaurantName: string;
  businessDate: string;
  category: ManagerLogCategory;
  priority: ManagerLogPriority;
  description: string;
  createdById: string | null;
  createdByName: string | null;
  createdAt: string;
  resolved: boolean;
  resolvedById: string | null;
  resolvedByName: string | null;
  resolvedAt: string | null;
};

export type ManagerLogSnapshot = {
  updatedAt: string;
  restaurantId: string;
  restaurantName: string;
  timezone: string;
  canWrite: boolean;
  currentUserId: string;
  selectedDate: string;
  previousDate: string;
  kpis: {
    today: number;
    unresolvedToday: number;
    previousUnresolved: number;
    carryForward: number;
    urgentOpen: number;
  };
  previousShift: ManagerLogRecord[];
  carryForward: ManagerLogRecord[];
  today: ManagerLogRecord[];
};
