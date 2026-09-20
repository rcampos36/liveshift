import "server-only";

import { ProviderError } from "@/lib/integrations/errors";
import type {
  NormalizedEmployee,
  NormalizedMenuItem,
  NormalizedOrder,
  NormalizedPayment,
  NormalizedSalesDay,
} from "@/lib/integrations/models";
import type { PosProvider } from "@/lib/integrations/provider";
import {
  mapManualEmployees,
  mapManualMenuItems,
  mapManualOrders,
  mapManualPayments,
  mapManualSales,
} from "@/lib/integrations/providers/manual-map";
import { buildManualSampleExport, type ManualPosExport } from "@/lib/integrations/providers/manual-sample";
import type { ProviderContext } from "@/lib/integrations/types";

function isExport(value: unknown): value is ManualPosExport {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function parseDataset(raw: string): ManualPosExport {
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!isExport(parsed)) {
      throw new Error("Export must be a JSON object");
    }
    return parsed;
  } catch {
    throw new ProviderError("Manual POS export JSON is invalid", {
      code: "SOURCE_INVALID",
      status: 400,
      retryable: false,
      providerId: "MANUAL",
    });
  }
}

const exportCache = new Map<string, Promise<ManualPosExport>>();

function cacheKey(context: ProviderContext) {
  return [
    context.locationId,
    context.settings.sourceUrl ?? "",
    context.settings.useSampleData ? "sample" : "",
    context.credentials.dataset ?? "",
    context.query.start.toISOString(),
    context.query.end.toISOString(),
  ].join("|");
}

async function loadExport(context: ProviderContext): Promise<ManualPosExport> {
  const key = cacheKey(context);
  const cached = exportCache.get(key);
  if (cached) {
    return cached;
  }

  const pending = loadExportUncached(context).finally(() => {
    setTimeout(() => exportCache.delete(key), 30_000);
  });
  exportCache.set(key, pending);
  return pending;
}

async function loadExportUncached(context: ProviderContext): Promise<ManualPosExport> {
  if (context.settings.sourceUrl) {
    try {
      const response = await fetch(context.settings.sourceUrl, {
        cache: "no-store",
        signal: AbortSignal.timeout(15_000),
      });
      if (!response.ok) {
        throw new ProviderError(`POS source returned ${response.status}`, {
          code: "SOURCE_UNAVAILABLE",
          status: 502,
          retryable: true,
          providerId: "MANUAL",
        });
      }
      const payload = (await response.json()) as unknown;
      if (!isExport(payload)) {
        throw new ProviderError("POS source did not return a JSON object", {
          code: "SOURCE_INVALID",
          status: 502,
          retryable: false,
          providerId: "MANUAL",
        });
      }
      return payload;
    } catch (error) {
      if (error instanceof ProviderError) {
        throw error;
      }
      throw new ProviderError("Could not reach the POS source", {
        code: "SOURCE_UNAVAILABLE",
        status: 502,
        retryable: true,
        providerId: "MANUAL",
      });
    }
  }

  if (context.credentials.dataset) {
    return parseDataset(context.credentials.dataset);
  }

  if (context.settings.useSampleData) {
    return buildManualSampleExport(context.query.start);
  }

  throw new ProviderError("Add a source URL, paste a POS export, or enable sample data", {
    code: "SOURCE_MISSING",
    status: 400,
    retryable: false,
    providerId: "MANUAL",
  });
}

export class ManualProvider implements PosProvider {
  readonly id = "MANUAL" as const;

  async getSales(context: ProviderContext): Promise<NormalizedSalesDay[]> {
    return mapManualSales(await loadExport(context), context.query);
  }

  async getOrders(context: ProviderContext): Promise<NormalizedOrder[]> {
    return mapManualOrders(await loadExport(context), context.query);
  }

  async getEmployees(context: ProviderContext): Promise<NormalizedEmployee[]> {
    return mapManualEmployees(await loadExport(context));
  }

  async getMenuItems(context: ProviderContext): Promise<NormalizedMenuItem[]> {
    return mapManualMenuItems(await loadExport(context));
  }

  async getPayments(context: ProviderContext): Promise<NormalizedPayment[]> {
    return mapManualPayments(await loadExport(context), context.query);
  }
}
