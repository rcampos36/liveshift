import { cookies } from "next/headers";
import { prisma } from "@/lib/db/prisma";
import { registerSchema } from "@/lib/auth/schemas";
import { hashPassword } from "@/lib/auth/password";
import { createUserSession, toPublicUser } from "@/lib/auth/session";
import { setAuthCookies } from "@/lib/auth/cookies";
import { issueEmailToken } from "@/lib/auth/email-tokens";
import { sendVerificationEmail } from "@/lib/email/auth-emails";
import { uniqueSlug } from "@/lib/utils/slug";
import { startCompanyTrial } from "@/lib/billing/service";
import { handleRouteError, jsonError } from "@/lib/http/errors";
import { getUserAgent, readJson } from "@/lib/http/request";

export async function POST(request: Request) {
  try {
    const body = await readJson(request);
    const input = registerSchema.parse(body);

    const existing = await prisma.user.findUnique({
      where: { email: input.email },
      select: { id: true },
    });

    if (existing) {
      return jsonError("An account with this email already exists", 409);
    }

    const passwordHash = await hashPassword(input.password);

    const user = await prisma.$transaction(async (tx) => {
      const createdUser = await tx.user.create({
        data: {
          email: input.email,
          passwordHash,
          firstName: input.firstName,
          lastName: input.lastName,
        },
      });

      const company = await tx.company.create({
        data: {
          name: input.companyName,
          slug: uniqueSlug(input.companyName),
        },
      });

      await tx.companyMembership.create({
        data: {
          userId: createdUser.id,
          companyId: company.id,
          role: "COMPANY_ADMIN",
        },
      });

      return { createdUser, companyId: company.id };
    });

    await startCompanyTrial(
      user.companyId,
      user.createdUser.id,
      input.planCode
        ? {
            planCode: input.planCode,
            interval: input.interval,
            locationQuantity: input.locationQuantity,
          }
        : undefined,
    );

    const token = await issueEmailToken(user.createdUser.id, "EMAIL_VERIFICATION");
    await sendVerificationEmail(user.createdUser.email, token);

    const session = await createUserSession(user.createdUser.id, getUserAgent(request));
    const cookieStore = await cookies();
    setAuthCookies(cookieStore, session);

    return Response.json({ user: toPublicUser(session.user) }, { status: 201 });
  } catch (error) {
    return handleRouteError(error);
  }
}
