import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { StatusBadge } from "@/components/bookings/BookingStatusBadge";
import { BookingTable } from "@/components/bookings/BookingTable";
import { AdminVolunteerProfileForm } from "@/components/volunteers/AdminVolunteerProfileForm";
import { VolunteerStatusActions } from "@/components/volunteers/VolunteerStatusActions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function VolunteerDetailPage({ params }: Props) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: volunteer } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", id)
    .single();

  if (!volunteer) notFound();

  const { data: bookings } = await supabase
    .from("bookings")
    .select("*, volunteer_opportunities(*)")
    .eq("volunteer_id", id)
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-950">
            {volunteer.first_name} {volunteer.last_name}
          </h1>
          <div className="mt-2">
            <StatusBadge status={volunteer.status} />
          </div>
        </div>
        <VolunteerStatusActions
          volunteerId={volunteer.id}
          currentStatus={volunteer.status}
        />
      </div>

      <AdminVolunteerProfileForm volunteer={volunteer} />

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
              {volunteer.phone ?? "—"}
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
              {volunteer.date_of_birth ?? "—"}
            </p>
            <p>
              <span className="text-muted-foreground">Interests:</span>{" "}
              {volunteer.volunteer_interests?.length
                ? volunteer.volunteer_interests.join(", ")
                : "—"}
            </p>
            <p>
              <span className="text-muted-foreground">Self introduction:</span>{" "}
              {volunteer.volunteer_intro ?? "—"}
            </p>
          </CardContent>
        </Card>
      </div>

      <div>
        <h2 className="text-lg font-semibold mb-4">Registration History</h2>
        <BookingTable
          variant="admin"
          showActions={false}
          bookings={(bookings ?? []).map((b) => ({
            booking: b,
            opportunity: b.volunteer_opportunities,
            volunteer,
          }))}
        />
      </div>
    </div>
  );
}
