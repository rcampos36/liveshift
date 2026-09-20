import { randomBytes } from "crypto";
import { prisma } from "@/lib/db/prisma";
import { hashPassword } from "@/lib/auth/password";
import { recordAuditLog } from "@/lib/audit/log";
import {
  requireUser,
  requirePermission,
  requireLocationAccess,
  AuthorizationError,
  getLocationRole,
  getCompanyRole,
} from "@/lib/authorization/guards";
import { hasAtLeastRole, type AppRole } from "@/lib/authorization/roles";
import { roleHasPermission } from "@/lib/authorization/permissions";
import { inviteUserSchema } from "@/lib/tenancy/schemas";
import { sendInviteEmail } from "@/lib/email/invite-email";
import { handleRouteError, jsonError } from "@/lib/http/errors";
import { readJson } from "@/lib/http/request";

export async function POST(
  request: Request,
  context: { params: Promise<{ companyId: string }> },
) {
  try {
    const { companyId } = await context.params;
    const actor = await requireUser();
    const input = inviteUserSchema.parse(await readJson(request));

    if (input.role === "COMPANY_ADMIN") {
      requirePermission(actor, "company.manage", { companyId });
    } else if (input.role === "BILLING_ADMIN") {
      const companyRole = getCompanyRole(actor, companyId);
      if (!companyRole || (!roleHasPermission(companyRole, "billing.manage") && !roleHasPermission(companyRole, "company.manage"))) {
        throw new AuthorizationError("Missing required permission");
      }
    } else {
      if (!input.locationId) {
        return jsonError("Select a restaurant for this role", 400);
      }
      requireLocationAccess(actor, input.locationId);
      requirePermission(actor, "users.invite", { companyId, locationId: input.locationId });

      const restaurant = await prisma.location.findFirst({
        where: { id: input.locationId, companyId },
        select: { id: true },
      });
      if (!restaurant) {
        throw new AuthorizationError("Restaurant not found in this company", 404);
      }

      const actorRole = getLocationRole(actor, input.locationId, companyId);
      if (!actorRole || !hasAtLeastRole(actorRole, input.role as AppRole)) {
        throw new AuthorizationError("You cannot assign a role above your own");
      }
    }

    const company = await prisma.company.findUniqueOrThrow({
      where: { id: companyId },
      select: { name: true },
    });

    const existing = await prisma.user.findUnique({
      where: { email: input.email },
    });

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

    if (input.role === "COMPANY_ADMIN") {
      await prisma.companyMembership.upsert({
        where: { userId_companyId: { userId: user.id, companyId } },
        update: { role: "COMPANY_ADMIN", status: "ACTIVE" },
        create: { userId: user.id, companyId, role: "COMPANY_ADMIN" },
      });
    } else if (input.role === "BILLING_ADMIN") {
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
    } else if (input.locationId) {
      await prisma.locationMembership.upsert({
        where: { userId_locationId: { userId: user.id, locationId: input.locationId } },
        update: { role: input.role, status: "ACTIVE" },
        create: {
          userId: user.id,
          locationId: input.locationId,
          role: input.role,
        },
      });
    }

    if (temporaryPassword) {
      await sendInviteEmail({
        to: user.email,
        companyName: company.name,
        temporaryPassword,
      });
    }

    if (input.locationId) {
      await recordAuditLog({
        scope: { companyId, locationId: input.locationId },
        userId: actor.id,
        entity: "LocationMembership",
        entityId: user.id,
        action: "INVITE",
        newValue: { email: user.email, role: input.role },
      });
    }

    return Response.json({
      ok: true,
      existingUser: Boolean(existing),
      temporaryPassword,
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
