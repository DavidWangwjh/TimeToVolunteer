import Link from "next/link";
import { Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { AdminCalendar } from "@/components/calendar/AdminCalendar";
import { OpportunityTable } from "@/components/opportunities/OpportunityTable";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default async function OpportunitiesPage() {
  const supabase = await createClient();

  const [{ data: opportunities }, { data: bookings }] = await Promise.all([
    supabase
      .from("volunteer_opportunities")
      .select("*")
      .order("date", { ascending: false }),
    supabase
      .from("bookings")
      .select("opportunity_id, status"),
  ]);

  const counts = (bookings ?? []).reduce<Record<string, { approved: number; pending: number }>>(
    (counts, booking) => {
      if (!counts[booking.opportunity_id]) {
        counts[booking.opportunity_id] = { approved: 0, pending: 0 };
      }

      if (booking.status === "approved") {
        counts[booking.opportunity_id].approved += 1;
      }

      if (booking.status === "pending") {
        counts[booking.opportunity_id].pending += 1;
      }

      return counts;
    },
    {}
  );

  const registeredCounts = Object.fromEntries(
    Object.entries(counts).map(([opportunityId, value]) => [
      opportunityId,
      value.approved,
    ])
  );

  const opportunitiesWithCounts = (opportunities ?? []).map((opportunity) => ({
    ...opportunity,
    approved_count: counts[opportunity.id]?.approved ?? 0,
    pending_count: counts[opportunity.id]?.pending ?? 0,
  }));

  return (
    <div>
      <div className="mb-4 flex justify-end">
        <Button asChild>
          <Link href="/admin/opportunities/new">
            <Plus className="size-4" />
            Create Opportunity
          </Link>
        </Button>
      </div>

      <Tabs defaultValue="list">
        <TabsList className="max-w-full overflow-x-auto">
          <TabsTrigger value="list">
            List ({opportunities?.length ?? 0})
          </TabsTrigger>
          <TabsTrigger value="calendar">Calendar</TabsTrigger>
        </TabsList>
        <TabsContent value="list" className="mt-4">
          <OpportunityTable
            opportunities={opportunities ?? []}
            registeredCounts={registeredCounts}
          />
        </TabsContent>
        <TabsContent value="calendar" className="mt-4">
          <AdminCalendar opportunities={opportunitiesWithCounts} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
