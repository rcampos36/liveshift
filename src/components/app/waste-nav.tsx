import Link from "next/link";

export function WasteNav({
  companyId,
  locationId,
  current,
}: {
  companyId: string;
  locationId?: string;
  current: "log" | "analytics" | "company";
}) {
  const tabs = locationId
    ? [
        { href: `/dashboard/c/${companyId}/r/${locationId}/waste`, label: "Waste log", key: "log" },
        { href: `/dashboard/c/${companyId}/r/${locationId}/waste/analytics`, label: "Waste analytics", key: "analytics" },
        { href: `/dashboard/c/${companyId}/waste`, label: "By restaurant", key: "company" },
      ]
    : [{ href: `/dashboard/c/${companyId}/waste`, label: "By restaurant", key: "company" }];

  return (
    <nav className="flex flex-wrap gap-2">
      {tabs.map((tab) => (
        <Link
          key={tab.href}
          href={tab.href}
          className={`rounded-full px-4 py-2 text-sm font-medium ${
            tab.key === current ? "bg-[#1c1410] text-[#fff6ea]" : "border border-stone-300 text-stone-800 hover:bg-white"
          }`}
        >
          {tab.label}
        </Link>
      ))}
    </nav>
  );
}
