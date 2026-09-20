import { z } from "zod";
import { MANAGER_LOG_CATEGORIES, MANAGER_LOG_PRIORITIES } from "@/lib/manager-log/types";

const dateField = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

export const managerLogActionSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("create"),
    businessDate: dateField.optional(),
    category: z.enum(MANAGER_LOG_CATEGORIES).default("GENERAL"),
    priority: z.enum(MANAGER_LOG_PRIORITIES).default("NORMAL"),
    description: z.string().trim().min(1).max(1000),
  }),
  z.object({
    type: z.literal("resolve"),
    id: z.string().min(1),
  }),
  z.object({
    type: z.literal("reopen"),
    id: z.string().min(1),
  }),
]);

export type ManagerLogAction = z.infer<typeof managerLogActionSchema>;
