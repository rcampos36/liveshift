import { prisma } from "@/lib/db/prisma";
import { requirePermission, requireUser } from "@/lib/authorization/guards";
import { handleRouteError } from "@/lib/http/errors";
import { readJson } from "@/lib/http/request";
import { inviteBillingAdminSchema } from "@/lib/billing/schemas";
import { getBillingSnapshot, inviteBillingAdmin } from "@/lib/billing/service";
import { sendInviteEmail } from "@/lib/email/invite-email";

type RouteContext = { params: Promise<{ companyId: string }> };

export async function POST(request: Request, context: RouteContext) {
  try {
    const { companyId } = await context.params;
    const actor = await requireUser();
    requirePermission(actor, "billing.manage", { companyId });
    const input = inviteBillingAdminSchema.parse(await readJson(request));
    const result = await inviteBillingAdmin(companyId, input);
    const company = await prisma.company.findFirstOrThrow({
      where: { id: companyId },
      select: { name: true },
    });
    if (result.temporaryPassword) {
      await sendInviteEmail({
        to: result.user.email,
        companyName: company.name,
        temporaryPassword: result.temporaryPassword,
      });
    }
    return Response.json({
      ...(await getBillingSnapshot(companyId, company.name, true)),
      temporaryPassword: result.temporaryPassword,
      existingUser: result.existingUser,
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
