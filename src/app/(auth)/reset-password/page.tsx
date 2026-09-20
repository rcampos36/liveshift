import { AuthCard } from "@/components/auth/auth-card";
import { AuthForm } from "@/components/auth/auth-form";

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;

  if (!token) {
    return (
      <AuthCard>
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold text-stone-950">Reset link missing</h1>
          <p className="text-sm text-stone-600">Request a new password reset email and try again.</p>
        </div>
      </AuthCard>
    );
  }

  return (
    <AuthCard>
      <div className="space-y-6">
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold text-stone-950">Choose a new password</h1>
          <p className="text-sm text-stone-600">This will sign you out of other sessions.</p>
        </div>
        <AuthForm
          action="/api/auth/reset-password"
          submitLabel="Update password"
          successRedirect="/login"
          onSuccessMessage="Password updated. You can sign in now."
          fields={[
            { name: "token", label: "Reset token", type: "hidden", defaultValue: token },
            { name: "password", label: "New password", type: "password", autoComplete: "new-password" },
          ]}
          footer={{ href: "/login", label: "Back to sign in" }}
        />
      </div>
    </AuthCard>
  );
}
