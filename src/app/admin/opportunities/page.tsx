import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/layout/PageHeader";
import { OpportunityTable } from "@/components/opportunities/OpportunityTable";
import { Button } from "@/components/ui/button";

export default async function OpportunitiesPage() {
  const supabase = await createClient();

  const [{ data: opportunities }, { data: bookings }] = await Promise.all([
    supabase
      .from("volunteer_opportunities")
      .select("*")
      .order("date", { ascending: false }),
    supabase
      .from("bookings")
      .select("opportunity_id")
      .eq("status", "approved"),
  ]);

  const registeredCounts = (bookings ?? []).reduce<Record<string, number>>(
    (counts, booking) => {
      counts[booking.opportunity_id] = (counts[booking.opportunity_id] ?? 0) + 1;
      return counts;
    },
    {}
  );

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
      <OpportunityTable
        opportunities={opportunities ?? []}
        registeredCounts={registeredCounts}
      />
    </div>
  );
}
