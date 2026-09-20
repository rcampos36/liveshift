import type { PosProviderId } from "@/lib/integrations/types";

export class ProviderError extends Error {
  code: string;
  status: number;
  retryable: boolean;
  providerId?: PosProviderId;

  constructor(
    message: string,
    options?: {
      code?: string;
      status?: number;
      retryable?: boolean;
      providerId?: PosProviderId;
    },
  ) {
    super(message);
    this.name = "ProviderError";
    this.code = options?.code ?? "PROVIDER_ERROR";
    this.status = options?.status ?? 502;
    this.retryable = options?.retryable ?? false;
    this.providerId = options?.providerId;
  }
}

export class ProviderNotImplementedError extends ProviderError {
  constructor(providerId: PosProviderId) {
    super(`${providerId} is registered but not implemented. Review the adapter layer before adding a vendor client.`, {
      code: "PROVIDER_NOT_IMPLEMENTED",
      status: 501,
      retryable: false,
      providerId,
    });
    this.name = "ProviderNotImplementedError";
  }
}

export class IntegrationCredentialError extends ProviderError {
  constructor(message: string) {
    super(message, { code: "CREDENTIAL_ERROR", status: 400, retryable: false });
    this.name = "IntegrationCredentialError";
  }
}
