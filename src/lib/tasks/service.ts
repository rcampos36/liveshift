import "server-only";

import { prisma } from "@/lib/db/prisma";
import { recordAuditLog } from "@/lib/audit/log";
import { bumpDashboardRevision } from "@/lib/operations/revision";
import { businessDateFor, type RestaurantScope } from "@/lib/operations/scope";
import { dateKey, parseBusinessDate, zonedDateTime } from "@/lib/staffing/dates";
import type { TaskAction } from "@/lib/tasks/schemas";
import type {
  StaffPosition,
  TaskDepartment,
  TaskPriority,
  TaskRecord,
  TaskSnapshot,
  TaskStatus,
  RestaurantTaskType,
} from "@/lib/tasks/types";

const userName = { select: { id: true, firstName: true, lastName: true } } as const;

function displayName(user: { firstName: string; lastName: string } | null | undefined) {
  if (!user) return null;
  return `${user.firstName} ${user.lastName}`.trim();
}

function toTask(
  row: {
    id: string;
    locationId: string;
    title: string;
    description: string | null;
    taskType: RestaurantTaskType;
    department: TaskDepartment;
    assignedEmployeeId: string | null;
    assignedRole: StaffPosition | null;
    dueAt: Date | null;
    priority: TaskPriority;
    status: TaskStatus;
    createdById: string | null;
    completedById: string | null;
    completedAt: Date | null;
    verifiedById: string | null;
    verifiedAt: Date | null;
    templateId: string | null;
    templateRunId: string | null;
    businessDate: Date | null;
    createdAt: Date;
    assignedEmployee: { name: string } | null;
    createdBy: { firstName: string; lastName: string } | null;
    completedBy: { firstName: string; lastName: string } | null;
    verifiedBy: { firstName: string; lastName: string } | null;
    template: { name: string } | null;
  },
  restaurantName: string,
  now = new Date(),
): TaskRecord {
  return {
    id: row.id,
    restaurantId: row.locationId,
    restaurantName,
    title: row.title,
    description: row.description,
    taskType: row.taskType,
    department: row.department,
    assignedEmployeeId: row.assignedEmployeeId,
    assignedEmployeeName: row.assignedEmployee?.name ?? null,
    assignedRole: row.assignedRole,
    dueAt: row.dueAt?.toISOString() ?? null,
    priority: row.priority,
    status: row.status,
    createdById: row.createdById,
    createdByName: displayName(row.createdBy),
    completedById: row.completedById,
    completedByName: displayName(row.completedBy),
    completedAt: row.completedAt?.toISOString() ?? null,
    verifiedById: row.verifiedById,
    verifiedByName: displayName(row.verifiedBy),
    verifiedAt: row.verifiedAt?.toISOString() ?? null,
    templateId: row.templateId,
    templateName: row.template?.name ?? null,
    templateRunId: row.templateRunId,
    businessDate: row.businessDate ? dateKey(row.businessDate) : null,
    createdAt: row.createdAt.toISOString(),
    overdue: Boolean(row.dueAt && row.status !== "DONE" && row.status !== "CANCELLED" && row.dueAt.getTime() < now.getTime()),
  };
}

const taskInclude = {
  assignedEmployee: { select: { name: true } },
  createdBy: userName,
  completedBy: userName,
  verifiedBy: userName,
  template: { select: { name: true } },
} as const;

async function dueAtFor(timezone: string, businessDate: Date, dueTime: string | null | undefined) {
  if (!dueTime) return null;
  return zonedDateTime(dateKey(businessDate), dueTime, timezone);
}

export async function getTaskSnapshot(
  scope: RestaurantScope,
  restaurantName: string,
  timezone: string,
  canWrite: boolean,
  currentUserId: string,
  selectedValue?: string | null,
): Promise<TaskSnapshot> {
  const selected = parseBusinessDate(selectedValue, businessDateFor(timezone));
  const now = new Date();
  const [rows, templates, employees] = await Promise.all([
    prisma.task.findMany({
      where: {
        ...scope,
        OR: [{ businessDate: selected }, { businessDate: null, createdAt: { gte: selected, lt: new Date(selected.getTime() + 86_400_000) } }],
      },
      include: taskInclude,
      orderBy: [{ priority: "desc" }, { dueAt: "asc" }, { createdAt: "asc" }],
    }),
    prisma.taskTemplate.findMany({
      where: scope,
      include: { items: { orderBy: { sortOrder: "asc" } } },
      orderBy: { name: "asc" },
    }),
    prisma.restaurantEmployee.findMany({
      where: { ...scope, active: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true, position: true },
    }),
  ]);

  const tasks = rows.map((row) => toTask(row, restaurantName, now));

  return {
    updatedAt: now.toISOString(),
    restaurantId: scope.locationId,
    restaurantName,
    timezone,
    canWrite,
    currentUserId,
    selectedDate: dateKey(selected),
    kpis: {
      open: tasks.filter((task) => task.status === "OPEN").length,
      inProgress: tasks.filter((task) => task.status === "IN_PROGRESS").length,
      completed: tasks.filter((task) => task.status === "DONE").length,
      overdue: tasks.filter((task) => task.overdue).length,
      unverified: tasks.filter((task) => task.status === "DONE" && !task.verifiedAt).length,
    },
    employees,
    tasks,
    templates: templates.map((template) => ({
      id: template.id,
      restaurantId: template.locationId,
      name: template.name,
      description: template.description,
      taskType: template.taskType,
      department: template.department,
      assignedRole: template.assignedRole,
      priority: template.priority,
      dueTime: template.dueTime,
      items: template.items.map((item) => ({
        id: item.id,
        title: item.title,
        description: item.description,
        sortOrder: item.sortOrder,
        assignedRole: item.assignedRole,
        priority: item.priority,
      })),
    })),
  };
}

export async function createQuickTask(scope: RestaurantScope, timezone: string, userId: string, title: string) {
  await prisma.task.create({
    data: {
      ...scope,
      title,
      taskType: "OTHER",
      department: "OTHER",
      businessDate: businessDateFor(timezone),
      createdById: userId,
    },
  });
}

export async function completeTask(scope: RestaurantScope, userId: string, id: string) {
  await prisma.task.updateMany({
    where: { ...scope, id, status: { in: ["OPEN", "IN_PROGRESS"] } },
    data: { status: "DONE", completedAt: new Date(), completedById: userId },
  });
}

export async function applyTaskAction(
  scope: RestaurantScope,
  timezone: string,
  userId: string,
  action: TaskAction,
) {
  const today = businessDateFor(timezone);

  if (action.type === "saveTask") {
    const businessDate = parseBusinessDate(action.businessDate, today);
    const dueAt = await dueAtFor(timezone, businessDate, action.dueTime);
    const data = {
      ...scope,
      title: action.title,
      description: action.description,
      taskType: action.taskType,
      department: action.department,
      assignedEmployeeId: action.assignedEmployeeId,
      assignedRole: action.assignedRole,
      dueAt,
      priority: action.priority,
      businessDate,
    };

    if (action.id) {
      const previous = await prisma.task.findFirst({ where: { ...scope, id: action.id } });
      await prisma.task.updateMany({ where: { ...scope, id: action.id }, data });
      await recordAuditLog({
        scope,
        userId,
        entity: "Task",
        entityId: action.id,
        action: "UPDATE",
        oldValue: previous,
        newValue: data,
      });
      await bumpDashboardRevision(scope);
      return;
    }

    const created = await prisma.task.create({ data: { ...data, createdById: userId } });
    await recordAuditLog({
      scope,
      userId,
      entity: "Task",
      entityId: created.id,
      action: "CREATE",
      newValue: created,
    });
    await bumpDashboardRevision(scope);
    return;
  }

  if (action.type === "setStatus") {
    const previous = await prisma.task.findFirst({ where: { ...scope, id: action.id } });
    const completed = action.status === "DONE";
    await prisma.task.updateMany({
      where: { ...scope, id: action.id },
      data: {
        status: action.status,
        completedAt: completed ? new Date() : null,
        completedById: completed ? userId : null,
        verifiedAt: action.status === "DONE" ? undefined : null,
        verifiedById: action.status === "DONE" ? undefined : null,
      },
    });
    await recordAuditLog({
      scope,
      userId,
      entity: "Task",
      entityId: action.id,
      action: "UPDATE",
      oldValue: previous,
      newValue: { status: action.status },
    });
    await bumpDashboardRevision(scope);
    return;
  }

  if (action.type === "complete") {
    const previous = await prisma.task.findFirst({ where: { ...scope, id: action.id } });
    await completeTask(scope, userId, action.id);
    await recordAuditLog({
      scope,
      userId,
      entity: "Task",
      entityId: action.id,
      action: "COMPLETE",
      oldValue: previous,
      newValue: { status: "DONE" },
    });
    await bumpDashboardRevision(scope);
    return;
  }

  if (action.type === "verify") {
    const previous = await prisma.task.findFirst({ where: { ...scope, id: action.id } });
    await prisma.task.updateMany({
      where: { ...scope, id: action.id, status: "DONE", verifiedAt: null },
      data: { verifiedAt: new Date(), verifiedById: userId },
    });
    await recordAuditLog({
      scope,
      userId,
      entity: "Task",
      entityId: action.id,
      action: "VERIFY",
      oldValue: previous,
      newValue: { verifiedById: userId },
    });
    await bumpDashboardRevision(scope);
    return;
  }

  if (action.type === "unverify") {
    await prisma.task.updateMany({
      where: { ...scope, id: action.id },
      data: { verifiedAt: null, verifiedById: null },
    });
    await bumpDashboardRevision(scope);
    return;
  }

  if (action.type === "remove") {
    await prisma.task.deleteMany({ where: { ...scope, id: action.id } });
    await bumpDashboardRevision(scope);
    return;
  }

  if (action.type === "saveTemplate") {
    const data = {
      name: action.name,
      description: action.description,
      taskType: action.taskType,
      department: action.department,
      assignedRole: action.assignedRole,
      priority: action.priority,
      dueTime: action.dueTime,
    };

    if (action.id) {
      await prisma.$transaction([
        prisma.taskTemplate.updateMany({ where: { ...scope, id: action.id }, data }),
        prisma.taskTemplateItem.deleteMany({ where: { template: { ...scope }, templateId: action.id } }),
        prisma.taskTemplateItem.createMany({
          data: action.items.map((item, index) => ({
            templateId: action.id as string,
            title: item.title,
            description: item.description,
            assignedRole: item.assignedRole,
            priority: item.priority,
            sortOrder: index,
          })),
        }),
      ]);
      await bumpDashboardRevision(scope);
      return;
    }

    await prisma.taskTemplate.create({
      data: {
        ...scope,
        ...data,
        items: {
          create: action.items.map((item, index) => ({
            title: item.title,
            description: item.description,
            assignedRole: item.assignedRole,
            priority: item.priority,
            sortOrder: index,
          })),
        },
      },
    });
    await bumpDashboardRevision(scope);
    return;
  }

  if (action.type === "removeTemplate") {
    await prisma.taskTemplate.deleteMany({ where: { ...scope, id: action.id } });
    await bumpDashboardRevision(scope);
    return;
  }

  const template = await prisma.taskTemplate.findFirst({
    where: { ...scope, id: action.id },
    include: { items: { orderBy: { sortOrder: "asc" } } },
  });
  if (!template) return;

  const businessDate = parseBusinessDate(action.businessDate, today);
  const dueAt = await dueAtFor(timezone, businessDate, template.dueTime);
  const templateRunId = `run_${Date.now()}_${template.id.slice(-6)}`;

  await prisma.task.createMany({
    data: template.items.map((item) => ({
      ...scope,
      title: item.title,
      description: item.description,
      taskType: template.taskType,
      department: template.department,
      assignedEmployeeId: action.assignedEmployeeId,
      assignedRole: item.assignedRole ?? template.assignedRole,
      dueAt,
      priority: item.priority !== "NORMAL" ? item.priority : template.priority,
      createdById: userId,
      templateId: template.id,
      templateRunId,
      businessDate,
    })),
  });
  await bumpDashboardRevision(scope);
}
