import { redirect } from "next/navigation";
import { IntegrationBoard } from "@/components/app/integration-board";
import { getLocationRole } from "@/lib/authorization/guards";
import { requireRestaurantPage } from "@/lib/authorization/page-access";
import { roleHasPermission } from "@/lib/authorization/permissions";
import { getIntegrationSnapshot } from "@/lib/integrations/service";
import { requireRestaurantOperations } from "@/lib/operations/scope";

export default async function IntegrationsPage({
  params,
}: {
  params: Promise<{ companyId: string; locationId: string }>;
}) {
  const { companyId, locationId } = await params;
  const { user, company, restaurant } = await requireRestaurantPage(companyId, locationId);
  const role = getLocationRole(user, locationId, companyId);
  if (!role || !roleHasPermission(role, "integrations.read")) {
    redirect(`/dashboard/c/${companyId}/r/${locationId}`);
  }
  const { restaurant: house, scope } = await requireRestaurantOperations(companyId, locationId, "integrations.read");

  return (
    <IntegrationBoard
      companyId={companyId}
      locationId={locationId}
      companyName={company.name}
      initial={await getIntegrationSnapshot(
        scope,
        restaurant.name,
        house.timezone,
        role ? roleHasPermission(role, "integrations.write") : false,
      )}
    />
  );
}
