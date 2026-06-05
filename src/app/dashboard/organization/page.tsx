import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { AdminScheduleSection } from "@/components/dashboard/AdminScheduleSection";
import { AdminOrganizationProfilePanel } from "@/components/organizations/AdminOrganizationProfilePanel";
import { OrganizationPendingNotice } from "@/components/organizations/OrganizationPendingNotice";
import type { Organization } from "@/types/database";

export default async function OrganizationOverviewPage() {
  const profile = await requireAdmin();
  const supabase = await createClient();

  const { data: organization } = await supabase
    .from("organizations")
    .select("*")
    .eq("owner_id", profile.id)
    .maybeSingle();

  if (!organization) {
    return (
      <div className="rounded-lg border border-dashed border-slate-300 bg-white/70 py-12 text-center text-sm text-slate-500">
        No active organization profile found.
      </div>
    );
  }

  if (organization.status !== "active") {
    return (
      <div className="space-y-5">
        <OrganizationPendingNotice />
        <AdminOrganizationProfilePanel organization={organization as Organization} />
      </div>
    );
  }

  const { data: opportunities } = await supabase
    .from("volunteer_opportunities")
    .select("*, organizations(id, name)")
    .eq("organization_id", organization.id)
    .order("date", { ascending: true });

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

  const registeredCounts = Object.fromEntries(
    Object.entries(counts).map(([opportunityId, value]) => [
      opportunityId,
      value.approved,
    ])
  );

  const opportunitiesWithCounts = (opportunities ?? []).map((opportunity) => ({
    ...opportunity,
    organizations: Array.isArray(opportunity.organizations)
      ? opportunity.organizations[0]
      : opportunity.organizations,
    approved_count: counts[opportunity.id]?.approved ?? 0,
    pending_count: counts[opportunity.id]?.pending ?? 0,
  }));

  return (
    <div className="space-y-6">
      <AdminOrganizationProfilePanel organization={organization as Organization} />
      <AdminScheduleSection
        opportunities={opportunitiesWithCounts}
        registeredCounts={registeredCounts}
        createHref="/dashboard/organization/opportunities/new"
        editBasePath="/dashboard/organization/opportunities"
        showFilters={false}
      />
    </div>
  );
}
