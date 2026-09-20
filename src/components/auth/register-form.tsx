"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import type { BillingInterval, PublicPricingPlan } from "@/lib/billing/types";

function formatMoney(amount: number, currency: string) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency, maximumFractionDigits: 0 }).format(amount);
}

function priceFor(plan: PublicPricingPlan, interval: BillingInterval) {
  return plan.prices.find((price) => price.interval === interval) ?? plan.prices[0];
}

export function RegisterForm({
  plans,
  trialDays,
  initialPlanCode,
  initialInterval,
}: {
  plans: PublicPricingPlan[];
  trialDays: number;
  initialPlanCode?: string;
  initialInterval?: BillingInterval;
}) {
  const router = useRouter();
  const defaultPlan = plans.find((plan) => plan.code === initialPlanCode) ?? plans[0];
  const defaultInterval =
    initialInterval && defaultPlan?.prices.some((price) => price.interval === initialInterval)
      ? initialInterval
      : defaultPlan?.prices.some((price) => price.interval === "MONTHLY")
        ? "MONTHLY"
        : (defaultPlan?.prices[0]?.interval ?? "MONTHLY");

  const [planCode, setPlanCode] = useState(defaultPlan?.code ?? "");
  const [interval, setInterval] = useState<BillingInterval>(defaultInterval);
  const [locationQuantity, setLocationQuantity] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const selected = useMemo(() => plans.find((plan) => plan.code === planCode) ?? plans[0], [planCode, plans]);
  const selectedPrice = selected ? priceFor(selected, interval) : null;
  const selectedInterval = selectedPrice?.interval ?? interval;

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setPending(true);

    const form = new FormData(event.currentTarget);
    const password = String(form.get("password") ?? "");
    const confirmPassword = String(form.get("confirmPassword") ?? "");
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      setPending(false);
      return;
    }

    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: form.get("firstName"),
          lastName: form.get("lastName"),
          email: form.get("email"),
          password,
          companyName: form.get("companyName"),
          locationQuantity,
          ...(planCode ? { planCode, interval: selectedInterval } : {}),
        }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        setError(data.error ?? "Unable to create account");
        return;
      }
      router.push("/dashboard");
      router.refresh();
    } catch {
      setError("Unable to create account. Try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      <fieldset className="space-y-4">
        <legend className="text-sm font-semibold text-stone-900">Plan</legend>
        <p className="text-sm leading-relaxed text-stone-500">
          Choose a company plan. Billing is per restaurant location. New groups start with a {trialDays}-day
          trial.
        </p>

        {plans.length > 1 || plans.some((plan) => plan.prices.length > 1) ? (
          <div className="inline-flex rounded-full border border-stone-200 bg-[#faf6ef] p-1">
            {(["MONTHLY", "ANNUAL"] as const)
              .filter((value) => plans.some((plan) => plan.prices.some((price) => price.interval === value)))
              .map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setInterval(value)}
                  className={`rounded-full px-4 py-1.5 text-[12px] font-semibold uppercase tracking-[0.14em] ${
                    selectedInterval === value
                      ? "bg-[#1c1410] text-[#fff6ea]"
                      : "text-stone-500 hover:text-stone-800"
                  }`}
                >
                  {value === "ANNUAL" ? "Annual" : "Monthly"}
                </button>
              ))}
          </div>
        ) : null}

        {plans.length === 0 ? (
          <p className="rounded-xl border border-dashed border-stone-300 bg-[#faf6ef] px-4 py-5 text-sm text-stone-500">
            Plans are not published yet. You can still create a company; billing can be assigned later.
          </p>
        ) : (
          <div className={`grid gap-3 ${plans.length > 2 ? "lg:grid-cols-3" : "md:grid-cols-2"}`}>
            {plans.map((plan, index) => {
              const active = plan.code === selected?.code;
              const price = priceFor(plan, selectedInterval);
              const popular = index === 1;
              return (
                <button
                  key={plan.code}
                  type="button"
                  onClick={() => setPlanCode(plan.code)}
                  className={`flex h-full flex-col rounded-2xl border px-4 py-4 text-left transition ${
                    active
                      ? "border-[#1c1410] bg-[#1c1410] text-[#fff6ea] shadow-[0_18px_40px_-28px_rgba(28,20,16,0.65)]"
                      : "border-stone-200 bg-[#faf6ef] text-stone-950 hover:border-stone-300"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="font-display text-2xl tracking-tight">{plan.name}</span>
                    {popular ? (
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.16em] ${
                          active ? "bg-[#fff6ea]/15 text-[#fff6ea]" : "bg-white text-[#8a6a4a]"
                        }`}
                      >
                        Popular
                      </span>
                    ) : null}
                  </div>
                  <p className={`mt-2 font-display text-3xl tabular-nums tracking-tight ${active ? "text-[#fff6ea]" : "text-stone-950"}`}>
                    {formatMoney(price.amountPerLocation, price.currency)}
                    <span className={`ml-1 text-sm font-sans font-medium ${active ? "text-[#fff6ea]/70" : "text-stone-500"}`}>
                      / location
                    </span>
                  </p>
                  <p className={`mt-2 text-sm leading-relaxed ${active ? "text-[#fff6ea]/75" : "text-stone-500"}`}>
                    {plan.description}
                  </p>
                  {plan.features.length > 0 ? (
                    <ul className={`mt-4 space-y-1.5 text-sm ${active ? "text-[#fff6ea]/85" : "text-stone-700"}`}>
                      {plan.features.map((feature) => (
                        <li key={feature} className="flex gap-2">
                          <span aria-hidden className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-current opacity-50" />
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </button>
              );
            })}
          </div>
        )}

        <label className="block space-y-1.5">
          <span className="text-sm font-medium text-stone-800">Restaurant locations to bill</span>
          <input
            type="number"
            min={1}
            max={500}
            value={locationQuantity}
            onChange={(event) => setLocationQuantity(Math.max(1, Number(event.target.value) || 1))}
            className="w-full max-w-40 rounded-xl border border-stone-300 bg-white px-3 py-2.5 text-stone-900 outline-none focus:border-[#1c1410] focus:ring-2 focus:ring-[#1c1410]/10"
          />
          <p className="text-sm text-stone-500">
            {selectedPrice
              ? `${formatMoney(selectedPrice.amountPerLocation * locationQuantity, selectedPrice.currency)} ${
                  selectedInterval === "ANNUAL" ? "per year" : "per month"
                } after the trial, for ${locationQuantity} location${locationQuantity === 1 ? "" : "s"}.`
              : "You can add restaurants during the trial up to this quantity."}
          </p>
        </label>
      </fieldset>

      <fieldset className="grid gap-4 sm:grid-cols-2">
        <legend className="mb-2 text-sm font-semibold text-stone-900">Company</legend>
        <label className="block space-y-1.5 sm:col-span-2">
          <span className="text-sm font-medium text-stone-800">Company name</span>
          <input
            name="companyName"
            required
            placeholder="Harbor Hospitality Group"
            className="w-full rounded-xl border border-stone-300 bg-white px-3 py-2.5 text-stone-900 outline-none focus:border-[#1c1410] focus:ring-2 focus:ring-[#1c1410]/10"
          />
        </label>
      </fieldset>

      <fieldset className="grid gap-4 sm:grid-cols-2">
        <legend className="mb-2 text-sm font-semibold text-stone-900">Company admin</legend>
        <label className="block space-y-1.5">
          <span className="text-sm font-medium text-stone-800">First name</span>
          <input
            name="firstName"
            required
            autoComplete="given-name"
            className="w-full rounded-xl border border-stone-300 bg-white px-3 py-2.5 text-stone-900 outline-none focus:border-[#1c1410] focus:ring-2 focus:ring-[#1c1410]/10"
          />
        </label>
        <label className="block space-y-1.5">
          <span className="text-sm font-medium text-stone-800">Last name</span>
          <input
            name="lastName"
            required
            autoComplete="family-name"
            className="w-full rounded-xl border border-stone-300 bg-white px-3 py-2.5 text-stone-900 outline-none focus:border-[#1c1410] focus:ring-2 focus:ring-[#1c1410]/10"
          />
        </label>
        <label className="block space-y-1.5 sm:col-span-2">
          <span className="text-sm font-medium text-stone-800">Work email</span>
          <input
            name="email"
            type="email"
            required
            autoComplete="email"
            className="w-full rounded-xl border border-stone-300 bg-white px-3 py-2.5 text-stone-900 outline-none focus:border-[#1c1410] focus:ring-2 focus:ring-[#1c1410]/10"
          />
        </label>
        <label className="block space-y-1.5">
          <span className="text-sm font-medium text-stone-800">Password</span>
          <input
            name="password"
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            className="w-full rounded-xl border border-stone-300 bg-white px-3 py-2.5 text-stone-900 outline-none focus:border-[#1c1410] focus:ring-2 focus:ring-[#1c1410]/10"
          />
        </label>
        <label className="block space-y-1.5">
          <span className="text-sm font-medium text-stone-800">Confirm password</span>
          <input
            name="confirmPassword"
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            className="w-full rounded-xl border border-stone-300 bg-white px-3 py-2.5 text-stone-900 outline-none focus:border-[#1c1410] focus:ring-2 focus:ring-[#1c1410]/10"
          />
        </label>
      </fieldset>

      {error ? <p className="text-sm text-red-700">{error}</p> : null}

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-xl bg-[#1c1410] px-4 py-2.5 text-sm font-semibold text-[#fff6ea] transition hover:bg-[#2a211c] disabled:cursor-not-allowed disabled:opacity-70"
      >
        {pending ? "Creating account..." : "Create account"}
      </button>

      <p className="text-center text-sm text-stone-600">
        <Link href="/login" className="font-medium text-[#8a6a4a] hover:underline">
          Already have an account? Sign in
        </Link>
      </p>
    </form>
  );
}
