-- Apply with the matching application release. Transactional; no CASCADE drops.
begin;

-- Do not erase historical data when upgrading an older project.
do $$
begin
  if to_regclass('public.volunteer_applications') is not null then
    if exists (select 1 from public.volunteer_applications) then
      raise exception 'Archive volunteer_applications before removing this obsolete table';
    end if;
    drop table public.volunteer_applications;
  end if;
  if exists (select 1 from information_schema.columns where table_schema='public' and table_name='inbox_messages' and column_name='deleted_at') then
    if exists (select 1 from public.inbox_messages where deleted_at is not null) then
      raise exception 'Archive soft-deleted inbox messages before removing deleted_at';
    end if;
    alter table public.inbox_messages drop column deleted_at;
  end if;
end;
$$;

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
      if (to_jsonb(new) - array['name','category','description','image_url','website','contact_email','contact_phone','visibility','updated_at'])
         is distinct from (to_jsonb(old) - array['name','category','description','image_url','website','contact_email','contact_phone','visibility','updated_at']) then
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

commit;
