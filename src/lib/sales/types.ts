export type SalesDay = {
  restaurantId: string;
  businessDate: string;
  grossSales: number;
  netSales: number;
  foodSales: number;
  alcoholSales: number;
  otherSales: number;
  discounts: number;
  comps: number;
  voids: number;
  tax: number;
  covers: number;
  orderCount: number;
  laborCost: number;
  dailyGoal: number;
};

export type SalesMetrics = {
  averageCheck: number;
  salesPerCover: number;
  salesVsGoal: number;
  goalPercent: number;
  foodPercent: number;
  alcoholPercent: number;
  compsPercent: number;
  voidsPercent: number;
};

export type SalesPeriodReport = {
  label: string;
  start: string;
  end: string;
  goal: number;
  totals: SalesDay;
  metrics: SalesMetrics;
  days: Array<SalesDay & { metrics: SalesMetrics }>;
};

export type SalesSnapshot = {
  updatedAt: string;
  restaurantId: string;
  restaurantName: string;
  timezone: string;
  canWrite: boolean;
  selectedDate: string;
  goals: {
    daily: number;
    weekly: number;
    monthly: number;
  };
  daily: SalesPeriodReport;
  weekly: SalesPeriodReport;
  monthly: SalesPeriodReport;
};
