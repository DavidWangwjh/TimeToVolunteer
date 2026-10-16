import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth";
import { redirect } from "next/navigation";
import { CreateOpportunityForm } from "@/components/opportunities/CreateOpportunityForm";
import type { OpportunityCreateInput } from "@/lib/validators";

interface NewOpportunityPageProps {
  searchParams: Promise<{ duplicate?: string }>;
}

export default async function NewOpportunityPage({
  searchParams,
}: NewOpportunityPageProps) {
  const { duplicate } = await searchParams;
  const profile = await requireAdmin();
  const supabase = await createClient();
  const { data: ownedOrganization } = await supabase
    .from("organizations")
    .select("id, status, visibility")
    .eq("owner_id", profile.id)
    .maybeSingle();

  if (ownedOrganization?.status !== "active") {
    redirect("/dashboard/organization");
  }

  let initialValues: Partial<OpportunityCreateInput> | undefined;

  if (duplicate) {
    const { data: opportunity } = await supabase
      .from("volunteer_opportunities")
      .select("*")
      .eq("id", duplicate)
      .eq("organization_id", ownedOrganization.id)
      .maybeSingle();

    if (opportunity) {
      initialValues = {
        title: opportunity.title,
        description: opportunity.description ?? "",
        date: opportunity.date,
        start_time: opportunity.start_time.slice(0, 5),
        end_time: opportunity.end_time.slice(0, 5),
        location: opportunity.location,
        experience_required: opportunity.experience_required ?? "",
        max_volunteers: opportunity.max_volunteers,
        visibility: opportunity.visibility ?? "public",
        recurrence_enabled: Boolean(opportunity.recurring_frequency),
        recurrence_frequency: opportunity.recurring_frequency ?? "weekly",
        recurrence_until: opportunity.recurring_until ?? "",
      };
    }
  }

  return (
    <div className="space-y-5">
      <Link
        href="/dashboard/organization/opportunities"
        className="inline-flex items-center gap-2 text-sm font-semibold text-emerald-800 hover:underline"
      >
        <ArrowLeft className="size-4" />
        Back to opportunities
      </Link>
      <h1 className="text-2xl font-bold text-slate-950">Create Opportunity</h1>
      <CreateOpportunityForm
        cancelHref="/dashboard/organization/opportunities"
        initialValues={initialValues}
        organizationVisibility={ownedOrganization.visibility}
      />
    </div>
  );
}
