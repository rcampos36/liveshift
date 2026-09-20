import "server-only";

import { ProviderNotImplementedError } from "@/lib/integrations/errors";
import type {
  NormalizedEmployee,
  NormalizedMenuItem,
  NormalizedOrder,
  NormalizedPayment,
  NormalizedSalesDay,
} from "@/lib/integrations/models";
import type { PosProviderId, ProviderContext } from "@/lib/integrations/types";

export interface PosProvider {
  readonly id: PosProviderId;
  getSales(context: ProviderContext): Promise<NormalizedSalesDay[]>;
  getOrders(context: ProviderContext): Promise<NormalizedOrder[]>;
  getEmployees(context: ProviderContext): Promise<NormalizedEmployee[]>;
  getMenuItems(context: ProviderContext): Promise<NormalizedMenuItem[]>;
  getPayments(context: ProviderContext): Promise<NormalizedPayment[]>;
}

export abstract class UnimplementedPosProvider implements PosProvider {
  abstract readonly id: PosProviderId;

  getSales(): Promise<NormalizedSalesDay[]> {
    throw new ProviderNotImplementedError(this.id);
  }

  getOrders(): Promise<NormalizedOrder[]> {
    throw new ProviderNotImplementedError(this.id);
  }

  getEmployees(): Promise<NormalizedEmployee[]> {
    throw new ProviderNotImplementedError(this.id);
  }

  getMenuItems(): Promise<NormalizedMenuItem[]> {
    throw new ProviderNotImplementedError(this.id);
  }

  getPayments(): Promise<NormalizedPayment[]> {
    throw new ProviderNotImplementedError(this.id);
  }
}
