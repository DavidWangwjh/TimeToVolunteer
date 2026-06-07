import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireActiveVolunteer } from "@/lib/auth";
import { VolunteerExplore } from "@/components/explore/VolunteerExplore";
import { inferOrganizationCategory } from "@/lib/organization-display";
import type {
  BookingStatus,
  MembershipStatus,
  Organization,
  VolunteerOpportunityWithOrganization,
} from "@/types/database";

type OrganizationRow = Organization & {
  category?: string | null;
  image_url?: string | null;
};

function normalizeOrganization(
  organization: Organization | Organization[] | null | undefined
) {
  if (Array.isArray(organization)) return organization[0] ?? null;
  return organization ?? null;
}

function getVolunteerInterests(profile: unknown) {
  const interests = (profile as { interests?: unknown }).interests;
  return Array.isArray(interests)
    ? interests.filter((interest): interest is string => typeof interest === "string")
    : [];
}

function getMatchScore(category: string, interests: string[]) {
  if (interests.length === 0) return 1;
  return interests.some(
    (interest) => interest.toLowerCase() === category.toLowerCase()
  )
    ? 20
    : 1;
}

export default async function VolunteerExplorePage() {
  const profile = await requireActiveVolunteer();
  const supabase = await createClient();
  const adminClient = createAdminClient();
  const today = new Date().toISOString().split("T")[0];

  const [
    { data: organizations },
    { data: memberships },
    { data: opportunities },
    { data: allUpcomingOpportunities },
  ] = await Promise.all([
    supabase
      .from("organizations")
      .select("*")
      .eq("status", "active")
      .order("name", { ascending: true }),
    supabase
      .from("organization_memberships")
      .select("organization_id, status")
      .eq("volunteer_id", profile.id),
    supabase
      .from("volunteer_opportunities")
      .select("*, organizations(*)")
      .eq("status", "published")
      .gte("date", today)
      .order("date", { ascending: true }),
    adminClient
      .from("volunteer_opportunities")
      .select("id, organization_id")
      .eq("status", "published")
      .gte("date", today),
  ]);

  const interests = getVolunteerInterests(profile);
  const membershipByOrganization = new Map<string, MembershipStatus>();

  for (const membership of memberships ?? []) {
    membershipByOrganization.set(
      membership.organization_id,
      membership.status as MembershipStatus
    );
  }

  const opportunityRows = (opportunities ??
    []) as VolunteerOpportunityWithOrganization[];

  const visibleOpportunities = opportunityRows.filter((opportunity) => {
    const organization = normalizeOrganization(opportunity.organizations);

    if (!organization) return true;
    if (organization.visibility !== "private") return true;

    return membershipByOrganization.get(organization.id) === "accepted";
  });

  const visibleOpportunityIds = visibleOpportunities.map(
    (opportunity) => opportunity.id
  );

  const { data: bookings } = visibleOpportunityIds.length
    ? await supabase
        .from("bookings")
        .select("id, opportunity_id, volunteer_id, status")
        .in("opportunity_id", visibleOpportunityIds)
    : { data: [] };

  const approvedCounts: Record<string, number> = {};
  const userBookingOpportunityIds: string[] = [];
  const userBookingStatuses: Record<string, BookingStatus> = {};
  const userBookingIds: Record<string, string> = {};

  for (const booking of bookings ?? []) {
    if (booking.status === "approved") {
      approvedCounts[booking.opportunity_id] =
        (approvedCounts[booking.opportunity_id] ?? 0) + 1;
    }

    if (
      booking.volunteer_id === profile.id &&
      ["pending", "approved"].includes(booking.status)
    ) {
      userBookingOpportunityIds.push(booking.opportunity_id);
      userBookingStatuses[booking.opportunity_id] = booking.status as BookingStatus;
      userBookingIds[booking.opportunity_id] = booking.id;
    }
  }

  const upcomingOpportunityCountByOrganization = new Map<string, number>();

  for (const opportunity of allUpcomingOpportunities ?? []) {
    if (!opportunity.organization_id) continue;
    upcomingOpportunityCountByOrganization.set(
      opportunity.organization_id,
      (upcomingOpportunityCountByOrganization.get(opportunity.organization_id) ??
        0) + 1
    );
  }

  const organizationItems = ((organizations ?? []) as OrganizationRow[]).map(
    (organization) => {
      const category = inferOrganizationCategory(
        organization.category,
        organization.description,
        organization.name
      );
      const membershipStatus = membershipByOrganization.get(organization.id);
      const opportunityCount =
        upcomingOpportunityCountByOrganization.get(organization.id) ?? 0;
      const score =
        getMatchScore(category, interests) + opportunityCount * 2;

      return {
        kind: "organization" as const,
        id: organization.id,
        name: organization.name,
        description: organization.description,
        category,
        imageUrl: organization.image_url,
        visibility: organization.visibility,
        membershipStatus,
        opportunityCount,
        score,
      };
    }
  );

  const opportunityItems = visibleOpportunities.map((opportunity) => {
    const organization = normalizeOrganization(opportunity.organizations);
    const category = inferOrganizationCategory(
      organization?.category,
      organization?.description,
      organization?.name,
      opportunity.title,
      opportunity.description
    );
    const bookingStatus = userBookingStatuses[opportunity.id];
    const soonBoost = Math.max(
      0,
      12 -
        Math.floor(
          (new Date(opportunity.date).getTime() - new Date(today).getTime()) /
            86_400_000
        )
    );

    return {
      ...opportunity,
      kind: "opportunity" as const,
      organizations: organization,
      category,
      score:
        getMatchScore(category, interests) +
        soonBoost +
        (bookingStatus === "approved" ? 4 : 0) +
        (bookingStatus === "pending" ? 2 : 0),
    };
  });

  return (
    <VolunteerExplore
      items={[...organizationItems, ...opportunityItems]}
      approvedCounts={approvedCounts}
      userBookingOpportunityIds={userBookingOpportunityIds}
      userBookingStatuses={userBookingStatuses}
      userBookingIds={userBookingIds}
    />
  );
}
