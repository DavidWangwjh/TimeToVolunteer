import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { getVolunteerHours } from "@/lib/volunteer-ranks";

// Call only after verifying the viewer is allowed to see this volunteer's profile.
// Return the aggregate, never another organization's registration details.
export async function getVolunteerStats(volunteerId: string) {
  let hours = 0;
  const completedIds = new Set<string>();
  const now = new Date();
  const pageSize = 500;
  for (let offset = 0; ; offset += pageSize) {
    const { data, error } = await createAdminClient().from("bookings")
      .select("opportunity_id, status, checked_in_at, volunteer_opportunities!inner(status, date, start_time, end_time)")
      .eq("volunteer_id", volunteerId).in("status", ["approved", "completed"]).not("checked_in_at", "is", null)
      .order("id").range(offset, offset + pageSize - 1);
    if (error) throw new Error("Unable to load volunteer rank");
    for (const booking of data ?? []) {
      const opportunity = Array.isArray(booking.volunteer_opportunities) ? booking.volunteer_opportunities[0] : booking.volunteer_opportunities;
      if (!opportunity || completedIds.has(booking.opportunity_id)) continue;
      const creditedHours = getVolunteerHours([{ ...booking, opportunity }], now);
      if (creditedHours > 0) {
        completedIds.add(booking.opportunity_id);
        hours += creditedHours;
      }
    }
    if ((data?.length ?? 0) < pageSize) return { hours, completedOpportunities: completedIds.size };
  }
}
