# [TimeToVolunteer](https://www.timetovolunteer.org)

TimeToVolunteer is a volunteer discovery and registration platform for volunteers, organizations, and platform admins. Volunteers can explore organizations and opportunities, join organizations, register for public opportunities, request access to private ones, and manage their registrations from a calendar-first dashboard. Organizations can manage their profile, opportunities, memberships, registration requests, and inbox. Platform admins can review organization applications, manage users and organizations, and view site-wide analytics.

## Tech Stack

- Next.js 16 App Router
- React 19 and TypeScript
- Tailwind CSS 4 and shadcn-style UI components
- Supabase Auth, Postgres, Row Level Security, and Storage
- FullCalendar for calendar and list views
- Zod and React Hook Form for validation
- Sonner for toast notifications

## Main Features

- Public landing page with volunteer sign-up and organization application flows
- Role-based dashboards at:
  - `/dashboard/volunteer`
  - `/dashboard/organization`
  - `/dashboard/admin`
- Volunteer Explore page with organization/opportunity search, filters, lazy loading, and reusable cards
- Volunteer overview with upcoming registrations, metrics, list view, and calendar view
- Joined organizations page with organization search and filtering
- Organization profile pages with professional image header, contact details, category, visibility, and opportunity calendar
- Public/private organization access:
  - Public organizations can be viewed by authenticated volunteers
  - Private organization opportunities are visible only to approved members
- Public/private opportunity registration:
  - Public opportunities register directly
  - Private opportunities create pending registration requests
- In-app inbox for registration, membership, and opportunity update notifications
- Platform admin analytics, volunteer management, organization management, application review, and opportunity browsing

## Database

The full database schema is defined by one file:

```txt
supabase/schema.sql
```

For a new Supabase project, run the full contents of `supabase/schema.sql` once in the Supabase SQL Editor.

Incremental migration files for existing databases live in:

```txt
supabase/migrations
```

There is also a destructive reset script:

```txt
supabase/reset.sql
```

Use `supabase/reset.sql` only when you want to remove existing TimeToVolunteer app data and recreate the app tables, helper functions, RLS policies, and organization image bucket settings from scratch. The reset script does not delete Supabase Auth users unless you explicitly uncomment the `delete from auth.users;` line near the top of the file.

Supabase does not allow direct SQL deletes from protected storage tables. If you want to remove previously uploaded organization images, clear the `organization-images` bucket through the Supabase Storage UI or Storage API.

The schema creates:

- `profiles`
- `organization_applications`
- `organizations`
- `organization_memberships`
- `volunteer_opportunities`
- `bookings`
- `booking_email_reminders`
- `inbox_messages`
- the public `organization-images` storage bucket
- triggers for `updated_at`
- organization description normalization triggers
- helper functions for admin and volunteer access checks
- Row Level Security policies for all app tables

For an existing Supabase project, reset or carefully reconcile your database before running the complete schema. The schema is intended as the source of truth for a fresh setup, not as an incremental patch file.

If you want to intentionally wipe the current app database and rebuild it, run `supabase/reset.sql` instead of `supabase/schema.sql`.

## Reset development test data

Run `npm run db:seed` to replace app data with development fixtures. The script requires `APP_ENV=development`, `NEXT_PUBLIC_APP_URL=http://localhost:3000`, and the explicitly allowlisted dev Supabase project `hdsevwlvtlpxjikynkof`. It replaces app activity and refreshes fixture profiles, reuses existing Auth accounts without changing passwords or avatar metadata, and creates missing fixture accounts. Other Auth accounts and profiles are preserved. It does not reset the schema or clear uploaded storage files.

New seeded logins use `password123` (existing account passwords are preserved): admin `support@timetovolunteer.org`, organization `org.codeninjas@timetovolunteer.test` or `org.greencity@timetovolunteer.test`, and volunteers `ava.volunteer@timetovolunteer.test`, `ben.volunteer@timetovolunteer.test`, `maya.volunteer@timetovolunteer.test`, `jordan.volunteer@timetovolunteer.test`, and `riley.volunteer@timetovolunteer.test`.

Fixtures cover public/private organizations and opportunities; pending/contacted/accepted/rejected applications; pending/accepted/rejected memberships; every registration and opportunity status; today's check-in session; a full session; completed hours; a three-session weekly series; and read/unread inbox messages. Pending organization logins include `apply.newroots@timetovolunteer.test` and `apply.servicelab@timetovolunteer.test`. Seeding sends no emails. For actual email delivery tests, submit a new application with an address you control; the seeded `.test` addresses are not delivery inboxes.

## Environment Variables

Create `.env.local` from `.env.local.example`:

```bash
cp .env.local.example .env.local
```

Required variables:

```env
APP_ENV=development
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
RESEND_API_KEY=
RESEND_FROM_EMAIL="TimeToVolunteer <support@timetovolunteer.org>"
CRON_SECRET=
```

The service role key, Resend API key, and cron secret are server-only. Never expose them to client components.

## Supabase Setup

1. Create a Supabase project.
2. Open the SQL Editor.
3. Run `supabase/schema.sql`.
4. In Supabase Auth, configure:
   - Site URL: `http://localhost:3000`
   - Redirect URL: `http://localhost:3000/auth/callback`
5. Create your first platform admin auth user.
6. Insert the admin profile row using the auth user ID:

```sql
insert into profiles (id, first_name, last_name, email, role, status)
values (
  'YOUR_AUTH_USER_ID',
  'Admin',
  'User',
  'admin@example.com',
  'admin',
  'active'
);
```

The same commented admin seed template is included at the bottom of both `supabase/schema.sql` and `supabase/reset.sql`.

## Local Development

Install dependencies:

```bash
npm install
```

Start the dev server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Run lint:

```bash
npm run lint
```

Run a production build:

```bash
npm run build
```

## Role Flows

### Volunteer

Volunteers sign up directly. During sign-up they provide:

- name and contact details
- date of birth
- self introduction
- opportunity interests
- password

After signing in, volunteers can explore organizations and opportunities, join or request to join organizations, register or request registration for opportunities, view their calendar/list views, manage registrations, and read inbox messages.

### Organization

Organizations apply through the organization application form. The application includes:

- organization name
- description
- category
- email and phone
- website
- uploaded organization image
- reason for joining

Organization users can log in while pending approval, but only profile and inbox features are unlocked until a platform admin approves the application. Approved organizations can create and manage opportunities, review memberships, review registration requests, and edit their organization profile.

New organization applications submitted through the website send an admin email to `support@timetovolunteer.org` through Resend, with a link to the saved application. Development emails have a `[Development]` subject prefix. The same Resend and app URL configuration below is required. Notification failures are logged without rejecting the application; there is no automatic retry. Seeded applications do not send notifications.

Approving an organization sends an approval email through Resend and creates an in-app inbox message. Production must configure `RESEND_API_KEY`, `RESEND_FROM_EMAIL` (an authorized Resend sender), and `NEXT_PUBLIC_APP_URL` (the public site URL). Accounts created during approval also receive the existing Supabase password setup email. If an email fails, approval still completes and the admin sees a warning. There is no automatic retry or backfill for previously approved organizations.

Rejecting a pending or contacted organization application sends a rejection email through Resend to the application's email address, with replies directed to `support@timetovolunteer.org`. The admin must enter a rejection reason (1–2,000 characters). This reason is saved in `admin_notes` and shared in the rejection email and inbox message; existing notes are not automatically used. If delivery fails, the rejection still completes and the admin sees a warning. Previously rejected applications are not emailed retroactively, and there is no automatic retry.

Rejected organizations can sign in to a limited dashboard, read the rejection reason, edit and save their organization profile, and resubmit with an explanation of their updates. Resubmission copies the saved profile into the application, returns it to `pending`, retains the previous review reason for the admin, and sends a fresh admin email alert. Organization features stay locked until approval. Suspended organizations whose latest application is already accepted do not gain this login exception. No schema migration is required.

### Platform Admin

Platform admins can:

- view overview metrics and analytics
- review organization applications
- manage volunteers
- manage organizations
- suspend accounts
- view opportunities across all organizations
- manage platform records

## Access Model

Organizations have a `visibility`:

- `public`: authenticated volunteers can view the organization profile
- `private`: authenticated volunteers can view profile information, but private-org opportunities are limited to approved members

Opportunities also have a `visibility`:

- `public`: direct registration
- `private`: registration request

The effective access matrix:

| Organization | Opportunity | Volunteer behavior |
| --- | --- | --- |
| Public | Public | Any logged-in volunteer can view and register directly |
| Public | Private | Any logged-in volunteer can view and request registration |
| Private | Public | Only approved organization members can view and register directly |
| Private | Private | Only approved organization members can view and request registration |

## Project Structure

```txt
src/app
  Public routes, auth routes, and role-based dashboard routes

src/components
  Shared UI, dashboard widgets, calendars, profile forms, organization cards,
  opportunity forms, inbox, registrations, and application review components

src/lib
  Server actions, auth helpers, Supabase clients, validation, dates,
  SEO helpers, and display utilities

src/types
  Shared TypeScript database/domain types

supabase/schema.sql
  Complete database schema and RLS setup

public
  Logo and favicon assets
```

## Notes

- `Full` is not stored as an opportunity status. Fullness is derived from approved registration count versus `max_volunteers`.
- Opportunity `visibility` controls registration behavior: public means direct registration, private means request required.
- Organization descriptions should not contain embedded `Category: ...` text. Category is stored in the dedicated `category` column.
- In-app notifications are stored in `inbox_messages`; custom Resend email notifications are not currently part of the active registration workflow.

## GitHub Actions

`CI` runs on pull requests, pushes to main, and manual dispatch. It installs the locked dependencies with Node 22.13.0 / npm 10.9.2, runs ESLint, generates Next.js route types, checks TypeScript, and builds the app. It uses dummy build credentials; it cannot access hosted databases or send email. Vercel continues handling application deployments through its Git integration. CI does not automatically block Vercel deployments; require the `Lint, types, and build` check in a main-branch ruleset and merge via PRs to enforce it.

`Supabase migrations` automatically runs when a push to main changes `supabase/migrations/**` or the migration workflow/shared action. Each environment previews pending migrations and then applies them: development first, production only if development succeeds. Production uses the existing `supabase-production` environment protection rules, so a required reviewer must still approve that job. Each top-level job declares its GitHub environment and resolves its secrets directly; a shared composite action runs the migration steps, no new credentials are needed. Merging these workflow changes will also apply any pending migrations, including 005 if it is present and pending.

Manual Actions runs remain available on main for `development` or `production`: `plan` (default), `apply`, or the one-time `baseline` operation. No local Docker setup is needed. Automatic runs never invoke baseline or repair migration history. Runs serialize per database; do not dispatch a manual apply while an automatic rollout is pending.

### One-time database automation setup

1. Create GitHub environments named `supabase-development` and `supabase-production` (separate from Vercel’s existing Production environment). Restrict their deployment branches to main; configure a required reviewer for production where your GitHub plan supports it.
2. In **each environment**, add the secret `SUPABASE_DB_URL`. Use the matching Supabase project's **Connect → Session pooler** Postgres URL (port 5432, database postgres). Replace the password placeholder with the URL-encoded database password and use `sslmode=require`. Session pooling supports GitHub-hosted IPv4 runners. This is a database connection string, not a Supabase API/service-role key. Never commit it or paste it into workflow inputs.
3. Run `baseline` once for development, then production. It checks the existing schema and records migrations 001, 002, and 003 as already applied; it does not rerun them. These projects were previously upgraded through the SQL Editor. Do not use baseline against a fresh database.
4. Run `plan` and confirm that nothing is pending before adding new migrations.

For future changes, add a new timestamp-prefixed SQL file under `supabase/migrations` (for example via `supabase migration new descriptive_name`); do not edit already-applied migrations. Merge a backward-compatible migration-only PR first. The workflow applies it to development, then production (after any configured approval). Confirm success before merging the dependent application changes. A successful development migration does not substitute for functional testing.

**Vercel still deploys independently through its Git integration. This automation does not gate Vercel on migrations or CI.** Do not merge a database-dependent feature and its migration together assuming execution order. For destructive changes, first deploy application code that stops using the affected fields, then migrate in a separate PR. Apply does not wait for or verify Vercel readiness. The baseline files do not reconstruct a brand-new database; `schema.sql` remains the fresh-install definition. Never use `reset.sql` or development seeds in production.

The workflows do not reset, seed, or automatically repair migration history during normal deployment. If history diverges, investigate before using any repair command. Secrets are scoped to the selected GitHub environment; the target check rejects a connection string for the other project.

### Opportunity invitations

Migration `004_opportunity_invitations.sql` adds invitations and the authenticated invite/respond RPCs. It has been applied to development. Before using this feature in production, run the production migration `plan`, review that 004 is pending, and run `apply`. Do not run the reset or seed scripts in production.

Organizations can invite accepted members to published opportunities whose start time has not passed (America/Los_Angeles). Invitations appear in the volunteer dashboard and inbox; they do not send email or reserve a place. Acceptance confirms registration subject to capacity. Removing a registration allows the volunteer to register again or receive another invitation. Existing registrations remain registered.

The transactional database regression test is `supabase/tests/opportunity_invitations.sql`. Run it with `psql -v ON_ERROR_STOP=1 -f supabase/tests/opportunity_invitations.sql` against an isolated test database with the schema installed. It creates fixtures inside a transaction and rolls them back, covering authorization, consent, capacity, duplicate invitations, and registration/invitation after removal.

### Volunteer profile photos

Volunteers edit their profile from Overview; the old `/dashboard/volunteer/profile` URL redirects there. Photos are optional and are not part of signup. The authenticated `/api/volunteer/avatar` endpoint accepts JPEG, PNG, and WebP files up to 3 MB, validates and re-encodes them to a 512×512 WebP, and strips EXIF metadata. It serves only the signed-in volunteer's own photo with private, non-cacheable responses.

No SQL migration is required. On the first upload in each environment, the server provisions a private `volunteer-avatars` Supabase Storage bucket using the existing service-role key. The object path is stored in Supabase Auth user metadata (`volunteer_avatar_path`). No public bucket or client storage policies are needed. Replacement/removal cleans up the previous object. Photos appear on the volunteer's own Overview and on the read-only volunteer detail page for organizations authorized to view that volunteer. The organization page checks the membership or registration relationship before issuing a one-hour signed photo URL.

### Volunteer ranks

Profile banners use total scheduled hours from checked-in registrations across all organizations. Only approved/completed registrations on published/completed opportunities whose end time has passed (America/Los_Angeles) contribute; cancelled sessions and no-shows do not. Bronze starts at 0 hours, Silver at 50, Gold at 100, Platinum at 250, and Diamond at 500. Totals are computed from existing bookings; no migration or stored rank field is required. Organizations receive only the aggregate after the existing profile access check.

### Comprehensive UI fixtures

Run `npm run db:seed -- --dry-run` to validate fixtures and preview counts without modifying Supabase. `npm run db:seed` refreshes **development only**, replacing organization/application, membership, opportunity, booking, and inbox data. Existing account IDs and profile photos remain intact. Dates are relative to the seed day in America/Los_Angeles; rerun to refresh date-sensitive scenarios.

| Quick login | Rank | Verified hours |
| --- | --- | --- |
| Ava Martinez | Bronze | 2 |
| Ben Carter | Silver | 50 |
| Maya Johnson | Gold | 100 |
| Jordan Lee | Platinum | 250 |
| Riley Chen | Diamond | 500 |

- **Code Ninjas → Memberships:** 24 joined volunteers, three awaiting review, and two rejected memberships hidden from joined members. Includes varied ages/member-since dates and a profile with no birthdate, phone, introduction, or interests (Olivia Patel). Test name links and back navigation.
- **Invitation Lab · Join, Decline, and Rejoin:** Ava and Olivia are invited, Ben joined, Maya requested registration, Jordan was removed/cancelled, and Riley was rejected. The other joined members remain eligible for bulk selection, scrolling, searching, and select-all. Jordan and Riley can be invited or request registration again.
- **Ongoing today · Community Open House:** Ava is checked in, Ben is not. The event runs 00:00–23:59 on the seed day to exercise ongoing styling; it earns no hours until it ends. Invitation controls should be hidden once it starts.
- **Past · Attendance and No-show Review:** all five rank accounts have an approved registration with no check-in, exercising No show. Historical attended shifts populate Completed and Volunteer History; a past published opportunity tests automatic time-based categorization.
- **Other opportunities:** draft, cancelled, full, public/private, future, recurring, and completed sessions. Rank history spans Code Ninjas and Green City to verify global totals while organization history stays organization-specific.
- **Applications and inbox:** pending/contacted/accepted/rejected applications, a rejection reason for resubmission, actionable invitation and registration messages, and read/unread direct messages. Fixture insertion sends no email.

Seed completion verifies persisted rank totals and table counts. Existing uploaded photos are retained; new accounts use initials so the empty-photo state and upload flow remain testable.
