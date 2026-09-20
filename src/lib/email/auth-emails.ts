import "server-only";

import { getAppUrl } from "@/lib/env";
import { sendEmail } from "@/lib/email/resend";

export async function sendVerificationEmail(to: string, token: string) {
  const verifyUrl = `${getAppUrl()}/verify-email?token=${token}`;

  await sendEmail({
    to,
    subject: "Verify your LiveShift email",
    html: `
      <p>Welcome to LiveShift.</p>
      <p>Confirm your email address to finish setting up your account.</p>
      <p><a href="${verifyUrl}">Verify email</a></p>
      <p>This link expires in 24 hours.</p>
    `,
  });
}

export async function sendPasswordResetEmail(to: string, token: string) {
  const resetUrl = `${getAppUrl()}/reset-password?token=${token}`;

  await sendEmail({
    to,
    subject: "Reset your LiveShift password",
    html: `
      <p>We received a request to reset your LiveShift password.</p>
      <p><a href="${resetUrl}">Reset password</a></p>
      <p>This link expires in 1 hour. If you did not request this, you can ignore this email.</p>
    `,
  });
}
