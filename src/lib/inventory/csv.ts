import {
  INVENTORY_CATEGORIES,
  INVENTORY_CATEGORY_LABELS,
  type InventoryCategory,
  type InventoryItemRecord,
} from "@/lib/inventory/types";

const HEADERS = [
  "name",
  "category",
  "sku",
  "unit",
  "quantityOnHand",
  "parLevel",
  "reorderLevel",
  "unitCost",
  "supplier",
  "active",
] as const;

export type InventoryCsvRow = {
  name: string;
  category: InventoryCategory;
  sku: string | null;
  unit: string;
  quantityOnHand: number;
  parLevel: number;
  reorderLevel: number;
  unitCost: number;
  supplier: string | null;
  active: boolean;
};

function csvCell(value: string | number | boolean | null) {
  const text = value == null ? "" : String(value);
  if (/[",\n]/.test(text)) {
    return `"${text.replaceAll("\"", "\"\"")}"`;
  }
  return text;
}

export function toInventoryCsv(items: InventoryItemRecord[]) {
  const lines = [
    HEADERS.join(","),
    ...items.map((item) =>
      [
        item.name,
        INVENTORY_CATEGORY_LABELS[item.category],
        item.sku,
        item.unit,
        item.quantityOnHand,
        item.parLevel,
        item.reorderLevel,
        item.unitCost,
        item.supplier,
        item.active,
      ]
        .map((value) => csvCell(value))
        .join(","),
    ),
  ];
  return `${lines.join("\n")}\n`;
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

export function parseInventoryCategory(value: string | null | undefined): InventoryCategory {
  const normalized = (value ?? "").trim().toUpperCase().replaceAll(" ", "_");
  if ((INVENTORY_CATEGORIES as readonly string[]).includes(normalized)) {
    return normalized as InventoryCategory;
  }

  const fromLabel = INVENTORY_CATEGORIES.find(
    (category) => INVENTORY_CATEGORY_LABELS[category].toLowerCase() === (value ?? "").trim().toLowerCase(),
  );
  return fromLabel ?? "OTHER";
}

export function parseInventoryCsv(csv: string): InventoryCsvRow[] {
  const lines = csv
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length < 2) {
    return [];
  }

  const header = splitCsvLine(lines[0]).map((cell) => cell.replaceAll(" ", "").toLowerCase());
  const index = (name: string) => header.indexOf(name.toLowerCase());

  return lines.slice(1).map((line) => {
    const cells = splitCsvLine(line);
    const read = (name: string) => {
      const at = index(name);
      return at >= 0 ? cells[at] ?? "" : "";
    };

    const quantity = Number(read("quantityonhand") || read("quantity") || 0);
    const par = Number(read("parlevel") || 0);
    const reorder = Number(read("reorderlevel") || read("reorderpoint") || 0);
    const cost = Number(read("unitcost") || 0);
    const activeRaw = read("active").toLowerCase();

    return {
      name: read("name"),
      category: parseInventoryCategory(read("category")),
      sku: read("sku") || null,
      unit: read("unit") || "ea",
      quantityOnHand: Number.isFinite(quantity) ? Math.max(0, quantity) : 0,
      parLevel: Number.isFinite(par) ? Math.max(0, par) : 0,
      reorderLevel: Number.isFinite(reorder) ? Math.max(0, reorder) : 0,
      unitCost: Number.isFinite(cost) ? Math.max(0, cost) : 0,
      supplier: read("supplier") || null,
      active: !(activeRaw === "false" || activeRaw === "0" || activeRaw === "inactive"),
    };
  }).filter((row) => row.name);
}
