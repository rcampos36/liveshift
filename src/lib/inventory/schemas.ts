import { z } from "zod";
import { INVENTORY_CATEGORIES } from "@/lib/inventory/types";

function emptyToNull(value: unknown) {
  if (value === "" || value === undefined) return null;
  return value;
}

const categorySchema = z.enum(INVENTORY_CATEGORIES);

const itemFields = {
  name: z.string().trim().min(1).max(80),
  category: categorySchema.default("OTHER"),
  sku: z.preprocess(emptyToNull, z.string().trim().max(40).nullable()),
  unit: z.string().trim().min(1).max(16).default("ea"),
  quantityOnHand: z.coerce.number().min(0),
  parLevel: z.coerce.number().min(0).default(0),
  reorderLevel: z.coerce.number().min(0).default(0),
  unitCost: z.coerce.number().min(0).default(0),
  supplier: z.preprocess(emptyToNull, z.string().trim().max(80).nullable()),
  active: z.preprocess((value) => {
    if (value === "false" || value === false || value === 0 || value === "0") return false;
    if (value === "" || value === undefined || value === null) return true;
    return true;
  }, z.boolean()),
};

export const inventoryActionSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("create"), ...itemFields }),
  z.object({ type: z.literal("update"), id: z.string().min(1), ...itemFields }),
  z.object({
    type: z.literal("count"),
    id: z.string().min(1),
    quantityOnHand: z.coerce.number().min(0),
    reason: z.preprocess(emptyToNull, z.string().trim().max(240).nullable()),
  }),
  z.object({
    type: z.literal("adjust"),
    id: z.string().min(1),
    quantityDelta: z.coerce.number(),
    reason: z.preprocess(emptyToNull, z.string().trim().max(240).nullable()),
  }),
  z.object({
    type: z.literal("setActive"),
    id: z.string().min(1),
    active: z.boolean(),
    reason: z.preprocess(emptyToNull, z.string().trim().max(240).nullable()),
  }),
  z.object({
    type: z.literal("import"),
    csv: z.string().min(1),
  }),
]);

export type InventoryAction = z.infer<typeof inventoryActionSchema>;
