-- Dev fixtures required. Run after migration 003; all test writes roll back.
begin;
select set_config('request.jwt.claims', json_build_object('sub',
  (select id from public.profiles where email='ava.volunteer@timetovolunteer.test'),
  'role','authenticated')::text, true);
set local role authenticated;
do $$ declare n integer; begin
  begin
    update public.profiles set role='admin' where id=auth.uid();
    raise exception 'FAIL: self promotion allowed';
  exception when insufficient_privilege then null; end;
  update public.profiles set first_name=first_name where id=auth.uid();
  get diagnostics n=row_count;
  if n<>1 then raise exception 'FAIL: own profile edit blocked or fixture missing'; end if;
  update public.bookings set status='completed' where volunteer_id=auth.uid();
  get diagnostics n=row_count;
  if n<>0 then raise exception 'FAIL: volunteer approval bypass'; end if;
  begin
    update public.inbox_messages set body='forged' where recipient_id=auth.uid();
    raise exception 'FAIL: inbox forgery allowed';
  exception when insufficient_privilege then null; end;
  update public.inbox_messages set read_at=now() where recipient_id=auth.uid();
  get diagnostics n=row_count;
  if n=0 then raise exception 'FAIL: mark read blocked or fixture missing'; end if;
end $$;
reset role;
select set_config('request.jwt.claims', json_build_object('sub',
  (select owner_id from public.organizations where status<>'active' limit 1),
  'role','authenticated')::text, true);
set local role authenticated;
do $$ begin
  begin
    update public.organizations set status='active' where owner_id=auth.uid();
    raise exception 'FAIL: self approval allowed or fixture missing';
  exception when insufficient_privilege then null; end;
  update public.organizations set name=name where owner_id=auth.uid();
end $$;
reset role;
do $$ begin
  begin
    insert into public.bookings(opportunity_id,volunteer_id,status)
    select o.id,p.id,'approved' from public.volunteer_opportunities o cross join public.profiles p
    where o.title='Full Robotics Session' and p.email='ava.volunteer@timetovolunteer.test';
    raise exception 'FAIL: overbooking allowed or fixture missing';
  exception when check_violation then null; end;
end $$;
rollback;
select 'PASS: access and capacity tests; all changes rolled back' as result;
