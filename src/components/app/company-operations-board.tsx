"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { NameEditor } from "@/components/app/name-editor";
import { useCompanyOperations } from "@/components/app/use-company-operations";
import {
  HOUSE_ATTENTION_LABELS,
  type CompanyOperationsSnapshot,
  type HouseOperationsCard,
} from "@/lib/company-operations/types";

function money(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

function percent(value: number) {
  const rounded = Math.round(value * 10) / 10;
  return `${Number.isInteger(rounded) ? rounded.toFixed(0) : rounded.toFixed(1)}%`;
}

export function CompanyOperationsBoard({
  companyId,
  companyName,
  canManageCompany,
  canManageRestaurants,
  canManageUsers,
  initial,
}: {
  companyId: string;
  companyName: string;
  canManageCompany: boolean;
  canManageRestaurants: boolean;
  canManageUsers: boolean;
  initial: CompanyOperationsSnapshot;
}) {
  const router = useRouter();
  const { snapshot, error, refresh } = useCompanyOperations(companyId, initial);

  async function renameCompany(name: string) {
    const response = await fetch(`/api/companies/${companyId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    const data = (await response.json()) as { error?: string };
    if (!response.ok) {
      throw new Error(data.error ?? "Unable to rename company");
    }
    await refresh();
    router.refresh();
  }

  return (
    <div className="mx-auto max-w-6xl space-y-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#8a6a4a]">Company operations</p>
          <div className="mt-3">
            <NameEditor
              value={snapshot.companyName || companyName}
              canEdit={canManageCompany}
              onSave={renameCompany}
              displayClassName="font-display text-[2.65rem] leading-[1.05] tracking-tight text-stone-950"
            />
          </div>
          <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-stone-500">
            {snapshot.houses.length} restaurant{snapshot.houses.length === 1 ? "" : "s"} across the group. Select a
            house to open its live board.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href={`/dashboard/c/${companyId}/waste`}
            className="rounded-full border border-stone-200/90 bg-white/70 px-4 py-2 text-[13px] font-medium text-stone-800 hover:bg-white"
          >
            Waste
          </Link>
          {canManageUsers ? (
            <Link
              href={`/dashboard/c/${companyId}/team`}
              className="rounded-full border border-stone-200/90 bg-white/70 px-4 py-2 text-[13px] font-medium text-stone-800 hover:bg-white"
            >
              Team
            </Link>
          ) : null}
          {canManageRestaurants ? (
            <Link
              href={`/dashboard/c/${companyId}/restaurants/new`}
              className="rounded-full bg-[#1c1410] px-4 py-2 text-[13px] font-medium text-[#fff6ea] hover:bg-[#2a211c]"
            >
              Add restaurant
            </Link>
          ) : null}
        </div>
      </div>

      <section className="overflow-hidden rounded-2xl border border-stone-200/80 bg-white/75 shadow-[0_28px_60px_-42px_rgba(28,20,16,0.55)] backdrop-blur">
        <div className="grid sm:grid-cols-2 xl:grid-cols-4">
          <StatCell label="Company sales" value={money(snapshot.totals.sales)} />
          <StatCell label="Company waste" value={money(snapshot.totals.wasteCost)} />
          <StatCell label="86 items" value={String(snapshot.totals.eightySixCount)} />
          <StatCell
            label="Need attention"
            value={String(snapshot.totals.housesNeedingAttention)}
            warn={snapshot.totals.housesNeedingAttention > 0}
            last
          />
        </div>
      </section>

      {error ? <p className="text-sm text-red-700">{error}</p> : null}

      {snapshot.houses.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-stone-300/80 bg-white/50 px-6 py-16 text-center">
          <p className="font-display text-2xl tracking-tight text-stone-950">No houses yet</p>
          <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-stone-500">
            Add a restaurant to start comparing sales, labor, waste, and 86s across the company.
          </p>
        </div>
      ) : (
        <div className="grid gap-5 lg:grid-cols-2">
          {snapshot.houses.map((house) => (
            <HouseCard
              key={house.restaurantId}
              companyId={companyId}
              house={house}
              canRename={canManageRestaurants}
              onRenamed={async () => {
                await refresh();
                router.refresh();
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function HouseCard({
  companyId,
  house,
  canRename,
  onRenamed,
}: {
  companyId: string;
  house: HouseOperationsCard;
  canRename: boolean;
  onRenamed: () => Promise<void>;
}) {
  async function renameRestaurant(name: string) {
    const response = await fetch(`/api/companies/${companyId}/restaurants/${house.restaurantId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    const data = (await response.json()) as { error?: string };
    if (!response.ok) {
      throw new Error(data.error ?? "Unable to rename restaurant");
    }
    await onRenamed();
  }

  return (
    <article
      className={`relative overflow-hidden rounded-2xl border bg-white/80 shadow-[0_28px_60px_-42px_rgba(28,20,16,0.45)] backdrop-blur ${
        house.needsAttention ? "border-orange-200/90" : "border-stone-200/80"
      }`}
    >
      <span
        aria-hidden
        className={`absolute inset-y-0 left-0 w-[3px] ${house.needsAttention ? "bg-orange-400" : "bg-[#e8c9a0]"}`}
      />
      <div className="flex flex-wrap items-start justify-between gap-3 px-6 pb-4 pt-5 pl-7">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-stone-400">Restaurant</p>
          <div className="mt-1.5">
            <NameEditor
              value={house.restaurantName}
              canEdit={canRename}
              onSave={renameRestaurant}
              displayClassName="font-display text-[1.85rem] leading-none tracking-tight text-stone-950"
            />
          </div>
        </div>
        {house.needsAttention ? (
          <span className="rounded-full bg-orange-100/90 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-orange-950">
            Needs attention
          </span>
        ) : (
          <span className="rounded-full bg-emerald-50 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-emerald-900">
            On track
          </span>
        )}
      </div>

      <Link href={`/dashboard/c/${companyId}/r/${house.restaurantId}`} className="block">
        <dl className="mx-6 mb-4 grid grid-cols-2 overflow-hidden rounded-xl border border-stone-100 bg-[#faf6ef]/70 sm:grid-cols-5">
          <Metric label="Sales" value={money(house.sales)} />
          <Metric label="Goal" value={percent(house.goalPercent)} warn={house.attention.includes("BEHIND_GOAL")} />
          <Metric label="Labor" value={percent(house.laborPercent)} warn={house.attention.includes("HIGH_LABOR")} />
          <Metric label="Waste" value={money(house.wasteCost)} warn={house.attention.includes("HIGH_WASTE")} />
          <Metric label="86" value={String(house.eightySixCount)} warn={house.attention.includes("MANY_EIGHTY_SIX")} last />
        </dl>

        {house.attention.length > 0 ? (
          <p className="px-6 text-[11px] font-medium uppercase tracking-[0.14em] text-orange-900/80">
            {house.attention.map((reason) => HOUSE_ATTENTION_LABELS[reason]).join(" · ")}
          </p>
        ) : null}

        <div className="mt-4 flex items-center justify-between border-t border-stone-100 px-6 py-3.5 text-[12px] font-medium text-[#8a6a4a]">
          <span>Open live board</span>
          <span aria-hidden>→</span>
        </div>
      </Link>
    </article>
  );
}

function Metric({ label, value, warn, last = false }: { label: string; value: string; warn?: boolean; last?: boolean }) {
  return (
    <div className={`px-3 py-3 ${last ? "" : "border-b border-stone-100 sm:border-b-0 sm:border-r"}`}>
      <dt className="text-[10px] font-semibold uppercase tracking-[0.16em] text-stone-400">{label}</dt>
      <dd className={`mt-1 text-[15px] font-semibold tabular-nums tracking-tight ${warn ? "text-orange-900" : "text-stone-950"}`}>
        {value}
      </dd>
    </div>
  );
}

function StatCell({
  label,
  value,
  warn,
  last = false,
}: {
  label: string;
  value: string;
  warn?: boolean;
  last?: boolean;
}) {
  return (
    <div
      className={`px-6 py-5 ${last ? "" : "border-b border-stone-100 sm:border-b xl:border-b-0 xl:border-r"} ${
        warn ? "bg-orange-50/70" : ""
      }`}
    >
      <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-stone-400">{label}</p>
      <p className="font-display mt-2 text-[2rem] leading-none tracking-tight tabular-nums text-stone-950">{value}</p>
    </div>
  );
}
