import { prisma } from "@/lib/db/prisma";
import { requirePermission, requireUser } from "@/lib/authorization/guards";
import { handleRouteError } from "@/lib/http/errors";
import { readJson } from "@/lib/http/request";
import { updateCompanySchema } from "@/lib/tenancy/schemas";

type RouteContext = { params: Promise<{ companyId: string }> };

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { companyId } = await context.params;
    const user = await requireUser();
    requirePermission(user, "company.manage", { companyId });
    const input = updateCompanySchema.parse(await readJson(request));

    const company = await prisma.company.findFirst({
      where: { id: companyId },
      select: { id: true, name: true },
    });
    if (!company) {
      return Response.json({ error: "Company not found" }, { status: 404 });
    }

    const updated = await prisma.company.update({
      where: { id: companyId },
      data: { name: input.name },
      select: { id: true, name: true },
    });

    return Response.json({ company: updated });
  } catch (error) {
    return handleRouteError(error);
  }
}
