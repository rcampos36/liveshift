import { z } from "zod";

export const TIMEZONES = [
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "America/Phoenix",
  "America/Anchorage",
  "Pacific/Honolulu",
] as const;

export const createRestaurantSchema = z.object({
  name: z.string().trim().min(2, "Restaurant name is required").max(120),
  timezone: z.enum(TIMEZONES),
  addressLine1: z.string().trim().max(160).optional(),
  city: z.string().trim().max(80).optional(),
  state: z.string().trim().max(40).optional(),
});

export const updateCompanySchema = z.object({
  name: z.string().trim().min(2, "Company name is required").max(120),
});

export const updateRestaurantSchema = z.object({
  name: z.string().trim().min(2, "Restaurant name is required").max(120),
});

export const inviteUserSchema = z.object({
  firstName: z.string().trim().min(1, "First name is required").max(80),
  lastName: z.string().trim().min(1, "Last name is required").max(80),
  email: z
    .string()
    .trim()
    .email("Enter a valid email")
    .transform((value) => value.toLowerCase()),
  role: z.enum([
    "COMPANY_ADMIN",
    "BILLING_ADMIN",
    "GENERAL_MANAGER",
    "MANAGER",
    "KITCHEN_MANAGER",
    "EMPLOYEE",
    "VIEW_ONLY",
  ]),
  locationId: z.string().optional(),
});
