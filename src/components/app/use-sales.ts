"use client";

import { useCallback, useEffect, useState } from "react";
import { useDashboardSync } from "@/components/app/use-dashboard-sync";
import type { SalesSnapshot } from "@/lib/sales/types";

export function useSales(companyId: string, locationId: string, selectedDate: string, initial: SalesSnapshot) {
  const [snapshot, setSnapshot] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const endpoint = `/api/companies/${companyId}/restaurants/${locationId}/sales?date=${selectedDate}`;

  const refresh = useCallback(async () => {
    try {
      const response = await fetch(endpoint, { cache: "no-store" });
      const data = (await response.json()) as SalesSnapshot & { error?: string };
      if (!response.ok) {
        setError(data.error ?? "Unable to refresh sales");
        return;
      }
      setSnapshot(data);
      setError(null);
    } catch {
      setError("Sales board lost connection");
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
        const response = await fetch(`/api/companies/${companyId}/restaurants/${locationId}/sales`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const data = (await response.json()) as SalesSnapshot & { error?: string };
        if (!response.ok) {
          setError(data.error ?? "Unable to save sales");
          return false;
        }
        setSnapshot(data);
        return true;
      } catch {
        setError("Unable to save sales");
        return false;
      } finally {
        setPending(false);
      }
    },
    [companyId, locationId],
  );

  return { snapshot, error, pending, submit };
}
