import "server-only";

import { UnimplementedPosProvider } from "@/lib/integrations/provider";

export class SquareProvider extends UnimplementedPosProvider {
  readonly id = "SQUARE" as const;
}
