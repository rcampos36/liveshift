"use client";

import { useCallback, useEffect, useState } from "react";
import { useDashboardSync } from "@/components/app/use-dashboard-sync";
import type { ManagerLogSnapshot } from "@/lib/manager-log/types";

export function useManagerLog(
  companyId: string,
  locationId: string,
  selectedDate: string,
  initial: ManagerLogSnapshot,
) {
  const [snapshot, setSnapshot] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const endpoint = `/api/companies/${companyId}/restaurants/${locationId}/manager-log?date=${selectedDate}`;

  const refresh = useCallback(async () => {
    try {
      const response = await fetch(endpoint, { cache: "no-store" });
      const data = (await response.json()) as ManagerLogSnapshot & { error?: string };
      if (!response.ok) {
        setError(data.error ?? "Unable to refresh the manager log");
        return;
      }
      setSnapshot(data);
      setError(null);
    } catch {
      setError("Manager log lost connection");
    }
  }, [endpoint]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useDashboardSync(companyId, locationId, refresh);

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
        const data = (await response.json()) as ManagerLogSnapshot & { error?: string };
        if (!response.ok) {
          setError(data.error ?? "Unable to save the manager log");
          return false;
        }
        setSnapshot(data);
        return true;
      } catch {
        setError("Unable to save the manager log");
        return false;
      } finally {
        setPending(false);
      }
    },
    [endpoint],
  );

  return { snapshot, error, pending, submit };
}
