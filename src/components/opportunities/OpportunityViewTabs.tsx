"use client";

import { useState } from "react";
import { AdminCalendar } from "@/components/calendar/AdminCalendar";
import { CalendarListTabs } from "@/components/calendar/CalendarListTabs";
import { OpportunityTable } from "@/components/opportunities/OpportunityTable";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import type { VolunteerOpportunity } from "@/types/database";

type OpportunityView = "calendar" | "list";

type OpportunityWithCounts = VolunteerOpportunity & {
  approved_count: number;
  pending_count: number;
};

interface OpportunityViewTabsProps {
  opportunities: OpportunityWithCounts[];
  registeredCounts: Record<string, number>;
  basePath: string;
}

export function OpportunityViewTabs({
  opportunities,
  registeredCounts,
  basePath,
}: OpportunityViewTabsProps) {
  const [view, setView] = useState<OpportunityView>("calendar");

  return (
    <Tabs
      value={view}
      onValueChange={(value) => setView(value as OpportunityView)}
    >
      <CalendarListTabs listCount={opportunities.length} />
      <TabsContent value="calendar" className="mt-4">
        <AdminCalendar opportunities={opportunities} editBasePath={basePath} />
      </TabsContent>
      <TabsContent value="list" className="mt-4">
        <OpportunityTable
          opportunities={opportunities}
          registeredCounts={registeredCounts}
          basePath={basePath}
        />
      </TabsContent>
    </Tabs>
  );
}
