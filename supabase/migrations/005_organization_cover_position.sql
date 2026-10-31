-- Preserve the full cover image and store reversible framing separately.
ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS image_position jsonb NOT NULL DEFAULT '{"x":50,"y":50,"zoom":1}'::jsonb;

ALTER TABLE public.organizations
  ADD CONSTRAINT organizations_image_position_valid CHECK (
    jsonb_typeof(image_position) = 'object'
    AND image_position ?& ARRAY['x', 'y', 'zoom']
    AND jsonb_typeof(image_position->'x') = 'number'
    AND jsonb_typeof(image_position->'y') = 'number'
    AND jsonb_typeof(image_position->'zoom') = 'number'
    AND (image_position->>'x')::numeric BETWEEN 0 AND 100
    AND (image_position->>'y')::numeric BETWEEN 0 AND 100
    AND (image_position->>'zoom')::numeric BETWEEN 1 AND 3
  );

-- Permit owners to adjust framing without granting changes to access fields.
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
      if (to_jsonb(new) - array['name','category','description','image_url','image_position','website','contact_email','contact_phone','visibility','updated_at'])
         is distinct from (to_jsonb(old) - array['name','category','description','image_url','image_position','website','contact_email','contact_phone','visibility','updated_at']) then
        raise exception 'Only an administrator can change organization approval or ownership' using errcode='42501';
      end if;
    end if;
  end if;
  return new;
end;
$$;
