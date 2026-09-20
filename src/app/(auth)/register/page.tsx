import { redirect } from "next/navigation";
import { AuthCard } from "@/components/auth/auth-card";
import { RegisterForm } from "@/components/auth/register-form";
import { getCurrentUser } from "@/lib/auth/session";
import { getPublicPricingPlans } from "@/lib/billing/public";
import { BILLING_INTERVALS, type BillingInterval } from "@/lib/billing/types";
import { getBillingTrialDays } from "@/lib/env";

function parseInterval(value?: string): BillingInterval | undefined {
  const normalized = value?.trim().toUpperCase();
  return BILLING_INTERVALS.find((interval) => interval === normalized);
}

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ plan?: string; interval?: string }>;
}) {
  if (await getCurrentUser().catch(() => null)) {
    redirect("/dashboard");
  }

  const { plan, interval } = await searchParams;
  const plans = await getPublicPricingPlans();

  return (
    <AuthCard wide>
      <div className="space-y-6">
        <div className="space-y-2">
          <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#8a6a4a]">Get started</p>
          <h1 className="font-display text-[2.2rem] leading-tight tracking-tight text-stone-950">
            Create your company
          </h1>
          <p className="max-w-2xl text-sm leading-relaxed text-stone-600">
            Choose a plan, then set up the company admin account. You can add restaurants during the trial
            up to the location quantity you pick.
          </p>
        </div>
        <RegisterForm
          plans={plans}
          trialDays={getBillingTrialDays()}
          initialPlanCode={plan?.trim()}
          initialInterval={parseInterval(interval)}
        />
      </div>
    </AuthCard>
  );
}
