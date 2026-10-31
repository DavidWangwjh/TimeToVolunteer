-- TimeToVolunteer complete Supabase schema
-- Run this file once in a fresh Supabase project SQL editor.

create extension if not exists "pgcrypto";

-- Storage
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'organization-images',
  'organization-images',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Core users
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  first_name text not null,
  last_name text not null,
  email text not null unique,
  phone text,
  role text not null default 'volunteer',
  status text not null default 'active',
  must_reset_password boolean not null default false,
  volunteer_interests text[] not null default '{}',
  volunteer_intro text,
  date_of_birth date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_role_check check (role in ('volunteer', 'organization', 'admin')),
  constraint profiles_status_check check (status in ('active', 'inactive', 'suspended')),
  constraint profiles_volunteer_interests_check check (
    volunteer_interests <@ array[
      'Animal Welfare',
      'Arts & Culture',
      'Community Development',
      'Education',
      'Environment',
      'Food Security',
      'Health & Wellness',
      'Housing',
      'Senior Services',
      'Youth Programs',
      'Other'
    ]::text[]
  )
);

-- Organization applications are submitted before platform admin approval.
create table organization_applications (
  id uuid primary key default gen_random_uuid(),
  organization_name text not null,
  category text not null,
  email text not null,
  phone text,
  website text,
  organization_description text not null,
  image_url text,
  reason text not null,
  status text not null default 'pending',
  admin_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint organization_applications_category_check check (
    category in (
      'Animal Welfare',
      'Arts & Culture',
      'Community Development',
      'Education',
      'Environment',
      'Food Security',
      'Health & Wellness',
      'Housing',
      'Senior Services',
      'Youth Programs',
      'Other'
    )
  ),
  constraint organization_applications_status_check check (
    status in ('pending', 'contacted', 'accepted', 'rejected')
  )
);

-- Approved organizations.
create table organizations (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references profiles(id) on delete cascade,
  name text not null,
  category text not null,
  description text not null,
  image_url text,
  image_position jsonb not null default '{"x":50,"y":50,"zoom":1}'::jsonb
    constraint organizations_image_position_valid check (
      jsonb_typeof(image_position) = 'object'
      and image_position ?& array['x','y','zoom']
      and jsonb_typeof(image_position->'x') = 'number'
      and jsonb_typeof(image_position->'y') = 'number'
      and jsonb_typeof(image_position->'zoom') = 'number'
      and (image_position->>'x')::numeric between 0 and 100
      and (image_position->>'y')::numeric between 0 and 100
      and (image_position->>'zoom')::numeric between 1 and 3
    ),
  website text,
  contact_email text not null,
  contact_phone text,
  visibility text not null default 'public',
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint organizations_category_check check (
    category in (
      'Animal Welfare',
      'Arts & Culture',
      'Community Development',
      'Education',
      'Environment',
      'Food Security',
      'Health & Wellness',
      'Housing',
      'Senior Services',
      'Youth Programs',
      'Other'
    )
  ),
  constraint organizations_visibility_check check (visibility in ('public', 'private')),
  constraint organizations_status_check check (status in ('active', 'inactive', 'suspended'))
);

create unique index unique_organization_owner
on organizations (owner_id);

-- Volunteer access to private organizations.
create table organization_memberships (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  volunteer_id uuid not null references profiles(id) on delete cascade,
  status text not null default 'pending',
  volunteer_note text,
  admin_note text,
  reviewed_by uuid references profiles(id),
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint organization_memberships_status_check check (
    status in ('pending', 'accepted', 'rejected')
  )
);

create unique index unique_membership_per_volunteer
on organization_memberships (organization_id, volunteer_id);

create index organization_memberships_volunteer_idx
on organization_memberships (volunteer_id, status);

-- Opportunity visibility controls whether registration is direct or request-based.
-- public = direct registration, private = registration request.
create table volunteer_opportunities (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references organizations(id) on delete cascade,
  title text not null,
  description text,
  date date not null,
  start_time time not null,
  end_time time not null,
  location text not null,
  experience_required text,
  max_volunteers integer not null default 1,
  status text not null default 'draft',
  visibility text not null default 'public',
  recurring_group_id uuid,
  recurring_frequency text,
  recurring_until date,
  created_by uuid references profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint volunteer_opportunities_status_check check (
    status in ('draft', 'published', 'cancelled', 'completed')
  ),
  constraint volunteer_opportunities_visibility_check check (
    visibility in ('public', 'private')
  ),
  constraint volunteer_opportunities_recurring_frequency_check check (
    recurring_frequency is null
    or recurring_frequency in ('weekly', 'biweekly', 'monthly')
  ),
  constraint volunteer_opportunities_max_volunteers_check check (max_volunteers >= 1),
  constraint volunteer_opportunities_time_check check (end_time > start_time)
);

create index volunteer_opportunities_org_date_idx
on volunteer_opportunities (organization_id, date);

create index volunteer_opportunities_status_date_idx
on volunteer_opportunities (status, date);

create index volunteer_opportunities_recurring_group_idx
on volunteer_opportunities (recurring_group_id, date);

-- Registrations and registration requests.
create table bookings (
  id uuid primary key default gen_random_uuid(),
  opportunity_id uuid not null references volunteer_opportunities(id) on delete cascade,
  volunteer_id uuid not null references profiles(id) on delete cascade,
  status text not null default 'pending',
  volunteer_note text,
  admin_note text,
  approved_by uuid references profiles(id),
  approved_at timestamptz,
  checked_in_by uuid references profiles(id),
  checked_in_at timestamptz,
  rejected_at timestamptz,
  cancelled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint bookings_status_check check (
    status in ('pending', 'approved', 'rejected', 'cancelled', 'completed')
  )
);

create unique index unique_active_booking_per_volunteer
on bookings (opportunity_id, volunteer_id)
where status in ('pending', 'approved');

create index bookings_volunteer_created_idx
on bookings (volunteer_id, created_at desc);

create index bookings_opportunity_status_idx
on bookings (opportunity_id, status);

-- Server-side email reminder delivery log.
create table booking_email_reminders (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references bookings(id) on delete cascade,
  reminder_date date not null,
  sent_at timestamptz,
  resend_email_id text,
  error text,
  created_at timestamptz not null default now(),
  constraint booking_email_reminders_booking_date_unique unique (booking_id, reminder_date)
);

create index booking_email_reminders_date_idx
on booking_email_reminders (reminder_date);

-- In-app inbox notifications.
create table inbox_messages (
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
  created_at timestamptz not null default now(),
  constraint inbox_messages_kind_check check (
    kind in (
      'booking_requested',
      'booking_approved',
      'booking_rejected',
      'opportunity_updated',
      'membership_requested',
      'membership_accepted',
      'membership_rejected',
      'direct_message'
    )
  )
);

create index inbox_messages_recipient_created_idx
on inbox_messages (recipient_id, created_at desc);

create index inbox_messages_recipient_unread_idx
on inbox_messages (recipient_id, created_at desc)
where read_at is null;

-- Supabase API roles need table privileges before RLS policies can apply.
grant usage on schema public to anon, authenticated, service_role;
grant select, insert, update, delete on all tables in schema public to service_role;
grant select, insert, update, delete on
  profiles,
  organization_applications,
  organizations,
  organization_memberships,
  volunteer_opportunities,
  bookings,
  inbox_messages
to authenticated;
grant insert on organization_applications to anon;

-- Shared helpers
create or replace function update_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_updated_at before update on profiles
  for each row execute function update_updated_at();
create trigger organization_applications_updated_at before update on organization_applications
  for each row execute function update_updated_at();
create trigger organizations_updated_at before update on organizations
  for each row execute function update_updated_at();
create trigger organization_memberships_updated_at before update on organization_memberships
  for each row execute function update_updated_at();
create trigger volunteer_opportunities_updated_at before update on volunteer_opportunities
  for each row execute function update_updated_at();
create trigger bookings_updated_at before update on bookings
  for each row execute function update_updated_at();

create or replace function normalize_organization_description(value text)
returns text
language sql
immutable
as $$
  select nullif(
    btrim(regexp_replace(coalesce(value, ''), '\s*Category:\s*[^.]+\.?', ' ', 'gi')),
    ''
  );
$$;

create or replace function normalize_organization_description_fields()
returns trigger
language plpgsql
as $$
begin
  if tg_table_name = 'organizations' then
    new.description := normalize_organization_description(new.description);
  elsif tg_table_name = 'organization_applications' then
    new.organization_description :=
      normalize_organization_description(new.organization_description);
  end if;

  return new;
end;
$$;

create trigger normalize_organizations_description
before insert or update of description on organizations
for each row execute function normalize_organization_description_fields();

create trigger normalize_organization_applications_description
before insert or update of organization_description on organization_applications
for each row execute function normalize_organization_description_fields();

create or replace function is_admin(user_id uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from profiles
    where id = user_id
      and role = 'admin'
      and status = 'active'
  );
$$;

create or replace function is_active_volunteer(user_id uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from profiles
    where id = user_id
      and role = 'volunteer'
      and status = 'active'
  );
$$;

-- Row Level Security
alter table profiles enable row level security;
alter table organization_applications enable row level security;
alter table organizations enable row level security;
alter table organization_memberships enable row level security;
alter table volunteer_opportunities enable row level security;
alter table bookings enable row level security;
alter table booking_email_reminders enable row level security;
alter table inbox_messages enable row level security;

create policy "Users can view own profile"
on profiles for select
using (auth.uid() = id);

create policy "Organization owners can view member profiles"
on profiles for select
using (
  exists (
    select 1
    from organization_memberships
    join organizations on organizations.id = organization_memberships.organization_id
    where organization_memberships.volunteer_id = profiles.id
      and organizations.owner_id = auth.uid()
  )
  or exists (
    select 1
    from bookings
    join volunteer_opportunities
      on volunteer_opportunities.id = bookings.opportunity_id
    join organizations
      on organizations.id = volunteer_opportunities.organization_id
    where bookings.volunteer_id = profiles.id
      and organizations.owner_id = auth.uid()
  )
);

create policy "Users can update own limited profile"
on profiles for update
using (auth.uid() = id)
with check (auth.uid() = id);

create policy "Admins can manage profiles"
on profiles for all
using (is_admin(auth.uid()))
with check (is_admin(auth.uid()));

create policy "Anyone can submit organization application"
on organization_applications for insert
with check (true);

create policy "Admins can manage organization applications"
on organization_applications for all
using (is_admin(auth.uid()))
with check (is_admin(auth.uid()));

create policy "Organizations are viewable by authenticated users"
on organizations for select
using (auth.uid() is not null);

create policy "Organization owners can manage own organization"
on organizations for all
using (owner_id = auth.uid() or is_admin(auth.uid()))
with check (owner_id = auth.uid() or is_admin(auth.uid()));

create policy "Volunteers can view own organization memberships"
on organization_memberships for select
using (auth.uid() = volunteer_id or is_admin(auth.uid()));

create policy "Volunteers can request organization membership"
on organization_memberships for insert
with check (
  auth.uid() = volunteer_id
  and status = 'pending'
  and is_active_volunteer(auth.uid())
);

create policy "Organization owners can manage memberships"
on organization_memberships for all
using (
  exists (
    select 1
    from organizations
    where organizations.id = organization_memberships.organization_id
      and organizations.owner_id = auth.uid()
  )
  or is_admin(auth.uid())
)
with check (
  exists (
    select 1
    from organizations
    where organizations.id = organization_memberships.organization_id
      and organizations.owner_id = auth.uid()
  )
  or is_admin(auth.uid())
);

create policy "Volunteers can view accessible published opportunities"
on volunteer_opportunities for select
using (
    status = 'published'
    and (
    organization_id is null
    or
    exists (
      select 1
      from organizations
      where organizations.id = volunteer_opportunities.organization_id
        and organizations.visibility = 'public'
        and organizations.status = 'active'
    )
    or exists (
      select 1
      from organization_memberships
      where organization_memberships.organization_id = volunteer_opportunities.organization_id
        and organization_memberships.volunteer_id = auth.uid()
        and organization_memberships.status = 'accepted'
    )
  )
);

create policy "Admins can manage opportunities"
on volunteer_opportunities for all
using (is_admin(auth.uid()))
with check (is_admin(auth.uid()));

create policy "Organization owners can manage own opportunities"
on volunteer_opportunities for all
using (
  exists (
    select 1
    from organizations
    where organizations.id = volunteer_opportunities.organization_id
      and organizations.owner_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from organizations
    where organizations.id = volunteer_opportunities.organization_id
      and organizations.owner_id = auth.uid()
  )
);

create policy "Volunteers can view own bookings"
on bookings for select
using (auth.uid() = volunteer_id);

create policy "Volunteers can create own bookings"
on bookings for insert
with check (
  auth.uid() = volunteer_id
  and is_active_volunteer(auth.uid())
);

create policy "Volunteers can update own cancellable bookings"
on bookings for update
using (auth.uid() = volunteer_id)
with check (auth.uid() = volunteer_id);

create policy "Admins can manage bookings"
on bookings for all
using (is_admin(auth.uid()))
with check (is_admin(auth.uid()));

create policy "Organization owners can manage own bookings"
on bookings for all
using (
  exists (
    select 1
    from volunteer_opportunities
    join organizations on organizations.id = volunteer_opportunities.organization_id
    where volunteer_opportunities.id = bookings.opportunity_id
      and organizations.owner_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from volunteer_opportunities
    join organizations on organizations.id = volunteer_opportunities.organization_id
    where volunteer_opportunities.id = bookings.opportunity_id
      and organizations.owner_id = auth.uid()
  )
);

create policy "Users can view own inbox messages"
on inbox_messages for select
using (recipient_id = auth.uid());

create policy "Users can update own inbox messages"
on inbox_messages for update
using (recipient_id = auth.uid())
with check (recipient_id = auth.uid());

create policy "Users can delete own inbox messages"
on inbox_messages for delete
using (recipient_id = auth.uid());

-- Seed a platform admin after creating the matching auth user in Supabase Auth:
-- insert into profiles (id, first_name, last_name, email, role, status)
-- values ('AUTH_USER_ID_HERE', 'Admin', 'User', 'admin@example.com', 'admin', 'active');

-- Current access controls and constraints (also available as migration 003).
create index if not exists inbox_messages_recipient_created_idx on public.inbox_messages(recipient_id, created_at desc);
create index if not exists inbox_messages_recipient_unread_idx on public.inbox_messages(recipient_id, created_at desc) where read_at is null;
create index if not exists organization_applications_email_created_idx on public.organization_applications(email, created_at desc);
create index if not exists organization_applications_status_created_idx on public.organization_applications(status, created_at desc);
create unique index if not exists organization_applications_one_open_email_idx on public.organization_applications(lower(email)) where status in ('pending','contacted');
create index if not exists memberships_reviewer_idx on public.organization_memberships(reviewed_by);
create index if not exists opportunities_creator_idx on public.volunteer_opportunities(created_by);
create index if not exists bookings_approver_idx on public.bookings(approved_by);
create index if not exists bookings_checkin_actor_idx on public.bookings(checked_in_by);
create index if not exists inbox_actor_idx on public.inbox_messages(actor_id);
create index if not exists inbox_organization_idx on public.inbox_messages(organization_id);
create index if not exists inbox_opportunity_idx on public.inbox_messages(opportunity_id);
create index if not exists inbox_booking_idx on public.inbox_messages(booking_id);
create index if not exists inbox_membership_idx on public.inbox_messages(membership_id);

-- RLS limits rows, not which columns may change. Keep admin fields server/admin-only.
create or replace function public.protect_account_fields()
returns trigger language plpgsql set search_path = public, pg_temp as $$
begin
  if current_user in ('anon','authenticated') and not public.is_admin(auth.uid()) then
    if tg_table_name = 'profiles' then
      if (to_jsonb(new) - array['first_name','last_name','phone','volunteer_interests','volunteer_intro','date_of_birth','updated_at'])
         is distinct from (to_jsonb(old) - array['first_name','last_name','phone','volunteer_interests','volunteer_intro','date_of_birth','updated_at']) then
        raise exception 'Only an administrator can change account access fields' using errcode='42501';
      end if;
    elsif tg_table_name = 'organizations' then
      if (to_jsonb(new) - array['name','category','description','image_url','image_position','website','contact_email','contact_phone','visibility','updated_at'])
         is distinct from (to_jsonb(old) - array['name','category','description','image_url','image_position','website','contact_email','contact_phone','visibility','updated_at']) then
        raise exception 'Only an administrator can change organization approval or ownership' using errcode='42501';
      end if;
    end if;
  end if;
  return new;
end;
$$;
drop trigger if exists protect_profile_fields on public.profiles;
create trigger protect_profile_fields before update on public.profiles for each row execute function public.protect_account_fields();
drop trigger if exists protect_organization_fields on public.organizations;
create trigger protect_organization_fields before update on public.organizations for each row execute function public.protect_account_fields();

-- All application submissions already use the validated server action.
drop policy if exists "Anyone can submit organization application" on public.organization_applications;
revoke insert on public.organization_applications from anon;

drop policy if exists "Organization owners can manage own organization" on public.organizations;
drop policy if exists "Organization owners can edit own organization" on public.organizations;
create policy "Organization owners can edit own organization" on public.organizations for update to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());
drop policy if exists "Admins can manage organizations" on public.organizations;
create policy "Admins can manage organizations" on public.organizations for all to authenticated using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));

-- These writes need server validation, including visibility, capacity, and deadlines.
drop policy if exists "Volunteers can create own bookings" on public.bookings;
drop policy if exists "Volunteers can update own cancellable bookings" on public.bookings;
drop policy if exists "Volunteers can request organization membership" on public.organization_memberships;

-- Owners of unapproved/suspended organizations must not manage operational data.
drop policy if exists "Organization owners can manage memberships" on public.organization_memberships;
create policy "Organization owners can manage memberships" on public.organization_memberships for all to authenticated
using (public.is_admin(auth.uid()) or exists (select 1 from public.organizations o where o.id=organization_id and o.owner_id=auth.uid() and o.status='active'))
with check (public.is_admin(auth.uid()) or exists (select 1 from public.organizations o where o.id=organization_id and o.owner_id=auth.uid() and o.status='active'));
drop policy if exists "Organization owners can manage own opportunities" on public.volunteer_opportunities;
create policy "Organization owners can manage own opportunities" on public.volunteer_opportunities for all to authenticated
using (exists (select 1 from public.organizations o where o.id=organization_id and o.owner_id=auth.uid() and o.status='active'))
with check (exists (select 1 from public.organizations o where o.id=organization_id and o.owner_id=auth.uid() and o.status='active'));
drop policy if exists "Organization owners can manage own bookings" on public.bookings;
create policy "Organization owners can manage own bookings" on public.bookings for all to authenticated
using (exists (select 1 from public.volunteer_opportunities v join public.organizations o on o.id=v.organization_id where v.id=opportunity_id and o.owner_id=auth.uid() and o.status='active'))
with check (exists (select 1 from public.volunteer_opportunities v join public.organizations o on o.id=v.organization_id where v.id=opportunity_id and o.owner_id=auth.uid() and o.status='active'));

drop policy if exists "Volunteers can view accessible published opportunities" on public.volunteer_opportunities;
create policy "Volunteers can view accessible published opportunities" on public.volunteer_opportunities for select
using (status='published' and (organization_id is null or exists (
  select 1 from public.organizations o where o.id=organization_id and o.status='active' and (
    o.visibility='public' or exists (select 1 from public.organization_memberships m where m.organization_id=o.id and m.volunteer_id=auth.uid() and m.status='accepted')
  )
)));

-- Recipients may mark read/unread, but cannot forge notification bodies or actors.
revoke update on public.inbox_messages from authenticated;
grant update(read_at) on public.inbox_messages to authenticated;

-- Serialize approvals on the opportunity row so parallel requests cannot overbook.
create or replace function public.enforce_booking_capacity()
returns trigger language plpgsql security definer set search_path = public, pg_temp as $$
declare capacity integer;
begin
  if new.status <> 'approved' then return new; end if;
  if tg_op = 'UPDATE' then
    if old.status='approved' and old.opportunity_id=new.opportunity_id then return new; end if;
  end if;
  select max_volunteers into capacity from public.volunteer_opportunities where id=new.opportunity_id for update;
  if (select count(*) from public.bookings where opportunity_id=new.opportunity_id and status='approved' and id<>new.id) >= capacity then
    raise exception 'This session is full' using errcode='23514';
  end if;
  return new;
end;
$$;
revoke all on function public.enforce_booking_capacity() from public;
drop trigger if exists enforce_booking_capacity on public.bookings;
create trigger enforce_booking_capacity before insert or update of status, opportunity_id on public.bookings for each row execute function public.enforce_booking_capacity();

alter function public.update_updated_at() set search_path = public, pg_temp;
alter function public.normalize_organization_description(text) set search_path = public, pg_temp;
alter function public.normalize_organization_description_fields() set search_path = public, pg_temp;
alter function public.is_admin(uuid) stable;
alter function public.is_active_volunteer(uuid) stable;

-- Opportunity invitations (migration 004)
begin;

alter table public.bookings drop constraint bookings_status_check;
alter table public.bookings add constraint bookings_status_check
  check (status in ('pending', 'invited', 'approved', 'rejected', 'cancelled', 'completed'));
drop index public.unique_active_booking_per_volunteer;
create unique index unique_active_booking_per_volunteer
  on public.bookings(opportunity_id, volunteer_id)
  where status in ('pending', 'invited', 'approved');

alter table public.inbox_messages drop constraint inbox_messages_kind_check;
alter table public.inbox_messages add constraint inbox_messages_kind_check check (kind in (
  'booking_requested', 'booking_approved', 'booking_rejected', 'opportunity_updated',
  'membership_requested', 'membership_accepted', 'membership_rejected', 'direct_message',
  'opportunity_invited'
));

-- Invitation writes must go through the validated RPCs, never direct client updates.
create or replace function public.protect_opportunity_invitation() returns trigger
language plpgsql set search_path = public, pg_temp as $$
begin
  if current_user in ('anon', 'authenticated') then
    if new.status = 'invited' then
      raise exception 'Use the invitation actions' using errcode = '42501';
    end if;
    if tg_op = 'UPDATE' then
      if old.status = 'invited' then
        raise exception 'Only the invited volunteer can respond' using errcode = '42501';
      end if;
    end if;
  end if;
  return new;
end;
$$;
drop trigger if exists protect_opportunity_invitation on public.bookings;
create trigger protect_opportunity_invitation before insert or update on public.bookings
  for each row execute function public.protect_opportunity_invitation();
revoke all on function public.protect_opportunity_invitation() from public;

create or replace function public.invite_opportunity_volunteers(p_opportunity_id uuid, p_volunteer_ids uuid[])
returns table (volunteer_id uuid, outcome text)
language plpgsql security definer set search_path = public, pg_temp as $$
#variable_conflict use_column
declare
  actor uuid := auth.uid();
  opportunity public.volunteer_opportunities%rowtype;
  organization public.organizations%rowtype;
  member_id uuid;
  invitation_id uuid;
begin
  if not exists (select 1 from public.profiles where id=actor and role='organization' and status='active') then
    raise exception 'An active organization account is required' using errcode='42501';
  end if;
  if coalesce(cardinality(p_volunteer_ids), 0) not between 1 and 100 then
    raise exception 'Select between 1 and 100 volunteers per batch';
  end if;
  -- Same opportunity lock as acceptance/capacity checks, so simultaneous invitations are serialized.
  select * into opportunity from public.volunteer_opportunities where id=p_opportunity_id for update;
  select * into organization from public.organizations where id=opportunity.organization_id;
  if organization.owner_id is distinct from actor or organization.status is distinct from 'active' then
    raise exception 'You can only invite volunteers to your organization' using errcode='42501';
  end if;
  if opportunity.status <> 'published' or
     (opportunity.date + opportunity.start_time) <= (now() at time zone 'America/Los_Angeles') then
    raise exception 'Invitations require an upcoming published opportunity';
  end if;
  for member_id in select distinct unnest(p_volunteer_ids) loop
    volunteer_id := member_id;
    if not exists (
      select 1 from public.organization_memberships m join public.profiles p on p.id=m.volunteer_id
      where m.organization_id=organization.id and m.volunteer_id=member_id
        and m.status='accepted' and p.role='volunteer' and p.status='active'
    ) or exists (
      select 1 from public.bookings b where b.opportunity_id=p_opportunity_id
        and b.volunteer_id=member_id and b.status in ('pending','invited','approved','completed')
    ) then
      outcome := 'unavailable'; return next; continue;
    end if;
    invitation_id := null;
    insert into public.bookings(opportunity_id, volunteer_id, status)
      values(p_opportunity_id, member_id, 'invited')
      on conflict (opportunity_id, volunteer_id) where status in ('pending','invited','approved') do nothing
      returning id into invitation_id;
    if invitation_id is null then
      outcome := 'unavailable'; return next; continue;
    end if;
    insert into public.inbox_messages(recipient_id, actor_id, organization_id, opportunity_id, booking_id, kind, title, body, action_href)
      values(member_id, actor, organization.id, opportunity.id, invitation_id, 'opportunity_invited',
        'Opportunity invitation', organization.name || ' invited you to ' || opportunity.title || '. Accept or decline on your dashboard.',
        '/dashboard/volunteer#invitations');
    outcome := 'invited'; return next;
  end loop;
end;
$$;
revoke all on function public.invite_opportunity_volunteers(uuid, uuid[]) from public;
grant execute on function public.invite_opportunity_volunteers(uuid, uuid[]) to authenticated;

create or replace function public.respond_to_opportunity_invitation(p_booking_id uuid, p_accept boolean)
returns void language plpgsql security definer set search_path = public, pg_temp as $$
declare
  actor uuid := auth.uid();
  invitation public.bookings%rowtype;
  opportunity public.volunteer_opportunities%rowtype;
  organization public.organizations%rowtype;
begin
  if p_accept is null or not exists (select 1 from public.profiles where id=actor and role='volunteer' and status='active') then
    raise exception 'An active volunteer account is required' using errcode='42501';
  end if;
  select * into invitation from public.bookings where id=p_booking_id and volunteer_id=actor;
  if not found then raise exception 'Invitation not found' using errcode='42501'; end if;
  -- Lock opportunity before booking consistently with bulk invitation creation.
  select * into opportunity from public.volunteer_opportunities where id=invitation.opportunity_id for update;
  select * into invitation from public.bookings where id=p_booking_id and volunteer_id=actor for update;
  if invitation.status <> 'invited' then raise exception 'This invitation has already been answered'; end if;
  select * into organization from public.organizations where id=opportunity.organization_id;
  if p_accept then
    if opportunity.status <> 'published' or organization.status is distinct from 'active' or
       (opportunity.date + opportunity.start_time) <= (now() at time zone 'America/Los_Angeles') then
      raise exception 'This opportunity is no longer available';
    end if;
    if not exists (select 1 from public.organization_memberships where organization_id=organization.id and volunteer_id=actor and status='accepted') then
      raise exception 'You must still be a member of this organization';
    end if;
    -- Existing capacity trigger atomically checks remaining places; invitations do not reserve seats.
    update public.bookings set status='approved', approved_by=organization.owner_id, approved_at=now()
      where id=p_booking_id;
  else
    update public.bookings set status='rejected', rejected_at=now() where id=p_booking_id;
  end if;
  update public.inbox_messages set read_at=coalesce(read_at, now())
    where recipient_id=actor and booking_id=p_booking_id and kind='opportunity_invited';
  insert into public.inbox_messages(recipient_id, actor_id, organization_id, opportunity_id, booking_id, kind, title, body, action_href)
    values(organization.owner_id, actor, organization.id, opportunity.id, p_booking_id, 'direct_message',
      case when p_accept then 'Invitation accepted' else 'Invitation declined' end,
      (select first_name || ' ' || last_name from public.profiles where id=actor) ||
      case when p_accept then ' accepted your invitation to ' else ' declined your invitation to ' end || opportunity.title || '.',
      '/dashboard/organization/opportunities/' || opportunity.id || '/edit');
end;
$$;
revoke all on function public.respond_to_opportunity_invitation(uuid, boolean) from public;
grant execute on function public.respond_to_opportunity_invitation(uuid, boolean) to authenticated;

commit;
