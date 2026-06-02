import { Resend } from "resend";

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

const fromEmail = process.env.RESEND_FROM_EMAIL ?? "TimeToVolunteer <onboarding@resend.dev>";
const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

export async function sendBookingApprovedEmail(params: {
  email: string;
  volunteerName: string;
  opportunityTitle: string;
  date: string;
  startTime: string;
  endTime: string;
  location: string;
  notes?: string;
}) {
  if (!resend) {
    console.warn("Resend not configured — skipping booking approved email");
    return { success: false, error: "Email service not configured" };
  }

  try {
    await resend.emails.send({
      from: fromEmail,
      to: params.email,
      subject: "Your volunteer booking has been approved",
      html: `
        <h1>Booking Approved</h1>
        <p>Hi ${params.volunteerName},</p>
        <p>Your volunteer booking has been approved!</p>
        <h2>${params.opportunityTitle}</h2>
        <ul>
          <li><strong>Date:</strong> ${params.date}</li>
          <li><strong>Time:</strong> ${params.startTime} – ${params.endTime}</li>
          <li><strong>Location:</strong> ${params.location}</li>
        </ul>
        ${params.notes ? `<p><strong>Notes:</strong> ${params.notes}</p>` : ""}
        <p>View your bookings at <a href="${appUrl}/dashboard">${appUrl}/dashboard</a></p>
      `,
    });
    return { success: true };
  } catch (error) {
    console.error("Failed to send booking approved email:", error);
    return { success: false, error: String(error) };
  }
}

export async function sendBookingRejectedEmail(params: {
  email: string;
  volunteerName: string;
  opportunityTitle: string;
  adminNote?: string;
}) {
  if (!resend) {
    console.warn("Resend not configured — skipping booking rejected email");
    return { success: false, error: "Email service not configured" };
  }

  try {
    await resend.emails.send({
      from: fromEmail,
      to: params.email,
      subject: "Volunteer booking update",
      html: `
        <h1>Booking Update</h1>
        <p>Hi ${params.volunteerName},</p>
        <p>Unfortunately, your booking request for <strong>${params.opportunityTitle}</strong> was not approved.</p>
        ${params.adminNote ? `<p><strong>Note:</strong> ${params.adminNote}</p>` : ""}
        <p>Please contact us at volunteer@timetovolunteer.org if you have questions.</p>
      `,
    });
    return { success: true };
  } catch (error) {
    console.error("Failed to send booking rejected email:", error);
    return { success: false, error: String(error) };
  }
}
