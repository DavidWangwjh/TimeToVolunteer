import "server-only";
import { getCurrentUserProfile } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { redirect } from "next/navigation";
import type { VolunteerOpportunityBooking } from "@/lib/volunteer-opportunities";

export async function getVolunteerDashboardData() {
  const profile = await getCurrentUserProfile();
  if (!profile || profile.role !== "volunteer" || profile.status !== "active") redirect("/dashboard");
  // Published-only opportunity RLS hides completed sessions in nested joins.
  // Read on the server, scoped strictly to the authenticated active volunteer.
  const supabase = createAdminClient();
  const { data, error } = await supabase.from("bookings")
    .select("*, volunteer_opportunities(*, organizations(*))")
    .eq("volunteer_id", profile.id).in("status", ["pending", "approved", "completed", "invited"])
    .order("created_at", { ascending: false });
  if (error) throw new Error("Unable to load your opportunities");
  const bookings: VolunteerOpportunityBooking[] = (data ?? []).flatMap((booking) => {
    const opportunity = Array.isArray(booking.volunteer_opportunities) ? booking.volunteer_opportunities[0] : booking.volunteer_opportunities;
    return opportunity ? [{ ...booking, opportunity }] : [];
  });
  const ids = [...new Set(bookings.map((booking) => booking.opportunity_id))];
  const { data: registrations, error: countError } = ids.length ? await createAdminClient().from("bookings")
    .select("opportunity_id").in("opportunity_id", ids).in("status", ["approved", "completed"]) : { data: [], error: null };
  if (countError) throw new Error("Unable to load registration counts");
  const approvedCounts: Record<string, number> = {};
  for (const booking of registrations ?? []) approvedCounts[booking.opportunity_id] = (approvedCounts[booking.opportunity_id] ?? 0) + 1;
  return { profile, bookings, approvedCounts };
}
