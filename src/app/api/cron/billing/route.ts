import { handleRouteError, jsonError } from "@/lib/http/errors";
import { getCronSecret } from "@/lib/env";
import { evaluateDueSubscriptions } from "@/lib/billing/service";

function authorized(request: Request) {
  const secret = getCronSecret();
  const header = request.headers.get("authorization");
  if (secret) {
    return header === `Bearer ${secret}`;
  }
  return process.env.NODE_ENV !== "production";
}

export async function GET(request: Request) {
  try {
    if (!authorized(request)) {
      return jsonError("Authentication required", 401);
    }
    return Response.json(await evaluateDueSubscriptions(), { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return handleRouteError(error);
  }
}
