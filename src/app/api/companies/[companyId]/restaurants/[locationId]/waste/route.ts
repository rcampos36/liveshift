import { getLocationRole } from "@/lib/authorization/guards";
import { roleHasPermission } from "@/lib/authorization/permissions";
import { handleRouteError } from "@/lib/http/errors";
import { readJson } from "@/lib/http/request";
import { requireRestaurantOperations } from "@/lib/operations/scope";
import { wasteActionSchema } from "@/lib/waste/schemas";
import { getWasteSnapshot, recordWaste } from "@/lib/waste/service";

type RouteContext = {
  params: Promise<{ companyId: string; locationId: string }>;
};

function noStore(data: unknown) {
  return Response.json(data, { headers: { "Cache-Control": "no-store" } });
}

async function snapshotFor(
  companyId: string,
  locationId: string,
  restaurantName: string,
  timezone: string,
  userId: string,
  canWrite: boolean,
) {
  return getWasteSnapshot({
    companyId,
    locationId,
    restaurantName,
    timezone,
    canWrite,
    currentUserId: userId,
  });
}

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { companyId, locationId } = await context.params;
    const { user, restaurant, scope } = await requireRestaurantOperations(companyId, locationId, "waste.read");
    const role = getLocationRole(user, locationId, companyId);
    return noStore(
      await snapshotFor(
        scope.companyId,
        scope.locationId,
        restaurant.name,
        restaurant.timezone,
        user.id,
        role ? roleHasPermission(role, "waste.write") : false,
      ),
    );
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const { companyId, locationId } = await context.params;
    const { user, restaurant, scope } = await requireRestaurantOperations(companyId, locationId, "waste.write");
    const action = wasteActionSchema.parse(await readJson(request));
    await recordWaste(scope, user.id, restaurant.timezone, action);
    return noStore(
      await snapshotFor(scope.companyId, scope.locationId, restaurant.name, restaurant.timezone, user.id, true),
    );
  } catch (error) {
    return handleRouteError(error);
  }
}
