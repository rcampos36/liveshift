import Link from "next/link";
import { prisma } from "@/lib/db/prisma";
import { assertOperationalCompanyPage, requireCompanyPage } from "@/lib/authorization/page-access";
import { displayRole } from "@/lib/authorization/roles";
import { roleHasPermission } from "@/lib/authorization/permissions";
import { InviteForm } from "@/components/app/invite-form";

export default async function TeamPage({
  params,
}: {
  params: Promise<{ companyId: string }>;
}) {
  const { companyId } = await params;
  const { company } = await requireCompanyPage(companyId);
  assertOperationalCompanyPage(companyId, company.role);
  const canInvite = roleHasPermission(company.role, "users.invite");

  const [companyMembers, locationMembers] = await Promise.all([
    prisma.companyMembership.findMany({
      where: { companyId, status: "ACTIVE" },
      include: {
        user: { select: { id: true, email: true, firstName: true, lastName: true } },
      },
      orderBy: { createdAt: "asc" },
    }),
    prisma.locationMembership.findMany({
      where: {
        status: "ACTIVE",
        location: { companyId },
      },
      include: {
        user: { select: { id: true, email: true, firstName: true, lastName: true } },
        location: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <div>
        <Link href={`/dashboard/c/${companyId}`} className="text-sm text-orange-800 hover:underline">
          Back to {company.name}
        </Link>
        <h1 className="font-display mt-3 text-4xl text-stone-950">Team</h1>
        <p className="mt-2 text-stone-600">
          Company admins see every house. Everyone else is scoped to assigned restaurants.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <section className="space-y-3">
          <h2 className="font-display text-2xl text-stone-950">People</h2>
          <div className="overflow-hidden rounded-3xl border border-stone-200 bg-white">
            {companyMembers.length === 0 && locationMembers.length === 0 ? (
              <p className="px-5 py-8 text-sm text-stone-500">No teammates yet.</p>
            ) : (
              <ul className="divide-y divide-stone-100">
                {companyMembers.map((member) => (
                  <li key={member.id} className="flex items-center justify-between px-5 py-4">
                    <div>
                      <p className="font-medium text-stone-950">
                        {member.user.firstName} {member.user.lastName}
                      </p>
                      <p className="text-sm text-stone-500">{member.user.email}</p>
                    </div>
                    <span className="text-xs font-medium text-stone-600">{displayRole(member.role)}</span>
                  </li>
                ))}
                {locationMembers.map((member) => (
                  <li key={member.id} className="flex items-center justify-between px-5 py-4">
                    <div>
                      <p className="font-medium text-stone-950">
                        {member.user.firstName} {member.user.lastName}
                      </p>
                      <p className="text-sm text-stone-500">
                        {member.user.email} · {member.location.name}
                      </p>
                    </div>
                    <span className="text-xs font-medium text-stone-600">{displayRole(member.role)}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>

        {canInvite ? (
          <section className="space-y-3">
            <h2 className="font-display text-2xl text-stone-950">Add teammate</h2>
            <InviteForm
              companyId={companyId}
              restaurants={company.locations.map((item) => ({ id: item.id, name: item.name }))}
            />
          </section>
        ) : null}
      </div>
    </div>
  );
}
