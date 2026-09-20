"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

const ROLES = [
  { value: "COMPANY_ADMIN", label: "Company admin" },
  { value: "BILLING_ADMIN", label: "Billing admin" },
  { value: "GENERAL_MANAGER", label: "General manager" },
  { value: "MANAGER", label: "Manager" },
  { value: "KITCHEN_MANAGER", label: "Kitchen manager" },
  { value: "EMPLOYEE", label: "Employee" },
  { value: "VIEW_ONLY", label: "View only" },
] as const;

function isCompanyWideRole(role: string) {
  return role === "COMPANY_ADMIN" || role === "BILLING_ADMIN";
}

type RestaurantOption = { id: string; name: string };

export function InviteForm({
  companyId,
  restaurants,
}: {
  companyId: string;
  restaurants: RestaurantOption[];
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [role, setRole] = useState<string>("MANAGER");

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setMessage(null);
    setPending(true);

    const payload = Object.fromEntries(new FormData(event.currentTarget).entries());

    try {
      const response = await fetch(`/api/companies/${companyId}/users`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await response.json()) as {
        error?: string;
        temporaryPassword?: string;
        existingUser?: boolean;
      };

      if (!response.ok) {
        setError(data.error ?? "Unable to add teammate");
        return;
      }

      if (data.temporaryPassword) {
        setMessage(`Teammate added. Temporary password: ${data.temporaryPassword}`);
      } else {
        setMessage("Access added to their existing LiveShift account.");
      }

      event.currentTarget.reset();
      router.refresh();
    } catch {
      setError("Unable to add teammate");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-3xl border border-stone-200 bg-white p-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field name="firstName" label="First name" />
        <Field name="lastName" label="Last name" />
      </div>
      <Field name="email" label="Email" type="email" />
      <label className="block space-y-1.5">
        <span className="text-sm font-medium text-stone-800">Role</span>
        <select
          name="role"
          value={role}
          onChange={(event) => setRole(event.target.value)}
          className="w-full rounded-xl border border-stone-300 bg-white px-3 py-2.5 text-stone-900"
        >
          {ROLES.map((item) => (
            <option key={item.value} value={item.value}>
              {item.label}
            </option>
          ))}
        </select>
      </label>
      {!isCompanyWideRole(role) ? (
        <label className="block space-y-1.5">
          <span className="text-sm font-medium text-stone-800">Restaurant</span>
          <select
            name="locationId"
            required
            className="w-full rounded-xl border border-stone-300 bg-white px-3 py-2.5 text-stone-900"
          >
            <option value="">Select a restaurant</option>
            {restaurants.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
        </label>
      ) : null}
      {error ? <p className="text-sm text-red-700">{error}</p> : null}
      {message ? <p className="text-sm text-emerald-800">{message}</p> : null}
      <button
        type="submit"
        disabled={pending}
        className="rounded-full bg-[#1c1410] px-5 py-2.5 text-sm font-semibold text-[#fff6ea] disabled:opacity-70"
      >
        {pending ? "Adding..." : "Add teammate"}
      </button>
    </form>
  );
}

function Field({
  name,
  label,
  type = "text",
}: {
  name: string;
  label: string;
  type?: string;
}) {
  return (
    <label className="block space-y-1.5">
      <span className="text-sm font-medium text-stone-800">{label}</span>
      <input
        name={name}
        type={type}
        required
        className="w-full rounded-xl border border-stone-300 bg-white px-3 py-2.5 text-stone-900 outline-none focus:border-orange-800 focus:ring-2 focus:ring-orange-800/15"
      />
    </label>
  );
}
