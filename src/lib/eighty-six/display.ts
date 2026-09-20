import type { MenuAvailability } from "@/lib/eighty-six/types";

export function statusLabel(status: MenuAvailability) {
  if (status === "EIGHTY_SIXED") return "86";
  if (status === "LOW_STOCK") return "Low stock";
  return "Available";
}

export function formatTime(timezone: string, iso: string | null) {
  if (!iso) return null;
  return new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(iso));
}

export function toDateTimeLocal(iso: string | null) {
  if (!iso) return "";
  const date = new Date(iso);
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}
