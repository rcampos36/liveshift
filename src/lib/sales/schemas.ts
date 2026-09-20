import { z } from "zod";

const moneyField = z.coerce.number().min(0);

export const salesActionSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("saveDay"),
    businessDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    grossSales: moneyField,
    netSales: moneyField,
    foodSales: moneyField.default(0),
    alcoholSales: moneyField.default(0),
    otherSales: moneyField.default(0),
    discounts: moneyField.default(0),
    comps: moneyField.default(0),
    voids: moneyField.default(0),
    tax: moneyField.default(0),
    covers: z.coerce.number().int().min(0),
    orderCount: z.coerce.number().int().min(0).default(0),
    laborCost: moneyField.default(0),
  }),
  z.object({
    type: z.literal("setGoals"),
    daily: moneyField,
    weekly: moneyField,
    monthly: moneyField,
    businessDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  }),
]);

export type SalesAction = z.infer<typeof salesActionSchema>;
