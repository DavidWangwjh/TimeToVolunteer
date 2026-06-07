create or replace function normalize_organization_description(value text)
returns text
language sql
immutable
as $$
  select nullif(
    btrim(regexp_replace(coalesce(value, ''), '\s*Category:\s*[^.]+\.?', ' ', 'gi')),
    ''
  );
$$;

update organizations
set description = normalize_organization_description(description)
where description ~* 'Category:\s*[^.]+';

update organization_applications
set organization_description = normalize_organization_description(organization_description)
where organization_description ~* 'Category:\s*[^.]+';

create or replace function normalize_organization_description_fields()
returns trigger
language plpgsql
as $$
begin
  if tg_table_name = 'organizations' then
    new.description := normalize_organization_description(new.description);
  elsif tg_table_name = 'organization_applications' then
    new.organization_description :=
      normalize_organization_description(new.organization_description);
  end if;

  return new;
end;
$$;

drop trigger if exists normalize_organizations_description on organizations;
create trigger normalize_organizations_description
before insert or update of description on organizations
for each row
execute function normalize_organization_description_fields();

drop trigger if exists normalize_organization_applications_description
on organization_applications;
create trigger normalize_organization_applications_description
before insert or update of organization_description on organization_applications
for each row
execute function normalize_organization_description_fields();
