import { prisma } from "@/lib/db/prisma";
import { requirePermission, requireUser } from "@/lib/authorization/guards";
import { recordAuditLog } from "@/lib/audit/log";
import { handleRouteError } from "@/lib/http/errors";
import { readJson } from "@/lib/http/request";
import { updateRestaurantSchema } from "@/lib/tenancy/schemas";

type RouteContext = { params: Promise<{ companyId: string; locationId: string }> };

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { companyId, locationId } = await context.params;
    const user = await requireUser();
    requirePermission(user, "location.manage", { companyId, locationId });
    const input = updateRestaurantSchema.parse(await readJson(request));

    const restaurant = await prisma.location.findFirst({
      where: { id: locationId, companyId },
      select: { id: true, name: true },
    });
    if (!restaurant) {
      return Response.json({ error: "Restaurant not found in this company" }, { status: 404 });
    }

    const updated = await prisma.location.update({
      where: { id: locationId },
      data: { name: input.name },
      select: { id: true, name: true },
    });

    await recordAuditLog({
      scope: { companyId, locationId },
      userId: user.id,
      entity: "Location",
      entityId: locationId,
      action: "RENAME",
      oldValue: { name: restaurant.name },
      newValue: { name: updated.name },
    });

    return Response.json({ restaurant: updated });
  } catch (error) {
    return handleRouteError(error);
  }
}
