-- TimeToVolunteer destructive database reset
-- WARNING: Running this file removes all TimeToVolunteer app data.
-- It drops and recreates the public app tables, app helper functions, and
-- updates the organization image storage bucket settings.
--
-- This does not delete Supabase Auth users by default. If you also want to
-- delete every auth user, uncomment the auth.users delete block below before
-- running the script.

begin;

-- Optional full auth reset. Uncomment only if you want to delete all auth users.
-- delete from auth.users;

drop table if exists inbox_messages cascade;
drop table if exists bookings cascade;
drop table if exists volunteer_opportunities cascade;
drop table if exists organization_memberships cascade;
drop table if exists organizations cascade;
drop table if exists organization_applications cascade;
drop table if exists profiles cascade;
drop table if exists volunteer_applications cascade;

drop function if exists normalize_organization_description_fields() cascade;
drop function if exists normalize_organization_description(text) cascade;
drop function if exists update_updated_at() cascade;
drop function if exists is_active_volunteer(uuid) cascade;
drop function if exists is_admin(uuid) cascade;

commit;

-- Recreate the complete current app schema.

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

-- Obsolete table from early volunteer-application flow.
drop table if exists volunteer_applications cascade;

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
  created_by uuid references profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint volunteer_opportunities_status_check check (
    status in ('draft', 'published', 'cancelled', 'completed')
  ),
  constraint volunteer_opportunities_visibility_check check (
    visibility in ('public', 'private')
  ),
  constraint volunteer_opportunities_max_volunteers_check check (max_volunteers >= 1),
  constraint volunteer_opportunities_time_check check (end_time > start_time)
);

create index volunteer_opportunities_org_date_idx
on volunteer_opportunities (organization_id, date);

create index volunteer_opportunities_status_date_idx
on volunteer_opportunities (status, date);

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
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  constraint inbox_messages_kind_check check (
    kind in (
      'booking_requested',
      'booking_approved',
      'booking_rejected',
      'opportunity_updated',
      'membership_requested',
      'membership_accepted',
      'membership_rejected'
    )
  )
);

create index inbox_messages_recipient_created_idx
on inbox_messages (recipient_id, created_at desc)
where deleted_at is null;

create index inbox_messages_recipient_unread_idx
on inbox_messages (recipient_id, created_at desc)
where read_at is null and deleted_at is null;

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

-- Seed a platform admin after creating the matching auth user in Supabase Auth:
-- insert into profiles (id, first_name, last_name, email, role, status)
-- values ('AUTH_USER_ID_HERE', 'Admin', 'User', 'admin@example.com', 'admin', 'active');
