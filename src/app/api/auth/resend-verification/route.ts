import { getCurrentUser } from "@/lib/auth/session";
import { issueEmailToken } from "@/lib/auth/email-tokens";
import { sendVerificationEmail } from "@/lib/email/auth-emails";
import { jsonError, handleRouteError } from "@/lib/http/errors";

export async function POST() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return jsonError("Authentication required", 401);
    }

    if (user.emailVerifiedAt) {
      return Response.json({ ok: true, message: "Email is already verified." });
    }

    const token = await issueEmailToken(user.id, "EMAIL_VERIFICATION");
    await sendVerificationEmail(user.email, token);

    return Response.json({ ok: true, message: "Verification email sent." });
  } catch (error) {
    return handleRouteError(error);
  }
}
