"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Logo } from "@/components/brand/logo";
import { SignOutButton } from "@/components/app/sign-out-button";
import type { AccessibleCompany } from "@/lib/authorization/scope";
import { companyHomePath, roleHasPermission } from "@/lib/authorization/permissions";
import { displayRole, type AppRole } from "@/lib/authorization/roles";

type NavLink = {
  href: string;
  label: string;
  match: boolean;
};

type NavEntry =
  | { type: "link"; href: string; label: string; match: boolean }
  | { type: "group"; label: string; items: NavLink[] };

type AppShellProps = {
  children: React.ReactNode;
  userName: string;
  roleLabel: string;
  companies: AccessibleCompany[];
};

function parseTenant(pathname: string) {
  const companyMatch = pathname.match(/\/dashboard\/c\/([^/]+)/);
  const restaurantMatch = pathname.match(/\/dashboard\/c\/[^/]+\/r\/([^/]+)/);
  return {
    companyId: companyMatch?.[1],
    locationId: restaurantMatch?.[1],
  };
}

export function AppShell({ children, userName, roleLabel, companies }: AppShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const isTv = searchParams.get("display") === "tv";
  const { companyId, locationId } = parseTenant(pathname);
  const company = companies.find((item) => item.id === companyId);
  const restaurants = company?.locations ?? [];

  const restaurantBase = company && locationId ? `/dashboard/c/${company.id}/r/${locationId}` : null;
  const companyItems: NavLink[] = company
    ? [
        roleHasPermission(company.role, "operations.read")
          ? { href: `/dashboard/c/${company.id}`, label: "Operations", match: pathname === `/dashboard/c/${company.id}` }
          : null,
        roleHasPermission(company.role, "billing.read")
          ? {
              href: `/dashboard/c/${company.id}/billing`,
              label: "Billing",
              match: pathname.startsWith(`/dashboard/c/${company.id}/billing`),
            }
          : null,
        roleHasPermission(company.role, "users.invite") || roleHasPermission(company.role, "company.manage")
          ? { href: `/dashboard/c/${company.id}/team`, label: "Team", match: pathname.startsWith(`/dashboard/c/${company.id}/team`) }
          : null,
        roleHasPermission(company.role, "waste.read")
          ? { href: `/dashboard/c/${company.id}/waste`, label: "Waste by restaurant", match: pathname === `/dashboard/c/${company.id}/waste` }
          : null,
      ].filter((item): item is NavLink => item !== null)
    : [];
  const items: NavEntry[] = [
    { type: "link", href: "/dashboard", label: "Houses", match: pathname === "/dashboard" },
    company && companyItems.length
      ? {
          type: "group",
          label: "Company",
          items: companyItems,
        }
      : null,
    restaurantBase
      ? {
          type: "link",
          href: restaurantBase,
          label: "Live ops",
          match: pathname === restaurantBase,
        }
      : null,
    restaurantBase
      ? {
          type: "link",
          href: `${restaurantBase}/integrations`,
          label: "Integrations",
          match: pathname.startsWith(`${restaurantBase}/integrations`),
        }
      : null,
    restaurantBase
      ? {
          type: "link",
          href: `${restaurantBase}/audit`,
          label: "Audit log",
          match: pathname.startsWith(`${restaurantBase}/audit`),
        }
      : null,
    restaurantBase
      ? {
          type: "link",
          href: `${restaurantBase}/manager-log`,
          label: "Manager log",
          match: pathname.startsWith(`${restaurantBase}/manager-log`),
        }
      : null,
    restaurantBase
      ? {
          type: "group",
          label: "Tasks",
          items: [
            { href: `${restaurantBase}/tasks`, label: "Board", match: pathname === `${restaurantBase}/tasks` },
            { href: `${restaurantBase}/tasks/templates`, label: "Templates", match: pathname.startsWith(`${restaurantBase}/tasks/templates`) },
          ],
        }
      : null,
    restaurantBase
      ? {
          type: "group",
          label: "Staffing",
          items: [
            { href: `${restaurantBase}/staffing`, label: "Board", match: pathname === `${restaurantBase}/staffing` },
            { href: `${restaurantBase}/staffing/labor`, label: "Labor", match: pathname.startsWith(`${restaurantBase}/staffing/labor`) },
          ],
        }
      : null,
    restaurantBase
      ? {
          type: "group",
          label: "Sales",
          items: [
            { href: `${restaurantBase}/sales`, label: "Daily", match: pathname === `${restaurantBase}/sales` },
            { href: `${restaurantBase}/sales/weekly`, label: "Weekly", match: pathname.startsWith(`${restaurantBase}/sales/weekly`) },
            { href: `${restaurantBase}/sales/monthly`, label: "Monthly", match: pathname.startsWith(`${restaurantBase}/sales/monthly`) },
          ],
        }
      : null,
    restaurantBase
      ? {
          type: "group",
          label: "86",
          items: [
            { href: `${restaurantBase}/86`, label: "Manage", match: pathname === `${restaurantBase}/86` },
            { href: `${restaurantBase}/86/board`, label: "Live board", match: pathname.startsWith(`${restaurantBase}/86/board`) },
            { href: `${restaurantBase}/86/history`, label: "History", match: pathname.startsWith(`${restaurantBase}/86/history`) },
          ],
        }
      : null,
    restaurantBase
      ? {
          type: "group",
          label: "Inventory",
          items: [
            { href: `${restaurantBase}/inventory`, label: "Stock", match: pathname === `${restaurantBase}/inventory` },
            { href: `${restaurantBase}/inventory/history`, label: "History", match: pathname.startsWith(`${restaurantBase}/inventory/history`) },
          ],
        }
      : null,
    restaurantBase
      ? {
          type: "group",
          label: "Waste",
          items: [
            { href: `${restaurantBase}/waste`, label: "Log", match: pathname === `${restaurantBase}/waste` },
            { href: `${restaurantBase}/waste/analytics`, label: "Analytics", match: pathname.startsWith(`${restaurantBase}/waste/analytics`) },
          ],
        }
      : null,
  ].filter(Boolean) as NavEntry[];

  const activeGroup =
    items.find((item) => item.type === "group" && item.items.some((link) => link.match))?.label ?? null;
  const [openGroup, setOpenGroup] = useState<string | null>(activeGroup);

  useEffect(() => {
    if (activeGroup) {
      setOpenGroup(activeGroup);
    }
  }, [activeGroup]);

  if (isTv) {
    return <div className="ls-canvas min-h-dvh flex-1">{children}</div>;
  }

  return (
    <div className="flex min-h-dvh flex-1 items-stretch">
      <aside className="hidden min-h-dvh w-[17.5rem] shrink-0 flex-col self-stretch border-r border-[#2a211c] bg-[#16110e] text-[#fff6ea] lg:flex">
        <div className="px-6 py-7">
          <Link href="/dashboard" className="block">
            <Logo variant="light" className="text-[#fff6ea]" />
          </Link>
          <p className="mt-3 text-[10px] font-semibold uppercase tracking-[0.28em] text-[#e8c9a0]/80">
            Restaurant operations
          </p>
        </div>
        <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto px-3 pb-4">
          {items.map((item) =>
            item.type === "link" ? (
              <SideLink key={item.href} href={item.href} label={item.label} match={item.match} />
            ) : (
              <SideGroup
                key={item.label}
                label={item.label}
                items={item.items}
                open={openGroup === item.label}
                onToggle={() =>
                  setOpenGroup((current) => (current === item.label ? null : item.label))
                }
              />
            ),
          )}
        </nav>
        <div className="border-t border-white/10 px-6 py-5">
          <p className="text-sm font-medium tracking-tight">{userName}</p>
          <p className="mt-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#e8c9a0]">{roleLabel}</p>
        </div>
      </aside>

      <div className="ls-canvas flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 border-b border-stone-200/70 bg-[#faf6ef]/80 backdrop-blur-xl">
          <div className="flex flex-wrap items-center justify-between gap-4 px-5 py-3.5 sm:px-8">
            <div className="flex flex-wrap items-center gap-2">
              <label className="text-[10px] font-semibold uppercase tracking-[0.2em] text-stone-400">
                Company
                <select
                  value={companyId ?? ""}
                  onChange={(event) => {
                    const next = event.target.value;
                    const selected = companies.find((item) => item.id === next);
                    router.push(next && selected ? companyHomePath(next, selected.role) : "/dashboard");
                  }}
                  className="mt-1.5 block min-w-44 rounded-lg border-0 bg-white/80 px-3 py-2 text-sm text-stone-900 shadow-[inset_0_0_0_1px_rgba(28,20,16,0.08)] outline-none focus:shadow-[inset_0_0_0_1px_rgba(28,20,16,0.28)]"
                >
                  <option value="">All houses</option>
                  {companies.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                </select>
              </label>
              <span className="mt-5 hidden h-7 w-px bg-stone-200 sm:block" />
              <label className="text-[10px] font-semibold uppercase tracking-[0.2em] text-stone-400">
                Restaurant
                <select
                  value={locationId ?? ""}
                  disabled={!company}
                  onChange={(event) => {
                    const next = event.target.value;
                    if (!company) return;
                    const suffix = locationId ? pathname.split(`/r/${locationId}`)[1] ?? "" : "";
                    router.push(next ? `/dashboard/c/${company.id}/r/${next}${suffix}` : companyHomePath(company.id, company.role));
                  }}
                  className="mt-1.5 block min-w-48 rounded-lg border-0 bg-white/80 px-3 py-2 text-sm text-stone-900 shadow-[inset_0_0_0_1px_rgba(28,20,16,0.08)] outline-none focus:shadow-[inset_0_0_0_1px_rgba(28,20,16,0.28)] disabled:opacity-50"
                >
                  <option value="">{company ? "All restaurants" : "Select a company"}</option>
                  {restaurants.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <div className="flex items-center gap-3">
              {company ? (
                <span className="hidden rounded-full bg-[#1c1410] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#fff6ea] sm:inline">
                  {displayRole((locationId
                    ? restaurants.find((item) => item.id === locationId)?.role
                    : company.role) as AppRole)}
                </span>
              ) : null}
              <SignOutButton />
            </div>
          </div>
        </header>
        <main className="flex-1 px-5 py-8 sm:px-8 sm:py-10">{children}</main>
      </div>
    </div>
  );
}

function SideLink({ href, label, match, nested = false }: NavLink & { nested?: boolean }) {
  return (
    <Link
      href={href}
      className={`rounded-lg px-3 py-2 text-[13px] tracking-wide ${nested ? "py-1.5 pl-7 text-[12px]" : ""} ${
        match ? "bg-[#fff6ea]/10 text-[#fff6ea]" : "text-[#fff6ea]/55 hover:bg-white/[0.04] hover:text-[#fff6ea]"
      }`}
    >
      {label}
    </Link>
  );
}

function SideGroup({
  label,
  items,
  open,
  onToggle,
}: {
  label: string;
  items: NavLink[];
  open: boolean;
  onToggle: () => void;
}) {
  const hasActive = items.some((item) => item.match);

  return (
    <div>
      <button
        type="button"
        onClick={onToggle}
        className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-[0.18em] ${
          hasActive ? "text-[#e8c9a0]" : "text-[#fff6ea]/40 hover:text-[#fff6ea]/70"
        }`}
        aria-expanded={open}
      >
        <span>{label}</span>
        <span className={`text-xs transition-transform ${open ? "rotate-90" : ""}`}>›</span>
      </button>
      {open ? (
        <div className="mb-1 flex flex-col gap-0.5">
          {items.map((item) => (
            <SideLink key={item.href} {...item} nested />
          ))}
        </div>
      ) : null}
    </div>
  );
}
