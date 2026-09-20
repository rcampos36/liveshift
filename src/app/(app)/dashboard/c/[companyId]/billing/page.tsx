import { redirect } from "next/navigation";
import { BillingBoard } from "@/components/app/billing-board";
import { requireCompanyPage } from "@/lib/authorization/page-access";
import { companyHomePath, roleHasPermission } from "@/lib/authorization/permissions";
import { getBillingSnapshot } from "@/lib/billing/service";

export default async function BillingPage({
  params,
}: {
  params: Promise<{ companyId: string }>;
}) {
  const { companyId } = await params;
  const { company } = await requireCompanyPage(companyId);
  if (!roleHasPermission(company.role, "billing.read")) {
    redirect(companyHomePath(companyId, company.role));
  }

  return (
    <BillingBoard
      companyId={companyId}
      initial={await getBillingSnapshot(companyId, company.name, roleHasPermission(company.role, "billing.manage"))}
    />
  );
}
