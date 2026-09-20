import { EightySixManagement } from "@/components/app/eighty-six-management";
import { getLocationRole } from "@/lib/authorization/guards";
import { requireRestaurantPage } from "@/lib/authorization/page-access";
import { roleHasPermission } from "@/lib/authorization/permissions";
import { getEightySixSnapshot } from "@/lib/eighty-six/service";
import { requireRestaurantOperations } from "@/lib/operations/scope";

export default async function EightySixManagementPage({
  params,
}: {
  params: Promise<{ companyId: string; locationId: string }>;
}) {
  const { companyId, locationId } = await params;
  const { user, company, restaurant } = await requireRestaurantPage(companyId, locationId);
  const { restaurant: house, scope } = await requireRestaurantOperations(companyId, locationId);
  const role = getLocationRole(user, locationId, companyId);
  const snapshot = await getEightySixSnapshot(
    scope,
    restaurant.name,
    house.timezone,
    role ? roleHasPermission(role, "operations.write") : false,
  );

  return (
    <EightySixManagement
      companyId={companyId}
      locationId={locationId}
      companyName={company.name}
      initial={snapshot}
    />
  );
}
