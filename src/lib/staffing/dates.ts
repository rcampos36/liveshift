import { businessDateFor } from "@/lib/operations/scope";
import { dateKey, parseBusinessDate } from "@/lib/sales/dates";

export { businessDateFor, dateKey, parseBusinessDate };

export function clockTime(value: Date, timeZone: string) {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(value);
}

function zoneOffsetMs(instant: Date, timeZone: string) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", {
      timeZone,
      hour12: false,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    })
      .formatToParts(instant)
      .map((part) => [part.type, part.value]),
  );
  const asUtc = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    Number(parts.hour),
    Number(parts.minute),
    Number(parts.second),
  );
  return asUtc - instant.getTime();
}

export function zonedDateTime(dateKeyValue: string, time: string, timeZone: string) {
  const match = /^(\d{2}):(\d{2})$/.exec(time);
  const hours = match ? Number(match[1]) : 0;
  const minutes = match ? Number(match[2]) : 0;
  const [year, month, day] = dateKeyValue.split("-").map(Number);
  const wallAsUtc = Date.UTC(year, month - 1, day, hours, minutes, 0);
  return new Date(wallAsUtc - zoneOffsetMs(new Date(wallAsUtc), timeZone));
}

export function hoursBetween(start: Date, end: Date) {
  return Math.max(0, (end.getTime() - start.getTime()) / 3_600_000);
}
