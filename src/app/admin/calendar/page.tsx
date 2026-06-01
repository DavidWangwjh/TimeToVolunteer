import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/layout/PageHeader";
import { AdminCalendar } from "@/components/calendar/AdminCalendar";

export default async function AdminCalendarPage() {
  const supabase = await createClient();

  const { data: opportunities } = await supabase
    .from("volunteer_opportunities")
    .select("*")
    .order("date", { ascending: true });

  const oppIds = (opportunities ?? []).map((o) => o.id);

  const { data: bookings } = await supabase
    .from("bookings")
    .select("opportunity_id, status")
    .in("opportunity_id", oppIds.length ? oppIds : ["00000000-0000-0000-0000-000000000000"]);

  const counts: Record<string, { approved: number; pending: number }> = {};
  for (const booking of bookings ?? []) {
    if (!counts[booking.opportunity_id]) {
      counts[booking.opportunity_id] = { approved: 0, pending: 0 };
    }
    if (booking.status === "approved") counts[booking.opportunity_id].approved++;
    if (booking.status === "pending") counts[booking.opportunity_id].pending++;
  }

  const opportunitiesWithCounts = (opportunities ?? []).map((opp) => ({
    ...opp,
    approved_count: counts[opp.id]?.approved ?? 0,
    pending_count: counts[opp.id]?.pending ?? 0,
  }));

  return (
    <div>
      <PageHeader
        title="Admin Calendar"
        description="View all volunteer opportunities. Click an event to edit."
      />
      <AdminCalendar opportunities={opportunitiesWithCounts} />
    </div>
  );
}
