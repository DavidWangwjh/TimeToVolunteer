import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { Suspense } from "react";
import { Navbar } from "@/components/layout/Navbar";
import { LoginForm } from "@/components/auth/LoginForm";
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
          <LoginForm />
        </Suspense>
      </main>
    </div>
  );
}
