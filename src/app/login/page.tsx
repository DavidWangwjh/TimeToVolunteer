import { redirect } from "next/navigation";
import { Suspense } from "react";
import { Navbar } from "@/components/layout/Navbar";
import { LoginForm } from "@/components/auth/LoginForm";
import { getAuthNavState } from "@/lib/auth";

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
