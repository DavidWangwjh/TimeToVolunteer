-- Run after schema.sql / migration 004 in a disposable PostgreSQL or dev database.
-- All fixtures and notifications are rolled back.
begin;
do $$
declare
  owner_id uuid := gen_random_uuid();
  other_owner uuid := gen_random_uuid();
  member_a uuid := gen_random_uuid();
  member_b uuid := gen_random_uuid();
  outsider uuid := gen_random_uuid();
  org_id uuid := gen_random_uuid();
  opp_id uuid := gen_random_uuid();
  invite_a uuid;
  invite_b uuid;
  sent integer;
begin
  insert into auth.users(id) values(owner_id),(other_owner),(member_a),(member_b),(outsider);
  insert into public.profiles(id,first_name,last_name,email,role) values
    (owner_id,'Org','Owner',owner_id || '@test.invalid','organization'),
    (other_owner,'Other','Owner',other_owner || '@test.invalid','organization'),
    (member_a,'Member','A',member_a || '@test.invalid','volunteer'),
    (member_b,'Member','B',member_b || '@test.invalid','volunteer'),
    (outsider,'Non','Member',outsider || '@test.invalid','volunteer');
  insert into public.organizations(id,owner_id,name,category,description,contact_email)
    values(org_id,owner_id,'Invitation test','Education','Test',owner_id || '@test.invalid');
  insert into public.organization_memberships(organization_id,volunteer_id,status)
    values(org_id,member_a,'accepted'),(org_id,member_b,'accepted');
  insert into public.volunteer_opportunities(id,organization_id,title,date,start_time,end_time,location,max_volunteers,status)
    values(opp_id,org_id,'Invitation test',(now() at time zone 'America/Los_Angeles')::date+2,'10:00','11:00','Test',1,'published');

  perform set_config('request.jwt.claim.sub',other_owner::text,true);
  begin
    perform public.invite_opportunity_volunteers(opp_id,array[member_a]);
    raise exception 'TEST FAILED: cross-organization invitation allowed';
  exception when insufficient_privilege then null; end;

  perform set_config('request.jwt.claim.sub',owner_id::text,true);
  select count(*) into sent from public.invite_opportunity_volunteers(opp_id,array[member_a,member_b,member_a,outsider]) where outcome='invited';
  assert sent=2, 'Only distinct accepted members should receive invitations';
  assert (select count(*) from public.bookings where opportunity_id=opp_id and status='approved')=0, 'Inviting must not register anyone';
  assert (select count(*) from public.inbox_messages where opportunity_id=opp_id and kind='opportunity_invited')=2, 'One inbox message per invitation';
  select count(*) into sent from public.invite_opportunity_volunteers(opp_id,array[member_a,member_b]) where outcome='invited';
  assert sent=0, 'Duplicate invitations must be skipped';
  select id into invite_a from public.bookings where opportunity_id=opp_id and volunteer_id=member_a;
  select id into invite_b from public.bookings where opportunity_id=opp_id and volunteer_id=member_b;

  -- Exercise the actual authenticated role, not just RPC identity checks.
  set local role authenticated;
  begin
    update public.bookings set status='approved' where id=invite_a;
    raise exception 'TEST FAILED: owner bypassed invitation consent';
  exception when insufficient_privilege then null; end;
  reset role;

  perform set_config('request.jwt.claim.sub',outsider::text,true);
  begin
    perform public.respond_to_opportunity_invitation(invite_a,true);
    raise exception 'TEST FAILED: another volunteer answered invitation';
  exception when insufficient_privilege then null; end;

  perform set_config('request.jwt.claim.sub',member_a::text,true);
  set local role authenticated;
  perform public.respond_to_opportunity_invitation(invite_a,true);
  reset role;
  assert (select status from public.bookings where id=invite_a)='approved', 'Accepted invitation should register volunteer';
  begin
    perform public.respond_to_opportunity_invitation(invite_a,true);
    raise exception 'TEST FAILED: answered invitation was replayed';
  exception when raise_exception then
    if sqlerrm <> 'This invitation has already been answered' then raise; end if;
  end;

  perform set_config('request.jwt.claim.sub',member_b::text,true);
  begin
    perform public.respond_to_opportunity_invitation(invite_b,true);
    raise exception 'TEST FAILED: full opportunity accepted another volunteer';
  exception when check_violation then null; end;
  assert (select status from public.bookings where id=invite_b)='invited', 'Capacity failure must preserve invitation';
  perform public.respond_to_opportunity_invitation(invite_b,false);
  assert (select status from public.bookings where id=invite_b)='rejected', 'Declined invitation must not register volunteer';
  assert (select count(*) from public.inbox_messages where opportunity_id=opp_id and recipient_id=owner_id)=2, 'Responses notify the organization';

  -- Removing an accepted volunteer frees the active-booking key for either path.
  update public.bookings set status='cancelled', cancelled_at=now() where id=invite_a;
  insert into public.bookings(opportunity_id,volunteer_id,status) values(opp_id,member_a,'pending');
  assert (select count(*) from public.bookings where opportunity_id=opp_id and volunteer_id=member_a and status='pending')=1,
    'Removed volunteer can request registration again';
  update public.bookings set status='cancelled', cancelled_at=now() where opportunity_id=opp_id and volunteer_id=member_a and status='pending';
  perform set_config('request.jwt.claim.sub',owner_id::text,true);
  select count(*) into sent from public.invite_opportunity_volunteers(opp_id,array[member_a]) where outcome='invited';
  assert sent=1, 'Removed volunteer can be invited again';
  perform public.invite_opportunity_volunteers(opp_id,array[member_b]);
  select id into invite_b from public.bookings where opportunity_id=opp_id and volunteer_id=member_b and status='invited';
  update public.organization_memberships set status='rejected' where organization_id=org_id and volunteer_id=member_b;
  perform set_config('request.jwt.claim.sub',member_b::text,true);
  begin
    perform public.respond_to_opportunity_invitation(invite_b,true);
    raise exception 'TEST FAILED: former member accepted invitation';
  exception when raise_exception then
    if sqlerrm <> 'You must still be a member of this organization' then raise; end if;
  end;
  perform set_config('request.jwt.claim.sub',owner_id::text,true);
  update public.volunteer_opportunities set status='cancelled' where id=opp_id;
  begin
    perform public.invite_opportunity_volunteers(opp_id,array[member_b]);
    raise exception 'TEST FAILED: cancelled opportunity allowed invitations';
  exception when raise_exception then
    if sqlerrm <> 'Invitations require an upcoming published opportunity' then raise; end if;
  end;
  raise notice 'Invitation tests passed: ownership, membership, deduplication, consent, acceptance, decline, replay, capacity, notifications, unavailable opportunities';
end;
$$;
rollback;
