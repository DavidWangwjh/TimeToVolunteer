import { format, parseISO, isPast, addHours } from "date-fns";
import type { VolunteerOpportunity } from "@/types/database";

export function formatDate(dateStr: string) {
  return format(parseISO(dateStr), "MMMM d, yyyy");
}

export function formatTime(timeStr: string) {
  const [hours, minutes] = timeStr.split(":");
  const date = new Date();
  date.setHours(parseInt(hours), parseInt(minutes));
  return format(date, "h:mm a");
}

export function formatDateTime(dateStr: string, timeStr: string) {
  return `${formatDate(dateStr)} at ${formatTime(timeStr)}`;
}

export function isOpportunityPast(opportunity: VolunteerOpportunity) {
  const sessionStart = new Date(`${opportunity.date}T${opportunity.start_time}`);
  return isPast(sessionStart);
}

export function getSpotsRemaining(
  maxVolunteers: number,
  approvedCount: number
) {
  return Math.max(0, maxVolunteers - approvedCount);
}

export function canVolunteerCancel(dateStr: string, timeStr: string) {
  const sessionStart = new Date(`${dateStr}T${timeStr}`);
  return addHours(new Date(), 24) < sessionStart;
}

export function getFullName(firstName: string, lastName: string) {
  return `${firstName} ${lastName}`;
}
