import { createClient } from "@/lib/supabase/server";
import { AdminScheduleSection } from "@/components/dashboard/AdminScheduleSection";

interface OpportunitiesPageProps {
  searchParams: Promise<{ org?: string; status?: string }>;
}

export default async function OpportunitiesPage({
  searchParams,
}: OpportunitiesPageProps) {
  const { org = "all", status = "all" } = await searchParams;
  const supabase = await createClient();

  const opportunityQuery = supabase
    .from("volunteer_opportunities")
    .select("*, organizations(id, name)")
    .order("date", { ascending: true });





  const [{ data: opportunities }, { data: bookings }] = await Promise.all([
    opportunityQuery,
    supabase.from("bookings").select("opportunity_id, status"),
  ]);

  const counts = (bookings ?? []).reduce<
    Record<string, { approved: number; pending: number }>
  >((result, booking) => {
    if (!result[booking.opportunity_id]) {
      result[booking.opportunity_id] = { approved: 0, pending: 0 };
    }

    if (["approved", "completed"].includes(booking.status)) result[booking.opportunity_id].approved += 1;
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
    <div className="space-y-5">
    <h1 className="text-2xl font-bold">Opportunities</h1>
    <AdminScheduleSection
      opportunities={opportunitiesWithCounts}
      registeredCounts={registeredCounts}
      currentOrganization={org}
      currentStatus={status}
      showCreateButton={false}
    />
    </div>
  );
}
