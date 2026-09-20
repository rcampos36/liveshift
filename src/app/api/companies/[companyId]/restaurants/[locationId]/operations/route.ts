import { getLocationRole } from "@/lib/authorization/guards";
import { roleHasPermission } from "@/lib/authorization/permissions";
import { handleRouteError } from "@/lib/http/errors";
import { readJson } from "@/lib/http/request";
import { applyOperationsAction } from "@/lib/operations/actions";
import { getLiveBoard } from "@/lib/operations/board";
import { operationsActionSchema } from "@/lib/operations/schemas";
import { requireRestaurantOperations } from "@/lib/operations/scope";

type RouteContext = {
  params: Promise<{ companyId: string; locationId: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { companyId, locationId } = await context.params;
    const { user, restaurant, scope } = await requireRestaurantOperations(
      companyId,
      locationId,
      "operations.read",
    );
    const role = getLocationRole(user, locationId, companyId);
    const board = await getLiveBoard(scope, restaurant.timezone);

    return Response.json(
      {
        ...board,
        restaurantName: restaurant.name,
        timezone: restaurant.timezone,
        canWrite: role ? roleHasPermission(role, "operations.write") : false,
      },
      { headers: { "Cache-Control": "no-store" } },
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
    const action = operationsActionSchema.parse(await readJson(request));
    await applyOperationsAction(scope, restaurant.timezone, user.id, action);
    const board = await getLiveBoard(scope, restaurant.timezone);

    return Response.json({
      ...board,
      restaurantName: restaurant.name,
      timezone: restaurant.timezone,
      canWrite: true,
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
