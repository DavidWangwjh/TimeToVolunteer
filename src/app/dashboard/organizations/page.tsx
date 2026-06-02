import { createClient } from "@/lib/supabase/server";
import { requireActiveVolunteer } from "@/lib/auth";
import { PageHeader } from "@/components/layout/PageHeader";
import { ExploreOrganizations } from "@/components/organizations/ExploreOrganizations";
import type { MembershipStatus, Organization } from "@/types/database";

function tokenize(value: unknown) {
  return String(value ?? "")
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((token) => token.length >= 4);
}

export default async function ExplorePage() {
  const profile = await requireActiveVolunteer();
  const supabase = await createClient();

  const [
    { data: organizations },
    { data: memberships },
    { data: opportunities },
    {
      data: { user },
    },
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
      .select("id, organization_id, title, description, location")
      .eq("status", "published"),
    supabase.auth.getUser(),
  ]);

  const membershipByOrganization = new Map(
    (memberships ?? []).map((membership) => [
      membership.organization_id,
      membership.status as MembershipStatus,
    ])
  );
  const opportunitiesByOrganization = new Map<string, typeof opportunities>();

  for (const opportunity of opportunities ?? []) {
    if (!opportunity.organization_id) continue;
    opportunitiesByOrganization.set(opportunity.organization_id, [
      ...(opportunitiesByOrganization.get(opportunity.organization_id) ?? []),
      opportunity,
    ]);
  }

  const preferenceTokens = new Set(
    tokenize([
      user?.user_metadata?.volunteer_interests,
      user?.user_metadata?.volunteer_availability,
      user?.user_metadata?.volunteer_goals,
    ].join(" "))
  );

  const exploredOrganizations = ((organizations ?? []) as Organization[])
    .map((organization) => {
      const orgOpportunities =
        opportunitiesByOrganization.get(organization.id) ?? [];
      const searchableText = [
        organization.name,
        organization.description,
        orgOpportunities
          .map((opportunity) =>
            [opportunity.title, opportunity.description, opportunity.location].join(" ")
          )
          .join(" "),
      ].join(" ");
      const organizationTokens = new Set(tokenize(searchableText));
      const matches = [...preferenceTokens].filter((token) =>
        organizationTokens.has(token)
      );
      const acceptedBoost =
        membershipByOrganization.get(organization.id) === "accepted" ? 2 : 0;
      const opportunityBoost = Math.min(orgOpportunities.length, 3);
      const matchScore = matches.length * 3 + acceptedBoost + opportunityBoost;

      return {
        id: organization.id,
        name: organization.name,
        description: organization.description,
        contact_email: organization.contact_email,
        membershipStatus: membershipByOrganization.get(organization.id),
        opportunityCount: orgOpportunities.length,
        matchScore,
        matchReason:
          matches.length > 0
            ? `Matches ${matches.slice(0, 2).join(", ")}`
            : membershipByOrganization.get(organization.id) === "accepted"
            ? "You are a member"
            : "Active opportunities",
      };
    })
    .sort((a, b) => b.matchScore - a.matchScore || a.name.localeCompare(b.name));

  return (
    <div>
      <PageHeader
        title="Explore"
        description="Find organizations that match your interests, search by cause, and request access to private opportunities."
      />

      <ExploreOrganizations organizations={exploredOrganizations} />
    </div>
  );
}
