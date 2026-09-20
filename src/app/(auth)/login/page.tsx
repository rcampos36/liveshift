import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthCard } from "@/components/auth/auth-card";
import { AuthForm } from "@/components/auth/auth-form";
import { getCurrentUser } from "@/lib/auth/session";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; demo?: string }>;
}) {
  if (await getCurrentUser().catch(() => null)) {
    redirect("/dashboard");
  }

  const { next, demo } = await searchParams;
  const redirectTo = next?.startsWith("/") ? next : "/dashboard";

  return (
    <AuthCard>
      <div className="space-y-6">
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold text-stone-950">Sign in</h1>
          <p className="text-sm text-stone-600">Access your restaurant companies and locations.</p>
        </div>
        {demo === "unavailable" ? (
          <p className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
            The client demo is not loaded on this environment yet. Seed Citlatli, then open /demo again.
          </p>
        ) : null}
        <AuthForm
          action="/api/auth/login"
          submitLabel="Sign in"
          successRedirect={redirectTo}
          fields={[
            { name: "email", label: "Email", type: "email", autoComplete: "email" },
            { name: "password", label: "Password", type: "password", autoComplete: "current-password" },
          ]}
          footer={{ href: "/register", label: "Create a company account" }}
        />
        <p className="text-center text-sm text-stone-600">
          <Link href="/demo" className="font-medium text-orange-800 hover:underline">
            Open the client demo
          </Link>
        </p>
        <p className="text-center text-sm text-stone-600">
          <Link href="/forgot-password" className="font-medium text-orange-800 hover:underline">
            Forgot password?
          </Link>
        </p>
      </div>
    </AuthCard>
  );
}
