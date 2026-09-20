import { getCurrentUser, toPublicUser } from "@/lib/auth/session";
import { jsonError } from "@/lib/http/errors";

export async function GET() {
  const user = await getCurrentUser();

  if (!user) {
    return jsonError("Authentication required", 401);
  }

  return Response.json({ user: toPublicUser(user) });
}
