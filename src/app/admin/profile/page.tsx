import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { AdminCalendar } from "@/components/calendar/AdminCalendar";
import { Card, CardContent } from "@/components/ui/card";
import { AdminOrganizationProfilePanel } from "@/components/organizations/AdminOrganizationProfilePanel";
import { ProfileForm } from "@/components/profile/ProfileForm";
import type { Organization } from "@/types/database";

export default async function AdminProfilePage() {
  const profile = await requireAdmin();
  const supabase = await createClient();
  const { data: organization } =
    profile.role === "organization"
      ? await supabase
          .from("organizations")
          .select("*")
          .eq("owner_id", profile.id)
          .eq("status", "active")
          .maybeSingle()
      : { data: null };
  const { data: opportunities } = organization
    ? await supabase
        .from("volunteer_opportunities")
        .select("*")
        .eq("organization_id", organization.id)
        .order("date", { ascending: true })
    : { data: [] };
  const opportunityIds = (opportunities ?? []).map((opportunity) => opportunity.id);
  const { data: bookings } = opportunityIds.length
    ? await supabase
        .from("bookings")
        .select("opportunity_id, status")
        .in("opportunity_id", opportunityIds)
    : { data: [] };
  const counts = (bookings ?? []).reduce<
    Record<string, { approved: number; pending: number }>
  >((result, booking) => {
    if (!result[booking.opportunity_id]) {
      result[booking.opportunity_id] = { approved: 0, pending: 0 };
    }

    if (booking.status === "approved") result[booking.opportunity_id].approved += 1;
    if (booking.status === "pending") result[booking.opportunity_id].pending += 1;

    return result;
  }, {});
  const opportunitiesWithCounts = (opportunities ?? []).map((opportunity) => ({
    ...opportunity,
    approved_count: counts[opportunity.id]?.approved ?? 0,
    pending_count: counts[opportunity.id]?.pending ?? 0,
  }));

  return (
    <div className="space-y-4">
      {organization && (
        <>
          <AdminOrganizationProfilePanel
            organization={organization as Organization}
          />
          <Card className="border-slate-200 bg-white">
            <CardContent className="p-5">
              <div className="mb-4">
                <h2 className="font-semibold text-slate-950">Calendar</h2>
                <p className="mt-1 text-sm text-slate-500">
                  Review your organization&apos;s upcoming and draft opportunities.
                </p>
              </div>
              <AdminCalendar opportunities={opportunitiesWithCounts} />
            </CardContent>
          </Card>
        </>
      )}
      {!organization && <ProfileForm profile={profile} />}
    </div>
  );
}
