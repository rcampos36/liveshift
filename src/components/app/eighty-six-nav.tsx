import Link from "next/link";

const tabs = [
  { href: "86", label: "86 manage" },
  { href: "86/board", label: "Live 86 board" },
  { href: "86/history", label: "86 history" },
] as const;

export function EightySixNav({
  companyId,
  locationId,
  current,
}: {
  companyId: string;
  locationId: string;
  current: "manage" | "board" | "history";
}) {
  const active = current === "manage" ? "86" : current === "board" ? "86/board" : "86/history";

  return (
    <nav className="flex flex-wrap gap-2">
      {tabs.map((tab) => {
        const href = `/dashboard/c/${companyId}/r/${locationId}/${tab.href}`;
        const isActive = tab.href === active;
        return (
          <Link
            key={tab.href}
            href={href}
            className={`rounded-full px-4 py-2 text-sm font-medium ${
              isActive ? "bg-[#1c1410] text-[#fff6ea]" : "border border-stone-300 text-stone-800 hover:bg-white"
            }`}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
