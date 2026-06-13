# TimeToVolunteer

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
- In-app inbox for booking, membership, and opportunity update notifications
- Platform admin analytics, volunteer management, organization management, application review, and opportunity browsing

## Database

The database is defined by one file:

```txt
supabase/schema.sql
```

There are no incremental migration files in this project anymore. For a new Supabase project, run the full contents of `supabase/schema.sql` once in the Supabase SQL Editor.

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
- `inbox_messages`
- the public `organization-images` storage bucket
- triggers for `updated_at`
- organization description normalization triggers
- helper functions for admin and volunteer access checks
- Row Level Security policies for all app tables

For an existing Supabase project, reset or carefully reconcile your database before running the complete schema. The schema is intended as the source of truth for a fresh setup, not as an incremental patch file.

If you want to intentionally wipe the current app database and rebuild it, run `supabase/reset.sql` instead of `supabase/schema.sql`.

## Environment Variables

Create `.env.local` from `.env.local.example`:

```bash
cp .env.local.example .env.local
```

Required variables:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

Optional variables currently kept for future custom email flows:

```env
RESEND_API_KEY=
RESEND_FROM_EMAIL=
```

The service role key is used only in server actions for admin-level operations such as creating accounts and uploading organization images. Never expose it to client components.

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

### Platform Admin

Platform admins can:

- view overview metrics and analytics
- review organization applications
- manage volunteers
- manage organizations
- suspend accounts
- view opportunities across all organizations
- review organization applications and manage platform records

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
