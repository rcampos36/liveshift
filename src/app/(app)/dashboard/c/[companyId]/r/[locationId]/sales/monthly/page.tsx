import { SalesBoard } from "@/components/app/sales-board";
import { getLocationRole } from "@/lib/authorization/guards";
import { requireRestaurantPage } from "@/lib/authorization/page-access";
import { roleHasPermission } from "@/lib/authorization/permissions";
import { requireRestaurantOperations } from "@/lib/operations/scope";
import { getSalesSnapshot } from "@/lib/sales/service";

export default async function SalesMonthlyPage({
  params,
}: {
  params: Promise<{ companyId: string; locationId: string }>;
}) {
  const { companyId, locationId } = await params;
  const { user, company, restaurant } = await requireRestaurantPage(companyId, locationId);
  const { restaurant: house, scope } = await requireRestaurantOperations(companyId, locationId);
  const role = getLocationRole(user, locationId, companyId);

  return (
    <SalesBoard
      companyId={companyId}
      locationId={locationId}
      companyName={company.name}
      period="monthly"
      initial={await getSalesSnapshot(
        scope,
        restaurant.name,
        house.timezone,
        role ? roleHasPermission(role, "operations.write") : false,
      )}
    />
  );
}
