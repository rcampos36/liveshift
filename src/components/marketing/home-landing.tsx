import Image from "next/image";
import Link from "next/link";
import { Logo } from "@/components/brand/logo";
import type { PublicPricingPlan } from "@/lib/billing/types";

const modules = [
  {
    title: "86 board",
    copy: "Call 86s once and every station, FOH, and location sees the same board.",
    image: "/images/feature-86.jpg",
    alt: "Chefs plating at the kitchen pass",
  },
  {
    title: "Inventory",
    copy: "Count, transfer, and par by restaurant — never mixed across the group.",
    image: "/images/feature-inventory.jpg",
    alt: "Restaurant dry storage and produce shelves",
  },
  {
    title: "Waste & comps",
    copy: "Log spoilage and walk-outs against the shift they actually happened on.",
    image: "/images/feature-waste.jpg",
    alt: "Prep kitchen trim and compost caddies",
  },
  {
    title: "Sales pulse",
    copy: "See tonight against last Saturday without exporting a spreadsheet.",
    image: "/images/feature-sales.jpg",
    alt: "Dining room during service",
  },
  {
    title: "Manager logs",
    copy: "Hand off the floor in writing: covers, incidents, VIPs, and notes.",
    image: "/images/feature-logs.jpg",
    alt: "Manager reviewing shift notes at the pass",
  },
  {
    title: "Line tasks",
    copy: "Prep lists and close checklists stay on the restaurant that owns them.",
    image: "/images/feature-tasks.jpg",
    alt: "Cooks working the line with mise en place",
  },
];

const roles = [
  { title: "Company admin", copy: "Every restaurant in the group." },
  { title: "General manager", copy: "The houses they are trusted with." },
  { title: "Kitchen manager", copy: "The line, 86s, and inventory." },
  { title: "Floor team", copy: "Only what they need for service." },
];

function formatMoney(amount: number, currency: string) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency, maximumFractionDigits: 2 }).format(amount);
}

export function HomeLanding({
  signedIn,
  plans,
  trialDays,
}: {
  signedIn: boolean;
  plans: PublicPricingPlan[];
  trialDays: number;
}) {
  const primaryHref = signedIn ? "/dashboard" : "/register";
  const primaryLabel = signedIn ? "Open dashboard" : "Start your restaurant group";
  const secondaryHref = signedIn ? "/dashboard" : "/login";
  const secondaryLabel = signedIn ? "Continue to LiveShift" : "Sign in";

  return (
    <div className="min-h-full bg-[#f3eee4] text-stone-950">
      <header className="sticky top-0 z-50 border-b border-[#fff6ea]/10 bg-[#1c1410]/88 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link href="/" aria-label="LiveShift home">
            <Logo variant="light" className="text-[#fff6ea]" />
          </Link>
          <nav className="flex items-center gap-2 sm:gap-5">
            <a href="#operations" className="hidden text-sm text-[#fff6ea]/80 hover:text-[#fff6ea] sm:inline">
              Operations
            </a>
            <a href="#pricing" className="text-sm text-[#fff6ea]/80 hover:text-[#fff6ea]">
              Pricing
            </a>
            <a href="#access" className="hidden text-sm text-[#fff6ea]/80 hover:text-[#fff6ea] sm:inline">
              Access
            </a>
            {signedIn ? (
              <Link
                href="/dashboard"
                className="rounded-full bg-[#fff6ea] px-4 py-2 text-sm font-semibold text-[#1c1410] hover:bg-white"
              >
                Open dashboard
              </Link>
            ) : (
              <>
                <Link href="/demo" className="hidden px-3 py-2 text-sm font-medium text-[#fff6ea]/90 hover:text-[#fff6ea] sm:inline">
                  View demo
                </Link>
                <Link href="/login" className="px-3 py-2 text-sm font-medium text-[#fff6ea]/90 hover:text-[#fff6ea]">
                  Sign in
                </Link>
                <Link
                  href="/register"
                  className="rounded-full bg-[#fff6ea] px-4 py-2 text-sm font-semibold text-[#1c1410] hover:bg-white"
                >
                  Get started
                </Link>
              </>
            )}
          </nav>
        </div>
      </header>

      <section className="relative min-h-[100svh] overflow-hidden text-[#fff6ea]">
        <Image
          src="/images/landing-hero.jpg"
          alt="Dining terrace at dusk"
          fill
          priority
          className="object-cover object-center"
        />
        <div className="absolute inset-0 bg-[#1c1410]/40" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(20,14,10,0.62)_0%,rgba(20,14,10,0.28)_48%,rgba(20,14,10,0.18)_100%)]" />
        <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-b from-transparent to-[#f3eee4]" />

        <div className="relative z-10 mx-auto flex min-h-[100svh] max-w-5xl flex-col items-center justify-center px-6 pb-24 pt-16 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.32em] text-[#e8c9a0]">
            For restaurant groups
          </p>
          <h1 className="font-display mt-6 max-w-4xl text-[2.8rem] leading-[1.12] text-[#fff6ea] [text-shadow:0_2px_28px_rgba(16,10,6,0.55)] sm:text-6xl lg:text-7xl">
            Run the group.
            <br />
            Protect each house.
          </h1>
          <p className="mt-6 max-w-2xl text-base leading-8 text-[#f4eadc] [text-shadow:0_1px_16px_rgba(16,10,6,0.45)] sm:text-lg">
            LiveShift is the operations floor for multi-unit restaurants. Inventory, 86s,
            waste, logs, and tasks stay inside the restaurant that earned them.
          </p>
          <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
            <Link
              href={primaryHref}
              className="rounded-full bg-[#fff6ea] px-5 py-3 text-sm font-semibold text-[#1c1410] hover:bg-white"
            >
              {primaryLabel}
            </Link>
            <Link
              href={secondaryHref}
              className="rounded-full border border-[#fff6ea]/70 bg-[#1c1410]/25 px-5 py-3 text-sm font-semibold text-[#fff6ea] backdrop-blur-sm hover:bg-[#1c1410]/40"
            >
              {secondaryLabel}
            </Link>
            {!signedIn ? (
              <Link
                href="/demo"
                className="rounded-full border border-[#e8c9a0]/80 bg-[#1c1410]/20 px-5 py-3 text-sm font-semibold text-[#e8c9a0] backdrop-blur-sm hover:bg-[#1c1410]/35"
              >
                View client demo
              </Link>
            ) : null}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-10">
        <p className="text-center text-xs font-semibold uppercase tracking-[0.22em] text-stone-500">
          Built for hospitality groups, not generic offices
        </p>
        <div className="mt-5 flex flex-wrap items-center justify-center gap-x-10 gap-y-3 text-sm text-stone-600">
          <span>Independent groups</span>
          <span className="hidden text-stone-300 sm:inline">/</span>
          <span>Chef-owned houses</span>
          <span className="hidden text-stone-300 sm:inline">/</span>
          <span>Hotel food & beverage</span>
          <span className="hidden text-stone-300 sm:inline">/</span>
          <span>Airport and venue concepts</span>
        </div>
      </section>

      <section id="operations" className="mx-auto max-w-6xl scroll-mt-24 px-6 py-20">
        <div className="max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-orange-800">On the floor</p>
          <h2 className="font-display mt-3 text-4xl leading-tight text-stone-950">
            Everything a manager needs between pre-shift and last table.
          </h2>
          <p className="mt-4 text-lg leading-8 text-stone-600">
            Each module is scoped to a company and a restaurant. A downtown kitchen never
            sees the airport bar&apos;s count, 86 list, or manager notes.
          </p>
        </div>

        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {modules.map((item) => (
            <article
              key={item.title}
              className="relative min-h-[280px] overflow-hidden rounded-3xl"
            >
              <Image src={item.image} alt={item.alt} fill className="object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-[#1c1410]/90 via-[#1c1410]/45 to-[#1c1410]/15" />
              <div className="relative flex h-full min-h-[280px] flex-col justify-end p-6">
                <div className="mb-4 h-px w-10 bg-[#e8c9a0]" />
                <h3 className="font-display text-2xl text-[#fff6ea]">{item.title}</h3>
                <p className="mt-3 text-sm leading-6 text-[#f4eadc]/88">{item.copy}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section id="pricing" className="mx-auto max-w-6xl scroll-mt-24 px-6 py-20">
        <div className="max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-orange-800">Pricing</p>
          <h2 className="font-display mt-3 text-4xl leading-tight text-stone-950">
            Company billing, priced per restaurant.
          </h2>
          <p className="mt-4 text-lg leading-8 text-stone-600">
            The group is invoiced as one company. Each plan is charged per location, so adding a house
            increases the bill and removing one does not mix another restaurant&apos;s data. New companies
            start with a {trialDays}-day trial. A billing administrator owns the subscription — not the
            kitchen or floor team.
          </p>
        </div>

        {plans.length === 0 ? (
          <p className="mt-10 rounded-3xl border border-dashed border-stone-300 bg-white px-6 py-10 text-sm text-stone-500">
            Plans are loaded from the billing catalog. Configure per-location prices to publish them here.
          </p>
        ) : (
          <div className="mt-12 grid gap-4 md:grid-cols-2">
            {plans.map((plan) => (
              <article key={plan.code} className="rounded-3xl border border-stone-200 bg-white p-7">
                <h3 className="font-display text-3xl text-stone-950">{plan.name}</h3>
                <p className="mt-3 text-base leading-7 text-stone-600">{plan.description}</p>
                {plan.features.length > 0 ? (
                  <ul className="mt-5 space-y-2">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex gap-2 text-sm leading-6 text-stone-700">
                        <span aria-hidden className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-orange-800" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                ) : null}
                <ul className="mt-6 space-y-2">
                  {plan.prices.map((price) => (
                    <li key={`${plan.code}-${price.interval}`} className="flex items-baseline justify-between gap-4 text-stone-900">
                      <span className="text-sm uppercase tracking-[0.14em] text-stone-500">
                        {price.interval === "ANNUAL" ? "Annual" : "Monthly"}
                      </span>
                      <span className="text-lg">
                        {formatMoney(price.amountPerLocation, price.currency)}
                        <span className="text-sm text-stone-500"> / location</span>
                      </span>
                    </li>
                  ))}
                </ul>
                {!signedIn ? (
                  <Link
                    href={`/register?plan=${encodeURIComponent(plan.code)}`}
                    className="mt-6 inline-flex rounded-full bg-[#1c1410] px-4 py-2 text-sm font-semibold text-[#fff6ea] hover:bg-[#2a211c]"
                  >
                    Start with {plan.name}
                  </Link>
                ) : null}
              </article>
            ))}
          </div>
        )}
      </section>

      <section id="access" className="scroll-mt-24 bg-[#231910] text-orange-50">
        <div className="mx-auto grid max-w-6xl gap-12 px-6 py-20 lg:grid-cols-2 lg:items-center">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-orange-300">Access</p>
            <h2 className="font-display mt-3 text-4xl leading-tight">
              The company sees the group. The manager sees their house.
            </h2>
            <p className="mt-4 text-lg leading-8 text-orange-100/70">
              Company admins move across every restaurant. General managers and managers
              only enter the locations they are assigned. Super admins stay on the
              platform — never in tonight&apos;s service.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {roles.map((role) => (
              <article key={role.title} className="rounded-2xl border border-orange-100/10 bg-white/5 p-5">
                <h3 className="font-medium text-orange-50">{role.title}</h3>
                <p className="mt-2 text-sm leading-6 text-orange-100/65">{role.copy}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-20">
        <div className="relative overflow-hidden rounded-[2rem] px-8 py-16 text-center text-white sm:px-16">
          <Image
            src="/images/landing-hero.jpg"
            alt=""
            fill
            className="object-cover object-center"
          />
          <div className="absolute inset-0 bg-[#1c1410]/70" />
          <div className="relative">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-white/70">Next service</p>
            <h2 className="font-display mx-auto mt-4 max-w-2xl text-4xl leading-tight sm:text-5xl">
              Open the house with one source of truth.
            </h2>
            <p className="mx-auto mt-5 max-w-xl text-white/75">
              Create the company, add restaurants, and invite the people who actually run the floor.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Link
                href={primaryHref}
                className="rounded-full bg-white px-5 py-3 text-sm font-semibold text-stone-950 hover:bg-orange-50"
              >
                {primaryLabel}
              </Link>
              <Link
                href={secondaryHref}
                className="rounded-full border border-white/40 px-5 py-3 text-sm font-semibold text-white hover:bg-white/10"
              >
                {secondaryLabel}
              </Link>
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t border-stone-200/80 px-6 py-8">
        <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
          <Logo className="text-stone-900" />
          <div className="flex flex-wrap items-center gap-4">
            <a href="#pricing" className="text-sm text-stone-500 hover:text-stone-800">
              Pricing
            </a>
            <p className="text-sm text-stone-500">Restaurant operations for multi-location teams.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
