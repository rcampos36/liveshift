import { parseBusinessDate } from "@/lib/staffing/dates";
import { STAFF_POSITIONS, type StaffPosition } from "@/lib/staffing/types";

export type LaborCsvRow = {
  businessDate: Date;
  employee: string | null;
  position: StaffPosition | null;
  hours: number | null;
  hourlyRate: number | null;
  laborCost: number;
};

function csvCell(value: string | number | boolean | null) {
  const text = value == null ? "" : String(value);
  if (/[",\n]/.test(text)) {
    return `"${text.replaceAll("\"", "\"\"")}"`;
  }
  return text;
}

function splitCsvLine(line: string) {
  const cells: string[] = [];
  let current = "";
  let quoted = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    if (char === "\"") {
      if (quoted && line[index + 1] === "\"") {
        current += "\"";
        index += 1;
      } else {
        quoted = !quoted;
      }
      continue;
    }
    if (char === "," && !quoted) {
      cells.push(current.trim());
      current = "";
      continue;
    }
    current += char;
  }

  cells.push(current.trim());
  return cells;
}

export function parseStaffPosition(value: string | null | undefined): StaffPosition | null {
  const normalized = (value ?? "").trim().toUpperCase().replaceAll(" ", "_");
  if ((STAFF_POSITIONS as readonly string[]).includes(normalized)) {
    return normalized as StaffPosition;
  }
  return null;
}

export function toLaborCsv(rows: Array<{ businessDate: string; laborCost: number; laborHours: number; netSales: number; laborPercent: number }>) {
  const header = ["businessDate", "laborCost", "laborHours", "netSales", "laborPercent"];
  const lines = [
    header.join(","),
    ...rows.map((row) =>
      [row.businessDate, row.laborCost, row.laborHours.toFixed(2), row.netSales, row.laborPercent.toFixed(1)]
        .map((value) => csvCell(value))
        .join(","),
    ),
  ];
  return `${lines.join("\n")}\n`;
}

export function parseLaborCsv(csv: string): LaborCsvRow[] {
  const lines = csv
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length < 2) {
    return [];
  }

  const header = splitCsvLine(lines[0]).map((cell) => cell.replaceAll(" ", "").toLowerCase());
  const index = (name: string) => header.indexOf(name);

  return lines.slice(1).flatMap((line) => {
    const cells = splitCsvLine(line);
    const read = (name: string) => {
      const at = index(name);
      return at >= 0 ? cells[at] ?? "" : "";
    };

    const dateRaw = read("businessdate") || read("date");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateRaw)) {
      return [];
    }

    const hours = Number(read("hours") || read("laborhours") || "");
    const hourlyRate = Number(read("hourlyrate") || read("rate") || "");
    const enteredCost = Number(read("laborcost") || read("cost") || "");
    const computed = Number.isFinite(hours) && Number.isFinite(hourlyRate) ? hours * hourlyRate : 0;
    const laborCost = Number.isFinite(enteredCost) && enteredCost > 0 ? enteredCost : computed;

    return [
      {
        businessDate: parseBusinessDate(dateRaw, new Date()),
        employee: read("employee") || read("name") || null,
        position: parseStaffPosition(read("position")),
        hours: Number.isFinite(hours) ? hours : null,
        hourlyRate: Number.isFinite(hourlyRate) ? hourlyRate : null,
        laborCost: Number.isFinite(laborCost) ? Math.max(0, laborCost) : 0,
      },
    ];
  });
}
