export type ProfileRole = "volunteer" | "organization" | "admin";
export type ProfileStatus = "active" | "inactive" | "suspended";
export type ApplicationStatus = "pending" | "contacted" | "accepted" | "rejected";
export type OpportunityStatus = "draft" | "published" | "cancelled" | "completed";
export type OpportunityVisibility = "public" | "private";
export type OpportunitySignupMode = "open" | "application";
export type BookingStatus = "pending" | "approved" | "rejected" | "cancelled" | "completed";
export type OrganizationStatus = "active" | "inactive" | "suspended";
export type MembershipStatus = "pending" | "accepted" | "rejected";

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

export interface Organization {
  id: string;
  owner_id: string;
  name: string;
  description: string | null;
  website: string | null;
  contact_email: string;
  contact_phone: string | null;
  status: OrganizationStatus;
  created_at: string;
  updated_at: string;
}

export interface OrganizationApplication {
  id: string;
  organization_name: string;
  contact_first_name: string;
  contact_last_name: string;
  email: string;
  phone: string | null;
  website: string | null;
  mission: string | null;
  reason: string | null;
  status: ApplicationStatus;
  admin_notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface OrganizationMembership {
  id: string;
  organization_id: string;
  volunteer_id: string;
  status: MembershipStatus;
  volunteer_note: string | null;
  admin_note: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface VolunteerOpportunity {
  id: string;
  organization_id: string | null;
  title: string;
  description: string | null;
  date: string;
  start_time: string;
  end_time: string;
  location: string;
  experience_required: string | null;
  max_volunteers: number;
  status: OpportunityStatus;
  visibility: OpportunityVisibility;
  signup_mode: OpportunitySignupMode;
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
