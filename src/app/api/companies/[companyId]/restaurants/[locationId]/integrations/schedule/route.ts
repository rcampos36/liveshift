import { getLocationRole } from "@/lib/authorization/guards";
import { roleHasPermission } from "@/lib/authorization/permissions";
import { handleRouteError } from "@/lib/http/errors";
import { getIntegrationSnapshot, runDueScheduledSyncs } from "@/lib/integrations/service";
import { requireRestaurantOperations } from "@/lib/operations/scope";

type RouteContext = {
  params: Promise<{ companyId: string; locationId: string }>;
};

function noStore(data: unknown) {
  return Response.json(data, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(_request: Request, context: RouteContext) {
  try {
    const { companyId, locationId } = await context.params;
    const { user, restaurant, scope } = await requireRestaurantOperations(companyId, locationId, "integrations.write");
    const result = await runDueScheduledSyncs(scope);
    const role = getLocationRole(user, locationId, companyId);
    return noStore({
      ...result,
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
