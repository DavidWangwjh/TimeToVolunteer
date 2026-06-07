import { requireAdmin } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { AdminCalendar } from "@/components/calendar/AdminCalendar";
import { OpportunityTable } from "@/components/opportunities/OpportunityTable";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default async function OpportunitiesPage() {
  const profile = await requireAdmin();
  const supabase = await createClient();
  const { data: organization } = await supabase
    .from("organizations")
    .select("id, status")
    .eq("owner_id", profile.id)
    .maybeSingle();

  if (organization?.status !== "active") {
    redirect("/dashboard/organization");
  }

  const [{ data: opportunities }, { data: bookings }] = await Promise.all([
    supabase
      .from("volunteer_opportunities")
      .select("*")
      .eq("organization_id", organization?.id ?? "00000000-0000-0000-0000-000000000000")
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
          <Link href="/dashboard/organization/opportunities/new">
            <Plus className="size-4" />
            Create Opportunity
          </Link>
        </Button>
      </div>

      <Tabs defaultValue="list">
        <TabsList className="h-10 overflow-hidden">
          <TabsTrigger className="min-w-0 px-3" value="list">
            List ({opportunities?.length ?? 0})
          </TabsTrigger>
          <TabsTrigger className="min-w-0 px-3" value="calendar">
            Calendar
          </TabsTrigger>
        </TabsList>
        <TabsContent value="list" className="mt-4">
          <OpportunityTable
            opportunities={opportunities ?? []}
            registeredCounts={registeredCounts}
            basePath="/dashboard/organization/opportunities"
          />
        </TabsContent>
        <TabsContent value="calendar" className="mt-4">
          <AdminCalendar
            opportunities={opportunitiesWithCounts}
            editBasePath="/dashboard/organization/opportunities"
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
