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
