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
  constraint profiles_role_check check (role in ('volunteer', 'admin')),
  constraint profiles_status_check check (status in ('active', 'inactive', 'suspended'))
);

create table volunteer_applications (
  id uuid primary key default gen_random_uuid(),
  first_name text not null,
  last_name text not null,
  email text not null,
  phone text,
  age text,
  availability text,
  experience text,
  preferred_areas text,
  reason text,
  emergency_contact_name text,
  emergency_contact_phone text,
  agreement_accepted boolean not null default false,
  status text not null default 'pending',
  admin_notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  constraint volunteer_applications_status_check check (
    status in ('pending', 'contacted', 'accepted', 'rejected')
  )
);

create table volunteer_opportunities (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  date date not null,
  start_time time not null,
  end_time time not null,
  location text not null,
  experience_required text,
  max_volunteers integer not null default 1,
  status text not null default 'draft',
  created_by uuid references profiles(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  constraint volunteer_opportunities_status_check check (
    status in ('draft', 'published', 'cancelled', 'completed')
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
create trigger volunteer_applications_updated_at before update on volunteer_applications
  for each row execute function update_updated_at();
create trigger volunteer_opportunities_updated_at before update on volunteer_opportunities
  for each row execute function update_updated_at();
create trigger bookings_updated_at before update on bookings
  for each row execute function update_updated_at();

-- RLS
alter table profiles enable row level security;
alter table volunteer_applications enable row level security;
alter table volunteer_opportunities enable row level security;
alter table bookings enable row level security;

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

create policy "Users can view own profile"
on profiles for select
using (auth.uid() = id);

create policy "Users can update own limited profile"
on profiles for update
using (auth.uid() = id);

create policy "Admins can manage profiles"
on profiles for all
using (is_admin(auth.uid()));

create policy "Anyone can submit volunteer application"
on volunteer_applications for insert
with check (true);

create policy "Admins can manage applications"
on volunteer_applications for all
using (is_admin(auth.uid()));

create policy "Volunteers can view published opportunities"
on volunteer_opportunities for select
using (status = 'published');

create policy "Admins can manage opportunities"
on volunteer_opportunities for all
using (is_admin(auth.uid()));

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

-- Seed admin (replace AUTH_USER_ID_HERE after creating auth user in Supabase)
-- insert into profiles (id, first_name, last_name, email, role, status)
-- values ('AUTH_USER_ID_HERE', 'Admin', 'User', 'admin@example.com', 'admin', 'active');
