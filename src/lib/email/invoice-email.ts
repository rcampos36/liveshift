import "server-only";

import { sendEmail } from "@/lib/email/resend";
import { getAppUrl } from "@/lib/env";
import type { BillingInterval } from "@/lib/billing/types";

function money(amount: number, currency: string) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency, maximumFractionDigits: 2 }).format(amount);
}

function formatDate(value: Date) {
  return new Intl.DateTimeFormat("en-US", { dateStyle: "medium" }).format(value);
}

export async function sendInvoiceEmail(options: {
  to: string;
  companyName: string;
  invoiceNumber: string;
  planName: string;
  interval: BillingInterval;
  currency: string;
  amountPerLocation: number;
  locationQuantity: number;
  total: number;
  periodStart: Date;
  periodEnd: Date;
}) {
  const billingUrl = `${getAppUrl()}/login`;
  await sendEmail({
    to: options.to,
    subject: `Invoice ${options.invoiceNumber} for ${options.companyName}`,
    html: `
      <p>Invoice <strong>${options.invoiceNumber}</strong> for ${options.companyName}.</p>
      <p>This company is billed for restaurant locations on LiveShift.</p>
      <table>
        <tr><td>Plan</td><td>${options.planName} · ${options.interval.toLowerCase()}</td></tr>
        <tr><td>Period</td><td>${formatDate(options.periodStart)} – ${formatDate(options.periodEnd)}</td></tr>
        <tr><td>Per location</td><td>${money(options.amountPerLocation, options.currency)}</td></tr>
        <tr><td>Restaurants billed</td><td>${options.locationQuantity}</td></tr>
        <tr><td>Amount due</td><td><strong>${money(options.total, options.currency)}</strong></td></tr>
      </table>
      <p>Sign in at <a href="${billingUrl}">${billingUrl}</a> to review company billing.</p>
    `,
  });
}
