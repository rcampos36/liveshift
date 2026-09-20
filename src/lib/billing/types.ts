export const SUBSCRIPTION_STATUSES = ["TRIAL", "ACTIVE", "PAST_DUE", "CANCELLED"] as const;
export type SubscriptionStatus = (typeof SUBSCRIPTION_STATUSES)[number];

export const BILLING_INTERVALS = ["MONTHLY", "ANNUAL"] as const;
export type BillingInterval = (typeof BILLING_INTERVALS)[number];

export const SUBSCRIPTION_STATUS_LABELS: Record<SubscriptionStatus, string> = {
  TRIAL: "Trial",
  ACTIVE: "Active",
  PAST_DUE: "Past due",
  CANCELLED: "Cancelled",
};

export type BillingPriceOption = {
  id: string;
  planId: string;
  planCode: string;
  planName: string;
  planDescription: string | null;
  planFeatures: string[];
  interval: BillingInterval;
  currency: string;
  amountPerLocation: number;
};

export type BillingSubscriptionView = {
  id: string;
  status: SubscriptionStatus;
  statusLabel: string;
  planCode: string;
  planName: string;
  priceId: string;
  interval: BillingInterval;
  currency: string;
  amountPerLocation: number;
  locationQuantity: number;
  locationCount: number;
  recurringTotal: number;
  trialEndsAt: string | null;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
  cancelledAt: string | null;
  pastDueAt: string | null;
};

export type BillingChangeView = {
  id: string;
  type: string;
  oldValue: unknown;
  newValue: unknown;
  createdAt: string;
  createdBy: string | null;
};

export type BillingAdminView = {
  id: string;
  name: string;
  email: string;
};

export type BillingInvoiceView = {
  id: string;
  number: string;
  total: number;
  currency: string;
  locationQuantity: number;
  planName: string;
  interval: BillingInterval;
  periodStart: string;
  periodEnd: string;
  sentTo: string[];
  createdAt: string;
  createdBy: string | null;
};

export type PublicPlanPrice = {
  interval: BillingInterval;
  currency: string;
  amountPerLocation: number;
};

export type PublicPricingPlan = {
  code: string;
  name: string;
  description: string;
  features: string[];
  prices: PublicPlanPrice[];
};

export type BillingSnapshot = {
  updatedAt: string;
  companyId: string;
  companyName: string;
  canManage: boolean;
  subscription: BillingSubscriptionView | null;
  prices: BillingPriceOption[];
  changes: BillingChangeView[];
  invoices: BillingInvoiceView[];
  billingAdmins: BillingAdminView[];
};
