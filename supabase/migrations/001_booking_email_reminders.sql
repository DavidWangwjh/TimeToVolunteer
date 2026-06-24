create table if not exists booking_email_reminders (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references bookings(id) on delete cascade,
  reminder_date date not null,
  sent_at timestamptz,
  resend_email_id text,
  error text,
  created_at timestamptz not null default now(),
  constraint booking_email_reminders_booking_date_unique unique (booking_id, reminder_date)
);

create index if not exists booking_email_reminders_date_idx
on booking_email_reminders (reminder_date);

alter table booking_email_reminders enable row level security;

grant select, insert, update, delete on booking_email_reminders to service_role;
