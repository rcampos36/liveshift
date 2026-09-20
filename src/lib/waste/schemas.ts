import { z } from "zod";
import { SERVICE_SHIFTS, WASTE_REASONS } from "@/lib/waste/types";

function emptyToNull(value: unknown) {
  if (value === "" || value === undefined) return null;
  return value;
}

export const wasteActionSchema = z.object({
  type: z.literal("record"),
  inventoryItemId: z.preprocess(emptyToNull, z.string().min(1).nullable()),
  itemName: z.preprocess(emptyToNull, z.string().trim().max(80).nullable()),
  quantity: z.coerce.number().positive(),
  unit: z.preprocess(emptyToNull, z.string().trim().max(16).nullable()),
  reason: z.enum(WASTE_REASONS).default("OTHER"),
  employeeId: z.preprocess(emptyToNull, z.string().min(1).nullable()),
  shift: z.enum(SERVICE_SHIFTS).optional(),
  notes: z.preprocess(emptyToNull, z.string().trim().max(400).nullable()),
});

export type WasteAction = z.infer<typeof wasteActionSchema>;
