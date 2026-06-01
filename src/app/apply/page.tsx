import { Navbar } from "@/components/layout/Navbar";
import { ApplicationForm } from "@/components/applications/ApplicationForm";

export default function ApplyPage() {
  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />
      <main className="container mx-auto px-4 py-12 max-w-2xl">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold mb-2">Volunteer Application</h1>
          <p className="text-muted-foreground">
            Tell us about yourself and why you&apos;d like to volunteer with us.
          </p>
        </div>
        <ApplicationForm />
      </main>
    </div>
  );
}
