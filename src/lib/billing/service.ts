import "server-only";

import { randomBytes } from "crypto";
import type { BillingInterval, Prisma, SubscriptionChangeType, SubscriptionStatus } from "@/generated/prisma/client";
import { prisma } from "@/lib/db/prisma";
import { hashPassword } from "@/lib/auth/password";
import { AuthorizationError } from "@/lib/authorization/guards";
import { getBillingTrialDays } from "@/lib/env";
import { sendInvoiceEmail } from "@/lib/email/invoice-email";
import { money } from "@/lib/operations/scope";
import type { BillingAction } from "@/lib/billing/schemas";
import {
  SUBSCRIPTION_STATUS_LABELS,
  type BillingPriceOption,
  type BillingSnapshot,
  type BillingSubscriptionView,
} from "@/lib/billing/types";

function addInterval(start: Date, interval: BillingInterval) {
  const next = new Date(start);
  if (interval === "ANNUAL") {
    next.setUTCFullYear(next.getUTCFullYear() + 1);
  } else {
    next.setUTCMonth(next.getUTCMonth() + 1);
  }
  return next;
}

function periodFor(interval: BillingInterval, from = new Date()) {
  const currentPeriodStart = from;
  return { currentPeriodStart, currentPeriodEnd: addInterval(from, interval) };
}

function toPriceOption(row: {
  id: string;
  interval: BillingInterval;
  currency: string;
  amountPerLocation: { toString(): string } | number;
  plan: { id: string; code: string; name: string; description: string | null; features: string[] };
}): BillingPriceOption {
  return {
    id: row.id,
    planId: row.plan.id,
    planCode: row.plan.code,
    planName: row.plan.name,
    planDescription: row.plan.description,
    planFeatures: row.plan.features ?? [],
    interval: row.interval,
    currency: row.currency,
    amountPerLocation: money(row.amountPerLocation),
  };
}

function toSubscriptionView(
  row: {
    id: string;
    status: SubscriptionStatus;
    locationQuantity: number;
    trialEndsAt: Date | null;
    currentPeriodStart: Date;
    currentPeriodEnd: Date;
    cancelAtPeriodEnd: boolean;
    cancelledAt: Date | null;
    pastDueAt: Date | null;
    priceId: string;
    plan: { code: string; name: string };
    price: { interval: BillingInterval; currency: string; amountPerLocation: { toString(): string } | number };
  },
  locationCount: number,
): BillingSubscriptionView {
  const amountPerLocation = money(row.price.amountPerLocation);
  return {
    id: row.id,
    status: row.status,
    statusLabel: SUBSCRIPTION_STATUS_LABELS[row.status],
    planCode: row.plan.code,
    planName: row.plan.name,
    priceId: row.priceId,
    interval: row.price.interval,
    currency: row.price.currency,
    amountPerLocation,
    locationQuantity: row.locationQuantity,
    locationCount,
    recurringTotal: amountPerLocation * row.locationQuantity,
    trialEndsAt: row.trialEndsAt?.toISOString() ?? null,
    currentPeriodStart: row.currentPeriodStart.toISOString(),
    currentPeriodEnd: row.currentPeriodEnd.toISOString(),
    cancelAtPeriodEnd: row.cancelAtPeriodEnd,
    cancelledAt: row.cancelledAt?.toISOString() ?? null,
    pastDueAt: row.pastDueAt?.toISOString() ?? null,
  };
}

async function locationCount(companyId: string) {
  return prisma.location.count({ where: { companyId } });
}

async function requirePrice(priceId: string) {
  const price = await prisma.billingPrice.findFirst({
    where: { id: priceId, active: true, plan: { active: true } },
    include: { plan: true },
  });
  if (!price) {
    throw new AuthorizationError("That billing price is not available", 404);
  }
  return price;
}

function snapshotOf(row: {
  status: SubscriptionStatus;
  planId: string;
  priceId: string;
  locationQuantity: number;
  plan?: { code: string; name: string };
  price?: { interval: BillingInterval; amountPerLocation: { toString(): string } | number };
}) {
  return {
    status: row.status,
    planId: row.planId,
    priceId: row.priceId,
    locationQuantity: row.locationQuantity,
    planCode: row.plan?.code,
    interval: row.price?.interval,
    amountPerLocation: row.price ? money(row.price.amountPerLocation) : undefined,
  };
}

function changeType(previousTotal: number, nextTotal: number, previousPlanOrder: number, nextPlanOrder: number): SubscriptionChangeType {
  if (nextPlanOrder > previousPlanOrder || nextTotal > previousTotal) {
    return "UPGRADED";
  }
  if (nextPlanOrder < previousPlanOrder || nextTotal < previousTotal) {
    return "DOWNGRADED";
  }
  return "QUANTITY_CHANGED";
}

async function recordChange(
  companyId: string,
  subscriptionId: string,
  type: SubscriptionChangeType,
  oldValue: unknown,
  newValue: unknown,
  createdById?: string | null,
) {
  await prisma.subscriptionChange.create({
    data: {
      companyId,
      subscriptionId,
      type,
      oldValue: (oldValue ?? undefined) as Prisma.InputJsonValue | undefined,
      newValue: (newValue ?? undefined) as Prisma.InputJsonValue | undefined,
      createdById: createdById ?? null,
    },
  });
}

export async function evaluateCompanySubscription(companyId: string) {
  const subscription = await prisma.companySubscription.findUnique({
    where: { companyId },
  });
  if (!subscription) {
    return null;
  }

  const now = new Date();
  if (subscription.status === "TRIAL" && subscription.trialEndsAt && subscription.trialEndsAt.getTime() <= now.getTime()) {
    const updated = await prisma.companySubscription.update({
      where: { id: subscription.id },
      data: { status: "PAST_DUE", pastDueAt: subscription.pastDueAt ?? now },
    });
    await recordChange(companyId, subscription.id, "STATUS_CHANGED", { status: "TRIAL" }, { status: "PAST_DUE" });
    return updated;
  }

  if (
    subscription.status === "ACTIVE" &&
    subscription.cancelAtPeriodEnd &&
    subscription.currentPeriodEnd.getTime() <= now.getTime()
  ) {
    const updated = await prisma.companySubscription.update({
      where: { id: subscription.id },
      data: { status: "CANCELLED", cancelledAt: subscription.cancelledAt ?? now },
    });
    await recordChange(companyId, subscription.id, "CANCELLED", { status: "ACTIVE" }, { status: "CANCELLED" });
    return updated;
  }

  return subscription;
}

export async function assertCompanyCanAddLocation(companyId: string) {
  await evaluateCompanySubscription(companyId);
  const [subscription, houses] = await Promise.all([
    prisma.companySubscription.findUnique({ where: { companyId } }),
    locationCount(companyId),
  ]);

  if (!subscription || subscription.status === "CANCELLED") {
    throw new AuthorizationError("This company needs an active subscription to add a restaurant", 402);
  }

  if (subscription.status === "PAST_DUE") {
    throw new AuthorizationError("Resolve past due billing before adding a restaurant", 402);
  }

  if (houses + 1 > subscription.locationQuantity) {
    throw new AuthorizationError("Increase billed restaurant quantity before adding another location", 402);
  }
}

export async function startCompanyTrial(
  companyId: string,
  createdById?: string | null,
  selection?: { planCode: string; interval?: BillingInterval; locationQuantity?: number },
) {
  const existing = await prisma.companySubscription.findUnique({ where: { companyId } });
  if (existing) {
    return existing;
  }

  const price = selection?.planCode
    ? await prisma.billingPrice.findFirst({
        where: {
          active: true,
          ...(selection.interval ? { interval: selection.interval } : {}),
          plan: { active: true, code: selection.planCode },
        },
        include: { plan: true },
        orderBy: { interval: "asc" },
      })
    : await prisma.billingPrice.findFirst({
        where: { active: true, plan: { active: true } },
        include: { plan: true },
        orderBy: [{ plan: { sortOrder: "asc" } }, { interval: "asc" }],
      });
  if (!price) {
    if (selection?.planCode) {
      throw new AuthorizationError("That plan is not available", 400);
    }
    return null;
  }

  const houses = await locationCount(companyId);
  const now = new Date();
  const trialDays = getBillingTrialDays();
  const trialEndsAt = new Date(now.getTime() + trialDays * 86_400_000);
  const period = periodFor(price.interval, now);
  const subscription = await prisma.companySubscription.create({
    data: {
      companyId,
      planId: price.planId,
      priceId: price.id,
      status: "TRIAL",
      locationQuantity: Math.max(houses, selection?.locationQuantity ?? 1),
      trialEndsAt,
      currentPeriodStart: period.currentPeriodStart,
      currentPeriodEnd: trialEndsAt,
    },
  });
  await recordChange(
    companyId,
    subscription.id,
    "CREATED",
    null,
    snapshotOf({ ...subscription, plan: price.plan, price }),
    createdById,
  );
  return subscription;
}

export async function getBillingSnapshot(companyId: string, companyName: string, canManage: boolean): Promise<BillingSnapshot> {
  await evaluateCompanySubscription(companyId);
  const [subscription, prices, changes, invoices, billingAdmins, houses] = await Promise.all([
    prisma.companySubscription.findUnique({
      where: { companyId },
      include: { plan: true, price: true },
    }),
    prisma.billingPrice.findMany({
      where: { active: true, plan: { active: true } },
      include: { plan: true },
      orderBy: [{ plan: { sortOrder: "asc" } }, { interval: "asc" }],
    }),
    prisma.subscriptionChange.findMany({
      where: { companyId },
      orderBy: { createdAt: "desc" },
      take: 40,
      include: { createdBy: { select: { firstName: true, lastName: true } } },
    }),
    prisma.billingInvoice.findMany({
      where: { companyId },
      orderBy: { createdAt: "desc" },
      take: 40,
      include: { createdBy: { select: { firstName: true, lastName: true } } },
    }),
    prisma.companyMembership.findMany({
      where: { companyId, role: "BILLING_ADMIN", status: "ACTIVE" },
      include: { user: { select: { id: true, firstName: true, lastName: true, email: true } } },
      orderBy: { createdAt: "asc" },
    }),
    locationCount(companyId),
  ]);

  return {
    updatedAt: new Date().toISOString(),
    companyId,
    companyName,
    canManage,
    subscription: subscription ? toSubscriptionView(subscription, houses) : null,
    prices: prices.map(toPriceOption),
    changes: changes.map((change) => ({
      id: change.id,
      type: change.type,
      oldValue: change.oldValue,
      newValue: change.newValue,
      createdAt: change.createdAt.toISOString(),
      createdBy: change.createdBy ? `${change.createdBy.firstName} ${change.createdBy.lastName}`.trim() : null,
    })),
    invoices: invoices.map((invoice) => ({
      id: invoice.id,
      number: invoice.number,
      total: money(invoice.total),
      currency: invoice.currency,
      locationQuantity: invoice.locationQuantity,
      planName: invoice.planName,
      interval: invoice.interval,
      periodStart: invoice.periodStart.toISOString(),
      periodEnd: invoice.periodEnd.toISOString(),
      sentTo: invoice.sentTo,
      createdAt: invoice.createdAt.toISOString(),
      createdBy: invoice.createdBy ? `${invoice.createdBy.firstName} ${invoice.createdBy.lastName}`.trim() : null,
    })),
    billingAdmins: billingAdmins.map((membership) => ({
      id: membership.user.id,
      name: `${membership.user.firstName} ${membership.user.lastName}`.trim(),
      email: membership.user.email,
    })),
  };
}

export async function applyBillingAction(companyId: string, userId: string, action: BillingAction) {
  await evaluateCompanySubscription(companyId);
  const subscription = await prisma.companySubscription.findUnique({
    where: { companyId },
    include: { plan: true, price: true },
  });
  const houses = await locationCount(companyId);

  if (action.type === "subscribe") {
    const price = await requirePrice(action.priceId);
    const quantity = Math.max(action.locationQuantity ?? subscription?.locationQuantity ?? houses, houses, 1);
    const period = periodFor(price.interval);
    const data = {
      planId: price.planId,
      priceId: price.id,
      status: "ACTIVE" as const,
      locationQuantity: quantity,
      trialEndsAt: subscription?.trialEndsAt ?? null,
      currentPeriodStart: period.currentPeriodStart,
      currentPeriodEnd: period.currentPeriodEnd,
      cancelAtPeriodEnd: false,
      cancelledAt: null,
      pastDueAt: null,
    };

    const saved = subscription
      ? await prisma.companySubscription.update({ where: { id: subscription.id }, data })
      : await prisma.companySubscription.create({ data: { companyId, ...data } });

    await recordChange(
      companyId,
      saved.id,
      subscription ? "ACTIVATED" : "CREATED",
      subscription ? snapshotOf(subscription) : null,
      snapshotOf({ ...saved, plan: price.plan, price }),
      userId,
    );
    return saved;
  }

  if (!subscription) {
    throw new AuthorizationError("This company does not have a subscription yet", 404);
  }

  if (action.type === "changePlan") {
    if (subscription.status === "CANCELLED") {
      throw new AuthorizationError("Reactivate the subscription before changing plans", 409);
    }
    const price = await requirePrice(action.priceId);
    const previousTotal = money(subscription.price.amountPerLocation) * subscription.locationQuantity;
    const nextTotal = money(price.amountPerLocation) * subscription.locationQuantity;
    const type = changeType(previousTotal, nextTotal, subscription.plan.sortOrder, price.plan.sortOrder);
    const saved = await prisma.companySubscription.update({
      where: { id: subscription.id },
      data: {
        planId: price.planId,
        priceId: price.id,
        currentPeriodStart: subscription.currentPeriodStart,
        currentPeriodEnd: addInterval(new Date(), price.interval),
      },
    });
    await recordChange(companyId, saved.id, type, snapshotOf(subscription), snapshotOf({ ...saved, plan: price.plan, price }), userId);
    return saved;
  }

  if (action.type === "changeQuantity") {
    if (action.locationQuantity < houses) {
      throw new AuthorizationError("Billed quantity cannot be below the number of restaurants", 400);
    }
    const previousTotal = money(subscription.price.amountPerLocation) * subscription.locationQuantity;
    const nextTotal = money(subscription.price.amountPerLocation) * action.locationQuantity;
    const saved = await prisma.companySubscription.update({
      where: { id: subscription.id },
      data: { locationQuantity: action.locationQuantity },
    });
    await recordChange(
      companyId,
      saved.id,
      changeType(previousTotal, nextTotal, subscription.plan.sortOrder, subscription.plan.sortOrder),
      snapshotOf(subscription),
      { ...snapshotOf(saved), locationQuantity: action.locationQuantity },
      userId,
    );
    return saved;
  }

  if (action.type === "cancel") {
    const immediately = action.immediately ?? false;
    const saved = await prisma.companySubscription.update({
      where: { id: subscription.id },
      data: immediately
        ? { status: "CANCELLED", cancelAtPeriodEnd: false, cancelledAt: new Date() }
        : { cancelAtPeriodEnd: true },
    });
    await recordChange(
      companyId,
      saved.id,
      "CANCELLED",
      snapshotOf(subscription),
      { status: saved.status, cancelAtPeriodEnd: saved.cancelAtPeriodEnd },
      userId,
    );
    return saved;
  }

  if (subscription.status !== "CANCELLED" && subscription.status !== "PAST_DUE" && !subscription.cancelAtPeriodEnd) {
    throw new AuthorizationError("This subscription is already active", 409);
  }

  const period = periodFor(subscription.price.interval);
  const saved = await prisma.companySubscription.update({
    where: { id: subscription.id },
    data: {
      status: "ACTIVE",
      cancelAtPeriodEnd: false,
      cancelledAt: null,
      pastDueAt: null,
      currentPeriodStart: period.currentPeriodStart,
      currentPeriodEnd: period.currentPeriodEnd,
      locationQuantity: Math.max(subscription.locationQuantity, houses, 1),
    },
  });
  await recordChange(companyId, saved.id, "REACTIVATED", snapshotOf(subscription), snapshotOf({ ...saved, plan: subscription.plan, price: subscription.price }), userId);
  return saved;
}

export async function evaluateDueSubscriptions() {
  const now = new Date();
  const due = await prisma.companySubscription.findMany({
    where: {
      OR: [
        { status: "TRIAL", trialEndsAt: { lte: now } },
        { status: "ACTIVE", cancelAtPeriodEnd: true, currentPeriodEnd: { lte: now } },
      ],
    },
    select: { companyId: true },
  });

  for (const row of due) {
    await evaluateCompanySubscription(row.companyId);
  }

  return { evaluated: due.length };
}

export async function sendCompanyInvoice(
  companyId: string,
  actor: { id: string; email: string },
  extraEmail?: string,
) {
  await evaluateCompanySubscription(companyId);
  const [company, subscription, billingAdmins, existingCount] = await Promise.all([
    prisma.company.findFirstOrThrow({
      where: { id: companyId },
      select: { name: true },
    }),
    prisma.companySubscription.findUnique({
      where: { companyId },
      include: { plan: true, price: true },
    }),
    prisma.companyMembership.findMany({
      where: { companyId, role: "BILLING_ADMIN", status: "ACTIVE" },
      include: { user: { select: { email: true } } },
    }),
    prisma.billingInvoice.count({ where: { companyId } }),
  ]);

  if (!subscription) {
    throw new AuthorizationError("This company does not have a subscription yet", 404);
  }
  if (subscription.status === "CANCELLED") {
    throw new AuthorizationError("Reactivate the subscription before sending an invoice", 409);
  }

  const recipients = [
    ...new Set(
      [...billingAdmins.map((membership) => membership.user.email), extraEmail].filter(
        (value): value is string => Boolean(value),
      ),
    ),
  ];
  if (recipients.length === 0) {
    recipients.push(actor.email);
  }

  const amountPerLocation = money(subscription.price.amountPerLocation);
  const total = amountPerLocation * subscription.locationQuantity;
  const stamp = new Date().toISOString().slice(0, 10).replaceAll("-", "");
  const number = `LS-${stamp}-${String(existingCount + 1).padStart(4, "0")}`;

  for (const to of recipients) {
    await sendInvoiceEmail({
      to,
      companyName: company.name,
      invoiceNumber: number,
      planName: subscription.plan.name,
      interval: subscription.price.interval,
      currency: subscription.price.currency,
      amountPerLocation,
      locationQuantity: subscription.locationQuantity,
      total,
      periodStart: subscription.currentPeriodStart,
      periodEnd: subscription.currentPeriodEnd,
    });
  }

  const invoice = await prisma.billingInvoice.create({
    data: {
      companyId,
      subscriptionId: subscription.id,
      number,
      currency: subscription.price.currency,
      amountPerLocation,
      locationQuantity: subscription.locationQuantity,
      total,
      planName: subscription.plan.name,
      interval: subscription.price.interval,
      periodStart: subscription.currentPeriodStart,
      periodEnd: subscription.currentPeriodEnd,
      sentTo: recipients,
      createdById: actor.id,
    },
  });

  return invoice;
}

export async function inviteBillingAdmin(
  companyId: string,
  input: { firstName: string; lastName: string; email: string },
) {
  const existing = await prisma.user.findUnique({ where: { email: input.email } });
  let temporaryPassword: string | undefined;
  const user =
    existing ??
    (await prisma.user.create({
      data: {
        email: input.email,
        firstName: input.firstName,
        lastName: input.lastName,
        passwordHash: await hashPassword((temporaryPassword = randomBytes(6).toString("hex"))),
      },
    }));

  const membership = await prisma.companyMembership.findUnique({
    where: { userId_companyId: { userId: user.id, companyId } },
  });
  if (membership?.role === "COMPANY_ADMIN") {
    throw new AuthorizationError("This person is already a company administrator", 409);
  }

  await prisma.$transaction([
    prisma.locationMembership.deleteMany({
      where: { userId: user.id, location: { companyId } },
    }),
    prisma.companyMembership.upsert({
      where: { userId_companyId: { userId: user.id, companyId } },
      update: { role: "BILLING_ADMIN", status: "ACTIVE" },
      create: { userId: user.id, companyId, role: "BILLING_ADMIN" },
    }),
  ]);

  return { user, temporaryPassword, existingUser: Boolean(existing) };
}
