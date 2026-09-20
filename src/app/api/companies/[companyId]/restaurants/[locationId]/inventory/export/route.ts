import { handleRouteError } from "@/lib/http/errors";
import { toInventoryCsv } from "@/lib/inventory/csv";
import { getInventorySnapshot } from "@/lib/inventory/service";
import { requireRestaurantOperations } from "@/lib/operations/scope";

export async function GET(_request: Request, context: { params: Promise<{ companyId: string; locationId: string }> }) {
  try {
    const { companyId, locationId } = await context.params;
    const { restaurant, scope } = await requireRestaurantOperations(companyId, locationId, "operations.read");
    const snapshot = await getInventorySnapshot(scope, restaurant.name, restaurant.timezone, false);
    const csv = toInventoryCsv(snapshot.items);

    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${restaurant.name.toLowerCase().replaceAll(" ", "-")}-inventory.csv"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
