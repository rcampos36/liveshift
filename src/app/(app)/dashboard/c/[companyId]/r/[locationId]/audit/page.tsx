import { redirect } from "next/navigation";
import { AuditLogBoard } from "@/components/app/audit-log-board";
import { getLocationRole } from "@/lib/authorization/guards";
import { requireRestaurantPage } from "@/lib/authorization/page-access";
import { roleHasPermission } from "@/lib/authorization/permissions";
import { getAuditSnapshot } from "@/lib/audit/log";
import { requireRestaurantOperations } from "@/lib/operations/scope";

export default async function AuditLogPage({
  params,
}: {
  params: Promise<{ companyId: string; locationId: string }>;
}) {
  const { companyId, locationId } = await params;
  const { user, company } = await requireRestaurantPage(companyId, locationId);
  const role = getLocationRole(user, locationId, companyId);
  if (!role || !roleHasPermission(role, "audit.read")) {
    redirect(`/dashboard/c/${companyId}/r/${locationId}`);
  }
  const { restaurant: house, scope } = await requireRestaurantOperations(companyId, locationId, "audit.read");

  return (
    <AuditLogBoard
      companyId={companyId}
      locationId={locationId}
      companyName={company.name}
      initial={await getAuditSnapshot(scope, house.name)}
    />
  );
}
