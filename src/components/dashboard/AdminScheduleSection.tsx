"use client";

import Link from "next/link";
import { Plus } from "lucide-react";
import { AdminCalendar } from "@/components/calendar/AdminCalendar";
import { OpportunityTable } from "@/components/opportunities/OpportunityTable";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { VolunteerOpportunity } from "@/types/database";

type AdminScheduleOpportunity = VolunteerOpportunity & {
  approved_count: number;
  pending_count: number;
};

interface AdminScheduleSectionProps {
  opportunities: AdminScheduleOpportunity[];
  registeredCounts: Record<string, number>;
}

export function AdminScheduleSection({
  opportunities,
  registeredCounts,
}: AdminScheduleSectionProps) {
  return (
    <section className="mt-6">
      <Tabs defaultValue="calendar">
        <div className="mb-4 rounded-lg border border-slate-200 bg-white p-3 shadow-sm shadow-slate-950/5">
          <div className="grid gap-3 sm:grid-cols-[auto_1fr_auto] sm:items-end">
            <div className="space-y-1">
              <span className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
                View
              </span>
              <TabsList className="!h-10 max-w-full overflow-x-auto rounded-lg border border-slate-200 bg-slate-50">
                <TabsTrigger className="px-3" value="calendar">
                  Calendar
                </TabsTrigger>
                <TabsTrigger className="px-3" value="list">
                  List
                </TabsTrigger>
              </TabsList>
            </div>

            <div className="hidden sm:block" />

            <Button asChild>
              <Link href="/admin/opportunities/new">
                <Plus className="size-4" />
                Create Opportunity
              </Link>
            </Button>
          </div>
        </div>

        <TabsContent value="calendar">
          <AdminCalendar opportunities={opportunities} />
        </TabsContent>

        <TabsContent value="list">
          <OpportunityTable
            opportunities={opportunities}
            registeredCounts={registeredCounts}
          />
        </TabsContent>
      </Tabs>
    </section>
  );
}
