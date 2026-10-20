import { getVolunteerDashboardData } from "@/lib/volunteer-dashboard";
import { VolunteerScheduleSection } from "@/components/dashboard/VolunteerScheduleSection";
import { LegacyInvitationRedirect } from "@/components/dashboard/LegacyInvitationRedirect";
import { VolunteerProfilePanel } from "@/components/profile/VolunteerProfilePanel";
import { createClient } from "@/lib/supabase/server";

export default async function VolunteerDashboardPage() {
  const { profile, bookings, approvedCounts } = await getVolunteerDashboardData();
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const schedule = bookings.filter((booking) => booking.status !== "invited" && ["published", "completed"].includes(booking.opportunity.status));
  return (
    <div className="space-y-6">
      <LegacyInvitationRedirect />
      <VolunteerProfilePanel profile={profile} userMetadata={user?.user_metadata ?? {}} />
      <VolunteerScheduleSection opportunities={schedule.map((booking) => booking.opportunity)} approvedCounts={approvedCounts}
        userBookingOpportunityIds={schedule.map((booking) => booking.opportunity_id)}
        userBookingStatuses={Object.fromEntries(schedule.map((booking) => [booking.opportunity_id, booking.status]))}
        userBookingIds={Object.fromEntries(schedule.map((booking) => [booking.opportunity_id, booking.id]))} />
    </div>
  );
}
