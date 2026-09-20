import { z } from "zod";
import { BREAK_STATUSES, STAFF_POSITIONS } from "@/lib/staffing/types";

function emptyToNull(value: unknown) {
  if (value === "" || value === undefined) return null;
  return value;
}

const timeField = z.string().regex(/^\d{2}:\d{2}$/);
const dateField = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

export const staffingActionSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("saveShift"),
    id: z.preprocess(emptyToNull, z.string().min(1).nullable()),
    employee: z.string().trim().min(1).max(80),
    position: z.enum(STAFF_POSITIONS),
    businessDate: dateField,
    scheduledStart: timeField,
    scheduledEnd: timeField,
    hourlyRate: z.coerce.number().min(0).default(0),
  }),
  z.object({
    type: z.literal("clockIn"),
    id: z.preprocess(emptyToNull, z.string().min(1).nullable()),
    employee: z.string().trim().min(1).max(80).optional(),
    position: z.enum(STAFF_POSITIONS).optional(),
    station: z.string().trim().max(40).optional(),
  }),
  z.object({
    type: z.literal("clockOut"),
    id: z.string().min(1),
  }),
  z.object({
    type: z.literal("setCallout"),
    id: z.string().min(1),
    callout: z.coerce.boolean(),
  }),
  z.object({
    type: z.literal("setLate"),
    id: z.string().min(1),
    late: z.coerce.boolean(),
  }),
  z.object({
    type: z.literal("setBreak"),
    id: z.string().min(1),
    breakStatus: z.enum(BREAK_STATUSES),
  }),
  z.object({
    type: z.literal("removeShift"),
    id: z.string().min(1),
  }),
  z.object({
    type: z.literal("saveLaborCost"),
    businessDate: dateField,
    laborCost: z.coerce.number().min(0),
  }),
  z.object({
    type: z.literal("importLabor"),
    csv: z.string().min(1),
  }),
]);

export type StaffingAction = z.infer<typeof staffingActionSchema>;
