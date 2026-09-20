import { handleRouteError } from "@/lib/http/errors";
import { requireRestaurantOperations } from "@/lib/operations/scope";
import { toLaborCsv } from "@/lib/staffing/csv";
import { getStaffingSnapshot } from "@/lib/staffing/service";

export async function GET(request: Request, context: { params: Promise<{ companyId: string; locationId: string }> }) {
  try {
    const { companyId, locationId } = await context.params;
    const date = new URL(request.url).searchParams.get("date");
    const { restaurant, scope } = await requireRestaurantOperations(companyId, locationId, "operations.read");
    const snapshot = await getStaffingSnapshot(scope, restaurant.name, restaurant.timezone, false, date);
    const csv = toLaborCsv([
      {
        businessDate: snapshot.selectedDate,
        laborCost: snapshot.kpis.laborCost,
        laborHours: snapshot.kpis.laborHours,
        netSales: snapshot.kpis.netSales,
        laborPercent: snapshot.kpis.laborPercent,
      },
    ]);

    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${restaurant.name.toLowerCase().replaceAll(" ", "-")}-labor.csv"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
