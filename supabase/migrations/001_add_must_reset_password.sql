-- Run this if you already created the database before must_reset_password was added
alter table profiles
add column if not exists must_reset_password boolean not null default false;
