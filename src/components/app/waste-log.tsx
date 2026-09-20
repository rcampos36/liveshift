"use client";

import { useMemo, useState } from "react";
import { useWaste } from "@/components/app/use-waste";
import { WasteNav } from "@/components/app/waste-nav";
import {
  SERVICE_SHIFT_LABELS,
  SERVICE_SHIFTS,
  WASTE_REASON_LABELS,
  WASTE_REASONS,
  type WasteSnapshot,
} from "@/lib/waste/types";

function money(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(value);
}

export function WasteLog({
  companyId,
  locationId,
  companyName,
  initial,
}: {
  companyId: string;
  locationId: string;
  companyName: string;
  initial: WasteSnapshot;
}) {
  const { snapshot, error, pending, submit } = useWaste(
    `/api/companies/${companyId}/restaurants/${locationId}/waste`,
    initial,
    companyId,
    locationId,
  );
  const [itemId, setItemId] = useState(snapshot.catalog[0]?.id ?? "");
  const selected = useMemo(
    () => snapshot.catalog.find((item) => item.id === itemId),
    [itemId, snapshot.catalog],
  );
  const [quantity, setQuantity] = useState("1");
  const estimated = (Number(quantity) || 0) * (selected?.unitCost ?? 0);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-orange-800">
            Waste log · {companyName}
          </p>
          <h1 className="font-display mt-2 text-4xl text-stone-950">{snapshot.restaurantName}</h1>
          <p className="mt-2 text-stone-600">Employees and managers record F&B waste. Cost is quantity × unit cost.</p>
        </div>
        <WasteNav companyId={companyId} locationId={locationId} current="log" />
      </div>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Waste today" value={money(snapshot.kpis.wasteToday)} />
        <Stat label="Waste this week" value={money(snapshot.kpis.wasteThisWeek)} />
        <Stat label="Waste this month" value={money(snapshot.kpis.wasteThisMonth)} />
        <Stat label="Waste % of sales" value={`${snapshot.kpis.wastePercentOfSales.toFixed(1)}%`} />
      </section>

      {error ? <p className="text-sm text-red-700">{error}</p> : null}

      <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <section className="rounded-[1.75rem] border border-stone-200 bg-white p-5">
          <h2 className="font-display text-2xl text-stone-950">Record waste</h2>
          {snapshot.canWrite ? (
            <form
              className="mt-4 space-y-3"
              onSubmit={async (event) => {
                event.preventDefault();
                const form = new FormData(event.currentTarget);
                const ok = await submit({
                  type: "record",
                  inventoryItemId: form.get("inventoryItemId"),
                  quantity: form.get("quantity"),
                  reason: form.get("reason"),
                  employeeId: form.get("employeeId"),
                  shift: form.get("shift"),
                  notes: form.get("notes"),
                });
                if (ok) {
                  event.currentTarget.reset();
                  setQuantity("1");
                }
              }}
            >
              <label className="block space-y-1">
                <span className="text-xs uppercase tracking-[0.14em] text-stone-500">Inventory item</span>
                <select
                  name="inventoryItemId"
                  value={itemId}
                  onChange={(event) => setItemId(event.target.value)}
                  className="w-full rounded-xl border border-stone-300 px-3 py-2.5 text-sm"
                >
                  {snapshot.catalog.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name} · {money(item.unitCost)}/{item.unit}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block space-y-1">
                <span className="text-xs uppercase tracking-[0.14em] text-stone-500">Quantity</span>
                <input
                  name="quantity"
                  value={quantity}
                  onChange={(event) => setQuantity(event.target.value)}
                  className="w-full rounded-xl border border-stone-300 px-3 py-2.5 text-sm"
                />
              </label>
              <p className="text-sm text-stone-600">
                Waste cost: <span className="font-medium text-stone-950">{money(estimated)}</span>
              </p>
              <label className="block space-y-1">
                <span className="text-xs uppercase tracking-[0.14em] text-stone-500">Reason</span>
                <select name="reason" defaultValue="SPOILAGE" className="w-full rounded-xl border border-stone-300 px-3 py-2.5 text-sm">
                  {WASTE_REASONS.map((reason) => (
                    <option key={reason} value={reason}>
                      {WASTE_REASON_LABELS[reason]}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block space-y-1">
                <span className="text-xs uppercase tracking-[0.14em] text-stone-500">Shift</span>
                <select
                  name="shift"
                  defaultValue={snapshot.defaultShift}
                  className="w-full rounded-xl border border-stone-300 px-3 py-2.5 text-sm"
                >
                  {SERVICE_SHIFTS.map((shift) => (
                    <option key={shift} value={shift}>
                      {SERVICE_SHIFT_LABELS[shift]}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block space-y-1">
                <span className="text-xs uppercase tracking-[0.14em] text-stone-500">Employee</span>
                <select
                  name="employeeId"
                  defaultValue={snapshot.currentUserId}
                  className="w-full rounded-xl border border-stone-300 px-3 py-2.5 text-sm"
                >
                  {snapshot.employees.map((employee) => (
                    <option key={employee.id} value={employee.id}>
                      {employee.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block space-y-1">
                <span className="text-xs uppercase tracking-[0.14em] text-stone-500">Notes</span>
                <input name="notes" placeholder="Optional" className="w-full rounded-xl border border-stone-300 px-3 py-2.5 text-sm" />
              </label>
              <button
                type="submit"
                disabled={pending || snapshot.catalog.length === 0}
                className="rounded-full bg-[#1c1410] px-4 py-2 text-sm font-semibold text-[#fff6ea] disabled:opacity-60"
              >
                {pending ? "Saving..." : "Log waste"}
              </button>
            </form>
          ) : (
            <p className="mt-3 text-sm text-stone-500">View only. Employees and managers can record waste.</p>
          )}
        </section>

        <section className="rounded-[1.75rem] border border-stone-200 bg-white p-5">
          <h2 className="font-display text-2xl text-stone-950">Today&apos;s waste</h2>
          <p className="mt-1 text-sm text-stone-500">{snapshot.kpis.wasteCountToday} entries</p>
          {snapshot.entries.length === 0 ? (
            <p className="mt-8 text-sm text-stone-500">No waste recorded today.</p>
          ) : (
            <ul className="mt-4 divide-y divide-stone-100">
              {snapshot.entries.map((entry) => (
                <li key={entry.id} className="flex items-start justify-between gap-3 py-3">
                  <div>
                    <p className="font-medium text-stone-950">{entry.itemName}</p>
                    <p className="text-xs text-stone-500">
                      {entry.quantity} {entry.unit} · {WASTE_REASON_LABELS[entry.reason]} · {SERVICE_SHIFT_LABELS[entry.shift]}
                      {entry.employeeName ? ` · ${entry.employeeName}` : ""}
                    </p>
                    {entry.notes ? <p className="mt-1 text-xs text-stone-500">{entry.notes}</p> : null}
                  </div>
                  <p className="text-sm font-medium text-stone-950">{money(entry.totalCost)}</p>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
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
