"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { NameEditor } from "@/components/app/name-editor";
import { useDashboardSync } from "@/components/app/use-dashboard-sync";
import type { LiveBoardData } from "@/lib/operations/types";

type BoardProps = {
  companyId: string;
  locationId: string;
  companyName: string;
  restaurantName: string;
  timezone: string;
  canWrite: boolean;
  canManageRestaurant: boolean;
  isTv: boolean;
  initialBoard: LiveBoardData;
};

function money(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: value % 1 === 0 ? 0 : 2,
  }).format(value);
}

function percent(value: number) {
  return `${value.toFixed(1)}%`;
}

function clockLabel(timezone: string, now: Date) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
  }).format(now);
}

function kpiToneClass(tone: string) {
  return tone === "gold"
    ? "bg-[#f7efe3]"
    : tone === "warn"
      ? "bg-orange-50"
      : tone === "good"
        ? "bg-emerald-50"
        : "bg-white";
}

function timeLabel(timezone: string, iso: string) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(iso));
}

export function LiveOperationsBoard({
  companyId,
  locationId,
  companyName,
  restaurantName,
  timezone,
  canWrite,
  canManageRestaurant,
  isTv,
  initialBoard,
}: BoardProps) {
  const router = useRouter();
  const [board, setBoard] = useState(initialBoard);
  const [name, setName] = useState(restaurantName);
  const [now, setNow] = useState(() => new Date());
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const endpoint = `/api/companies/${companyId}/restaurants/${locationId}/operations`;

  const refresh = useCallback(async () => {
    try {
      const response = await fetch(endpoint, { cache: "no-store" });
      const data = (await response.json()) as LiveBoardData & { error?: string };
      if (!response.ok) {
        setError(data.error ?? "Unable to refresh live board");
        return;
      }
      setBoard(data);
      setError(null);
    } catch {
      setError("Live board lost connection");
    }
  }, [endpoint]);

  const { markSeen } = useDashboardSync(companyId, locationId, refresh, initialBoard.revision);

  useEffect(() => {
    const tick = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(tick);
  }, []);

  async function submit(payload: Record<string, unknown>) {
    setPending(true);
    setError(null);
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await response.json()) as LiveBoardData & { error?: string };
      if (!response.ok) {
        setError(data.error ?? "Unable to save");
        return false;
      }
      setBoard(data);
      if (typeof data.revision === "number") {
        markSeen(data.revision);
      }
      return true;
    } catch {
      setError("Unable to save");
      return false;
    } finally {
      setPending(false);
    }
  }

  const cards = [
    { label: "Today's sales", value: money(board.cards.todaysSales), tone: "gold" },
    { label: "Sales goal", value: money(board.cards.salesGoal), tone: "plain" },
    { label: "Goal %", value: percent(board.cards.goalPercent), tone: board.cards.goalPercent >= 100 ? "good" : "plain" },
    { label: "Covers", value: String(board.cards.covers), tone: "plain" },
    { label: "Average check", value: money(board.cards.averageCheck), tone: "plain" },
    { label: "Labor %", value: percent(board.cards.laborPercent), tone: board.cards.laborPercent > 35 ? "warn" : "plain" },
    { label: "Working employees", value: String(board.cards.workingEmployees), tone: "plain" },
    { label: "86 items", value: String(board.cards.eightySixCount), tone: board.cards.eightySixCount > 0 ? "warn" : "good" },
    { label: "Low stock items", value: String(board.cards.lowStockCount), tone: board.cards.lowStockCount > 0 ? "warn" : "good" },
    { label: "Waste today", value: String(board.cards.wasteToday), tone: board.cards.wasteToday > 0 ? "warn" : "plain" },
    { label: "Open manager issues", value: String(board.cards.openIssues), tone: board.cards.openIssues > 0 ? "warn" : "good" },
    { label: "Open tasks", value: String(board.cards.openTasks), tone: board.cards.openTasks > 0 ? "plain" : "good" },
  ];

  const kicker = "text-[11px] font-semibold uppercase tracking-[0.16em] text-[#8a6a4a]";

  return (
    <div className={isTv ? "min-h-dvh px-6 py-6 text-stone-950 lg:px-10" : "space-y-6"}>
      <section className="overflow-hidden rounded-2xl border border-stone-200/80 bg-white/80 text-stone-950 shadow-[0_28px_60px_-42px_rgba(28,20,16,0.45)] backdrop-blur">
        <div className="flex flex-wrap items-end justify-between gap-4 px-5 py-6 sm:px-7">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#8a6a4a]">
              Live operations · {companyName}
            </p>
            <div className="mt-3">
            <NameEditor
              value={name}
              canEdit={canManageRestaurant && !isTv}
              onSave={async (next) => {
                const response = await fetch(`/api/companies/${companyId}/restaurants/${locationId}`, {
                  method: "PATCH",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ name: next }),
                });
                const data = (await response.json()) as { error?: string; restaurant?: { name: string } };
                if (!response.ok || !data.restaurant) {
                  throw new Error(data.error ?? "Unable to rename restaurant");
                }
                setName(data.restaurant.name);
                router.refresh();
              }}
              displayClassName={`font-display tracking-tight text-stone-950 ${isTv ? "text-5xl xl:text-6xl" : "text-[2.65rem] leading-[1.05]"}`}
              tone="light"
            />
            </div>
            <p className="mt-3 text-sm tabular-nums text-stone-500">{clockLabel(timezone, now)}</p>
          </div>
          <div className="flex flex-wrap items-center gap-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-stone-400">
            <span className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-emerald-800">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              Live
            </span>
            <span className="tabular-nums">Updated {timeLabel(timezone, board.updatedAt)}</span>
            {!isTv ? (
              <Link
                href={`/dashboard/c/${companyId}/r/${locationId}?display=tv`}
                className="rounded-full bg-[#1c1410] px-3 py-1 font-semibold text-[#fff6ea]"
              >
                TV display
              </Link>
            ) : null}
          </div>
        </div>

        <div className="px-5 pb-6 sm:px-7">
          <div className="grid gap-px overflow-hidden rounded-xl bg-stone-200/80 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-6">
            {cards.map((card) => (
              <article
                key={card.label}
                className={`px-4 py-4 ${isTv ? "min-h-28" : ""} ${kpiToneClass(card.tone)}`}
              >
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-stone-400">{card.label}</p>
                <p
                  className={`font-display mt-2 tracking-tight tabular-nums text-stone-950 ${
                    isTv ? "text-4xl xl:text-5xl" : "text-[1.85rem]"
                  }`}
                >
                  {card.value}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {error ? <p className="text-sm text-red-700">{error}</p> : null}

      <div className={`grid gap-4 ${isTv ? "xl:grid-cols-3" : "lg:grid-cols-2 xl:grid-cols-3"}`}>
        <BoardSection title="Sales" isTv={isTv}>
          {!isTv ? (
            <div className="mb-3 flex justify-end">
              <Link
                href={`/dashboard/c/${companyId}/r/${locationId}/sales`}
                className="text-xs font-semibold uppercase tracking-[0.12em] opacity-70 hover:opacity-100"
              >
                Open
              </Link>
            </div>
          ) : null}
          <Line label="Today" value={money(board.daily.salesAmount)} />
          <Line label="Goal" value={money(board.daily.salesGoal)} />
          <Line label="Covers" value={String(board.daily.covers)} />
          <Line label="Labor cost" value={money(board.daily.laborCost)} />
          <div className="mt-4 h-2 overflow-hidden rounded-full bg-stone-200">
            <div
              className="h-full rounded-full bg-[#c4a27a]"
              style={{ width: `${Math.min(board.cards.goalPercent, 100)}%` }}
            />
          </div>
        </BoardSection>

        <BoardSection title="Inventory" isTv={isTv}>
          <p className={`mb-3 ${kicker}`}>Menu low stock</p>
          <ItemList
            isTv={isTv}
            empty="No menu items are low."
            items={board.menuLowStock.map((item) => ({
              id: item.id,
              title: item.name,
              meta: [
                item.remainingQuantity != null ? `${item.remainingQuantity} left` : null,
                item.reason,
                timeLabel(timezone, item.createdAt),
              ]
                .filter(Boolean)
                .join(" · "),
            }))}
          />
          <div className="mb-3 mt-6 flex items-center justify-between gap-3">
            <p className={kicker}>Inventory alerts</p>
            {!isTv ? (
              <Link
                href={`/dashboard/c/${companyId}/r/${locationId}/inventory`}
                className="text-xs font-semibold uppercase tracking-[0.12em] opacity-70 hover:opacity-100"
              >
                Open
              </Link>
            ) : null}
          </div>
          <ItemList
            isTv={isTv}
            empty="All pars are covered."
            items={board.lowStock.map((item) => ({
              id: item.id,
              title: item.name,
              meta: `${item.quantity} on hand · par ${item.parLevel} · reorder ${item.reorderPoint} ${item.unit}`,
            }))}
          />
        </BoardSection>

        <BoardSection title="Kitchen" isTv={isTv}>
          <div className="mb-3 flex items-center justify-between gap-3">
            <p className={kicker}>86 board</p>
            {!isTv ? (
              <Link
                href={`/dashboard/c/${companyId}/r/${locationId}/86/board`}
                className="text-xs font-semibold uppercase tracking-[0.12em] opacity-70 hover:opacity-100"
              >
                Open
              </Link>
            ) : null}
          </div>
          <ItemList
            isTv={isTv}
            empty="Nothing 86'd."
            items={board.eightySix.map((item) => ({
              id: item.id,
              title: item.name,
              meta: [
                item.remainingQuantity != null ? `${item.remainingQuantity} left` : null,
                item.reason,
                timeLabel(timezone, item.createdAt),
              ]
                .filter(Boolean)
                .join(" · "),
              action: canWrite && !isTv ? () => submit({ type: "clearEightySix", menuItemId: item.menuItemId }) : undefined,
              actionLabel: "Restore",
            }))}
          />
          <div className="mb-3 mt-6 flex items-center justify-between gap-3">
            <p className={kicker}>Waste today</p>
            {!isTv ? (
              <Link
                href={`/dashboard/c/${companyId}/r/${locationId}/waste`}
                className="text-xs font-semibold uppercase tracking-[0.12em] opacity-70 hover:opacity-100"
              >
                Open
              </Link>
            ) : null}
          </div>
          <ItemList
            isTv={isTv}
            empty="No waste logged."
            items={board.waste.map((item) => ({
              id: item.id,
              title: item.itemName,
              meta: `${item.quantity} ${item.unit} · $${item.totalCost.toFixed(2)} · ${item.reason.replaceAll("_", " ").toLowerCase()} · ${timeLabel(timezone, item.createdAt)}`,
            }))}
          />
        </BoardSection>

        <BoardSection title="Staff" isTv={isTv}>
          {!isTv ? (
            <div className="mb-3 flex justify-end">
              <Link
                href={`/dashboard/c/${companyId}/r/${locationId}/staffing`}
                className="text-xs font-semibold uppercase tracking-[0.12em] opacity-70 hover:opacity-100"
              >
                Open
              </Link>
            </div>
          ) : null}
          <ItemList
            isTv={isTv}
            empty="No one clocked in."
            items={board.staff.map((item) => ({
              id: item.id,
              title: item.name,
              meta: `${item.station ?? "Floor"} · in ${timeLabel(timezone, item.clockedInAt)}`,
              action: canWrite && !isTv ? () => submit({ type: "clockOut", id: item.id }) : undefined,
              actionLabel: "Clock out",
            }))}
          />
        </BoardSection>

        <BoardSection title="Manager log" isTv={isTv} className="xl:col-span-2">
          <div className={`grid gap-6 ${isTv ? "lg:grid-cols-3" : "md:grid-cols-3"}`}>
            <div>
              <p className={`mb-3 ${kicker}`}>Open issues</p>
              <ItemList
            isTv={isTv}
                empty="No open issues."
                items={board.issues.map((item) => ({
                  id: item.id,
                  title: item.title,
                  meta: timeLabel(timezone, item.createdAt),
                  action: canWrite && !isTv ? () => submit({ type: "resolveIssue", id: item.id }) : undefined,
                  actionLabel: "Resolve",
                }))}
              />
            </div>
            <div>
              <div className="mb-3 flex items-center justify-between gap-3">
                <p className={kicker}>Open tasks</p>
                {!isTv ? (
                  <Link
                    href={`/dashboard/c/${companyId}/r/${locationId}/tasks`}
                    className="text-xs font-semibold uppercase tracking-[0.12em] opacity-70 hover:opacity-100"
                  >
                    Open
                  </Link>
                ) : null}
              </div>
              <ItemList
            isTv={isTv}
                empty="No open tasks."
                items={board.tasks.map((item) => ({
                  id: item.id,
                  title: item.title,
                  meta: timeLabel(timezone, item.createdAt),
                  action: canWrite && !isTv ? () => submit({ type: "completeTask", id: item.id }) : undefined,
                  actionLabel: "Done",
                }))}
              />
            </div>
            <div>
              <div className="mb-3 flex items-center justify-between gap-3">
                <p className={kicker}>Unresolved log</p>
                {!isTv ? (
                  <Link
                    href={`/dashboard/c/${companyId}/r/${locationId}/manager-log`}
                    className="text-xs font-semibold uppercase tracking-[0.12em] opacity-70 hover:opacity-100"
                  >
                    Open
                  </Link>
                ) : null}
              </div>
              <ItemList
            isTv={isTv}
                empty="No unresolved hand-off notes."
                items={board.logs.map((item) => ({
                  id: item.id,
                  title: item.body,
                  meta: `${item.category ?? "Note"} · ${timeLabel(timezone, item.createdAt)}`,
                }))}
              />
            </div>
          </div>
        </BoardSection>
      </div>

      {canWrite && !isTv ? (
        <ManualInputs daily={board.daily} pending={pending} onSubmit={submit} />
      ) : null}
    </div>
  );
}

function BoardSection({
  title,
  children,
  isTv,
  className = "",
}: {
  title: string;
  children: React.ReactNode;
  isTv: boolean;
  className?: string;
}) {
  return (
    <section
      className={`rounded-2xl border border-stone-200/80 bg-white/80 px-5 py-5 text-stone-950 shadow-[0_28px_60px_-42px_rgba(28,20,16,0.45)] backdrop-blur ${className}`}
    >
      <h2 className={`font-display tracking-tight ${isTv ? "text-3xl" : "text-2xl"}`}>{title}</h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function Line({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-current/10 py-2 text-sm last:border-0">
      <span className="opacity-65">{label}</span>
      <span className="font-medium tabular-nums">{value}</span>
    </div>
  );
}

function ItemList({
  items,
  empty,
  isTv,
}: {
  empty: string;
  isTv: boolean;
  items: Array<{
    id: string;
    title: string;
    meta?: string;
    action?: () => Promise<boolean>;
    actionLabel?: string;
  }>;
}) {
  if (items.length === 0) {
    return <p className="text-sm opacity-60">{empty}</p>;
  }

  return (
    <ul className="space-y-2">
      {items.map((item) => (
        <li key={item.id} className="flex items-start justify-between gap-3 rounded-xl bg-[#faf6ef] px-3 py-2.5">
          <div>
            <p className="text-sm font-medium">{item.title}</p>
            {item.meta ? <p className="mt-0.5 text-xs opacity-60">{item.meta}</p> : null}
          </div>
          {item.action ? (
            <button
              type="button"
              onClick={() => void item.action?.()}
              className="shrink-0 text-xs font-semibold uppercase tracking-[0.12em] opacity-70 hover:opacity-100"
            >
              {item.actionLabel}
            </button>
          ) : null}
        </li>
      ))}
    </ul>
  );
}

function ManualInputs({
  daily,
  pending,
  onSubmit,
}: {
  daily: LiveBoardData["daily"];
  pending: boolean;
  onSubmit: (payload: Record<string, unknown>) => Promise<boolean>;
}) {
  return (
    <section className="rounded-2xl border border-stone-200/80 bg-white/80 p-5 shadow-[0_28px_60px_-42px_rgba(28,20,16,0.45)] backdrop-blur sm:p-6">
      <h2 className="font-display text-2xl tracking-tight text-stone-950">Manual inputs</h2>
      <p className="mt-1 text-sm text-stone-600">
        No POS connection yet. Managers update tonight&apos;s board from this house.
      </p>
      <div className="mt-6 grid gap-6 xl:grid-cols-3">
        <form
          className="space-y-3"
          onSubmit={async (event) => {
            event.preventDefault();
            const form = new FormData(event.currentTarget);
            await onSubmit({
              type: "updateSales",
              salesAmount: form.get("salesAmount"),
              salesGoal: form.get("salesGoal"),
              covers: form.get("covers"),
              laborCost: form.get("laborCost"),
            });
          }}
        >
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-stone-500">Sales pulse</p>
          <Input name="salesAmount" label="Today's sales" defaultValue={String(daily.salesAmount)} />
          <Input name="salesGoal" label="Sales goal" defaultValue={String(daily.salesGoal)} />
          <Input name="covers" label="Covers" defaultValue={String(daily.covers)} />
          <Input name="laborCost" label="Labor cost" defaultValue={String(daily.laborCost)} />
          <SaveButton pending={pending} label="Update sales" />
        </form>

        <div className="space-y-5">
          <QuickAdd
            pending={pending}
            title="86 item"
            name="name"
            placeholder="Branzino"
            onSubmit={(value) => onSubmit({ type: "addEightySix", name: value })}
          />
          <QuickAdd
            pending={pending}
            title="Waste"
            name="itemName"
            placeholder="Tomatoes"
            extra={
              <>
                <Input name="quantity" label="Qty" defaultValue="1" />
                <Input name="unit" label="Unit" defaultValue="lb" />
              </>
            }
            onSubmitForm={(form) =>
              onSubmit({
                type: "addWaste",
                itemName: form.get("itemName"),
                quantity: form.get("quantity"),
                unit: form.get("unit"),
              })
            }
          />
          <form
            className="space-y-3"
            onSubmit={async (event) => {
              event.preventDefault();
              const form = new FormData(event.currentTarget);
              const ok = await onSubmit({
                type: "upsertInventory",
                name: form.get("name"),
                quantity: form.get("quantity"),
                reorderPoint: form.get("reorderPoint"),
                unit: form.get("unit") || "ea",
              });
              if (ok) event.currentTarget.reset();
            }}
          >
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-stone-500">Inventory count</p>
            <Input name="name" label="Item" placeholder="Avocado" />
            <div className="grid grid-cols-3 gap-2">
              <Input name="quantity" label="Qty" defaultValue="0" />
              <Input name="reorderPoint" label="Par" defaultValue="0" />
              <Input name="unit" label="Unit" defaultValue="ea" />
            </div>
            <SaveButton pending={pending} label="Save count" />
          </form>
        </div>

        <div className="space-y-5">
          <QuickAdd
            pending={pending}
            title="Manager issue"
            name="title"
            placeholder="Walk-in warmer than spec"
            onSubmit={(value) => onSubmit({ type: "addIssue", title: value })}
          />
          <QuickAdd
            pending={pending}
            title="Task"
            name="title"
            placeholder="Fire tortillas for the 8pm rush"
            onSubmit={(value) => onSubmit({ type: "addTask", title: value })}
          />
          <form
            className="space-y-3"
            onSubmit={async (event) => {
              event.preventDefault();
              const form = new FormData(event.currentTarget);
              const ok = await onSubmit({
                type: "clockIn",
                name: form.get("name"),
                station: form.get("station"),
              });
              if (ok) event.currentTarget.reset();
            }}
          >
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-stone-500">Clock in</p>
            <Input name="name" label="Name" placeholder="Ana Ruiz" />
            <Input name="station" label="Station" placeholder="Expo" />
            <SaveButton pending={pending} label="Clock in" />
          </form>
          <QuickAdd
            pending={pending}
            title="Manager note"
            name="body"
            placeholder="86 branzino after the 7pm rush."
            onSubmit={(value) => onSubmit({ type: "addLog", body: value })}
          />
        </div>
      </div>
    </section>
  );
}

function QuickAdd({
  title,
  name,
  placeholder,
  pending,
  extra,
  onSubmit,
  onSubmitForm,
}: {
  title: string;
  name: string;
  placeholder: string;
  pending: boolean;
  extra?: React.ReactNode;
  onSubmit?: (value: string) => Promise<boolean>;
  onSubmitForm?: (form: FormData) => Promise<boolean>;
}) {
  return (
    <form
      className="space-y-3"
      onSubmit={async (event) => {
        event.preventDefault();
        const form = new FormData(event.currentTarget);
        const ok = onSubmitForm
          ? await onSubmitForm(form)
          : await onSubmit?.(String(form.get(name) ?? ""));
        if (ok) event.currentTarget.reset();
      }}
    >
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-stone-500">{title}</p>
      <Input name={name} label={title} placeholder={placeholder} />
      {extra}
      <SaveButton pending={pending} label="Add" />
    </form>
  );
}

function Input({
  name,
  label,
  placeholder,
  defaultValue,
}: {
  name: string;
  label: string;
  placeholder?: string;
  defaultValue?: string;
}) {
  return (
    <label className="block space-y-1">
      <span className="sr-only">{label}</span>
      <input
        name={name}
        defaultValue={defaultValue}
        placeholder={placeholder ?? label}
        className="w-full rounded-xl border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900"
      />
    </label>
  );
}

function SaveButton({ pending, label }: { pending: boolean; label: string }) {
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-full bg-[#1c1410] px-4 py-2 text-sm font-semibold text-[#fff6ea] disabled:opacity-60"
    >
      {pending ? "Saving..." : label}
    </button>
  );
}
