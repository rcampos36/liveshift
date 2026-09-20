import Link from "next/link";

export function InventoryNav({
  companyId,
  locationId,
  current,
}: {
  companyId: string;
  locationId: string;
  current: "stock" | "history";
}) {
  const tabs = [
    { href: "inventory", label: "Inventory", key: "stock" },
    { href: "inventory/history", label: "Adjustment history", key: "history" },
  ] as const;

  return (
    <nav className="flex flex-wrap gap-2">
      {tabs.map((tab) => {
        const href = `/dashboard/c/${companyId}/r/${locationId}/${tab.href}`;
        const isActive = tab.key === current;
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
