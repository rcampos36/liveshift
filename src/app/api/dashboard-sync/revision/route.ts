import { handleRouteError } from "@/lib/http/errors";
import { getDashboardRevision } from "@/lib/operations/revision";
import { requireRestaurantOperations } from "@/lib/operations/scope";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const companyId = url.searchParams.get("companyId") ?? "";
    const restaurantId = url.searchParams.get("restaurantId") ?? url.searchParams.get("locationId") ?? "";
    const { scope } = await requireRestaurantOperations(companyId, restaurantId, "operations.read");
    return Response.json(await getDashboardRevision(scope), {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
