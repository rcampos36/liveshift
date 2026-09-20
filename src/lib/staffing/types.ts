export const STAFF_POSITIONS = [
  "SERVER",
  "BARTENDER",
  "HOST",
  "BUSSER",
  "COOK",
  "PREP_COOK",
  "DISHWASHER",
  "KITCHEN_MANAGER",
  "MANAGER",
  "GENERAL_MANAGER",
] as const;

export type StaffPosition = (typeof STAFF_POSITIONS)[number];

export const STAFF_POSITION_LABELS: Record<StaffPosition, string> = {
  SERVER: "Server",
  BARTENDER: "Bartender",
  HOST: "Host",
  BUSSER: "Busser",
  COOK: "Cook",
  PREP_COOK: "Prep Cook",
  DISHWASHER: "Dishwasher",
  KITCHEN_MANAGER: "Kitchen Manager",
  MANAGER: "Manager",
  GENERAL_MANAGER: "General Manager",
};

export const BREAK_STATUSES = ["ON_DUTY", "ON_BREAK"] as const;

export type BreakStatus = (typeof BREAK_STATUSES)[number];

export type StaffEmployee = {
  id: string;
  restaurantId: string;
  name: string;
  position: StaffPosition;
  hourlyRate: number;
  active: boolean;
};

export type StaffShiftRecord = {
  id: string;
  restaurantId: string;
  employeeId: string | null;
  employee: string;
  position: StaffPosition;
  businessDate: string;
  scheduledStart: string;
  scheduledEnd: string;
  clockedIn: string | null;
  clockedOut: string | null;
  callout: boolean;
  late: boolean;
  breakStatus: BreakStatus;
  hourlyRate: number;
  scheduledHours: number;
  laborHours: number;
  estimatedLaborCost: number;
};

export type StaffingKpis = {
  scheduled: number;
  currentlyWorking: number;
  late: number;
  calledOut: number;
  onBreak: number;
  laborHours: number;
  scheduledHours: number;
  estimatedLaborCost: number;
  laborCost: number;
  netSales: number;
  laborPercent: number;
};

export type StaffingSnapshot = {
  updatedAt: string;
  restaurantId: string;
  restaurantName: string;
  timezone: string;
  canWrite: boolean;
  selectedDate: string;
  kpis: StaffingKpis;
  employees: StaffEmployee[];
  shifts: StaffShiftRecord[];
};
