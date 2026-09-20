import "server-only";

import { prisma } from "@/lib/db/prisma";
import { recordAuditLog } from "@/lib/audit/log";
import { bumpDashboardRevision } from "@/lib/operations/revision";
import { money, type RestaurantScope } from "@/lib/operations/scope";
import { parseLaborCsv } from "@/lib/staffing/csv";
import {
  businessDateFor,
  clockTime,
  dateKey,
  hoursBetween,
  parseBusinessDate,
  zonedDateTime,
} from "@/lib/staffing/dates";
import type { StaffingAction } from "@/lib/staffing/schemas";
import {
  STAFF_POSITIONS,
  type BreakStatus,
  type StaffEmployee,
  type StaffPosition,
  type StaffShiftRecord,
  type StaffingSnapshot,
} from "@/lib/staffing/types";

function inferPosition(station?: string | null): StaffPosition {
  const value = (station ?? "").trim().toLowerCase();
  if (/(bar|mix)/.test(value)) return "BARTENDER";
  if (/host/.test(value)) return "HOST";
  if (/bus/.test(value)) return "BUSSER";
  if (/prep/.test(value)) return "PREP_COOK";
  if (/(dish|stew)/.test(value)) return "DISHWASHER";
  if (/(kitchen manager|km)/.test(value)) return "KITCHEN_MANAGER";
  if (/(general manager|gm)/.test(value)) return "GENERAL_MANAGER";
  if (/manager/.test(value)) return "MANAGER";
  if (/(cook|grill|line|saute|expo)/.test(value)) return "COOK";
  if ((STAFF_POSITIONS as readonly string[]).includes(value.toUpperCase().replaceAll(" ", "_"))) {
    return value.toUpperCase().replaceAll(" ", "_") as StaffPosition;
  }
  return "SERVER";
}

function scheduledHours(start: Date, end: Date) {
  const close = end.getTime() <= start.getTime() ? new Date(end.getTime() + 86_400_000) : end;
  return hoursBetween(start, close);
}

export function laborHoursFor(
  shift: { callout: boolean; clockedIn: Date | null; clockedOut: Date | null },
  now = new Date(),
) {
  if (shift.callout || !shift.clockedIn) return 0;
  return hoursBetween(shift.clockedIn, shift.clockedOut ?? now);
}

export function isLate(
  shift: {
    callout: boolean;
    late: boolean;
    scheduledStart: Date;
    clockedIn: Date | null;
  },
  now = new Date(),
) {
  if (shift.callout) return false;
  if (shift.late) return true;
  if (shift.clockedIn) return shift.clockedIn.getTime() > shift.scheduledStart.getTime();
  return now.getTime() > shift.scheduledStart.getTime();
}

function toEmployee(row: {
  id: string;
  locationId: string;
  name: string;
  position: StaffPosition;
  hourlyRate: { toString(): string } | number;
  active: boolean;
}): StaffEmployee {
  return {
    id: row.id,
    restaurantId: row.locationId,
    name: row.name,
    position: row.position,
    hourlyRate: money(row.hourlyRate),
    active: row.active,
  };
}

function toShift(
  row: {
    id: string;
    locationId: string;
    employeeId: string | null;
    employee: string;
    position: StaffPosition;
    businessDate: Date;
    scheduledStart: Date;
    scheduledEnd: Date;
    clockedIn: Date | null;
    clockedOut: Date | null;
    callout: boolean;
    late: boolean;
    breakStatus: BreakStatus;
    restaurantEmployee: { hourlyRate: { toString(): string } | number } | null;
  },
  now = new Date(),
): StaffShiftRecord {
  const hourlyRate = money(row.restaurantEmployee?.hourlyRate);
  const hours = laborHoursFor(row, now);
  return {
    id: row.id,
    restaurantId: row.locationId,
    employeeId: row.employeeId,
    employee: row.employee,
    position: row.position,
    businessDate: dateKey(row.businessDate),
    scheduledStart: row.scheduledStart.toISOString(),
    scheduledEnd: row.scheduledEnd.toISOString(),
    clockedIn: row.clockedIn?.toISOString() ?? null,
    clockedOut: row.clockedOut?.toISOString() ?? null,
    callout: row.callout,
    late: isLate(row, now),
    breakStatus: row.breakStatus,
    hourlyRate,
    scheduledHours: scheduledHours(row.scheduledStart, row.scheduledEnd),
    laborHours: hours,
    estimatedLaborCost: hours * hourlyRate,
  };
}

async function upsertEmployee(
  scope: RestaurantScope,
  name: string,
  position: StaffPosition,
  hourlyRate?: number,
) {
  const existing = await prisma.restaurantEmployee.findUnique({
    where: { locationId_name: { locationId: scope.locationId, name } },
  });

  if (existing) {
    return prisma.restaurantEmployee.update({
      where: { id: existing.id },
      data: {
        position,
        active: true,
        ...(hourlyRate == null ? {} : { hourlyRate }),
      },
    });
  }

  return prisma.restaurantEmployee.create({
    data: {
      ...scope,
      name,
      position,
      hourlyRate: hourlyRate ?? 0,
    },
  });
}

async function setDailyLaborCost(scope: RestaurantScope, businessDate: Date, laborCost: number) {
  await prisma.dailyOperations.upsert({
    where: { locationId_businessDate: { locationId: scope.locationId, businessDate } },
    create: { ...scope, businessDate, laborCost },
    update: { laborCost },
  });
}

export async function getStaffingSnapshot(
  scope: RestaurantScope,
  restaurantName: string,
  timezone: string,
  canWrite: boolean,
  selectedValue?: string | null,
): Promise<StaffingSnapshot> {
  const selected = parseBusinessDate(selectedValue, businessDateFor(timezone));
  const now = new Date();
  const [rows, employees, daily] = await Promise.all([
    prisma.staffShift.findMany({
      where: { ...scope, businessDate: selected },
      include: { restaurantEmployee: { select: { hourlyRate: true } } },
      orderBy: [{ scheduledStart: "asc" }, { employee: "asc" }],
    }),
    prisma.restaurantEmployee.findMany({
      where: { ...scope, active: true },
      orderBy: { name: "asc" },
    }),
    prisma.dailyOperations.findUnique({
      where: { locationId_businessDate: { locationId: scope.locationId, businessDate: selected } },
    }),
  ]);

  const shifts = rows.map((row) => toShift(row, now));
  const laborHours = shifts.reduce((sum, shift) => sum + shift.laborHours, 0);
  const scheduledHoursTotal = shifts.filter((shift) => !shift.callout).reduce((sum, shift) => sum + shift.scheduledHours, 0);
  const estimatedLaborCost = shifts.reduce((sum, shift) => sum + shift.estimatedLaborCost, 0);
  const laborCost = money(daily?.laborCost);
  const netSales = money(daily?.netSales) || money(daily?.salesAmount);

  return {
    updatedAt: now.toISOString(),
    restaurantId: scope.locationId,
    restaurantName,
    timezone,
    canWrite,
    selectedDate: dateKey(selected),
    kpis: {
      scheduled: shifts.filter((shift) => !shift.callout).length,
      currentlyWorking: shifts.filter(
        (shift) => shift.clockedIn && !shift.clockedOut && !shift.callout && shift.breakStatus !== "ON_BREAK",
      ).length,
      late: shifts.filter((shift) => shift.late).length,
      calledOut: shifts.filter((shift) => shift.callout).length,
      onBreak: shifts.filter((shift) => shift.clockedIn && !shift.clockedOut && shift.breakStatus === "ON_BREAK").length,
      laborHours,
      scheduledHours: scheduledHoursTotal,
      estimatedLaborCost,
      laborCost,
      netSales,
      laborPercent: netSales > 0 ? (laborCost / netSales) * 100 : 0,
    },
    employees: employees.map(toEmployee),
    shifts,
  };
}

export async function listWorkingStaff(scope: RestaurantScope, timezone: string) {
  const snapshot = await getStaffingSnapshot(scope, "", timezone, false);
  return snapshot.shifts.filter((shift) => shift.clockedIn && !shift.clockedOut && !shift.callout);
}

export async function applyStaffingAction(
  scope: RestaurantScope,
  timezone: string,
  action: StaffingAction,
) {
  const today = businessDateFor(timezone);

  if (action.type === "saveShift") {
    const businessDate = parseBusinessDate(action.businessDate, today);
    const start = zonedDateTime(action.businessDate, action.scheduledStart, timezone);
    let end = zonedDateTime(action.businessDate, action.scheduledEnd, timezone);
    if (end.getTime() <= start.getTime()) {
      end = new Date(end.getTime() + 86_400_000);
    }
    const employee = await upsertEmployee(scope, action.employee, action.position, action.hourlyRate);
    const data = {
      ...scope,
      employeeId: employee.id,
      employee: action.employee,
      position: action.position,
      businessDate,
      scheduledStart: start,
      scheduledEnd: end,
    };

    if (action.id) {
      const previous = await prisma.staffShift.findFirst({ where: { ...scope, id: action.id } });
      await prisma.staffShift.updateMany({
        where: { ...scope, id: action.id },
        data,
      });
      await recordAuditLog({
        scope,
        entity: "StaffShift",
        entityId: action.id,
        action: "UPDATE",
        oldValue: previous,
        newValue: data,
      });
      await bumpDashboardRevision(scope);
      return;
    }

    const created = await prisma.staffShift.create({ data });
    await recordAuditLog({
      scope,
      entity: "StaffShift",
      entityId: created.id,
      action: "CREATE",
      newValue: created,
    });
    await bumpDashboardRevision(scope);
    return;
  }

  if (action.type === "clockIn") {
    await clockInStaff(scope, timezone, {
      id: action.id,
      employee: action.employee,
      position: action.position,
      station: action.station,
    });
    await bumpDashboardRevision(scope);
    return;
  }

  if (action.type === "clockOut") {
    await clockOutStaff(scope, action.id);
    await bumpDashboardRevision(scope);
    return;
  }

  if (action.type === "setCallout") {
    const previous = await prisma.staffShift.findFirst({ where: { ...scope, id: action.id } });
    await prisma.staffShift.updateMany({
      where: { ...scope, id: action.id },
      data: action.callout
        ? { callout: true, late: false, clockedIn: null, clockedOut: null, breakStatus: "ON_DUTY" }
        : { callout: false },
    });
    await recordAuditLog({
      scope,
      entity: "StaffShift",
      entityId: action.id,
      action: "UPDATE",
      oldValue: previous,
      newValue: { callout: action.callout },
    });
    await bumpDashboardRevision(scope);
    return;
  }

  if (action.type === "setLate") {
    const previous = await prisma.staffShift.findFirst({ where: { ...scope, id: action.id } });
    await prisma.staffShift.updateMany({
      where: { ...scope, id: action.id, callout: false },
      data: { late: action.late },
    });
    await recordAuditLog({
      scope,
      entity: "StaffShift",
      entityId: action.id,
      action: "UPDATE",
      oldValue: previous,
      newValue: { late: action.late },
    });
    await bumpDashboardRevision(scope);
    return;
  }

  if (action.type === "setBreak") {
    const previous = await prisma.staffShift.findFirst({ where: { ...scope, id: action.id } });
    await prisma.staffShift.updateMany({
      where: { ...scope, id: action.id, clockedIn: { not: null }, clockedOut: null, callout: false },
      data: { breakStatus: action.breakStatus },
    });
    await recordAuditLog({
      scope,
      entity: "StaffShift",
      entityId: action.id,
      action: "UPDATE",
      oldValue: previous,
      newValue: { breakStatus: action.breakStatus },
    });
    await bumpDashboardRevision(scope);
    return;
  }

  if (action.type === "removeShift") {
    const previous = await prisma.staffShift.findFirst({ where: { ...scope, id: action.id } });
    await prisma.staffShift.deleteMany({ where: { ...scope, id: action.id } });
    await recordAuditLog({
      scope,
      entity: "StaffShift",
      entityId: action.id,
      action: "DELETE",
      oldValue: previous,
    });
    await bumpDashboardRevision(scope);
    return;
  }

  if (action.type === "saveLaborCost") {
    const previous = await prisma.dailyOperations.findFirst({
      where: { ...scope, businessDate: parseBusinessDate(action.businessDate, today) },
    });
    await setDailyLaborCost(scope, parseBusinessDate(action.businessDate, today), action.laborCost);
    await recordAuditLog({
      scope,
      entity: "DailyOperations",
      entityId: previous?.id ?? action.businessDate,
      action: "UPDATE",
      oldValue: previous ? { laborCost: previous.laborCost } : null,
      newValue: { laborCost: action.laborCost },
    });
    await bumpDashboardRevision(scope);
    return;
  }

  const imported = parseLaborCsv(action.csv);
  const totals = new Map<string, number>();
  for (const row of imported) {
    const key = dateKey(row.businessDate);
    totals.set(key, (totals.get(key) ?? 0) + row.laborCost);
    if (row.employee && row.hourlyRate != null) {
      await upsertEmployee(scope, row.employee, row.position ?? "SERVER", row.hourlyRate);
    }
  }
  await Promise.all(
    [...totals.entries()].map(([key, laborCost]) => setDailyLaborCost(scope, parseBusinessDate(key, today), laborCost)),
  );
  await bumpDashboardRevision(scope);
}

export async function clockInStaff(
  scope: RestaurantScope,
  timezone: string,
  input: { id?: string | null; employee?: string; position?: StaffPosition; station?: string | null },
) {
  const now = new Date();
  const businessDate = businessDateFor(timezone);

  if (input.id) {
    const current = await prisma.staffShift.findFirst({
      where: { ...scope, id: input.id },
    });
    if (!current) return;
    await prisma.staffShift.update({
      where: { id: current.id },
      data: {
        callout: false,
        clockedIn: current.clockedIn ?? now,
        clockedOut: null,
        late: current.late || now.getTime() > current.scheduledStart.getTime(),
        breakStatus: "ON_DUTY",
      },
    });
    await recordAuditLog({
      scope,
      entity: "StaffShift",
      entityId: current.id,
      action: "CLOCK_IN",
      oldValue: current,
      newValue: { clockedIn: current.clockedIn ?? now },
    });
    return;
  }

  const name = (input.employee ?? "").trim();
  if (!name) return;
  const position = input.position ?? inferPosition(input.station);
  const employee = await upsertEmployee(scope, name, position);
  const existing = await prisma.staffShift.findFirst({
    where: {
      ...scope,
      businessDate,
      employee: { equals: name, mode: "insensitive" },
      clockedOut: null,
      callout: false,
    },
    orderBy: { scheduledStart: "asc" },
  });

  if (existing) {
    await prisma.staffShift.update({
      where: { id: existing.id },
      data: {
        employeeId: employee.id,
        clockedIn: existing.clockedIn ?? now,
        late: existing.late || now.getTime() > existing.scheduledStart.getTime(),
        breakStatus: "ON_DUTY",
      },
    });
    await recordAuditLog({
      scope,
      entity: "StaffShift",
      entityId: existing.id,
      action: "CLOCK_IN",
      oldValue: existing,
      newValue: { clockedIn: existing.clockedIn ?? now },
    });
    return;
  }

  const created = await prisma.staffShift.create({
    data: {
      ...scope,
      employeeId: employee.id,
      employee: name,
      position,
      businessDate,
      scheduledStart: now,
      scheduledEnd: new Date(now.getTime() + 8 * 3_600_000),
      clockedIn: now,
    },
  });
  await recordAuditLog({
    scope,
    entity: "StaffShift",
    entityId: created.id,
    action: "CLOCK_IN",
    newValue: created,
  });
}

export async function clockOutStaff(scope: RestaurantScope, id: string) {
  const now = new Date();
  const previous = await prisma.staffShift.findFirst({ where: { ...scope, id } });
  const updated = await prisma.staffShift.updateMany({
    where: { ...scope, id, clockedOut: null },
    data: { clockedOut: now, breakStatus: "ON_DUTY" },
  });

  if (updated.count === 0) {
    await prisma.workingEmployee.updateMany({
      where: { ...scope, id, clockedOutAt: null },
      data: { clockedOutAt: now },
    });
    return;
  }

  await recordAuditLog({
    scope,
    entity: "StaffShift",
    entityId: id,
    action: "CLOCK_OUT",
    oldValue: previous,
    newValue: { clockedOut: now },
  });
}

export function shiftTimeLabel(timezone: string, value: string) {
  return clockTime(new Date(value), timezone);
}
