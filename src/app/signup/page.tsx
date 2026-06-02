import Link from "next/link";
import { Navbar } from "@/components/layout/Navbar";
import { VolunteerSignupForm } from "@/components/auth/VolunteerSignupForm";

export default function SignupPage() {
  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />
      <main className="container mx-auto max-w-2xl px-4 py-12">
        <div className="mb-8 text-center">
          <h1 className="mb-2 text-3xl font-bold">Create Volunteer Account</h1>
          <p className="text-muted-foreground">
            Sign up, complete your profile, and start browsing public volunteer
            opportunities.
          </p>
        </div>
        <VolunteerSignupForm />
        <p className="mt-6 text-center text-sm text-muted-foreground">
          Creating an organization?{" "}
          <Link href="/apply" className="font-semibold text-emerald-800">
            Apply here
          </Link>
        </p>
      </main>
    </div>
  );
}
