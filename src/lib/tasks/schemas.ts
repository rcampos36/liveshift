import { z } from "zod";
import { STAFF_POSITIONS } from "@/lib/staffing/types";
import { TASK_DEPARTMENTS, TASK_PRIORITIES, TASK_STATUSES, TASK_TYPES } from "@/lib/tasks/types";

function emptyToNull(value: unknown) {
  if (value === "" || value === undefined) return null;
  return value;
}

const dateField = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const timeField = z.string().regex(/^\d{2}:\d{2}$/);
const roleField = z.preprocess(emptyToNull, z.enum(STAFF_POSITIONS).nullable());

const taskFields = {
  title: z.string().trim().min(1).max(160),
  description: z.preprocess(emptyToNull, z.string().trim().max(500).nullable()),
  taskType: z.enum(TASK_TYPES).default("OTHER"),
  department: z.enum(TASK_DEPARTMENTS).default("OTHER"),
  assignedEmployeeId: z.preprocess(emptyToNull, z.string().min(1).nullable()),
  assignedRole: roleField,
  businessDate: dateField.optional(),
  dueTime: z.preprocess(emptyToNull, timeField.nullable()),
  priority: z.enum(TASK_PRIORITIES).default("NORMAL"),
};

const templateItemSchema = z.object({
  title: z.string().trim().min(1).max(160),
  description: z.preprocess(emptyToNull, z.string().trim().max(500).nullable()),
  assignedRole: roleField,
  priority: z.enum(TASK_PRIORITIES).default("NORMAL"),
});

export const taskActionSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("saveTask"), id: z.preprocess(emptyToNull, z.string().min(1).nullable()), ...taskFields }),
  z.object({ type: z.literal("setStatus"), id: z.string().min(1), status: z.enum(TASK_STATUSES) }),
  z.object({ type: z.literal("complete"), id: z.string().min(1) }),
  z.object({ type: z.literal("verify"), id: z.string().min(1) }),
  z.object({ type: z.literal("unverify"), id: z.string().min(1) }),
  z.object({ type: z.literal("remove"), id: z.string().min(1) }),
  z.object({
    type: z.literal("saveTemplate"),
    id: z.preprocess(emptyToNull, z.string().min(1).nullable()),
    name: z.string().trim().min(1).max(120),
    description: z.preprocess(emptyToNull, z.string().trim().max(500).nullable()),
    taskType: z.enum(TASK_TYPES).default("OTHER"),
    department: z.enum(TASK_DEPARTMENTS).default("OTHER"),
    assignedRole: roleField,
    priority: z.enum(TASK_PRIORITIES).default("NORMAL"),
    dueTime: z.preprocess(emptyToNull, timeField.nullable()),
    items: z.array(templateItemSchema).min(1),
  }),
  z.object({ type: z.literal("removeTemplate"), id: z.string().min(1) }),
  z.object({
    type: z.literal("applyTemplate"),
    id: z.string().min(1),
    businessDate: dateField.optional(),
    assignedEmployeeId: z.preprocess(emptyToNull, z.string().min(1).nullable()),
  }),
]);

export type TaskAction = z.infer<typeof taskActionSchema>;
