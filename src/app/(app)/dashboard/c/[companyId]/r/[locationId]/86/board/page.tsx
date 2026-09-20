import { EightySixLiveBoard } from "@/components/app/eighty-six-live-board";
import { getLocationRole } from "@/lib/authorization/guards";
import { requireRestaurantPage } from "@/lib/authorization/page-access";
import { roleHasPermission } from "@/lib/authorization/permissions";
import { getEightySixSnapshot } from "@/lib/eighty-six/service";
import { requireRestaurantOperations } from "@/lib/operations/scope";

export default async function EightySixBoardPage({
  params,
  searchParams,
}: {
  params: Promise<{ companyId: string; locationId: string }>;
  searchParams: Promise<{ display?: string }>;
}) {
  const { companyId, locationId } = await params;
  const { display } = await searchParams;
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
    <EightySixLiveBoard
      companyId={companyId}
      locationId={locationId}
      companyName={company.name}
      isTv={display === "tv"}
      initial={snapshot}
    />
  );
}
