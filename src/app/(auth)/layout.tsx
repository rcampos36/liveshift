import Link from "next/link";
import { Logo } from "@/components/brand/logo";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="ls-canvas flex min-h-full flex-col">
      <header className="px-6 py-5">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <Link href="/">
            <Logo className="text-stone-900" />
          </Link>
          <nav className="flex items-center gap-4">
            <Link href="/#pricing" className="text-sm text-stone-600 hover:text-stone-950">
              Pricing
            </Link>
          </nav>
        </div>
      </header>
      <main className="flex flex-1 items-start justify-center px-4 pb-16 pt-6">{children}</main>
    </div>
  );
}
