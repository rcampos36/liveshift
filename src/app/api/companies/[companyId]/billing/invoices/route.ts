import { prisma } from "@/lib/db/prisma";
import { requirePermission, requireUser } from "@/lib/authorization/guards";
import { handleRouteError } from "@/lib/http/errors";
import { readJson } from "@/lib/http/request";
import { sendInvoiceSchema } from "@/lib/billing/schemas";
import { getBillingSnapshot, sendCompanyInvoice } from "@/lib/billing/service";

type RouteContext = { params: Promise<{ companyId: string }> };

export async function POST(request: Request, context: RouteContext) {
  try {
    const { companyId } = await context.params;
    const actor = await requireUser();
    requirePermission(actor, "billing.manage", { companyId });
    const input = sendInvoiceSchema.parse((await readJson(request)) ?? {});
    const invoice = await sendCompanyInvoice(companyId, actor, input.email);
    const company = await prisma.company.findFirstOrThrow({
      where: { id: companyId },
      select: { name: true },
    });
    return Response.json({
      ...(await getBillingSnapshot(companyId, company.name, true)),
      invoice: { number: invoice.number, sentTo: invoice.sentTo },
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
