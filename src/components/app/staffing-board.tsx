"use client";

import { useState } from "react";
import { StaffingNav } from "@/components/app/staffing-nav";
import { useStaffing } from "@/components/app/use-staffing";
import {
  STAFF_POSITIONS,
  STAFF_POSITION_LABELS,
  type StaffShiftRecord,
  type StaffingSnapshot,
} from "@/lib/staffing/types";

function clockTime(value: Date, timeZone: string) {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(value);
}

function money(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: value % 1 === 0 ? 0 : 2,
  }).format(value);
}

function hoursLabel(value: number) {
  return `${value.toFixed(1)}h`;
}

function statusLabel(shift: StaffShiftRecord) {
  if (shift.callout) return "Called out";
  if (shift.clockedOut) return "Clocked out";
  if (shift.clockedIn && shift.breakStatus === "ON_BREAK") return "On break";
  if (shift.clockedIn) return shift.late ? "Working · late" : "Working";
  if (shift.late) return "Late";
  return "Scheduled";
}

export function StaffingBoard({
  companyId,
  locationId,
  companyName,
  view,
  initial,
}: {
  companyId: string;
  locationId: string;
  companyName: string;
  view: "board" | "labor";
  initial: StaffingSnapshot;
}) {
  const [selectedDate, setSelectedDate] = useState(initial.selectedDate);
  const { snapshot, error, pending, submit } = useStaffing(companyId, locationId, selectedDate, initial);
  const { kpis } = snapshot;

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-orange-800">
            Staffing · {companyName}
          </p>
          <h1 className="font-display mt-2 text-4xl text-stone-950">{snapshot.restaurantName}</h1>
          <p className="mt-2 text-stone-600">
            {view === "labor" ? "Labor hours and labor %" : "Schedule, clock, callouts, and breaks"} · {snapshot.selectedDate}
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
          <StaffingNav companyId={companyId} locationId={locationId} current={view} />
        </div>
      </div>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <Stat label="Scheduled" value={String(kpis.scheduled)} />
        <Stat label="Currently working" value={String(kpis.currentlyWorking)} />
        <Stat label="Late" value={String(kpis.late)} warn={kpis.late > 0} />
        <Stat label="Called out" value={String(kpis.calledOut)} warn={kpis.calledOut > 0} />
        <Stat label="On break" value={String(kpis.onBreak)} />
      </section>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Labor hours" value={hoursLabel(kpis.laborHours)} />
        <Stat label="Labor cost" value={money(kpis.laborCost)} />
        <Stat label="Net sales" value={money(kpis.netSales)} />
        <Stat label="Labor %" value={`${kpis.laborPercent.toFixed(1)}%`} warn={kpis.laborPercent > 35} />
      </section>

      {error ? <p className="text-sm text-red-700">{error}</p> : null}

      {view === "labor" ? (
        <LaborPanel
          companyId={companyId}
          locationId={locationId}
          snapshot={snapshot}
          selectedDate={selectedDate}
          pending={pending}
          onSubmit={submit}
        />
      ) : (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(20rem,0.8fr)]">
          <ShiftTable snapshot={snapshot} pending={pending} canWrite={snapshot.canWrite} onSubmit={submit} />
          {snapshot.canWrite ? (
            <ShiftForm snapshot={snapshot} selectedDate={selectedDate} pending={pending} onSubmit={submit} />
          ) : null}
        </div>
      )}
    </div>
  );
}

function ShiftTable({
  snapshot,
  pending,
  canWrite,
  onSubmit,
}: {
  snapshot: StaffingSnapshot;
  pending: boolean;
  canWrite: boolean;
  onSubmit: (payload: Record<string, unknown>) => Promise<boolean>;
}) {
  if (snapshot.shifts.length === 0) {
    return (
      <section className="rounded-[1.75rem] border border-stone-200 bg-white p-6 text-stone-500">
        No staff scheduled for this date.
      </section>
    );
  }

  return (
    <section className="overflow-hidden rounded-[1.75rem] border border-stone-200 bg-white">
      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-[#faf6ef] text-xs uppercase tracking-[0.14em] text-stone-500">
            <tr>
              <th className="px-4 py-3 font-medium">Employee</th>
              <th className="px-4 py-3 font-medium">Position</th>
              <th className="px-4 py-3 font-medium">Scheduled</th>
              <th className="px-4 py-3 font-medium">Clock</th>
              <th className="px-4 py-3 font-medium">Hours</th>
              <th className="px-4 py-3 font-medium">Status</th>
              {canWrite ? <th className="px-4 py-3 font-medium">Controls</th> : null}
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100">
            {snapshot.shifts.map((shift) => (
              <tr key={shift.id}>
                <td className="px-4 py-3 font-medium text-stone-950">{shift.employee}</td>
                <td className="px-4 py-3">{STAFF_POSITION_LABELS[shift.position]}</td>
                <td className="px-4 py-3">
                  {clockTime(new Date(shift.scheduledStart), snapshot.timezone)}–
                  {clockTime(new Date(shift.scheduledEnd), snapshot.timezone)}
                </td>
                <td className="px-4 py-3">
                  {shift.clockedIn ? clockTime(new Date(shift.clockedIn), snapshot.timezone) : "—"}
                  {shift.clockedOut ? `–${clockTime(new Date(shift.clockedOut), snapshot.timezone)}` : ""}
                </td>
                <td className="px-4 py-3">{hoursLabel(shift.laborHours)}</td>
                <td className="px-4 py-3">{statusLabel(shift)}</td>
                {canWrite ? (
                  <td className="px-4 py-3">
                    <ShiftControls shift={shift} pending={pending} onSubmit={onSubmit} />
                  </td>
                ) : null}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function ShiftControls({
  shift,
  pending,
  onSubmit,
}: {
  shift: StaffShiftRecord;
  pending: boolean;
  onSubmit: (payload: Record<string, unknown>) => Promise<boolean>;
}) {
  const working = Boolean(shift.clockedIn && !shift.clockedOut && !shift.callout);
  return (
    <div className="flex flex-wrap gap-2">
      {!shift.callout && !shift.clockedIn ? (
        <Action pending={pending} onClick={() => onSubmit({ type: "clockIn", id: shift.id })}>
          Clock in
        </Action>
      ) : null}
      {working ? (
        <Action pending={pending} onClick={() => onSubmit({ type: "clockOut", id: shift.id })}>
          Clock out
        </Action>
      ) : null}
      {working ? (
        <Action
          pending={pending}
          onClick={() =>
            onSubmit({
              type: "setBreak",
              id: shift.id,
              breakStatus: shift.breakStatus === "ON_BREAK" ? "ON_DUTY" : "ON_BREAK",
            })
          }
        >
          {shift.breakStatus === "ON_BREAK" ? "End break" : "Break"}
        </Action>
      ) : null}
      <Action pending={pending} onClick={() => onSubmit({ type: "setCallout", id: shift.id, callout: !shift.callout })}>
        {shift.callout ? "Clear callout" : "Callout"}
      </Action>
      {!shift.callout ? (
        <Action pending={pending} onClick={() => onSubmit({ type: "setLate", id: shift.id, late: !shift.late })}>
          {shift.late ? "Clear late" : "Late"}
        </Action>
      ) : null}
    </div>
  );
}

function ShiftForm({
  snapshot,
  selectedDate,
  pending,
  onSubmit,
}: {
  snapshot: StaffingSnapshot;
  selectedDate: string;
  pending: boolean;
  onSubmit: (payload: Record<string, unknown>) => Promise<boolean>;
}) {
  return (
    <section className="rounded-[1.75rem] border border-stone-200 bg-white p-5">
      <h2 className="font-display text-2xl text-stone-950">Schedule staff</h2>
      <p className="mt-1 text-sm text-stone-600">Add a shift for {selectedDate}. Hourly rate is used to estimate labor cost.</p>
      <form
        className="mt-4 space-y-3"
        onSubmit={(event) => {
          event.preventDefault();
          const form = new FormData(event.currentTarget);
          void onSubmit({
            type: "saveShift",
            employee: form.get("employee"),
            position: form.get("position"),
            businessDate: selectedDate,
            scheduledStart: form.get("scheduledStart"),
            scheduledEnd: form.get("scheduledEnd"),
            hourlyRate: form.get("hourlyRate"),
          }).then((ok) => {
            if (ok) event.currentTarget.reset();
          });
        }}
      >
        <label className="block space-y-1">
          <span className="text-xs uppercase tracking-[0.14em] text-stone-500">Employee</span>
          <input
            name="employee"
            list="staffing-employees"
            required
            className="w-full rounded-xl border border-stone-300 px-3 py-2.5 text-sm"
            placeholder="Ana Ruiz"
          />
          <datalist id="staffing-employees">
            {snapshot.employees.map((employee) => (
              <option key={employee.id} value={employee.name} />
            ))}
          </datalist>
        </label>
        <label className="block space-y-1">
          <span className="text-xs uppercase tracking-[0.14em] text-stone-500">Position</span>
          <select name="position" defaultValue="SERVER" className="w-full rounded-xl border border-stone-300 px-3 py-2.5 text-sm">
            {STAFF_POSITIONS.map((position) => (
              <option key={position} value={position}>
                {STAFF_POSITION_LABELS[position]}
              </option>
            ))}
          </select>
        </label>
        <div className="grid grid-cols-2 gap-3">
          <TimeField name="scheduledStart" label="Start" defaultValue="16:00" />
          <TimeField name="scheduledEnd" label="End" defaultValue="23:00" />
        </div>
        <label className="block space-y-1">
          <span className="text-xs uppercase tracking-[0.14em] text-stone-500">Hourly rate</span>
          <input
            name="hourlyRate"
            type="number"
            min="0"
            step="0.01"
            defaultValue="0"
            className="w-full rounded-xl border border-stone-300 px-3 py-2.5 text-sm"
          />
        </label>
        <button
          type="submit"
          disabled={pending}
          className="rounded-full bg-[#1c1410] px-4 py-2 text-sm font-semibold text-[#fff6ea] disabled:opacity-60"
        >
          {pending ? "Saving..." : "Add shift"}
        </button>
      </form>
    </section>
  );
}

function LaborPanel({
  companyId,
  locationId,
  snapshot,
  selectedDate,
  pending,
  onSubmit,
}: {
  companyId: string;
  locationId: string;
  snapshot: StaffingSnapshot;
  selectedDate: string;
  pending: boolean;
  onSubmit: (payload: Record<string, unknown>) => Promise<boolean>;
}) {

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <section className="rounded-[1.75rem] border border-stone-200 bg-white p-5">
        <h2 className="font-display text-2xl text-stone-950">Labor cost</h2>
        <p className="mt-1 text-sm text-stone-600">
          Labor % = labor cost ÷ net sales × 100. Enter a daily total or import a CSV.
        </p>
        <dl className="mt-4 space-y-2 text-sm">
          <Row label="Scheduled hours" value={hoursLabel(snapshot.kpis.scheduledHours)} />
          <Row label="Labor hours" value={hoursLabel(snapshot.kpis.laborHours)} />
          <Row label="Estimated from hours" value={money(snapshot.kpis.estimatedLaborCost)} />
          <Row label="Entered labor cost" value={money(snapshot.kpis.laborCost)} />
          <Row label="Net sales" value={money(snapshot.kpis.netSales)} />
          <Row label="Labor %" value={`${snapshot.kpis.laborPercent.toFixed(1)}%`} />
        </dl>
        {snapshot.canWrite ? (
          <form
            key={`${selectedDate}-${snapshot.kpis.laborCost}`}
            className="mt-4 space-y-3"
            onSubmit={(event) => {
              event.preventDefault();
              const form = new FormData(event.currentTarget);
              void onSubmit({
                type: "saveLaborCost",
                businessDate: selectedDate,
                laborCost: form.get("laborCost"),
              });
            }}
          >
            <label className="block space-y-1">
              <span className="text-xs uppercase tracking-[0.14em] text-stone-500">Daily labor cost</span>
              <input
                name="laborCost"
                type="number"
                min="0"
                step="0.01"
                defaultValue={snapshot.kpis.laborCost}
                className="w-full rounded-xl border border-stone-300 px-3 py-2.5 text-sm"
              />
            </label>
            <button
              type="submit"
              disabled={pending}
              className="rounded-full bg-[#1c1410] px-4 py-2 text-sm font-semibold text-[#fff6ea] disabled:opacity-60"
            >
              {pending ? "Saving..." : "Save labor cost"}
            </button>
          </form>
        ) : null}
      </section>

      <section className="rounded-[1.75rem] border border-stone-200 bg-white p-5">
        <h2 className="font-display text-2xl text-stone-950">Import / export</h2>
        <p className="mt-1 text-sm text-stone-600">
          CSV columns: <code>businessDate,laborCost</code> or{" "}
          <code>businessDate,employee,position,hours,hourlyRate,laborCost</code>.
        </p>
        {snapshot.canWrite ? (
          <form
            className="mt-4 space-y-3"
            onSubmit={(event) => {
              event.preventDefault();
              const form = new FormData(event.currentTarget);
              const file = form.get("csv");
              if (!(file instanceof File) || file.size === 0) return;
              void file.text().then((csv) => onSubmit({ type: "importLabor", csv }));
            }}
          >
            <input name="csv" type="file" accept=".csv,text/csv" className="block w-full text-sm" />
            <button
              type="submit"
              disabled={pending}
              className="rounded-full bg-[#1c1410] px-4 py-2 text-sm font-semibold text-[#fff6ea] disabled:opacity-60"
            >
              {pending ? "Importing..." : "Import labor CSV"}
            </button>
          </form>
        ) : null}
        <a
          href={`/api/companies/${companyId}/restaurants/${locationId}/staffing/labor/export?date=${selectedDate}`}
          className="mt-4 inline-block text-sm font-medium text-stone-800 underline"
        >
          Export labor CSV
        </a>
      </section>
    </div>
  );
}

function TimeField({ name, label, defaultValue }: { name: string; label: string; defaultValue: string }) {
  return (
    <label className="block space-y-1">
      <span className="text-xs uppercase tracking-[0.14em] text-stone-500">{label}</span>
      <input
        name={name}
        type="time"
        defaultValue={defaultValue}
        required
        className="w-full rounded-xl border border-stone-300 px-3 py-2.5 text-sm"
      />
    </label>
  );
}

function Action({
  pending,
  onClick,
  children,
}: {
  pending: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      disabled={pending}
      onClick={onClick}
      className="rounded-full border border-stone-300 px-2.5 py-1 text-xs font-medium text-stone-800 disabled:opacity-60"
    >
      {children}
    </button>
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

function Stat({ label, value, warn }: { label: string; value: string; warn?: boolean }) {
  return (
    <div className={`rounded-3xl border px-5 py-4 ${warn ? "border-orange-200 bg-orange-50" : "border-stone-200 bg-white"}`}>
      <p className="text-xs uppercase tracking-[0.16em] text-stone-500">{label}</p>
      <p className="font-display mt-2 text-3xl text-stone-950">{value}</p>
    </div>
  );
}
