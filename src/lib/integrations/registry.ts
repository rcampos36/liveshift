import "server-only";

import { ProviderNotImplementedError } from "@/lib/integrations/errors";
import type { PosProvider } from "@/lib/integrations/provider";
import type { PosProviderId } from "@/lib/integrations/types";

const providers = new Map<PosProviderId, PosProvider>();
const implemented = new Set<PosProviderId>(["MANUAL"]);

export function registerPosProvider(provider: PosProvider) {
  providers.set(provider.id, provider);
}

export function getPosProvider(id: PosProviderId): PosProvider {
  const provider = providers.get(id);
  if (!provider) {
    throw new ProviderNotImplementedError(id);
  }
  return provider;
}

export function isProviderImplemented(id: PosProviderId) {
  return implemented.has(id);
}

export function listRegisteredProviderIds() {
  return [...providers.keys()];
}
