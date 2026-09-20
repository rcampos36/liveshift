import { getLocationRole } from "@/lib/authorization/guards";
import { roleHasPermission } from "@/lib/authorization/permissions";
import { handleRouteError } from "@/lib/http/errors";
import { readJson } from "@/lib/http/request";
import { requireRestaurantOperations } from "@/lib/operations/scope";
import { salesActionSchema } from "@/lib/sales/schemas";
import { applySalesAction, getSalesSnapshot } from "@/lib/sales/service";

type RouteContext = {
  params: Promise<{ companyId: string; locationId: string }>;
};

function noStore(data: unknown) {
  return Response.json(data, { headers: { "Cache-Control": "no-store" } });
}

export async function GET(request: Request, context: RouteContext) {
  try {
    const { companyId, locationId } = await context.params;
    const date = new URL(request.url).searchParams.get("date");
    const { user, restaurant, scope } = await requireRestaurantOperations(companyId, locationId, "operations.read");
    const role = getLocationRole(user, locationId, companyId);
    return noStore(
      await getSalesSnapshot(
        scope,
        restaurant.name,
        restaurant.timezone,
        role ? roleHasPermission(role, "operations.write") : false,
        date,
      ),
    );
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const { companyId, locationId } = await context.params;
    const { user, restaurant, scope } = await requireRestaurantOperations(companyId, locationId, "operations.write");
    const action = salesActionSchema.parse(await readJson(request));
    await applySalesAction(scope, restaurant.timezone, action);
    const date = action.businessDate;
    const role = getLocationRole(user, locationId, companyId);
    return noStore(
      await getSalesSnapshot(
        scope,
        restaurant.name,
        restaurant.timezone,
        role ? roleHasPermission(role, "operations.write") : false,
        date,
      ),
    );
  } catch (error) {
    return handleRouteError(error);
  }
}
