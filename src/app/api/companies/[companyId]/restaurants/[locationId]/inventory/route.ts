import { getLocationRole } from "@/lib/authorization/guards";
import { roleHasPermission } from "@/lib/authorization/permissions";
import { handleRouteError } from "@/lib/http/errors";
import { readJson } from "@/lib/http/request";
import { applyInventoryAction, getInventorySnapshot } from "@/lib/inventory/service";
import { inventoryActionSchema } from "@/lib/inventory/schemas";
import { requireRestaurantOperations } from "@/lib/operations/scope";

type RouteContext = {
  params: Promise<{ companyId: string; locationId: string }>;
};

function noStore(data: unknown) {
  return Response.json(data, { headers: { "Cache-Control": "no-store" } });
}

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { companyId, locationId } = await context.params;
    const { user, restaurant, scope } = await requireRestaurantOperations(
      companyId,
      locationId,
      "operations.read",
    );
    const role = getLocationRole(user, locationId, companyId);
    return noStore(
      await getInventorySnapshot(
        scope,
        restaurant.name,
        restaurant.timezone,
        role ? roleHasPermission(role, "operations.write") : false,
      ),
    );
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const { companyId, locationId } = await context.params;
    const { user, restaurant, scope } = await requireRestaurantOperations(
      companyId,
      locationId,
      "operations.write",
    );
    const action = inventoryActionSchema.parse(await readJson(request));
    await applyInventoryAction(scope, user.id, action);
    return noStore(await getInventorySnapshot(scope, restaurant.name, restaurant.timezone, true));
  } catch (error) {
    return handleRouteError(error);
  }
}
