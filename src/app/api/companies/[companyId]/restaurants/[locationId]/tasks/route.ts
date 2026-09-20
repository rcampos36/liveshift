import { getLocationRole } from "@/lib/authorization/guards";
import { roleHasPermission } from "@/lib/authorization/permissions";
import { handleRouteError } from "@/lib/http/errors";
import { readJson } from "@/lib/http/request";
import { requireRestaurantOperations } from "@/lib/operations/scope";
import { taskActionSchema } from "@/lib/tasks/schemas";
import { applyTaskAction, getTaskSnapshot } from "@/lib/tasks/service";

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
      await getTaskSnapshot(
        scope,
        restaurant.name,
        restaurant.timezone,
        role ? roleHasPermission(role, "operations.write") : false,
        user.id,
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
    const action = taskActionSchema.parse(await readJson(request));
    await applyTaskAction(scope, restaurant.timezone, user.id, action);
    const date =
      "businessDate" in action && action.businessDate
        ? action.businessDate
        : new URL(request.url).searchParams.get("date");
    const role = getLocationRole(user, locationId, companyId);
    return noStore(
      await getTaskSnapshot(
        scope,
        restaurant.name,
        restaurant.timezone,
        role ? roleHasPermission(role, "operations.write") : false,
        user.id,
        date,
      ),
    );
  } catch (error) {
    return handleRouteError(error);
  }
}
