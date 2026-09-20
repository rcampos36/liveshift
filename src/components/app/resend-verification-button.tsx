"use client";

import { useState } from "react";

export function ResendVerificationButton() {
  const [message, setMessage] = useState<string | null>(null);

  async function resend() {
    const response = await fetch("/api/auth/resend-verification", { method: "POST" });
    const data = (await response.json()) as { message?: string; error?: string };
    setMessage(data.message ?? data.error ?? "Unable to send email.");
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <button
        type="button"
        onClick={resend}
        className="text-sm font-semibold text-orange-900 underline-offset-2 hover:underline"
      >
        Resend verification email
      </button>
      {message ? <span className="text-sm text-stone-600">{message}</span> : null}
    </div>
  );
}
