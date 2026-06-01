"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin, getCurrentUserProfile } from "@/lib/auth";
import {
  sendBookingApprovedEmail,
  sendBookingRejectedEmail,
} from "@/lib/email";
import {
  volunteerApplicationSchema,
  opportunityCreateSchema,
  opportunityUpdateSchema,
  assignVolunteerSchema,
  bookingRequestSchema,
  profileUpdateSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} from "@/lib/validators";
import type {
  VolunteerApplicationInput,
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
  };
}

export async function submitVolunteerApplication(data: VolunteerApplicationInput) {
  const parsed = volunteerApplicationSchema.safeParse(data);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("volunteer_applications").insert({
    ...parsed.data,
    status: "pending",
  });

  if (error) {
    return { error: error.message };
  }

  redirect("/application-submitted");
}

export async function acceptVolunteerApplication(applicationId: string) {
  await requireAdmin();

  const adminClient = createAdminClient();
  const supabase = await createClient();

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const redirectTo = `${appUrl}/auth/callback?next=${encodeURIComponent("/reset-password")}`;

  const { data: application, error: fetchError } = await supabase
    .from("volunteer_applications")
    .select("*")
    .eq("id", applicationId)
    .single();

  if (fetchError || !application) {
    return { error: "Application not found" };
  }

  let userId: string | undefined;
  let emailWarning: string | undefined;

  const { data: inviteData, error: inviteError } =
    await adminClient.auth.admin.inviteUserByEmail(application.email, {
      redirectTo,
      data: {
        first_name: application.first_name,
        last_name: application.last_name,
        role: "volunteer",
      },
    });

  if (inviteError) {
    const isDuplicate =
      inviteError.message.toLowerCase().includes("already") ||
      inviteError.message.toLowerCase().includes("registered") ||
      inviteError.message.toLowerCase().includes("exists");

    if (!isDuplicate) {
      return { error: inviteError.message };
    }

    const { data: listData, error: listError } =
      await adminClient.auth.admin.listUsers();

    if (listError) {
      return { error: listError.message };
    }

    const existingUser = listData.users.find(
      (user) => user.email?.toLowerCase() === application.email.toLowerCase()
    );

    if (!existingUser) {
      return { error: inviteError.message };
    }

    userId = existingUser.id;

    const { error: resetEmailError } =
      await adminClient.auth.resetPasswordForEmail(application.email, {
        redirectTo,
      });

    if (resetEmailError) {
      emailWarning =
        "Volunteer was accepted, but the password setup email failed to send.";
    }
  } else {
    userId = inviteData.user?.id;
  }

  if (!userId) {
    return { error: "Failed to create or invite user account" };
  }

  const { error: profileError } = await adminClient.from("profiles").upsert({
    id: userId,
    first_name: application.first_name,
    last_name: application.last_name,
    email: application.email,
    phone: application.phone,
    role: "volunteer",
    status: "active",
    must_reset_password: true,
    updated_at: new Date().toISOString(),
  });

  if (profileError) {
    return { error: profileError.message };
  }

  const { error: updateError } = await supabase
    .from("volunteer_applications")
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

  return {
    success: true,
    emailWarning,
  };
}

export async function rejectVolunteerApplication(applicationId: string, adminNotes?: string) {
  await requireAdmin();
  const supabase = await createClient();

  const { error } = await supabase
    .from("volunteer_applications")
    .update({
      status: "rejected",
      admin_notes: adminNotes,
      updated_at: new Date().toISOString(),
    })
    .eq("id", applicationId);

  if (error) return { error: error.message };

  revalidatePath("/admin/applications");
  revalidatePath(`/admin/applications/${applicationId}`);
  return { success: true };
}

export async function updateApplicationStatus(
  applicationId: string,
  status: "contacted" | "pending",
  adminNotes?: string
) {
  await requireAdmin();
  const supabase = await createClient();

  const { error } = await supabase
    .from("volunteer_applications")
    .update({
      status,
      admin_notes: adminNotes,
      updated_at: new Date().toISOString(),
    })
    .eq("id", applicationId);

  if (error) return { error: error.message };

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
  const { error } = await supabase.from("volunteer_opportunities").insert({
    ...normalizeOpportunityFields(parsed.data),
    status,
    created_by: admin.id,
  });

  if (error) return { error: error.message };

  revalidatePath("/admin/opportunities");
  revalidatePath("/admin/calendar");
  redirect("/admin/opportunities");
}

export async function updateOpportunity(id: string, data: OpportunityUpdateInput) {
  await requireAdmin();
  const parsed = opportunityUpdateSchema.safeParse(data);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("volunteer_opportunities")
    .update({
      ...normalizeOpportunityFields(parsed.data),
      status: parsed.data.status,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) return { error: error.message };

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

  if (error) return { error: error.message };

  revalidatePath(`/admin/opportunities/${booking.opportunity_id}/edit`);
  revalidatePath("/admin/bookings");
  revalidatePath("/admin/calendar");
  revalidatePath("/dashboard/calendar");

  return { success: true };
}

export async function deleteOpportunity(id: string) {
  await requireAdmin();
  const supabase = await createClient();

  const { error } = await supabase
    .from("volunteer_opportunities")
    .delete()
    .eq("id", id);

  if (error) return { error: error.message };

  revalidatePath("/admin/opportunities");
  return { success: true };
}

export async function requestBooking(data: { opportunity_id: string; volunteer_note?: string }) {
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

  const sessionDateTime = new Date(`${opportunity.date}T${opportunity.start_time}`);
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
    status: "pending",
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
    .select("*, volunteer_opportunities(*), profiles(*)")
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

  if (error) return { error: error.message };

  const volunteer = booking.profiles;
  const emailResult = await sendBookingApprovedEmail({
    email: volunteer.email,
    volunteerName: `${volunteer.first_name} ${volunteer.last_name}`,
    opportunityTitle: opportunity.title,
    date: opportunity.date,
    startTime: opportunity.start_time,
    endTime: opportunity.end_time,
    location: opportunity.location,
    notes: adminNote,
  });

  revalidatePath("/admin/bookings");
  revalidatePath("/dashboard/bookings");

  return {
    success: true,
    emailWarning: emailResult.success ? undefined : "Booking approved but email failed to send",
  };
}

export async function rejectBooking(bookingId: string, adminNote?: string) {
  await requireAdmin();
  const supabase = await createClient();

  const { data: booking, error: fetchError } = await supabase
    .from("bookings")
    .select("*, volunteer_opportunities(*), profiles(*)")
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

  if (error) return { error: error.message };

  const volunteer = booking.profiles;
  const opportunity = booking.volunteer_opportunities;
  await sendBookingRejectedEmail({
    email: volunteer.email,
    volunteerName: `${volunteer.first_name} ${volunteer.last_name}`,
    opportunityTitle: opportunity.title,
    adminNote,
  });

  revalidatePath("/admin/bookings");
  revalidatePath("/dashboard/bookings");
  return { success: true };
}

export async function cancelBooking(bookingId: string) {
  const profile = await getCurrentUserProfile();
  if (!profile) return { error: "Not authenticated" };

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
  const isAdminUser = profile.role === "admin";

  if (!isOwner && !isAdminUser) {
    return { error: "Not authorized" };
  }

  if (!["pending", "approved"].includes(booking.status)) {
    return { error: "This booking cannot be cancelled" };
  }

  if (isOwner && !isAdminUser) {
    const opportunity = booking.volunteer_opportunities;
    const sessionStart = new Date(`${opportunity.date}T${opportunity.start_time}`);
    const hoursUntil = (sessionStart.getTime() - Date.now()) / (1000 * 60 * 60);
    if (hoursUntil < 24) {
      return { error: "Bookings can only be cancelled up to 24 hours before the session" };
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

  if (error) return { error: error.message };

  revalidatePath("/dashboard/bookings");
  revalidatePath("/admin/bookings");
  return { success: true };
}

export async function updateProfile(data: ProfileUpdateInput) {
  const profile = await getCurrentUserProfile();
  if (!profile) return { error: "Not authenticated" };

  const parsed = profileUpdateSchema.safeParse(data);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({ ...parsed.data, updated_at: new Date().toISOString() })
    .eq("id", profile.id);

  if (error) return { error: error.message };

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
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", volunteerId);

  if (error) return { error: error.message };

  revalidatePath("/admin/volunteers");
  revalidatePath(`/admin/volunteers/${volunteerId}`);
  return { success: true };
}

function redirectAfterLogin(profile: Profile) {
  if (profile.must_reset_password) {
    redirect("/reset-password");
  }
  if (profile.role === "admin") {
    redirect("/admin");
  }
  redirect("/dashboard");
}

export async function requestPasswordReset(email: string) {
  const parsed = forgotPasswordSchema.safeParse({ email });
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const supabase = await createClient();
  const redirectTo = `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback?next=${encodeURIComponent("/reset-password")}`;

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

  await supabase
    .from("profiles")
    .update({
      must_reset_password: false,
      updated_at: new Date().toISOString(),
    })
    .eq("id", user.id);

  const profile = await getCurrentUserProfile();
  if (profile) {
    redirectAfterLogin({ ...profile, must_reset_password: false });
  }

  redirect("/login");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}

export async function signIn(email: string, password: string) {
  const supabase = await createClient();

  let error;
  try {
    ({ error } = await supabase.auth.signInWithPassword({ email, password }));
  } catch (err) {
    console.error("Supabase auth request failed:", err);
    const message =
      err instanceof Error && err.message.includes("fetch failed")
        ? "Cannot reach Supabase. Check NEXT_PUBLIC_SUPABASE_URL in .env.local matches your project URL exactly (Settings → API in the Supabase dashboard), then restart the dev server."
        : "Unable to connect to the authentication service. Please try again.";
    return { error: message };
  }

  if (error) {
    return { error: error.message };
  }

  const profile = await getCurrentUserProfile();
  if (!profile) {
    return { error: "Your account is not active yet. Please contact an administrator." };
  }

  if (profile.role !== "admin" && profile.status !== "active") {
    return { error: "Your account is not active yet. Please contact an administrator." };
  }

  redirectAfterLogin(profile);
}
