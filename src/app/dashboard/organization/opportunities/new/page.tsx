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
      };
    }
  }

  return (
    <div>
      <CreateOpportunityForm
        initialValues={initialValues}
        organizationVisibility={ownedOrganization.visibility}
      />
    </div>
  );
}
