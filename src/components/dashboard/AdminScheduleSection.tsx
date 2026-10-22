"use client";

import Link from "next/link";
import { useState } from "react";
import { AdminCalendar } from "@/components/calendar/AdminCalendar";
import { OrganizationOpportunities } from "@/components/opportunities/OrganizationOpportunities";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { Organization, VolunteerOpportunity } from "@/types/database";

type Opportunity = VolunteerOpportunity & { approved_count: number; pending_count: number; organizations?: Pick<Organization, "id" | "name"> | null };
interface Props {
  opportunities: Opportunity[];
  registeredCounts: Record<string, number>;
  createHref?: string;
  editBasePath?: string;
  showFilters?: boolean;
  showCreateButton?: boolean;
  currentOrganization?: string;
  currentStatus?: string;
}
export function AdminScheduleSection({ opportunities, createHref = "/dashboard/admin/opportunities/new", editBasePath = "/dashboard/admin/opportunities", showFilters = true, showCreateButton = true, currentOrganization = "all" }: Props) {
  const [organization, setOrganization] = useState(currentOrganization);
  const [initialNow] = useState(() => new Date().toISOString());
  const organizations = Array.from(new Map(opportunities.flatMap(opportunity => opportunity.organizations ? [[opportunity.organizations.id, opportunity.organizations] as const] : [])).values()).sort((a, b) => a.name.localeCompare(b.name));
  const filtered = organization === "all" ? opportunities : opportunities.filter(opportunity => opportunity.organization_id === organization);
  return <section className="space-y-5">
    <Tabs defaultValue="opportunities">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-4">
        <TabsList variant="line"><TabsTrigger value="opportunities">Opportunities</TabsTrigger><TabsTrigger value="calendar">Calendar</TabsTrigger></TabsList>
        <div className="flex flex-wrap items-end gap-3">
          {showFilters && <label className="space-y-2 text-sm font-medium">Organization<select className="block h-10 rounded-md border bg-white px-3" value={organization} onChange={event => setOrganization(event.target.value)}><option value="all">All organizations</option>{organizations.map(org => <option key={org.id} value={org.id}>{org.name}</option>)}</select></label>}
          {showCreateButton && <Button asChild><Link href={createHref}>Create Opportunity</Link></Button>}
        </div>
      </div>
      <TabsContent value="opportunities"><OrganizationOpportunities opportunities={filtered} initialNow={initialNow} editBasePath={editBasePath} /></TabsContent>
      <TabsContent value="calendar"><AdminCalendar opportunities={filtered} editBasePath={editBasePath} /></TabsContent>
    </Tabs>
  </section>;
}
