import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { Suspense } from "react";
import { Navbar } from "@/components/layout/Navbar";
import { LoginForm } from "@/components/auth/LoginForm";
import { devQuickLoginGroups, DEV_SUPABASE_PROJECT_REF } from "@/lib/dev-login-accounts";
import { getAuthNavState } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Log In",
  description: "Log in to TimeToVolunteer to manage your volunteer account.",
  robots: {
    index: false,
    follow: false,
  },
};

export default async function LoginPage() {
  const auth = await getAuthNavState();
  const quickLoginAccounts =
    process.env.APP_ENV === "development" &&
    process.env.NEXT_PUBLIC_SUPABASE_URL === `https://${DEV_SUPABASE_PROJECT_REF}.supabase.co`
      ? devQuickLoginGroups
      : [];

  if (
    auth.isSignedIn &&
    auth.dashboardHref !== "/login" &&
    auth.dashboardHref !== "/login?error=inactive"
  ) {
    redirect(auth.dashboardHref);
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />
      <main className="container mx-auto px-4 py-16">
        <Suspense>
          <LoginForm quickLoginGroups={quickLoginAccounts} />
        </Suspense>
      </main>
    </div>
  );
}
