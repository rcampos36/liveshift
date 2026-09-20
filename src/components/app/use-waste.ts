"use client";

import { useCallback, useEffect, useState } from "react";
import { useDashboardSync } from "@/components/app/use-dashboard-sync";
import type { WasteSnapshot } from "@/lib/waste/types";

const POLL_MS = 5000;

export function useWaste(endpoint: string, initial: WasteSnapshot, companyId?: string, locationId?: string) {
  const [snapshot, setSnapshot] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const response = await fetch(endpoint, { cache: "no-store" });
      const data = (await response.json()) as WasteSnapshot & { error?: string };
      if (!response.ok) {
        setError(data.error ?? "Unable to refresh waste");
        return;
      }
      setSnapshot(data);
      setError(null);
    } catch {
      setError("Waste board lost connection");
    }
  }, [endpoint]);

  useDashboardSync(companyId ?? "", locationId ?? "", refresh);
  useEffect(() => {
    if (locationId) return;
    const poll = window.setInterval(() => {
      void refresh();
    }, POLL_MS);
    return () => window.clearInterval(poll);
  }, [locationId, refresh]);

  const submit = useCallback(
    async (payload: Record<string, unknown>) => {
      setPending(true);
      setError(null);
      try {
        const response = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const data = (await response.json()) as WasteSnapshot & { error?: string };
        if (!response.ok) {
          setError(data.error ?? "Unable to record waste");
          return false;
        }
        setSnapshot(data);
        return true;
      } catch {
        setError("Unable to record waste");
        return false;
      } finally {
        setPending(false);
      }
    },
    [endpoint],
  );

  return { snapshot, error, pending, submit };
}
