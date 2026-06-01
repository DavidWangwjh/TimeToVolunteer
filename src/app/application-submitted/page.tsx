import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Navbar } from "@/components/layout/Navbar";
import { CheckCircle } from "lucide-react";

export default function ApplicationSubmittedPage() {
  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />
      <main className="container mx-auto px-4 py-20 max-w-lg text-center">
        <CheckCircle className="h-16 w-16 text-emerald-600 mx-auto mb-6" />
        <h1 className="text-2xl font-bold mb-4">Application Submitted</h1>
        <p className="text-muted-foreground mb-8">
          Thank you for applying. Our team will review your application and reach
          out to you personally.
        </p>
        <Button asChild variant="outline">
          <Link href="/">Back to Home</Link>
        </Button>
      </main>
    </div>
  );
}
