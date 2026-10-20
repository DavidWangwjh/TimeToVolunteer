"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarDays, MapPin } from "lucide-react";
import { formatDate, formatTime, getOpportunityLifecycle, hasOpportunityStarted } from "@/lib/dates";
import { getVolunteerAttendance, type VolunteerOpportunityBooking } from "@/lib/volunteer-opportunities";
import { VolunteerInvitations } from "@/components/opportunities/VolunteerInvitations";
import { OpportunityDetailsDialog } from "@/components/calendar/OpportunityDetailsDialog";
import { Input } from "@/components/ui/input";

export function MyOpportunities({ bookings, approvedCounts, initialNow }: {
  bookings: VolunteerOpportunityBooking[]; approvedCounts: Record<string, number>; initialNow: string;
}) {
  const router = useRouter();
  const [now, setNow] = useState(() => new Date(initialNow));
  const [category, setCategory] = useState("upcoming");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("date");
  const [selected, setSelected] = useState<VolunteerOpportunityBooking | null>(null);
  useEffect(() => {
    const tick = window.setInterval(() => setNow(new Date()), 1000);
    const refresh = () => router.refresh();
    window.addEventListener("focus", refresh);
    const poll = window.setInterval(refresh, 60000);
    return () => { window.clearInterval(tick); window.clearInterval(poll); window.removeEventListener("focus", refresh); };
  }, [router]);
  const invitations = bookings.filter((booking) => booking.status === "invited").map((booking) => ({
    id: booking.id, opportunity: booking.opportunity,
    canAccept: booking.opportunity.status === "published" && !hasOpportunityStarted(booking.opportunity, now),
  }));
  const registrations = bookings.filter((booking) => booking.status !== "invited" && ["published", "completed"].includes(booking.opportunity.status)).map((booking) => {
    const lifecycle = getOpportunityLifecycle(booking.opportunity, now);
    return { booking, lifecycle, category: lifecycle.category === "past" ? "completed" : "upcoming" };
  }).filter((row) => row.category !== "completed" || row.booking.status !== "pending");
  const visible = registrations.filter((row) => row.category === category &&
    `${row.booking.opportunity.title} ${row.booking.opportunity.organizations?.name ?? ""} ${row.booking.opportunity.location}`.toLowerCase().includes(search.trim().toLowerCase()))
    .sort((a, b) => {
      const x = a.booking.opportunity, y = b.booking.opportunity;
      if (sort === "title") return x.title.localeCompare(y.title);
      const chronological = `${x.date}T${x.start_time}`.localeCompare(`${y.date}T${y.start_time}`);
      return category === "completed" ? -chronological : chronological;
    });
  // Use fresh server props if check-in or registration changes while a dialog is open.
  const selectedBooking = bookings.find((booking) => booking.id === selected?.id);
  return (
    <div className="space-y-6">
      <div><h1 className="text-2xl font-bold">My Opportunities</h1><p className="mt-1 text-sm text-slate-600">Manage your registrations, invitations, and attendance.</p></div>
      <VolunteerInvitations invitations={invitations} />
      <nav aria-label="My opportunity categories" className="flex gap-2 border-b pb-3">
        {[{ value: "upcoming", label: "Upcoming" }, { value: "completed", label: "Completed" }].map(({ value, label }) => (
          <button key={value} type="button" aria-pressed={category === value} onClick={() => setCategory(value)} className={`rounded-lg px-5 py-3 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-emerald-700 ${category === value ? "bg-emerald-800 text-white" : "bg-white text-slate-600"}`}>{label} ({registrations.filter((row) => row.category === value).length})</button>
        ))}
      </nav>
      <div className="grid gap-4 rounded-lg border bg-white p-4 sm:grid-cols-[1fr_auto]">
        <label className="text-sm font-medium">Search opportunities<Input className="mt-2" placeholder="Search title, organization, or location" value={search} onChange={(event) => setSearch(event.target.value)} /></label>
        <label className="text-sm font-medium">Sort by<select className="mt-2 block h-10 rounded-md border bg-white px-3" value={sort} onChange={(event) => setSort(event.target.value)}><option value="date">{category === "completed" ? "Most recent first" : "Soonest first"}</option><option value="title">Title: A–Z</option></select></label>
      </div>
      {category === "completed" && <p className="text-sm text-slate-600">No show means the opportunity ended without an organization check-in. Contact the organization if your attendance needs correcting.</p>}
      {!visible.length && <p className="rounded-lg border border-dashed bg-white p-10 text-center text-slate-500">No {category} opportunities match your search.</p>}
      <ul className="space-y-3">
        {visible.map(({ booking, lifecycle }) => {
          const opportunity = booking.opportunity;
          const attendance = getVolunteerAttendance(booking, now);
          return <li key={booking.id}><button type="button" onClick={() => setSelected(booking)} className={`w-full space-y-3 rounded-lg border p-5 text-left shadow-sm hover:border-emerald-500 focus-visible:outline-2 focus-visible:outline-emerald-700 ${lifecycle.ongoing ? "border-emerald-400 bg-emerald-50" : "bg-white"}`}>
            <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-lg font-semibold">{opportunity.title}</h2><span className={`rounded-full px-3 py-1 text-xs font-semibold ${attendance === "Checked in" ? "bg-emerald-100 text-emerald-900" : attendance === "No show" ? "bg-rose-100 text-rose-800" : "bg-slate-100 text-slate-700"}`}>{attendance}</span></div>
            <p className="text-sm text-slate-600">{opportunity.organizations?.name ?? "Independent"}{lifecycle.ongoing && <span className="ml-3 font-semibold text-emerald-800">Ongoing</span>}</p>
            <div className="flex flex-wrap gap-4 text-sm text-slate-600"><span className="inline-flex items-center gap-2"><CalendarDays className="size-4" />{formatDate(opportunity.date)} · {formatTime(opportunity.start_time)} – {formatTime(opportunity.end_time)}</span><span className="inline-flex items-center gap-2"><MapPin className="size-4" />{opportunity.location}</span></div>
            <p className="text-sm font-medium text-emerald-800">View details</p>
          </button></li>;
        })}
      </ul>
      {selectedBooking && <OpportunityDetailsDialog opportunity={selectedBooking.opportunity} approvedCount={approvedCounts[selectedBooking.opportunity_id] ?? 0} hasExistingBooking existingBookingId={selectedBooking.id} existingBookingStatus={selectedBooking.status} open={Boolean(selected)} onOpenChange={(open) => { if (!open) setSelected(null); }} />}
    </div>
  );
}
