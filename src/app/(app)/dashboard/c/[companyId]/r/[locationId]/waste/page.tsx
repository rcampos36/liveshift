import { WasteLog } from "@/components/app/waste-log";
import { getLocationRole } from "@/lib/authorization/guards";
import { requireRestaurantPage } from "@/lib/authorization/page-access";
import { roleHasPermission } from "@/lib/authorization/permissions";
import { requireRestaurantOperations } from "@/lib/operations/scope";
import { getWasteSnapshot } from "@/lib/waste/service";

export default async function WasteLogPage({
  params,
}: {
  params: Promise<{ companyId: string; locationId: string }>;
}) {
  const { companyId, locationId } = await params;
  const { user, company, restaurant } = await requireRestaurantPage(companyId, locationId);
  const { restaurant: house, scope } = await requireRestaurantOperations(companyId, locationId, "waste.read");
  const role = getLocationRole(user, locationId, companyId);

  return (
    <WasteLog
      companyId={companyId}
      locationId={locationId}
      companyName={company.name}
      initial={await getWasteSnapshot({
        companyId: scope.companyId,
        locationId: scope.locationId,
        restaurantName: restaurant.name,
        timezone: house.timezone,
        canWrite: role ? roleHasPermission(role, "waste.write") : false,
        currentUserId: user.id,
      })}
    />
  );
}
