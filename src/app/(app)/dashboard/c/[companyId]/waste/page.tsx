import { WasteAnalytics } from "@/components/app/waste-analytics";
import { getCompanyRole } from "@/lib/authorization/guards";
import { assertOperationalCompanyPage, requireCompanyPage } from "@/lib/authorization/page-access";
import { roleHasPermission } from "@/lib/authorization/permissions";
import { prisma } from "@/lib/db/prisma";
import { getWasteSnapshot } from "@/lib/waste/service";

export default async function CompanyWastePage({
  params,
}: {
  params: Promise<{ companyId: string }>;
}) {
  const { companyId } = await params;
  const { user, company } = await requireCompanyPage(companyId);
  assertOperationalCompanyPage(companyId, company.role);
  const role = getCompanyRole(user, companyId);
  const house = await prisma.location.findFirst({
    where: { companyId },
    select: { timezone: true },
  });

  return (
    <WasteAnalytics
      companyId={companyId}
      companyName={company.name}
      current="company"
      initial={await getWasteSnapshot({
        companyId,
        restaurantName: company.name,
        timezone: house?.timezone ?? "America/New_York",
        canWrite: role ? roleHasPermission(role, "waste.write") : false,
        currentUserId: user.id,
      })}
    />
  );
}
