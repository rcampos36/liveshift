"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { TIMEZONES } from "@/lib/tenancy/schemas";

export function RestaurantForm({ companyId }: { companyId: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setPending(true);

    const payload = Object.fromEntries(new FormData(event.currentTarget).entries());

    try {
      const response = await fetch(`/api/companies/${companyId}/restaurants`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await response.json()) as { error?: string; restaurant?: { id: string } };

      if (!response.ok || !data.restaurant) {
        setError(data.error ?? "Unable to add restaurant");
        return;
      }

      router.push(`/dashboard/c/${companyId}/r/${data.restaurant.id}`);
      router.refresh();
    } catch {
      setError("Unable to add restaurant");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-3xl border border-stone-200 bg-white p-6">
      <Field name="name" label="Restaurant name" placeholder="Harbor Oyster Bar" />
      <label className="block space-y-1.5">
        <span className="text-sm font-medium text-stone-800">Timezone</span>
        <select
          name="timezone"
          defaultValue="America/New_York"
          className="w-full rounded-xl border border-stone-300 bg-white px-3 py-2.5 text-stone-900"
        >
          {TIMEZONES.map((zone) => (
            <option key={zone} value={zone}>
              {zone}
            </option>
          ))}
        </select>
      </label>
      <Field name="addressLine1" label="Street address" />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field name="city" label="City" />
        <Field name="state" label="State" />
      </div>
      {error ? <p className="text-sm text-red-700">{error}</p> : null}
      <button
        type="submit"
        disabled={pending}
        className="rounded-full bg-[#1c1410] px-5 py-2.5 text-sm font-semibold text-[#fff6ea] disabled:opacity-70"
      >
        {pending ? "Saving..." : "Open this house"}
      </button>
    </form>
  );
}

function Field({
  name,
  label,
  placeholder,
}: {
  name: string;
  label: string;
  placeholder?: string;
}) {
  return (
    <label className="block space-y-1.5">
      <span className="text-sm font-medium text-stone-800">{label}</span>
      <input
        name={name}
        placeholder={placeholder}
        className="w-full rounded-xl border border-stone-300 bg-white px-3 py-2.5 text-stone-900 outline-none focus:border-orange-800 focus:ring-2 focus:ring-orange-800/15"
      />
    </label>
  );
}
