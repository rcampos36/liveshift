import { z } from "zod";

export const billingActionSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("subscribe"),
    priceId: z.string().min(1),
    locationQuantity: z.number().int().min(1).optional(),
  }),
  z.object({
    type: z.literal("changePlan"),
    priceId: z.string().min(1),
  }),
  z.object({
    type: z.literal("changeQuantity"),
    locationQuantity: z.coerce.number().int().min(1),
  }),
  z.object({
    type: z.literal("cancel"),
    immediately: z.boolean().optional(),
  }),
  z.object({
    type: z.literal("reactivate"),
  }),
]);

export const inviteBillingAdminSchema = z.object({
  firstName: z.string().trim().min(1).max(80),
  lastName: z.string().trim().min(1).max(80),
  email: z
    .string()
    .trim()
    .email()
    .transform((value) => value.toLowerCase()),
});

export const sendInvoiceSchema = z.object({
  email: z.preprocess(
    (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
    z
      .string()
      .trim()
      .email()
      .transform((value) => value.toLowerCase())
      .optional(),
  ),
});

export type BillingAction = z.infer<typeof billingActionSchema>;
