import { Suspense } from "react";
import { AppShell } from "@/components/app/app-shell";
import { requirePageUser } from "@/lib/authorization/guards";
import { getAccessibleScope } from "@/lib/authorization/scope";
import { displayRole } from "@/lib/authorization/roles";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requirePageUser();
  const companies = await getAccessibleScope(user);
  const roleLabel = user.platformRole
    ? displayRole(user.platformRole)
    : user.companyMemberships[0]
      ? displayRole(user.companyMemberships[0].role)
      : user.locationMemberships[0]
        ? displayRole(user.locationMemberships[0].role)
        : "Member";

  return (
    <Suspense fallback={<div className="min-h-dvh bg-[#f3eee4]" />}>
      <AppShell
        userName={`${user.firstName} ${user.lastName}`}
        roleLabel={roleLabel}
        companies={companies}
      >
        {children}
      </AppShell>
    </Suspense>
  );
}
