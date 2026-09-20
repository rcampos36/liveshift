"use client";

import { useCallback, useEffect, useState } from "react";
import type { IntegrationSnapshot, IntegrationSyncLogView } from "@/lib/integrations/types";

export function useIntegrations(companyId: string, locationId: string, initial: IntegrationSnapshot) {
  const [snapshot, setSnapshot] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const endpoint = `/api/companies/${companyId}/restaurants/${locationId}/integrations`;

  const save = useCallback(
    async (payload: Record<string, unknown>) => {
      setPending(true);
      setError(null);
      try {
        const response = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const data = (await response.json()) as IntegrationSnapshot & { error?: string };
        if (!response.ok) {
          setError(data.error ?? "Unable to save integration");
          return false;
        }
        setSnapshot(data);
        return true;
      } catch {
        setError("Unable to save integration");
        return false;
      } finally {
        setPending(false);
      }
    },
    [endpoint],
  );

  const sync = useCallback(
    async (payload: Record<string, unknown>) => {
      setPending(true);
      setError(null);
      try {
        const response = await fetch(`${endpoint}/sync`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const data = (await response.json()) as {
          error?: string;
          snapshot?: IntegrationSnapshot;
          logs?: IntegrationSyncLogView[];
        };
        if (data.snapshot) {
          setSnapshot(data.snapshot);
        }
        if (!response.ok) {
          setError(data.error ?? "Sync did not complete");
          return false;
        }
        const failed = data.logs?.find((log) => log.status === "FAILED");
        if (failed?.errorMessage) {
          setError(failed.errorMessage);
          return false;
        }
        return true;
      } catch {
        setError("Unable to start sync");
        return false;
      } finally {
        setPending(false);
      }
    },
    [endpoint],
  );

  const refresh = useCallback(async () => {
    try {
      const path = snapshot.canWrite ? `${endpoint}/schedule` : endpoint;
      const response = await fetch(path, {
        method: snapshot.canWrite ? "POST" : "GET",
        cache: "no-store",
      });
      const data = (await response.json()) as IntegrationSnapshot & { snapshot?: IntegrationSnapshot; error?: string };
      const next = data.snapshot ?? data;
      if (!response.ok || !next.providers) {
        return;
      }
      setSnapshot(next);
    } catch {
      // Keep the last good snapshot; a refresh failure must not look like a data wipe.
    }
  }, [endpoint, snapshot.canWrite]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      void refresh();
    }, 60_000);
    return () => window.clearInterval(timer);
  }, [refresh]);

  return { snapshot, error, pending, save, sync };
}
