import { getLocationRole } from "@/lib/authorization/guards";
import { roleHasPermission } from "@/lib/authorization/permissions";
import { handleRouteError } from "@/lib/http/errors";
import { readJson } from "@/lib/http/request";
import { syncConnectionSchema } from "@/lib/integrations/schemas";
import { getIntegrationSnapshot, runIntegrationSync } from "@/lib/integrations/service";
import { requireRestaurantOperations } from "@/lib/operations/scope";

type RouteContext = {
  params: Promise<{ companyId: string; locationId: string }>;
};

function noStore(data: unknown) {
  return Response.json(data, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const { companyId, locationId } = await context.params;
    const { user, restaurant, scope } = await requireRestaurantOperations(companyId, locationId, "integrations.write");
    const input = syncConnectionSchema.parse(await readJson(request));
    const logs = await runIntegrationSync(scope, restaurant.timezone, input);
    const role = getLocationRole(user, locationId, companyId);
    return noStore({
      logs,
      snapshot: await getIntegrationSnapshot(
        scope,
        restaurant.name,
        restaurant.timezone,
        role ? roleHasPermission(role, "integrations.write") : false,
      ),
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
