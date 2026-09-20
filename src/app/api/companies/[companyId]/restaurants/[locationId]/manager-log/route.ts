import { getLocationRole } from "@/lib/authorization/guards";
import { roleHasPermission } from "@/lib/authorization/permissions";
import { handleRouteError } from "@/lib/http/errors";
import { readJson } from "@/lib/http/request";
import { managerLogActionSchema } from "@/lib/manager-log/schemas";
import { applyManagerLogAction, getManagerLogSnapshot } from "@/lib/manager-log/service";
import { requireRestaurantOperations } from "@/lib/operations/scope";

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
      await getManagerLogSnapshot(
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
    const action = managerLogActionSchema.parse(await readJson(request));
    await applyManagerLogAction(scope, restaurant.timezone, user.id, action);
    const date = action.type === "create" ? action.businessDate : new URL(request.url).searchParams.get("date");
    const role = getLocationRole(user, locationId, companyId);
    return noStore(
      await getManagerLogSnapshot(
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
