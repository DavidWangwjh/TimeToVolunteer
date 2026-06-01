-- Avoid recursive RLS checks when volunteers request organization access.

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

drop policy if exists "Volunteers can request organization membership" on organization_memberships;

create policy "Volunteers can request organization membership"
on organization_memberships for insert
with check (
  auth.uid() = volunteer_id
  and status = 'pending'
  and is_active_volunteer(auth.uid())
);
