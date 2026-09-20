"use client";

import { useRouter } from "next/navigation";

export function SignOutButton() {
  const router = useRouter();

  async function signOut() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={signOut}
      className="text-xs font-medium tracking-wide text-stone-500 transition hover:text-stone-800"
    >
      Sign out
    </button>
  );
}
