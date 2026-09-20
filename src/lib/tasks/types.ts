import { STAFF_POSITIONS, STAFF_POSITION_LABELS, type StaffPosition } from "@/lib/staffing/types";

export { STAFF_POSITIONS, STAFF_POSITION_LABELS, type StaffPosition };

export const TASK_TYPES = [
  "OPENING",
  "CLOSING",
  "CLEANING",
  "PREP",
  "MAINTENANCE",
  "MANAGER",
  "SAFETY",
  "OTHER",
] as const;

export type RestaurantTaskType = (typeof TASK_TYPES)[number];

export const TASK_TYPE_LABELS: Record<RestaurantTaskType, string> = {
  OPENING: "Opening",
  CLOSING: "Closing",
  CLEANING: "Cleaning",
  PREP: "Prep",
  MAINTENANCE: "Maintenance",
  MANAGER: "Manager",
  SAFETY: "Safety",
  OTHER: "Other",
};

export const TASK_DEPARTMENTS = [
  "KITCHEN",
  "FRONT_OF_HOUSE",
  "BAR",
  "MANAGEMENT",
  "FACILITIES",
  "OTHER",
] as const;

export type TaskDepartment = (typeof TASK_DEPARTMENTS)[number];

export const TASK_DEPARTMENT_LABELS: Record<TaskDepartment, string> = {
  KITCHEN: "Kitchen",
  FRONT_OF_HOUSE: "Front of house",
  BAR: "Bar",
  MANAGEMENT: "Management",
  FACILITIES: "Facilities",
  OTHER: "Other",
};

export const TASK_PRIORITIES = ["LOW", "NORMAL", "HIGH", "URGENT"] as const;

export type TaskPriority = (typeof TASK_PRIORITIES)[number];

export const TASK_PRIORITY_LABELS: Record<TaskPriority, string> = {
  LOW: "Low",
  NORMAL: "Normal",
  HIGH: "High",
  URGENT: "Urgent",
};

export const TASK_STATUSES = ["OPEN", "IN_PROGRESS", "DONE", "CANCELLED"] as const;

export type TaskStatus = (typeof TASK_STATUSES)[number];

export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  OPEN: "Open",
  IN_PROGRESS: "In progress",
  DONE: "Completed",
  CANCELLED: "Cancelled",
};

export type TaskRecord = {
  id: string;
  restaurantId: string;
  restaurantName: string;
  title: string;
  description: string | null;
  taskType: RestaurantTaskType;
  department: TaskDepartment;
  assignedEmployeeId: string | null;
  assignedEmployeeName: string | null;
  assignedRole: StaffPosition | null;
  dueAt: string | null;
  priority: TaskPriority;
  status: TaskStatus;
  createdById: string | null;
  createdByName: string | null;
  completedById: string | null;
  completedByName: string | null;
  completedAt: string | null;
  verifiedById: string | null;
  verifiedByName: string | null;
  verifiedAt: string | null;
  templateId: string | null;
  templateName: string | null;
  templateRunId: string | null;
  businessDate: string | null;
  createdAt: string;
  overdue: boolean;
};

export type TaskTemplateItemRecord = {
  id: string;
  title: string;
  description: string | null;
  sortOrder: number;
  assignedRole: StaffPosition | null;
  priority: TaskPriority;
};

export type TaskTemplateRecord = {
  id: string;
  restaurantId: string;
  name: string;
  description: string | null;
  taskType: RestaurantTaskType;
  department: TaskDepartment;
  assignedRole: StaffPosition | null;
  priority: TaskPriority;
  dueTime: string | null;
  items: TaskTemplateItemRecord[];
};

export type TaskSnapshot = {
  updatedAt: string;
  restaurantId: string;
  restaurantName: string;
  timezone: string;
  canWrite: boolean;
  currentUserId: string;
  selectedDate: string;
  kpis: {
    open: number;
    inProgress: number;
    completed: number;
    overdue: number;
    unverified: number;
  };
  employees: Array<{ id: string; name: string; position: StaffPosition }>;
  tasks: TaskRecord[];
  templates: TaskTemplateRecord[];
};
