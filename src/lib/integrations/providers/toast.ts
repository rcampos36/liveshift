import "server-only";

import { UnimplementedPosProvider } from "@/lib/integrations/provider";

export class ToastProvider extends UnimplementedPosProvider {
  readonly id = "TOAST" as const;
}
