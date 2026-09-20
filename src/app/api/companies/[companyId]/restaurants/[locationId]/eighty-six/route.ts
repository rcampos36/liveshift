import { getLocationRole } from "@/lib/authorization/guards";
import { roleHasPermission } from "@/lib/authorization/permissions";
import { handleRouteError } from "@/lib/http/errors";
import { readJson } from "@/lib/http/request";
import { applyEightySixAction, getEightySixSnapshot } from "@/lib/eighty-six/service";
import { eightySixActionSchema } from "@/lib/eighty-six/schemas";
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
    const canWrite = role ? roleHasPermission(role, "operations.write") : false;
    return noStore(await getEightySixSnapshot(scope, restaurant.name, restaurant.timezone, canWrite));
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
    const action = eightySixActionSchema.parse(await readJson(request));
    await applyEightySixAction(scope, user.id, action);
    return noStore(await getEightySixSnapshot(scope, restaurant.name, restaurant.timezone, true));
  } catch (error) {
    return handleRouteError(error);
  }
}
