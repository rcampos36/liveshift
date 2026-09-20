"use client";

import Link from "next/link";
import { EightySixNav } from "@/components/app/eighty-six-nav";
import { useEightySix } from "@/components/app/use-eighty-six";
import { formatTime, statusLabel } from "@/lib/eighty-six/display";
import type { EightySixSnapshot, MenuItemRecord } from "@/lib/eighty-six/types";

export function EightySixLiveBoard({
  companyId,
  locationId,
  companyName,
  isTv,
  initial,
}: {
  companyId: string;
  locationId: string;
  companyName: string;
  isTv: boolean;
  initial: EightySixSnapshot;
}) {
  const { snapshot, error, pending, submit } = useEightySix(companyId, locationId, initial);

  return (
    <div className={isTv ? "min-h-dvh px-6 py-6 text-stone-950 lg:px-10" : "mx-auto max-w-6xl space-y-6"}>
      <div className={`flex flex-wrap items-end justify-between gap-4 ${isTv ? "mb-6" : ""}`}>
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#8a6a4a]">
            Live 86 board · {companyName}
          </p>
          <h1 className={`font-display mt-2 text-stone-950 ${isTv ? "text-5xl xl:text-6xl" : "text-4xl"}`}>
            {snapshot.restaurantName}
          </h1>
          <p className="mt-2 text-stone-600">
            {snapshot.board.eightySixed.length} 86 · {snapshot.board.lowStock.length} low stock
          </p>
        </div>
        {isTv ? (
          <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs uppercase tracking-[0.16em] text-emerald-800">
            Live
          </span>
        ) : (
          <div className="flex flex-wrap items-center gap-3">
            <Link
              href={`/dashboard/c/${companyId}/r/${locationId}/86/board?display=tv`}
              className="rounded-full bg-[#1c1410] px-4 py-2 text-sm font-semibold text-[#fff6ea]"
            >
              TV display
            </Link>
            <EightySixNav companyId={companyId} locationId={locationId} current="board" />
          </div>
        )}
      </div>

      {error ? <p className="text-sm text-red-700">{error}</p> : null}

      <div className={`grid gap-4 ${isTv ? "xl:grid-cols-2" : "lg:grid-cols-2"}`}>
        <BoardColumn
          title="86"
          empty="Nothing 86'd."
          isTv={isTv}
          items={snapshot.board.eightySixed}
          timezone={snapshot.timezone}
          canWrite={snapshot.canWrite && !isTv}
          pending={pending}
          onRestore={(menuItemId) => submit({ type: "restore", menuItemId })}
        />
        <BoardColumn
          title="Low stock"
          empty="No low-stock items."
          isTv={isTv}
          items={snapshot.board.lowStock}
          timezone={snapshot.timezone}
          canWrite={snapshot.canWrite && !isTv}
          pending={pending}
          onRestore={(menuItemId) => submit({ type: "restore", menuItemId })}
        />
      </div>
    </div>
  );
}

function BoardColumn({
  title,
  empty,
  isTv,
  items,
  timezone,
  canWrite,
  pending,
  onRestore,
}: {
  title: string;
  empty: string;
  isTv: boolean;
  items: MenuItemRecord[];
  timezone: string;
  canWrite: boolean;
  pending: boolean;
  onRestore: (menuItemId: string) => Promise<boolean>;
}) {
  return (
    <section className={`rounded-2xl border border-stone-200/80 bg-white/80 p-5 text-stone-950 shadow-[0_28px_60px_-42px_rgba(28,20,16,0.45)] backdrop-blur ${isTv ? "p-6" : ""}`}>
      <h2 className={`font-display tracking-tight text-stone-950 ${isTv ? "text-4xl" : "text-2xl"}`}>
        {title}
      </h2>
      {items.length === 0 ? (
        <p className="mt-6 text-sm text-stone-500">{empty}</p>
      ) : (
        <ul className="mt-5 space-y-3">
          {items.map((item) => (
            <li
              key={item.id}
              className="rounded-2xl bg-[#faf6ef] px-4 py-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className={`font-display text-stone-950 ${isTv ? "text-3xl" : "text-2xl"}`}>{item.name}</p>
                  <p className="mt-1 text-sm text-stone-600">
                    {statusLabel(item.status)}
                    {item.remainingQuantity != null ? ` · ${item.remainingQuantity} left` : ""}
                    {item.estimatedAvailableAt
                      ? ` · back ${formatTime(timezone, item.estimatedAvailableAt)}`
                      : ""}
                  </p>
                  {item.reason ? (
                    <p className="mt-1 text-sm text-stone-500">{item.reason}</p>
                  ) : null}
                </div>
                {canWrite ? (
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => void onRestore(item.menuItemId)}
                    className="shrink-0 text-xs font-semibold uppercase tracking-[0.12em] text-stone-600 hover:text-stone-950 disabled:opacity-60"
                  >
                    Restore
                  </button>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
