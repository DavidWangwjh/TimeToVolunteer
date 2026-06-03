-- Organization accounts, organization memberships, and opportunity access model.

alter table profiles
drop constraint if exists profiles_role_check;

alter table profiles
add constraint profiles_role_check
check (role in ('volunteer', 'organization', 'admin'));

create table if not exists organization_applications (
  id uuid primary key default gen_random_uuid(),
  organization_name text not null,
  contact_first_name text,
  contact_last_name text,
  email text not null,
  phone text,
  website text,
  mission text,
  reason text,
  status text not null default 'pending',
  admin_notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  constraint organization_applications_status_check check (
    status in ('pending', 'contacted', 'accepted', 'rejected')
  )
);

create table if not exists organizations (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references profiles(id) on delete cascade,
  name text not null,
  description text,
  website text,
  contact_email text not null,
  contact_phone text,
  status text not null default 'active',
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  constraint organizations_status_check check (
    status in ('active', 'inactive', 'suspended')
  )
);

create unique index if not exists unique_organization_owner
on organizations (owner_id);

create table if not exists organization_memberships (
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

create unique index if not exists unique_membership_per_volunteer
on organization_memberships (organization_id, volunteer_id);

alter table volunteer_opportunities
add column if not exists organization_id uuid references organizations(id) on delete cascade,
add column if not exists visibility text not null default 'public',
add column if not exists signup_mode text not null default 'application';

alter table volunteer_opportunities
drop constraint if exists volunteer_opportunities_visibility_check;

alter table volunteer_opportunities
add constraint volunteer_opportunities_visibility_check
check (visibility in ('public', 'private'));

alter table volunteer_opportunities
drop constraint if exists volunteer_opportunities_signup_mode_check;

alter table volunteer_opportunities
add constraint volunteer_opportunities_signup_mode_check
check (signup_mode in ('open', 'application'));

drop trigger if exists organization_applications_updated_at on organization_applications;
create trigger organization_applications_updated_at before update on organization_applications
  for each row execute function update_updated_at();
drop trigger if exists organizations_updated_at on organizations;
create trigger organizations_updated_at before update on organizations
  for each row execute function update_updated_at();
drop trigger if exists organization_memberships_updated_at on organization_memberships;
create trigger organization_memberships_updated_at before update on organization_memberships
  for each row execute function update_updated_at();

alter table organization_applications enable row level security;
alter table organizations enable row level security;
alter table organization_memberships enable row level security;

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

drop policy if exists "Anyone can submit organization application" on organization_applications;
create policy "Anyone can submit organization application"
on organization_applications for insert
with check (true);

drop policy if exists "Admins can manage organization applications" on organization_applications;
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

drop policy if exists "Organizations are viewable by authenticated users" on organizations;
create policy "Organizations are viewable by authenticated users"
on organizations for select
using (auth.uid() is not null);

drop policy if exists "Organization owners can manage own organization" on organizations;
create policy "Organization owners can manage own organization"
on organizations for all
using (owner_id = auth.uid() or is_admin(auth.uid()))
with check (owner_id = auth.uid() or is_admin(auth.uid()));

drop policy if exists "Volunteers can view own organization memberships" on organization_memberships;
create policy "Volunteers can view own organization memberships"
on organization_memberships for select
using (auth.uid() = volunteer_id or is_admin(auth.uid()));

drop policy if exists "Volunteers can request organization membership" on organization_memberships;
create policy "Volunteers can request organization membership"
on organization_memberships for insert
with check (
  auth.uid() = volunteer_id
  and status = 'pending'
  and exists (
    select 1 from profiles
    where profiles.id = auth.uid()
    and profiles.role = 'volunteer'
    and profiles.status = 'active'
  )
);

drop policy if exists "Organization owners can manage memberships" on organization_memberships;
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

drop policy if exists "Organization owners can manage own opportunities" on volunteer_opportunities;
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

drop policy if exists "Volunteers can view published opportunities" on volunteer_opportunities;
create policy "Volunteers can view published opportunities"
on volunteer_opportunities for select
using (
  status = 'published'
  and (
    visibility = 'public'
    or exists (
      select 1 from organization_memberships
      where organization_memberships.organization_id = volunteer_opportunities.organization_id
      and organization_memberships.volunteer_id = auth.uid()
      and organization_memberships.status = 'accepted'
    )
  )
);

drop policy if exists "Organization owners can manage own bookings" on bookings;
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
