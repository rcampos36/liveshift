"use client";

import { useState } from "react";
import { SalesNav } from "@/components/app/sales-nav";
import { useSales } from "@/components/app/use-sales";
import type { SalesMetrics, SalesPeriodReport, SalesSnapshot } from "@/lib/sales/types";

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

export function SalesBoard({
  companyId,
  locationId,
  companyName,
  period,
  initial,
}: {
  companyId: string;
  locationId: string;
  companyName: string;
  period: "daily" | "weekly" | "monthly";
  initial: SalesSnapshot;
}) {
  const [selectedDate, setSelectedDate] = useState(initial.selectedDate);
  const { snapshot, error, pending, submit } = useSales(companyId, locationId, selectedDate, initial);
  const report = snapshot[period];
  const day = snapshot.daily.totals;

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-orange-800">
            Sales · {companyName}
          </p>
          <h1 className="font-display mt-2 text-4xl text-stone-950">{snapshot.restaurantName}</h1>
          <p className="mt-2 text-stone-600">
            {report.label} report · {report.start}
            {report.end !== report.start ? ` to ${report.end}` : ""}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <label className="text-xs uppercase tracking-[0.14em] text-stone-500">
            Business date
            <input
              type="date"
              value={selectedDate}
              onChange={(event) => setSelectedDate(event.target.value)}
              className="mt-1 block rounded-xl border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900"
            />
          </label>
          <SalesNav companyId={companyId} locationId={locationId} current={period} />
        </div>
      </div>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Net sales" value={money(report.totals.netSales)} />
        <Stat label="Sales vs goal" value={money(report.metrics.salesVsGoal)} />
        <Stat label="Goal %" value={percent(report.metrics.goalPercent)} />
        <Stat label="Average check" value={money(report.metrics.averageCheck)} />
        <Stat label="Sales per cover" value={money(report.metrics.salesPerCover)} />
        <Stat label="Food %" value={percent(report.metrics.foodPercent)} />
        <Stat label="Alcohol %" value={percent(report.metrics.alcoholPercent)} />
        <Stat label="Comps % / Voids %" value={`${percent(report.metrics.compsPercent)} · ${percent(report.metrics.voidsPercent)}`} />
      </section>

      <div className="h-2 overflow-hidden rounded-full bg-stone-200">
        <div className="h-full rounded-full bg-[#1c1410]" style={{ width: `${Math.min(report.metrics.goalPercent, 100)}%` }} />
      </div>
      <p className="text-sm text-stone-600">
        {money(report.totals.netSales)} toward {money(report.goal) || "no goal set"}
      </p>

      {error ? <p className="text-sm text-red-700">{error}</p> : null}

      {period !== "daily" ? <PeriodTable report={report} /> : null}

      {snapshot.canWrite ? (
        <div className="grid gap-6 lg:grid-cols-2">
          {period === "daily" ? (
            <DayForm day={day} selectedDate={selectedDate} pending={pending} onSubmit={submit} />
          ) : (
            <section className="rounded-[1.75rem] border border-stone-200 bg-white p-5">
              <h2 className="font-display text-2xl text-stone-950">Period totals</h2>
              <TotalsList report={report} />
            </section>
          )}
          <GoalsForm snapshot={snapshot} selectedDate={selectedDate} pending={pending} onSubmit={submit} />
        </div>
      ) : (
        <section className="rounded-[1.75rem] border border-stone-200 bg-white p-5">
          <TotalsList report={report} />
        </section>
      )}
    </div>
  );
}

function DayForm({
  day,
  selectedDate,
  pending,
  onSubmit,
}: {
  day: SalesSnapshot["daily"]["totals"];
  selectedDate: string;
  pending: boolean;
  onSubmit: (payload: Record<string, unknown>) => Promise<boolean>;
}) {
  return (
    <section className="rounded-[1.75rem] border border-stone-200 bg-white p-5">
      <h2 className="font-display text-2xl text-stone-950">Daily sales</h2>
      <form
        key={`${selectedDate}-${day.netSales}-${day.covers}`}
        className="mt-4 grid gap-3 sm:grid-cols-2"
        onSubmit={(event) => {
          event.preventDefault();
          const form = new FormData(event.currentTarget);
          void onSubmit({
            type: "saveDay",
            businessDate: selectedDate,
            grossSales: form.get("grossSales"),
            netSales: form.get("netSales"),
            foodSales: form.get("foodSales"),
            alcoholSales: form.get("alcoholSales"),
            otherSales: form.get("otherSales"),
            discounts: form.get("discounts"),
            comps: form.get("comps"),
            voids: form.get("voids"),
            tax: form.get("tax"),
            covers: form.get("covers"),
            orderCount: form.get("orderCount"),
            laborCost: form.get("laborCost"),
          });
        }}
      >
        <Field name="grossSales" label="Gross sales" defaultValue={day.grossSales} />
        <Field name="netSales" label="Net sales" defaultValue={day.netSales} />
        <Field name="foodSales" label="Food sales" defaultValue={day.foodSales} />
        <Field name="alcoholSales" label="Alcohol sales" defaultValue={day.alcoholSales} />
        <Field name="otherSales" label="Other sales" defaultValue={day.otherSales} />
        <Field name="discounts" label="Discounts" defaultValue={day.discounts} />
        <Field name="comps" label="Comps" defaultValue={day.comps} />
        <Field name="voids" label="Voids" defaultValue={day.voids} />
        <Field name="tax" label="Tax" defaultValue={day.tax} />
        <Field name="covers" label="Covers" defaultValue={day.covers} />
        <Field name="orderCount" label="Order count" defaultValue={day.orderCount} />
        <Field name="laborCost" label="Labor cost" defaultValue={day.laborCost} />
        <button
          type="submit"
          disabled={pending}
          className="rounded-full bg-[#1c1410] px-4 py-2 text-sm font-semibold text-[#fff6ea] disabled:opacity-60 sm:col-span-2"
        >
          {pending ? "Saving..." : "Save daily sales"}
        </button>
      </form>
    </section>
  );
}

function GoalsForm({
  snapshot,
  selectedDate,
  pending,
  onSubmit,
}: {
  snapshot: SalesSnapshot;
  selectedDate: string;
  pending: boolean;
  onSubmit: (payload: Record<string, unknown>) => Promise<boolean>;
}) {
  return (
    <section className="rounded-[1.75rem] border border-stone-200 bg-white p-5">
      <h2 className="font-display text-2xl text-stone-950">Sales goals</h2>
      <p className="mt-1 text-sm text-stone-600">
        Set the daily goal for {selectedDate}, this week, and this month.
      </p>
      <form
        key={`${selectedDate}-${snapshot.goals.daily}-${snapshot.goals.weekly}-${snapshot.goals.monthly}`}
        className="mt-4 space-y-3"
        onSubmit={(event) => {
          event.preventDefault();
          const form = new FormData(event.currentTarget);
          void onSubmit({
            type: "setGoals",
            businessDate: selectedDate,
            daily: form.get("daily"),
            weekly: form.get("weekly"),
            monthly: form.get("monthly"),
          });
        }}
      >
        <Field name="daily" label="Daily sales goal" defaultValue={snapshot.goals.daily} />
        <Field name="weekly" label="Weekly sales goal" defaultValue={snapshot.goals.weekly} />
        <Field name="monthly" label="Monthly sales goal" defaultValue={snapshot.goals.monthly} />
        <button
          type="submit"
          disabled={pending}
          className="rounded-full bg-[#1c1410] px-4 py-2 text-sm font-semibold text-[#fff6ea] disabled:opacity-60"
        >
          {pending ? "Saving..." : "Save goals"}
        </button>
      </form>
    </section>
  );
}

function PeriodTable({ report }: { report: SalesPeriodReport }) {
  const filled = report.days.filter((day) => day.netSales > 0 || day.covers > 0);
  return (
    <section className="overflow-hidden rounded-[1.75rem] border border-stone-200 bg-white">
      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-[#faf6ef] text-xs uppercase tracking-[0.14em] text-stone-500">
            <tr>
              <th className="px-4 py-3 font-medium">Date</th>
              <th className="px-4 py-3 font-medium">Net</th>
              <th className="px-4 py-3 font-medium">Food</th>
              <th className="px-4 py-3 font-medium">Alcohol</th>
              <th className="px-4 py-3 font-medium">Covers</th>
              <th className="px-4 py-3 font-medium">Avg check</th>
              <th className="px-4 py-3 font-medium">Goal %</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100">
            {(filled.length > 0 ? filled : report.days).map((day) => (
              <tr key={day.businessDate}>
                <td className="px-4 py-3 font-medium text-stone-950">{day.businessDate}</td>
                <td className="px-4 py-3">{money(day.netSales)}</td>
                <td className="px-4 py-3">{money(day.foodSales)}</td>
                <td className="px-4 py-3">{money(day.alcoholSales)}</td>
                <td className="px-4 py-3">{day.covers}</td>
                <td className="px-4 py-3">{money(day.metrics.averageCheck)}</td>
                <td className="px-4 py-3">{percent(day.metrics.goalPercent)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function TotalsList({ report }: { report: SalesPeriodReport }) {
  return (
    <dl className="mt-4 space-y-2 text-sm">
      <Row label="Gross sales" value={money(report.totals.grossSales)} />
      <Row label="Net sales" value={money(report.totals.netSales)} />
      <Row label="Food / Alcohol / Other" value={`${money(report.totals.foodSales)} · ${money(report.totals.alcoholSales)} · ${money(report.totals.otherSales)}`} />
      <Row label="Discounts / Comps / Voids" value={`${money(report.totals.discounts)} · ${money(report.totals.comps)} · ${money(report.totals.voids)}`} />
      <Row label="Tax" value={money(report.totals.tax)} />
      <Row label="Covers / Orders" value={`${report.totals.covers} · ${report.totals.orderCount}`} />
      <MetricsList metrics={report.metrics} />
    </dl>
  );
}

function MetricsList({ metrics }: { metrics: SalesMetrics }) {
  return (
    <>
      <Row label="Average check" value={money(metrics.averageCheck)} />
      <Row label="Sales per cover" value={money(metrics.salesPerCover)} />
      <Row label="Food % / Alcohol %" value={`${percent(metrics.foodPercent)} · ${percent(metrics.alcoholPercent)}`} />
      <Row label="Comps % / Voids %" value={`${percent(metrics.compsPercent)} · ${percent(metrics.voidsPercent)}`} />
    </>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-stone-100 py-2">
      <dt className="text-stone-500">{label}</dt>
      <dd className="font-medium text-stone-950">{value}</dd>
    </div>
  );
}

function Field({ name, label, defaultValue }: { name: string; label: string; defaultValue: number }) {
  return (
    <label className="block space-y-1">
      <span className="text-xs uppercase tracking-[0.14em] text-stone-500">{label}</span>
      <input
        name={name}
        type="number"
        min="0"
        step="0.01"
        defaultValue={defaultValue}
        className="w-full rounded-xl border border-stone-300 px-3 py-2.5 text-sm"
      />
    </label>
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
