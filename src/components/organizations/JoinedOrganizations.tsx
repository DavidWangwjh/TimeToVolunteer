"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { OrganizationCard } from "@/components/organizations/OrganizationCard";
import { inferOrganizationCategory } from "@/lib/organization-display";
import type { MembershipStatus, OrganizationVisibility } from "@/types/database";

interface JoinedOrganization {
  id: string;
  name: string;
  description: string | null;
  category?: string | null;
  imageUrl?: string | null;
  visibility: OrganizationVisibility;
  membershipStatus?: MembershipStatus;
  opportunityCount: number;
}

export function JoinedOrganizations({
  organizations,
}: {
  organizations: JoinedOrganization[];
}) {
  const [query, setQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [visibilityFilter, setVisibilityFilter] = useState("all");

  const categories = useMemo(
    () =>
      Array.from(
        new Set(
          organizations.map((organization) =>
            inferOrganizationCategory(
              organization.category,
              organization.description,
              organization.name
            )
          )
        )
      ).sort(),
    [organizations]
  );

  const filteredOrganizations = organizations.filter((organization) => {
    const category = inferOrganizationCategory(
      organization.category,
      organization.description,
      organization.name
    );
    const normalizedQuery = query.trim().toLowerCase();
    const matchesSearch =
      !normalizedQuery ||
      [organization.name, organization.description, category]
        .join(" ")
        .toLowerCase()
        .includes(normalizedQuery);
    const matchesCategory =
      categoryFilter === "all" || category === categoryFilter;
    const matchesVisibility =
      visibilityFilter === "all" || organization.visibility === visibilityFilter;

    return matchesSearch && matchesCategory && matchesVisibility;
  });

  return (
    <div className="space-y-4">
      <div className="grid gap-3 rounded-lg border border-slate-200 bg-white p-3 shadow-sm shadow-slate-950/5 lg:grid-cols-[1fr_220px_180px]">
        <label className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
          <Search className="size-4 text-slate-500" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search joined organizations"
            className="h-6 border-0 bg-transparent p-0 shadow-none focus-visible:ring-0"
          />
        </label>
        <select
          value={categoryFilter}
          onChange={(event) => setCategoryFilter(event.target.value)}
          className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-800 outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100"
        >
          <option value="all">All categories</option>
          {categories.map((category) => (
            <option key={category} value={category}>
              {category}
            </option>
          ))}
        </select>
        <select
          value={visibilityFilter}
          onChange={(event) => setVisibilityFilter(event.target.value)}
          className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-800 outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100"
        >
          <option value="all">All access</option>
          <option value="public">Public</option>
          <option value="private">Private</option>
        </select>
      </div>

      {filteredOrganizations.length === 0 ? (
        <div className="rounded-lg border border-dashed border-slate-300 bg-white/70 py-12 text-center text-sm text-slate-500">
          No joined organizations match these filters.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:auto-rows-[260px] md:grid-cols-2 xl:grid-cols-3">
          {filteredOrganizations.map((organization) => (
            <OrganizationCard
              key={organization.id}
              organization={organization}
              href={`/dashboard/volunteer/organizations/${organization.id}`}
              showAction={false}
            />
          ))}
        </div>
      )}
    </div>
  );
}
