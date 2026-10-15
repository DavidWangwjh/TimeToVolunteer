-- Read-only preflight for recording the manually applied 001–003 migrations.
begin read only;
do $$ begin
  if to_regclass('public.booking_email_reminders') is null
     or not exists(select 1 from pg_class where oid='public.booking_email_reminders'::regclass and relrowsecurity)
     or not exists(select 1 from pg_constraint where conrelid='public.booking_email_reminders'::regclass and conname='booking_email_reminders_booking_date_unique') then
    raise exception 'Migration 001 is not fully applied';
  end if;
  if not exists(select 1 from pg_constraint where conrelid='public.inbox_messages'::regclass and conname='inbox_messages_kind_check' and pg_get_constraintdef(oid) like '%direct_message%')
     or not exists(select 1 from pg_policies where schemaname='public' and tablename='inbox_messages' and policyname='Users can delete own inbox messages') then
    raise exception 'Migration 002 is not fully applied';
  end if;
  if exists(select 1 from information_schema.columns where table_schema='public' and table_name='inbox_messages' and column_name='deleted_at')
     or (select count(*) from pg_trigger where not tgisinternal and tgenabled='O' and tgname in ('protect_profile_fields','protect_organization_fields','enforce_booking_capacity')) <> 3
     or to_regclass('public.organization_applications_one_open_email_idx') is null
     or has_column_privilege('authenticated','public.inbox_messages','body','UPDATE')
     or not has_column_privilege('authenticated','public.inbox_messages','read_at','UPDATE') then
    raise exception 'Migration 003 is not fully applied';
  end if;
end $$;
rollback;
