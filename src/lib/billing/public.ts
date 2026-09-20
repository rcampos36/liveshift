import "server-only";

import { prisma } from "@/lib/db/prisma";
import { money } from "@/lib/operations/scope";
import type { PublicPricingPlan } from "@/lib/billing/types";

export async function getPublicPricingPlans(): Promise<PublicPricingPlan[]> {
  try {
    const plans = await prisma.billingPlan.findMany({
      where: { active: true },
      orderBy: { sortOrder: "asc" },
      include: {
        prices: {
          where: { active: true },
          orderBy: { interval: "asc" },
        },
      },
    });

    return plans
      .filter((plan) => plan.prices.length > 0)
      .map((plan) => ({
        code: plan.code,
        name: plan.name,
        description: plan.description?.trim() || `Company billing for ${plan.name}, priced per restaurant location.`,
        features: plan.features ?? [],
        prices: plan.prices.map((price) => ({
          interval: price.interval,
          currency: price.currency,
          amountPerLocation: money(price.amountPerLocation),
        })),
      }));
  } catch (error) {
    console.error("Unable to load public pricing plans", error);
    return [];
  }
}
