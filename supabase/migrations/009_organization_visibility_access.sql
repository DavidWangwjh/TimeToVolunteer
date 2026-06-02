alter table organizations
add column if not exists visibility text not null default 'public';

alter table organizations
drop constraint if exists organizations_visibility_check;

alter table organizations
add constraint organizations_visibility_check
check (visibility in ('public', 'private'));

update organizations
set visibility = 'public'
where visibility is null;

drop policy if exists "Volunteers can view published opportunities" on volunteer_opportunities;
create policy "Volunteers can view published opportunities"
on volunteer_opportunities for select
using (
  status = 'published'
  and (
    organization_id is null
    or exists (
      select 1 from organizations
      where organizations.id = volunteer_opportunities.organization_id
      and organizations.visibility = 'public'
      and organizations.status = 'active'
    )
    or exists (
      select 1 from organization_memberships
      where organization_memberships.organization_id = volunteer_opportunities.organization_id
      and organization_memberships.volunteer_id = auth.uid()
      and organization_memberships.status = 'accepted'
    )
  )
);
