import { notFound } from "next/navigation";
import { Calendar } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireActiveVolunteer } from "@/lib/auth";
import { Card, CardContent } from "@/components/ui/card";
import { OrganizationOpportunityCalendar } from "@/components/organizations/OrganizationOpportunityCalendar";
import { OrganizationProfile } from "@/components/organizations/OrganizationProfile";
import { isOpportunityPast } from "@/lib/dates";
import type {
  BookingStatus,
  MembershipStatus,
  Organization,
  VolunteerOpportunityWithOrganization,
} from "@/types/database";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function OrganizationDetailPage({ params }: Props) {
  const { id } = await params;
  const profile = await requireActiveVolunteer();
  const supabase = await createClient();
  const adminClient = createAdminClient();
  const today = new Date().toISOString().split("T")[0];

  const [
    { data: organization },
    { data: membership },
    { data: opportunities },
    { data: userActiveBookings },
    { count: upcomingOpportunityCount },
  ] = await Promise.all([
      supabase
        .from("organizations")
        .select("*")
        .eq("id", id)
        .eq("status", "active")
        .single(),
      supabase
        .from("organization_memberships")
        .select("status")
        .eq("organization_id", id)
        .eq("volunteer_id", profile.id)
        .maybeSingle(),
      supabase
        .from("volunteer_opportunities")
        .select("*, organizations(*)")
        .eq("organization_id", id)
        .eq("status", "published")
        .gte("date", today)
        .order("date", { ascending: true }),
      supabase
        .from("bookings")
        .select("id, opportunity_id, volunteer_id, status, volunteer_opportunities!inner(*, organizations(*))")
        .eq("volunteer_id", profile.id)
        .in("status", ["pending", "approved"])
        .eq("volunteer_opportunities.organization_id", id),
      adminClient
        .from("volunteer_opportunities")
        .select("id", { count: "exact", head: true })
        .eq("organization_id", id)
        .eq("status", "published")
        .gte("date", today),
    ]);

  if (!organization) notFound();

  const organizationRecord = organization as Organization;
  const membershipStatus = membership?.status as MembershipStatus | undefined;
  const organizationVisibility = organizationRecord.visibility ?? "public";
  const canViewOpportunities =
    organizationVisibility === "public" || membershipStatus === "accepted";
  const registeredOpportunityRows = (userActiveBookings ?? [])
    .map((booking) =>
      Array.isArray(booking.volunteer_opportunities)
        ? booking.volunteer_opportunities[0]
        : booking.volunteer_opportunities
    )
    .filter(
      (opportunity): opportunity is VolunteerOpportunityWithOrganization =>
        Boolean(opportunity) && opportunity.status === "published"
    );
  const opportunityRowsById = new Map<string, VolunteerOpportunityWithOrganization>();

  for (const opportunity of [
    ...((opportunities ?? []) as VolunteerOpportunityWithOrganization[]),
    ...registeredOpportunityRows,
  ]) {
    opportunityRowsById.set(opportunity.id, opportunity);
  }

  const userRegisteredOpportunityIds = new Set(
    (userActiveBookings ?? []).map((booking) => booking.opportunity_id)
  );
  const visibleOpportunities = Array.from(opportunityRowsById.values()).filter(
    (opportunity) => {
      const isUserRegistered = userRegisteredOpportunityIds.has(opportunity.id);

      if (isUserRegistered) return true;
      if (!canViewOpportunities) return false;
      return !isOpportunityPast(opportunity);
    }
  );
  const opportunityIds = visibleOpportunities.map((opportunity) => opportunity.id);
  const [{ data: approvedBookings }, { data: userVisibleBookings }] =
    opportunityIds.length
      ? await Promise.all([
          adminClient
            .from("bookings")
            .select("id, opportunity_id, status")
            .in("opportunity_id", opportunityIds)
            .eq("status", "approved"),
          supabase
            .from("bookings")
            .select("id, opportunity_id, status, volunteer_id")
            .in("opportunity_id", opportunityIds)
            .eq("volunteer_id", profile.id)
            .in("status", ["pending", "approved"]),
        ])
      : [{ data: [] }, { data: [] }];
  const approvedCounts: Record<string, number> = {};
  const userBookingOpportunityIds: string[] = [];
  const userBookingStatuses: Record<string, BookingStatus> = {};
  const userBookingIds: Record<string, string> = {};

  for (const booking of approvedBookings ?? []) {
    approvedCounts[booking.opportunity_id] =
      (approvedCounts[booking.opportunity_id] ?? 0) + 1;
  }

  for (const booking of userVisibleBookings ?? []) {
    userBookingOpportunityIds.push(booking.opportunity_id);
    userBookingStatuses[booking.opportunity_id] =
      booking.status as BookingStatus;
    userBookingIds[booking.opportunity_id] = booking.id;
  }

  return (
    <div>
      <section className="space-y-4">
        <OrganizationProfile
          organization={organizationRecord}
          membershipStatus={membershipStatus}
        />

        <Card className="border-slate-200 bg-white">
          <CardContent className="p-5">
            <div className="mb-4 flex items-center gap-2">
              <Calendar className="size-5 text-emerald-800" />
              <h2 className="font-semibold text-slate-950">
                Available Opportunities ({upcomingOpportunityCount ?? 0})
              </h2>
            </div>

            {visibleOpportunities.length === 0 ? (
              <p className="rounded-lg border border-dashed border-slate-300 bg-slate-50/70 px-4 py-8 text-center text-sm text-slate-500">
                {canViewOpportunities
                  ? "No upcoming opportunities from this organization."
                  : `Join ${organizationRecord.name} to view available opportunities.`}
              </p>
            ) : (
              <OrganizationOpportunityCalendar
                opportunities={visibleOpportunities}
                approvedCounts={approvedCounts}
                userBookingOpportunityIds={userBookingOpportunityIds}
                userBookingStatuses={userBookingStatuses}
                userBookingIds={userBookingIds}
              />
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
