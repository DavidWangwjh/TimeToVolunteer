import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AdminScheduleSection } from "@/components/dashboard/AdminScheduleSection";
import { AdminOrganizationProfilePanel } from "@/components/organizations/AdminOrganizationProfilePanel";
import { OrganizationStatusActions } from "@/components/organizations/OrganizationStatusActions";
import { StatusBadge } from "@/components/bookings/BookingStatusBadge";
import type { OpportunityStatus, Organization } from "@/types/database";

interface OrganizationDetailPageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ status?: string }>;
}

export default async function OrganizationDetailPage({
  params,
  searchParams,
}: OrganizationDetailPageProps) {
  const { id } = await params;
  const { status = "all" } = await searchParams;
  const supabase = await createClient();

  const { data: organization } = await supabase
    .from("organizations")
    .select("*")
    .eq("id", id)
    .single();

  if (!organization) notFound();

  let opportunityQuery = supabase
    .from("volunteer_opportunities")
    .select("*, organizations(id, name)")
    .eq("organization_id", organization.id)
    .order("date", { ascending: true });

  if (["draft", "published", "cancelled", "completed"].includes(status)) {
    opportunityQuery = opportunityQuery.eq("status", status as OpportunityStatus);
  }

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
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <StatusBadge status={organization.status} />
        <OrganizationStatusActions
          organizationId={organization.id}
          currentStatus={organization.status}
        />
      </div>

      <AdminOrganizationProfilePanel
        organization={organization as Organization}
        platformAdmin
      />

      <AdminScheduleSection
        opportunities={opportunitiesWithCounts}
        registeredCounts={registeredCounts}
        currentOrganization={organization.id}
        currentStatus={status}
        showCreateButton={false}
      />
    </div>
  );
}
