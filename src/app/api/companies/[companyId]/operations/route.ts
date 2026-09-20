import { requirePermission, requireUser } from "@/lib/authorization/guards";
import { getAccessibleScope } from "@/lib/authorization/scope";
import { getCompanyOperationsSnapshot } from "@/lib/company-operations/service";
import { handleRouteError } from "@/lib/http/errors";
import { prisma } from "@/lib/db/prisma";

export async function GET(_request: Request, context: { params: Promise<{ companyId: string }> }) {
  try {
    const { companyId } = await context.params;
    const user = await requireUser();
    requirePermission(user, "operations.read", { companyId });

    const [company, scope] = await Promise.all([
      prisma.company.findFirst({
        where: { id: companyId },
        select: { id: true, name: true },
      }),
      getAccessibleScope(user),
    ]);

    if (!company) {
      return Response.json({ error: "Company not found" }, { status: 404 });
    }

    const accessible = scope.find((item) => item.id === companyId);
    const houses = await prisma.location.findMany({
      where: {
        companyId,
        id: { in: (accessible?.locations ?? []).map((location) => location.id) },
      },
      select: { id: true, name: true, timezone: true },
      orderBy: { name: "asc" },
    });

    return Response.json(await getCompanyOperationsSnapshot(company.id, company.name, houses), {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
