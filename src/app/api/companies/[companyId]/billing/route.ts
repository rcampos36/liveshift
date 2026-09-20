import { prisma } from "@/lib/db/prisma";
import { getCompanyRole, requirePermission, requireUser } from "@/lib/authorization/guards";
import { roleHasPermission } from "@/lib/authorization/permissions";
import { handleRouteError } from "@/lib/http/errors";
import { readJson } from "@/lib/http/request";
import { billingActionSchema } from "@/lib/billing/schemas";
import { applyBillingAction, getBillingSnapshot } from "@/lib/billing/service";

type RouteContext = { params: Promise<{ companyId: string }> };

function noStore(data: unknown) {
  return Response.json(data, { headers: { "Cache-Control": "no-store" } });
}

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { companyId } = await context.params;
    const user = await requireUser();
    requirePermission(user, "billing.read", { companyId });
    const company = await prisma.company.findFirst({
      where: { id: companyId },
      select: { name: true },
    });
    if (!company) {
      return Response.json({ error: "Company not found" }, { status: 404 });
    }
    const role = getCompanyRole(user, companyId);
    return noStore(
      await getBillingSnapshot(companyId, company.name, role ? roleHasPermission(role, "billing.manage") : false),
    );
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const { companyId } = await context.params;
    const user = await requireUser();
    requirePermission(user, "billing.manage", { companyId });
    const action = billingActionSchema.parse(await readJson(request));
    await applyBillingAction(companyId, user.id, action);
    const company = await prisma.company.findFirstOrThrow({
      where: { id: companyId },
      select: { name: true },
    });
    return noStore(await getBillingSnapshot(companyId, company.name, true));
  } catch (error) {
    return handleRouteError(error);
  }
}
