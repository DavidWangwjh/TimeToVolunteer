"use client";

import Link from "next/link";
import { Plus } from "lucide-react";
import { AdminCalendar } from "@/components/calendar/AdminCalendar";
import { OpportunityTable } from "@/components/opportunities/OpportunityTable";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import type { Organization, VolunteerOpportunity } from "@/types/database";

type AdminScheduleOpportunity = VolunteerOpportunity & {
  approved_count: number;
  pending_count: number;
  organizations?: Pick<Organization, "id" | "name"> | null;
};

interface AdminScheduleSectionProps {
  opportunities: AdminScheduleOpportunity[];
  registeredCounts: Record<string, number>;
  createHref?: string;
  editBasePath?: string;
  showFilters?: boolean;
  showCreateButton?: boolean;
  currentOrganization?: string;
  currentStatus?: string;
}

export function AdminScheduleSection({
  opportunities,
  registeredCounts,
  createHref = "/dashboard/admin/opportunities/new",
  editBasePath = "/dashboard/admin/opportunities",
  showFilters = true,
  showCreateButton = true,
  currentOrganization = "all",
  currentStatus = "all",
}: AdminScheduleSectionProps) {
  const organizations = Array.from(
    new Map(
      opportunities
        .map((opportunity) => opportunity.organizations)
        .filter((organization): organization is Pick<Organization, "id" | "name"> =>
          Boolean(organization?.id)
        )
        .map((organization) => [organization.id, organization])
    ).values()
  ).sort((a, b) => a.name.localeCompare(b.name));

  return (
    <section className="mt-6">
      <Tabs defaultValue="calendar">
        <div className="mb-4 rounded-lg border border-slate-200 bg-white p-3 shadow-sm shadow-slate-950/5">
          <div
            className={cn(
              "grid gap-3 lg:items-end",
              showCreateButton
                ? "lg:grid-cols-[auto_1fr_1fr_auto]"
                : "lg:grid-cols-[auto_1fr_1fr]"
            )}
          >
            <div className="space-y-1">
              <span className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
                View
              </span>
              <TabsList className="!h-10 w-40 overflow-hidden rounded-lg border border-slate-200 bg-slate-50">
                <TabsTrigger className="min-w-0 px-3" value="calendar">
                  Calendar
                </TabsTrigger>
                <TabsTrigger className="min-w-0 px-3" value="list">
                  List
                </TabsTrigger>
              </TabsList>
            </div>

            {showFilters ? (
              <>
                <label className="space-y-1">
                  <span className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Organization
                  </span>
                  <select
                    className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 shadow-sm outline-none transition-colors focus:border-emerald-500"
                    onChange={(event) => {
                      const value = event.currentTarget.value;
                      const url = new URL(window.location.href);
                      if (value === "all") url.searchParams.delete("org");
                      else url.searchParams.set("org", value);
                      window.location.href = url.toString();
                    }}
                    defaultValue={currentOrganization}
                  >
                    <option value="all">All organizations</option>
                    {organizations.map((organization) => (
                      <option key={organization.id} value={organization.id}>
                        {organization.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="space-y-1">
                  <span className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Status
                  </span>
                  <select
                    className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 shadow-sm outline-none transition-colors focus:border-emerald-500"
                    onChange={(event) => {
                      const value = event.currentTarget.value;
                      const url = new URL(window.location.href);
                      if (value === "all") url.searchParams.delete("status");
                      else url.searchParams.set("status", value);
                      window.location.href = url.toString();
                    }}
                    defaultValue={currentStatus}
                  >
                    <option value="all">All statuses</option>
                    <option value="published">Published</option>
                    <option value="draft">Draft</option>
                    <option value="cancelled">Cancelled</option>
                    <option value="completed">Completed</option>
                  </select>
                </label>
              </>
            ) : (
              <div className="hidden lg:block lg:col-span-2" />
            )}

            {showCreateButton && (
              <Button asChild>
                <Link href={createHref}>
                  <Plus className="size-4" />
                  Create Opportunity
                </Link>
              </Button>
            )}
          </div>
        </div>

        <TabsContent value="calendar">
          <AdminCalendar opportunities={opportunities} editBasePath={editBasePath} />
        </TabsContent>

        <TabsContent value="list">
          <OpportunityTable
            opportunities={opportunities}
            registeredCounts={registeredCounts}
            basePath={editBasePath}
          />
        </TabsContent>
      </Tabs>
    </section>
  );
}
