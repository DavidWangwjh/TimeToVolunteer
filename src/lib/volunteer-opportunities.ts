import type { Booking, VolunteerOpportunityWithOrganization } from "@/types/database";
import { getOpportunityLifecycle } from "@/lib/dates";

export type VolunteerOpportunityBooking = Booking & { opportunity: VolunteerOpportunityWithOrganization };

export function getVolunteerAttendance(booking: VolunteerOpportunityBooking, now: Date) {
  const ended = getOpportunityLifecycle({ ...booking.opportunity, status: "published" }, now).category === "past";
  if (booking.opportunity.status === "cancelled" || booking.status === "cancelled") return "Cancelled";
  if (booking.status === "pending") return ended ? "Not approved" : "Awaiting approval";
  if (booking.checked_in_at) return "Checked in";
  return ended ? "No show" : "Not checked in";
}
