import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { StatusBadge } from "@/components/bookings/BookingStatusBadge";
import { BookingTable } from "@/components/bookings/BookingTable";
import { AdminVolunteerProfileForm } from "@/components/volunteers/AdminVolunteerProfileForm";
import { VolunteerStatusActions } from "@/components/volunteers/VolunteerStatusActions";
import Link from "next/link";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { getVolunteerHours } from "@/lib/volunteer-ranks";
import { getVolunteerStats } from "@/lib/volunteer-rank-data";
import { getAge } from "@/lib/dates";
import { VolunteerProfilePanel } from "@/components/profile/VolunteerProfilePanel";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface Props {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ returnTo?: string }>;
}

export default async function VolunteerDetailPage({ params, searchParams }: Props) {
  const actor = await requireAdmin();
  if (actor.role !== "admin") redirect("/dashboard/organization");
  const { id } = await params;
  const { returnTo } = await searchParams;
  const fromOpportunity = /^\/dashboard\/admin\/opportunities\/[a-f0-9-]+\/edit$/.test(returnTo ?? "");
  const supabase = await createClient();

  const { data: volunteer } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", id)
    .eq("role", "volunteer")
    .single();

  if (!volunteer) notFound();

  const { data: bookings } = await supabase
    .from("bookings")
    .select("*, volunteer_opportunities(*)")
    .eq("volunteer_id", id)
    .order("created_at", { ascending: false });

  const adminClient = createAdminClient();
  const { data: authData } = await adminClient.auth.admin.getUserById(id);
  const path = authData.user?.user_metadata.volunteer_avatar_path;
  let avatarSrc: string | undefined;
  if (typeof path === "string" && new RegExp(`^${id}/[a-f0-9-]+\\.webp$`).test(path)) {
    const { data } = await adminClient.storage.from("volunteer-avatars").createSignedUrl(path, 3600);
    avatarSrc = data?.signedUrl;
  }
  const stats = await getVolunteerStats(id);
  const now = new Date();
  const rows = (bookings ?? []).flatMap(booking => {
    const opportunity = Array.isArray(booking.volunteer_opportunities) ? booking.volunteer_opportunities[0] : booking.volunteer_opportunities;
    return opportunity ? [{ booking, opportunity, volunteer }] : [];
  });
  const history = rows.filter(({ booking, opportunity }) => getVolunteerHours([{ ...booking, opportunity }], now) > 0).sort((a, b) => `${b.opportunity.date}T${b.opportunity.end_time}`.localeCompare(`${a.opportunity.date}T${a.opportunity.end_time}`));
  return <div className="space-y-6">
    <Link href={fromOpportunity ? returnTo! : "/dashboard/admin/volunteers"} className="text-sm font-semibold text-emerald-800 hover:underline">← {fromOpportunity ? "Back to opportunity" : "Back to volunteers"}</Link>
    <VolunteerProfilePanel profile={volunteer} readOnly avatarSrc={avatarSrc} age={getAge(volunteer.date_of_birth)} volunteerStats={stats} />
    <Tabs defaultValue="history">
      <TabsList variant="line"><TabsTrigger value="history">Volunteer History ({history.length})</TabsTrigger><TabsTrigger value="registrations">All registrations ({rows.length})</TabsTrigger><TabsTrigger value="manage">Manage profile</TabsTrigger></TabsList>
      <TabsContent value="history"><BookingTable variant="admin" showActions={false} bookings={history} /></TabsContent>
      <TabsContent value="registrations"><BookingTable variant="admin" showActions={false} bookings={rows} /></TabsContent>
      <TabsContent value="manage" className="space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3"><StatusBadge status={volunteer.status} /><VolunteerStatusActions volunteerId={volunteer.id} currentStatus={volunteer.status} /></div>
        <AdminVolunteerProfileForm volunteer={volunteer} />
      </TabsContent>
    </Tabs>
  </div>;
}
