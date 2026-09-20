import Link from "next/link";
import { AuthCard } from "@/components/auth/auth-card";
import { prisma } from "@/lib/db/prisma";
import { consumeEmailToken } from "@/lib/auth/email-tokens";

export default async function VerifyEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;

  if (!token) {
    return (
      <AuthCard>
        <div className="space-y-3">
          <h1 className="text-2xl font-semibold text-stone-950">Verification link missing</h1>
          <p className="text-sm text-stone-600">Use the link from your email, or request a new one from the dashboard.</p>
        </div>
      </AuthCard>
    );
  }

  const record = await consumeEmailToken(token, "EMAIL_VERIFICATION");

  if (!record) {
    return (
      <AuthCard>
        <div className="space-y-3">
          <h1 className="text-2xl font-semibold text-stone-950">Link expired</h1>
          <p className="text-sm text-stone-600">This verification link is invalid or has already been used.</p>
          <Link href="/login" className="text-sm font-medium text-orange-800 hover:underline">
            Back to sign in
          </Link>
        </div>
      </AuthCard>
    );
  }

  await prisma.user.update({
    where: { id: record.userId },
    data: { emailVerifiedAt: new Date() },
  });

  return (
    <AuthCard>
      <div className="space-y-3">
        <h1 className="text-2xl font-semibold text-stone-950">Email verified</h1>
        <p className="text-sm text-stone-600">Your account is confirmed. You can continue into LiveShift.</p>
        <Link href="/dashboard" className="text-sm font-medium text-orange-800 hover:underline">
          Go to dashboard
        </Link>
      </div>
    </AuthCard>
  );
}
