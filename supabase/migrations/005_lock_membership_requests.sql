-- Make volunteer-created organization membership requests explicitly pending.

drop policy if exists "Volunteers can request organization membership" on organization_memberships;

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

create policy "Volunteers can request organization membership"
on organization_memberships for insert
with check (
  auth.uid() = volunteer_id
  and status = 'pending'
  and is_active_volunteer(auth.uid())
);

drop policy if exists "Organization owners can view member profiles" on profiles;

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
