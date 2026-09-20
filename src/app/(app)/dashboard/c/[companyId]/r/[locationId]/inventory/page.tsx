import { InventoryBoard } from "@/components/app/inventory-board";
import { getLocationRole } from "@/lib/authorization/guards";
import { requireRestaurantPage } from "@/lib/authorization/page-access";
import { roleHasPermission } from "@/lib/authorization/permissions";
import { getInventorySnapshot } from "@/lib/inventory/service";
import { requireRestaurantOperations } from "@/lib/operations/scope";

export default async function InventoryPage({
  params,
}: {
  params: Promise<{ companyId: string; locationId: string }>;
}) {
  const { companyId, locationId } = await params;
  const { user, company, restaurant } = await requireRestaurantPage(companyId, locationId);
  const { restaurant: house, scope } = await requireRestaurantOperations(companyId, locationId);
  const role = getLocationRole(user, locationId, companyId);
  const snapshot = await getInventorySnapshot(
    scope,
    restaurant.name,
    house.timezone,
    role ? roleHasPermission(role, "operations.write") : false,
  );

  return (
    <InventoryBoard
      companyId={companyId}
      locationId={locationId}
      companyName={company.name}
      initial={snapshot}
    />
  );
}
