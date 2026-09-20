import "server-only";

import { prisma } from "@/lib/db/prisma";
import { recordAuditLog } from "@/lib/audit/log";
import {
  credentialFieldNames,
  decryptCredentials,
  encryptCredentials,
  mergeCredentials,
} from "@/lib/integrations/credentials";
import { IntegrationCredentialError, ProviderError } from "@/lib/integrations/errors";
import { isProviderImplemented } from "@/lib/integrations/registry";
import { syncConnectionResource } from "@/lib/integrations/sync";
import type { UpsertConnectionInput } from "@/lib/integrations/schemas";
import {
  POS_PROVIDERS,
  POS_PROVIDER_LABELS,
  PROVIDER_CREDENTIAL_FIELDS,
  type IntegrationConnectionView,
  type IntegrationSnapshot,
  type IntegrationSyncLogView,
  type IntegrationSyncStatusView,
  type PosProviderId,
} from "@/lib/integrations/types";
import { businessDateFor } from "@/lib/operations/scope";
import type { RestaurantScope } from "@/lib/operations/scope";
import { parseBusinessDate } from "@/lib/sales/dates";

function nextSyncFrom(intervalMinutes: number, from = new Date()) {
  return new Date(from.getTime() + intervalMinutes * 60_000);
}

function syncStatus(
  row: { status: "DISABLED" | "READY" | "ERROR" },
  syncing: boolean,
): IntegrationSyncStatusView {
  if (row.status === "DISABLED") return "DISABLED";
  if (syncing) return "SYNCING";
  if (row.status === "ERROR") return "ERROR";
  return "READY";
}

function toConnectionView(
  row: {
    id: string;
    locationId: string;
    provider: PosProviderId;
    status: "DISABLED" | "READY" | "ERROR";
    externalLocationId: string | null;
    encryptedCredentials: string | null;
    credentialFields: string[];
    sourceUrl: string | null;
    useSampleData: boolean;
    scheduledEnabled: boolean;
    syncIntervalMinutes: number;
    nextSyncAt: Date | null;
    lastSyncedAt: Date | null;
    lastSuccessfulSyncAt: Date | null;
    lastError: string | null;
    createdAt: Date;
    updatedAt: Date;
  },
  syncing: boolean,
): IntegrationConnectionView {
  return {
    id: row.id,
    restaurantId: row.locationId,
    provider: row.provider,
    providerLabel: POS_PROVIDER_LABELS[row.provider],
    status: row.status,
    syncStatus: syncStatus(row, syncing),
    implemented: isProviderImplemented(row.provider),
    externalLocationId: row.externalLocationId,
    hasCredentials: Boolean(row.encryptedCredentials),
    credentialFields: row.credentialFields,
    sourceUrl: row.sourceUrl,
    useSampleData: row.useSampleData,
    scheduledEnabled: row.scheduledEnabled,
    syncIntervalMinutes: row.syncIntervalMinutes,
    nextSyncAt: row.nextSyncAt?.toISOString() ?? null,
    lastSyncedAt: row.lastSyncedAt?.toISOString() ?? null,
    lastSuccessfulSyncAt: row.lastSuccessfulSyncAt?.toISOString() ?? null,
    lastError: row.lastError,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function toLogView(row: {
  id: string;
  connectionId: string;
  provider: PosProviderId;
  resource: IntegrationSyncLogView["resource"];
  trigger: IntegrationSyncLogView["trigger"];
  status: IntegrationSyncLogView["status"];
  startedAt: Date;
  finishedAt: Date | null;
  recordsFetched: number;
  recordsImported: number;
  errorCode: string | null;
  errorMessage: string | null;
}): IntegrationSyncLogView {
  return {
    id: row.id,
    connectionId: row.connectionId,
    provider: row.provider,
    resource: row.resource,
    trigger: row.trigger,
    status: row.status,
    startedAt: row.startedAt.toISOString(),
    finishedAt: row.finishedAt?.toISOString() ?? null,
    recordsFetched: row.recordsFetched,
    recordsImported: row.recordsImported,
    errorCode: row.errorCode,
    errorMessage: row.errorMessage,
  };
}

export async function getIntegrationSnapshot(
  scope: RestaurantScope,
  restaurantName: string,
  timezone: string,
  canWrite: boolean,
): Promise<IntegrationSnapshot> {
  const [connections, logs] = await Promise.all([
    prisma.integrationConnection.findMany({
      where: scope,
      orderBy: { provider: "asc" },
    }),
    prisma.integrationSyncLog.findMany({
      where: scope,
      orderBy: { startedAt: "desc" },
      take: 40,
    }),
  ]);

  const syncingIds = new Set(
    logs.filter((log) => log.status === "STARTED" && Date.now() - log.startedAt.getTime() < 120_000).map((log) => log.connectionId),
  );

  return {
    updatedAt: new Date().toISOString(),
    restaurantId: scope.locationId,
    restaurantName,
    timezone,
    canWrite,
    providers: POS_PROVIDERS.map((id) => ({
      id,
      label: POS_PROVIDER_LABELS[id],
      implemented: isProviderImplemented(id),
      credentialFields: PROVIDER_CREDENTIAL_FIELDS[id],
    })),
    connections: connections.map((row) => toConnectionView(row, syncingIds.has(row.id))),
    logs: logs.map(toLogView),
  };
}

export async function upsertIntegrationConnection(scope: RestaurantScope, input: UpsertConnectionInput) {
  const existing = await prisma.integrationConnection.findFirst({
    where: { ...scope, provider: input.provider },
  });

  let credentials = existing?.encryptedCredentials ? decryptCredentials(existing.encryptedCredentials) : {};
  if (input.credentials) {
    credentials = mergeCredentials(credentials, input.credentials);
  }

  const hasCredentials = Object.keys(credentials).length > 0;
  const encryptedCredentials = hasCredentials ? encryptCredentials(credentials) : null;
  const sourceUrl = input.sourceUrl === undefined ? existing?.sourceUrl ?? null : input.sourceUrl;
  const useSampleData = input.useSampleData ?? existing?.useSampleData ?? false;
  const scheduledEnabled = input.scheduledEnabled ?? existing?.scheduledEnabled ?? false;
  const syncIntervalMinutes = input.syncIntervalMinutes ?? existing?.syncIntervalMinutes ?? 15;
  const configured = hasCredentials || Boolean(sourceUrl) || useSampleData;
  const nextStatus = input.status ?? (configured ? "READY" : "DISABLED");
  const nextSyncAt = scheduledEnabled
    ? existing?.nextSyncAt && existing.scheduledEnabled
      ? existing.nextSyncAt
      : new Date()
    : null;

  const data = {
    externalLocationId: input.externalLocationId === undefined ? undefined : input.externalLocationId,
    encryptedCredentials,
    credentialFields: credentialFieldNames(credentials),
    sourceUrl,
    useSampleData,
    scheduledEnabled,
    syncIntervalMinutes,
    nextSyncAt,
    status: nextStatus,
    lastError: nextStatus === "DISABLED" ? null : existing?.lastError,
  };

  const row = existing
    ? await prisma.integrationConnection.update({ where: { id: existing.id }, data })
    : await prisma.integrationConnection.create({
        data: {
          ...scope,
          provider: input.provider,
          externalLocationId: input.externalLocationId || null,
          encryptedCredentials,
          credentialFields: credentialFieldNames(credentials),
          sourceUrl,
          useSampleData,
          scheduledEnabled,
          syncIntervalMinutes,
          nextSyncAt,
          status: nextStatus,
        },
      });

  await recordAuditLog({
    scope,
    entity: "IntegrationConnection",
    entityId: row.id,
    action: existing ? "UPDATE" : "CREATE",
    oldValue: existing
      ? {
          provider: existing.provider,
          status: existing.status,
          sourceUrl: existing.sourceUrl,
          scheduledEnabled: existing.scheduledEnabled,
          credentialFields: existing.credentialFields,
        }
      : null,
    newValue: {
      provider: row.provider,
      status: row.status,
      sourceUrl: row.sourceUrl,
      scheduledEnabled: row.scheduledEnabled,
      useSampleData: row.useSampleData,
      credentialFields: row.credentialFields,
    },
  });

  return toConnectionView(row, false);
}

export async function runIntegrationSync(
  scope: RestaurantScope,
  timezone: string,
  input: {
    connectionId: string;
    resource: "SALES" | "ORDERS" | "EMPLOYEES" | "MENU_ITEMS" | "PAYMENTS" | "ALL";
    trigger?: "MANUAL" | "SCHEDULED";
    start?: string;
    end?: string;
  },
) {
  const connection = await prisma.integrationConnection.findFirst({
    where: { id: input.connectionId, ...scope },
    select: { id: true, provider: true, encryptedCredentials: true, status: true, sourceUrl: true, useSampleData: true },
  });

  if (!connection) {
    throw new ProviderError("Integration connection not found", { code: "CONNECTION_NOT_FOUND", status: 404 });
  }

  if (connection.status === "DISABLED") {
    throw new ProviderError("Enable the connection before syncing", { code: "CONNECTION_DISABLED", status: 409 });
  }

  if (connection.provider !== "MANUAL" && !connection.encryptedCredentials) {
    throw new IntegrationCredentialError("Add credentials before syncing this provider");
  }

  const today = businessDateFor(timezone);
  const start = input.start ? parseBusinessDate(input.start, today) : today;
  const end = input.end ? parseBusinessDate(input.end, today) : today;
  const resources =
    input.resource === "ALL"
      ? (["MENU_ITEMS", "EMPLOYEES", "ORDERS", "PAYMENTS", "SALES"] as const)
      : [input.resource];
  const trigger = input.trigger ?? "MANUAL";

  const logs = [];
  for (const resource of resources) {
    try {
      logs.push(await syncConnectionResource(scope, input.connectionId, resource, { start, end }, trigger));
    } catch {
      const failed = await prisma.integrationSyncLog.findFirst({
        where: { ...scope, connectionId: input.connectionId, resource },
        orderBy: { startedAt: "desc" },
      });
      if (failed) {
        logs.push(failed);
      }
    }
  }

  return logs.map(toLogView);
}

export async function runDueScheduledSyncs(filter?: RestaurantScope) {
  const now = new Date();
  const due = await prisma.integrationConnection.findMany({
    where: {
      ...(filter ?? {}),
      scheduledEnabled: true,
      status: { not: "DISABLED" },
      nextSyncAt: { lte: now },
    },
    include: { location: { select: { id: true, timezone: true } } },
  });

  let ran = 0;
  for (const connection of due) {
    if (!isProviderImplemented(connection.provider)) {
      continue;
    }

    const scope = { companyId: connection.companyId, locationId: connection.locationId };
    await prisma.integrationConnection.update({
      where: { id: connection.id },
      data: { nextSyncAt: nextSyncFrom(connection.syncIntervalMinutes, now) },
    });

    try {
      await runIntegrationSync(scope, connection.location.timezone, {
        connectionId: connection.id,
        resource: "ALL",
        trigger: "SCHEDULED",
      });
      ran += 1;
    } catch {
      // Failure is logged. Existing restaurant data is left untouched.
    }
  }

  return { due: due.length, ran };
}
