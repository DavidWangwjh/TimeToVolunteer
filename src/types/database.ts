export type ProfileRole = "volunteer" | "admin";
export type ProfileStatus = "active" | "inactive" | "suspended";
export type ApplicationStatus = "pending" | "contacted" | "accepted" | "rejected";
export type OpportunityStatus = "draft" | "published" | "cancelled" | "completed";
export type BookingStatus = "pending" | "approved" | "rejected" | "cancelled" | "completed";

export interface Profile {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  role: ProfileRole;
  status: ProfileStatus;
  must_reset_password: boolean;
  created_at: string;
  updated_at: string;
}

export interface VolunteerApplication {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  age: string | null;
  availability: string | null;
  experience: string | null;
  preferred_areas: string | null;
  reason: string | null;
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
  agreement_accepted: boolean;
  status: ApplicationStatus;
  admin_notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface VolunteerOpportunity {
  id: string;
  title: string;
  description: string | null;
  date: string;
  start_time: string;
  end_time: string;
  location: string;
  experience_required: string | null;
  max_volunteers: number;
  status: OpportunityStatus;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface Booking {
  id: string;
  opportunity_id: string;
  volunteer_id: string;
  status: BookingStatus;
  volunteer_note: string | null;
  admin_note: string | null;
  approved_by: string | null;
  approved_at: string | null;
  rejected_at: string | null;
  cancelled_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface BookingWithDetails extends Booking {
  volunteer_opportunities: VolunteerOpportunity;
  profiles: Profile;
}

export interface OpportunityWithCounts extends VolunteerOpportunity {
  approved_count?: number;
  pending_count?: number;
}
