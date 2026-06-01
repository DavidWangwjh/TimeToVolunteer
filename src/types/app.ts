import type {
  ApplicationStatus,
  BookingStatus,
  OpportunityStatus,
  ProfileStatus,
} from "./database";

export type StatusType =
  | ApplicationStatus
  | BookingStatus
  | OpportunityStatus
  | ProfileStatus;

export interface DashboardStats {
  pendingApplications: number;
  acceptedVolunteers: number;
  pendingBookings: number;
  upcomingSessions: number;
  approvedBookingsThisMonth: number;
  availableSessionsThisWeek: number;
}
