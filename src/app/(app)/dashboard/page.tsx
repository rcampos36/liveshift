import Link from "next/link";
import { ResendVerificationButton } from "@/components/app/resend-verification-button";
import { requirePageUser } from "@/lib/authorization/guards";
import { getAccessibleScope } from "@/lib/authorization/scope";
import { displayRole } from "@/lib/authorization/roles";
import { companyHomePath, roleHasPermission } from "@/lib/authorization/permissions";

function greetingFor(firstName: string) {
  const hour = Number(
    new Intl.DateTimeFormat("en-US", {
      hour: "numeric",
      hourCycle: "h23",
      timeZone: "America/New_York",
    }).format(new Date()),
  );
  const salutation = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  return `${salutation}, ${firstName}.`;
}

export default async function DashboardPage() {
  const user = await requirePageUser();
  const companies = await getAccessibleScope(user);
  const restaurantCount = companies.reduce((total, company) => total + company.locations.length, 0);
  const today = new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  }).format(new Date());

  return (
    <div className="mx-auto max-w-6xl space-y-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#8a6a4a]">Houses</p>
          <h1 className="font-display mt-3 text-[2.65rem] leading-[1.05] tracking-tight text-stone-950">
            {greetingFor(user.firstName)}
          </h1>
          <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-stone-500">
            Open a company to review the group, or a restaurant to take tonight&apos;s board.
          </p>
        </div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-stone-400">{today}</p>
      </div>

      {!user.emailVerifiedAt ? (
        <div className="rounded-2xl border border-amber-200/80 bg-amber-50/80 px-5 py-4">
          <p className="font-medium text-amber-950">Verify your email</p>
          <p className="mb-3 mt-1 text-sm text-amber-900/80">
            Check your inbox for a confirmation link. Until then, account recovery stays limited.
          </p>
          <ResendVerificationButton />
        </div>
      ) : null}

      <section className="overflow-hidden rounded-2xl border border-stone-200/80 bg-white/75 shadow-[0_28px_60px_-42px_rgba(28,20,16,0.55)] backdrop-blur">
        <div className="grid sm:grid-cols-3">
          <StatCell label="Companies" value={String(companies.length)} />
          <StatCell label="Restaurants" value={String(restaurantCount)} />
          <StatCell label="Your access" value={user.platformRole ? "Platform" : "Assigned houses"} last />
        </div>
      </section>

      {companies.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-stone-300/80 bg-white/50 px-6 py-16 text-center text-stone-500">
          You are not assigned to a company or restaurant yet.
        </div>
      ) : (
        <div className="grid gap-5">
          {companies.map((company) => {
            const canManage = roleHasPermission(company.role, "location.manage");
            const homeHref = companyHomePath(company.id, company.role);
            return (
              <article
                key={company.id}
                className="overflow-hidden rounded-2xl border border-stone-200/80 bg-white/80 shadow-[0_28px_60px_-42px_rgba(28,20,16,0.45)] backdrop-blur"
              >
                <div className="flex flex-wrap items-start justify-between gap-4 border-b border-stone-100 bg-[#faf6ef]/60 px-6 py-5">
                  <div>
                    <Link href={homeHref} className="font-display text-[1.85rem] leading-none tracking-tight text-stone-950 hover:text-[#6b4a32]">
                      {company.name}
                    </Link>
                    <p className="mt-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-stone-400">
                      {displayRole(company.role)}
                      <span className="mx-2 text-stone-300">·</span>
                      {company.locations.length} restaurant{company.locations.length === 1 ? "" : "s"}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Link
                      href={homeHref}
                      className="rounded-full border border-stone-200/90 bg-white/70 px-4 py-2 text-[13px] font-medium text-stone-800 hover:bg-white"
                    >
                      {roleHasPermission(company.role, "operations.read") ? "Open company" : "Open billing"}
                    </Link>
                    {canManage ? (
                      <Link
                        href={`/dashboard/c/${company.id}/restaurants/new`}
                        className="rounded-full bg-[#1c1410] px-4 py-2 text-[13px] font-medium text-[#fff6ea] hover:bg-[#2a211c]"
                      >
                        Add restaurant
                      </Link>
                    ) : null}
                  </div>
                </div>
                {company.locations.length === 0 ? (
                  <p className="px-6 py-6 text-sm text-stone-500">
                    No restaurants yet. Add the first house to open a service board.
                  </p>
                ) : (
                  <ul>
                    {company.locations.map((location, index) => (
                      <li key={location.id} className="border-t border-stone-100 first:border-t-0">
                        <Link
                          href={`/dashboard/c/${company.id}/r/${location.id}`}
                          className="group flex items-center justify-between gap-4 px-6 py-4 transition hover:bg-[#faf6ef]/80"
                        >
                          <div className="flex min-w-0 items-center gap-4">
                            <span className="w-6 text-[11px] font-semibold tabular-nums text-[#8a6a4a]/70">
                              {String(index + 1).padStart(2, "0")}
                            </span>
                            <div className="min-w-0">
                              <p className="font-medium tracking-tight text-stone-950">{location.name}</p>
                              <p className="mt-0.5 text-[12px] text-stone-400">Live restaurant board</p>
                            </div>
                          </div>
                          <span className="flex items-center gap-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-stone-400 group-hover:text-[#8a6a4a]">
                            {displayRole(location.role)}
                            <span aria-hidden className="text-stone-300 transition group-hover:translate-x-0.5 group-hover:text-[#8a6a4a]">
                              →
                            </span>
                          </span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}

function StatCell({ label, value, last = false }: { label: string; value: string; last?: boolean }) {
  return (
    <div className={`px-6 py-5 ${last ? "" : "border-b border-stone-100 sm:border-b-0 sm:border-r"}`}>
      <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-stone-400">{label}</p>
      <p className="font-display mt-2 text-[2rem] leading-none tracking-tight text-stone-950">{value}</p>
    </div>
  );
}
