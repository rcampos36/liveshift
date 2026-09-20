"use client";

import { useCallback, useEffect, useState } from "react";
import type { CompanyOperationsSnapshot } from "@/lib/company-operations/types";

const POLL_MS = 4000;

export function useCompanyOperations(companyId: string, initial: CompanyOperationsSnapshot) {
  const [snapshot, setSnapshot] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const endpoint = `/api/companies/${companyId}/operations`;

  const refresh = useCallback(async () => {
    try {
      const response = await fetch(endpoint, { cache: "no-store" });
      const data = (await response.json()) as CompanyOperationsSnapshot & { error?: string };
      if (!response.ok) {
        setError(data.error ?? "Unable to refresh company operations");
        return;
      }
      setSnapshot(data);
      setError(null);
    } catch {
      setError("Company operations lost connection");
    }
  }, [endpoint]);

  useEffect(() => {
    const poll = window.setInterval(() => {
      void refresh();
    }, POLL_MS);
    return () => window.clearInterval(poll);
  }, [refresh]);

  return { snapshot, error, refresh };
}
