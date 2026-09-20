import { getCompanyRole, requirePermission, requireUser } from "@/lib/authorization/guards";
import { roleHasPermission } from "@/lib/authorization/permissions";
import { handleRouteError } from "@/lib/http/errors";
import { prisma } from "@/lib/db/prisma";
import { getWasteSnapshot } from "@/lib/waste/service";

export async function GET(_request: Request, context: { params: Promise<{ companyId: string }> }) {
  try {
    const { companyId } = await context.params;
    const user = await requireUser();
    requirePermission(user, "waste.read", { companyId });
    const company = await prisma.company.findUnique({
      where: { id: companyId },
      select: { name: true, locations: { select: { timezone: true }, take: 1 } },
    });
    if (!company) {
      return Response.json({ error: "Company not found" }, { status: 404 });
    }

    const role = getCompanyRole(user, companyId);
    const timezone = company.locations[0]?.timezone ?? "America/New_York";
    return Response.json(
      await getWasteSnapshot({
        companyId,
        restaurantName: company.name,
        timezone,
        canWrite: role ? roleHasPermission(role, "waste.write") : false,
        currentUserId: user.id,
      }),
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return handleRouteError(error);
  }
}
