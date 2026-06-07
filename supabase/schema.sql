-- TimeToVolunteer Database Schema
-- Run this in your Supabase SQL Editor

create extension if not exists "pgcrypto";

create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  first_name text not null,
  last_name text not null,
  email text not null unique,
  phone text,
  role text not null default 'volunteer',
  status text not null default 'active',
  must_reset_password boolean not null default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  constraint profiles_role_check check (role in ('volunteer', 'organization', 'admin')),
  constraint profiles_status_check check (status in ('active', 'inactive', 'suspended'))
);

create table organization_applications (
  id uuid primary key default gen_random_uuid(),
  organization_name text not null,
  category text,
  email text not null,
  phone text,
  website text,
  organization_description text,
  image_url text,
  reason text,
  status text not null default 'pending',
  admin_notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  constraint organization_applications_status_check check (
    status in ('pending', 'contacted', 'accepted', 'rejected')
  )
);

create table organizations (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references profiles(id) on delete cascade,
  name text not null,
  category text,
  description text,
  image_url text,
  website text,
  contact_email text not null,
  contact_phone text,
  visibility text not null default 'public',
  status text not null default 'active',
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  constraint organizations_visibility_check check (visibility in ('public', 'private')),
  constraint organizations_status_check check (status in ('active', 'inactive', 'suspended'))
);

create unique index unique_organization_owner
on organizations (owner_id);

create table organization_memberships (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  volunteer_id uuid not null references profiles(id) on delete cascade,
  status text not null default 'pending',
  volunteer_note text,
  admin_note text,
  reviewed_by uuid references profiles(id),
  reviewed_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  constraint organization_memberships_status_check check (
    status in ('pending', 'accepted', 'rejected')
  )
);

create unique index unique_membership_per_volunteer
on organization_memberships (organization_id, volunteer_id);

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
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  constraint volunteer_opportunities_status_check check (
    status in ('draft', 'published', 'cancelled', 'completed')
  ),
  constraint volunteer_opportunities_visibility_check check (
    visibility in ('public', 'private')
  ),
  constraint volunteer_opportunities_max_volunteers_check check (max_volunteers >= 1),
  constraint volunteer_opportunities_time_check check (end_time > start_time)
);

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
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  constraint bookings_status_check check (
    status in ('pending', 'approved', 'rejected', 'cancelled', 'completed')
  )
);

create unique index unique_active_booking_per_volunteer
on bookings (opportunity_id, volunteer_id)
where status in ('pending', 'approved');

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
  created_at timestamptz default now(),
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

-- Updated_at trigger
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

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

-- RLS
alter table profiles enable row level security;
alter table organization_applications enable row level security;
alter table organizations enable row level security;
alter table organization_memberships enable row level security;
alter table volunteer_opportunities enable row level security;
alter table bookings enable row level security;
alter table inbox_messages enable row level security;

create or replace function is_admin(user_id uuid)
returns boolean
language sql
security definer
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
as $$
  select exists (
    select 1
    from profiles
    where id = user_id
    and role = 'volunteer'
    and status = 'active'
  );
$$;

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
using (auth.uid() = id);

create policy "Admins can manage profiles"
on profiles for all
using (is_admin(auth.uid()));

create policy "Anyone can submit organization application"
on organization_applications for insert
with check (true);

create policy "Admins can manage organization applications"
on organization_applications for all
using (
  exists (
    select 1 from profiles
    where profiles.id = auth.uid()
    and profiles.role = 'admin'
    and profiles.status = 'active'
  )
);

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
    select 1 from organizations
    where organizations.id = organization_memberships.organization_id
    and organizations.owner_id = auth.uid()
  )
  or is_admin(auth.uid())
)
with check (
  exists (
    select 1 from organizations
    where organizations.id = organization_memberships.organization_id
    and organizations.owner_id = auth.uid()
  )
  or is_admin(auth.uid())
);

create policy "Volunteers can view published opportunities"
on volunteer_opportunities for select
using (
  status = 'published'
  and (
    organization_id is null
    or exists (
      select 1 from organizations
      where organizations.id = volunteer_opportunities.organization_id
      and organizations.visibility = 'public'
      and organizations.status = 'active'
    )
    or exists (
      select 1 from organization_memberships
      where organization_memberships.organization_id = volunteer_opportunities.organization_id
      and organization_memberships.volunteer_id = auth.uid()
      and organization_memberships.status = 'accepted'
    )
  )
);

create policy "Admins can manage opportunities"
on volunteer_opportunities for all
using (is_admin(auth.uid()));

create policy "Organization owners can manage own opportunities"
on volunteer_opportunities for all
using (
  exists (
    select 1 from organizations
    where organizations.id = volunteer_opportunities.organization_id
    and organizations.owner_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from organizations
    where organizations.id = volunteer_opportunities.organization_id
    and organizations.owner_id = auth.uid()
  )
);

create policy "Volunteers can view own bookings"
on bookings for select
using (auth.uid() = volunteer_id);

create policy "Volunteers can create own bookings"
on bookings for insert
with check (auth.uid() = volunteer_id);

create policy "Volunteers can update own cancellable bookings"
on bookings for update
using (auth.uid() = volunteer_id);

create policy "Admins can manage bookings"
on bookings for all
using (is_admin(auth.uid()));

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

-- Seed admin (replace AUTH_USER_ID_HERE after creating auth user in Supabase)
-- insert into profiles (id, first_name, last_name, email, role, status)
-- values ('AUTH_USER_ID_HERE', 'Admin', 'User', 'admin@example.com', 'admin', 'active');
