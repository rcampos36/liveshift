"use client";

import { useMemo, useState } from "react";
import { InventoryNav } from "@/components/app/inventory-nav";
import { useInventory } from "@/components/app/use-inventory";
import {
  INVENTORY_CATEGORIES,
  INVENTORY_CATEGORY_LABELS,
  type InventoryCategory,
  type InventoryItemRecord,
  type InventorySnapshot,
} from "@/lib/inventory/types";

type Filter = "ALL" | InventoryCategory | "LOW" | "OUT" | "PAR";

function money(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: value % 1 === 0 ? 0 : 2,
  }).format(value);
}

export function InventoryBoard({
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
  const { snapshot, error, pending, submit } = useInventory(companyId, locationId, initial);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("ALL");
  const [selectedId, setSelectedId] = useState<string | "new" | null>(null);
  const selected = snapshot.items.find((item) => item.id === selectedId) ?? null;

  const matches = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return snapshot.items.filter((item) => {
      const text = `${item.name} ${item.sku ?? ""} ${item.supplier ?? ""}`.toLowerCase();
      const matchesQuery = !needle || text.includes(needle);
      const matchesFilter =
        filter === "ALL" ||
        (filter === "LOW" && item.lowStock) ||
        (filter === "OUT" && item.outOfStock) ||
        (filter === "PAR" && item.belowPar) ||
        item.category === filter;
      return matchesQuery && matchesFilter;
    });
  }, [filter, query, snapshot.items]);

  async function exportCsv() {
    const response = await fetch(
      `/api/companies/${companyId}/restaurants/${locationId}/inventory/export`,
      { cache: "no-store" },
    );
    if (!response.ok) return;
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${snapshot.restaurantName.toLowerCase().replaceAll(" ", "-")}-inventory.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-orange-800">
            Inventory · {companyName}
          </p>
          <h1 className="font-display mt-2 text-4xl text-stone-950">{snapshot.restaurantName}</h1>
          <p className="mt-2 text-stone-600">Counts, pars, and value for this house. No vendor sync yet.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => void exportCsv()}
            className="rounded-full border border-stone-300 px-4 py-2 text-sm font-medium text-stone-800"
          >
            Export CSV
          </button>
          <InventoryNav companyId={companyId} locationId={locationId} current="stock" />
        </div>
      </div>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Inventory value" value={money(snapshot.totals.inventoryValue)} />
        <Stat label="Low stock" value={String(snapshot.totals.lowStock)} />
        <Stat label="Out of stock" value={String(snapshot.totals.outOfStock)} />
        <Stat label="Below par" value={String(snapshot.totals.belowPar)} />
      </section>

      {error ? <p className="text-sm text-red-700">{error}</p> : null}

      <div className="grid gap-6 lg:grid-cols-[1.25fr_0.75fr]">
        <section className="rounded-[1.75rem] border border-stone-200 bg-white p-5">
          <div className="flex flex-wrap items-center gap-3">
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search name, SKU, or supplier"
              className="min-w-56 flex-1 rounded-xl border border-stone-300 px-3 py-2.5 text-sm"
            />
            <select
              value={filter}
              onChange={(event) => setFilter(event.target.value as Filter)}
              className="rounded-xl border border-stone-300 px-3 py-2.5 text-sm"
            >
              <option value="ALL">All items</option>
              <option value="LOW">Low stock</option>
              <option value="OUT">Out of stock</option>
              <option value="PAR">Below par</option>
              {INVENTORY_CATEGORIES.map((category) => (
                <option key={category} value={category}>
                  {INVENTORY_CATEGORY_LABELS[category]}
                </option>
              ))}
            </select>
            {snapshot.canWrite ? (
              <button
                type="button"
                onClick={() => setSelectedId("new")}
                className="rounded-full bg-[#1c1410] px-4 py-2 text-sm font-semibold text-[#fff6ea]"
              >
                Add item
              </button>
            ) : null}
          </div>

          <div className="mt-5 overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="text-xs uppercase tracking-[0.14em] text-stone-500">
                <tr>
                  <th className="px-2 py-2 font-medium">Item</th>
                  <th className="px-2 py-2 font-medium">On hand</th>
                  <th className="px-2 py-2 font-medium">Par</th>
                  <th className="px-2 py-2 font-medium">Reorder</th>
                  <th className="px-2 py-2 font-medium">Value</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {matches.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-2 py-10 text-center text-stone-500">
                      No inventory items match.
                    </td>
                  </tr>
                ) : (
                  matches.map((item) => (
                    <tr
                      key={item.id}
                      onClick={() => setSelectedId(item.id)}
                      className={`cursor-pointer ${selectedId === item.id ? "bg-[#faf6ef]" : "hover:bg-stone-50"}`}
                    >
                      <td className="px-2 py-3">
                        <p className="font-medium text-stone-950">{item.name}</p>
                        <p className="text-xs text-stone-500">
                          {INVENTORY_CATEGORY_LABELS[item.category]}
                          {item.sku ? ` · ${item.sku}` : ""}
                          {item.active ? "" : " · Inactive"}
                        </p>
                      </td>
                      <td className="px-2 py-3">
                        {item.quantityOnHand} {item.unit}
                        <Flags item={item} />
                      </td>
                      <td className="px-2 py-3">{item.parLevel}</td>
                      <td className="px-2 py-3">{item.reorderLevel}</td>
                      <td className="px-2 py-3">{money(item.value)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

        <div className="space-y-6">
          <ItemEditor
            item={selectedId === "new" ? null : selected}
            creating={selectedId === "new"}
            canWrite={snapshot.canWrite}
            pending={pending}
            onSubmit={submit}
            onCreated={() => setSelectedId(null)}
          />
          {snapshot.canWrite ? <CsvImport pending={pending} onSubmit={submit} /> : null}
        </div>
      </div>
    </div>
  );
}

function ItemEditor({
  item,
  creating,
  canWrite,
  pending,
  onSubmit,
  onCreated,
}: {
  item: InventoryItemRecord | null;
  creating: boolean;
  canWrite: boolean;
  pending: boolean;
  onSubmit: (payload: Record<string, unknown>) => Promise<boolean>;
  onCreated: () => void;
}) {
  if (!creating && !item) {
    return (
      <section className="rounded-[1.75rem] border border-dashed border-stone-300 bg-white p-5">
        <h2 className="font-display text-2xl text-stone-950">Item controls</h2>
        <p className="mt-2 text-sm text-stone-600">Select a row to edit, count, or adjust quantity.</p>
      </section>
    );
  }

  const current = item;

  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const payload = {
      name: form.get("name"),
      category: form.get("category"),
      sku: form.get("sku"),
      unit: form.get("unit"),
      quantityOnHand: form.get("quantityOnHand"),
      parLevel: form.get("parLevel"),
      reorderLevel: form.get("reorderLevel"),
      unitCost: form.get("unitCost"),
      supplier: form.get("supplier"),
      active: form.get("active") === "on",
    };
    const ok = await onSubmit(creating ? { type: "create", ...payload } : { type: "update", id: current?.id, ...payload });
    if (ok && creating) {
      event.currentTarget.reset();
      onCreated();
    }
  }

  return (
    <section className="rounded-[1.75rem] border border-stone-200 bg-white p-5">
      <h2 className="font-display text-2xl text-stone-950">{creating ? "Add inventory item" : current?.name}</h2>
      {canWrite ? (
        <>
          <form key={current?.id ?? "new"} className="mt-4 space-y-3" onSubmit={(event) => void save(event)}>
            <Field name="name" label="Name" defaultValue={current?.name} />
            <label className="block space-y-1">
              <span className="text-xs uppercase tracking-[0.14em] text-stone-500">Category</span>
              <select
                name="category"
                defaultValue={current?.category ?? "OTHER"}
                className="w-full rounded-xl border border-stone-300 px-3 py-2.5 text-sm"
              >
                {INVENTORY_CATEGORIES.map((category) => (
                  <option key={category} value={category}>
                    {INVENTORY_CATEGORY_LABELS[category]}
                  </option>
                ))}
              </select>
            </label>
            <div className="grid grid-cols-2 gap-3">
              <Field name="sku" label="SKU" defaultValue={current?.sku ?? ""} />
              <Field name="unit" label="Unit" defaultValue={current?.unit ?? "ea"} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field name="quantityOnHand" label="On hand" defaultValue={String(current?.quantityOnHand ?? 0)} />
              <Field name="unitCost" label="Unit cost" defaultValue={String(current?.unitCost ?? 0)} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field name="parLevel" label="Par level" defaultValue={String(current?.parLevel ?? 0)} />
              <Field name="reorderLevel" label="Reorder level" defaultValue={String(current?.reorderLevel ?? 0)} />
            </div>
            <Field name="supplier" label="Supplier" defaultValue={current?.supplier ?? ""} />
            <label className="flex items-center gap-2 text-sm text-stone-700">
              <input type="checkbox" name="active" defaultChecked={current?.active ?? true} />
              Active
            </label>
            <button
              type="submit"
              disabled={pending}
              className="rounded-full bg-[#1c1410] px-4 py-2 text-sm font-semibold text-[#fff6ea] disabled:opacity-60"
            >
              {pending ? "Saving..." : creating ? "Create item" : "Save item"}
            </button>
          </form>

          {!creating && current ? (
            <form
              className="mt-5 space-y-3 border-t border-stone-100 pt-5"
              onSubmit={async (event) => {
                event.preventDefault();
                const form = new FormData(event.currentTarget);
                const ok = await onSubmit({
                  type: "adjust",
                  id: current.id,
                  quantityDelta: form.get("quantityDelta"),
                  reason: form.get("reason"),
                });
                if (ok) event.currentTarget.reset();
              }}
            >
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-stone-500">
                Quantity adjustment
              </p>
              <Field name="quantityDelta" label="Adjust by" placeholder="+4 or -2" />
              <Field name="reason" label="Reason" placeholder="Prep, spoilage, delivery" />
              <button
                type="submit"
                disabled={pending}
                className="rounded-full border border-stone-300 px-4 py-2 text-sm font-semibold text-stone-800 disabled:opacity-60"
              >
                Post adjustment
              </button>
            </form>
          ) : null}
        </>
      ) : (
        <p className="mt-3 text-sm text-stone-500">View only. A manager or kitchen manager can change counts.</p>
      )}
    </section>
  );
}

function CsvImport({
  pending,
  onSubmit,
}: {
  pending: boolean;
  onSubmit: (payload: Record<string, unknown>) => Promise<boolean>;
}) {
  return (
    <section className="rounded-[1.75rem] border border-stone-200 bg-white p-5">
      <h2 className="font-display text-2xl text-stone-950">CSV import</h2>
      <p className="mt-2 text-sm text-stone-600">
        Columns: name, category, SKU, unit, quantityOnHand, parLevel, reorderLevel, unitCost, supplier, active.
      </p>
      <input
        type="file"
        accept=".csv,text/csv"
        disabled={pending}
        className="mt-4 block w-full text-sm"
        onChange={async (event) => {
          const file = event.target.files?.[0];
          if (!file) return;
          const csv = await file.text();
          await onSubmit({ type: "import", csv });
          event.target.value = "";
        }}
      />
    </section>
  );
}

function Field({
  name,
  label,
  defaultValue,
  placeholder,
}: {
  name: string;
  label: string;
  defaultValue?: string;
  placeholder?: string;
}) {
  return (
    <label className="block space-y-1">
      <span className="text-xs uppercase tracking-[0.14em] text-stone-500">{label}</span>
      <input
        name={name}
        defaultValue={defaultValue}
        placeholder={placeholder}
        className="w-full rounded-xl border border-stone-300 px-3 py-2.5 text-sm"
      />
    </label>
  );
}

function Flags({ item }: { item: InventoryItemRecord }) {
  const flags = [
    item.outOfStock ? "Out" : null,
    item.lowStock ? "Low" : null,
    item.belowPar ? "Below par" : null,
  ].filter(Boolean);

  if (flags.length === 0) return null;
  return <p className="text-xs text-orange-800">{flags.join(" · ")}</p>;
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-3xl border border-stone-200 bg-white px-5 py-4">
      <p className="text-xs uppercase tracking-[0.16em] text-stone-500">{label}</p>
      <p className="font-display mt-2 text-3xl text-stone-950">{value}</p>
    </div>
  );
}
