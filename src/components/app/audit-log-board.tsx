"use client";

import { useEffect, useState } from "react";
import type { AuditSnapshot } from "@/lib/audit/types";

function formatValue(value: unknown) {
  if (value == null || value === "") {
    return "—";
  }
  if (typeof value === "string") {
    return value;
  }
  return JSON.stringify(value);
}

export function AuditLogBoard({
  companyId,
  locationId,
  companyName,
  initial,
}: {
  companyId: string;
  locationId: string;
  companyName: string;
  initial: AuditSnapshot;
}) {
  const [snapshot, setSnapshot] = useState(initial);

  useEffect(() => {
    let cancelled = false;
    async function refresh() {
      const response = await fetch(`/api/companies/${companyId}/restaurants/${locationId}/audit`, {
        cache: "no-store",
      });
      const data = (await response.json()) as AuditSnapshot & { error?: string };
      if (!cancelled && response.ok && data.entries) {
        setSnapshot(data);
      }
    }
    void refresh();
    const timer = window.setInterval(() => {
      void refresh();
    }, 15_000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [companyId, locationId]);

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-orange-800">
          Audit log · {companyName}
        </p>
        <h1 className="font-display mt-2 text-4xl text-stone-950">{snapshot.restaurantName}</h1>
        <p className="mt-2 text-stone-600">Every restaurant change, with previous and new values.</p>
      </div>

      <section className="overflow-hidden rounded-3xl border border-stone-200 bg-white">
        {snapshot.entries.length === 0 ? (
          <p className="px-5 py-10 text-sm text-stone-500">No audited changes yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-[#faf6ef] text-xs uppercase tracking-[0.14em] text-stone-500">
                <tr>
                  <th className="px-4 py-3">User</th>
                  <th className="px-4 py-3">Restaurant</th>
                  <th className="px-4 py-3">Entity</th>
                  <th className="px-4 py-3">Entity ID</th>
                  <th className="px-4 py-3">Action</th>
                  <th className="px-4 py-3">Old value</th>
                  <th className="px-4 py-3">New value</th>
                  <th className="px-4 py-3">Timestamp</th>
                  <th className="px-4 py-3">IP / session</th>
                </tr>
              </thead>
              <tbody>
                {snapshot.entries.map((entry) => (
                  <tr key={entry.id} className="align-top border-t border-stone-100">
                    <td className="px-4 py-3">
                      <div>{entry.user}</div>
                      {entry.userEmail ? <div className="text-xs text-stone-500">{entry.userEmail}</div> : null}
                    </td>
                    <td className="px-4 py-3">{entry.restaurant}</td>
                    <td className="px-4 py-3">{entry.entity}</td>
                    <td className="max-w-32 truncate px-4 py-3 font-mono text-xs" title={entry.entityId}>
                      {entry.entityId}
                    </td>
                    <td className="px-4 py-3">{entry.action}</td>
                    <td className="max-w-48 px-4 py-3 font-mono text-xs break-all text-stone-600">
                      {formatValue(entry.oldValue)}
                    </td>
                    <td className="max-w-48 px-4 py-3 font-mono text-xs break-all text-stone-600">
                      {formatValue(entry.newValue)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-stone-700">
                      {new Date(entry.timestamp).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-xs text-stone-500">
                      <div>{entry.ipAddress ?? "—"}</div>
                      {entry.sessionId ? <div className="font-mono">{entry.sessionId}</div> : null}
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
