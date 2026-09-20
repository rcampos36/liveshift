import "server-only";

import { Resend } from "resend";
import { getEmailFrom, getResendApiKey } from "@/lib/env";

let resend: Resend | null = null;

function getClient() {
  const apiKey = getResendApiKey();
  if (!apiKey) {
    return null;
  }

  resend ??= new Resend(apiKey);
  return resend;
}

export async function sendEmail(options: { to: string; subject: string; html: string }) {
  const client = getClient();

  if (!client) {
    console.info("[email:dev]", {
      to: options.to,
      subject: options.subject,
      html: options.html,
    });
    return;
  }

  const { error } = await client.emails.send({
    from: getEmailFrom(),
    to: options.to,
    subject: options.subject,
    html: options.html,
  });

  if (error) {
    throw new Error(error.message);
  }
}
