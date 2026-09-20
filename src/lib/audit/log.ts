import "server-only";

import { cookies, headers } from "next/headers";
import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db/prisma";
import { verifyAccessToken } from "@/lib/auth/jwt";
import { AUTH_COOKIE } from "@/lib/auth/types";
import { getCurrentUser } from "@/lib/auth/session";
import type { RestaurantScope } from "@/lib/operations/scope";
import type { AuditSnapshot } from "@/lib/audit/types";

const SECRET_KEYS = ["password", "passwordhash", "secret", "token", "credential", "apikey", "accessToken", "clientsecret", "dataset"];

function isSecretKey(key: string) {
  const normalized = key.toLowerCase().replaceAll("_", "");
  return SECRET_KEYS.some((item) => normalized.includes(item.toLowerCase()));
}

function redact(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(redact);
  }
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, entry]) => [
        key,
        isSecretKey(key) ? "[redacted]" : redact(entry),
      ]),
    );
  }
  return value;
}

function toJson(value: unknown): Prisma.InputJsonValue | undefined {
  if (value === undefined) {
    return undefined;
  }
  if (value === null) {
    return undefined;
  }
  return JSON.parse(
    JSON.stringify(redact(value), (_key, current) => {
      if (current instanceof Date) {
        return current.toISOString();
      }
      if (typeof current === "bigint") {
        return current.toString();
      }
      if (current && typeof current === "object" && typeof (current as { toNumber?: () => number }).toNumber === "function") {
        return (current as { toNumber: () => number }).toNumber();
      }
      return current;
    }),
  ) as Prisma.InputJsonValue;
}

async function requestContext() {
  try {
    const headerList = await headers();
    const cookieStore = await cookies();
    const accessToken = cookieStore.get(AUTH_COOKIE.access)?.value;
    const payload = accessToken ? await verifyAccessToken(accessToken) : null;
    const forwarded = headerList.get("x-forwarded-for")?.split(",")[0]?.trim();
    return {
      ipAddress: forwarded || headerList.get("x-real-ip") || null,
      sessionId: payload?.sid ?? null,
      userAgent: headerList.get("user-agent")?.slice(0, 500) ?? null,
    };
  } catch {
    return { ipAddress: null, sessionId: null, userAgent: null };
  }
}

export async function recordAuditLog(input: {
  scope: RestaurantScope;
  userId?: string | null;
  entity: string;
  entityId: string;
  action: string;
  oldValue?: unknown;
  newValue?: unknown;
}) {
  const currentUser = input.userId === undefined ? await getCurrentUser() : null;
  const userId = input.userId === undefined ? currentUser?.id ?? null : input.userId;
  const [user, restaurant, context] = await Promise.all([
    userId
      ? prisma.user.findUnique({
          where: { id: userId },
          select: { id: true, firstName: true, lastName: true, email: true },
        })
      : Promise.resolve(null),
    prisma.location.findFirst({
      where: { id: input.scope.locationId, companyId: input.scope.companyId },
      select: { name: true },
    }),
    requestContext(),
  ]);

  if (!restaurant) {
    return;
  }

  await prisma.auditLog.create({
    data: {
      companyId: input.scope.companyId,
      locationId: input.scope.locationId,
      userId: user?.id ?? null,
      userName: user ? `${user.firstName} ${user.lastName}`.trim() : "System",
      userEmail: user?.email ?? null,
      restaurantName: restaurant.name,
      entity: input.entity,
      entityId: input.entityId,
      action: input.action,
      oldValue: toJson(input.oldValue),
      newValue: toJson(input.newValue),
      ipAddress: context.ipAddress,
      sessionId: context.sessionId,
      userAgent: context.userAgent,
    },
  });
}

export async function getAuditSnapshot(scope: RestaurantScope, restaurantName: string): Promise<AuditSnapshot> {
  const rows = await prisma.auditLog.findMany({
    where: scope,
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  return {
    updatedAt: new Date().toISOString(),
    restaurantId: scope.locationId,
    restaurantName,
    entries: rows.map((row) => ({
      id: row.id,
      user: row.userName,
      userEmail: row.userEmail,
      restaurant: row.restaurantName,
      entity: row.entity,
      entityId: row.entityId,
      action: row.action,
      oldValue: row.oldValue,
      newValue: row.newValue,
      timestamp: row.createdAt.toISOString(),
      ipAddress: row.ipAddress,
      sessionId: row.sessionId,
      userAgent: row.userAgent,
    })),
  };
}
