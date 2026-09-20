import { z } from "zod";

export const registerSchema = z.object({
  firstName: z.string().trim().min(1, "First name is required").max(80),
  lastName: z.string().trim().min(1, "Last name is required").max(80),
  email: z.string().trim().email("Enter a valid email").transform((value) => value.toLowerCase()),
  password: z.string().min(8, "Password must be at least 8 characters").max(128),
  companyName: z.string().trim().min(2, "Company name is required").max(120),
  planCode: z.string().trim().min(1, "Choose a plan").max(80).optional(),
  interval: z.enum(["MONTHLY", "ANNUAL"]).optional(),
  locationQuantity: z.coerce.number().int().min(1).max(500).optional(),
});

export const loginSchema = z.object({
  email: z.string().trim().email("Enter a valid email").transform((value) => value.toLowerCase()),
  password: z.string().min(1, "Password is required"),
});

export const forgotPasswordSchema = z.object({
  email: z.string().trim().email("Enter a valid email").transform((value) => value.toLowerCase()),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1),
  password: z.string().min(8, "Password must be at least 8 characters").max(128),
});

export const verifyEmailSchema = z.object({
  token: z.string().min(1),
});
