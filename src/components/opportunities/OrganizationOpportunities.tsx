"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, CalendarDays, MapPin, Users } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/bookings/BookingStatusBadge";
import { formatDate, formatTime } from "@/lib/dates";
import { opportunityStatusLabels } from "@/lib/opportunity-labels";
import type { VolunteerOpportunity } from "@/types/database";

type Opportunity = VolunteerOpportunity & { approved_count: number; pending_count: number };

export function OrganizationOpportunities({ opportunities }: { opportunities: Opportunity[] }) {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [sort, setSort] = useState("date-asc");
  const query = search.trim().toLowerCase();
  const visible = opportunities.filter((opportunity) =>
    (status === "all" || opportunity.status === status) &&
    `${opportunity.title} ${opportunity.location} ${opportunity.description ?? ""}`.toLowerCase().includes(query)
  ).sort((a, b) => {
    const chronological = `${a.date}T${a.start_time}`.localeCompare(`${b.date}T${b.start_time}`);
    if (sort === "title") return a.title.localeCompare(b.title) || chronological;
    if (sort === "pending") return b.pending_count - a.pending_count || chronological;
    return (sort === "date-desc" ? -chronological : chronological) || a.title.localeCompare(b.title);
  });
  const selectClass = "h-10 w-full rounded-md border border-input bg-white px-3 text-sm";

  return (
    <div className="space-y-5">
      <div className="grid gap-4 rounded-lg border bg-white p-4 sm:grid-cols-[1fr_auto_auto]">
        <label className="space-y-2 text-sm font-medium">Search opportunities
          <Input className="mt-2" placeholder="Search by title, location, or description" value={search} onChange={(event) => setSearch(event.target.value)} />
        </label>
        <label className="space-y-2 text-sm font-medium">Status
          <select className={selectClass} value={status} onChange={(event) => setStatus(event.target.value)}>
            <option value="all">All statuses</option>
            {Object.entries(opportunityStatusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </label>
        <label className="space-y-2 text-sm font-medium">Sort by
          <select className={selectClass} value={sort} onChange={(event) => setSort(event.target.value)}>
            <option value="date-asc">Date: earliest first</option>
            <option value="date-desc">Date: latest first</option>
            <option value="title">Title: A–Z</option>
            <option value="pending">Most pending requests</option>
          </select>
        </label>
      </div>
      <p className="text-sm text-slate-500" aria-live="polite">{visible.length} of {opportunities.length} opportunities</p>
      {visible.length === 0 ? (
        <div className="rounded-lg border border-dashed bg-white p-10 text-center">
          <p className="font-semibold">{opportunities.length ? "No matching opportunities" : "Create your first opportunity"}</p>
          <p className="mt-2 text-sm text-slate-500">{opportunities.length ? "Try another search or status." : "Use Create Opportunity to start welcoming volunteers."}</p>
          {opportunities.length > 0 && <Button variant="outline" className="mt-4" onClick={() => { setSearch(""); setStatus("all"); }}>Clear filters</Button>}
        </div>
      ) : (
        <ul className="space-y-3">
          {visible.map((opportunity) => (
            <li key={opportunity.id}>
              <Link href={`/dashboard/organization/opportunities/${opportunity.id}/edit`} className="group flex flex-col gap-4 rounded-lg border border-slate-200 bg-white p-5 shadow-sm transition-colors hover:border-emerald-400 focus-visible:outline-2 focus-visible:outline-emerald-700 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0 space-y-3">
                  <div className="flex flex-wrap items-center gap-3"><h2 className="break-words text-lg font-semibold text-slate-950">{opportunity.title}</h2><StatusBadge status={opportunity.status} /></div>
                  <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-slate-600">
                    <span className="inline-flex items-center gap-2"><CalendarDays className="size-4 shrink-0" />{formatDate(opportunity.date)} · {formatTime(opportunity.start_time)} – {formatTime(opportunity.end_time)}</span>
                    <span className="inline-flex items-center gap-2"><MapPin className="size-4 shrink-0" />{opportunity.location}</span>
                  </div>
                  <div className="flex flex-wrap items-center gap-3 text-sm">
                    <span className="inline-flex items-center gap-2 text-slate-600"><Users className="size-4" />{opportunity.approved_count}/{opportunity.max_volunteers} registered</span>
                    {opportunity.pending_count > 0 && <span className="rounded-full bg-amber-50 px-2.5 py-1 font-semibold text-amber-800">{opportunity.pending_count} pending</span>}
                  </div>
                </div>
                <span className="inline-flex shrink-0 items-center gap-2 text-sm font-semibold text-emerald-800">Manage <ArrowRight className="size-4" /></span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
