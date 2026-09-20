"use client";

import { useState } from "react";
import { useManagerLog } from "@/components/app/use-manager-log";
import {
  MANAGER_LOG_CATEGORIES,
  MANAGER_LOG_CATEGORY_LABELS,
  MANAGER_LOG_PRIORITIES,
  MANAGER_LOG_PRIORITY_LABELS,
  type ManagerLogCategory,
  type ManagerLogRecord,
  type ManagerLogSnapshot,
} from "@/lib/manager-log/types";

function timeLabel(value: string, timeZone: string) {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(new Date(value));
}

export function ManagerLogBoard({
  companyId,
  locationId,
  companyName,
  initial,
}: {
  companyId: string;
  locationId: string;
  companyName: string;
  initial: ManagerLogSnapshot;
}) {
  const [selectedDate, setSelectedDate] = useState(initial.selectedDate);
  const [filter, setFilter] = useState<"ALL" | ManagerLogCategory>("ALL");
  const { snapshot, error, pending, submit } = useManagerLog(companyId, locationId, selectedDate, initial);
  const match = (rows: ManagerLogRecord[]) => rows.filter((row) => filter === "ALL" || row.category === filter);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-orange-800">
            Manager log · {companyName}
          </p>
          <h1 className="font-display mt-2 text-4xl text-stone-950">{snapshot.restaurantName}</h1>
          <p className="mt-2 text-stone-600">
            Shift handoff for {snapshot.selectedDate}. Review unresolved issues from {snapshot.previousDate} before taking the floor.
          </p>
        </div>
        <label className="text-xs uppercase tracking-[0.14em] text-stone-500">
          Business date
          <input
            type="date"
            value={selectedDate}
            onChange={(event) => setSelectedDate(event.target.value)}
            className="mt-1 block rounded-xl border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900"
          />
        </label>
      </div>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <Stat label="Today's entries" value={String(snapshot.kpis.today)} />
        <Stat label="Unresolved today" value={String(snapshot.kpis.unresolvedToday)} warn={snapshot.kpis.unresolvedToday > 0} />
        <Stat label="Previous shift" value={String(snapshot.kpis.previousUnresolved)} warn={snapshot.kpis.previousUnresolved > 0} />
        <Stat label="Older open" value={String(snapshot.kpis.carryForward)} warn={snapshot.kpis.carryForward > 0} />
        <Stat label="High / urgent open" value={String(snapshot.kpis.urgentOpen)} warn={snapshot.kpis.urgentOpen > 0} />
      </section>

      <div className="flex flex-wrap gap-2">
        <Chip active={filter === "ALL"} label="All" onClick={() => setFilter("ALL")} />
        {MANAGER_LOG_CATEGORIES.map((category) => (
          <Chip
            key={category}
            active={filter === category}
            label={MANAGER_LOG_CATEGORY_LABELS[category]}
            onClick={() => setFilter(category)}
          />
        ))}
      </div>

      {error ? <p className="text-sm text-red-700">{error}</p> : null}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(20rem,0.8fr)]">
        <div className="space-y-6">
          <LogSection
            title="Previous shift"
            empty="No unresolved issues from the previous shift."
            rows={match(snapshot.previousShift)}
            timezone={snapshot.timezone}
            canWrite={snapshot.canWrite}
            pending={pending}
            onSubmit={submit}
            highlight
          />
          {snapshot.carryForward.length > 0 ? (
            <LogSection
              title="Still open from earlier"
              empty="No older unresolved issues."
              rows={match(snapshot.carryForward)}
              timezone={snapshot.timezone}
              canWrite={snapshot.canWrite}
              pending={pending}
              onSubmit={submit}
              highlight
            />
          ) : null}
          <LogSection
            title={`Today · ${snapshot.selectedDate}`}
            empty="No manager log entries for this date."
            rows={match(snapshot.today)}
            timezone={snapshot.timezone}
            canWrite={snapshot.canWrite}
            pending={pending}
            onSubmit={submit}
          />
        </div>
        {snapshot.canWrite ? (
          <LogForm selectedDate={selectedDate} pending={pending} onSubmit={submit} />
        ) : null}
      </div>
    </div>
  );
}

function LogSection({
  title,
  empty,
  rows,
  timezone,
  canWrite,
  pending,
  onSubmit,
  highlight,
}: {
  title: string;
  empty: string;
  rows: ManagerLogRecord[];
  timezone: string;
  canWrite: boolean;
  pending: boolean;
  onSubmit: (payload: Record<string, unknown>) => Promise<boolean>;
  highlight?: boolean;
}) {
  return (
    <section>
      <h2 className="font-display text-2xl text-stone-950">{title}</h2>
      {rows.length === 0 ? (
        <p className="mt-3 rounded-[1.5rem] border border-stone-200 bg-white p-5 text-stone-500">{empty}</p>
      ) : (
        <div className="mt-3 space-y-3">
          {rows.map((row) => (
            <article
              key={row.id}
              className={`rounded-[1.5rem] border p-5 ${
                highlight && !row.resolved ? "border-orange-200 bg-orange-50" : "border-stone-200 bg-white"
              }`}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-stone-500">
                    {MANAGER_LOG_CATEGORY_LABELS[row.category]} · {MANAGER_LOG_PRIORITY_LABELS[row.priority]} · {row.businessDate}
                  </p>
                  <p className="mt-2 text-stone-950">{row.description}</p>
                </div>
                <span className={`rounded-full px-3 py-1 text-xs font-semibold ${row.resolved ? "bg-emerald-100 text-emerald-900" : "bg-orange-100 text-orange-900"}`}>
                  {row.resolved ? "Resolved" : "Unresolved"}
                </span>
              </div>
              <p className="mt-3 text-sm text-stone-600">
                Logged {timeLabel(row.createdAt, timezone)}
                {row.createdByName ? ` by ${row.createdByName}` : ""}
                {row.resolved
                  ? ` · Resolved${row.resolvedByName ? ` by ${row.resolvedByName}` : ""}${row.resolvedAt ? ` at ${timeLabel(row.resolvedAt, timezone)}` : ""}`
                  : ""}
              </p>
              {canWrite ? (
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => onSubmit({ type: row.resolved ? "reopen" : "resolve", id: row.id })}
                  className="mt-3 rounded-full border border-stone-300 px-3 py-1.5 text-xs font-medium text-stone-800 disabled:opacity-60"
                >
                  {row.resolved ? "Reopen" : "Mark resolved"}
                </button>
              ) : null}
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

function LogForm({
  selectedDate,
  pending,
  onSubmit,
}: {
  selectedDate: string;
  pending: boolean;
  onSubmit: (payload: Record<string, unknown>) => Promise<boolean>;
}) {
  return (
    <section className="rounded-[1.75rem] border border-stone-200 bg-white p-5">
      <h2 className="font-display text-2xl text-stone-950">Add log entry</h2>
      <form
        className="mt-4 space-y-3"
        onSubmit={(event) => {
          event.preventDefault();
          const form = new FormData(event.currentTarget);
          void onSubmit({
            type: "create",
            businessDate: selectedDate,
            category: form.get("category"),
            priority: form.get("priority"),
            description: form.get("description"),
          }).then((ok) => {
            if (ok) event.currentTarget.reset();
          });
        }}
      >
        <label className="block space-y-1">
          <span className="text-xs uppercase tracking-[0.14em] text-stone-500">Category</span>
          <select name="category" defaultValue="SHIFT_NOTE" className="w-full rounded-xl border border-stone-300 px-3 py-2.5 text-sm">
            {MANAGER_LOG_CATEGORIES.map((category) => (
              <option key={category} value={category}>
                {MANAGER_LOG_CATEGORY_LABELS[category]}
              </option>
            ))}
          </select>
        </label>
        <label className="block space-y-1">
          <span className="text-xs uppercase tracking-[0.14em] text-stone-500">Priority</span>
          <select name="priority" defaultValue="NORMAL" className="w-full rounded-xl border border-stone-300 px-3 py-2.5 text-sm">
            {MANAGER_LOG_PRIORITIES.map((priority) => (
              <option key={priority} value={priority}>
                {MANAGER_LOG_PRIORITY_LABELS[priority]}
              </option>
            ))}
          </select>
        </label>
        <label className="block space-y-1">
          <span className="text-xs uppercase tracking-[0.14em] text-stone-500">Description</span>
          <textarea
            name="description"
            required
            rows={5}
            placeholder="Walk-in is a degree high. Vendor shorted avocados."
            className="w-full rounded-xl border border-stone-300 px-3 py-2.5 text-sm"
          />
        </label>
        <button
          type="submit"
          disabled={pending}
          className="rounded-full bg-[#1c1410] px-4 py-2 text-sm font-semibold text-[#fff6ea] disabled:opacity-60"
        >
          {pending ? "Saving..." : "Save to log"}
        </button>
      </form>
    </section>
  );
}

function Chip({ active, label, onClick }: { active: boolean; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
        active ? "bg-[#1c1410] text-[#fff6ea]" : "border border-stone-300 text-stone-700"
      }`}
    >
      {label}
    </button>
  );
}

function Stat({ label, value, warn }: { label: string; value: string; warn?: boolean }) {
  return (
    <div className={`rounded-3xl border px-5 py-4 ${warn ? "border-orange-200 bg-orange-50" : "border-stone-200 bg-white"}`}>
      <p className="text-xs uppercase tracking-[0.16em] text-stone-500">{label}</p>
      <p className="font-display mt-2 text-3xl text-stone-950">{value}</p>
    </div>
  );
}
