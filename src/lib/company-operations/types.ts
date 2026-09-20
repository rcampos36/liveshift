export type HouseAttentionReason =
  | "BEHIND_GOAL"
  | "HIGH_LABOR"
  | "HIGH_WASTE"
  | "MANY_EIGHTY_SIX";

export const HOUSE_ATTENTION_LABELS: Record<HouseAttentionReason, string> = {
  BEHIND_GOAL: "Behind goal",
  HIGH_LABOR: "High labor",
  HIGH_WASTE: "High waste",
  MANY_EIGHTY_SIX: "86 pressure",
};

export type HouseOperationsCard = {
  restaurantId: string;
  restaurantName: string;
  timezone: string;
  sales: number;
  salesGoal: number;
  goalPercent: number;
  laborPercent: number;
  wasteCost: number;
  eightySixCount: number;
  needsAttention: boolean;
  attention: HouseAttentionReason[];
  revision: number;
};

export type CompanyOperationsSnapshot = {
  updatedAt: string;
  companyId: string;
  companyName: string;
  totals: {
    sales: number;
    wasteCost: number;
    eightySixCount: number;
    housesNeedingAttention: number;
  };
  houses: HouseOperationsCard[];
};
