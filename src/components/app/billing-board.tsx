"use client";

import { useState } from "react";
import type { BillingSnapshot } from "@/lib/billing/types";

function money(amount: number, currency: string) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency, maximumFractionDigits: 2 }).format(amount);
}

export function BillingBoard({ companyId, initial }: { companyId: string; initial: BillingSnapshot }) {
  const [snapshot, setSnapshot] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [quantity, setQuantity] = useState(snapshot.subscription?.locationQuantity ?? 1);
  const subscription = snapshot.subscription;

  async function submit(path: string, payload: Record<string, unknown>) {
    setPending(true);
    setError(null);
    setMessage(null);
    try {
      const response = await fetch(path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await response.json()) as BillingSnapshot & {
        error?: string;
        temporaryPassword?: string;
        invoice?: { number: string; sentTo: string[] };
      };
      if (!response.ok) {
        setError(data.error ?? "Unable to update billing");
        return false;
      }
      setSnapshot(data);
      if (data.subscription) {
        setQuantity(data.subscription.locationQuantity);
      }
      if (data.temporaryPassword) {
        setMessage(`Billing administrator added. Temporary password: ${data.temporaryPassword}`);
      } else if (data.invoice) {
        setMessage(`Invoice ${data.invoice.number} sent to ${data.invoice.sentTo.join(", ")}`);
      }
      return true;
    } catch {
      setError("Unable to update billing");
      return false;
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#8a6a4a]">Company billing</p>
        <h1 className="font-display mt-3 text-[2.65rem] leading-[1.05] tracking-tight text-stone-950">{snapshot.companyName}</h1>
        <p className="mt-2 max-w-3xl text-stone-600">
          The company is billed for restaurant locations. Billing administrators are not restaurant operators.
        </p>
      </div>

      {error ? <p className="rounded-2xl bg-orange-50 px-4 py-3 text-sm text-orange-950">{error}</p> : null}
      {message ? <p className="rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-900">{message}</p> : null}

      <section className="overflow-hidden rounded-2xl border border-stone-200/80 bg-white/75 shadow-[0_28px_60px_-42px_rgba(28,20,16,0.55)] backdrop-blur">
        <div className="grid sm:grid-cols-2 xl:grid-cols-4">
          <Stat label="Status" value={subscription?.statusLabel ?? "None"} />
          <Stat label="Plan" value={subscription ? `${subscription.planName} · ${subscription.interval.toLowerCase()}` : "—"} />
          <Stat
            label="Per location"
            value={subscription ? money(subscription.amountPerLocation, subscription.currency) : "—"}
          />
          <Stat
            label="Company total"
            value={subscription ? money(subscription.recurringTotal, subscription.currency) : "—"}
            last
          />
        </div>
      </section>

      {subscription ? (
        <section className="rounded-3xl border border-stone-200 bg-white p-5">
          <h2 className="font-display text-2xl text-stone-950">Current subscription</h2>
          <dl className="mt-4 grid gap-3 sm:grid-cols-2">
            <Detail label="Billed restaurants" value={`${subscription.locationQuantity} (using ${subscription.locationCount})`} />
            <Detail label="Current period" value={`${new Date(subscription.currentPeriodStart).toLocaleDateString()} – ${new Date(subscription.currentPeriodEnd).toLocaleDateString()}`} />
            <Detail label="Trial ends" value={subscription.trialEndsAt ? new Date(subscription.trialEndsAt).toLocaleString() : "—"} />
            <Detail label="Cancel at period end" value={subscription.cancelAtPeriodEnd ? "Yes" : "No"} />
          </dl>
          {snapshot.canManage && subscription.status !== "CANCELLED" ? (
            <form
              className="mt-5 flex flex-wrap items-end gap-3"
              onSubmit={(event) => {
                event.preventDefault();
                const form = event.currentTarget;
                const email = String(new FormData(form).get("email") ?? "");
                void submit(`/api/companies/${companyId}/billing/invoices`, { email }).then((ok) => {
                  if (ok) form.reset();
                });
              }}
            >
              <label className="text-xs uppercase tracking-[0.14em] text-stone-500">
                Extra recipient
                <input
                  name="email"
                  type="email"
                  placeholder="ap@company.com"
                  className="mt-1 block min-w-64 rounded-xl border border-stone-300 px-3 py-2 text-sm text-stone-900"
                />
              </label>
              <button type="submit" disabled={pending} className="rounded-xl bg-[#1c1410] px-4 py-2 text-sm text-[#fff6ea] disabled:opacity-60">
                Send invoice
              </button>
            </form>
          ) : null}
        </section>
      ) : (
        <p className="rounded-3xl border border-dashed border-stone-300 bg-white px-5 py-8 text-sm text-stone-500">
          No subscription yet. {snapshot.prices.length ? "Choose a per-location price to start." : "No catalog prices are configured."}
        </p>
      )}

      {snapshot.canManage ? (
        <section className="rounded-3xl border border-stone-200 bg-white p-5">
          <h2 className="font-display text-2xl text-stone-950">Plans and location quantity</h2>
          <p className="mt-2 text-sm text-stone-600">Prices come from the billing catalog, not from application code.</p>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {snapshot.prices.map((price) => {
              const selected = subscription?.priceId === price.id;
              const needsSubscribe =
                !subscription || subscription.status === "CANCELLED" || subscription.status === "PAST_DUE";
              return (
                <div key={price.id} className={`rounded-2xl border px-4 py-4 ${selected ? "border-[#1c1410]" : "border-stone-200"}`}>
                  <p className="font-display text-2xl text-stone-950">{price.planName}</p>
                  <p className="mt-1 text-sm text-stone-500">{price.planDescription}</p>
                  {price.planFeatures.length > 0 ? (
                    <ul className="mt-3 space-y-1.5">
                      {price.planFeatures.map((feature) => (
                        <li key={feature} className="text-sm leading-6 text-stone-600">
                          {feature}
                        </li>
                      ))}
                    </ul>
                  ) : null}
                  <p className="mt-3 text-lg text-stone-900">
                    {money(price.amountPerLocation, price.currency)} / location / {price.interval.toLowerCase()}
                  </p>
                  <button
                    type="button"
                    disabled={pending || (selected && !needsSubscribe)}
                    onClick={() =>
                      void submit(`/api/companies/${companyId}/billing`, {
                        type: needsSubscribe ? "subscribe" : "changePlan",
                        priceId: price.id,
                      })
                    }
                    className="mt-4 rounded-xl bg-[#1c1410] px-4 py-2 text-sm text-[#fff6ea] disabled:opacity-60"
                  >
                    {needsSubscribe ? "Subscribe" : selected ? "Current plan" : "Switch to this plan"}
                  </button>
                </div>
              );
            })}
          </div>
          {subscription ? (
            <form
              className="mt-6 flex flex-wrap items-end gap-3"
              onSubmit={(event) => {
                event.preventDefault();
                void submit(`/api/companies/${companyId}/billing`, { type: "changeQuantity", locationQuantity: quantity });
              }}
            >
              <label className="text-xs uppercase tracking-[0.14em] text-stone-500">
                Billed restaurants
                <input
                  type="number"
                  min={Math.max(subscription.locationCount, 1)}
                  value={quantity}
                  onChange={(event) => setQuantity(Number(event.target.value))}
                  className="mt-1 block rounded-xl border border-stone-300 px-3 py-2 text-sm text-stone-900"
                />
              </label>
              <button type="submit" disabled={pending} className="rounded-xl border border-stone-300 px-4 py-2 text-sm disabled:opacity-60">
                Update quantity
              </button>
              {subscription.status === "TRIAL" ? (
                <button
                  type="button"
                  disabled={pending}
                  onClick={() =>
                    void submit(`/api/companies/${companyId}/billing`, {
                      type: "subscribe",
                      priceId: subscription.priceId,
                    })
                  }
                  className="rounded-xl border border-stone-300 px-4 py-2 text-sm"
                >
                  Activate paid billing
                </button>
              ) : null}
              {subscription.status === "CANCELLED" || subscription.status === "PAST_DUE" || subscription.cancelAtPeriodEnd ? (
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => void submit(`/api/companies/${companyId}/billing`, { type: "reactivate" })}
                  className="rounded-xl border border-stone-300 px-4 py-2 text-sm"
                >
                  Reactivate
                </button>
              ) : (
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => void submit(`/api/companies/${companyId}/billing`, { type: "cancel" })}
                  className="rounded-xl px-4 py-2 text-sm text-stone-600"
                >
                  Cancel at period end
                </button>
              )}
            </form>
          ) : null}
        </section>
      ) : (
        <p className="text-sm text-stone-500">Only billing administrators can change the subscription.</p>
      )}

      <section className="rounded-3xl border border-stone-200 bg-white p-5">
        <h2 className="font-display text-2xl text-stone-950">Billing administrators</h2>
        {snapshot.billingAdmins.length === 0 ? (
          <p className="mt-3 text-sm text-stone-500">No billing administrators assigned.</p>
        ) : (
          <ul className="mt-4 divide-y divide-stone-100">
            {snapshot.billingAdmins.map((admin) => (
              <li key={admin.id} className="flex justify-between py-3 text-sm">
                <span>{admin.name}</span>
                <span className="text-stone-500">{admin.email}</span>
              </li>
            ))}
          </ul>
        )}
        {snapshot.canManage ? (
          <form
            className="mt-4 grid gap-3 sm:grid-cols-3"
            onSubmit={(event) => {
              event.preventDefault();
              const form = event.currentTarget;
              const payload = Object.fromEntries(new FormData(form).entries());
              void submit(`/api/companies/${companyId}/billing/admins`, payload).then((ok) => {
                if (ok) form.reset();
              });
            }}
          >
            <input name="firstName" required placeholder="First name" className="rounded-xl border border-stone-300 px-3 py-2 text-sm" />
            <input name="lastName" required placeholder="Last name" className="rounded-xl border border-stone-300 px-3 py-2 text-sm" />
            <input name="email" type="email" required placeholder="Email" className="rounded-xl border border-stone-300 px-3 py-2 text-sm" />
            <button type="submit" disabled={pending} className="rounded-xl bg-[#1c1410] px-4 py-2 text-sm text-[#fff6ea] sm:col-span-3 disabled:opacity-60">
              Add billing administrator
            </button>
          </form>
        ) : null}
      </section>

      <section className="overflow-hidden rounded-3xl border border-stone-200 bg-white">
        <div className="border-b border-stone-200 px-5 py-4">
          <h2 className="font-display text-2xl text-stone-950">Invoices</h2>
        </div>
        {snapshot.invoices.length === 0 ? (
          <p className="px-5 py-8 text-sm text-stone-500">No invoices sent yet.</p>
        ) : (
          <table className="min-w-full text-left text-sm">
            <thead className="bg-[#faf6ef] text-xs uppercase tracking-[0.14em] text-stone-500">
              <tr>
                <th className="px-5 py-3">Invoice</th>
                <th className="px-5 py-3">Amount</th>
                <th className="px-5 py-3">Sent to</th>
                <th className="px-5 py-3">When</th>
              </tr>
            </thead>
            <tbody>
              {snapshot.invoices.map((invoice) => (
                <tr key={invoice.id} className="border-t border-stone-100">
                  <td className="px-5 py-3">
                    {invoice.number}
                    <span className="mt-1 block text-xs text-stone-500">
                      {invoice.planName} · {invoice.locationQuantity} locations
                    </span>
                  </td>
                  <td className="px-5 py-3">{money(invoice.total, invoice.currency)}</td>
                  <td className="px-5 py-3">{invoice.sentTo.join(", ")}</td>
                  <td className="px-5 py-3">{new Date(invoice.createdAt).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section className="overflow-hidden rounded-3xl border border-stone-200 bg-white">
        <div className="border-b border-stone-200 px-5 py-4">
          <h2 className="font-display text-2xl text-stone-950">Subscription changes</h2>
        </div>
        {snapshot.changes.length === 0 ? (
          <p className="px-5 py-8 text-sm text-stone-500">No upgrades or downgrades yet.</p>
        ) : (
          <table className="min-w-full text-left text-sm">
            <thead className="bg-[#faf6ef] text-xs uppercase tracking-[0.14em] text-stone-500">
              <tr>
                <th className="px-5 py-3">When</th>
                <th className="px-5 py-3">Type</th>
                <th className="px-5 py-3">By</th>
              </tr>
            </thead>
            <tbody>
              {snapshot.changes.map((change) => (
                <tr key={change.id} className="border-t border-stone-100">
                  <td className="px-5 py-3">{new Date(change.createdAt).toLocaleString()}</td>
                  <td className="px-5 py-3">{change.type}</td>
                  <td className="px-5 py-3">{change.createdBy ?? "System"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}

function Stat({ label, value, last = false }: { label: string; value: string; last?: boolean }) {
  return (
    <div className={`px-6 py-5 ${last ? "" : "border-b border-stone-100 sm:border-b xl:border-b-0 xl:border-r"}`}>
      <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-stone-400">{label}</p>
      <p className="font-display mt-2 text-[1.65rem] leading-none tracking-tight text-stone-950">{value}</p>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-[0.14em] text-stone-500">{label}</dt>
      <dd className="mt-1 text-sm text-stone-900">{value}</dd>
    </div>
  );
}
