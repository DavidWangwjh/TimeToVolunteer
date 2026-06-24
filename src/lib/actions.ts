"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { Resend } from "resend";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAppDateString } from "@/lib/dates";
import { requireAdmin, getCurrentUserProfile } from "@/lib/auth";
import {
  MAX_ORGANIZATION_IMAGE_SIZE,
  ORGANIZATION_IMAGE_SIZE_LABEL,
} from "@/lib/file-limits";
import {
  organizationApplicationSchema,
  volunteerSignupSchema,
  opportunityCreateSchema,
  opportunityUpdateSchema,
  bookingRequestSchema,
  profileUpdateSchema,
  organizationSettingsSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} from "@/lib/validators";
import type {
  OrganizationApplicationInput,
  VolunteerSignupInput,
  OpportunityCreateInput,
  OpportunityUpdateInput,
  ProfileUpdateInput,
  OrganizationSettingsInput,
} from "@/lib/validators";
import type { InboxMessageKind, Profile } from "@/types/database";

const ORGANIZATION_IMAGE_BUCKET = "organization-images";
const PASSWORD_RESET_EMAIL_SUBJECT = "Reset your TimeToVolunteer password";
interface InboxMessageInput {
  recipientId: string;
  actorId?: string | null;
  organizationId?: string | null;
  opportunityId?: string | null;
  bookingId?: string | null;
  membershipId?: string | null;
  kind: InboxMessageKind;
  title: string;
  body: string;
  actionHref?: string | null;
}

export interface InboxReceiverOption {
  id: string;
  name: string;
  email: string | null;
  detail?: string | null;
}

function normalizeOpportunityFields(
  data: OpportunityCreateInput | OpportunityUpdateInput
) {
  const recurrenceEnabled = Boolean(data.recurrence_enabled);

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
    recurring_frequency: recurrenceEnabled ? data.recurrence_frequency ?? null : null,
    recurring_until: recurrenceEnabled ? data.recurrence_until || null : null,
  };
}

function addRecurrenceInterval(date: Date, frequency: "weekly" | "biweekly" | "monthly") {
  const next = new Date(date);

  if (frequency === "weekly") {
    next.setUTCDate(next.getUTCDate() + 7);
  } else if (frequency === "biweekly") {
    next.setUTCDate(next.getUTCDate() + 14);
  } else {
    next.setUTCMonth(next.getUTCMonth() + 1);
  }

  return next;
}

function toDateString(date: Date) {
  return date.toISOString().slice(0, 10);
}

function getRecurringDates(
  startDate: string,
  untilDate: string | null | undefined,
  frequency: "weekly" | "biweekly" | "monthly" | null | undefined
) {
  if (!frequency || !untilDate) return [];

  const dates: string[] = [];
  let cursor = new Date(`${startDate}T00:00:00.000Z`);
  const until = new Date(`${untilDate}T00:00:00.000Z`);

  for (let index = 0; index < 52; index += 1) {
    cursor = addRecurrenceInterval(cursor, frequency);
    if (cursor > until) break;
    dates.push(toDateString(cursor));
  }

  return dates;
}

async function createRecurringOccurrences({
  supabase,
  groupId,
  baseData,
  status,
  adminId,
  organizationId,
  skipOpportunityId,
}: {
  supabase: Awaited<ReturnType<typeof createClient>>;
  groupId: string;
  baseData: ReturnType<typeof normalizeOpportunityFields>;
  status: "draft" | "published" | "cancelled" | "completed";
  adminId: string;
  organizationId: string | null;
  skipOpportunityId?: string;
}) {
  const dates = getRecurringDates(
    baseData.date,
    baseData.recurring_until,
    baseData.recurring_frequency
  );

  if (dates.length === 0) return { error: null };

  const { data: existingOccurrences, error: existingError } = await supabase
    .from("volunteer_opportunities")
    .select("id, date")
    .eq("recurring_group_id", groupId);

  if (existingError) {
    return { error: existingError.message };
  }

  const existingDates = new Set(
    (existingOccurrences ?? [])
      .filter((opportunity) => opportunity.id !== skipOpportunityId)
      .map((opportunity) => opportunity.date)
  );
  const missingDates = dates.filter((date) => !existingDates.has(date));

  if (missingDates.length === 0) return { error: null };

  const { error } = await supabase.from("volunteer_opportunities").insert(
    missingDates.map((date) => ({
      ...baseData,
      date,
      status,
      created_by: adminId,
      organization_id: organizationId,
      recurring_group_id: groupId,
    }))
  );

  return { error: error?.message ?? null };
}

function normalizeOrganizationDescription(description: string | null | undefined) {
  const normalized = description
    ?.replace(/\s*Category:\s*[^.]+\.?/gi, " ")
    .replace(/\s+/g, " ")
    .trim();

  return normalized || null;
}

function getImageExtension(file: File) {
  const extension = file.name.split(".").pop()?.toLowerCase();
  if (extension && /^[a-z0-9]+$/.test(extension)) return extension;
  return file.type.split("/")[1] || "jpg";
}

export async function uploadOrganizationImage(formData: FormData) {
  const file = formData.get("image");

  if (!(file instanceof File) || file.size === 0) {
    return { error: "Choose an image to upload" };
  }

  if (!file.type.startsWith("image/")) {
    return { error: "Only image uploads are supported" };
  }

  if (file.size > MAX_ORGANIZATION_IMAGE_SIZE) {
    return {
      error: `Organization images must be ${ORGANIZATION_IMAGE_SIZE_LABEL} or smaller`,
    };
  }

  const adminClient = createAdminClient();
  const extension = getImageExtension(file);
  const path = `profiles/${crypto.randomUUID()}.${extension}`;

  const { error } = await adminClient.storage
    .from(ORGANIZATION_IMAGE_BUCKET)
    .upload(path, file, {
      contentType: file.type,
      cacheControl: "31536000",
    });

  if (error) {
    return { error: error.message };
  }

  const { data } = adminClient.storage
    .from(ORGANIZATION_IMAGE_BUCKET)
    .getPublicUrl(path);

  return { url: data.publicUrl };
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

function canUseResendFallback() {
  return Boolean(process.env.RESEND_API_KEY && process.env.RESEND_FROM_EMAIL);
}

function isSupabaseMailerError(message: string) {
  return /sending.*recovery.*email|send.*recovery.*email|smtp|mailer/i.test(
    message
  );
}

async function sendPasswordResetEmailWithResend(email: string, resetUrl: string) {
  if (!canUseResendFallback()) {
    return {
      error:
        "Supabase could not send the reset email, and Resend fallback is not configured.",
    };
  }

  const resend = new Resend(process.env.RESEND_API_KEY);
  const { error } = await resend.emails.send({
    from: process.env.RESEND_FROM_EMAIL!,
    to: email,
    subject: PASSWORD_RESET_EMAIL_SUBJECT,
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #0f172a;">
        <h1 style="font-size: 24px;">Reset your password</h1>
        <p>Use the secure link below to choose a new TimeToVolunteer password.</p>
        <p>
          <a href="${resetUrl}" style="display: inline-block; background: #047857; color: #ffffff; padding: 12px 16px; border-radius: 8px; text-decoration: none; font-weight: 700;">
            Reset password
          </a>
        </p>
        <p>If you did not request this, you can ignore this email.</p>
      </div>
    `,
  });

  if (error) {
    return { error: error.message };
  }

  return { success: true };
}

async function sendPasswordResetEmailFallback(email: string, redirectTo: string) {
  const adminClient = createAdminClient();
  const { data, error } = await adminClient.auth.admin.generateLink({
    type: "recovery",
    email,
    options: { redirectTo },
  });

  if (error) {
    return { error: error.message };
  }

  const resetUrl = data.properties?.action_link;
  if (!resetUrl) {
    return { error: "Supabase did not return a reset link" };
  }

  return sendPasswordResetEmailWithResend(email, resetUrl);
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

async function createInboxMessage({
  recipientId,
  actorId = null,
  organizationId = null,
  opportunityId = null,
  bookingId = null,
  membershipId = null,
  kind,
  title,
  body,
  actionHref = null,
}: InboxMessageInput) {
  const adminClient = createAdminClient();
  const { error } = await adminClient.from("inbox_messages").insert({
    recipient_id: recipientId,
    actor_id: actorId,
    organization_id: organizationId,
    opportunity_id: opportunityId,
    booking_id: bookingId,
    membership_id: membershipId,
    kind,
    title,
    body,
    action_href: actionHref,
  });

  if (error) {
    console.error("Failed to create inbox message:", error.message);
  }
}

async function createInboxMessages(messages: InboxMessageInput[]) {
  if (messages.length === 0) return { success: true };

  const adminClient = createAdminClient();
  const { error } = await adminClient.from("inbox_messages").insert(
    messages.map((message) => ({
      recipient_id: message.recipientId,
      actor_id: message.actorId ?? null,
      organization_id: message.organizationId ?? null,
      opportunity_id: message.opportunityId ?? null,
      booking_id: message.bookingId ?? null,
      membership_id: message.membershipId ?? null,
      kind: message.kind,
      title: message.title,
      body: message.body,
      action_href: message.actionHref ?? null,
    }))
  );

  if (error) {
    return { error: error.message };
  }

  return { success: true };
}

function revalidateInbox() {
  revalidatePath("/dashboard", "layout");
  revalidatePath("/dashboard/volunteer/inbox");
  revalidatePath("/dashboard/admin/inbox");
  revalidatePath("/dashboard/organization/inbox");
}

function normalizeMessageText(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function normalizeMessageBody(value: string) {
  return value.trim();
}

function uniqueIds(ids: string[]) {
  return Array.from(new Set(ids.filter(Boolean)));
}

function clampSearchLimit(limit: number) {
  return Math.min(Math.max(limit || 25, 1), 50);
}

function getProfileName(profile: {
  first_name?: string | null;
  last_name?: string | null;
  email?: string | null;
}) {
  const name = `${profile.first_name ?? ""} ${profile.last_name ?? ""}`.trim();
  return name || profile.email || "Unnamed recipient";
}

function isSchemaCacheColumnError(error: { message?: string } | null) {
  return Boolean(
    error?.message?.includes("schema cache") ||
      error?.message?.includes("column") ||
      error?.message?.includes("must_reset_password")
  );
}

export async function submitOrganizationApplication(
  data: OrganizationApplicationInput
) {
  const parsed = organizationApplicationSchema.safeParse(data);

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const organizationDescription = normalizeOrganizationDescription(
    parsed.data.organization_description
  );

  if (!organizationDescription || organizationDescription.length < 20) {
    return { error: "Please share a short organization description" };
  }

  const supabase = await createClient();
  const adminClient = createAdminClient();

  const applicationPayload = {
    organization_name: parsed.data.organization_name,
    category: parsed.data.category,
    email: parsed.data.email,
    phone: parsed.data.phone?.trim() || null,
    website: parsed.data.website?.trim() || null,
    image_url: parsed.data.image_url?.trim() || null,
    organization_description: organizationDescription,
    reason: parsed.data.reason,
    status: "pending",
  };

  const { data: existingApplication } = await adminClient
    .from("organization_applications")
    .select("id")
    .eq("email", parsed.data.email)
    .in("status", ["pending", "contacted"])
    .maybeSingle();

  if (existingApplication) {
    return { error: "An organization application is already pending for this email" };
  }

  const { data: userData, error: createError } =
    await adminClient.auth.admin.createUser({
      email: parsed.data.email,
      password: parsed.data.password,
      email_confirm: true,
      user_metadata: {
        first_name: parsed.data.organization_name,
        last_name: "Admin",
        role: "organization",
        organization_name: parsed.data.organization_name,
      },
    });

  if (createError) {
    return { error: createError.message };
  }

  const userId = userData.user?.id;

  if (!userId) {
    return { error: "Unable to create organization account" };
  }

  const profilePayload = {
    id: userId,
    first_name: parsed.data.organization_name,
    last_name: "Admin",
    email: parsed.data.email,
    phone: parsed.data.phone?.trim() || null,
    role: "organization",
    status: "active",
    must_reset_password: false,
    updated_at: new Date().toISOString(),
  };

  let { error: profileError } = await adminClient
    .from("profiles")
    .upsert(profilePayload);

  if (profileError && isSchemaCacheColumnError(profileError)) {
    const legacyProfilePayload: Partial<typeof profilePayload> = {
      ...profilePayload,
    };
    delete legacyProfilePayload.must_reset_password;
    const { error: legacyProfileError } = await adminClient
      .from("profiles")
      .upsert(legacyProfilePayload);
    profileError = legacyProfileError;
  }

  if (profileError) {
    return { error: profileError.message };
  }

  const organizationPayload = {
    owner_id: userId,
    name: parsed.data.organization_name,
    category: parsed.data.category,
    description: organizationDescription,
    image_url: parsed.data.image_url?.trim() || null,
    website: parsed.data.website?.trim() || null,
    contact_email: parsed.data.email,
    contact_phone: parsed.data.phone?.trim() || null,
    visibility: "public",
    status: "inactive",
    updated_at: new Date().toISOString(),
  };

  let { error: organizationError } = await adminClient
    .from("organizations")
    .upsert(organizationPayload, { onConflict: "owner_id" });

  if (organizationError && isSchemaCacheColumnError(organizationError)) {
    const legacyOrganizationPayload: Partial<typeof organizationPayload> = {
      ...organizationPayload,
    };
    delete legacyOrganizationPayload.category;
    delete legacyOrganizationPayload.image_url;
    const { error: legacyOrganizationError } = await adminClient
      .from("organizations")
      .upsert(legacyOrganizationPayload, { onConflict: "owner_id" });
    organizationError = legacyOrganizationError;
  }

  if (organizationError) {
    return { error: organizationError.message };
  }

  let { error } = await adminClient
    .from("organization_applications")
    .insert(applicationPayload);

  if (error && isSchemaCacheColumnError(error)) {
    const legacyApplicationPayload: Partial<typeof applicationPayload> = {
      ...applicationPayload,
    };
    delete legacyApplicationPayload.category;
    delete legacyApplicationPayload.image_url;
    delete legacyApplicationPayload.organization_description;

    const { error: legacyApplicationError } = await adminClient
      .from("organization_applications")
      .insert(legacyApplicationPayload);
    error = legacyApplicationError;
  }

  if (error) {
    return { error: error.message };
  }

  const { error: signInError } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });

  if (signInError) {
    redirect("/application-submitted");
  }

  redirect("/dashboard/organization");
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
        volunteer_interests: parsed.data.volunteer_interests,
        volunteer_intro: parsed.data.volunteer_intro?.trim() || "",
        date_of_birth: parsed.data.date_of_birth || "",
      },
    });

  if (createError) {
    return { error: createError.message };
  }

  const userId = userData.user?.id;

  if (!userId) {
    return { error: "Unable to create volunteer account" };
  }

  const volunteerProfilePayload = {
    id: userId,
    first_name: parsed.data.first_name,
    last_name: parsed.data.last_name,
    email: parsed.data.email,
    phone: parsed.data.phone?.trim() || null,
    role: "volunteer",
    status: "active",
    must_reset_password: false,
    volunteer_interests: parsed.data.volunteer_interests,
    volunteer_intro: parsed.data.volunteer_intro?.trim() || null,
    date_of_birth: parsed.data.date_of_birth || null,
    updated_at: new Date().toISOString(),
  };

  let { error: profileError } = await adminClient
    .from("profiles")
    .upsert(volunteerProfilePayload);

  if (profileError && isSchemaCacheColumnError(profileError)) {
    const legacyProfilePayload: Partial<typeof volunteerProfilePayload> = {
      ...volunteerProfilePayload,
    };
    delete legacyProfilePayload.must_reset_password;
    delete legacyProfilePayload.volunteer_interests;
    delete legacyProfilePayload.volunteer_intro;
    delete legacyProfilePayload.date_of_birth;
    const { error: legacyProfileError } = await adminClient
      .from("profiles")
      .upsert(legacyProfilePayload);
    profileError = legacyProfileError;
  }

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

  redirect("/dashboard/volunteer");
}

export async function acceptOrganizationApplication(applicationId: string) {
  const reviewer = await requireAdmin();

  if (reviewer.role !== "admin") {
    return { error: "Only platform admins can approve organization accounts" };
  }

  const adminClient = createAdminClient();
  const supabase = await createClient();

  const { data: application, error: fetchError } = await supabase
    .from("organization_applications")
    .select("*")
    .eq("id", applicationId)
    .single();

  if (fetchError || !application) {
    return { error: "Application not found" };
  }

  const { user: foundUser, error: listError } = await findAuthUserByEmail(
    adminClient,
    application.email
  );

  if (listError) {
    return { error: listError.message };
  }

  let ownerId = foundUser?.id;

  if (!ownerId) {
    const { data: createData, error: createError } =
      await adminClient.auth.admin.createUser({
        email: application.email,
        email_confirm: true,
        user_metadata: {
          first_name: application.organization_name,
          last_name: "Admin",
          role: "organization",
          organization_name: application.organization_name,
        },
      });

    if (createError || !createData.user?.id) {
      return {
        error: createError?.message ?? "Failed to create organization account",
      };
    }

    ownerId = createData.user.id;
  }

  const { error: profileError } = await adminClient
    .from("profiles")
    .upsert({
      id: ownerId,
      first_name: application.organization_name,
      last_name: "Admin",
      email: application.email,
      phone: application.phone,
      role: "organization",
      status: "active",
      must_reset_password: !foundUser,
      updated_at: new Date().toISOString(),
    });

  if (profileError) {
    return { error: profileError.message };
  }

  const organizationPayload = {
      owner_id: ownerId,
      name: application.organization_name,
      category: application.category,
      description: normalizeOrganizationDescription(
        application.organization_description
      ),
      image_url: application.image_url,
      website: application.website,
      contact_email: application.email,
      contact_phone: application.phone,
      visibility: "public",
      status: "active",
      updated_at: new Date().toISOString(),
    };

  let { data: organization, error: organizationError } = await adminClient
    .from("organizations")
    .upsert(organizationPayload, { onConflict: "owner_id" })
    .select("id")
    .single();

  if (organizationError && isSchemaCacheColumnError(organizationError)) {
    const legacyOrganizationPayload: Partial<typeof organizationPayload> = {
      ...organizationPayload,
    };
    delete legacyOrganizationPayload.category;
    delete legacyOrganizationPayload.image_url;
    const legacyResult = await adminClient
      .from("organizations")
      .upsert(legacyOrganizationPayload, { onConflict: "owner_id" })
      .select("id")
      .single();
    organization = legacyResult.data;
    organizationError = legacyResult.error;
  }

  if (organizationError) {
    return { error: organizationError.message };
  }

  if (!organization) {
    return { error: "Organization record could not be activated" };
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

  if (!foundUser) {
    const redirectTo = getPasswordSetupRedirectUrl();
    const { error: resetEmailError } =
      await adminClient.auth.resetPasswordForEmail(application.email, {
        redirectTo,
      });

    if (resetEmailError) {
      if (isSupabaseMailerError(resetEmailError.message)) {
        const fallbackResult = await sendPasswordResetEmailFallback(
          application.email,
          redirectTo
        );

        if (fallbackResult.error) {
          return {
            error:
              "Organization was approved, but the password setup email failed to send.",
          };
        }

        console.warn(
          "Supabase password setup email failed; sent organization setup email through Resend fallback."
        );
      } else {
        return {
          error:
            "Organization was approved, but the password setup email failed to send.",
        };
      }
    }
  }

  await createInboxMessage({
    recipientId: ownerId,
    actorId: reviewer.id,
    organizationId: organization.id,
    kind: "membership_accepted",
    title: "Organization approved",
    body: "Your organization has been approved. You can now create opportunities and access the full organization dashboard.",
    actionHref: "/dashboard/organization",
  });

  revalidatePath("/dashboard/admin/applications");
  revalidatePath(`/dashboard/admin/applications/${applicationId}`);
  revalidatePath("/dashboard/admin/organizations");
  revalidatePath("/dashboard/organization");
  revalidateInbox();

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
  const adminClient = createAdminClient();

  const { data: application, error: fetchError } = await supabase
    .from("organization_applications")
    .select("*")
    .eq("id", applicationId)
    .single();

  if (fetchError || !application) {
    return { error: "Application not found" };
  }

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

  const { user: existingUser } = await findAuthUserByEmail(
    adminClient,
    application.email
  );

  if (existingUser) {
    await adminClient
      .from("profiles")
      .update({
        status: "suspended",
        updated_at: new Date().toISOString(),
      })
      .eq("id", existingUser.id);

    const { data: organization } = await adminClient
      .from("organizations")
      .update({
        status: "suspended",
        updated_at: new Date().toISOString(),
      })
      .eq("owner_id", existingUser.id)
      .select("id")
      .maybeSingle();

    await createInboxMessage({
      recipientId: existingUser.id,
      actorId: reviewer.id,
      organizationId: organization?.id ?? null,
      kind: "membership_rejected",
      title: "Organization application declined",
      body: "Your organization application was declined.",
      actionHref: "/dashboard/organization/inbox",
    });
  }

  revalidatePath("/dashboard/admin/applications");
  revalidatePath(`/dashboard/admin/applications/${applicationId}`);
  revalidatePath("/dashboard/admin/organizations");
  revalidateInbox();

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

  revalidatePath("/dashboard/admin/applications");
  revalidatePath(`/dashboard/admin/applications/${applicationId}`);

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

  const baseData = normalizeOpportunityFields(parsed.data);
  const { data: createdOpportunity, error } = await supabase
    .from("volunteer_opportunities")
    .insert({
      ...baseData,
      status,
      created_by: admin.id,
      organization_id: organization?.id ?? null,
    })
    .select("id")
    .single();

  if (error) {
    return { error: error.message };
  }

  if (baseData.recurring_frequency && baseData.recurring_until && createdOpportunity) {
    const { error: groupError } = await supabase
      .from("volunteer_opportunities")
      .update({
        recurring_group_id: createdOpportunity.id,
        updated_at: new Date().toISOString(),
      })
      .eq("id", createdOpportunity.id);

    if (groupError) {
      return { error: groupError.message };
    }

    const { error: recurrenceError } = await createRecurringOccurrences({
      supabase,
      groupId: createdOpportunity.id,
      baseData,
      status,
      adminId: admin.id,
      organizationId: organization?.id ?? null,
      skipOpportunityId: createdOpportunity.id,
    });

    if (recurrenceError) {
      return { error: recurrenceError };
    }
  }

  revalidatePath("/dashboard/admin/opportunities");
  revalidatePath("/dashboard/organization/opportunities");

  redirect(admin.role === "admin" ? "/dashboard/admin/opportunities" : "/dashboard/organization/opportunities");
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

  const ownershipFilter = admin.role === "admin"
    ? null
    : organization
    ? `organization_id.eq.${organization.id},created_by.eq.${admin.id}`
    : `created_by.eq.${admin.id}`;

  let fetchQuery = supabase
    .from("volunteer_opportunities")
    .select("id, title, status, organization_id, recurring_group_id")
    .eq("id", id);

  if (ownershipFilter) {
    fetchQuery = fetchQuery.or(ownershipFilter);
  }

  const { data: existingOpportunity, error: fetchError } =
    await fetchQuery.maybeSingle();

  if (fetchError) {
    return { error: fetchError.message };
  }

  if (!existingOpportunity) {
    return { error: "Opportunity not found" };
  }

  const baseData = normalizeOpportunityFields(parsed.data);
  const recurringGroupId =
    baseData.recurring_frequency && baseData.recurring_until
      ? existingOpportunity.recurring_group_id ?? id
      : null;

  let updateQuery = supabase
    .from("volunteer_opportunities")
    .update({
      ...baseData,
      status: parsed.data.status,
      recurring_group_id: recurringGroupId,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (ownershipFilter) {
    updateQuery = updateQuery.or(ownershipFilter);
  }

  const { error } = await updateQuery;

  if (error) {
    return { error: error.message };
  }

  if (recurringGroupId && baseData.recurring_frequency && baseData.recurring_until) {
    const { error: recurrenceError } = await createRecurringOccurrences({
      supabase,
      groupId: recurringGroupId,
      baseData,
      status: parsed.data.status,
      adminId: admin.id,
      organizationId: existingOpportunity.organization_id,
      skipOpportunityId: id,
    });

    if (recurrenceError) {
      return { error: recurrenceError };
    }
  }

  if (existingOpportunity.status === "published") {
    const adminClient = createAdminClient();
    const { data: registeredBookings } = await adminClient
      .from("bookings")
      .select("id, volunteer_id")
      .eq("opportunity_id", id)
      .in("status", ["pending", "approved"]);

    await Promise.all(
      (registeredBookings ?? []).map((booking) =>
        createInboxMessage({
          recipientId: booking.volunteer_id,
          actorId: admin.id,
          organizationId: existingOpportunity.organization_id,
          opportunityId: id,
          bookingId: booking.id,
          kind: "opportunity_updated",
          title: "Opportunity updated",
          body: "This opportunity has been updated. Check it out.",
          actionHref: "/dashboard/volunteer",
        })
      )
    );
  }

  revalidatePath("/dashboard/admin/opportunities");
  revalidatePath(`/dashboard/admin/opportunities/${id}/edit`);
  revalidatePath("/dashboard/organization/opportunities");
  revalidatePath(`/dashboard/organization/opportunities/${id}/edit`);
  revalidatePath("/dashboard/volunteer");
  revalidateInbox();

  redirect(admin.role === "admin" ? "/dashboard/admin/opportunities" : "/dashboard/organization/opportunities");
}

export async function deleteOpportunity(id: string) {
  const admin = await requireAdmin();

  const supabase = await createClient();

  const { organization } = await getOwnedOrganization(admin.id);
  let deleteQuery = supabase
    .from("volunteer_opportunities")
    .delete()
    .eq("id", id);

  if (admin.role === "organization") {
    deleteQuery = organization
      ? deleteQuery.eq("organization_id", organization.id)
      : deleteQuery.eq("created_by", admin.id);
  }

  const { error } = await deleteQuery;

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/dashboard/admin/opportunities");
  revalidatePath("/dashboard/organization/opportunities");

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
    .select("id, name, owner_id, status, visibility")
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

  if (existingMembership?.status === "accepted") {
    return { error: "You already joined this organization" };
  }

  if (existingMembership?.status === "pending") {
    return { error: "You already requested to join this organization" };
  }

  const nextStatus = organization.visibility === "private" ? "pending" : "accepted";
  const membershipPayload = {
    volunteer_note: volunteerNote?.trim() || null,
    status: nextStatus,
    admin_note: null,
    reviewed_by: nextStatus === "accepted" ? organization.owner_id : null,
    reviewed_at: nextStatus === "accepted" ? new Date().toISOString() : null,
    updated_at: new Date().toISOString(),
  };

  const membershipMutation = existingMembership
    ? await adminClient
        .from("organization_memberships")
        .update(membershipPayload)
        .eq("id", existingMembership.id)
        .select("id")
        .single()
    : await adminClient.from("organization_memberships").insert({
        ...membershipPayload,
        organization_id: organization.id,
        volunteer_id: profile.id,
      })
        .select("id")
        .single();

  const { data: savedMembership, error } = membershipMutation;

  if (error) {
    if (error.code === "23505") {
      return { error: "You already requested access to this organization" };
    }

    return { error: error.message };
  }

  if (nextStatus === "pending") {
    await createInboxMessage({
      recipientId: organization.owner_id,
      actorId: profile.id,
      organizationId: organization.id,
      membershipId: savedMembership?.id ?? existingMembership?.id ?? null,
      kind: "membership_requested",
      title: "New organization access request",
      body: `${profile.first_name} ${profile.last_name} requested access to ${organization.name}.`,
      actionHref: "/dashboard/organization/memberships",
    });
  }

  revalidatePath("/dashboard/volunteer/organizations");
  revalidatePath("/dashboard/organization/memberships");
  revalidateInbox();

  return { success: true, status: nextStatus };
}

export async function approveOrganizationMembership(membershipId: string) {
  const reviewer = await requireAdmin();
  const supabase = createAdminClient();

  const { data: membership, error: fetchError } = await supabase
    .from("organization_memberships")
    .select("id, volunteer_id, organization_id, organizations(name, owner_id)")
    .eq("id", membershipId)
    .single();

  if (fetchError || !membership) {
    return { error: "Membership request not found" };
  }

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

  const organization = Array.isArray(membership.organizations)
    ? membership.organizations[0]
    : membership.organizations;

  if (reviewer.role === "organization" && organization?.owner_id !== reviewer.id) {
    return { error: "You can only approve requests for your organization" };
  }

  await createInboxMessage({
    recipientId: membership.volunteer_id,
    actorId: reviewer.id,
    organizationId: membership.organization_id,
    membershipId: membership.id,
    kind: "membership_accepted",
    title: "Organization access accepted",
    body: `You were accepted to ${organization?.name ?? "this organization"}. You can now view its private opportunities.`,
    actionHref: `/dashboard/volunteer/organizations/${membership.organization_id}`,
  });

  revalidatePath("/dashboard/organization/memberships");
  revalidatePath("/dashboard/volunteer/organizations");
  revalidatePath("/dashboard/volunteer");
  revalidateInbox();

  return { success: true };
}

export async function rejectOrganizationMembership(
  membershipId: string,
  adminNote?: string
) {
  const reviewer = await requireAdmin();
  const supabase = createAdminClient();

  const { data: membership, error: fetchError } = await supabase
    .from("organization_memberships")
    .select("id, volunteer_id, organization_id, organizations(name, owner_id)")
    .eq("id", membershipId)
    .single();

  if (fetchError || !membership) {
    return { error: "Membership request not found" };
  }

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

  const organization = Array.isArray(membership.organizations)
    ? membership.organizations[0]
    : membership.organizations;

  if (reviewer.role === "organization" && organization?.owner_id !== reviewer.id) {
    return { error: "You can only reject requests for your organization" };
  }

  await createInboxMessage({
    recipientId: membership.volunteer_id,
    actorId: reviewer.id,
    organizationId: membership.organization_id,
    membershipId: membership.id,
    kind: "membership_rejected",
    title: "Organization access declined",
    body: `Your request to join ${organization?.name ?? "this organization"} was declined.`,
    actionHref: `/dashboard/volunteer/organizations/${membership.organization_id}`,
  });

  revalidatePath("/dashboard/organization/memberships");
  revalidatePath("/dashboard/volunteer/organizations");
  revalidateInbox();

  return { success: true };
}

export async function leaveOrganizationMembership(
  organizationId: string,
  confirmCancellation = false
) {
  const profile = await getCurrentUserProfile();

  if (!profile || profile.role !== "volunteer") {
    return { error: "You must be signed in as a volunteer" };
  }

  const supabase = createAdminClient();

  const { data: membership, error: fetchError } = await supabase
    .from("organization_memberships")
    .select("id, status, organizations!inner(id, visibility)")
    .eq("organization_id", organizationId)
    .eq("volunteer_id", profile.id)
    .in("status", ["pending", "accepted"])
    .maybeSingle();

  if (fetchError) {
    return { error: fetchError.message };
  }

  if (!membership) {
    return { error: "No active organization membership found" };
  }

  const organization = Array.isArray(membership.organizations)
    ? membership.organizations[0]
    : membership.organizations;

  const today = getAppDateString();
  const { data: upcomingBookings, error: upcomingError } = await supabase
    .from("bookings")
    .select(
      "id, status, volunteer_opportunities!inner(id, date, organization_id, visibility)"
    )
    .eq("volunteer_id", profile.id)
    .in("status", ["pending", "approved"])
    .eq("volunteer_opportunities.organization_id", organizationId)
    .gte("volunteer_opportunities.date", today);

  if (upcomingError) {
    return { error: upcomingError.message };
  }

  const bookingsToCancel = (upcomingBookings ?? []).filter((booking) => {
    const opportunity = Array.isArray(booking.volunteer_opportunities)
      ? booking.volunteer_opportunities[0]
      : booking.volunteer_opportunities;

    if (organization?.visibility === "public") {
      return booking.status === "pending" || opportunity?.visibility === "private";
    }

    return true;
  });
  const pendingRequestCount = bookingsToCancel.filter(
    (booking) => booking.status === "pending"
  ).length;
  const approvedRegistrationCount = bookingsToCancel.filter(
    (booking) => booking.status === "approved"
  ).length;

  if (
    membership.status === "accepted" &&
    bookingsToCancel.length > 0 &&
    !confirmCancellation
  ) {
    return {
      requiresConfirmation: true,
      upcomingRegistrationCount: bookingsToCancel.length,
      pendingRequestCount,
      approvedRegistrationCount,
    };
  }

  const upcomingBookingIds = bookingsToCancel.map((booking) => booking.id);

  if (upcomingBookingIds.length > 0) {
    const { error: bookingError } = await supabase
      .from("bookings")
      .update({
        status: "cancelled",
        cancelled_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .in("id", upcomingBookingIds);

    if (bookingError) {
      return { error: bookingError.message };
    }
  }

  const { error } = await supabase
    .from("organization_memberships")
    .delete()
    .eq("id", membership.id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/dashboard/volunteer");
  revalidatePath("/dashboard/volunteer/explore");
  revalidatePath("/dashboard/volunteer/organizations");
  revalidatePath(`/dashboard/volunteer/organizations/${organizationId}`);
  revalidatePath("/dashboard/organization/memberships");
  revalidatePath("/dashboard/organization/bookings");
  revalidatePath("/dashboard/organization/opportunities");
  revalidatePath("/dashboard/admin/opportunities");

  return { success: true };
}

export async function requestBooking(data: {
  opportunity_id: string;
  volunteer_note?: string;
}) {
  const profile = await getCurrentUserProfile();

  if (!profile || profile.role !== "volunteer" || profile.status !== "active") {
    return { error: "You must be an active volunteer to register for sessions" };
  }

  const parsed = bookingRequestSchema.safeParse(data);

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const supabase = await createClient();

  const { data: opportunity, error: oppError } = await supabase
    .from("volunteer_opportunities")
    .select("*, organizations(id, name, owner_id, visibility, status)")
    .eq("id", parsed.data.opportunity_id)
    .single();

  if (oppError || !opportunity) {
    return { error: "Opportunity not found" };
  }

  if (opportunity.status !== "published") {
    return { error: "This opportunity is not available for registration" };
  }

  const organization = Array.isArray(opportunity.organizations)
    ? opportunity.organizations[0]
    : opportunity.organizations;

  if (organization?.visibility === "private") {
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
          "You need to be accepted by this organization before registering for this opportunity",
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
    return { error: "You already have a registration for this session" };
  }

  const requestedStatus =
    opportunity.visibility === "public" ? "approved" : "pending";

  const { data: newBooking, error } = await supabase
    .from("bookings")
    .insert({
      opportunity_id: parsed.data.opportunity_id,
      volunteer_id: profile.id,
      volunteer_note: parsed.data.volunteer_note,
      status: requestedStatus,
      approved_at:
        requestedStatus === "approved" ? new Date().toISOString() : null,
    })
    .select("id")
    .single();

  if (error) {
    if (error.code === "23505") {
      return { error: "You already have a registration for this session" };
    }

    return { error: error.message };
  }

  if (requestedStatus === "pending" && organization?.owner_id && newBooking) {
    await createInboxMessage({
      recipientId: organization.owner_id,
      actorId: profile.id,
      organizationId: opportunity.organization_id,
      opportunityId: opportunity.id,
      bookingId: newBooking.id,
      kind: "booking_requested",
      title: "New registration request",
      body: `${profile.first_name} ${profile.last_name} requested ${opportunity.title}.`,
      actionHref: "/dashboard/organization/bookings",
    });
  }

  if (requestedStatus === "approved" && newBooking) {
    await createInboxMessage({
      recipientId: profile.id,
      actorId: organization?.owner_id ?? null,
      organizationId: opportunity.organization_id,
      opportunityId: opportunity.id,
      bookingId: newBooking.id,
      kind: "booking_approved",
      title: "Registration confirmed",
      body: `${opportunity.title} is confirmed for you.`,
      actionHref: "/dashboard/volunteer",
    });
  }

  revalidatePath("/dashboard/volunteer");
  revalidatePath("/dashboard/organization/bookings");
  revalidateInbox();

  return { success: true };
}

export async function approveBooking(bookingId: string, adminNote?: string) {
  const admin = await requireAdmin();

  const supabase = await createClient();

  const { data: booking, error: fetchError } = await supabase
    .from("bookings")
    .select("*, volunteer_opportunities(*, organizations(id, name, owner_id))")
    .eq("id", bookingId)
    .single();

  if (fetchError || !booking) {
    return { error: "Registration not found" };
  }

  if (booking.status !== "pending") {
    return { error: "Only pending registrations can be approved" };
  }

  const opportunity = Array.isArray(booking.volunteer_opportunities)
    ? booking.volunteer_opportunities[0]
    : booking.volunteer_opportunities;
  const organization = Array.isArray(opportunity.organizations)
    ? opportunity.organizations[0]
    : opportunity.organizations;

  if (admin.role === "organization" && organization?.owner_id !== admin.id) {
    return { error: "You can only approve registrations for your organization" };
  }

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

  await createInboxMessage({
    recipientId: booking.volunteer_id,
    actorId: admin.id,
    organizationId: opportunity.organization_id,
    opportunityId: booking.opportunity_id,
    bookingId: booking.id,
    kind: "booking_approved",
    title: "Registration request accepted",
    body: `${opportunity.title} was accepted${organization?.name ? ` by ${organization.name}` : ""}.`,
    actionHref: "/dashboard/volunteer",
  });

  revalidatePath("/dashboard/organization/bookings");
  revalidatePath("/dashboard/admin/opportunities");
  revalidatePath("/dashboard/organization/opportunities");
  revalidatePath(`/dashboard/organization/opportunities/${booking.opportunity_id}/edit`);
  revalidatePath("/dashboard/volunteer");
  revalidateInbox();

  return { success: true };
}

export async function assignVolunteerToOpportunity({
  opportunityId,
  volunteerId,
}: {
  opportunityId: string;
  volunteerId: string;
}) {
  const admin = await requireAdmin();

  if (admin.role !== "organization") {
    return { error: "Only organization accounts can assign volunteers" };
  }

  const adminClient = createAdminClient();
  const { data: opportunity, error: opportunityError } = await adminClient
    .from("volunteer_opportunities")
    .select("*, organizations(id, name, owner_id, status)")
    .eq("id", opportunityId)
    .single();

  if (opportunityError || !opportunity) {
    return { error: "Opportunity not found" };
  }

  const organization = Array.isArray(opportunity.organizations)
    ? opportunity.organizations[0]
    : opportunity.organizations;

  if (
    !organization ||
    organization.owner_id !== admin.id ||
    organization.status !== "active"
  ) {
    return { error: "You can only assign volunteers to your organization" };
  }

  const { data: volunteer } = await adminClient
    .from("profiles")
    .select("id, first_name, last_name, role, status")
    .eq("id", volunteerId)
    .eq("role", "volunteer")
    .eq("status", "active")
    .maybeSingle();

  if (!volunteer) {
    return { error: "Volunteer not found" };
  }

  const { data: membership } = await adminClient
    .from("organization_memberships")
    .select("id")
    .eq("organization_id", opportunity.organization_id)
    .eq("volunteer_id", volunteerId)
    .eq("status", "accepted")
    .maybeSingle();

  if (!membership) {
    return { error: "Volunteer is not a member of this organization" };
  }

  const { data: existingBooking } = await adminClient
    .from("bookings")
    .select("id, status")
    .eq("opportunity_id", opportunityId)
    .eq("volunteer_id", volunteerId)
    .in("status", ["pending", "approved"])
    .maybeSingle();

  if (existingBooking?.status === "approved") {
    return { error: "Volunteer is already registered for this opportunity" };
  }

  const { count: approvedCount } = await adminClient
    .from("bookings")
    .select("*", { count: "exact", head: true })
    .eq("opportunity_id", opportunityId)
    .eq("status", "approved");

  if ((approvedCount ?? 0) >= opportunity.max_volunteers) {
    return { error: "This opportunity is full" };
  }

  const now = new Date().toISOString();
  let bookingId = existingBooking?.id ?? null;
  let errorMessage: string | null = null;

  if (existingBooking?.status === "pending") {
    const { error } = await adminClient
      .from("bookings")
      .update({
        status: "approved",
        approved_by: admin.id,
        approved_at: now,
        updated_at: now,
      })
      .eq("id", existingBooking.id);

    errorMessage = error?.message ?? null;
  } else {
    const { data: booking, error } = await adminClient
      .from("bookings")
      .insert({
        opportunity_id: opportunityId,
        volunteer_id: volunteerId,
        status: "approved",
        approved_by: admin.id,
        approved_at: now,
      })
      .select("id")
      .single();

    bookingId = booking?.id ?? null;
    errorMessage = error?.message ?? null;
  }

  if (errorMessage) {
    return { error: errorMessage };
  }

  await createInboxMessage({
    recipientId: volunteerId,
    actorId: admin.id,
    organizationId: opportunity.organization_id,
    opportunityId,
    bookingId,
    kind: "booking_approved",
    title: "Assigned to opportunity",
    body: `${organization.name} assigned you to ${opportunity.title}.`,
    actionHref: "/dashboard/volunteer",
  });

  revalidatePath("/dashboard/organization");
  revalidatePath("/dashboard/organization/bookings");
  revalidatePath("/dashboard/organization/opportunities");
  revalidatePath(`/dashboard/organization/opportunities/${opportunityId}/edit`);
  revalidatePath("/dashboard/volunteer");
  revalidateInbox();

  return { success: true };
}

export async function checkInBooking(bookingId: string) {
  const admin = await requireAdmin();
  const adminClient = createAdminClient();

  const { data: booking, error: fetchError } = await adminClient
    .from("bookings")
    .select("id, status, opportunity_id, checked_in_at, volunteer_opportunities(*, organizations(id, owner_id))")
    .eq("id", bookingId)
    .single();

  if (fetchError || !booking) {
    return { error: "Registration not found" };
  }

  if (booking.status !== "approved") {
    return { error: "Only approved registrations can be checked in" };
  }

  if (booking.checked_in_at) {
    return { error: "Volunteer is already checked in" };
  }

  const opportunity = Array.isArray(booking.volunteer_opportunities)
    ? booking.volunteer_opportunities[0]
    : booking.volunteer_opportunities;
  const organization = Array.isArray(opportunity?.organizations)
    ? opportunity.organizations[0]
    : opportunity?.organizations;

  if (admin.role === "organization" && organization?.owner_id !== admin.id) {
    return { error: "You can only check in volunteers for your organization" };
  }

  const now = new Date().toISOString();
  const { error } = await adminClient
    .from("bookings")
    .update({
      checked_in_by: admin.id,
      checked_in_at: now,
      updated_at: now,
    })
    .eq("id", bookingId);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/dashboard/volunteer");
  revalidatePath("/dashboard/organization/bookings");
  revalidatePath("/dashboard/admin/opportunities");
  revalidatePath("/dashboard/organization/opportunities");
  revalidatePath(`/dashboard/organization/opportunities/${booking.opportunity_id}/edit`);
  revalidatePath(`/dashboard/admin/opportunities/${booking.opportunity_id}/edit`);

  return { success: true };
}

export async function cancelBookingCheckIn(bookingId: string) {
  const admin = await requireAdmin();
  const adminClient = createAdminClient();

  const { data: booking, error: fetchError } = await adminClient
    .from("bookings")
    .select("id, status, opportunity_id, checked_in_at, volunteer_opportunities(*, organizations(id, owner_id))")
    .eq("id", bookingId)
    .single();

  if (fetchError || !booking) {
    return { error: "Registration not found" };
  }

  if (booking.status !== "approved") {
    return { error: "Only approved registrations can have check-in changed" };
  }

  if (!booking.checked_in_at) {
    return { error: "Volunteer is not checked in" };
  }

  const opportunity = Array.isArray(booking.volunteer_opportunities)
    ? booking.volunteer_opportunities[0]
    : booking.volunteer_opportunities;
  const organization = Array.isArray(opportunity?.organizations)
    ? opportunity.organizations[0]
    : opportunity?.organizations;

  if (admin.role === "organization" && organization?.owner_id !== admin.id) {
    return { error: "You can only update check-ins for your organization" };
  }

  const { error } = await adminClient
    .from("bookings")
    .update({
      checked_in_by: null,
      checked_in_at: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", bookingId);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/dashboard/volunteer");
  revalidatePath("/dashboard/organization/bookings");
  revalidatePath("/dashboard/admin/opportunities");
  revalidatePath("/dashboard/organization/opportunities");
  revalidatePath(`/dashboard/organization/opportunities/${booking.opportunity_id}/edit`);
  revalidatePath(`/dashboard/admin/opportunities/${booking.opportunity_id}/edit`);

  return { success: true };
}

export async function checkInAllBookingsForOpportunity(opportunityId: string) {
  const admin = await requireAdmin();
  const adminClient = createAdminClient();

  const { data: opportunity, error: opportunityError } = await adminClient
    .from("volunteer_opportunities")
    .select("id, organizations(id, owner_id)")
    .eq("id", opportunityId)
    .single();

  if (opportunityError || !opportunity) {
    return { error: "Opportunity not found" };
  }

  const organization = Array.isArray(opportunity.organizations)
    ? opportunity.organizations[0]
    : opportunity.organizations;

  if (admin.role === "organization" && organization?.owner_id !== admin.id) {
    return { error: "You can only check in volunteers for your organization" };
  }

  const now = new Date().toISOString();
  const { data: checkedInBookings, error } = await adminClient
    .from("bookings")
    .update({
      checked_in_by: admin.id,
      checked_in_at: now,
      updated_at: now,
    })
    .eq("opportunity_id", opportunityId)
    .eq("status", "approved")
    .is("checked_in_at", null)
    .select("id");

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/dashboard/volunteer");
  revalidatePath("/dashboard/organization/bookings");
  revalidatePath("/dashboard/admin/opportunities");
  revalidatePath("/dashboard/organization/opportunities");
  revalidatePath(`/dashboard/organization/opportunities/${opportunityId}/edit`);
  revalidatePath(`/dashboard/admin/opportunities/${opportunityId}/edit`);

  return {
    success: true,
    count: checkedInBookings?.length ?? 0,
  };
}

export async function rejectBooking(bookingId: string, adminNote?: string) {
  const admin = await requireAdmin();

  const supabase = await createClient();

  const { data: booking, error: fetchError } = await supabase
    .from("bookings")
    .select("id, status, opportunity_id, volunteer_id, volunteer_opportunities(*, organizations(id, name, owner_id))")
    .eq("id", bookingId)
    .single();

  if (fetchError || !booking) {
    return { error: "Registration not found" };
  }

  if (booking.status !== "pending") {
    return { error: "Only pending registrations can be rejected" };
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

  const opportunity = Array.isArray(booking.volunteer_opportunities)
    ? booking.volunteer_opportunities[0]
    : booking.volunteer_opportunities;
  const organization = Array.isArray(opportunity?.organizations)
    ? opportunity.organizations[0]
    : opportunity?.organizations;

  if (admin.role === "organization" && organization?.owner_id !== admin.id) {
    return { error: "You can only reject registrations for your organization" };
  }

  await createInboxMessage({
    recipientId: booking.volunteer_id,
    actorId: admin.id,
    organizationId: opportunity?.organization_id ?? null,
    opportunityId: booking.opportunity_id,
    bookingId: booking.id,
    kind: "booking_rejected",
    title: "Registration request declined",
    body: `${opportunity?.title ?? "Your registration request"} was declined${organization?.name ? ` by ${organization.name}` : ""}.`,
    actionHref: "/dashboard/volunteer",
  });

  revalidatePath("/dashboard/organization/bookings");
  revalidatePath("/dashboard/admin/opportunities");
  revalidatePath("/dashboard/organization/opportunities");
  revalidatePath(`/dashboard/organization/opportunities/${booking.opportunity_id}/edit`);
  revalidatePath("/dashboard/volunteer");
  revalidateInbox();

  return { success: true };
}

export async function cancelBooking(bookingId: string) {
  const profile = await getCurrentUserProfile();

  if (!profile) {
    return { error: "Not authenticated" };
  }

  const supabase = createAdminClient();

  const { data: booking, error: fetchError } = await supabase
    .from("bookings")
    .select("*, volunteer_opportunities(*, organizations(id, owner_id))")
    .eq("id", bookingId)
    .single();

  if (fetchError || !booking) {
    return { error: "Registration not found" };
  }

  const isOwner = booking.volunteer_id === profile.id;
  const isAdminUser =
    profile.role === "organization" || profile.role === "admin";

  if (!isOwner && !isAdminUser) {
    return { error: "Not authorized" };
  }

  const opportunity = Array.isArray(booking.volunteer_opportunities)
    ? booking.volunteer_opportunities[0]
    : booking.volunteer_opportunities;
  const organization = Array.isArray(opportunity?.organizations)
    ? opportunity.organizations[0]
    : opportunity?.organizations;

  if (profile.role === "organization" && organization?.owner_id !== profile.id) {
    return { error: "You can only cancel registrations for your organization" };
  }

  if (!["pending", "approved"].includes(booking.status)) {
    return { error: "This registration cannot be cancelled" };
  }

  if (isOwner && !isAdminUser) {
    if (!opportunity) {
      return { error: "Opportunity not found" };
    }

    const sessionStart = new Date(
      `${opportunity.date}T${opportunity.start_time}`
    );

    if (sessionStart < new Date()) {
      return { error: "Past registrations cannot be cancelled" };
    }

    const hoursUntil = (sessionStart.getTime() - Date.now()) / (1000 * 60 * 60);

    if (hoursUntil < 24) {
      return {
        error: "Registrations can only be cancelled up to 24 hours before the session",
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

  revalidatePath("/dashboard/volunteer");
  revalidatePath("/dashboard/organization/bookings");
  revalidatePath("/dashboard/admin/opportunities");
  revalidatePath("/dashboard/organization/opportunities");
  revalidatePath(`/dashboard/organization/opportunities/${booking.opportunity_id}/edit`);

  return { success: true };
}

export async function searchOrganizationMessageReceivers({
  query = "",
  offset = 0,
  limit = 25,
}: {
  query?: string;
  offset?: number;
  limit?: number;
}) {
  const profile = await getCurrentUserProfile();

  if (!profile || profile.role !== "organization") {
    return { error: "Only organization accounts can search recipients" };
  }

  const { organization, error: organizationError } = await getOwnedOrganization(
    profile.id
  );

  if (organizationError) {
    return { error: organizationError.message };
  }

  if (!organization) {
    return { error: "No active organization found" };
  }

  const adminClient = createAdminClient();
  const pageSize = clampSearchLimit(limit);
  const safeOffset = Math.max(offset, 0);
  const normalizedQuery = query.trim();
  let receiverQuery = adminClient
    .from("profiles")
    .select(
      "id, first_name, last_name, email, organization_memberships!organization_memberships_volunteer_id_fkey!inner(organization_id, status)"
    )
    .eq("role", "volunteer")
    .eq("status", "active")
    .eq("organization_memberships.organization_id", organization.id)
    .eq("organization_memberships.status", "accepted")
    .order("first_name", { ascending: true })
    .range(safeOffset, safeOffset + pageSize);

  if (normalizedQuery) {
    const escaped = normalizedQuery.replace(/[%_]/g, "\\$&");
    receiverQuery = receiverQuery.or(
      `first_name.ilike.%${escaped}%,last_name.ilike.%${escaped}%,email.ilike.%${escaped}%`
    );
  }

  const { data, error } = await receiverQuery;

  if (error) {
    return { error: error.message };
  }

  const receivers: InboxReceiverOption[] = (data ?? [])
    .slice(0, pageSize)
    .map((receiver) => ({
      id: receiver.id,
      name: getProfileName(receiver),
      email: receiver.email,
      detail: "Volunteer",
    }));

  return {
    receivers,
    hasMore: (data ?? []).length > pageSize,
  };
}

export async function searchAdminMessageReceivers({
  receiverType = "volunteers",
  query = "",
  offset = 0,
  limit = 25,
}: {
  receiverType?: "volunteers" | "organizations" | "both";
  query?: string;
  offset?: number;
  limit?: number;
}) {
  const profile = await getCurrentUserProfile();

  if (!profile || profile.role !== "admin") {
    return { error: "Only platform admins can search recipients" };
  }

  const adminClient = createAdminClient();
  const pageSize = clampSearchLimit(limit);
  const safeOffset = Math.max(offset, 0);
  const normalizedQuery = query.trim();
  const escaped = normalizedQuery.replace(/[%_]/g, "\\$&");
  const searchProfiles = receiverType === "volunteers" || receiverType === "both";
  const searchOrganizations =
    receiverType === "organizations" || receiverType === "both";

  const [volunteerResult, organizationResult] = await Promise.all([
    searchProfiles
      ? (() => {
          let queryBuilder = adminClient
            .from("profiles")
            .select("id, first_name, last_name, email")
            .eq("role", "volunteer")
            .eq("status", "active")
            .order("first_name", { ascending: true })
            .range(safeOffset, safeOffset + pageSize);

          if (normalizedQuery) {
            queryBuilder = queryBuilder.or(
              `first_name.ilike.%${escaped}%,last_name.ilike.%${escaped}%,email.ilike.%${escaped}%`
            );
          }

          return queryBuilder;
        })()
      : Promise.resolve({ data: [], error: null }),
    searchOrganizations
      ? (() => {
          let queryBuilder = adminClient
            .from("organizations")
            .select(
              "id, name, contact_email, owner_id, profiles!organizations_owner_id_fkey(id, first_name, last_name, email, status)"
            )
            .eq("status", "active")
            .eq("profiles.status", "active")
            .order("name", { ascending: true })
            .range(safeOffset, safeOffset + pageSize);

          if (normalizedQuery) {
            queryBuilder = queryBuilder.or(
              `name.ilike.%${escaped}%,contact_email.ilike.%${escaped}%`
            );
          }

          return queryBuilder;
        })()
      : Promise.resolve({ data: [], error: null }),
  ]);

  if (volunteerResult.error) {
    return { error: volunteerResult.error.message };
  }

  if (organizationResult.error) {
    return { error: organizationResult.error.message };
  }

  const volunteerReceivers: InboxReceiverOption[] = (
    volunteerResult.data ?? []
  )
    .slice(0, pageSize)
    .map((receiver) => ({
      id: receiver.id,
      name: getProfileName(receiver),
      email: receiver.email,
      detail: "Volunteer",
    }));
  const organizationReceivers: InboxReceiverOption[] = (
    organizationResult.data ?? []
  )
    .slice(0, pageSize)
    .map((organization) => {
      const owner = Array.isArray(organization.profiles)
        ? organization.profiles[0]
        : organization.profiles;

      return {
        id: organization.owner_id,
        name: organization.name,
        email: owner?.email ?? organization.contact_email,
        detail: "Organization",
      };
    });
  const receivers =
    receiverType === "both"
      ? [...volunteerReceivers, ...organizationReceivers]
      : receiverType === "organizations"
        ? organizationReceivers
        : volunteerReceivers;

  return {
    receivers,
    hasMore:
      (volunteerResult.data ?? []).length > pageSize ||
      (organizationResult.data ?? []).length > pageSize,
  };
}

export async function sendOrganizationInboxMessage(data: {
  receiverIds: string[];
  title: string;
  body: string;
}) {
  const profile = await getCurrentUserProfile();

  if (!profile || profile.role !== "organization") {
    return { error: "Only organization accounts can send messages" };
  }

  const { organization, error: organizationError } = await getOwnedOrganization(
    profile.id
  );

  if (organizationError) {
    return { error: organizationError.message };
  }

  if (!organization) {
    return { error: "No active organization found" };
  }

  const title = normalizeMessageText(data.title);
  const body = normalizeMessageBody(data.body);
  const receiverIds = uniqueIds(data.receiverIds);

  if (!title) return { error: "Message title is required" };
  if (!body) return { error: "Message is required" };
  if (receiverIds.length === 0) return { error: "Select at least one recipient" };

  const adminClient = createAdminClient();
  const { data: eligibleRows, error } = await adminClient
    .from("organization_memberships")
    .select("volunteer_id")
    .eq("organization_id", organization.id)
    .eq("status", "accepted")
    .in("volunteer_id", receiverIds);

  if (error) {
    return { error: error.message };
  }

  const eligibleIds = new Set(
    (eligibleRows ?? []).map((membership) => membership.volunteer_id)
  );
  const invalidCount = receiverIds.filter((id) => !eligibleIds.has(id)).length;

  if (invalidCount > 0) {
    return { error: "One or more recipients are not accepted members" };
  }

  const result = await createInboxMessages(
    receiverIds.map((receiverId) => ({
      recipientId: receiverId,
      actorId: profile.id,
      organizationId: organization.id,
      kind: "direct_message",
      title,
      body,
      actionHref: "/dashboard/volunteer/inbox",
    }))
  );

  if (result.error) return result;

  revalidateInbox();
  return { success: true, sentCount: receiverIds.length };
}

export async function sendAdminInboxMessage(data: {
  receiverIds: string[];
  title: string;
  body: string;
}) {
  const profile = await getCurrentUserProfile();

  if (!profile || profile.role !== "admin") {
    return { error: "Only platform admins can send messages" };
  }

  const title = normalizeMessageText(data.title);
  const body = normalizeMessageBody(data.body);
  const receiverIds = uniqueIds(data.receiverIds);

  if (!title) return { error: "Message title is required" };
  if (!body) return { error: "Message is required" };
  if (receiverIds.length === 0) return { error: "Select at least one recipient" };

  const adminClient = createAdminClient();
  const { data: activeProfiles, error } = await adminClient
    .from("profiles")
    .select("id, role")
    .in("id", receiverIds)
    .in("role", ["volunteer", "organization"])
    .eq("status", "active");

  if (error) {
    return { error: error.message };
  }

  const eligibleIds = new Set((activeProfiles ?? []).map((item) => item.id));
  const invalidCount = receiverIds.filter((id) => !eligibleIds.has(id)).length;

  if (invalidCount > 0) {
    return { error: "One or more recipients are not active users" };
  }

  const result = await createInboxMessages(
    receiverIds.map((receiverId) => ({
      recipientId: receiverId,
      actorId: profile.id,
      kind: "direct_message",
      title,
      body,
      actionHref: "/dashboard",
    }))
  );

  if (result.error) return result;

  revalidateInbox();
  return { success: true, sentCount: receiverIds.length };
}

export async function markInboxMessageRead(messageId: string, read = true) {
  const profile = await getCurrentUserProfile();

  if (!profile) {
    return { error: "Not authenticated" };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("inbox_messages")
    .update({
      read_at: read ? new Date().toISOString() : null,
    })
    .eq("id", messageId)
    .eq("recipient_id", profile.id)
    .is("deleted_at", null);

  if (error) {
    return { error: error.message };
  }

  revalidateInbox();

  return { success: true };
}

export async function markAllInboxMessagesRead() {
  const profile = await getCurrentUserProfile();

  if (!profile) {
    return { error: "Not authenticated" };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("inbox_messages")
    .update({
      read_at: new Date().toISOString(),
    })
    .eq("recipient_id", profile.id)
    .is("read_at", null)
    .is("deleted_at", null);

  if (error) {
    return { error: error.message };
  }

  revalidateInbox();

  return { success: true };
}

export async function deleteInboxMessages(messageIds: string[]) {
  const profile = await getCurrentUserProfile();

  if (!profile) {
    return { error: "Not authenticated" };
  }

  const ids = messageIds.filter(Boolean);

  if (ids.length === 0) {
    return { error: "Select at least one message" };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("inbox_messages")
    .delete()
    .eq("recipient_id", profile.id)
    .in("id", ids);

  if (error) {
    return { error: error.message };
  }

  revalidateInbox();

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

  if (profile.role === "volunteer" && !parsed.data.date_of_birth?.trim()) {
    return { error: "Date of birth is required" };
  }

  const supabase = await createClient();

  const profileUpdatePayload = {
    first_name: parsed.data.first_name,
    last_name: parsed.data.last_name,
    phone: parsed.data.phone?.trim() || null,
    ...(profile.role === "volunteer"
      ? {
          volunteer_interests: parsed.data.volunteer_interests ?? [],
          volunteer_intro: parsed.data.volunteer_intro?.trim() || null,
          date_of_birth: parsed.data.date_of_birth || null,
        }
      : {}),
    updated_at: new Date().toISOString(),
  };

  let { error } = await supabase
    .from("profiles")
    .update(profileUpdatePayload)
    .eq("id", profile.id);

  if (error && isSchemaCacheColumnError(error)) {
    const legacyProfileUpdatePayload: Partial<typeof profileUpdatePayload> = {
      ...profileUpdatePayload,
    };
    delete legacyProfileUpdatePayload.volunteer_interests;
    delete legacyProfileUpdatePayload.volunteer_intro;
    delete legacyProfileUpdatePayload.date_of_birth;

    const { error: legacyError } = await supabase
      .from("profiles")
      .update(legacyProfileUpdatePayload)
      .eq("id", profile.id);
    error = legacyError;
  }

  if (error) {
    return { error: error.message };
  }

  const metadata =
    profile.role === "volunteer"
      ? {
          first_name: parsed.data.first_name,
          last_name: parsed.data.last_name,
          volunteer_interests: parsed.data.volunteer_interests ?? [],
          volunteer_intro: parsed.data.volunteer_intro?.trim() || "",
          date_of_birth: parsed.data.date_of_birth || "",
        }
      : {
          first_name: parsed.data.first_name,
          last_name: parsed.data.last_name,
        };

  const { error: metadataError } = await supabase.auth.updateUser({
    data: metadata,
  });

  if (metadataError) {
    return { error: metadataError.message };
  }

  revalidatePath("/dashboard/volunteer/profile");
  revalidatePath("/dashboard/volunteer/organizations");

  return { success: true };
}

export async function updateOrganizationSettings(data: OrganizationSettingsInput) {
  const admin = await requireAdmin();

  if (admin.role !== "organization") {
    return { error: "Only organization accounts can update organization settings" };
  }

  const parsed = organizationSettingsSchema.safeParse(data);

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const organizationDescription = normalizeOrganizationDescription(
    parsed.data.description
  );

  if (!organizationDescription || organizationDescription.length < 20) {
    return { error: "Please share a short organization description" };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("organizations")
    .update({
      name: parsed.data.name,
      category: parsed.data.category,
      description: organizationDescription,
      website: parsed.data.website?.trim() || null,
      contact_email: parsed.data.contact_email,
      contact_phone: parsed.data.contact_phone?.trim() || null,
      image_url: parsed.data.image_url?.trim() || null,
      visibility: parsed.data.visibility,
      updated_at: new Date().toISOString(),
    })
    .eq("owner_id", admin.id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/dashboard/organization/profile");
  revalidatePath("/dashboard/organization");
  revalidatePath("/dashboard/volunteer/organizations");

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

  revalidatePath("/dashboard/admin/volunteers");
  revalidatePath(`/dashboard/admin/volunteers/${volunteerId}`);

  return { success: true };
}

export async function updateProfileByAdmin(
  profileId: string,
  data: ProfileUpdateInput
) {
  const admin = await requireAdmin();

  if (admin.role !== "admin") {
    return { error: "Only platform admins can update user profiles" };
  }

  const parsed = profileUpdateSchema.safeParse(data);

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const adminClient = createAdminClient();
  const adminProfileUpdatePayload = {
    first_name: parsed.data.first_name,
    last_name: parsed.data.last_name,
    phone: parsed.data.phone?.trim() || null,
    volunteer_interests: parsed.data.volunteer_interests ?? [],
    volunteer_intro: parsed.data.volunteer_intro?.trim() || null,
    date_of_birth: parsed.data.date_of_birth || null,
    updated_at: new Date().toISOString(),
  };

  let { error } = await adminClient
    .from("profiles")
    .update(adminProfileUpdatePayload)
    .eq("id", profileId);

  if (error && isSchemaCacheColumnError(error)) {
    const legacyAdminProfileUpdatePayload: Partial<
      typeof adminProfileUpdatePayload
    > = {
      ...adminProfileUpdatePayload,
    };
    delete legacyAdminProfileUpdatePayload.volunteer_interests;
    delete legacyAdminProfileUpdatePayload.volunteer_intro;
    delete legacyAdminProfileUpdatePayload.date_of_birth;

    const { error: legacyError } = await adminClient
      .from("profiles")
      .update(legacyAdminProfileUpdatePayload)
      .eq("id", profileId);
    error = legacyError;
  }

  if (error) {
    return { error: error.message };
  }

  await adminClient.auth.admin.updateUserById(profileId, {
    user_metadata: {
      first_name: parsed.data.first_name,
      last_name: parsed.data.last_name,
      volunteer_interests: parsed.data.volunteer_interests ?? [],
      volunteer_intro: parsed.data.volunteer_intro?.trim() || "",
      date_of_birth: parsed.data.date_of_birth || "",
    },
  });

  revalidatePath("/dashboard/admin/volunteers");
  revalidatePath(`/dashboard/admin/volunteers/${profileId}`);

  return { success: true };
}

export async function updateOrganizationByAdmin(
  organizationId: string,
  data: OrganizationSettingsInput
) {
  const admin = await requireAdmin();

  if (admin.role !== "admin") {
    return { error: "Only platform admins can update organization profiles" };
  }

  const parsed = organizationSettingsSchema.safeParse(data);

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const organizationDescription = normalizeOrganizationDescription(
    parsed.data.description
  );

  if (!organizationDescription || organizationDescription.length < 20) {
    return { error: "Please share a short organization description" };
  }

  const adminClient = createAdminClient();
  const { error } = await adminClient
    .from("organizations")
    .update({
      name: parsed.data.name,
      category: parsed.data.category,
      description: organizationDescription,
      website: parsed.data.website?.trim() || null,
      contact_email: parsed.data.contact_email,
      contact_phone: parsed.data.contact_phone?.trim() || null,
      image_url: parsed.data.image_url?.trim() || null,
      visibility: parsed.data.visibility,
      updated_at: new Date().toISOString(),
    })
    .eq("id", organizationId);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/dashboard/admin/organizations");
  revalidatePath(`/dashboard/admin/organizations/${organizationId}`);
  revalidatePath("/dashboard/volunteer/organizations");

  return { success: true };
}

export async function updateOrganizationStatus(
  organizationId: string,
  status: "active" | "inactive" | "suspended"
) {
  const admin = await requireAdmin();

  if (admin.role !== "admin") {
    return { error: "Only platform admins can update organization status" };
  }

  const adminClient = createAdminClient();
  const { data: organization } = await adminClient
    .from("organizations")
    .select("owner_id")
    .eq("id", organizationId)
    .single();

  const { error } = await adminClient
    .from("organizations")
    .update({
      status,
      updated_at: new Date().toISOString(),
    })
    .eq("id", organizationId);

  if (error) {
    return { error: error.message };
  }

  if (organization?.owner_id) {
    await adminClient
      .from("profiles")
      .update({
        status,
        updated_at: new Date().toISOString(),
      })
      .eq("id", organization.owner_id);
  }

  revalidatePath("/dashboard/admin/organizations");
  revalidatePath(`/dashboard/admin/organizations/${organizationId}`);
  revalidatePath("/dashboard/volunteer/organizations");

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

  if (profile.role === "admin") {
    if (safePath?.startsWith("/dashboard/admin")) {
      redirect(safePath);
    }

    redirect("/dashboard/admin");
  }

  if (profile.role === "organization") {
    if (safePath?.startsWith("/dashboard/organization")) {
      redirect(safePath);
    }

    redirect("/dashboard/organization");
  }

  if (safePath?.startsWith("/dashboard/volunteer")) {
    redirect(safePath);
  }

  redirect("/dashboard/volunteer");
}

export async function requestPasswordReset(email: string) {
  const parsed = forgotPasswordSchema.safeParse({ email });

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const supabase = await createClient();
  const redirectTo = getPasswordSetupRedirectUrl();

  const { error } = await supabase.auth.resetPasswordForEmail(
    parsed.data.email,
    {
      redirectTo,
    }
  );

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
