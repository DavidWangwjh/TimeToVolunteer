"use client";

import Link from "next/link";
import { useState } from "react";
import { Search, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { OrganizationRequestButton } from "@/components/organizations/OrganizationRequestButton";
import { inferOrganizationCategory } from "@/lib/organization-display";
import type { MembershipStatus, OrganizationVisibility } from "@/types/database";

interface ExploreOrganization {
  id: string;
  name: string;
  description: string | null;
  category?: string | null;
  contact_email: string;
  visibility: OrganizationVisibility;
  membershipStatus?: MembershipStatus;
  opportunityCount: number;
  matchScore: number;
  matchReason: string;
}

export function ExploreOrganizations({
  organizations,
}: {
  organizations: ExploreOrganization[];
}) {
  const [query, setQuery] = useState("");
  const normalizedQuery = query.trim().toLowerCase();
  const filteredOrganizations = organizations.filter((organization) => {
    if (!normalizedQuery) return true;
    return [
      organization.name,
      organization.description ?? "",
      organization.contact_email,
      organization.matchReason,
    ]
      .join(" ")
      .toLowerCase()
      .includes(normalizedQuery);
  });
  const recommended = filteredOrganizations
    .filter(
      (organization) =>
        organization.matchScore > 0 && organization.membershipStatus !== "accepted"
    )
    .slice(0, 3);
  const hasRecommendations = recommended.length > 0 && !normalizedQuery;

  return (
    <div className="space-y-5">
      <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm shadow-slate-950/5">
        <label className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
          <Search className="size-4 text-slate-500" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search by organization, cause, or contact"
            className="h-8 border-0 bg-transparent p-0 shadow-none focus-visible:ring-0"
          />
        </label>
      </div>

      {hasRecommendations && (
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <Sparkles className="size-5 text-emerald-800" />
            <h2 className="text-lg font-semibold text-slate-950">
              Recommended for you
            </h2>
          </div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {recommended.map((organization) => (
              <OrganizationCard key={organization.id} organization={organization} />
            ))}
          </div>
        </section>
      )}

      {normalizedQuery && (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-slate-950">
            Search results
          </h2>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {filteredOrganizations.map((organization) => (
              <OrganizationCard key={organization.id} organization={organization} />
            ))}
          </div>
        </section>
      )}

      {filteredOrganizations.length === 0 && (
        <div className="rounded-lg border border-dashed border-slate-300 bg-white/70 py-12 text-center text-sm text-slate-500">
          No organizations match your search.
        </div>
      )}
    </div>
  );
}

function OrganizationCard({
  organization,
}: {
  organization: ExploreOrganization;
}) {
  const membershipLabel =
    organization.membershipStatus === "accepted"
      ? "You are a member"
      : organization.membershipStatus === "pending"
      ? "Request pending"
      : null;

  return (
    <Card className="border-slate-200 bg-white">
      <CardContent className="flex h-full flex-col gap-3 px-4">
        <div>
          <Link
            href={`/dashboard/volunteer/organizations/${organization.id}`}
            className="text-lg font-bold text-slate-950 hover:text-emerald-800 hover:underline"
          >
            {organization.name}
          </Link>
        </div>

        {organization.description && (
          <p className="text-sm leading-5 text-slate-600">
            {organization.description}
          </p>
        )}

        <div className="flex flex-wrap gap-2">
          <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100">
            {inferOrganizationCategory(
              organization.category,
              organization.description,
              organization.name
            )}
          </Badge>
          <Badge variant="outline">{organization.opportunityCount} opportunities</Badge>
          {membershipLabel && (
            <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100">
              {membershipLabel}
            </Badge>
          )}
        </div>

        <div className="mt-auto flex justify-end pt-1">
          <OrganizationRequestButton
            organizationId={organization.id}
            organizationVisibility={organization.visibility}
            membershipStatus={organization.membershipStatus}
          />
        </div>
      </CardContent>
    </Card>
  );
}
