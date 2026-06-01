import { createClient } from "@/lib/supabase/server";
import { getCurrentUserProfile } from "@/lib/auth";
import { PageHeader } from "@/components/layout/PageHeader";
import { BookingTable } from "@/components/bookings/BookingTable";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default async function BookingsPage() {
  const profile = await getCurrentUserProfile();
  const supabase = await createClient();

  const { data: allBookings } = await supabase
    .from("bookings")
    .select("*, volunteer_opportunities(*, organizations(*))")
    .eq("volunteer_id", profile!.id)
    .order("created_at", { ascending: false });

  const now = new Date().toISOString().split("T")[0];

  const upcoming = (allBookings ?? []).filter((b) => {
    const opp = b.volunteer_opportunities;
    return (
      opp &&
      opp.date >= now &&
      ["pending", "approved"].includes(b.status)
    );
  });

  const past = (allBookings ?? []).filter((b) => {
    const opp = b.volunteer_opportunities;
    return (
      !opp ||
      opp.date < now ||
      ["rejected", "cancelled", "completed"].includes(b.status)
    );
  });

  const pending = upcoming.filter((b) => b.status === "pending");
  const approved = upcoming.filter((b) => b.status === "approved");

  const toRows = (bookings: typeof allBookings) =>
    (bookings ?? []).map((b) => ({
      booking: b,
      opportunity: b.volunteer_opportunities,
    }));

  return (
    <div>
      <PageHeader
        title="My Bookings"
        description="View and manage your volunteer session bookings."
      />

      <Tabs defaultValue="upcoming">
        <TabsList>
          <TabsTrigger value="upcoming">
            Upcoming ({approved.length})
          </TabsTrigger>
          <TabsTrigger value="pending">
            Pending ({pending.length})
          </TabsTrigger>
          <TabsTrigger value="past">Past ({past.length})</TabsTrigger>
        </TabsList>
        <TabsContent value="upcoming" className="mt-4">
          <BookingTable variant="volunteer" bookings={toRows(approved)} />
        </TabsContent>
        <TabsContent value="pending" className="mt-4">
          <BookingTable
            variant="volunteer"
            showActions={false}
            bookings={toRows(pending)}
          />
        </TabsContent>
        <TabsContent value="past" className="mt-4">
          <BookingTable
            variant="volunteer"
            showActions={false}
            bookings={toRows(past)}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
