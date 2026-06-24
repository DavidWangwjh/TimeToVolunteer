import { Resend } from "resend";
import { type NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatTime } from "@/lib/dates";

export const dynamic = "force-dynamic";

const timeZone = "America/Los_Angeles";

interface ReminderBookingRow {
  id: string;
  volunteer_id: string;
  profiles:
    | {
        first_name: string;
        last_name: string;
        email: string | null;
      }
    | Array<{
        first_name: string;
        last_name: string;
        email: string | null;
      }>
    | null;
  volunteer_opportunities:
    | {
        title: string;
        date: string;
        start_time: string;
        end_time: string;
        location: string;
        organizations:
          | {
              name: string;
            }
          | Array<{
              name: string;
            }>
          | null;
      }
    | Array<{
        title: string;
        date: string;
        start_time: string;
        end_time: string;
        location: string;
        organizations:
          | {
              name: string;
            }
          | Array<{
              name: string;
            }>
          | null;
      }>
    | null;
}

interface ReminderOpportunity {
  bookingId: string;
  title: string;
  startTime: string;
  endTime: string;
  location: string;
  organizationName: string | null;
}

interface VolunteerReminder {
  volunteerId: string;
  email: string;
  name: string;
  opportunities: ReminderOpportunity[];
}

interface ReminderFailure {
  volunteerId?: string;
  email?: string;
  bookingIds: string[];
  error: string;
}

function getPacificDateTime() {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    hour12: false,
  }).formatToParts(new Date());

  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((item) => item.type === type)?.value ?? "";

  return {
    date: `${part("year")}-${part("month")}-${part("day")}`,
    hour: Number(part("hour")),
  };
}

function firstRelation<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return value ?? null;
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function buildReminderEmail({
  dashboardUrl,
  volunteer,
}: {
  dashboardUrl: string;
  volunteer: VolunteerReminder;
}) {
  const opportunityItems = volunteer.opportunities
    .map((opportunity) => {
      const organizationLine = opportunity.organizationName
        ? `<p style="margin: 4px 0 0; color: #475569;">${escapeHtml(
            opportunity.organizationName
          )}</p>`
        : "";

      return `
        <li style="padding: 16px 0; border-top: 1px solid #e2e8f0;">
          <p style="margin: 0; font-size: 16px; font-weight: 700; color: #020617;">${escapeHtml(
            opportunity.title
          )}</p>
          ${organizationLine}
          <p style="margin: 8px 0 0; color: #334155;">${escapeHtml(
            `${formatTime(opportunity.startTime)} - ${formatTime(
              opportunity.endTime
            )}`
          )}</p>
          <p style="margin: 4px 0 0; color: #334155;">${escapeHtml(
            opportunity.location
          )}</p>
        </li>
      `;
    })
    .join("");

  const html = `
    <div style="margin: 0; padding: 0; background: #f8fafc;">
      <div style="max-width: 600px; margin: 0 auto; padding: 24px 16px; font-family: Arial, sans-serif; color: #0f172a;">
        <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 14px; padding: 24px;">
          <p style="margin: 0 0 12px; color: #047857; font-weight: 700;">TimeToVolunteer</p>
          <h1 style="margin: 0; font-size: 24px; line-height: 1.25; color: #020617;">Your volunteer schedule for today</h1>
          <p style="margin: 16px 0 0; color: #334155;">Hi ${escapeHtml(
            volunteer.name
          )}, here are your registered volunteer opportunities for today.</p>
          <ul style="list-style: none; padding: 0; margin: 24px 0 0;">
            ${opportunityItems}
          </ul>
          <a href="${escapeHtml(
            dashboardUrl
          )}" style="display: inline-block; margin-top: 20px; padding: 12px 18px; background: #047857; color: #ffffff; text-decoration: none; border-radius: 10px; font-weight: 700;">View dashboard</a>
        </div>
      </div>
    </div>
  `;

  const text = [
    `Hi ${volunteer.name},`,
    "",
    "Here are your registered volunteer opportunities for today:",
    "",
    ...volunteer.opportunities.flatMap((opportunity) => [
      opportunity.title,
      opportunity.organizationName
        ? `Organization: ${opportunity.organizationName}`
        : "",
      `Time: ${formatTime(opportunity.startTime)} - ${formatTime(
        opportunity.endTime
      )}`,
      `Location: ${opportunity.location}`,
      "",
    ]),
    `Dashboard: ${dashboardUrl}`,
  ]
    .filter((line, index, lines) => line || lines[index - 1])
    .join("\n");

  return { html, text };
}

async function logReminderResults(
  rows: Array<{
    booking_id: string;
    reminder_date: string;
    sent_at?: string;
    resend_email_id?: string | null;
    error?: string | null;
  }>
) {
  if (rows.length === 0) {
    return null;
  }

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("booking_email_reminders")
    .upsert(rows, {
      onConflict: "booking_id,reminder_date",
      ignoreDuplicates: true,
    });

  return error;
}

export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = request.headers.get("authorization");

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const appEnv = process.env.APP_ENV;
  const force = request.nextUrl.searchParams.get("force") === "true";
  const forceAllowed = appEnv === "development" && force;
  const { date, hour } = getPacificDateTime();

  if (hour !== 7 && !forceAllowed) {
    return NextResponse.json({
      date,
      bookingsFound: 0,
      volunteersEmailed: 0,
      skippedDuplicates: 0,
      failures: [],
      skipped: `Reminder job only sends at 7 AM ${timeZone}.`,
    });
  }

  const resendApiKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.RESEND_FROM_EMAIL;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;

  if (!resendApiKey || !fromEmail || !appUrl) {
    return NextResponse.json(
      {
        error:
          "Missing RESEND_API_KEY, RESEND_FROM_EMAIL, or NEXT_PUBLIC_APP_URL.",
      },
      { status: 500 }
    );
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("bookings")
    .select(
      `
        id,
        volunteer_id,
        profiles:profiles!bookings_volunteer_id_fkey (
          first_name,
          last_name,
          email
        ),
        volunteer_opportunities:volunteer_opportunities!inner (
          title,
          date,
          start_time,
          end_time,
          location,
          status,
          organizations (
            name
          )
        )
      `
    )
    .eq("status", "approved")
    .eq("volunteer_opportunities.status", "published")
    .eq("volunteer_opportunities.date", date);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const bookings = (data ?? []) as unknown as ReminderBookingRow[];
  const bookingIds = bookings.map((booking) => booking.id);

  const { data: existingReminders, error: reminderError } = bookingIds.length
    ? await supabase
        .from("booking_email_reminders")
        .select("booking_id")
        .eq("reminder_date", date)
        .in("booking_id", bookingIds)
    : { data: [], error: null };

  if (reminderError) {
    return NextResponse.json({ error: reminderError.message }, { status: 500 });
  }

  const existingBookingIds = new Set(
    (existingReminders ?? []).map((reminder) => reminder.booking_id)
  );
  const unsentBookings = bookings.filter(
    (booking) => !existingBookingIds.has(booking.id)
  );
  const failures: ReminderFailure[] = [];
  const remindersByVolunteer = new Map<string, VolunteerReminder>();
  const missingEmailLogs: Array<{
    booking_id: string;
    reminder_date: string;
    error: string;
  }> = [];

  for (const booking of unsentBookings) {
    const volunteer = firstRelation(booking.profiles);
    const opportunity = firstRelation(booking.volunteer_opportunities);

    if (!volunteer || !opportunity) {
      failures.push({
        volunteerId: booking.volunteer_id,
        bookingIds: [booking.id],
        error: "Missing volunteer or opportunity details.",
      });
      missingEmailLogs.push({
        booking_id: booking.id,
        reminder_date: date,
        error: "Missing volunteer or opportunity details.",
      });
      continue;
    }

    if (!volunteer.email) {
      failures.push({
        volunteerId: booking.volunteer_id,
        bookingIds: [booking.id],
        error: "Missing volunteer email.",
      });
      missingEmailLogs.push({
        booking_id: booking.id,
        reminder_date: date,
        error: "Missing volunteer email.",
      });
      continue;
    }

    const organization = firstRelation(opportunity.organizations);
    const name =
      `${volunteer.first_name} ${volunteer.last_name}`.trim() || "there";
    const current = remindersByVolunteer.get(booking.volunteer_id) ?? {
      volunteerId: booking.volunteer_id,
      email: volunteer.email,
      name,
      opportunities: [],
    };

    current.opportunities.push({
      bookingId: booking.id,
      title: opportunity.title,
      startTime: opportunity.start_time,
      endTime: opportunity.end_time,
      location: opportunity.location,
      organizationName: organization?.name ?? null,
    });

    remindersByVolunteer.set(booking.volunteer_id, current);
  }

  await logReminderResults(missingEmailLogs);

  const resend = new Resend(resendApiKey);
  let volunteersEmailed = 0;

  for (const volunteer of remindersByVolunteer.values()) {
    const sortedOpportunities = [...volunteer.opportunities].sort((a, b) =>
      a.startTime.localeCompare(b.startTime)
    );
    const emailVolunteer = {
      ...volunteer,
      opportunities: sortedOpportunities,
    };
    const { html, text } = buildReminderEmail({
      dashboardUrl: `${appUrl.replace(/\/$/, "")}/dashboard/volunteer`,
      volunteer: emailVolunteer,
    });

    const { data: emailData, error: emailError } = await resend.emails.send({
      from: fromEmail,
      to: [volunteer.email],
      subject: "Your TimeToVolunteer schedule for today",
      html,
      text,
    });

    const bookingIdRows = sortedOpportunities.map((opportunity) => ({
      booking_id: opportunity.bookingId,
      reminder_date: date,
      sent_at: emailError ? undefined : new Date().toISOString(),
      resend_email_id: emailData?.id ?? null,
      error: emailError?.message ?? null,
    }));

    const logError = await logReminderResults(bookingIdRows);

    if (emailError || logError) {
      failures.push({
        volunteerId: volunteer.volunteerId,
        email: volunteer.email,
        bookingIds: sortedOpportunities.map((opportunity) => opportunity.bookingId),
        error: emailError?.message ?? logError?.message ?? "Unknown email error.",
      });
      continue;
    }

    volunteersEmailed += 1;
  }

  return NextResponse.json({
    date,
    bookingsFound: bookings.length,
    volunteersEmailed,
    skippedDuplicates: existingBookingIds.size,
    failures,
  });
}
