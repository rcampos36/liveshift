"use client";

import { EightySixNav } from "@/components/app/eighty-six-nav";
import { useEightySix } from "@/components/app/use-eighty-six";
import { formatTime, statusLabel } from "@/lib/eighty-six/display";
import type { EightySixSnapshot } from "@/lib/eighty-six/types";

export function EightySixHistory({
  companyId,
  locationId,
  companyName,
  initial,
}: {
  companyId: string;
  locationId: string;
  companyName: string;
  initial: EightySixSnapshot;
}) {
  const { snapshot, error } = useEightySix(companyId, locationId, initial);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-orange-800">
            86 history · {companyName}
          </p>
          <h1 className="font-display mt-2 text-4xl text-stone-950">{snapshot.restaurantName}</h1>
          <p className="mt-2 text-stone-600">Every 86, low-stock, and restore for this restaurant only.</p>
        </div>
        <EightySixNav companyId={companyId} locationId={locationId} current="history" />
      </div>

      {error ? <p className="text-sm text-red-700">{error}</p> : null}

      <section className="overflow-hidden rounded-[1.75rem] border border-stone-200 bg-white">
        {snapshot.history.length === 0 ? (
          <p className="px-6 py-16 text-center text-sm text-stone-500">No 86 history yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-[#faf6ef] text-xs uppercase tracking-[0.14em] text-stone-500">
                <tr>
                  <th className="px-4 py-3 font-medium">Item</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Qty</th>
                  <th className="px-4 py-3 font-medium">Reason</th>
                  <th className="px-4 py-3 font-medium">Restock</th>
                  <th className="px-4 py-3 font-medium">Created</th>
                  <th className="px-4 py-3 font-medium">Resolved</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {snapshot.history.map((row) => (
                  <tr key={row.id}>
                    <td className="px-4 py-3">
                      <p className="font-medium text-stone-950">{row.name}</p>
                      <p className="text-xs text-stone-500">{row.category ?? "Uncategorized"}</p>
                    </td>
                    <td className="px-4 py-3">{statusLabel(row.status)}</td>
                    <td className="px-4 py-3">{row.remainingQuantity ?? "—"}</td>
                    <td className="max-w-56 px-4 py-3 text-stone-600">{row.reason ?? "—"}</td>
                    <td className="px-4 py-3">{formatTime(snapshot.timezone, row.estimatedAvailableAt) ?? "—"}</td>
                    <td className="px-4 py-3">
                      <p>{row.createdBy.name}</p>
                      <p className="text-xs text-stone-500">{formatTime(snapshot.timezone, row.createdAt)}</p>
                    </td>
                    <td className="px-4 py-3">
                      {row.resolvedAt ? (
                        <>
                          <p>{row.resolvedBy?.name ?? "Restored"}</p>
                          <p className="text-xs text-stone-500">{formatTime(snapshot.timezone, row.resolvedAt)}</p>
                        </>
                      ) : (
                        <span className="text-orange-800">Open</span>
                      )}
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
