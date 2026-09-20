import { HomeLanding } from "@/components/marketing/home-landing";
import { getCurrentUser } from "@/lib/auth/session";
import { getPublicPricingPlans } from "@/lib/billing/public";
import { getBillingTrialDays } from "@/lib/env";

export default async function HomePage() {
  const [user, plans] = await Promise.all([getCurrentUser(), getPublicPricingPlans()]);

  return <HomeLanding signedIn={Boolean(user)} plans={plans} trialDays={getBillingTrialDays()} />;
}
