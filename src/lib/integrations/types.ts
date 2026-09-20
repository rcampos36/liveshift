export const POS_PROVIDERS = ["TOAST", "SQUARE", "CLOVER", "MANUAL"] as const;
export type PosProviderId = (typeof POS_PROVIDERS)[number];

export const INTEGRATION_RESOURCES = ["SALES", "ORDERS", "EMPLOYEES", "MENU_ITEMS", "PAYMENTS"] as const;
export type IntegrationResource = (typeof INTEGRATION_RESOURCES)[number];

export const CONNECTION_STATUSES = ["DISABLED", "READY", "ERROR"] as const;
export type ConnectionStatus = (typeof CONNECTION_STATUSES)[number];

export const SYNC_INTERVALS = [15, 30, 60, 240] as const;
export type SyncIntervalMinutes = (typeof SYNC_INTERVALS)[number];

export const POS_PROVIDER_LABELS: Record<PosProviderId, string> = {
  TOAST: "Toast",
  SQUARE: "Square",
  CLOVER: "Clover",
  MANUAL: "Manual",
};

export type CredentialFieldHint = {
  key: string;
  label: string;
  secret?: boolean;
  multiline?: boolean;
};

export const PROVIDER_CREDENTIAL_FIELDS: Record<PosProviderId, CredentialFieldHint[]> = {
  TOAST: [
    { key: "clientId", label: "Client ID" },
    { key: "clientSecret", label: "Client secret", secret: true },
    { key: "restaurantGuid", label: "Restaurant GUID" },
  ],
  SQUARE: [
    { key: "accessToken", label: "Access token", secret: true },
    { key: "locationId", label: "Square location ID" },
  ],
  CLOVER: [
    { key: "merchantId", label: "Merchant ID" },
    { key: "apiToken", label: "API token", secret: true },
  ],
  MANUAL: [{ key: "dataset", label: "POS export JSON", secret: true, multiline: true }],
};

export type ProviderQuery = {
  start: Date;
  end: Date;
};

export type ProviderSettings = {
  sourceUrl: string | null;
  useSampleData: boolean;
};

export type ProviderContext = {
  companyId: string;
  locationId: string;
  externalLocationId: string | null;
  credentials: Record<string, string>;
  settings: ProviderSettings;
  query: ProviderQuery;
};

export type IntegrationSyncStatusView = "DISABLED" | "READY" | "SYNCING" | "ERROR";

export type IntegrationConnectionView = {
  id: string;
  restaurantId: string;
  provider: PosProviderId;
  providerLabel: string;
  status: ConnectionStatus;
  syncStatus: IntegrationSyncStatusView;
  implemented: boolean;
  externalLocationId: string | null;
  hasCredentials: boolean;
  credentialFields: string[];
  sourceUrl: string | null;
  useSampleData: boolean;
  scheduledEnabled: boolean;
  syncIntervalMinutes: number;
  nextSyncAt: string | null;
  lastSyncedAt: string | null;
  lastSuccessfulSyncAt: string | null;
  lastError: string | null;
  createdAt: string;
  updatedAt: string;
};

export type IntegrationSyncLogView = {
  id: string;
  connectionId: string;
  provider: PosProviderId;
  resource: IntegrationResource;
  trigger: "MANUAL" | "SCHEDULED";
  status: "STARTED" | "SUCCESS" | "FAILED";
  startedAt: string;
  finishedAt: string | null;
  recordsFetched: number;
  recordsImported: number;
  errorCode: string | null;
  errorMessage: string | null;
};

export type IntegrationSnapshot = {
  updatedAt: string;
  restaurantId: string;
  restaurantName: string;
  timezone: string;
  canWrite: boolean;
  providers: Array<{
    id: PosProviderId;
    label: string;
    implemented: boolean;
    credentialFields: CredentialFieldHint[];
  }>;
  connections: IntegrationConnectionView[];
  logs: IntegrationSyncLogView[];
};
