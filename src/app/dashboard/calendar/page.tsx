import { createClient } from "@/lib/supabase/server";
import { getCurrentUserProfile } from "@/lib/auth";
import { PageHeader } from "@/components/layout/PageHeader";
import { VolunteerCalendar } from "@/components/calendar/VolunteerCalendar";

export default async function CalendarPage() {
  const profile = await getCurrentUserProfile();
  const supabase = await createClient();

  const { data: opportunities } = await supabase
    .from("volunteer_opportunities")
    .select("*, organizations(*)")
    .eq("status", "published")
    .order("date", { ascending: true });

  const oppIds = (opportunities ?? []).map((o) => o.id);

  const { data: bookings } = await supabase
    .from("bookings")
    .select("opportunity_id, status, volunteer_id")
    .in("opportunity_id", oppIds.length ? oppIds : ["00000000-0000-0000-0000-000000000000"]);

  const approvedCounts: Record<string, number> = {};
  const userBookingOpportunityIds: string[] = [];

  for (const booking of bookings ?? []) {
    if (booking.status === "approved") {
      approvedCounts[booking.opportunity_id] =
        (approvedCounts[booking.opportunity_id] ?? 0) + 1;
    }
    if (
      booking.volunteer_id === profile!.id &&
      ["pending", "approved"].includes(booking.status)
    ) {
      userBookingOpportunityIds.push(booking.opportunity_id);
    }
  }

  return (
    <div>
      <PageHeader
        title="Volunteer Calendar"
        description="Browse available sessions and request bookings."
      />
      <VolunteerCalendar
        opportunities={opportunities ?? []}
        approvedCounts={approvedCounts}
        userBookingOpportunityIds={userBookingOpportunityIds}
      />
    </div>
  );
}
