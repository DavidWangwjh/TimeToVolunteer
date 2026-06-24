import { createClient } from "@/lib/supabase/server";
import { CreateOpportunityForm } from "@/components/opportunities/CreateOpportunityForm";
import type { OpportunityCreateInput } from "@/lib/validators";
import type { OrganizationVisibility } from "@/types/database";

interface NewOpportunityPageProps {
  searchParams: Promise<{ duplicate?: string }>;
}

export default async function NewOpportunityPage({
  searchParams,
}: NewOpportunityPageProps) {
  const { duplicate } = await searchParams;
  let initialValues: Partial<OpportunityCreateInput> | undefined;
  let organizationVisibility: OrganizationVisibility = "public";

  if (duplicate) {
    const supabase = await createClient();
    const { data: opportunity } = await supabase
      .from("volunteer_opportunities")
      .select("*, organizations(visibility)")
      .eq("id", duplicate)
      .maybeSingle();

    if (opportunity) {
      const organization = Array.isArray(opportunity.organizations)
        ? opportunity.organizations[0]
        : opportunity.organizations;
      organizationVisibility =
        (organization?.visibility as OrganizationVisibility | undefined) ??
        "public";
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
    <div>
      <CreateOpportunityForm
        initialValues={initialValues}
        organizationVisibility={organizationVisibility}
      />
    </div>
  );
}
