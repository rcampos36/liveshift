import "server-only";

import { getAppUrl } from "@/lib/env";
import { sendEmail } from "@/lib/email/resend";

export async function sendInviteEmail(options: {
  to: string;
  companyName: string;
  temporaryPassword: string;
}) {
  await sendEmail({
    to: options.to,
    subject: `You have been added to ${options.companyName} on LiveShift`,
    html: `
      <p>You have been invited to ${options.companyName} on LiveShift.</p>
      <p>Sign in at <a href="${getAppUrl()}/login">${getAppUrl()}/login</a></p>
      <p>Temporary password: <strong>${options.temporaryPassword}</strong></p>
      <p>Change this password after your first shift.</p>
    `,
  });
}
