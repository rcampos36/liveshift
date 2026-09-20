"use client";

import { useState } from "react";
import { TaskNav } from "@/components/app/task-nav";
import { useTasks } from "@/components/app/use-tasks";
import {
  STAFF_POSITIONS,
  STAFF_POSITION_LABELS,
  TASK_DEPARTMENTS,
  TASK_DEPARTMENT_LABELS,
  TASK_PRIORITIES,
  TASK_PRIORITY_LABELS,
  TASK_STATUS_LABELS,
  TASK_TYPES,
  TASK_TYPE_LABELS,
  type TaskRecord,
  type TaskSnapshot,
  type TaskTemplateRecord,
} from "@/lib/tasks/types";

function clockTime(value: string, timeZone: string) {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(new Date(value));
}

export function TaskBoard({
  companyId,
  locationId,
  companyName,
  view,
  initial,
}: {
  companyId: string;
  locationId: string;
  companyName: string;
  view: "board" | "templates";
  initial: TaskSnapshot;
}) {
  const [selectedDate, setSelectedDate] = useState(initial.selectedDate);
  const [filter, setFilter] = useState<"ALL" | TaskRecord["taskType"]>("ALL");
  const { snapshot, error, pending, submit } = useTasks(companyId, locationId, selectedDate, initial);
  const tasks = snapshot.tasks.filter((task) => filter === "ALL" || task.taskType === filter);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-orange-800">
            Tasks · {companyName}
          </p>
          <h1 className="font-display mt-2 text-4xl text-stone-950">{snapshot.restaurantName}</h1>
          <p className="mt-2 text-stone-600">
            {view === "templates" ? "Reusable checklists" : "Opening, closing, prep, and manager follow-up"} · {snapshot.selectedDate}
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
          <TaskNav companyId={companyId} locationId={locationId} current={view} />
        </div>
      </div>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <Stat label="Open" value={String(snapshot.kpis.open)} />
        <Stat label="In progress" value={String(snapshot.kpis.inProgress)} />
        <Stat label="Completed" value={String(snapshot.kpis.completed)} />
        <Stat label="Overdue" value={String(snapshot.kpis.overdue)} warn={snapshot.kpis.overdue > 0} />
        <Stat label="Needs verification" value={String(snapshot.kpis.unverified)} warn={snapshot.kpis.unverified > 0} />
      </section>

      {error ? <p className="text-sm text-red-700">{error}</p> : null}

      {view === "templates" ? (
        <TemplatesView snapshot={snapshot} selectedDate={selectedDate} pending={pending} onSubmit={submit} />
      ) : (
        <>
          <div className="flex flex-wrap gap-2">
            <FilterChip active={filter === "ALL"} onClick={() => setFilter("ALL")} label="All" />
            {TASK_TYPES.map((type) => (
              <FilterChip key={type} active={filter === type} onClick={() => setFilter(type)} label={TASK_TYPE_LABELS[type]} />
            ))}
          </div>
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(20rem,0.8fr)]">
            <TaskList snapshot={snapshot} tasks={tasks} pending={pending} onSubmit={submit} />
            {snapshot.canWrite ? (
              <TaskForm snapshot={snapshot} selectedDate={selectedDate} pending={pending} onSubmit={submit} />
            ) : null}
          </div>
        </>
      )}
    </div>
  );
}

function TaskList({
  snapshot,
  tasks,
  pending,
  onSubmit,
}: {
  snapshot: TaskSnapshot;
  tasks: TaskRecord[];
  pending: boolean;
  onSubmit: (payload: Record<string, unknown>) => Promise<boolean>;
}) {
  if (tasks.length === 0) {
    return (
      <section className="rounded-[1.75rem] border border-stone-200 bg-white p-6 text-stone-500">
        No tasks for this date.
      </section>
    );
  }

  return (
    <section className="space-y-3">
      {tasks.map((task) => (
        <article key={task.id} className="rounded-[1.5rem] border border-stone-200 bg-white p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-stone-500">
                {TASK_TYPE_LABELS[task.taskType]} · {TASK_DEPARTMENT_LABELS[task.department]} · {TASK_PRIORITY_LABELS[task.priority]}
              </p>
              <h2 className="mt-1 text-lg font-semibold text-stone-950">{task.title}</h2>
              {task.description ? <p className="mt-1 text-sm text-stone-600">{task.description}</p> : null}
            </div>
            <span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusTone(task)}`}>
              {task.overdue ? "Overdue" : TASK_STATUS_LABELS[task.status]}
            </span>
          </div>
          <dl className="mt-3 grid gap-2 text-sm text-stone-600 sm:grid-cols-2">
            <div>Assigned: {task.assignedEmployeeName ?? (task.assignedRole ? STAFF_POSITION_LABELS[task.assignedRole] : "Unassigned")}</div>
            <div>Due: {task.dueAt ? clockTime(task.dueAt, snapshot.timezone) : "No due time"}</div>
            <div>Created by: {task.createdByName ?? "—"}</div>
            <div>
              Completed: {task.completedAt ? `${clockTime(task.completedAt, snapshot.timezone)}${task.completedByName ? ` · ${task.completedByName}` : ""}` : "—"}
            </div>
            <div className="sm:col-span-2">
              Verification:{" "}
              {task.verifiedAt
                ? `Verified${task.verifiedByName ? ` by ${task.verifiedByName}` : ""}`
                : task.status === "DONE"
                  ? "Needs manager verification"
                  : "—"}
            </div>
            {task.templateName ? <div className="sm:col-span-2">Template: {task.templateName}</div> : null}
          </dl>
          {snapshot.canWrite ? <TaskControls task={task} pending={pending} onSubmit={onSubmit} /> : null}
        </article>
      ))}
    </section>
  );
}

function TaskControls({
  task,
  pending,
  onSubmit,
}: {
  task: TaskRecord;
  pending: boolean;
  onSubmit: (payload: Record<string, unknown>) => Promise<boolean>;
}) {
  return (
    <div className="mt-4 flex flex-wrap gap-2">
      {task.status === "OPEN" ? (
        <Action pending={pending} onClick={() => onSubmit({ type: "setStatus", id: task.id, status: "IN_PROGRESS" })}>
          Start
        </Action>
      ) : null}
      {task.status === "OPEN" || task.status === "IN_PROGRESS" ? (
        <Action pending={pending} onClick={() => onSubmit({ type: "complete", id: task.id })}>
          Complete
        </Action>
      ) : null}
      {task.status === "DONE" && !task.verifiedAt ? (
        <Action pending={pending} onClick={() => onSubmit({ type: "verify", id: task.id })}>
          Verify
        </Action>
      ) : null}
      {task.verifiedAt ? (
        <Action pending={pending} onClick={() => onSubmit({ type: "unverify", id: task.id })}>
          Clear verification
        </Action>
      ) : null}
      {task.status === "DONE" || task.status === "CANCELLED" ? (
        <Action pending={pending} onClick={() => onSubmit({ type: "setStatus", id: task.id, status: "OPEN" })}>
          Reopen
        </Action>
      ) : null}
      {task.status !== "CANCELLED" && task.status !== "DONE" ? (
        <Action pending={pending} onClick={() => onSubmit({ type: "setStatus", id: task.id, status: "CANCELLED" })}>
          Cancel
        </Action>
      ) : null}
    </div>
  );
}

function TaskForm({
  snapshot,
  selectedDate,
  pending,
  onSubmit,
}: {
  snapshot: TaskSnapshot;
  selectedDate: string;
  pending: boolean;
  onSubmit: (payload: Record<string, unknown>) => Promise<boolean>;
}) {
  return (
    <section className="rounded-[1.75rem] border border-stone-200 bg-white p-5">
      <h2 className="font-display text-2xl text-stone-950">New task</h2>
      <form
        className="mt-4 space-y-3"
        onSubmit={(event) => {
          event.preventDefault();
          const form = new FormData(event.currentTarget);
          void onSubmit({
            type: "saveTask",
            title: form.get("title"),
            description: form.get("description"),
            taskType: form.get("taskType"),
            department: form.get("department"),
            assignedEmployeeId: form.get("assignedEmployeeId"),
            assignedRole: form.get("assignedRole"),
            businessDate: selectedDate,
            dueTime: form.get("dueTime"),
            priority: form.get("priority"),
          }).then((ok) => {
            if (ok) event.currentTarget.reset();
          });
        }}
      >
        <Field name="title" label="Title" placeholder="Check walk-in temperature" required />
        <label className="block space-y-1">
          <span className="text-xs uppercase tracking-[0.14em] text-stone-500">Description</span>
          <textarea name="description" rows={3} className="w-full rounded-xl border border-stone-300 px-3 py-2.5 text-sm" />
        </label>
        <Select name="taskType" label="Type" options={TASK_TYPES.map((value) => ({ value, label: TASK_TYPE_LABELS[value] }))} />
        <Select name="department" label="Department" options={TASK_DEPARTMENTS.map((value) => ({ value, label: TASK_DEPARTMENT_LABELS[value] }))} />
        <Select
          name="assignedEmployeeId"
          label="Assigned employee"
          options={[{ value: "", label: "Unassigned" }, ...snapshot.employees.map((employee) => ({ value: employee.id, label: employee.name }))]}
        />
        <Select
          name="assignedRole"
          label="Assigned role"
          options={[{ value: "", label: "Any role" }, ...STAFF_POSITIONS.map((value) => ({ value, label: STAFF_POSITION_LABELS[value] }))]}
        />
        <Select name="priority" label="Priority" options={TASK_PRIORITIES.map((value) => ({ value, label: TASK_PRIORITY_LABELS[value] }))} defaultValue="NORMAL" />
        <label className="block space-y-1">
          <span className="text-xs uppercase tracking-[0.14em] text-stone-500">Due time</span>
          <input name="dueTime" type="time" className="w-full rounded-xl border border-stone-300 px-3 py-2.5 text-sm" />
        </label>
        <button
          type="submit"
          disabled={pending}
          className="rounded-full bg-[#1c1410] px-4 py-2 text-sm font-semibold text-[#fff6ea] disabled:opacity-60"
        >
          {pending ? "Saving..." : "Create task"}
        </button>
      </form>
    </section>
  );
}

function TemplatesView({
  snapshot,
  selectedDate,
  pending,
  onSubmit,
}: {
  snapshot: TaskSnapshot;
  selectedDate: string;
  pending: boolean;
  onSubmit: (payload: Record<string, unknown>) => Promise<boolean>;
}) {
  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1.3fr)_minmax(20rem,0.7fr)]">
      <section className="space-y-3">
        {snapshot.templates.length === 0 ? (
          <div className="rounded-[1.75rem] border border-stone-200 bg-white p-6 text-stone-500">
            No templates yet. Save a reusable checklist to start a shift the same way every day.
          </div>
        ) : (
          snapshot.templates.map((template) => (
            <TemplateCard
              key={template.id}
              template={template}
              employees={snapshot.employees}
              selectedDate={selectedDate}
              canWrite={snapshot.canWrite}
              pending={pending}
              onSubmit={onSubmit}
            />
          ))
        )}
      </section>
      {snapshot.canWrite ? <TemplateForm pending={pending} onSubmit={onSubmit} /> : null}
    </div>
  );
}

function TemplateCard({
  template,
  employees,
  selectedDate,
  canWrite,
  pending,
  onSubmit,
}: {
  template: TaskTemplateRecord;
  employees: TaskSnapshot["employees"];
  selectedDate: string;
  canWrite: boolean;
  pending: boolean;
  onSubmit: (payload: Record<string, unknown>) => Promise<boolean>;
}) {
  return (
    <article className="rounded-[1.5rem] border border-stone-200 bg-white p-5">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-stone-500">
        {TASK_TYPE_LABELS[template.taskType]} · {TASK_DEPARTMENT_LABELS[template.department]}
      </p>
      <h2 className="mt-1 text-xl font-semibold text-stone-950">{template.name}</h2>
      {template.description ? <p className="mt-1 text-sm text-stone-600">{template.description}</p> : null}
      <ol className="mt-3 list-decimal space-y-1 pl-5 text-sm text-stone-700">
        {template.items.map((item) => (
          <li key={item.id}>{item.title}</li>
        ))}
      </ol>
      {canWrite ? (
        <form
          className="mt-4 flex flex-wrap items-end gap-3"
          onSubmit={(event) => {
            event.preventDefault();
            const form = new FormData(event.currentTarget);
            void onSubmit({
              type: "applyTemplate",
              id: template.id,
              businessDate: selectedDate,
              assignedEmployeeId: form.get("assignedEmployeeId"),
            });
          }}
        >
          <select name="assignedEmployeeId" className="rounded-xl border border-stone-300 px-3 py-2 text-sm">
            <option value="">Assign later</option>
            {employees.map((employee) => (
              <option key={employee.id} value={employee.id}>
                {employee.name}
              </option>
            ))}
          </select>
          <button
            type="submit"
            disabled={pending}
            className="rounded-full bg-[#1c1410] px-4 py-2 text-sm font-semibold text-[#fff6ea] disabled:opacity-60"
          >
            Start for this date
          </button>
        </form>
      ) : null}
    </article>
  );
}

function TemplateForm({
  pending,
  onSubmit,
}: {
  pending: boolean;
  onSubmit: (payload: Record<string, unknown>) => Promise<boolean>;
}) {
  return (
    <section className="rounded-[1.75rem] border border-stone-200 bg-white p-5">
      <h2 className="font-display text-2xl text-stone-950">New template</h2>
      <p className="mt-1 text-sm text-stone-600">One checklist item per line.</p>
      <form
        className="mt-4 space-y-3"
        onSubmit={(event) => {
          event.preventDefault();
          const form = new FormData(event.currentTarget);
          const items = String(form.get("items") ?? "")
            .split(/\r?\n/)
            .map((line) => line.trim())
            .filter(Boolean)
            .map((title) => ({ title }));
          void onSubmit({
            type: "saveTemplate",
            name: form.get("name"),
            description: form.get("description"),
            taskType: form.get("taskType"),
            department: form.get("department"),
            assignedRole: form.get("assignedRole"),
            priority: form.get("priority"),
            dueTime: form.get("dueTime"),
            items,
          }).then((ok) => {
            if (ok) event.currentTarget.reset();
          });
        }}
      >
        <Field name="name" label="Template name" placeholder="Opening Kitchen Checklist" required />
        <label className="block space-y-1">
          <span className="text-xs uppercase tracking-[0.14em] text-stone-500">Description</span>
          <textarea name="description" rows={2} className="w-full rounded-xl border border-stone-300 px-3 py-2.5 text-sm" />
        </label>
        <Select name="taskType" label="Type" options={TASK_TYPES.map((value) => ({ value, label: TASK_TYPE_LABELS[value] }))} defaultValue="OPENING" />
        <Select name="department" label="Department" options={TASK_DEPARTMENTS.map((value) => ({ value, label: TASK_DEPARTMENT_LABELS[value] }))} defaultValue="KITCHEN" />
        <Select
          name="assignedRole"
          label="Assigned role"
          options={[{ value: "", label: "Any role" }, ...STAFF_POSITIONS.map((value) => ({ value, label: STAFF_POSITION_LABELS[value] }))]}
        />
        <Select name="priority" label="Priority" options={TASK_PRIORITIES.map((value) => ({ value, label: TASK_PRIORITY_LABELS[value] }))} defaultValue="NORMAL" />
        <label className="block space-y-1">
          <span className="text-xs uppercase tracking-[0.14em] text-stone-500">Due time</span>
          <input name="dueTime" type="time" defaultValue="10:00" className="w-full rounded-xl border border-stone-300 px-3 py-2.5 text-sm" />
        </label>
        <label className="block space-y-1">
          <span className="text-xs uppercase tracking-[0.14em] text-stone-500">Checklist items</span>
          <textarea
            name="items"
            required
            rows={7}
            placeholder={"Turn equipment on\nCheck walk-in temperature"}
            className="w-full rounded-xl border border-stone-300 px-3 py-2.5 text-sm"
          />
        </label>
        <button
          type="submit"
          disabled={pending}
          className="rounded-full bg-[#1c1410] px-4 py-2 text-sm font-semibold text-[#fff6ea] disabled:opacity-60"
        >
          {pending ? "Saving..." : "Save template"}
        </button>
      </form>
    </section>
  );
}

function statusTone(task: TaskRecord) {
  if (task.overdue) return "bg-orange-100 text-orange-900";
  if (task.status === "DONE") return "bg-emerald-100 text-emerald-900";
  if (task.status === "IN_PROGRESS") return "bg-sky-100 text-sky-900";
  if (task.status === "CANCELLED") return "bg-stone-100 text-stone-500";
  return "bg-stone-100 text-stone-700";
}

function FilterChip({ active, label, onClick }: { active: boolean; label: string; onClick: () => void }) {
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

function Field({
  name,
  label,
  placeholder,
  required,
}: {
  name: string;
  label: string;
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <label className="block space-y-1">
      <span className="text-xs uppercase tracking-[0.14em] text-stone-500">{label}</span>
      <input
        name={name}
        required={required}
        placeholder={placeholder}
        className="w-full rounded-xl border border-stone-300 px-3 py-2.5 text-sm"
      />
    </label>
  );
}

function Select({
  name,
  label,
  options,
  defaultValue,
}: {
  name: string;
  label: string;
  options: Array<{ value: string; label: string }>;
  defaultValue?: string;
}) {
  return (
    <label className="block space-y-1">
      <span className="text-xs uppercase tracking-[0.14em] text-stone-500">{label}</span>
      <select name={name} defaultValue={defaultValue} className="w-full rounded-xl border border-stone-300 px-3 py-2.5 text-sm">
        {options.map((option) => (
          <option key={option.value || option.label} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
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
      className="rounded-full border border-stone-300 px-3 py-1.5 text-xs font-medium text-stone-800 disabled:opacity-60"
    >
      {children}
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
