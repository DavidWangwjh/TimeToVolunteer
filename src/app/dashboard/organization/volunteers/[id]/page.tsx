import { notFound, redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/auth";
import { BookingTable } from "@/components/bookings/BookingTable";
import { StatusBadge } from "@/components/bookings/BookingStatusBadge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function OrganizationVolunteerDetailPage({
  params,
}: Props) {
  const { id } = await params;
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-950">
          {volunteer.first_name} {volunteer.last_name}
        </h1>
        <div className="mt-2">
          <StatusBadge status={volunteer.status} />
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Contact</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>
              <span className="text-muted-foreground">Email:</span>{" "}
              {volunteer.email}
            </p>
            <p>
              <span className="text-muted-foreground">Phone:</span>{" "}
              {volunteer.phone ?? "-"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Volunteer Profile</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>
              <span className="text-muted-foreground">Date of birth:</span>{" "}
              {volunteer.date_of_birth ?? "-"}
            </p>
            <p>
              <span className="text-muted-foreground">Interests:</span>{" "}
              {volunteer.volunteer_interests?.length
                ? volunteer.volunteer_interests.join(", ")
                : "-"}
            </p>
            <p>
              <span className="text-muted-foreground">Introduction:</span>{" "}
              {volunteer.volunteer_intro ?? "-"}
            </p>
          </CardContent>
        </Card>
      </div>

      <div>
        <h2 className="mb-4 text-lg font-semibold">Registration History</h2>
        <BookingTable
          variant="admin"
          showActions={false}
          volunteerBasePath="/dashboard/organization/volunteers"
          bookings={(registrations ?? []).map((booking) => ({
            booking,
            opportunity: Array.isArray(booking.volunteer_opportunities)
              ? booking.volunteer_opportunities[0]
              : booking.volunteer_opportunities,
            volunteer,
          }))}
        />
      </div>
    </div>
  );
}
