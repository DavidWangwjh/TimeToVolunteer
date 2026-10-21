import { getVolunteerStats } from "@/lib/volunteer-rank-data";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { appTimeZone, getAppDateString, getAge } from "@/lib/dates";
import { notFound, redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/auth";
import { BookingTable } from "@/components/bookings/BookingTable";
import { VolunteerProfilePanel } from "@/components/profile/VolunteerProfilePanel";

interface Props {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ from?: string; returnTo?: string }>;
}

export default async function OrganizationVolunteerDetailPage({
  params,
  searchParams,
}: Props) {
  const { id } = await params;
  const query = await searchParams;
  const fromReview = query.from === "review";
  const opportunityReturn = /^\/dashboard\/organization\/opportunities\/[a-f0-9-]+\/edit(?:\?view=review)?$/.test(query.returnTo ?? "") ? query.returnTo : undefined;
  const backHref = opportunityReturn ?? (fromReview ? "/dashboard/organization/memberships?view=review" : "/dashboard/organization/memberships");
  const backLabel = opportunityReturn ? (opportunityReturn.endsWith("?view=review") ? "Back to registration requests" : "Back to opportunity") : (fromReview ? "Back to awaiting review" : "Back to memberships");
  const profile = await requireAdmin();

  if (profile.role !== "organization") {
    redirect("/dashboard/admin/volunteers");
  }

  const adminClient = createAdminClient();
  const { data: organization } = await adminClient
    .from("organizations")
    .select("id, status")
    .eq("owner_id", profile.id)
    .maybeSingle();

  if (organization?.status !== "active") {
    redirect("/dashboard/organization");
  }

  const [{ data: membership }, { data: registrations }, { data: volunteer }] =
    await Promise.all([
      adminClient
        .from("organization_memberships")
        .select("id")
        .eq("organization_id", organization.id)
        .eq("volunteer_id", id)
        .maybeSingle(),
      adminClient
        .from("bookings")
        .select("*, volunteer_opportunities!inner(*)")
        .eq("volunteer_id", id)
        .eq("volunteer_opportunities.organization_id", organization.id)
        .order("created_at", { ascending: false }),
      adminClient
        .from("profiles")
        .select("*")
        .eq("id", id)
        .eq("role", "volunteer")
        .maybeSingle(),
    ]);

  if (!volunteer || (!membership && (registrations ?? []).length === 0)) {
    notFound();
  }

  // Only resolve the private photo after the organization relationship check above.
  const { data: authData } = await adminClient.auth.admin.getUserById(id);
  const avatarPath = authData.user?.user_metadata.volunteer_avatar_path;
  let avatarSrc: string | undefined;
  if (typeof avatarPath === "string" && new RegExp(`^${id}/[a-f0-9-]+\\.webp$`).test(avatarPath)) {
    const { data: signedPhoto } = await adminClient.storage.from("volunteer-avatars").createSignedUrl(avatarPath, 3600);
    avatarSrc = signedPhoto?.signedUrl;
  }

  const volunteerStats = await getVolunteerStats(id);
  const now = new Date();
  const today = getAppDateString(now);
  const currentTime = new Intl.DateTimeFormat("en-GB", {
    timeZone: appTimeZone,
    hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23",
  }).format(now);
  const history = (registrations ?? []).flatMap((booking) => {
    const opportunity = Array.isArray(booking.volunteer_opportunities)
      ? booking.volunteer_opportunities[0]
      : booking.volunteer_opportunities;
    if (!opportunity || opportunity.status !== "completed" ||
        !["approved", "completed"].includes(booking.status)) return [];
    const ended = opportunity.date < today ||
      (opportunity.date === today && opportunity.end_time < currentTime);
    return ended ? [{ booking, opportunity, volunteer }] : [];
  }).sort((a, b) => `${b.opportunity.date}T${b.opportunity.end_time}`.localeCompare(`${a.opportunity.date}T${a.opportunity.end_time}`));

  return (
    <div className="space-y-6">
      <Link href={backHref} className="inline-flex items-center gap-2 text-sm font-semibold text-emerald-800 hover:underline">
        <ArrowLeft className="size-4" />{backLabel}
      </Link>
      <VolunteerProfilePanel key={volunteer.id} profile={volunteer} volunteerStats={volunteerStats} readOnly avatarSrc={avatarSrc} age={getAge(volunteer.date_of_birth, now)} />

      <div>
        <h2 className="mb-4 text-lg font-semibold">Volunteer History</h2>
        {history.length === 0 ? (
          <p className="rounded-lg border border-dashed bg-white p-8 text-center text-sm text-slate-500">No completed past opportunities with your organization yet.</p>
        ) : <BookingTable
          variant="admin"
          showActions={false}
          volunteerBasePath="/dashboard/organization/volunteers"
          volunteerReturnTo={opportunityReturn}
          bookings={history}
        />}
      </div>
    </div>
  );
}
