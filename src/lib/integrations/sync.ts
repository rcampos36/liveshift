import "server-only";

import type { IntegrationResource, IntegrationSyncTrigger, Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db/prisma";
import { recordAuditLog } from "@/lib/audit/log";
import { decryptCredentials } from "@/lib/integrations/credentials";
import { ProviderError } from "@/lib/integrations/errors";
import {
  persistNormalizedEmployees,
  persistNormalizedMenuItems,
  persistNormalizedOrders,
  persistNormalizedPayments,
  persistNormalizedSales,
} from "@/lib/integrations/persist";
import { getPosProvider, isProviderImplemented } from "@/lib/integrations/registry";
import type { ProviderContext } from "@/lib/integrations/types";
import type { RestaurantScope } from "@/lib/operations/scope";

import "@/lib/integrations/providers";

async function finishLog(
  logId: string,
  input: {
    status: "SUCCESS" | "FAILED";
    recordsFetched?: number;
    recordsImported?: number;
    errorCode?: string | null;
    errorMessage?: string | null;
    details?: Prisma.InputJsonValue;
  },
) {
  return prisma.integrationSyncLog.update({
    where: { id: logId },
    data: {
      status: input.status,
      finishedAt: new Date(),
      recordsFetched: input.recordsFetched ?? 0,
      recordsImported: input.recordsImported ?? 0,
      errorCode: input.errorCode ?? null,
      errorMessage: input.errorMessage ?? null,
      details: input.details,
    },
  });
}

export async function syncConnectionResource(
  scope: RestaurantScope,
  connectionId: string,
  resource: IntegrationResource,
  query: { start: Date; end: Date },
  trigger: IntegrationSyncTrigger = "MANUAL",
) {
  const connection = await prisma.integrationConnection.findFirst({
    where: { id: connectionId, ...scope },
  });

  if (!connection) {
    throw new ProviderError("Integration connection not found", { code: "CONNECTION_NOT_FOUND", status: 404 });
  }

  if (connection.status === "DISABLED") {
    throw new ProviderError("Integration is disabled", { code: "CONNECTION_DISABLED", status: 409 });
  }

  if (!isProviderImplemented(connection.provider)) {
    throw new ProviderError(`${connection.provider} is not implemented yet`, {
      code: "PROVIDER_NOT_IMPLEMENTED",
      status: 501,
      providerId: connection.provider,
    });
  }

  const log = await prisma.integrationSyncLog.create({
    data: {
      ...scope,
      connectionId: connection.id,
      provider: connection.provider,
      resource,
      trigger,
      status: "STARTED",
    },
  });

  try {
    const credentials = connection.encryptedCredentials
      ? decryptCredentials(connection.encryptedCredentials)
      : {};
    const provider = getPosProvider(connection.provider);
    const context: ProviderContext = {
      companyId: scope.companyId,
      locationId: scope.locationId,
      externalLocationId: connection.externalLocationId,
      credentials,
      settings: {
        sourceUrl: connection.sourceUrl,
        useSampleData: connection.useSampleData,
      },
      query,
    };

    let fetched = 0;
    let imported = 0;

    if (resource === "SALES") {
      const records = await provider.getSales(context);
      fetched = records.length;
      imported = await persistNormalizedSales(scope, connection.id, records);
    } else if (resource === "ORDERS") {
      const records = await provider.getOrders(context);
      fetched = records.length;
      imported = await persistNormalizedOrders(scope, connection.id, records);
    } else if (resource === "EMPLOYEES") {
      const records = await provider.getEmployees(context);
      fetched = records.length;
      imported = await persistNormalizedEmployees(scope, connection.id, records);
    } else if (resource === "MENU_ITEMS") {
      const records = await provider.getMenuItems(context);
      fetched = records.length;
      imported = await persistNormalizedMenuItems(scope, connection.id, records);
    } else {
      const records = await provider.getPayments(context);
      fetched = records.length;
      imported = await persistNormalizedPayments(scope, connection.id, records);
    }

    const saved = await finishLog(log.id, {
      status: "SUCCESS",
      recordsFetched: fetched,
      recordsImported: imported,
    });

    await prisma.integrationConnection.update({
      where: { id: connection.id },
      data: {
        lastSyncedAt: new Date(),
        lastSuccessfulSyncAt: new Date(),
        lastError: null,
        status: "READY",
      },
    });
    await recordAuditLog({
      scope,
      entity: "IntegrationConnection",
      entityId: connection.id,
      action: "SYNC",
      newValue: { resource, trigger, recordsFetched: fetched, recordsImported: imported },
    });

    return saved;
  } catch (error) {
    const providerError =
      error instanceof ProviderError
        ? error
        : new ProviderError(error instanceof Error ? error.message : "Sync failed", {
            code: "SYNC_FAILED",
            status: 502,
            providerId: connection.provider,
          });

    await finishLog(log.id, {
      status: "FAILED",
      errorCode: providerError.code,
      errorMessage: providerError.message,
      details: { preservedExistingData: true, retryable: providerError.retryable },
    });

    await prisma.integrationConnection.update({
      where: { id: connection.id },
      data: {
        lastSyncedAt: new Date(),
        lastError: providerError.message,
        status: "ERROR",
      },
    });

    throw providerError;
  }
}
