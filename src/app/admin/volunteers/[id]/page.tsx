import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/layout/PageHeader";
import { StatusBadge } from "@/components/bookings/BookingStatusBadge";
import { BookingTable } from "@/components/bookings/BookingTable";
import { VolunteerStatusActions } from "@/components/volunteers/VolunteerStatusActions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

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
    <div>
      <PageHeader
        title={`${volunteer.first_name} ${volunteer.last_name}`}
        description="Volunteer profile and booking history"
        action={
          <Button asChild variant="outline" size="sm">
            <Link href="/admin/volunteers">Back to List</Link>
          </Button>
        }
      />

      <div className="flex items-center gap-3 mb-6">
        <StatusBadge status={volunteer.status} />
      </div>

      <Card className="mb-8 max-w-lg">
        <CardHeader>
          <CardTitle className="text-base">Contact</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p><span className="text-muted-foreground">Email:</span> {volunteer.email}</p>
          <p><span className="text-muted-foreground">Phone:</span> {volunteer.phone ?? "—"}</p>
        </CardContent>
      </Card>

      <VolunteerStatusActions volunteerId={volunteer.id} currentStatus={volunteer.status} />

      <div className="mt-8">
        <h2 className="text-lg font-semibold mb-4">Booking History</h2>
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
