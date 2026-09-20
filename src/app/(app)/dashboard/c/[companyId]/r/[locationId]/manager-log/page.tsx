import { ManagerLogBoard } from "@/components/app/manager-log-board";
import { getLocationRole } from "@/lib/authorization/guards";
import { requireRestaurantPage } from "@/lib/authorization/page-access";
import { roleHasPermission } from "@/lib/authorization/permissions";
import { getManagerLogSnapshot } from "@/lib/manager-log/service";
import { requireRestaurantOperations } from "@/lib/operations/scope";

export default async function ManagerLogPage({
  params,
}: {
  params: Promise<{ companyId: string; locationId: string }>;
}) {
  const { companyId, locationId } = await params;
  const { user, company, restaurant } = await requireRestaurantPage(companyId, locationId);
  const { restaurant: house, scope } = await requireRestaurantOperations(companyId, locationId);
  const role = getLocationRole(user, locationId, companyId);

  return (
    <ManagerLogBoard
      companyId={companyId}
      locationId={locationId}
      companyName={company.name}
      initial={await getManagerLogSnapshot(
        scope,
        restaurant.name,
        house.timezone,
        role ? roleHasPermission(role, "operations.write") : false,
        user.id,
      )}
    />
  );
}
