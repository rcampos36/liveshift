import { prisma } from "@/lib/db/prisma";
import { requireUser, requirePermission } from "@/lib/authorization/guards";
import { createRestaurantSchema } from "@/lib/tenancy/schemas";
import { uniqueSlug } from "@/lib/utils/slug";
import { assertCompanyCanAddLocation } from "@/lib/billing/service";
import { handleRouteError } from "@/lib/http/errors";
import { readJson } from "@/lib/http/request";

export async function POST(
  request: Request,
  context: { params: Promise<{ companyId: string }> },
) {
  try {
    const { companyId } = await context.params;
    const user = await requireUser();
    requirePermission(user, "location.manage", { companyId });
    await assertCompanyCanAddLocation(companyId);

    const input = createRestaurantSchema.parse(await readJson(request));
    const restaurant = await prisma.location.create({
      data: {
        companyId,
        name: input.name,
        slug: uniqueSlug(input.name),
        timezone: input.timezone,
        addressLine1: input.addressLine1 || null,
        city: input.city || null,
        state: input.state || null,
      },
    });

    return Response.json({ restaurant }, { status: 201 });
  } catch (error) {
    return handleRouteError(error);
  }
}
