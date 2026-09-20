import { businessDateFor } from "@/lib/operations/scope";
import { addUtcDays, dateKey, monthStart } from "@/lib/waste/dates";

export { addUtcDays, dateKey, monthStart };

export function weekStart(date: Date) {
  const weekday = date.getUTCDay();
  const offset = weekday === 0 ? 6 : weekday - 1;
  return addUtcDays(date, -offset);
}

export function salesWindows(timezone: string, selected = businessDateFor(timezone)) {
  const today = businessDateFor(timezone);
  const day = selected;
  return {
    today,
    selected: day,
    weekStart: weekStart(day),
    weekEnd: addUtcDays(weekStart(day), 6),
    monthStart: monthStart(day),
    monthEnd: new Date(Date.UTC(day.getUTCFullYear(), day.getUTCMonth() + 1, 0)),
  };
}

export function parseBusinessDate(value: string | null | undefined, fallback: Date) {
  if (!value) return fallback;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return fallback;
  return new Date(`${match[1]}-${match[2]}-${match[3]}T00:00:00.000Z`);
}
