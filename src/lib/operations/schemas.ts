import { z } from "zod";

export const operationsActionSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("updateSales"),
    salesAmount: z.coerce.number().min(0),
    salesGoal: z.coerce.number().min(0),
    covers: z.coerce.number().int().min(0),
    laborCost: z.coerce.number().min(0),
  }),
  z.object({
    type: z.literal("addEightySix"),
    name: z.string().trim().min(1).max(80),
  }),
  z.object({
    type: z.literal("clearEightySix"),
    menuItemId: z.string().min(1),
  }),
  z.object({
    type: z.literal("upsertInventory"),
    name: z.string().trim().min(1).max(80),
    quantity: z.coerce.number().min(0),
    reorderPoint: z.coerce.number().min(0),
    unit: z.string().trim().min(1).max(16).default("ea"),
  }),
  z.object({
    type: z.literal("addWaste"),
    itemName: z.string().trim().min(1).max(80),
    quantity: z.coerce.number().min(0),
    unit: z.string().trim().min(1).max(16).default("ea"),
  }),
  z.object({
    type: z.literal("addIssue"),
    title: z.string().trim().min(1).max(160),
  }),
  z.object({
    type: z.literal("resolveIssue"),
    id: z.string().min(1),
  }),
  z.object({
    type: z.literal("addTask"),
    title: z.string().trim().min(1).max(160),
  }),
  z.object({
    type: z.literal("completeTask"),
    id: z.string().min(1),
  }),
  z.object({
    type: z.literal("clockIn"),
    name: z.string().trim().min(1).max(80),
    station: z.string().trim().max(40).optional(),
  }),
  z.object({
    type: z.literal("clockOut"),
    id: z.string().min(1),
  }),
  z.object({
    type: z.literal("addLog"),
    body: z.string().trim().min(1).max(500),
  }),
]);

export type OperationsAction = z.infer<typeof operationsActionSchema>;
