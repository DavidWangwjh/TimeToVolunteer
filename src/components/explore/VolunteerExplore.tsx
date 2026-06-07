"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { CalendarDays, MapPin, Search, SlidersHorizontal } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { OpportunityDetailsDialog } from "@/components/calendar/OpportunityDetailsDialog";
import { OrganizationCard } from "@/components/organizations/OrganizationCard";
import { formatDate, formatTime } from "@/lib/dates";
import { inferOrganizationCategory } from "@/lib/organization-display";
import { organizationCategories } from "@/lib/organization-options";
import { cn } from "@/lib/utils";
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
type ExploreView = "organization" | "opportunity";
type MembershipFilter = "joined" | "requested" | "not_joined";
type RegistrationFilter = "registered" | "requested" | "open";
type OpportunityAccessFilter = "open" | "request_required";

interface VolunteerExploreProps {
  items: ExploreItem[];
  approvedCounts: Record<string, number>;
  userBookingOpportunityIds: string[];
  userBookingStatuses: Record<string, BookingStatus>;
  userBookingIds: Record<string, string>;
}

const pageSize = 12;

function toggleValue<T extends string>(values: T[], value: T) {
  return values.includes(value)
    ? values.filter((current) => current !== value)
    : [...values, value];
}

export function VolunteerExplore({
  items,
  approvedCounts,
  userBookingOpportunityIds,
  userBookingStatuses,
  userBookingIds,
}: VolunteerExploreProps) {
  const [query, setQuery] = useState("");
  const [activeView, setActiveView] = useState<ExploreView>("organization");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [categoryFilters, setCategoryFilters] = useState<string[]>([]);
  const [organizationAccessFilters, setOrganizationAccessFilters] = useState<
    OrganizationVisibility[]
  >([]);
  const [membershipFilters, setMembershipFilters] = useState<
    MembershipFilter[]
  >([]);
  const [registrationFilters, setRegistrationFilters] = useState<
    RegistrationFilter[]
  >([]);
  const [opportunityAccessFilters, setOpportunityAccessFilters] = useState<
    OpportunityAccessFilter[]
  >([]);
  const [draftCategoryFilters, setDraftCategoryFilters] = useState<string[]>([]);
  const [draftOrganizationAccessFilters, setDraftOrganizationAccessFilters] =
    useState<OrganizationVisibility[]>([]);
  const [draftMembershipFilters, setDraftMembershipFilters] = useState<
    MembershipFilter[]
  >([]);
  const [draftRegistrationFilters, setDraftRegistrationFilters] = useState<
    RegistrationFilter[]
  >([]);
  const [draftOpportunityAccessFilters, setDraftOpportunityAccessFilters] =
    useState<OpportunityAccessFilter[]>([]);
  const [visibleCount, setVisibleCount] = useState(pageSize);
  const [selectedOpportunity, setSelectedOpportunity] =
    useState<ExploreOpportunity | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);

  const categories = useMemo(
    () => {
      if (activeView === "opportunity") {
        return [...organizationCategories];
      }

      return Array.from(
        new Set(
          items
            .filter((item) => item.kind === "organization")
            .map((item) =>
              inferOrganizationCategory(
                item.category,
                item.description,
                item.name
              )
            )
        )
      ).sort();
    },
    [activeView, items]
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
        const membershipKey: MembershipFilter | undefined =
          item.kind === "organization"
            ? item.membershipStatus === "accepted"
              ? "joined"
              : item.membershipStatus === "pending"
                ? "requested"
                : "not_joined"
            : undefined;
        const registrationKey: RegistrationFilter | undefined =
          item.kind === "opportunity"
            ? bookingStatus === "approved"
              ? "registered"
              : bookingStatus === "pending"
                ? "requested"
                : "open"
            : undefined;
        const opportunityAccessKey: OpportunityAccessFilter | undefined =
          item.kind === "opportunity"
            ? item.visibility === "private"
              ? "request_required"
              : "open"
            : undefined;

        const matchesQuery =
          !normalizedQuery || text.toLowerCase().includes(normalizedQuery);
        const matchesType = item.kind === activeView;
        const matchesCategory =
          categoryFilters.length === 0 || categoryFilters.includes(category);
        const matchesOrganizationAccess =
          item.kind !== "organization" ||
          organizationAccessFilters.length === 0 ||
          organizationAccessFilters.includes(item.visibility);
        const matchesMembership =
          item.kind !== "organization" ||
          membershipFilters.length === 0 ||
          membershipFilters.includes(membershipKey!);
        const matchesRegistration =
          item.kind !== "opportunity" ||
          registrationFilters.length === 0 ||
          registrationFilters.includes(registrationKey!);
        const matchesOpportunityAccess =
          item.kind !== "opportunity" ||
          opportunityAccessFilters.length === 0 ||
          opportunityAccessFilters.includes(opportunityAccessKey!);

        return (
          matchesQuery &&
          matchesType &&
          matchesCategory &&
          matchesOrganizationAccess &&
          matchesMembership &&
          matchesRegistration &&
          matchesOpportunityAccess
        );
      })
      .sort((a, b) => b.score - a.score);
  }, [
    activeView,
    categoryFilters,
    items,
    membershipFilters,
    opportunityAccessFilters,
    organizationAccessFilters,
    query,
    registrationFilters,
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
  const activeFilterCount =
    categoryFilters.length +
    (activeView === "organization"
      ? organizationAccessFilters.length + membershipFilters.length
      : registrationFilters.length + opportunityAccessFilters.length);

  function setView(view: ExploreView) {
    setVisibleCount(pageSize);
    setActiveView(view);
  }

  function openFilters() {
    setDraftCategoryFilters(categoryFilters);
    setDraftOrganizationAccessFilters(organizationAccessFilters);
    setDraftMembershipFilters(membershipFilters);
    setDraftRegistrationFilters(registrationFilters);
    setDraftOpportunityAccessFilters(opportunityAccessFilters);
    setFiltersOpen(true);
  }

  function applyFilters() {
    setVisibleCount(pageSize);
    setCategoryFilters(draftCategoryFilters);
    setOrganizationAccessFilters(draftOrganizationAccessFilters);
    setMembershipFilters(draftMembershipFilters);
    setRegistrationFilters(draftRegistrationFilters);
    setOpportunityAccessFilters(draftOpportunityAccessFilters);
    setFiltersOpen(false);
  }

  function clearDraftFilters() {
    setDraftCategoryFilters([]);
    setDraftOrganizationAccessFilters([]);
    setDraftMembershipFilters([]);
    setDraftRegistrationFilters([]);
    setDraftOpportunityAccessFilters([]);
  }

  return (
    <div className="space-y-4">
      <div className="grid items-center gap-3 rounded-lg border border-slate-200 bg-white p-3 shadow-sm shadow-slate-950/5 lg:grid-cols-[1fr_auto_auto]">
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
        <div className="flex h-10 rounded-lg border border-slate-200 bg-slate-50 p-1">
          {(["organization", "opportunity"] as const).map((view) => (
            <button
              key={view}
              type="button"
              onClick={() => setView(view)}
              className={cn(
                "rounded-md px-3 text-sm font-semibold transition",
                activeView === view
                  ? "bg-white text-slate-950 shadow-sm"
                  : "text-slate-500 hover:text-slate-900"
              )}
            >
              {view === "organization" ? "Organizations" : "Opportunities"}
            </button>
          ))}
        </div>
        <Button
          type="button"
          variant="outline"
          className="h-10 justify-center"
          onClick={openFilters}
        >
          <SlidersHorizontal className="size-4" />
          Filters{activeFilterCount > 0 ? ` (${activeFilterCount})` : ""}
        </Button>
      </div>

      <Dialog open={filtersOpen} onOpenChange={setFiltersOpen}>
        <DialogContent className="max-h-[min(34rem,calc(100dvh-2rem))] grid-rows-[auto_minmax(0,1fr)_auto] sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {activeView === "organization"
                ? "Organization filters"
                : "Opportunity filters"}
            </DialogTitle>
          </DialogHeader>
          <div className="-mx-1 min-h-0 space-y-5 overflow-y-auto px-1 pr-2">
            <FilterGroup
              title="Category"
              options={categories.map((category) => ({
                label: category,
                value: category,
              }))}
              selected={draftCategoryFilters}
              onToggle={(category) =>
                setDraftCategoryFilters((current) =>
                  toggleValue(current, category)
                )
              }
            />

            {activeView === "organization" ? (
              <>
                <FilterGroup
                  title="Access"
                  options={[
                    { label: "Public", value: "public" },
                    { label: "Private", value: "private" },
                  ]}
                  selected={draftOrganizationAccessFilters}
                  onToggle={(value) => {
                    setDraftOrganizationAccessFilters((current) =>
                      toggleValue(current, value)
                    );
                  }}
                />
                <FilterGroup
                  title="Membership"
                  options={[
                    { label: "Joined", value: "joined" },
                    { label: "Requested", value: "requested" },
                    { label: "Not joined", value: "not_joined" },
                  ]}
                  selected={draftMembershipFilters}
                  onToggle={(value) => {
                    setDraftMembershipFilters((current) =>
                      toggleValue(current, value)
                    );
                  }}
                />
              </>
            ) : (
              <>
                <FilterGroup
                  title="Registration"
                  options={[
                    { label: "Open", value: "open" },
                    { label: "Registered", value: "registered" },
                    { label: "Requested", value: "requested" },
                  ]}
                  selected={draftRegistrationFilters}
                  onToggle={(value) => {
                    setDraftRegistrationFilters((current) =>
                      toggleValue(current, value)
                    );
                  }}
                />
                <FilterGroup
                  title="Signup"
                  options={[
                    { label: "Register directly", value: "open" },
                    { label: "Request required", value: "request_required" },
                  ]}
                  selected={draftOpportunityAccessFilters}
                  onToggle={(value) => {
                    setDraftOpportunityAccessFilters((current) =>
                      toggleValue(current, value)
                    );
                  }}
                />
              </>
            )}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={clearDraftFilters}>
              Clear filters
            </Button>
            <Button type="button" onClick={applyFilters}>
              Apply
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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

function FilterGroup<T extends string>({
  title,
  options,
  selected,
  onToggle,
}: {
  title: string;
  options: Array<{ label: string; value: T }>;
  selected: T[];
  onToggle: (value: T) => void;
}) {
  if (options.length === 0) {
    return null;
  }

  return (
    <fieldset className="space-y-2">
      <legend className="text-sm font-semibold text-slate-950">{title}</legend>
      <div className="grid gap-2">
        {options.map((option) => {
          const checked = selected.includes(option.value);

          return (
            <label
              key={option.value}
              className="flex cursor-pointer items-center gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:border-emerald-200 hover:bg-emerald-50/40"
            >
              <Checkbox
                checked={checked}
                onCheckedChange={() => onToggle(option.value)}
              />
              {option.label}
            </label>
          );
        })}
      </div>
    </fieldset>
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
