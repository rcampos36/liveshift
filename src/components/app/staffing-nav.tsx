import Link from "next/link";

export function StaffingNav({
  companyId,
  locationId,
  current,
}: {
  companyId: string;
  locationId: string;
  current: "board" | "labor";
}) {
  const tabs = [
    { href: "staffing", label: "Board", key: "board" },
    { href: "staffing/labor", label: "Labor", key: "labor" },
  ] as const;

  return (
    <nav className="flex flex-wrap gap-2">
      {tabs.map((tab) => (
        <Link
          key={tab.href}
          href={`/dashboard/c/${companyId}/r/${locationId}/${tab.href}`}
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
