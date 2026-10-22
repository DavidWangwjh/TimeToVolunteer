"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, CalendarDays, MapPin, Users } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { formatDate, formatTime, getOpportunityLifecycle, type OpportunityCategory } from "@/lib/dates";
import type { VolunteerOpportunity } from "@/types/database";

type Opportunity = VolunteerOpportunity & { approved_count: number; pending_count: number; organizations?: { id: string; name: string } | null };

const categories = [
  { value: "active", label: "Active" },
  { value: "draft", label: "Drafts" },
  { value: "past", label: "Past" },
  { value: "cancelled", label: "Cancelled" },
] as const;

export function OrganizationOpportunities({ opportunities, initialNow, editBasePath = "/dashboard/organization/opportunities" }: { opportunities: Opportunity[]; initialNow: string; editBasePath?: string }) {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<OpportunityCategory>("active");
  const [now, setNow] = useState(() => new Date(initialNow));
  useEffect(() => {
    const update = () => setNow(new Date());
    const timer = window.setInterval(update, 1000);
    window.addEventListener("focus", update);
    return () => { window.clearInterval(timer); window.removeEventListener("focus", update); };
  }, []);
  const [sort, setSort] = useState("date-asc");
  const query = search.trim().toLowerCase();
  const categorized = opportunities.map((opportunity) => ({ ...opportunity, ...getOpportunityLifecycle(opportunity, now) }));
  const counts = categorized.reduce<Record<OpportunityCategory, number>>((counts, opportunity) => {
    counts[opportunity.category] += 1;
    return counts;
  }, { active: 0, draft: 0, past: 0, cancelled: 0 });
  const visible = categorized.filter((opportunity) =>
    opportunity.category === category &&
    `${opportunity.title} ${opportunity.location} ${opportunity.description ?? ""} ${opportunity.organizations?.name ?? ""}`.toLowerCase().includes(query)
  ).sort((a, b) => {
    const chronological = `${a.date}T${a.start_time}`.localeCompare(`${b.date}T${b.start_time}`);
    if (sort === "title") return a.title.localeCompare(b.title) || chronological;
    if (sort === "pending") return b.pending_count - a.pending_count || chronological;
    return (sort === "date-desc" ? -chronological : chronological) || a.title.localeCompare(b.title);
  });
  const selectClass = "h-10 w-full rounded-md border border-input bg-white px-3 text-sm";

  return (
    <div className="space-y-5">
      <nav aria-label="Opportunity categories" className="flex gap-2 overflow-x-auto border-b border-slate-200 pb-3">
        {categories.map(({ value, label }) => (
          <button key={value} type="button" aria-pressed={category === value} onClick={() => setCategory(value)}
            className={`shrink-0 rounded-lg px-5 py-3 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-emerald-700 ${category === value ? "bg-emerald-800 text-white shadow-sm" : "bg-white text-slate-600 hover:bg-emerald-50 hover:text-emerald-900"}`}>
            {label} ({counts[value]})
          </button>
        ))}
      </nav>
      <div className="grid gap-4 rounded-lg border bg-white p-4 sm:grid-cols-[1fr_auto]">
        <label className="space-y-2 text-sm font-medium">Search opportunities
          <Input className="mt-2" placeholder="Search by title, location, or description" value={search} onChange={(event) => setSearch(event.target.value)} />
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
      <p className="text-sm text-slate-500" aria-live="polite">{visible.length} of {counts[category]} {category} opportunities</p>
      {visible.length === 0 ? (
        <div className="rounded-lg border border-dashed bg-white p-10 text-center">
          <p className="font-semibold">{opportunities.length ? "No matching opportunities" : "Create your first opportunity"}</p>
          <p className="mt-2 text-sm text-slate-500">{opportunities.length ? "Try another search or category." : "Use Create Opportunity to start welcoming volunteers."}</p>
          {search && <Button variant="outline" className="mt-4" onClick={() => setSearch("")}>Clear search</Button>}
        </div>
      ) : (
        <ul className="space-y-3">
          {visible.map((opportunity) => (
            <li key={opportunity.id}>
              <Link href={`${editBasePath}/${opportunity.id}/edit`} className={`group flex flex-col gap-4 rounded-lg border p-5 shadow-sm transition-colors hover:border-emerald-400 focus-visible:outline-2 focus-visible:outline-emerald-700 sm:flex-row sm:items-center sm:justify-between ${opportunity.ongoing ? "border-emerald-400 bg-emerald-50 ring-1 ring-emerald-200" : "border-slate-200 bg-white"}`}>
                <div className="min-w-0 space-y-3">
                  <div className="flex flex-wrap items-center gap-3"><h2 className="break-words text-lg font-semibold text-slate-950">{opportunity.title}</h2>{opportunity.ongoing && <span className="inline-flex items-center gap-2 rounded-full bg-emerald-800 px-3 py-1 text-xs font-semibold text-white"><span className="size-2 rounded-full bg-emerald-300" />Ongoing</span>}</div>
                  {opportunity.organizations && <p className="text-sm font-medium text-emerald-800">{opportunity.organizations.name}</p>}
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
