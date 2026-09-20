import { prisma } from "@/lib/db/prisma";
import { forgotPasswordSchema } from "@/lib/auth/schemas";
import { issueEmailToken } from "@/lib/auth/email-tokens";
import { sendPasswordResetEmail } from "@/lib/email/auth-emails";
import { handleRouteError } from "@/lib/http/errors";
import { readJson } from "@/lib/http/request";

export async function POST(request: Request) {
  try {
    const body = await readJson(request);
    const input = forgotPasswordSchema.parse(body);

    const user = await prisma.user.findUnique({
      where: { email: input.email },
      select: { id: true, email: true },
    });

    if (user) {
      const token = await issueEmailToken(user.id, "PASSWORD_RESET");
      await sendPasswordResetEmail(user.email, token);
    }

    return Response.json({
      ok: true,
      message: "If an account exists for that email, a reset link is on its way.",
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
