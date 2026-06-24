import { format, parseISO, isPast } from "date-fns";
import type { VolunteerOpportunity } from "@/types/database";

export const appTimeZone = "America/Los_Angeles";

export function formatDate(dateStr: string) {
  return format(parseISO(dateStr), "MMMM d, yyyy");
}

export function formatTime(timeStr: string) {
  const [hours, minutes] = timeStr.split(":");
  const date = new Date();
  date.setHours(parseInt(hours), parseInt(minutes));
  return format(date, "h:mm a");
}

export function getAppDateString(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: appTimeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((item) => item.type === type)?.value ?? "";

  return `${part("year")}-${part("month")}-${part("day")}`;
}

export function isOpportunityPast(opportunity: VolunteerOpportunity) {
  const sessionStart = new Date(`${opportunity.date}T${opportunity.start_time}`);
  return isPast(sessionStart);
}

export function getFullName(firstName: string, lastName: string) {
  return `${firstName} ${lastName}`;
}
