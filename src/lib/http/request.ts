export async function readJson<T>(request: Request) {
  try {
    return (await request.json()) as T;
  } catch {
    return null;
  }
}

export function getUserAgent(request: Request) {
  return request.headers.get("user-agent");
}
