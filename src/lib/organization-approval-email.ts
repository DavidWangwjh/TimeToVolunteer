import { Resend } from "resend";

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => {
    const entities: Record<string, string> = {
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
    };
    return entities[character];
  });
}

export async function sendNewOrganizationApplicationEmail(application: {
  id: string;
  organization_name: string;
}, submissionVersion?: string) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (!apiKey || !from || !appUrl) {
    return { error: "Application notification email configuration is missing." };
  }

  try {
    const reviewUrl = new URL(`/dashboard/admin/applications/${application.id}`, appUrl);
    if (!["https:", "http:"].includes(reviewUrl.protocol)) {
      return { error: "Application notification app URL is invalid." };
    }
    const isDevelopment = process.env.APP_ENV === "development" || reviewUrl.hostname === "localhost";
    const prefix = isDevelopment ? "[Development] " : "";
    const resend = new Resend(apiKey);
    const { error } = await resend.emails.send({
      from,
      to: "support@timetovolunteer.org",
      subject: `${prefix}New organization application on TimeToVolunteer`,
      text: `${prefix}A new organization application is ready for review.\n\nOrganization: ${application.organization_name}\n\nReview application: ${reviewUrl}`,
      html: `
        <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #0f172a;">
          <h1 style="font-size: 24px;">${prefix}New organization application</h1>
          <p>${escapeHtml(application.organization_name)} has submitted an application to TimeToVolunteer.</p>
          <p>Sign in as an admin to review the application.</p>
          <p><a href="${escapeHtml(reviewUrl.toString())}" style="display: inline-block; background: #047857; color: #ffffff; padding: 12px 16px; border-radius: 8px; text-decoration: none; font-weight: 700;">Review application</a></p>
        </div>
      `,
    }, { idempotencyKey: `organization-application/${application.id}${submissionVersion ? `/${submissionVersion}` : ""}` });
    return error ? { error: error.message } : { success: true };
  } catch {
    return { error: "Application notification email could not be sent." };
  }
}

export async function sendOrganizationRejectionEmail(application: {
  id: string;
  email: string;
  organization_name: string;
  updated_at?: string;
}, reason: string) {
  const rejectionReason = typeof reason === "string" ? reason.trim() : "";
  if (!rejectionReason || rejectionReason.length > 2000) {
    return { error: "A rejection reason between 1 and 2,000 characters is required." };
  }
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL;
  if (!apiKey || !from) {
    return { error: "Rejection email configuration is missing." };
  }

  try {
    const resend = new Resend(apiKey);
    const { error } = await resend.emails.send({
      from,
      to: application.email,
      replyTo: "support@timetovolunteer.org",
      subject: "Your TimeToVolunteer organization application",
      text: `Thank you for applying to TimeToVolunteer on behalf of ${application.organization_name}.\n\nAfter reviewing your application, we are unable to approve it at this time.\n\nReason for rejection:\n${rejectionReason}\n\nIf you have questions, please reply to this email or contact support@timetovolunteer.org.\n\nThank you for your interest in supporting volunteers in your community.`,
      html: `
        <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #0f172a;">
          <h1 style="font-size: 24px;">An update on your application</h1>
          <p>Thank you for applying to TimeToVolunteer on behalf of ${escapeHtml(application.organization_name)}.</p>
          <p>After reviewing your application, we are unable to approve it at this time.</p>
          <p><strong>Reason for rejection:</strong><br />${escapeHtml(rejectionReason).replace(/\r?\n/g, "<br />")}</p>
          <p>If you have questions, please reply to this email or contact <a href="mailto:support@timetovolunteer.org">support@timetovolunteer.org</a>.</p>
          <p>Thank you for your interest in supporting volunteers in your community.</p>
        </div>
      `,
    }, { idempotencyKey: `organization-rejected/${application.id}${application.updated_at ? `/${application.updated_at}` : ""}` });
    return error ? { error: error.message } : { success: true };
  } catch {
    return { error: "Rejection email could not be sent." };
  }
}

export async function sendOrganizationApprovalEmail(application: {
  id: string;
  email: string;
  organization_name: string;
  updated_at?: string;
}) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;

  if (!apiKey || !from || !appUrl) {
    return { error: "Approval email configuration is missing." };
  }

  try {
    const dashboardUrl = new URL("/dashboard/organization", appUrl);
    if (!["https:", "http:"].includes(dashboardUrl.protocol)) {
      return { error: "Approval email app URL is invalid." };
    }
    const name = escapeHtml(application.organization_name);
    const url = escapeHtml(dashboardUrl.toString());
    const resend = new Resend(apiKey);
    const { error } = await resend.emails.send({
      from,
      to: application.email,
      subject: "Your organization is approved on TimeToVolunteer",
      text: `${application.organization_name} has been approved on TimeToVolunteer!\n\nYou can now create volunteer opportunities, review registrations, and manage your organization.\n\nSign in to your organization dashboard: ${dashboardUrl}\n\nIf you need to set up your password, use your separate password setup email or select Forgot password on the sign-in page.`,
      html: `
        <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #0f172a;">
          <h1 style="font-size: 24px;">Your organization is approved!</h1>
          <p>${name} has been approved on TimeToVolunteer.</p>
          <p>You can now create volunteer opportunities, review registrations, and manage your organization.</p>
          <p><a href="${url}" style="display: inline-block; background: #047857; color: #ffffff; padding: 12px 16px; border-radius: 8px; text-decoration: none; font-weight: 700;">Open organization dashboard</a></p>
          <p>If you need to set up your password, use your separate password setup email or select Forgot password on the sign-in page.</p>
        </div>
      `,
    }, { idempotencyKey: `organization-approved/${application.id}${application.updated_at ? `/${application.updated_at}` : ""}` });

    return error ? { error: error.message } : { success: true };
  } catch {
    return { error: "Approval email could not be sent." };
  }
}
