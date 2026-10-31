-- Run after schema.sql or migration 005 in an isolated test database.
begin;
do $$
declare
  owner_id uuid := gen_random_uuid();
  org_id uuid := gen_random_uuid();
begin
  insert into auth.users(id) values(owner_id);
  insert into public.profiles(id,first_name,last_name,email,role)
    values(owner_id,'Cover','Owner',owner_id || '@test.invalid','organization');
  insert into public.organizations(id,owner_id,name,category,description,contact_email)
    values(org_id,owner_id,'Cover test','Education','Test',owner_id || '@test.invalid');
  assert (select image_position from public.organizations where id=org_id) = '{"x":50,"y":50,"zoom":1}'::jsonb;
  perform set_config('request.jwt.claim.sub',owner_id::text,true);
  set local role authenticated;
  update public.organizations set image_position='{"x":20,"y":80,"zoom":2}' where id=org_id;
  assert found, 'Owner must be able to save framing';
  begin
    update public.organizations set status='suspended' where id=org_id;
    raise exception 'TEST FAILED: owner changed approval status';
  exception when insufficient_privilege then null; end;
  begin
    update public.organizations set image_position='{"x":101,"y":50,"zoom":1}' where id=org_id;
    raise exception 'TEST FAILED: invalid framing accepted';
  exception when check_violation then null; end;
  begin
    update public.organizations set image_position='{}' where id=org_id;
    raise exception 'TEST FAILED: missing framing accepted';
  exception when check_violation then null; end;
  reset role;
end;
$$;
rollback;
