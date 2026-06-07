"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { CalendarDays, MapPin, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { OpportunityDetailsDialog } from "@/components/calendar/OpportunityDetailsDialog";
import { OrganizationCard } from "@/components/organizations/OrganizationCard";
import { formatDate, formatTime } from "@/lib/dates";
import { inferOrganizationCategory } from "@/lib/organization-display";
import type {
  BookingStatus,
  MembershipStatus,
  OrganizationVisibility,
  VolunteerOpportunityWithOrganization,
} from "@/types/database";

interface ExploreOrganization {
  kind: "organization";
  id: string;
  name: string;
  description: string | null;
  category?: string | null;
  visibility: OrganizationVisibility;
  imageUrl?: string | null;
  membershipStatus?: MembershipStatus;
  opportunityCount: number;
  score: number;
}

type ExploreOpportunity = VolunteerOpportunityWithOrganization & {
  kind: "opportunity";
  category?: string | null;
  score: number;
};

type ExploreItem = ExploreOrganization | ExploreOpportunity;

interface VolunteerExploreProps {
  items: ExploreItem[];
  approvedCounts: Record<string, number>;
  userBookingOpportunityIds: string[];
  userBookingStatuses: Record<string, BookingStatus>;
  userBookingIds: Record<string, string>;
}

const pageSize = 12;

export function VolunteerExplore({
  items,
  approvedCounts,
  userBookingOpportunityIds,
  userBookingStatuses,
  userBookingIds,
}: VolunteerExploreProps) {
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | "organization" | "opportunity">("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [registrationFilter, setRegistrationFilter] =
    useState<"all" | "registered" | "requested" | "open">("all");
  const [visibleCount, setVisibleCount] = useState(pageSize);
  const [selectedOpportunity, setSelectedOpportunity] =
    useState<ExploreOpportunity | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);

  const categories = useMemo(
    () =>
      Array.from(
        new Set(
          items.map((item) =>
            inferOrganizationCategory(
              item.category,
              item.kind === "organization"
                ? item.description
                : item.organizations?.description,
              item.kind === "organization" ? item.name : item.title
            )
          )
        )
      ).sort(),
    [items]
  );

  const filteredItems = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return items
      .filter((item) => {
        const category = inferOrganizationCategory(
          item.category,
          item.kind === "organization"
            ? item.description
            : item.organizations?.description,
          item.kind === "organization" ? item.name : item.title
        );
        const text =
          item.kind === "organization"
            ? [
                item.name,
                item.description,
                category,
                item.visibility,
                item.membershipStatus,
              ].join(" ")
            : [
                item.title,
                item.description,
                item.location,
                item.organizations?.name,
                category,
              ].join(" ");
        const bookingStatus =
          item.kind === "opportunity" ? userBookingStatuses[item.id] : undefined;

        const matchesQuery =
          !normalizedQuery || text.toLowerCase().includes(normalizedQuery);
        const matchesType = typeFilter === "all" || item.kind === typeFilter;
        const matchesCategory =
          categoryFilter === "all" || category === categoryFilter;
        const matchesRegistration =
          item.kind === "organization" ||
          registrationFilter === "all" ||
          (registrationFilter === "registered" && bookingStatus === "approved") ||
          (registrationFilter === "requested" && bookingStatus === "pending") ||
          (registrationFilter === "open" && !bookingStatus);

        return (
          matchesQuery &&
          matchesType &&
          matchesCategory &&
          matchesRegistration
        );
      })
      .sort((a, b) => b.score - a.score);
  }, [
    categoryFilter,
    items,
    query,
    registrationFilter,
    typeFilter,
    userBookingStatuses,
  ]);

  useEffect(() => {
    const target = loadMoreRef.current;
    if (!target) return;

    const observer = new IntersectionObserver((entries) => {
      if (entries[0]?.isIntersecting) {
        setVisibleCount((current) =>
          Math.min(current + pageSize, filteredItems.length)
        );
      }
    });

    observer.observe(target);
    return () => observer.disconnect();
  }, [filteredItems.length]);

  const visibleItems = filteredItems.slice(0, visibleCount);

  return (
    <div className="space-y-4">
      <div className="grid items-center gap-3 rounded-lg border border-slate-200 bg-white p-3 shadow-sm shadow-slate-950/5 lg:grid-cols-[1fr_170px_220px_180px]">
        <label className="flex h-10 items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3">
          <Search className="size-4 text-slate-500" />
          <Input
            value={query}
            onChange={(event) => {
              setVisibleCount(pageSize);
              setQuery(event.target.value);
            }}
            placeholder="Search organizations and opportunities"
            className="h-full border-0 bg-transparent p-0 shadow-none focus-visible:ring-0"
          />
        </label>
        <select
          value={typeFilter}
          onChange={(event) => {
            setVisibleCount(pageSize);
            setTypeFilter(
              event.target.value as "all" | "organization" | "opportunity"
            );
          }}
          className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-800 outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100"
        >
          <option value="all">Everything</option>
          <option value="organization">Organizations</option>
          <option value="opportunity">Opportunities</option>
        </select>
        <select
          value={categoryFilter}
          onChange={(event) => {
            setVisibleCount(pageSize);
            setCategoryFilter(event.target.value);
          }}
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
          value={registrationFilter}
          onChange={(event) => {
            setVisibleCount(pageSize);
            setRegistrationFilter(
              event.target.value as "all" | "registered" | "requested" | "open"
            );
          }}
          className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-800 outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100"
        >
          <option value="all">All registration</option>
          <option value="open">Open</option>
          <option value="registered">Registered</option>
          <option value="requested">Requested</option>
        </select>
      </div>

      {visibleItems.length === 0 ? (
        <div className="rounded-lg border border-dashed border-slate-300 bg-white/70 py-12 text-center text-sm text-slate-500">
          No organizations or opportunities match these filters.
        </div>
      ) : (
        <div className="grid grid-cols-1 items-stretch gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {visibleItems.map((item) =>
            item.kind === "organization" ? (
              <OrganizationCard
                key={`organization-${item.id}`}
                organization={item}
                href={`/dashboard/volunteer/organizations/${item.id}`}
              />
            ) : (
              <OpportunityExploreCard
                key={`opportunity-${item.id}`}
                opportunity={item}
                approvedCount={approvedCounts[item.id] ?? 0}
                bookingStatus={userBookingStatuses[item.id]}
                onSelect={() => {
                  setSelectedOpportunity(item);
                  setDialogOpen(true);
                }}
              />
            )
          )}
        </div>
      )}

      {visibleCount < filteredItems.length && (
        <div ref={loadMoreRef} className="flex justify-center py-2">
          <Button
            variant="outline"
            onClick={() =>
              setVisibleCount((current) =>
                Math.min(current + pageSize, filteredItems.length)
              )
            }
          >
            Load more
          </Button>
        </div>
      )}

      {selectedOpportunity && (
        <OpportunityDetailsDialog
          opportunity={selectedOpportunity}
          approvedCount={approvedCounts[selectedOpportunity.id] ?? 0}
          hasExistingBooking={userBookingOpportunityIds.includes(
            selectedOpportunity.id
          )}
          existingBookingId={userBookingIds[selectedOpportunity.id]}
          existingBookingStatus={userBookingStatuses[selectedOpportunity.id]}
          open={dialogOpen}
          onOpenChange={setDialogOpen}
        />
      )}
    </div>
  );
}

function OpportunityExploreCard({
  opportunity,
  approvedCount,
  bookingStatus,
  onSelect,
}: {
  opportunity: ExploreOpportunity;
  approvedCount: number;
  bookingStatus?: BookingStatus;
  onSelect: () => void;
}) {
  const category = inferOrganizationCategory(
    opportunity.category,
    opportunity.organizations?.description,
    opportunity.organizations?.name,
    opportunity.title
  );
  const registrationLabel =
    bookingStatus === "approved"
      ? "Registered"
      : bookingStatus === "pending"
      ? "Requested"
      : opportunity.visibility === "private"
      ? "Request required"
      : "Open";

  return (
    <button
      type="button"
      onClick={onSelect}
      className="h-full text-left"
    >
      <Card className="h-full overflow-hidden border-slate-200 bg-white transition hover:-translate-y-0.5 hover:border-emerald-200 hover:shadow-md hover:shadow-slate-950/5">
        <CardContent className="flex h-full min-h-0 flex-col gap-2.5 p-3">
          <div className="rounded-lg border border-blue-100 bg-gradient-to-br from-blue-50 via-white to-emerald-50 p-3">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-blue-800">
                <CalendarDays className="size-4" />
                <span className="text-xs font-bold uppercase tracking-wide">
                  Opportunity
                </span>
              </div>
              <Badge variant="outline" className="bg-white/80">
                {approvedCount}/{opportunity.max_volunteers}
              </Badge>
            </div>
            <div className="mt-5 flex flex-wrap items-end justify-between gap-2">
              <p className="text-sm font-semibold text-slate-700">
                {formatDate(opportunity.date)}
              </p>
              <p className="text-sm font-medium text-slate-600">
                {formatTime(opportunity.start_time)}
              </p>
            </div>
          </div>
          <div>
            <h2 className="line-clamp-2 text-lg font-bold text-slate-950">
              {opportunity.title}
            </h2>
            <p className="mt-1.5 text-sm font-medium text-slate-700">
              {opportunity.organizations?.name ?? "Independent"}
            </p>
            {opportunity.description && (
              <p className="mt-1.5 line-clamp-3 text-sm leading-5 text-slate-600">
                {opportunity.description}
              </p>
            )}
          </div>
          <div className="mt-auto space-y-2">
            <div className="flex items-center gap-2 text-sm text-slate-600">
              <MapPin className="size-4 text-slate-400" />
              <span className="line-clamp-1">{opportunity.location}</span>
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100">
                {category}
              </Badge>
              <Badge variant="outline">{registrationLabel}</Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </button>
  );
}
