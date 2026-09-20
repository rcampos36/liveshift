import { CompanyOperationsBoard } from "@/components/app/company-operations-board";
import { assertOperationalCompanyPage, requireCompanyPage } from "@/lib/authorization/page-access";
import { roleHasPermission } from "@/lib/authorization/permissions";
import { getCompanyOperationsSnapshot } from "@/lib/company-operations/service";
import { prisma } from "@/lib/db/prisma";

export default async function CompanyDashboardPage({
  params,
}: {
  params: Promise<{ companyId: string }>;
}) {
  const { companyId } = await params;
  const { company } = await requireCompanyPage(companyId);
  assertOperationalCompanyPage(companyId, company.role);
  const houses = await prisma.location.findMany({
    where: { companyId, id: { in: company.locations.map((location) => location.id) } },
    select: { id: true, name: true, timezone: true },
    orderBy: { name: "asc" },
  });

  return (
    <CompanyOperationsBoard
      companyId={company.id}
      companyName={company.name}
      canManageCompany={roleHasPermission(company.role, "company.manage")}
      canManageRestaurants={roleHasPermission(company.role, "location.manage")}
      canManageUsers={roleHasPermission(company.role, "users.invite")}
      initial={await getCompanyOperationsSnapshot(company.id, company.name, houses)}
    />
  );
}
