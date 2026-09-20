import type { Prisma } from "@/generated/prisma/client";

export type AuditActor = {
  id: string;
  name: string;
  email: string;
};

export type AuditEntry = {
  id: string;
  user: string;
  userEmail: string | null;
  restaurant: string;
  entity: string;
  entityId: string;
  action: string;
  oldValue: Prisma.JsonValue | null;
  newValue: Prisma.JsonValue | null;
  timestamp: string;
  ipAddress: string | null;
  sessionId: string | null;
  userAgent: string | null;
};

export type AuditSnapshot = {
  updatedAt: string;
  restaurantId: string;
  restaurantName: string;
  entries: AuditEntry[];
};
