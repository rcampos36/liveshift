"use client";

import { useCallback, useState } from "react";
import { useDashboardSync } from "@/components/app/use-dashboard-sync";
import type { EightySixSnapshot } from "@/lib/eighty-six/types";

export function useEightySix(companyId: string, locationId: string, initial: EightySixSnapshot) {
  const [snapshot, setSnapshot] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const endpoint = `/api/companies/${companyId}/restaurants/${locationId}/eighty-six`;

  const refresh = useCallback(async () => {
    try {
      const response = await fetch(endpoint, { cache: "no-store" });
      const data = (await response.json()) as EightySixSnapshot & { error?: string };
      if (!response.ok) {
        setError(data.error ?? "Unable to refresh 86 board");
        return;
      }
      setSnapshot(data);
      setError(null);
    } catch {
      setError("86 board lost connection");
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
        const data = (await response.json()) as EightySixSnapshot & { error?: string };
        if (!response.ok) {
          setError(data.error ?? "Unable to save 86 change");
          return false;
        }
        setSnapshot(data);
        return true;
      } catch {
        setError("Unable to save 86 change");
        return false;
      } finally {
        setPending(false);
      }
    },
    [endpoint],
  );

  return { snapshot, error, pending, submit, refresh };
}
