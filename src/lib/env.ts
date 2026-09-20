import "server-only";

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export function getDatabaseUrl() {
  return required("DATABASE_URL");
}

export function getAuthSecret() {
  return required("AUTH_SECRET");
}

export function getIntegrationSecret() {
  return process.env.INTEGRATION_SECRET || getAuthSecret();
}

export function getAppUrl() {
  return process.env.APP_URL ?? "http://localhost:3000";
}

export function getResendApiKey() {
  return process.env.RESEND_API_KEY;
}

export function getEmailFrom() {
  return process.env.EMAIL_FROM ?? "LiveShift <noreply@localhost>";
}

export function getCronSecret() {
  return process.env.CRON_SECRET ?? "";
}

export function getBillingTrialDays() {
  const parsed = Number(process.env.BILLING_TRIAL_DAYS);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 14;
}

export function getBillingCurrency() {
  return process.env.BILLING_CURRENCY?.trim().toUpperCase() || "USD";
}
