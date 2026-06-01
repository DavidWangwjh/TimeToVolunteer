"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin, getCurrentUserProfile } from "@/lib/auth";
import {
  organizationApplicationSchema,
  volunteerSignupSchema,
  opportunityCreateSchema,
  opportunityUpdateSchema,
  assignVolunteerSchema,
  bookingRequestSchema,
  profileUpdateSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} from "@/lib/validators";
import type {
  OrganizationApplicationInput,
  VolunteerSignupInput,
  OpportunityCreateInput,
  OpportunityUpdateInput,
  ProfileUpdateInput,
} from "@/lib/validators";
import type { Profile } from "@/types/database";

function normalizeOpportunityFields(
  data: OpportunityCreateInput | OpportunityUpdateInput
) {
  return {
    title: data.title,
    description: data.description?.trim() || null,
    date: data.date,
    start_time: data.start_time,
    end_time: data.end_time,
    location: data.location,
    experience_required: data.experience_required?.trim() || null,
    max_volunteers: data.max_volunteers,
    visibility: data.visibility,
    signup_mode: data.signup_mode,
  };
}

function getAppUrl() {
  return (process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000").replace(
    /\/$/,
    ""
  );
}

function getPasswordSetupRedirectUrl() {
  const appUrl = getAppUrl();

  return `${appUrl}/auth/callback?next=${encodeURIComponent(
    "/reset-password"
  )}`;
}

async function findAuthUserByEmail(
  adminClient: ReturnType<typeof createAdminClient>,
  email: string
) {
  const normalizedEmail = email.toLowerCase();
  let page = 1;
  const perPage = 100;

  while (true) {
    const { data, error } = await adminClient.auth.admin.listUsers({
      page,
      perPage,
    });

    if (error) {
      return { user: null, error };
    }

    const user = data.users.find(
      (candidate) => candidate.email?.toLowerCase() === normalizedEmail
    );

    if (user || data.users.length < perPage) {
      return { user: user ?? null, error: null };
    }

    page += 1;
  }
}

async function getOwnedOrganization(profileId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("organizations")
    .select("*")
    .eq("owner_id", profileId)
    .eq("status", "active")
    .maybeSingle();

  if (error) {
    return { organization: null, error };
  }

  return { organization: data, error: null };
}

export async function submitOrganizationApplication(
  data: OrganizationApplicationInput
) {
  const parsed = organizationApplicationSchema.safeParse(data);

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const supabase = await createClient();

  const { error } = await supabase.from("organization_applications").insert({
    ...parsed.data,
    website: parsed.data.website?.trim() || null,
    status: "pending",
  });

  if (error) {
    return { error: error.message };
  }

  redirect("/application-submitted");
}

export async function signUpVolunteer(data: VolunteerSignupInput) {
  const parsed = volunteerSignupSchema.safeParse(data);

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const adminClient = createAdminClient();
  const supabase = await createClient();

  const { data: userData, error: createError } =
    await adminClient.auth.admin.createUser({
      email: parsed.data.email,
      password: parsed.data.password,
      email_confirm: true,
      user_metadata: {
        first_name: parsed.data.first_name,
        last_name: parsed.data.last_name,
        role: "volunteer",
      },
    });

  if (createError) {
    return { error: createError.message };
  }

  const userId = userData.user?.id;

  if (!userId) {
    return { error: "Unable to create volunteer account" };
  }

  const { error: profileError } = await adminClient.from("profiles").upsert({
    id: userId,
    first_name: parsed.data.first_name,
    last_name: parsed.data.last_name,
    email: parsed.data.email,
    phone: parsed.data.phone?.trim() || null,
    role: "volunteer",
    status: "active",
    must_reset_password: false,
    updated_at: new Date().toISOString(),
  });

  if (profileError) {
    return { error: profileError.message };
  }

  const { error: signInError } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });

  if (signInError) {
    return { error: signInError.message };
  }

  redirect("/dashboard/profile");
}

export async function acceptOrganizationApplication(applicationId: string) {
  const reviewer = await requireAdmin();

  if (reviewer.role !== "admin") {
    return { error: "Only platform admins can approve organization accounts" };
  }

  const adminClient = createAdminClient();
  const supabase = await createClient();
  const redirectTo = getPasswordSetupRedirectUrl();

  const { data: application, error: fetchError } = await supabase
    .from("organization_applications")
    .select("*")
    .eq("id", applicationId)
    .single();

  if (fetchError || !application) {
    return { error: "Application not found" };
  }

  let userId: string | undefined;

  const { data: createData, error: createError } =
    await adminClient.auth.admin.createUser({
      email: application.email,
      email_confirm: true,
      user_metadata: {
        first_name: application.contact_first_name,
        last_name: application.contact_last_name,
        role: "organization",
        organization_name: application.organization_name,
      },
    });

  if (createError) {
    const isDuplicate =
      createError.message.toLowerCase().includes("already") ||
      createError.message.toLowerCase().includes("registered") ||
      createError.message.toLowerCase().includes("exists");

    if (!isDuplicate) {
      return { error: createError.message };
    }

    const { user: existingUser, error: listError } = await findAuthUserByEmail(
      adminClient,
      application.email
    );

    if (listError) {
      return { error: listError.message };
    }

    if (!existingUser) {
      return { error: createError.message };
    }

    userId = existingUser.id;
  } else {
    userId = createData.user?.id;
  }

  if (!userId) {
    return { error: "Failed to create organization account" };
  }

  const { error: profileError } = await adminClient.from("profiles").upsert({
    id: userId,
    first_name: application.contact_first_name,
    last_name: application.contact_last_name,
    email: application.email,
    phone: application.phone,
    role: "organization",
    status: "active",
    must_reset_password: true,
    updated_at: new Date().toISOString(),
  });

  if (profileError) {
    return { error: profileError.message };
  }

  const { error: organizationError } = await adminClient
    .from("organizations")
    .upsert(
      {
        owner_id: userId,
        name: application.organization_name,
        description: application.mission,
        website: application.website,
        contact_email: application.email,
        contact_phone: application.phone,
        status: "active",
        updated_at: new Date().toISOString(),
      },
      { onConflict: "owner_id" }
    );

  if (organizationError) {
    return { error: organizationError.message };
  }

  const { error: resetEmailError } =
    await adminClient.auth.resetPasswordForEmail(application.email, {
      redirectTo,
    });

  if (resetEmailError) {
    return {
      error:
        "Organization account was created, but the password setup email failed to send. Please try accepting the application again.",
    };
  }

  const { error: updateError } = await supabase
    .from("organization_applications")
    .update({
      status: "accepted",
      updated_at: new Date().toISOString(),
    })
    .eq("id", applicationId);

  if (updateError) {
    return { error: updateError.message };
  }

  revalidatePath("/admin/applications");
  revalidatePath(`/admin/applications/${applicationId}`);

  return { success: true };
}

export async function rejectOrganizationApplication(
  applicationId: string,
  adminNotes?: string
) {
  const reviewer = await requireAdmin();

  if (reviewer.role !== "admin") {
    return { error: "Only platform admins can reject organization accounts" };
  }

  const supabase = await createClient();

  const { error } = await supabase
    .from("organization_applications")
    .update({
      status: "rejected",
      admin_notes: adminNotes,
      updated_at: new Date().toISOString(),
    })
    .eq("id", applicationId);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/admin/applications");
  revalidatePath(`/admin/applications/${applicationId}`);

  return { success: true };
}

export async function updateOrganizationApplicationStatus(
  applicationId: string,
  status: "contacted" | "pending",
  adminNotes?: string
) {
  const reviewer = await requireAdmin();

  if (reviewer.role !== "admin") {
    return { error: "Only platform admins can update organization applications" };
  }

  const supabase = await createClient();

  const { error } = await supabase
    .from("organization_applications")
    .update({
      status,
      admin_notes: adminNotes,
      updated_at: new Date().toISOString(),
    })
    .eq("id", applicationId);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/admin/applications");
  revalidatePath(`/admin/applications/${applicationId}`);

  return { success: true };
}

export async function createOpportunity(
  data: OpportunityCreateInput,
  status: "draft" | "published"
) {
  const admin = await requireAdmin();

  const parsed = opportunityCreateSchema.safeParse(data);

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const supabase = await createClient();
  const { organization, error: organizationError } = await getOwnedOrganization(
    admin.id
  );

  if (organizationError) {
    return { error: organizationError.message };
  }

  if (!organization && admin.role === "organization") {
    return { error: "Create or activate your organization before posting opportunities" };
  }

  if (!organization && parsed.data.visibility === "private") {
    return { error: "Private opportunities must belong to an active organization" };
  }

  const { error } = await supabase.from("volunteer_opportunities").insert({
    ...normalizeOpportunityFields(parsed.data),
    status,
    created_by: admin.id,
    organization_id: organization?.id ?? null,
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/admin/opportunities");
  revalidatePath("/admin/calendar");

  redirect("/admin/opportunities");
}

export async function updateOpportunity(
  id: string,
  data: OpportunityUpdateInput
) {
  const admin = await requireAdmin();

  const parsed = opportunityUpdateSchema.safeParse(data);

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const supabase = await createClient();
  const { organization, error: organizationError } = await getOwnedOrganization(
    admin.id
  );

  if (organizationError) {
    return { error: organizationError.message };
  }

  const { error } = await supabase
    .from("volunteer_opportunities")
    .update({
      ...normalizeOpportunityFields(parsed.data),
      status: parsed.data.status,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .or(
      organization
        ? `organization_id.eq.${organization.id},created_by.eq.${admin.id}`
        : `created_by.eq.${admin.id}`
    );

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/admin/opportunities");
  revalidatePath(`/admin/opportunities/${id}/edit`);
  revalidatePath("/admin/calendar");
  revalidatePath("/dashboard/calendar");

  redirect("/admin/opportunities");
}

export async function assignVolunteerToOpportunity(
  opportunityId: string,
  volunteerId: string
) {
  const admin = await requireAdmin();

  const parsed = assignVolunteerSchema.safeParse({
    opportunity_id: opportunityId,
    volunteer_id: volunteerId,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const supabase = await createClient();

  const { data: opportunity, error: oppError } = await supabase
    .from("volunteer_opportunities")
    .select("*")
    .eq("id", opportunityId)
    .single();

  if (oppError || !opportunity) {
    return { error: "Opportunity not found" };
  }

  if (["cancelled", "completed"].includes(opportunity.status)) {
    return { error: "Cannot assign volunteers to this opportunity" };
  }

  const { data: volunteer, error: volunteerError } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", volunteerId)
    .eq("role", "volunteer")
    .eq("status", "active")
    .single();

  if (volunteerError || !volunteer) {
    return { error: "Volunteer not found or not active" };
  }

  const { count: approvedCount } = await supabase
    .from("bookings")
    .select("*", { count: "exact", head: true })
    .eq("opportunity_id", opportunityId)
    .eq("status", "approved");

  if ((approvedCount ?? 0) >= opportunity.max_volunteers) {
    return { error: "This session is full" };
  }

  const { data: existingBooking } = await supabase
    .from("bookings")
    .select("id, status")
    .eq("opportunity_id", opportunityId)
    .eq("volunteer_id", volunteerId)
    .in("status", ["pending", "approved"])
    .maybeSingle();

  if (existingBooking) {
    return { error: "This volunteer is already assigned to this session" };
  }

  const { error: insertError } = await supabase.from("bookings").insert({
    opportunity_id: opportunityId,
    volunteer_id: volunteerId,
    status: "approved",
    approved_by: admin.id,
    approved_at: new Date().toISOString(),
    admin_note: "Assigned by admin",
  });

  if (insertError) {
    if (insertError.code === "23505") {
      return { error: "This volunteer is already assigned to this session" };
    }

    return { error: insertError.message };
  }

  revalidatePath(`/admin/opportunities/${opportunityId}/edit`);
  revalidatePath("/admin/bookings");
  revalidatePath("/admin/calendar");
  revalidatePath("/dashboard/calendar");
  revalidatePath("/dashboard/bookings");

  return { success: true };
}

export async function unassignVolunteerFromOpportunity(bookingId: string) {
  await requireAdmin();

  const supabase = await createClient();

  const { data: booking, error: fetchError } = await supabase
    .from("bookings")
    .select("*, volunteer_opportunities(*)")
    .eq("id", bookingId)
    .single();

  if (fetchError || !booking) {
    return { error: "Booking not found" };
  }

  if (booking.status !== "approved") {
    return { error: "Only approved assignments can be removed this way" };
  }

  const { error } = await supabase
    .from("bookings")
    .update({
      status: "cancelled",
      cancelled_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      admin_note: "Unassigned by admin",
    })
    .eq("id", bookingId);

  if (error) {
    return { error: error.message };
  }

  revalidatePath(`/admin/opportunities/${booking.opportunity_id}/edit`);
  revalidatePath("/admin/bookings");
  revalidatePath("/admin/calendar");
  revalidatePath("/dashboard/calendar");
  revalidatePath("/dashboard/bookings");

  return { success: true };
}

export async function deleteOpportunity(id: string) {
  await requireAdmin();

  const supabase = await createClient();

  const { error } = await supabase
    .from("volunteer_opportunities")
    .delete()
    .eq("id", id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/admin/opportunities");

  return { success: true };
}

export async function requestOrganizationMembership(
  organizationId: string,
  volunteerNote?: string
) {
  const profile = await getCurrentUserProfile();

  if (!profile || profile.role !== "volunteer" || profile.status !== "active") {
    return { error: "You must be an active volunteer to request access" };
  }

  const supabase = await createClient();
  const adminClient = createAdminClient();

  const { data: organization, error: organizationError } = await supabase
    .from("organizations")
    .select("id, status")
    .eq("id", organizationId)
    .eq("status", "active")
    .single();

  if (organizationError || !organization) {
    return { error: "Organization not found" };
  }

  const { data: existingMembership, error: membershipLookupError } =
    await adminClient
    .from("organization_memberships")
    .select("id, status")
    .eq("organization_id", organization.id)
    .eq("volunteer_id", profile.id)
    .maybeSingle();

  if (membershipLookupError) {
    return { error: membershipLookupError.message };
  }

  if (
    existingMembership &&
    ["pending", "accepted"].includes(existingMembership.status)
  ) {
    return { error: "You already requested access to this organization" };
  }

  const membershipPayload = {
    volunteer_note: volunteerNote?.trim() || null,
    status: "pending",
    admin_note: null,
    reviewed_by: null,
    reviewed_at: null,
    updated_at: new Date().toISOString(),
  };

  const { error } = existingMembership
    ? await adminClient
        .from("organization_memberships")
        .update(membershipPayload)
        .eq("id", existingMembership.id)
    : await adminClient.from("organization_memberships").insert({
        ...membershipPayload,
        organization_id: organization.id,
        volunteer_id: profile.id,
      });

  if (error) {
    if (error.code === "23505") {
      return { error: "You already requested access to this organization" };
    }

    return { error: error.message };
  }

  revalidatePath("/dashboard/organizations");
  revalidatePath("/admin/memberships");

  return { success: true };
}

export async function approveOrganizationMembership(membershipId: string) {
  const reviewer = await requireAdmin();
  const supabase = createAdminClient();

  const { error } = await supabase
    .from("organization_memberships")
    .update({
      status: "accepted",
      reviewed_by: reviewer.id,
      reviewed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", membershipId);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/admin/memberships");
  revalidatePath("/dashboard/organizations");
  revalidatePath("/dashboard/calendar");

  return { success: true };
}

export async function rejectOrganizationMembership(
  membershipId: string,
  adminNote?: string
) {
  const reviewer = await requireAdmin();
  const supabase = createAdminClient();

  const { error } = await supabase
    .from("organization_memberships")
    .update({
      status: "rejected",
      admin_note: adminNote?.trim() || null,
      reviewed_by: reviewer.id,
      reviewed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", membershipId);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/admin/memberships");
  revalidatePath("/dashboard/organizations");

  return { success: true };
}

export async function requestBooking(data: {
  opportunity_id: string;
  volunteer_note?: string;
}) {
  const profile = await getCurrentUserProfile();

  if (!profile || profile.role !== "volunteer" || profile.status !== "active") {
    return { error: "You must be an active volunteer to book sessions" };
  }

  const parsed = bookingRequestSchema.safeParse(data);

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const supabase = await createClient();

  const { data: opportunity, error: oppError } = await supabase
    .from("volunteer_opportunities")
    .select("*")
    .eq("id", parsed.data.opportunity_id)
    .single();

  if (oppError || !opportunity) {
    return { error: "Opportunity not found" };
  }

  if (opportunity.status !== "published") {
    return { error: "This opportunity is not available for booking" };
  }

  if (opportunity.visibility === "private") {
    if (!opportunity.organization_id) {
      return { error: "This private opportunity is not available yet" };
    }

    const { data: membership } = await supabase
      .from("organization_memberships")
      .select("id")
      .eq("organization_id", opportunity.organization_id)
      .eq("volunteer_id", profile.id)
      .eq("status", "accepted")
      .maybeSingle();

    if (!membership) {
      return {
        error:
          "You need to be accepted by this organization before applying to this opportunity",
      };
    }
  }

  const sessionDateTime = new Date(
    `${opportunity.date}T${opportunity.start_time}`
  );

  if (sessionDateTime < new Date()) {
    return { error: "This opportunity has already passed" };
  }

  const { count: approvedCount } = await supabase
    .from("bookings")
    .select("*", { count: "exact", head: true })
    .eq("opportunity_id", opportunity.id)
    .eq("status", "approved");

  if ((approvedCount ?? 0) >= opportunity.max_volunteers) {
    return { error: "This session is full" };
  }

  const { data: existingBooking } = await supabase
    .from("bookings")
    .select("id")
    .eq("opportunity_id", opportunity.id)
    .eq("volunteer_id", profile.id)
    .in("status", ["pending", "approved"])
    .maybeSingle();

  if (existingBooking) {
    return { error: "You already have a booking for this session" };
  }

  const { error } = await supabase.from("bookings").insert({
    opportunity_id: parsed.data.opportunity_id,
    volunteer_id: profile.id,
    volunteer_note: parsed.data.volunteer_note,
    status: opportunity.signup_mode === "open" ? "approved" : "pending",
    approved_at:
      opportunity.signup_mode === "open" ? new Date().toISOString() : null,
  });

  if (error) {
    if (error.code === "23505") {
      return { error: "You already have a booking for this session" };
    }

    return { error: error.message };
  }

  revalidatePath("/dashboard/bookings");
  revalidatePath("/dashboard/calendar");
  revalidatePath("/admin/bookings");

  return { success: true };
}

export async function approveBooking(bookingId: string, adminNote?: string) {
  const admin = await requireAdmin();

  const supabase = await createClient();

  const { data: booking, error: fetchError } = await supabase
    .from("bookings")
    .select("*, volunteer_opportunities(*)")
    .eq("id", bookingId)
    .single();

  if (fetchError || !booking) {
    return { error: "Booking not found" };
  }

  if (booking.status !== "pending") {
    return { error: "Only pending bookings can be approved" };
  }

  const opportunity = booking.volunteer_opportunities;

  const { count: approvedCount } = await supabase
    .from("bookings")
    .select("*", { count: "exact", head: true })
    .eq("opportunity_id", booking.opportunity_id)
    .eq("status", "approved");

  if ((approvedCount ?? 0) >= opportunity.max_volunteers) {
    return { error: "This session is now full" };
  }

  const { error } = await supabase
    .from("bookings")
    .update({
      status: "approved",
      approved_by: admin.id,
      approved_at: new Date().toISOString(),
      admin_note: adminNote,
      updated_at: new Date().toISOString(),
    })
    .eq("id", bookingId);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/admin/bookings");
  revalidatePath("/admin/calendar");
  revalidatePath(`/admin/opportunities/${booking.opportunity_id}/edit`);
  revalidatePath("/dashboard/bookings");
  revalidatePath("/dashboard/calendar");

  return { success: true };
}

export async function rejectBooking(bookingId: string, adminNote?: string) {
  await requireAdmin();

  const supabase = await createClient();

  const { data: booking, error: fetchError } = await supabase
    .from("bookings")
    .select("id, status, opportunity_id")
    .eq("id", bookingId)
    .single();

  if (fetchError || !booking) {
    return { error: "Booking not found" };
  }

  if (booking.status !== "pending") {
    return { error: "Only pending bookings can be rejected" };
  }

  const { error } = await supabase
    .from("bookings")
    .update({
      status: "rejected",
      rejected_at: new Date().toISOString(),
      admin_note: adminNote,
      updated_at: new Date().toISOString(),
    })
    .eq("id", bookingId);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/admin/bookings");
  revalidatePath("/admin/calendar");
  revalidatePath(`/admin/opportunities/${booking.opportunity_id}/edit`);
  revalidatePath("/dashboard/bookings");
  revalidatePath("/dashboard/calendar");

  return { success: true };
}

export async function cancelBooking(bookingId: string) {
  const profile = await getCurrentUserProfile();

  if (!profile) {
    return { error: "Not authenticated" };
  }

  const supabase = await createClient();

  const { data: booking, error: fetchError } = await supabase
    .from("bookings")
    .select("*, volunteer_opportunities(*)")
    .eq("id", bookingId)
    .single();

  if (fetchError || !booking) {
    return { error: "Booking not found" };
  }

  const isOwner = booking.volunteer_id === profile.id;
  const isAdminUser =
    profile.role === "organization" || profile.role === "admin";

  if (!isOwner && !isAdminUser) {
    return { error: "Not authorized" };
  }

  if (!["pending", "approved"].includes(booking.status)) {
    return { error: "This booking cannot be cancelled" };
  }

  if (isOwner && !isAdminUser) {
    const opportunity = booking.volunteer_opportunities;
    const sessionStart = new Date(
      `${opportunity.date}T${opportunity.start_time}`
    );

    const hoursUntil = (sessionStart.getTime() - Date.now()) / (1000 * 60 * 60);

    if (hoursUntil < 24) {
      return {
        error: "Bookings can only be cancelled up to 24 hours before the session",
      };
    }
  }

  const { error } = await supabase
    .from("bookings")
    .update({
      status: "cancelled",
      cancelled_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", bookingId);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/dashboard/bookings");
  revalidatePath("/dashboard/calendar");
  revalidatePath("/admin/bookings");
  revalidatePath("/admin/calendar");
  revalidatePath(`/admin/opportunities/${booking.opportunity_id}/edit`);

  return { success: true };
}

export async function updateProfile(data: ProfileUpdateInput) {
  const profile = await getCurrentUserProfile();

  if (!profile) {
    return { error: "Not authenticated" };
  }

  const parsed = profileUpdateSchema.safeParse(data);

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const supabase = await createClient();

  const { error } = await supabase
    .from("profiles")
    .update({
      ...parsed.data,
      updated_at: new Date().toISOString(),
    })
    .eq("id", profile.id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/dashboard/profile");

  return { success: true };
}

export async function updateVolunteerStatus(
  volunteerId: string,
  status: "active" | "inactive" | "suspended"
) {
  await requireAdmin();

  const supabase = await createClient();

  const { error } = await supabase
    .from("profiles")
    .update({
      status,
      updated_at: new Date().toISOString(),
    })
    .eq("id", volunteerId);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/admin/volunteers");
  revalidatePath(`/admin/volunteers/${volunteerId}`);

  return { success: true };
}

function getSafeRedirectPath(path?: string | null) {
  if (!path || !path.startsWith("/") || path.startsWith("//")) {
    return null;
  }

  return path;
}

function redirectAfterLogin(profile: Profile, requestedPath?: string | null) {
  if (profile.must_reset_password) {
    redirect("/reset-password");
  }

  const safePath = getSafeRedirectPath(requestedPath);

  if (profile.role === "organization" || profile.role === "admin") {
    if (safePath?.startsWith("/admin")) {
      redirect(safePath);
    }

    redirect("/admin");
  }

  if (safePath?.startsWith("/dashboard")) {
    redirect(safePath);
  }

  redirect("/dashboard");
}

export async function requestPasswordReset(email: string) {
  const parsed = forgotPasswordSchema.safeParse({ email });

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const supabase = await createClient();
  const redirectTo = getPasswordSetupRedirectUrl();

  let error;

  try {
    ({ error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, {
      redirectTo,
    }));
  } catch (err) {
    console.error("Password reset request failed:", err);

    return {
      error: "Unable to send reset email. Please try again later.",
    };
  }

  if (error) {
    return { error: error.message };
  }

  return { success: true };
}

export async function updatePassword(password: string, confirmPassword: string) {
  const parsed = resetPasswordSchema.safeParse({
    password,
    confirm_password: confirmPassword,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "You must be logged in to reset your password" };
  }

  const { error } = await supabase.auth.updateUser({
    password: parsed.data.password,
  });

  if (error) {
    return { error: error.message };
  }

  const { error: profileUpdateError } = await supabase
    .from("profiles")
    .update({
      must_reset_password: false,
      updated_at: new Date().toISOString(),
    })
    .eq("id", user.id);

  if (profileUpdateError) {
    return {
      error:
        "Your password was updated, but we could not finish activating your profile. Please contact an administrator.",
    };
  }

  const profile = await getCurrentUserProfile();

  if (profile) {
    redirectAfterLogin({
      ...profile,
      must_reset_password: false,
    });
  }

  redirect("/login");
}

export async function signOut() {
  const supabase = await createClient();

  await supabase.auth.signOut();

  redirect("/");
}

export async function signIn(
  email: string,
  password: string,
  redirectTo?: string | null
) {
  const supabase = await createClient();

  let error;

  try {
    ({ error } = await supabase.auth.signInWithPassword({
      email,
      password,
    }));
  } catch (err) {
    console.error("Supabase auth request failed:", err);

    const message =
      err instanceof Error && err.message.includes("fetch failed")
        ? "Cannot reach Supabase. Check NEXT_PUBLIC_SUPABASE_URL in .env.local matches your project URL exactly, then restart the dev server."
        : "Unable to connect to the authentication service. Please try again.";

    return { error: message };
  }

  if (error) {
    return { error: error.message };
  }

  const profile = await getCurrentUserProfile();

  if (!profile) {
    return {
      error: "Your account is not active yet. Please contact an administrator.",
    };
  }

  if (profile.role !== "admin" && profile.status !== "active") {
    return {
      error: "Your account is not active yet. Please contact an administrator.",
    };
  }

  redirectAfterLogin(profile, redirectTo);
}
