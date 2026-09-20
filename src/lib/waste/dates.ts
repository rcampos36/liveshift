import { businessDateFor } from "@/lib/operations/scope";
import type { ServiceShift } from "@/lib/waste/types";

export function addUtcDays(date: Date, days: number) {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

export function monthStart(date: Date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
}

export function dateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

export function inferShift(timezone: string, at = new Date()): ServiceShift {
  const hour = Number(
    new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      hour: "numeric",
      hour12: false,
    }).format(at),
  );

  if (hour < 11) return "BREAKFAST";
  if (hour < 16) return "LUNCH";
  if (hour < 22) return "DINNER";
  return "LATE";
}

export function wasteWindows(timezone: string) {
  const today = businessDateFor(timezone);
  return {
    today,
    weekStart: addUtcDays(today, -6),
    monthStart: monthStart(today),
    trendStart: addUtcDays(today, -13),
  };
}
