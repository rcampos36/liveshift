"use client";

import { useMemo, useState } from "react";
import { EightySixNav } from "@/components/app/eighty-six-nav";
import { useEightySix } from "@/components/app/use-eighty-six";
import { formatTime, statusLabel, toDateTimeLocal } from "@/lib/eighty-six/display";
import type { EightySixSnapshot, MenuAvailability, MenuItemRecord } from "@/lib/eighty-six/types";

type Filter = "ALL" | MenuAvailability;

export function EightySixManagement({
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
  const { snapshot, error, pending, submit } = useEightySix(companyId, locationId, initial);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("ALL");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const selected = snapshot.items.find((item) => item.id === selectedId) ?? null;
  const matches = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return snapshot.items.filter((item) => {
      const text = `${item.name} ${item.category ?? ""}`.toLowerCase();
      const matchesQuery = !needle || text.includes(needle);
      const matchesFilter = filter === "ALL" || item.status === filter;
      return matchesQuery && matchesFilter;
    });
  }, [filter, query, snapshot.items]);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-orange-800">
            86 management · {companyName}
          </p>
          <h1 className="font-display mt-2 text-4xl text-stone-950">{snapshot.restaurantName}</h1>
          <p className="mt-2 text-stone-600">Search the house menu, then 86, mark low stock, or restore.</p>
        </div>
        <EightySixNav companyId={companyId} locationId={locationId} current="manage" />
      </div>

      <section className="grid gap-3 sm:grid-cols-3">
        <Stat label="86 items" value={String(snapshot.board.eightySixed.length)} />
        <Stat label="Low stock" value={String(snapshot.board.lowStock.length)} />
        <Stat label="Menu items" value={String(snapshot.items.length)} />
      </section>

      {error ? <p className="text-sm text-red-700">{error}</p> : null}

      <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <section className="rounded-[1.75rem] border border-stone-200 bg-white p-5">
          <div className="flex flex-wrap items-center gap-3">
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search menu items"
              className="min-w-56 flex-1 rounded-xl border border-stone-300 px-3 py-2.5 text-sm text-stone-900"
            />
            <div className="flex flex-wrap gap-2">
              {(
                [
                  ["ALL", "All"],
                  ["EIGHTY_SIXED", "86"],
                  ["LOW_STOCK", "Low stock"],
                  ["AVAILABLE", "Available"],
                ] as const
              ).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setFilter(value)}
                  className={`rounded-full px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.12em] ${
                    filter === value ? "bg-[#1c1410] text-[#fff6ea]" : "bg-stone-100 text-stone-700"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <ul className="mt-5 divide-y divide-stone-100">
            {matches.length === 0 ? (
              <li className="py-10 text-center text-sm text-stone-500">No menu items match that search.</li>
            ) : (
              matches.map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedId(item.id)}
                    className={`flex w-full items-center justify-between gap-3 px-2 py-3 text-left ${
                      selectedId === item.id ? "bg-[#faf6ef]" : "hover:bg-stone-50"
                    }`}
                  >
                    <div>
                      <p className="font-medium text-stone-950">{item.name}</p>
                      <p className="text-xs text-stone-500">
                        {item.category ?? "Uncategorized"}
                        {item.remainingQuantity != null ? ` · ${item.remainingQuantity} left` : ""}
                        {item.reason ? ` · ${item.reason}` : ""}
                      </p>
                    </div>
                    <StatusBadge status={item.status} />
                  </button>
                </li>
              ))
            )}
          </ul>
        </section>

        <div className="space-y-6">
          <ManagerControls
            item={selected}
            canWrite={snapshot.canWrite}
            pending={pending}
            timezone={snapshot.timezone}
            onSubmit={submit}
          />
          {snapshot.canWrite ? (
            <form
              className="space-y-3 rounded-[1.75rem] border border-stone-200 bg-white p-5"
              onSubmit={async (event) => {
                event.preventDefault();
                const form = new FormData(event.currentTarget);
                const ok = await submit({
                  type: "addMenuItem",
                  name: form.get("name"),
                  category: form.get("category"),
                });
                if (ok) event.currentTarget.reset();
              }}
            >
              <h2 className="font-display text-2xl text-stone-950">Add menu item</h2>
              <input
                name="name"
                placeholder="Chile en nogada"
                className="w-full rounded-xl border border-stone-300 px-3 py-2.5 text-sm"
              />
              <input
                name="category"
                placeholder="Plates"
                className="w-full rounded-xl border border-stone-300 px-3 py-2.5 text-sm"
              />
              <button
                type="submit"
                disabled={pending}
                className="rounded-full bg-[#1c1410] px-4 py-2 text-sm font-semibold text-[#fff6ea] disabled:opacity-60"
              >
                {pending ? "Saving..." : "Add to this house"}
              </button>
            </form>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function ManagerControls({
  item,
  canWrite,
  pending,
  timezone,
  onSubmit,
}: {
  item: MenuItemRecord | null;
  canWrite: boolean;
  pending: boolean;
  timezone: string;
  onSubmit: (payload: Record<string, unknown>) => Promise<boolean>;
}) {
  if (!item) {
    return (
      <section className="rounded-[1.75rem] border border-dashed border-stone-300 bg-white p-5">
        <h2 className="font-display text-2xl text-stone-950">Manager controls</h2>
        <p className="mt-2 text-sm text-stone-600">Select a menu item to 86 it, mark low stock, or restore it.</p>
      </section>
    );
  }

  function readForm(form: HTMLFormElement) {
    const data = new FormData(form);
    return {
      remainingQuantity: data.get("remainingQuantity"),
      reason: data.get("reason"),
      estimatedAvailableAt: data.get("estimatedAvailableAt"),
    };
  }

  return (
    <section className="rounded-[1.75rem] border border-stone-200 bg-white p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.16em] text-stone-500">Manager controls</p>
          <h2 className="font-display mt-1 text-2xl text-stone-950">{item.name}</h2>
        </div>
        <StatusBadge status={item.status} />
      </div>
      <p className="mt-2 text-sm text-stone-600">
        {item.createdBy && item.createdAt
          ? `${statusLabel(item.status)} by ${item.createdBy.name} · ${formatTime(timezone, item.createdAt)}`
          : "Currently available."}
      </p>

      {canWrite ? (
        <form className="mt-5 space-y-3">
          <label className="block space-y-1">
            <span className="text-xs uppercase tracking-[0.14em] text-stone-500">Remaining quantity</span>
            <input
              key={`${item.id}-qty-${item.statusId ?? "open"}`}
              name="remainingQuantity"
              type="number"
              min="0"
              step="0.1"
              defaultValue={item.remainingQuantity ?? ""}
              className="w-full rounded-xl border border-stone-300 px-3 py-2.5 text-sm"
            />
          </label>
          <label className="block space-y-1">
            <span className="text-xs uppercase tracking-[0.14em] text-stone-500">Reason</span>
            <input
              key={`${item.id}-reason-${item.statusId ?? "open"}`}
              name="reason"
              defaultValue={item.reason ?? ""}
              placeholder="86 after the 7pm rush"
              className="w-full rounded-xl border border-stone-300 px-3 py-2.5 text-sm"
            />
          </label>
          <label className="block space-y-1">
            <span className="text-xs uppercase tracking-[0.14em] text-stone-500">Estimated restock</span>
            <input
              key={`${item.id}-eta-${item.statusId ?? "open"}`}
              name="estimatedAvailableAt"
              type="datetime-local"
              defaultValue={toDateTimeLocal(item.estimatedAvailableAt)}
              className="w-full rounded-xl border border-stone-300 px-3 py-2.5 text-sm"
            />
          </label>
          <div className="flex flex-wrap gap-2 pt-1">
            <button
              type="button"
              disabled={pending}
              onClick={(event) => {
                const form = event.currentTarget.form;
                if (!form) return;
                void onSubmit({
                  type: "setStatus",
                  menuItemId: item.id,
                  status: "EIGHTY_SIXED",
                  ...readForm(form),
                });
              }}
              className="rounded-full bg-[#1c1410] px-4 py-2 text-sm font-semibold text-[#fff6ea] disabled:opacity-60"
            >
              Mark 86
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={(event) => {
                const form = event.currentTarget.form;
                if (!form) return;
                void onSubmit({
                  type: "setStatus",
                  menuItemId: item.id,
                  status: "LOW_STOCK",
                  ...readForm(form),
                });
              }}
              className="rounded-full border border-orange-300 bg-orange-50 px-4 py-2 text-sm font-semibold text-orange-950 disabled:opacity-60"
            >
              Low stock
            </button>
            {item.status !== "AVAILABLE" ? (
              <button
                type="button"
                disabled={pending}
                onClick={() => void onSubmit({ type: "restore", menuItemId: item.id })}
                className="rounded-full border border-stone-300 px-4 py-2 text-sm font-semibold text-stone-800 disabled:opacity-60"
              >
                Restore available
              </button>
            ) : null}
          </div>
        </form>
      ) : (
        <p className="mt-4 text-sm text-stone-500">View only. A manager or kitchen manager can change status.</p>
      )}
    </section>
  );
}

function StatusBadge({ status }: { status: MenuAvailability }) {
  const tone =
    status === "EIGHTY_SIXED"
      ? "bg-red-100 text-red-900"
      : status === "LOW_STOCK"
        ? "bg-orange-100 text-orange-950"
        : "bg-emerald-100 text-emerald-900";

  return (
    <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] ${tone}`}>
      {statusLabel(status)}
    </span>
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
