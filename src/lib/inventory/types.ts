export const INVENTORY_CATEGORIES = [
  "MEAT",
  "SEAFOOD",
  "PRODUCE",
  "DAIRY",
  "DRY_GOODS",
  "ALCOHOL",
  "BEVERAGES",
  "PAPER_GOODS",
  "CLEANING",
  "OTHER",
] as const;

export type InventoryCategory = (typeof INVENTORY_CATEGORIES)[number];

export const INVENTORY_CATEGORY_LABELS: Record<InventoryCategory, string> = {
  MEAT: "Meat",
  SEAFOOD: "Seafood",
  PRODUCE: "Produce",
  DAIRY: "Dairy",
  DRY_GOODS: "Dry Goods",
  ALCOHOL: "Alcohol",
  BEVERAGES: "Beverages",
  PAPER_GOODS: "Paper Goods",
  CLEANING: "Cleaning",
  OTHER: "Other",
};

export type InventoryFlags = {
  lowStock: boolean;
  outOfStock: boolean;
  belowPar: boolean;
  value: number;
};

export type InventoryItemRecord = {
  id: string;
  restaurantId: string;
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
  updatedAt: string;
} & InventoryFlags;

export type InventoryAdjustmentRecord = {
  id: string;
  restaurantId: string;
  inventoryItemId: string;
  name: string;
  sku: string | null;
  type: string;
  quantityBefore: number;
  quantityAfter: number;
  quantityDelta: number;
  reason: string | null;
  createdBy: { id: string; name: string };
  createdAt: string;
};

export type InventorySnapshot = {
  updatedAt: string;
  restaurantId: string;
  restaurantName: string;
  timezone: string;
  canWrite: boolean;
  totals: {
    inventoryValue: number;
    lowStock: number;
    outOfStock: number;
    belowPar: number;
    activeItems: number;
  };
  items: InventoryItemRecord[];
  history: InventoryAdjustmentRecord[];
};
