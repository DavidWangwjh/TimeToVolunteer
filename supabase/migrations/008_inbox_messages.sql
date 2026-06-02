-- In-app inbox messages for volunteer and organization workflow updates.

create table if not exists inbox_messages (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid not null references profiles(id) on delete cascade,
  actor_id uuid references profiles(id) on delete set null,
  organization_id uuid references organizations(id) on delete set null,
  opportunity_id uuid references volunteer_opportunities(id) on delete set null,
  booking_id uuid references bookings(id) on delete set null,
  membership_id uuid references organization_memberships(id) on delete set null,
  kind text not null,
  title text not null,
  body text not null,
  action_href text,
  read_at timestamptz,
  deleted_at timestamptz,
  created_at timestamptz default now(),
  constraint inbox_messages_kind_check check (
    kind in (
      'booking_requested',
      'booking_approved',
      'booking_rejected',
      'membership_requested',
      'membership_accepted',
      'membership_rejected'
    )
  )
);

create index if not exists inbox_messages_recipient_created_idx
on inbox_messages (recipient_id, created_at desc)
where deleted_at is null;

create index if not exists inbox_messages_recipient_unread_idx
on inbox_messages (recipient_id, created_at desc)
where read_at is null and deleted_at is null;

alter table inbox_messages enable row level security;

drop policy if exists "Users can view own inbox messages" on inbox_messages;
create policy "Users can view own inbox messages"
on inbox_messages for select
using (recipient_id = auth.uid());

drop policy if exists "Users can update own inbox messages" on inbox_messages;
create policy "Users can update own inbox messages"
on inbox_messages for update
using (recipient_id = auth.uid())
with check (recipient_id = auth.uid());
