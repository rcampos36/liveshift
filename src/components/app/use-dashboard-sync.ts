"use client";

import { useCallback, useEffect, useRef } from "react";

const REVISION_POLL_MS = 3000;

export function useDashboardSync(
  companyId: string,
  locationId: string,
  onRevisionChange: () => void,
  initialRevision?: number,
) {
  const revisionRef = useRef<number | null>(initialRevision ?? null);
  const onChangeRef = useRef(onRevisionChange);
  onChangeRef.current = onRevisionChange;

  const markSeen = useCallback((revision: number) => {
    revisionRef.current = revision;
  }, []);

  useEffect(() => {
    if (!companyId || !locationId) return;
    let cancelled = false;
    const endpoint = `/api/dashboard-sync/revision?companyId=${encodeURIComponent(companyId)}&restaurantId=${encodeURIComponent(locationId)}`;

    async function check() {
      try {
        const response = await fetch(endpoint, { cache: "no-store" });
        if (!response.ok || cancelled) return;
        const data = (await response.json()) as { restaurantId?: string; revision?: number; error?: string };
        if (typeof data.revision !== "number") return;
        if (revisionRef.current == null) {
          revisionRef.current = data.revision;
          return;
        }
        if (data.revision !== revisionRef.current) {
          revisionRef.current = data.revision;
          onChangeRef.current();
        }
      } catch {
        // Keep the current dashboard on screen; the next poll retries.
      }
    }

    void check();
    const poll = window.setInterval(() => {
      void check();
    }, REVISION_POLL_MS);
    return () => {
      cancelled = true;
      window.clearInterval(poll);
    };
  }, [companyId, locationId]);

  return { markSeen };
}
