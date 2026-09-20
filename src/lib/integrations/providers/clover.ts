import "server-only";

import { UnimplementedPosProvider } from "@/lib/integrations/provider";

export class CloverProvider extends UnimplementedPosProvider {
  readonly id = "CLOVER" as const;
}
