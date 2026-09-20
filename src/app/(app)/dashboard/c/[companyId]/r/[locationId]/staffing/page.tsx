import { StaffingBoard } from "@/components/app/staffing-board";
import { getLocationRole } from "@/lib/authorization/guards";
import { requireRestaurantPage } from "@/lib/authorization/page-access";
import { roleHasPermission } from "@/lib/authorization/permissions";
import { requireRestaurantOperations } from "@/lib/operations/scope";
import { getStaffingSnapshot } from "@/lib/staffing/service";

export default async function StaffingPage({
  params,
}: {
  params: Promise<{ companyId: string; locationId: string }>;
}) {
  const { companyId, locationId } = await params;
  const { user, company, restaurant } = await requireRestaurantPage(companyId, locationId);
  const { restaurant: house, scope } = await requireRestaurantOperations(companyId, locationId);
  const role = getLocationRole(user, locationId, companyId);

  return (
    <StaffingBoard
      companyId={companyId}
      locationId={locationId}
      companyName={company.name}
      view="board"
      initial={await getStaffingSnapshot(
        scope,
        restaurant.name,
        house.timezone,
        role ? roleHasPermission(role, "operations.write") : false,
      )}
    />
  );
}
