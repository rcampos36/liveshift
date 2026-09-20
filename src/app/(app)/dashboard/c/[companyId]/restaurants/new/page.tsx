import Link from "next/link";
import { redirect } from "next/navigation";
import { RestaurantForm } from "@/components/app/restaurant-form";
import { requireCompanyPage } from "@/lib/authorization/page-access";
import { companyHomePath, roleHasPermission } from "@/lib/authorization/permissions";

export default async function NewRestaurantPage({
  params,
}: {
  params: Promise<{ companyId: string }>;
}) {
  const { companyId } = await params;
  const { company } = await requireCompanyPage(companyId);

  if (!roleHasPermission(company.role, "location.manage")) {
    redirect(companyHomePath(companyId, company.role));
  }

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div>
        <Link href={`/dashboard/c/${companyId}`} className="text-sm text-orange-800 hover:underline">
          Back to {company.name}
        </Link>
        <h1 className="font-display mt-3 text-4xl text-stone-950">Add a restaurant</h1>
        <p className="mt-2 text-stone-600">
          This house gets its own isolated 86s, inventory, waste, and logs.
        </p>
      </div>
      <RestaurantForm companyId={companyId} />
    </div>
  );
}
