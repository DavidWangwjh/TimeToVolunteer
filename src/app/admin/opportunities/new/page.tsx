import { createClient } from "@/lib/supabase/server";
import { CreateOpportunityForm } from "@/components/opportunities/CreateOpportunityForm";
import type { OpportunityCreateInput } from "@/lib/validators";

interface NewOpportunityPageProps {
  searchParams: Promise<{ duplicate?: string }>;
}

export default async function NewOpportunityPage({
  searchParams,
}: NewOpportunityPageProps) {
  const { duplicate } = await searchParams;
  let initialValues: Partial<OpportunityCreateInput> | undefined;

  if (duplicate) {
    const supabase = await createClient();
    const { data: opportunity } = await supabase
      .from("volunteer_opportunities")
      .select("*")
      .eq("id", duplicate)
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
      <CreateOpportunityForm initialValues={initialValues} />
    </div>
  );
}
