import { LiveOperationsBoard } from "@/components/app/live-operations-board";
import { getLocationRole } from "@/lib/authorization/guards";
import { requireRestaurantPage } from "@/lib/authorization/page-access";
import { roleHasPermission } from "@/lib/authorization/permissions";
import { getLiveBoard } from "@/lib/operations/board";
import { requireRestaurantOperations } from "@/lib/operations/scope";

export default async function RestaurantDashboardPage({
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
  const board = await getLiveBoard(scope, house.timezone);
  const role = getLocationRole(user, locationId, companyId);
  const isTv = display === "tv";

  return (
    <LiveOperationsBoard
      companyId={companyId}
      locationId={locationId}
      companyName={company.name}
      restaurantName={restaurant.name}
      timezone={house.timezone}
      canWrite={role ? roleHasPermission(role, "operations.write") : false}
      canManageRestaurant={role ? roleHasPermission(role, "location.manage") : false}
      isTv={isTv}
      initialBoard={board}
    />
  );
}
