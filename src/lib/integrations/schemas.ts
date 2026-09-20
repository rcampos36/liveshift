import { z } from "zod";
import { INTEGRATION_RESOURCES, POS_PROVIDERS, SYNC_INTERVALS } from "@/lib/integrations/types";

const emptyToNull = (value: unknown) => (typeof value === "string" && value.trim() === "" ? null : value);

export const upsertConnectionSchema = z.object({
  provider: z.enum(POS_PROVIDERS),
  externalLocationId: z.preprocess(emptyToNull, z.union([z.string().trim().max(160), z.null()]).optional()),
  status: z.enum(["DISABLED", "READY"]).optional(),
  credentials: z.record(z.string(), z.string().nullable()).optional(),
  sourceUrl: z.preprocess(emptyToNull, z.union([z.string().trim().url("Enter a valid source URL"), z.null()]).optional()),
  useSampleData: z.boolean().optional(),
  scheduledEnabled: z.boolean().optional(),
  syncIntervalMinutes: z.number().int().refine((value) => (SYNC_INTERVALS as readonly number[]).includes(value), {
    message: "Choose 15, 30, 60, or 240 minutes",
  }).optional(),
});

export const syncConnectionSchema = z.object({
  connectionId: z.string().min(1),
  resource: z.enum(INTEGRATION_RESOURCES).or(z.literal("ALL")).default("ALL"),
  trigger: z.enum(["MANUAL", "SCHEDULED"]).default("MANUAL"),
  start: z.string().optional(),
  end: z.string().optional(),
});

export type UpsertConnectionInput = z.infer<typeof upsertConnectionSchema>;
export type SyncConnectionInput = z.infer<typeof syncConnectionSchema>;
