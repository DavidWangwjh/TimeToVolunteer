update volunteer_opportunities
set status = 'published',
    updated_at = now()
where status = 'full';

alter table volunteer_opportunities
drop constraint if exists volunteer_opportunities_status_check;

alter table volunteer_opportunities
add constraint volunteer_opportunities_status_check
check (status in ('draft', 'published', 'cancelled', 'completed'));

drop policy if exists "Volunteers can view published opportunities" on volunteer_opportunities;

create policy "Volunteers can view published opportunities"
on volunteer_opportunities for select
using (status = 'published');
