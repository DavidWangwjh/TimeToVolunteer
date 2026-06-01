import { Navbar } from "@/components/layout/Navbar";
import { OrganizationApplicationForm } from "@/components/applications/OrganizationApplicationForm";

export default function ApplyPage() {
  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />
      <main className="container mx-auto max-w-2xl px-4 py-12">
        <div className="mb-8 text-center">
          <h1 className="mb-2 text-3xl font-bold">Organization Application</h1>
          <p className="text-muted-foreground">
            Apply to create an organization account and publish volunteer opportunities.
          </p>
        </div>
        <OrganizationApplicationForm />
      </main>
    </div>
  );
}
