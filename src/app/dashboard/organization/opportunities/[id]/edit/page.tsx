import Link from "next/link";
import { notFound } from "next/navigation";
import { redirect } from "next/navigation";
import { ArrowLeft, Copy } from "lucide-react";
import { requireAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { EditOpportunityForm } from "@/components/opportunities/EditOpportunityForm";
import { RegisteredVolunteers } from "@/components/opportunities/RegisteredVolunteers";
import { Button } from "@/components/ui/button";
import { AssignVolunteerSearch, type AssignableVolunteer } from "@/components/opportunities/AssignVolunteerSearch";
import { BookingTable, type BookingRow } from "@/components/bookings/BookingTable";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { Profile } from "@/types/database";

interface RegisteredBooking {
  id: string;
  volunteer_id: string;
  checked_in_at: string | null;
  checked_in_by: string | null;
  profiles: Profile | null;
}

interface Props {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ view?: string }>;
}

export default async function EditOpportunityPage({ params, searchParams }: Props) {
  const showReview = (await searchParams).view === "review";
  const { id } = await params;
  const profile = await requireAdmin();
  const supabase = createAdminClient();
  const { data: organization } = await supabase
    .from("organizations")
    .select("id, status, visibility")
    .eq("owner_id", profile.id)
    .maybeSingle();

  if (organization?.status !== "active") {
    redirect("/dashboard/organization");
  }

  const { data: opportunity } = await supabase
    .from("volunteer_opportunities")
    .select("*")
    .eq("id", id)
    .eq("organization_id", organization?.id ?? "00000000-0000-0000-0000-000000000000")
    .single();

  if (!opportunity) notFound();

  const [{ data: bookings, error: bookingsError }, { data: memberships, error: membershipsError }] = await Promise.all([
    supabase
      .from("bookings")
      .select(`
        *,
        profiles:profiles!bookings_volunteer_id_fkey (
          id,
          first_name,
          last_name,
          email,
          phone,
          role,
          status,
          must_reset_password,
          volunteer_interests,
          volunteer_intro,
          date_of_birth,
          created_at,
          updated_at
        )
      `)
      .eq("opportunity_id", id)
      .in("status", ["pending", "approved"])
      .order("approved_at", { ascending: true }),
    supabase
      .from("organization_memberships")
      .select(`
        profiles:profiles!organization_memberships_volunteer_id_fkey (
          id,
          first_name,
          last_name,
          email,
          phone,
          role,
          status,
          volunteer_interests,
          volunteer_intro,
          date_of_birth
        )
      `)
      .eq("organization_id", organization.id)
      .eq("status", "accepted"),
  ]);

  if (bookingsError || membershipsError) throw new Error("Unable to load volunteers");

  const registeredBookings: RegisteredBooking[] = (bookings ?? [])
    .filter((booking) => booking.status === "approved")
    .map((booking) => ({
      id: booking.id,
      volunteer_id: booking.volunteer_id,
      checked_in_at: booking.checked_in_at,
      checked_in_by: booking.checked_in_by,
      profiles: Array.isArray(booking.profiles)
        ? booking.profiles[0]
        : booking.profiles,
    }));

  const registeredVolunteerIds = new Set(
    registeredBookings.map((booking) => booking.volunteer_id)
  );
  const acceptedMemberProfiles = (memberships ?? [])
    .map((membership) =>
      Array.isArray(membership.profiles)
        ? membership.profiles[0]
        : membership.profiles
    )
    .filter(
      (volunteer) =>
        Boolean(volunteer) &&
        volunteer.role === "volunteer" &&
        volunteer.status === "active" &&
        !registeredVolunteerIds.has(volunteer.id)
    );
  const assignableVolunteers: AssignableVolunteer[] = acceptedMemberProfiles.map(
    (volunteer) => ({
      id: volunteer.id,
      first_name: volunteer.first_name,
      last_name: volunteer.last_name,
      email: volunteer.email,
      phone: volunteer.phone,
      date_of_birth: volunteer.date_of_birth,
      volunteer_interests: volunteer.volunteer_interests,
      volunteer_intro: volunteer.volunteer_intro,
    })
  );

  const pendingRows: BookingRow[] = (bookings ?? []).filter((booking) => booking.status === "pending").map((booking) => ({
    booking,
    opportunity,
    volunteer: (Array.isArray(booking.profiles) ? booking.profiles[0] : booking.profiles) ?? undefined,
  }));

  return (
    <div>
      <Link href="/dashboard/organization/opportunities" className="mb-4 inline-flex items-center gap-2 text-sm font-medium text-emerald-800"><ArrowLeft className="size-4" />All opportunities</Link>
      <div className="mb-6 flex items-center justify-between gap-4">
        <h1 className="min-w-0 break-words text-2xl font-bold text-slate-950">{opportunity.title}</h1>
        <Button asChild variant="outline" className="shrink-0">
          <Link href={`/dashboard/organization/opportunities/new?duplicate=${opportunity.id}`}>
            <Copy className="size-4" />
            Duplicate
          </Link>
        </Button>
      </div>

      <Tabs key={showReview ? "review" : "manage"} defaultValue="volunteers">
        <TabsList className="mb-5">
          <TabsTrigger value="volunteers">Volunteers{pendingRows.length > 0 ? ` (${pendingRows.length} pending)` : ""}</TabsTrigger>
          <TabsTrigger value="details">Edit details</TabsTrigger>
        </TabsList>
        <TabsContent value="details" keepMounted>
          <EditOpportunityForm
            opportunity={opportunity}
            organizationVisibility={organization.visibility}
          />

        </TabsContent>
        <TabsContent value="volunteers" className="space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-semibold">
              {showReview ? "Registration requests" : "Volunteer registrations"}
            </h2>
            <Button asChild variant="outline">
              <Link href={`/dashboard/organization/opportunities/${opportunity.id}/edit${showReview ? "" : "?view=review"}`}>
                {showReview ? "Back to registered volunteers" : `Review requests (${pendingRows.length})`}
              </Link>
            </Button>
          </div>
          {showReview ? (
            <BookingTable
              bookings={pendingRows}
              variant="admin"
              showOpportunity={false}
              volunteerBasePath="/dashboard/organization/volunteers"
            />
          ) : (
            <>
              <RegisteredVolunteers
                opportunity={opportunity}
                registeredBookings={registeredBookings}
                registeredCount={registeredBookings.length}
                volunteerBasePath="/dashboard/organization/volunteers"
                showRemoveActions
                showCheckInActions
              />
              <section className="rounded-lg border bg-white p-6">
                <AssignVolunteerSearch
                  opportunityId={opportunity.id}
                  volunteers={assignableVolunteers}
                />
              </section>
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
