"use client";

import { useCallback, useState } from "react";
import { useDashboardSync } from "@/components/app/use-dashboard-sync";
import type { InventorySnapshot } from "@/lib/inventory/types";

export function useInventory(companyId: string, locationId: string, initial: InventorySnapshot) {
  const [snapshot, setSnapshot] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const endpoint = `/api/companies/${companyId}/restaurants/${locationId}/inventory`;

  const refresh = useCallback(async () => {
    try {
      const response = await fetch(endpoint, { cache: "no-store" });
      const data = (await response.json()) as InventorySnapshot & { error?: string };
      if (!response.ok) {
        setError(data.error ?? "Unable to refresh inventory");
        return;
      }
      setSnapshot(data);
      setError(null);
    } catch {
      setError("Inventory lost connection");
    }
  }, [endpoint]);

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
        const data = (await response.json()) as InventorySnapshot & { error?: string };
        if (!response.ok) {
          setError(data.error ?? "Unable to save inventory");
          return false;
        }
        setSnapshot(data);
        return true;
      } catch {
        setError("Unable to save inventory");
        return false;
      } finally {
        setPending(false);
      }
    },
    [endpoint],
  );

  return { snapshot, error, pending, submit, endpoint };
}
