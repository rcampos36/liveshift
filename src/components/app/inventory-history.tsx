"use client";

import { InventoryNav } from "@/components/app/inventory-nav";
import { useInventory } from "@/components/app/use-inventory";
import type { InventorySnapshot } from "@/lib/inventory/types";

function timeLabel(timezone: string, iso: string) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(iso));
}

function typeLabel(type: string) {
  return type
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function InventoryHistory({
  companyId,
  locationId,
  companyName,
  initial,
}: {
  companyId: string;
  locationId: string;
  companyName: string;
  initial: InventorySnapshot;
}) {
  const { snapshot, error } = useInventory(companyId, locationId, initial);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-orange-800">
            Inventory history · {companyName}
          </p>
          <h1 className="font-display mt-2 text-4xl text-stone-950">{snapshot.restaurantName}</h1>
          <p className="mt-2 text-stone-600">Every count, adjustment, import, and status change for this restaurant.</p>
        </div>
        <InventoryNav companyId={companyId} locationId={locationId} current="history" />
      </div>

      {error ? <p className="text-sm text-red-700">{error}</p> : null}

      <section className="overflow-hidden rounded-[1.75rem] border border-stone-200 bg-white">
        {snapshot.history.length === 0 ? (
          <p className="px-6 py-16 text-center text-sm text-stone-500">No inventory adjustments yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-[#faf6ef] text-xs uppercase tracking-[0.14em] text-stone-500">
                <tr>
                  <th className="px-4 py-3 font-medium">Item</th>
                  <th className="px-4 py-3 font-medium">Type</th>
                  <th className="px-4 py-3 font-medium">Before</th>
                  <th className="px-4 py-3 font-medium">After</th>
                  <th className="px-4 py-3 font-medium">Delta</th>
                  <th className="px-4 py-3 font-medium">Reason</th>
                  <th className="px-4 py-3 font-medium">By</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {snapshot.history.map((row) => (
                  <tr key={row.id}>
                    <td className="px-4 py-3">
                      <p className="font-medium text-stone-950">{row.name}</p>
                      <p className="text-xs text-stone-500">{row.sku ?? "No SKU"}</p>
                    </td>
                    <td className="px-4 py-3">{typeLabel(row.type)}</td>
                    <td className="px-4 py-3">{row.quantityBefore}</td>
                    <td className="px-4 py-3">{row.quantityAfter}</td>
                    <td className="px-4 py-3">{row.quantityDelta > 0 ? `+${row.quantityDelta}` : row.quantityDelta}</td>
                    <td className="max-w-56 px-4 py-3 text-stone-600">{row.reason ?? "—"}</td>
                    <td className="px-4 py-3">
                      <p>{row.createdBy.name}</p>
                      <p className="text-xs text-stone-500">{timeLabel(snapshot.timezone, row.createdAt)}</p>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
