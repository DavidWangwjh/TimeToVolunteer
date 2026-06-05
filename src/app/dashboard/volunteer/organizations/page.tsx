import { createClient } from "@/lib/supabase/server";
import { requireActiveVolunteer } from "@/lib/auth";
import { JoinedOrganizations } from "@/components/organizations/JoinedOrganizations";
import { inferOrganizationCategory } from "@/lib/organization-display";
import type { Organization } from "@/types/database";

export default async function JoinedOrganizationsPage() {
  const profile = await requireActiveVolunteer();
  const supabase = await createClient();

  const [{ data: memberships }, { data: opportunities }] = await Promise.all([
    supabase
      .from("organization_memberships")
      .select("organizations(*)")
      .eq("volunteer_id", profile.id)
      .eq("status", "accepted"),
    supabase
      .from("volunteer_opportunities")
      .select("id, organization_id")
      .eq("status", "published"),
  ]);

  const opportunityCounts = new Map<string, number>();
  for (const opportunity of opportunities ?? []) {
    if (!opportunity.organization_id) continue;
    opportunityCounts.set(
      opportunity.organization_id,
      (opportunityCounts.get(opportunity.organization_id) ?? 0) + 1
    );
  }

  const organizations = (memberships ?? [])
    .map((membership) =>
      Array.isArray(membership.organizations)
        ? membership.organizations[0]
        : membership.organizations
    )
    .filter((organization): organization is Organization => Boolean(organization))
    .map((organization) => ({
      id: organization.id,
      name: organization.name,
      description: organization.description,
      category: inferOrganizationCategory(
        organization.category,
        organization.description,
        organization.name
      ),
      imageUrl: organization.image_url,
      visibility: organization.visibility,
      membershipStatus: "accepted" as const,
      opportunityCount: opportunityCounts.get(organization.id) ?? 0,
    }))
    .sort((a, b) => a.name.localeCompare(b.name));

  return <JoinedOrganizations organizations={organizations} />;
}
