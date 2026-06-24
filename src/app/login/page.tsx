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
  const quickLoginAccounts =
    process.env.APP_ENV === "development"
      ? [
          {
            role: "Admin",
            accounts: [
              {
                label: "Platform Admin",
                email: "admin@timetovolunteer.test",
                password: "password123",
              },
            ],
          },
          {
            role: "Organizations",
            accounts: [
              {
                label: "Code Ninjas",
                email: "org.codeninjas@timetovolunteer.test",
                password: "password123",
              },
              {
                label: "Green City",
                email: "org.greencity@timetovolunteer.test",
                password: "password123",
              },
            ],
          },
          {
            role: "Volunteers",
            accounts: [
              {
                label: "Ava Martinez",
                email: "ava.volunteer@timetovolunteer.test",
                password: "password123",
              },
              {
                label: "Ben Carter",
                email: "ben.volunteer@timetovolunteer.test",
                password: "password123",
              },
              {
                label: "Maya Johnson",
                email: "maya.volunteer@timetovolunteer.test",
                password: "password123",
              },
              {
                label: "Jordan Lee",
                email: "jordan.volunteer@timetovolunteer.test",
                password: "password123",
              },
            ],
          },
        ]
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
