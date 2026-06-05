import { createClient } from "@/lib/supabase/server";
import { BookingTable } from "@/components/bookings/BookingTable";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default async function AdminBookingsPage() {
  const supabase = await createClient();

  const { data: allBookings } = await supabase
    .from("bookings")
    .select(
      "*, volunteer_opportunities(*), volunteer:profiles!bookings_volunteer_id_fkey(*)"
    )
    .order("created_at", { ascending: false });

  const pending = (allBookings ?? []).filter((b) => b.status === "pending");
  const approved = (allBookings ?? []).filter((b) => b.status === "approved");
  const other = (allBookings ?? []).filter((b) =>
    ["rejected", "cancelled", "completed"].includes(b.status)
  );

  const toRows = (bookings: typeof allBookings) =>
    (bookings ?? []).map((b) => {
      const volunteer = Array.isArray(b.volunteer) ? b.volunteer[0] : b.volunteer;
      const opportunity = Array.isArray(b.volunteer_opportunities)
        ? b.volunteer_opportunities[0]
        : b.volunteer_opportunities;

      return {
        booking: b,
        opportunity,
        volunteer,
      };
    });

  return (
    <div>
      
      <Tabs defaultValue="pending">
        <TabsList>
          <TabsTrigger value="pending">Pending ({pending.length})</TabsTrigger>
          <TabsTrigger value="approved">Approved ({approved.length})</TabsTrigger>
          <TabsTrigger value="other">Other ({other.length})</TabsTrigger>
        </TabsList>
        <TabsContent value="pending" className="mt-4">
          <BookingTable variant="admin" bookings={toRows(pending)} />
        </TabsContent>
        <TabsContent value="approved" className="mt-4">
          <BookingTable variant="admin" showActions bookings={toRows(approved)} />
        </TabsContent>
        <TabsContent value="other" className="mt-4">
          <BookingTable variant="admin" showActions={false} bookings={toRows(other)} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
