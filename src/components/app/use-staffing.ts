"use client";

import { useCallback, useEffect, useState } from "react";
import { useDashboardSync } from "@/components/app/use-dashboard-sync";
import type { StaffingSnapshot } from "@/lib/staffing/types";

export function useStaffing(companyId: string, locationId: string, selectedDate: string, initial: StaffingSnapshot) {
  const [snapshot, setSnapshot] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const endpoint = `/api/companies/${companyId}/restaurants/${locationId}/staffing?date=${selectedDate}`;

  const refresh = useCallback(async () => {
    try {
      const response = await fetch(endpoint, { cache: "no-store" });
      const data = (await response.json()) as StaffingSnapshot & { error?: string };
      if (!response.ok) {
        setError(data.error ?? "Unable to refresh staffing");
        return;
      }
      setSnapshot(data);
      setError(null);
    } catch {
      setError("Staffing board lost connection");
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
        const response = await fetch(
          `/api/companies/${companyId}/restaurants/${locationId}/staffing?date=${selectedDate}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          },
        );
        const data = (await response.json()) as StaffingSnapshot & { error?: string };
        if (!response.ok) {
          setError(data.error ?? "Unable to save staffing");
          return false;
        }
        setSnapshot(data);
        return true;
      } catch {
        setError("Unable to save staffing");
        return false;
      } finally {
        setPending(false);
      }
    },
    [companyId, locationId, selectedDate],
  );

  return { snapshot, error, pending, submit };
}
