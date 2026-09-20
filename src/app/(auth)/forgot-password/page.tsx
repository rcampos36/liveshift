import { AuthCard } from "@/components/auth/auth-card";
import { AuthForm } from "@/components/auth/auth-form";

export default function ForgotPasswordPage() {
  return (
    <AuthCard>
      <div className="space-y-6">
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold text-stone-950">Reset password</h1>
          <p className="text-sm text-stone-600">
            Enter your email and we will send a reset link if an account exists.
          </p>
        </div>
        <AuthForm
          action="/api/auth/forgot-password"
          submitLabel="Send reset link"
          onSuccessMessage="If an account exists for that email, a reset link is on its way."
          fields={[{ name: "email", label: "Email", type: "email", autoComplete: "email" }]}
          footer={{ href: "/login", label: "Back to sign in" }}
        />
      </div>
    </AuthCard>
  );
}
