import { appTimeZone, getAppDateString } from "@/lib/dates";
import type { Booking, VolunteerOpportunity } from "@/types/database";

export function getVolunteerRank(hours: number) {
  if (hours >= 500) return "Diamond";
  if (hours >= 250) return "Platinum";
  if (hours >= 100) return "Gold";
  if (hours >= 50) return "Silver";
  return "Bronze";
}

type RankBooking = Pick<Booking, "status" | "checked_in_at"> & {
  opportunity: Pick<VolunteerOpportunity, "status" | "date" | "start_time" | "end_time">;
};

// Credit scheduled session hours only once an attended session has actually ended.
export function getVolunteerHours(bookings: RankBooking[], now = new Date()) {
  const today = getAppDateString(now);
  const time = new Intl.DateTimeFormat("en-GB", { timeZone: appTimeZone, hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23" }).format(now);
  const seconds = (value: string) => value.split(":").reduce((total, part, index) => total + Number(part) * [3600, 60, 1][index], 0);
  return bookings.reduce((total, booking) => {
    const opportunity = booking.opportunity;
    if (!booking.checked_in_at || !["approved", "completed"].includes(booking.status) || !["published", "completed"].includes(opportunity.status)) return total;
    if (opportunity.date > today || (opportunity.date === today && opportunity.end_time > time)) return total;
    const duration = seconds(opportunity.end_time) - seconds(opportunity.start_time);
    return total + (Number.isFinite(duration) && duration > 0 ? duration / 3600 : 0);
  }, 0);
}
