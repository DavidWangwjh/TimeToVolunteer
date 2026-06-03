alter table organization_applications
add column if not exists category text,
add column if not exists organization_description text,
add column if not exists image_url text;

alter table organization_applications
alter column contact_first_name drop not null,
alter column contact_last_name drop not null;

update organization_applications
set organization_description = coalesce(organization_description, mission)
where organization_description is null;

alter table organizations
add column if not exists category text,
add column if not exists image_url text;
