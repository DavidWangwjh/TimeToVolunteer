import type { Metadata } from "next";
import { Navbar } from "@/components/layout/Navbar";
import { ForgotPasswordForm } from "@/components/auth/ForgotPasswordForm";

export const metadata: Metadata = {
  title: "Forgot Password",
  description: "Request a password reset for your TimeToVolunteer account.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function ForgotPasswordPage() {
  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />
      <main className="container mx-auto px-4 py-16">
        <ForgotPasswordForm />
      </main>
    </div>
  );
}
