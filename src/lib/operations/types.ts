export type LiveBoardData = {
  updatedAt: string;
  revision: number;
  businessDate: string;
  cards: {
    todaysSales: number;
    salesGoal: number;
    goalPercent: number;
    covers: number;
    averageCheck: number;
    laborPercent: number;
    workingEmployees: number;
    eightySixCount: number;
    lowStockCount: number;
    wasteToday: number;
    openIssues: number;
    openTasks: number;
  };
  daily: {
    salesAmount: number;
    salesGoal: number;
    covers: number;
    laborCost: number;
  };
  eightySix: Array<{
    id: string;
    menuItemId: string;
    name: string;
    remainingQuantity: number | null;
    reason: string | null;
    estimatedAvailableAt: string | null;
    createdAt: string;
  }>;
  menuLowStock: Array<{
    id: string;
    menuItemId: string;
    name: string;
    remainingQuantity: number | null;
    reason: string | null;
    estimatedAvailableAt: string | null;
    createdAt: string;
  }>;
  lowStock: Array<{
    id: string;
    name: string;
    quantity: number;
    reorderPoint: number;
    parLevel: number;
    unit: string;
  }>;
  waste: Array<{
    id: string;
    itemName: string;
    quantity: number;
    unit: string;
    totalCost: number;
    reason: string;
    createdAt: string;
  }>;
  issues: Array<{ id: string; title: string; createdAt: string }>;
  tasks: Array<{ id: string; title: string; createdAt: string }>;
  staff: Array<{ id: string; name: string; station: string | null; clockedInAt: string }>;
  logs: Array<{ id: string; body: string; createdAt: string; category?: string }>;
};

export type LiveBoardResponse = LiveBoardData & {
  restaurantName: string;
  timezone: string;
  canWrite: boolean;
};
