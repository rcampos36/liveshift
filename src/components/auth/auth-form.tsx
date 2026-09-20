"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

type Field = {
  name: string;
  label: string;
  type?: string;
  placeholder?: string;
  autoComplete?: string;
  defaultValue?: string;
};

type AuthFormProps = {
  action: string;
  submitLabel: string;
  successRedirect?: string;
  fields: Field[];
  footer?: { href: string; label: string };
  onSuccessMessage?: string;
};

export function AuthForm({
  action,
  submitLabel,
  successRedirect,
  fields,
  footer,
  onSuccessMessage,
}: AuthFormProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setMessage(null);
    setPending(true);

    const formData = new FormData(event.currentTarget);
    const payload = Object.fromEntries(formData.entries());

    try {
      const response = await fetch(action, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await response.json()) as { error?: string; message?: string };

      if (!response.ok) {
        setError(data.error ?? "Unable to continue");
        return;
      }

      if (successRedirect) {
        router.push(successRedirect);
        router.refresh();
        return;
      }

      setMessage(onSuccessMessage ?? data.message ?? "Done.");
      event.currentTarget.reset();
    } catch {
      setError("Unable to continue. Try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {fields.map((field) =>
        field.type === "hidden" ? (
          <input key={field.name} type="hidden" name={field.name} value={field.defaultValue} />
        ) : (
          <label key={field.name} className="block space-y-1.5">
            <span className="text-sm font-medium text-stone-800">{field.label}</span>
            <input
              name={field.name}
              type={field.type ?? "text"}
              placeholder={field.placeholder}
              autoComplete={field.autoComplete}
              defaultValue={field.defaultValue}
              required
              className="w-full rounded-xl border border-stone-300 bg-white px-3 py-2.5 text-stone-900 outline-none transition focus:border-orange-700 focus:ring-2 focus:ring-orange-700/20"
            />
          </label>
        ),
      )}

      {error ? <p className="text-sm text-red-700">{error}</p> : null}
      {message ? <p className="text-sm text-emerald-800">{message}</p> : null}

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-xl bg-orange-800 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-orange-900 disabled:cursor-not-allowed disabled:opacity-70"
      >
        {pending ? "Please wait..." : submitLabel}
      </button>

      {footer ? (
        <p className="text-center text-sm text-stone-600">
          <Link href={footer.href} className="font-medium text-orange-800 hover:underline">
            {footer.label}
          </Link>
        </p>
      ) : null}
    </form>
  );
}
