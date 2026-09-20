export const MENU_STATUSES = ["AVAILABLE", "LOW_STOCK", "EIGHTY_SIXED"] as const;

export type MenuAvailability = (typeof MENU_STATUSES)[number];

export type Actor = {
  id: string;
  name: string;
};

export type MenuItemRecord = {
  id: string;
  restaurantId: string;
  menuItemId: string;
  name: string;
  category: string | null;
  status: MenuAvailability;
  remainingQuantity: number | null;
  reason: string | null;
  estimatedAvailableAt: string | null;
  statusId: string | null;
  createdBy: Actor | null;
  createdAt: string | null;
};

export type MenuItemHistoryRecord = {
  id: string;
  restaurantId: string;
  menuItemId: string;
  name: string;
  category: string | null;
  status: MenuAvailability;
  remainingQuantity: number | null;
  reason: string | null;
  estimatedAvailableAt: string | null;
  createdBy: Actor;
  createdAt: string;
  resolvedBy: Actor | null;
  resolvedAt: string | null;
};

export type EightySixSnapshot = {
  updatedAt: string;
  restaurantId: string;
  restaurantName: string;
  timezone: string;
  canWrite: boolean;
  items: MenuItemRecord[];
  board: {
    eightySixed: MenuItemRecord[];
    lowStock: MenuItemRecord[];
  };
  history: MenuItemHistoryRecord[];
};
