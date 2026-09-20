import { z } from "zod";

function emptyToNull(value: unknown) {
  if (value === "" || value === undefined) return null;
  return value;
}

export const eightySixActionSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("addMenuItem"),
    name: z.string().trim().min(1).max(80),
    category: z.string().trim().max(40).nullable().optional(),
  }),
  z.object({
    type: z.literal("setStatus"),
    menuItemId: z.string().min(1),
    status: z.enum(["LOW_STOCK", "EIGHTY_SIXED"]),
    remainingQuantity: z.preprocess(emptyToNull, z.coerce.number().min(0).nullable()),
    reason: z.preprocess(emptyToNull, z.string().trim().max(240).nullable()),
    estimatedAvailableAt: z.preprocess(emptyToNull, z.coerce.date().nullable()),
  }),
  z.object({
    type: z.literal("restore"),
    menuItemId: z.string().min(1),
    reason: z.preprocess(emptyToNull, z.string().trim().max(240).nullable()),
  }),
]);

export type EightySixAction = z.infer<typeof eightySixActionSchema>;
