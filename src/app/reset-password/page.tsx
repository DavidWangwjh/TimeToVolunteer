import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { getCurrentUser, getCurrentUserProfile } from "@/lib/auth";
import { ResetPasswordForm } from "@/components/auth/ResetPasswordForm";

export const metadata: Metadata = {
  title: "Reset Password",
  description: "Set or reset your TimeToVolunteer account password.",
  robots: {
    index: false,
    follow: false,
  },
};

export default async function ResetPasswordPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  const profile = await getCurrentUserProfile();
  const isFirstLogin = profile?.must_reset_password ?? false;

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold">
            {isFirstLogin ? "Set Your Password" : "Reset Password"}
          </h1>
          <p className="text-muted-foreground mt-2 text-sm">
            {isFirstLogin
              ? "Welcome! Please choose a new password to secure your account."
              : "Enter a new password for your account."}
          </p>
        </div>
        <ResetPasswordForm isFirstLogin={isFirstLogin} />
      </div>
    </div>
  );
}
