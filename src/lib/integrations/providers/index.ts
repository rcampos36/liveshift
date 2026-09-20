import "server-only";

import { registerPosProvider } from "@/lib/integrations/registry";
import { CloverProvider } from "@/lib/integrations/providers/clover";
import { ManualProvider } from "@/lib/integrations/providers/manual";
import { SquareProvider } from "@/lib/integrations/providers/square";
import { ToastProvider } from "@/lib/integrations/providers/toast";

registerPosProvider(new ToastProvider());
registerPosProvider(new SquareProvider());
registerPosProvider(new CloverProvider());
registerPosProvider(new ManualProvider());
