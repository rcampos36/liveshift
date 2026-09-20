import { handleRouteError } from "@/lib/http/errors";
import { getAuditSnapshot } from "@/lib/audit/log";
import { requireRestaurantOperations } from "@/lib/operations/scope";

type RouteContext = {
  params: Promise<{ companyId: string; locationId: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { companyId, locationId } = await context.params;
    const { restaurant, scope } = await requireRestaurantOperations(companyId, locationId, "audit.read");
    return Response.json(await getAuditSnapshot(scope, restaurant.name), {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
