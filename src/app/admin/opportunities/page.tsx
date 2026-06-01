import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/layout/PageHeader";
import { OpportunityTable } from "@/components/opportunities/OpportunityTable";
import { Button } from "@/components/ui/button";

export default async function OpportunitiesPage() {
  const supabase = await createClient();

  const { data: opportunities } = await supabase
    .from("volunteer_opportunities")
    .select("*")
    .order("date", { ascending: false });

  return (
    <div>
      <PageHeader
        title="Opportunities"
        description="Create and manage volunteer sessions."
        action={
          <Button asChild>
            <Link href="/admin/opportunities/new">Create Opportunity</Link>
          </Button>
        }
      />
      <OpportunityTable opportunities={opportunities ?? []} />
    </div>
  );
}
