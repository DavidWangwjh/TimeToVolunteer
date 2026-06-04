-- Drop fields that are no longer used by the current application flows.
-- Organization applications now use organization_description/category directly.
alter table organization_applications
drop column if exists contact_first_name,
drop column if exists contact_last_name,
drop column if exists mission;

-- Opportunity access now follows opportunity visibility:
-- public = direct registration, private = registration request.
alter table volunteer_opportunities
drop constraint if exists volunteer_opportunities_signup_mode_check;

alter table volunteer_opportunities
drop column if exists signup_mode;
