"use client";

import { useWaste } from "@/components/app/use-waste";
import { WasteNav } from "@/components/app/waste-nav";
import type { WasteBreakdown, WasteSnapshot } from "@/lib/waste/types";

function money(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

export function WasteAnalytics({
  companyId,
  locationId,
  companyName,
  initial,
  current,
}: {
  companyId: string;
  locationId?: string;
  companyName: string;
  initial: WasteSnapshot;
  current: "analytics" | "company";
}) {
  const endpoint = locationId
    ? `/api/companies/${companyId}/restaurants/${locationId}/waste`
    : `/api/companies/${companyId}/waste`;
  const { snapshot, error } = useWaste(endpoint, initial, companyId, locationId);
  const maxCost = Math.max(
    ...snapshot.analytics.costTrend.map((row) => row.cost),
    ...snapshot.analytics.byItem.map((row) => row.cost),
    1,
  );

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-orange-800">
            Waste analytics · {companyName}
          </p>
          <h1 className="font-display mt-2 text-4xl text-stone-950">{snapshot.restaurantName}</h1>
          <p className="mt-2 text-stone-600">This month&apos;s waste by item, reason, employee, shift, day, and restaurant.</p>
        </div>
        <WasteNav companyId={companyId} locationId={locationId} current={current} />
      </div>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Waste today" value={money(snapshot.kpis.wasteToday)} />
        <Stat label="Waste this week" value={money(snapshot.kpis.wasteThisWeek)} />
        <Stat label="Waste this month" value={money(snapshot.kpis.wasteThisMonth)} />
        <Stat label="Waste % of sales" value={`${snapshot.kpis.wastePercentOfSales.toFixed(1)}%`} />
      </section>

      {error ? <p className="text-sm text-red-700">{error}</p> : null}

      <section className="rounded-[1.75rem] border border-stone-200 bg-white p-5">
        <h2 className="font-display text-2xl text-stone-950">Cost trend</h2>
        <div className="mt-5 flex h-40 items-end gap-1.5">
          {snapshot.analytics.costTrend.map((row) => (
            <div key={row.key} className="flex flex-1 flex-col items-center gap-1">
              <div
                className="w-full rounded-t bg-[#1c1410]"
                style={{ height: `${Math.max(6, (row.cost / maxCost) * 100)}%` }}
                title={`${row.label}: ${money(row.cost)}`}
              />
              <span className="text-[10px] text-stone-500">{row.label}</span>
            </div>
          ))}
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <Breakdown title="Top waste items" rows={snapshot.analytics.topItems} />
        <Breakdown title="Waste by item" rows={snapshot.analytics.byItem} />
        <Breakdown title="Waste by reason" rows={snapshot.analytics.byReason} />
        <Breakdown title="Waste by employee" rows={snapshot.analytics.byEmployee} />
        <Breakdown title="Waste by shift" rows={snapshot.analytics.byShift} />
        <Breakdown title="Waste by day" rows={snapshot.analytics.byDay} />
        <Breakdown title="Waste by restaurant" rows={snapshot.analytics.byRestaurant} />
      </div>
    </div>
  );
}

function Breakdown({ title, rows }: { title: string; rows: WasteBreakdown[] }) {
  const max = Math.max(...rows.map((row) => row.cost), 1);
  return (
    <section className="rounded-[1.75rem] border border-stone-200 bg-white p-5">
      <h2 className="font-display text-2xl text-stone-950">{title}</h2>
      {rows.length === 0 ? (
        <p className="mt-6 text-sm text-stone-500">No waste in this window.</p>
      ) : (
        <ul className="mt-4 space-y-3">
          {rows.slice(0, 8).map((row) => (
            <li key={row.key}>
              <div className="flex items-center justify-between gap-3 text-sm">
                <span className="font-medium text-stone-950">{row.label}</span>
                <span className="text-stone-600">
                  {money(row.cost)} · {row.count}
                </span>
              </div>
              <div className="mt-1 h-2 overflow-hidden rounded-full bg-stone-100">
                <div className="h-full rounded-full bg-[#e8c9a0]" style={{ width: `${(row.cost / max) * 100}%` }} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-3xl border border-stone-200 bg-white px-5 py-4">
      <p className="text-xs uppercase tracking-[0.16em] text-stone-500">{label}</p>
      <p className="font-display mt-2 text-3xl text-stone-950">{value}</p>
    </div>
  );
}
