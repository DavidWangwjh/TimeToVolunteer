# Volunteer Scheduling Website Implementation Guide

## Project Goal

Build a volunteer scheduling website where users can apply to become volunteers, log in after approval, view available volunteer opportunities on a calendar, request bookings, and receive email notifications when their bookings are approved.

The website should support two roles:

1. Volunteer user
2. Admin user

Volunteers can only book available sessions and view their own bookings. Admins can manage volunteer opportunities, review volunteer applications, approve users manually, and approve or reject booking requests.

---

## Recommended Tech Stack

Use the following stack:

- Framework: Next.js with App Router
- Language: TypeScript
- Styling: Tailwind CSS
- UI components: shadcn/ui
- Database: Supabase Postgres
- Authentication: Supabase Auth
- Authorization: Supabase Row Level Security
- Email service: Resend
- Calendar UI: FullCalendar or React Big Calendar
- Form validation: Zod
- Forms: React Hook Form
- Date handling: date-fns
- Deployment: Vercel
- Database hosting: Supabase
- Email sending: Resend

Use server actions or route handlers for database writes. Do not expose admin-only operations to the client.

---

## Core User Flows

### Public User Flow

The public landing page should have:

- Hero section explaining the volunteer program
- Log in button
- Apply to be a volunteer button
- Short section explaining how volunteering works
- Call-to-action section
- Footer with contact information

Public users can submit a volunteer application without creating an account.

After submitting the application, they should see a confirmation message saying:

"Thank you for applying. Our team will review your application and reach out to you personally."

The website does not need to handle the interview or acceptance conversation.

---

### Volunteer Application Flow

A public user fills out an application form.

Application form fields:

- First name
- Last name
- Email
- Phone number
- Age or date of birth
- Availability
- Relevant experience
- Preferred volunteer areas
- Reason for volunteering
- Emergency contact name
- Emergency contact phone
- Agreement checkbox
- Created date
- Status

Application statuses:

- pending
- contacted
- accepted
- rejected

When an admin accepts an applicant, the system should send the applicant an email inviting them to set up their account.

The account setup email should include a secure invite link or password setup link.

---

### Login Flow

Only accepted volunteers and admins should be able to log in.

After login:

- Volunteers go to `/dashboard`
- Admins go to `/admin`

If a user is logged in but does not have an approved volunteer profile, show a message saying their account is not active yet.

---

### Volunteer Dashboard Flow

The volunteer dashboard should include:

- Calendar of available volunteer sessions
- List of upcoming booked sessions
- List of pending booking requests
- List of past sessions
- Profile section

The calendar should show available volunteer opportunities by date and time.

When a volunteer clicks an available slot, open a detail modal or detail page.

Opportunity details should include:

- Title
- Description
- Date
- Start time
- End time
- Location
- Required experience
- Number of spots available
- Number of spots remaining
- Notes
- Contact person
- Status

The volunteer should be able to request a booking.

After requesting a booking, the booking status should be `pending`.

The volunteer should not be immediately confirmed.

---

### Booking Approval Flow

When a volunteer books a session, an admin needs to approve or reject the request.

Booking statuses:

- pending
- approved
- rejected
- cancelled
- completed

When an admin approves a booking:

- Update booking status to `approved`
- Decrease the available spots if needed
- Send the volunteer an email notification

When an admin rejects a booking:

- Update booking status to `rejected`
- Optional: send rejection email

Volunteers should be able to cancel their own pending or approved bookings before a cutoff time.

Recommended cutoff rule:

- Volunteers can cancel up to 24 hours before the session starts.
- Admins can cancel any booking at any time.

---

## Admin Features

Create an admin dashboard at `/admin`.

Admin dashboard should include:

- Overview stats
- Volunteer application management
- Volunteer account management
- Opportunity management
- Booking request management
- Calendar management

### Admin Overview Stats

Show:

- Pending applications
- Accepted volunteers
- Pending booking requests
- Upcoming sessions
- Approved bookings this month
- Available sessions this week

### Volunteer Application Management

Admins should be able to:

- View all applications
- Filter by status
- View application details
- Mark as contacted
- Accept applicant
- Reject applicant
- Add internal notes

When accepting an applicant:

- Create or update volunteer profile
- Send account setup email
- Change application status to `accepted`

### Volunteer Account Management

Admins should be able to:

- View all volunteers
- View volunteer profile
- Set volunteer status
- Make a user admin
- Disable a volunteer account
- View volunteer booking history

Volunteer statuses:

- active
- inactive
- suspended

### Opportunity Management

Admins should be able to create, edit, delete, and publish volunteer opportunities.

Opportunity fields:

- Title
- Description
- Date
- Start time
- End time
- Location
- Required experience
- Max volunteers
- Published status
- Internal notes
- Created by
- Created at
- Updated at

Opportunity statuses:

- draft
- published
- full
- cancelled
- completed

Only published opportunities should appear on the volunteer calendar.

### Booking Request Management

Admins should be able to:

- View pending booking requests
- Approve booking
- Reject booking
- Cancel booking
- View volunteer details
- View opportunity details
- Add admin notes

---

## Pages and Routes

### Public Pages

Create these pages:

- `/` landing page
- `/login` login page
- `/apply` volunteer application page
- `/application-submitted` confirmation page
- `/set-password` or `/auth/callback` account setup flow

### Volunteer Pages

Create these pages:

- `/dashboard` volunteer dashboard
- `/dashboard/calendar` calendar view
- `/dashboard/bookings` booked sessions list
- `/dashboard/profile` profile page

### Admin Pages

Create these pages:

- `/admin` admin overview
- `/admin/applications` application list
- `/admin/applications/[id]` application detail page
- `/admin/volunteers` volunteer list
- `/admin/volunteers/[id]` volunteer detail page
- `/admin/opportunities` opportunity list
- `/admin/opportunities/new` create opportunity page
- `/admin/opportunities/[id]/edit` edit opportunity page
- `/admin/bookings` booking request list
- `/admin/calendar` admin calendar view

---

## Database Schema

Use Supabase Postgres.

### Table: profiles

Stores user profile data after account creation.

Fields:

- id uuid primary key, references auth.users(id)
- first_name text not null
- last_name text not null
- email text not null unique
- phone text
- role text not null default 'volunteer'
- status text not null default 'active'
- created_at timestamp default now()
- updated_at timestamp default now()

Allowed roles:

- volunteer
- admin

Allowed statuses:

- active
- inactive
- suspended

---

### Table: volunteer_applications

Stores public volunteer applications.

Fields:

- id uuid primary key default gen_random_uuid()
- first_name text not null
- last_name text not null
- email text not null
- phone text
- age text
- availability text
- experience text
- preferred_areas text
- reason text
- emergency_contact_name text
- emergency_contact_phone text
- agreement_accepted boolean not null default false
- status text not null default 'pending'
- admin_notes text
- created_at timestamp default now()
- updated_at timestamp default now()

Allowed statuses:

- pending
- contacted
- accepted
- rejected

---

### Table: volunteer_opportunities

Stores available volunteer sessions.

Fields:

- id uuid primary key default gen_random_uuid()
- title text not null
- description text not null
- date date not null
- start_time time not null
- end_time time not null
- location text not null
- experience_required text
- max_volunteers integer not null default 1
- status text not null default 'draft'
- internal_notes text
- created_by uuid references profiles(id)
- created_at timestamp default now()
- updated_at timestamp default now()

Allowed statuses:

- draft
- published
- full
- cancelled
- completed

---

### Table: bookings

Stores volunteer booking requests.

Fields:

- id uuid primary key default gen_random_uuid()
- opportunity_id uuid references volunteer_opportunities(id) on delete cascade
- volunteer_id uuid references profiles(id) on delete cascade
- status text not null default 'pending'
- volunteer_note text
- admin_note text
- approved_by uuid references profiles(id)
- approved_at timestamp
- rejected_at timestamp
- cancelled_at timestamp
- created_at timestamp default now()
- updated_at timestamp default now()

Allowed statuses:

- pending
- approved
- rejected
- cancelled
- completed

Important rule:

A volunteer should not be able to create duplicate active bookings for the same opportunity.

Add a unique constraint or application-level check for:

- same volunteer_id
- same opportunity_id
- status is pending or approved

---

## Security Requirements

Use Supabase Row Level Security.

General rules:

- Public users can insert volunteer applications.
- Public users cannot read application data.
- Volunteers can read their own profile.
- Volunteers can update limited profile fields.
- Volunteers can view published opportunities.
- Volunteers can create booking requests for themselves.
- Volunteers can only view their own bookings.
- Volunteers cannot approve bookings.
- Admins can read and manage all applications.
- Admins can read and manage all opportunities.
- Admins can read and manage all bookings.
- Admins can read and manage profiles.

Never trust client-side role checks alone. Always verify permissions on the server or through RLS.

---

## Email Requirements

Use Resend for transactional emails.

Create email utility functions in:

`src/lib/email.ts`

Required email types:

### Account Setup Email

Triggered when admin accepts a volunteer application.

Subject:

"Set up your volunteer account"

Content:

- Greeting
- Message saying their volunteer application has been accepted
- Account setup button
- Contact info for questions

### Booking Approved Email

Triggered when admin approves a booking.

Subject:

"Your volunteer booking has been approved"

Content:

- Volunteer name
- Opportunity title
- Date
- Time
- Location
- Any notes

### Optional Booking Rejected Email

Triggered when admin rejects a booking.

Subject:

"Volunteer booking update"

Content:

- Booking was not approved
- Optional admin note
- Contact info

---

## UI Requirements

Use a clean, friendly, modern design.

Recommended style:

- White or light background
- Soft cards
- Rounded corners
- Clear buttons
- Simple calendar interface
- Mobile responsive layout
- Accessible form labels
- Clear loading states
- Clear empty states

Use shadcn/ui components for:

- Button
- Card
- Dialog
- Input
- Textarea
- Select
- Badge
- Table
- Tabs
- Calendar if useful
- Toast notifications

Use badges for statuses:

- pending
- approved
- rejected
- cancelled
- completed
- draft
- published
- full

---

## Calendar Requirements

Volunteer calendar:

- Show only published opportunities
- Do not show cancelled opportunities as bookable
- Show full sessions as unavailable
- Clicking an opportunity opens a details modal
- Details modal has a "Request Booking" button
- Disable the button if the user already booked that session
- Disable the button if the session is full
- Disable the button if the opportunity date has passed

Admin calendar:

- Show all opportunities
- Use status labels
- Allow quick access to edit opportunity
- Show number of approved and pending bookings

---

## Booking Logic

When a volunteer requests a booking:

1. Confirm user is logged in.
2. Confirm user has role `volunteer`.
3. Confirm user status is `active`.
4. Confirm opportunity exists.
5. Confirm opportunity status is `published`.
6. Confirm opportunity date and time are not in the past.
7. Confirm opportunity is not full.
8. Confirm user does not already have a pending or approved booking for this opportunity.
9. Create booking with status `pending`.
10. Show success toast.

When an admin approves a booking:

1. Confirm user is admin.
2. Confirm booking exists.
3. Confirm booking status is `pending`.
4. Confirm opportunity still has available spots.
5. Update booking status to `approved`.
6. Set approved_by.
7. Set approved_at.
8. Send booking approved email.
9. Show success toast.

When checking if a session is full:

- Count approved bookings for that opportunity.
- Compare approved count with max_volunteers.
- If approved count >= max_volunteers, the session is full.

---

## Folder Structure

Use this structure:

```txt
src/
  app/
    page.tsx
    login/
      page.tsx
    apply/
      page.tsx
    application-submitted/
      page.tsx
    dashboard/
      page.tsx
      calendar/
        page.tsx
      bookings/
        page.tsx
      profile/
        page.tsx
    admin/
      page.tsx
      applications/
        page.tsx
        [id]/
          page.tsx
      volunteers/
        page.tsx
        [id]/
          page.tsx
      opportunities/
        page.tsx
        new/
          page.tsx
        [id]/
          edit/
            page.tsx
      bookings/
        page.tsx
      calendar/
        page.tsx
    api/
      bookings/
        route.ts
      bookings/
        [id]/
          approve/
            route.ts
          reject/
            route.ts
      applications/
        route.ts
      applications/
        [id]/
          accept/
            route.ts
          reject/
            route.ts
      opportunities/
        route.ts
  components/
    layout/
      Navbar.tsx
      Sidebar.tsx
      PageHeader.tsx
    calendar/
      VolunteerCalendar.tsx
      OpportunityDetailsDialog.tsx
    applications/
      ApplicationForm.tsx
      ApplicationTable.tsx
    bookings/
      BookingTable.tsx
      BookingStatusBadge.tsx
    opportunities/
      OpportunityForm.tsx
      OpportunityTable.tsx
    ui/
  lib/
    supabase/
      client.ts
      server.ts
      admin.ts
    email.ts
    auth.ts
    permissions.ts
    validators.ts
    utils.ts
  types/
    database.ts
    app.ts
````

---

## Environment Variables

Create `.env.local` with:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

RESEND_API_KEY=
RESEND_FROM_EMAIL=

NEXT_PUBLIC_APP_URL=
```

Important:

* Never expose `SUPABASE_SERVICE_ROLE_KEY` to the browser.
* Only use the service role key in server-side code.
* Use it for admin-only operations and email-triggered flows when needed.

---

## Validation Requirements

Use Zod for form validation.

Create schemas for:

* Volunteer application
* Opportunity form
* Booking request
* Admin booking update
* Profile update

Example validation rules:

Volunteer application:

* First name required
* Last name required
* Valid email required
* Phone required
* Reason required
* Agreement checkbox must be true

Opportunity:

* Title required
* Description required
* Date required
* Start time required
* End time required
* Location required
* Max volunteers must be at least 1
* End time must be after start time

Booking:

* Opportunity ID required
* Volunteer note optional

---

## MVP Build Order

Build in this order:

### Phase 1: Project Setup

1. Create Next.js app with TypeScript.
2. Install Tailwind CSS.
3. Install shadcn/ui.
4. Set up Supabase project.
5. Add Supabase client and server helpers.
6. Create database tables.
7. Enable RLS.
8. Add seed admin user manually.

### Phase 2: Public Pages

1. Build landing page.
2. Build login page.
3. Build volunteer application page.
4. Store applications in Supabase.
5. Build application submitted page.

### Phase 3: Authentication and Profiles

1. Set up Supabase Auth.
2. Create profiles table.
3. Add protected route logic.
4. Add role-based redirects.
5. Create volunteer dashboard shell.
6. Create admin dashboard shell.

### Phase 4: Admin Application Management

1. Build admin application list.
2. Build application detail page.
3. Add status update actions.
4. Add accept applicant action.
5. Send account setup email when accepted.

### Phase 5: Opportunity Management

1. Build opportunity table.
2. Build create opportunity form.
3. Build edit opportunity form.
4. Add publish/draft/cancel status handling.
5. Show opportunities on admin calendar.

### Phase 6: Volunteer Calendar and Booking

1. Build volunteer calendar.
2. Show published opportunities.
3. Add opportunity detail modal.
4. Add request booking button.
5. Create pending booking.
6. Show user’s booked sessions.

### Phase 7: Admin Booking Approval

1. Build pending booking list.
2. Add approve booking action.
3. Add reject booking action.
4. Send email when approved.
5. Update volunteer booking list.

### Phase 8: Polish

1. Add loading states.
2. Add empty states.
3. Add error states.
4. Add toast notifications.
5. Add mobile responsive styling.
6. Test permissions.
7. Test email delivery.
8. Deploy to Vercel.

---

## Required Components

Create these reusable components:

### Navbar

Used on public pages.

Links:

* Home
* Apply
* Login

### DashboardSidebar

Used for volunteer dashboard.

Links:

* Calendar
* My Bookings
* Profile

### AdminSidebar

Used for admin dashboard.

Links:

* Overview
* Applications
* Volunteers
* Opportunities
* Bookings
* Calendar

### StatusBadge

Reusable badge component for all statuses.

### OpportunityDetailsDialog

Shows opportunity details and booking button.

### BookingTable

Shows bookings with status and actions.

### ApplicationTable

Shows volunteer applications with filters.

### OpportunityForm

Used for create and edit opportunity pages.

---

## API / Server Action Requirements

Prefer server actions for form submissions when possible.

Create server-side functions for:

* submitVolunteerApplication
* acceptVolunteerApplication
* rejectVolunteerApplication
* createOpportunity
* updateOpportunity
* deleteOpportunity
* requestBooking
* approveBooking
* rejectBooking
* cancelBooking
* getCurrentUserProfile
* requireAdmin
* requireActiveVolunteer

All sensitive actions must check the current user’s role.

---

## Authorization Helper Requirements

Create `src/lib/permissions.ts`.

Add helpers:

```ts
export function isAdmin(profile: Profile) {
  return profile.role === "admin";
}

export function isActiveVolunteer(profile: Profile) {
  return profile.role === "volunteer" && profile.status === "active";
}
```

Create server helpers:

```ts
export async function requireAdmin() {
  // Get current user
  // Get profile
  // Throw error if profile.role is not admin
}

export async function requireActiveVolunteer() {
  // Get current user
  // Get profile
  // Throw error if profile is not active volunteer
}
```

---

## Important Edge Cases

Handle these cases:

* User tries to book the same opportunity twice
* User tries to book a full opportunity
* User tries to book a past opportunity
* User tries to access admin pages without admin role
* User submits application with duplicate email
* Admin approves booking after the opportunity becomes full
* Email fails to send after booking approval
* Volunteer cancels a booking
* Opportunity is cancelled after users have approved bookings
* User account exists but profile is missing
* User is accepted but has not set up their account yet

---

## Email Failure Handling

If an email fails to send:

* Do not crash the entire app.
* Log the error.
* Show admin a warning if relevant.
* Still save the database update if the main action succeeded.
* Add a future improvement to retry failed emails.

Optional future table:

`email_logs`

Fields:

* id
* recipient_email
* email_type
* status
* error_message
* created_at

---

## Admin Seed Requirement

Create at least one admin manually.

Recommended approach:

1. Create an auth user in Supabase.
2. Insert a matching row in `profiles`.
3. Set role to `admin`.
4. Set status to `active`.

Example profile:

```sql
insert into profiles (
  id,
  first_name,
  last_name,
  email,
  role,
  status
)
values (
  'AUTH_USER_ID_HERE',
  'Admin',
  'User',
  'admin@example.com',
  'admin',
  'active'
);
```

---

## Suggested SQL Schema

Create this schema in Supabase.

```sql
create extension if not exists "pgcrypto";

create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  first_name text not null,
  last_name text not null,
  email text not null unique,
  phone text,
  role text not null default 'volunteer',
  status text not null default 'active',
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  constraint profiles_role_check check (role in ('volunteer', 'admin')),
  constraint profiles_status_check check (status in ('active', 'inactive', 'suspended'))
);

create table volunteer_applications (
  id uuid primary key default gen_random_uuid(),
  first_name text not null,
  last_name text not null,
  email text not null,
  phone text,
  age text,
  availability text,
  experience text,
  preferred_areas text,
  reason text,
  emergency_contact_name text,
  emergency_contact_phone text,
  agreement_accepted boolean not null default false,
  status text not null default 'pending',
  admin_notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  constraint volunteer_applications_status_check check (
    status in ('pending', 'contacted', 'accepted', 'rejected')
  )
);

create table volunteer_opportunities (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text not null,
  date date not null,
  start_time time not null,
  end_time time not null,
  location text not null,
  experience_required text,
  max_volunteers integer not null default 1,
  status text not null default 'draft',
  internal_notes text,
  created_by uuid references profiles(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  constraint volunteer_opportunities_status_check check (
    status in ('draft', 'published', 'full', 'cancelled', 'completed')
  ),
  constraint volunteer_opportunities_max_volunteers_check check (max_volunteers >= 1),
  constraint volunteer_opportunities_time_check check (end_time > start_time)
);

create table bookings (
  id uuid primary key default gen_random_uuid(),
  opportunity_id uuid not null references volunteer_opportunities(id) on delete cascade,
  volunteer_id uuid not null references profiles(id) on delete cascade,
  status text not null default 'pending',
  volunteer_note text,
  admin_note text,
  approved_by uuid references profiles(id),
  approved_at timestamptz,
  rejected_at timestamptz,
  cancelled_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  constraint bookings_status_check check (
    status in ('pending', 'approved', 'rejected', 'cancelled', 'completed')
  )
);

create unique index unique_active_booking_per_volunteer
on bookings (opportunity_id, volunteer_id)
where status in ('pending', 'approved');
```

---

## Suggested RLS Policies

Enable RLS:

```sql
alter table profiles enable row level security;
alter table volunteer_applications enable row level security;
alter table volunteer_opportunities enable row level security;
alter table bookings enable row level security;
```

Helper function:

```sql
create or replace function is_admin(user_id uuid)
returns boolean
language sql
security definer
as $$
  select exists (
    select 1
    from profiles
    where id = user_id
    and role = 'admin'
    and status = 'active'
  );
$$;
```

Profiles policies:

```sql
create policy "Users can view own profile"
on profiles for select
using (auth.uid() = id);

create policy "Users can update own limited profile"
on profiles for update
using (auth.uid() = id);

create policy "Admins can manage profiles"
on profiles for all
using (is_admin(auth.uid()));
```

Applications policies:

```sql
create policy "Anyone can submit volunteer application"
on volunteer_applications for insert
with check (true);

create policy "Admins can manage applications"
on volunteer_applications for all
using (is_admin(auth.uid()));
```

Opportunities policies:

```sql
create policy "Volunteers can view published opportunities"
on volunteer_opportunities for select
using (status in ('published', 'full'));

create policy "Admins can manage opportunities"
on volunteer_opportunities for all
using (is_admin(auth.uid()));
```

Bookings policies:

```sql
create policy "Volunteers can view own bookings"
on bookings for select
using (auth.uid() = volunteer_id);

create policy "Volunteers can create own bookings"
on bookings for insert
with check (auth.uid() = volunteer_id);

create policy "Volunteers can update own cancellable bookings"
on bookings for update
using (auth.uid() = volunteer_id);

create policy "Admins can manage bookings"
on bookings for all
using (is_admin(auth.uid()));
```

Note: tighten booking update logic in server actions so volunteers can only cancel their own bookings, not approve or reject them.

---

## Minimum MVP Acceptance Criteria

The project is complete when:

* Public users can view landing page.
* Public users can submit volunteer application.
* Admin can view applications.
* Admin can accept an applicant.
* Accepted applicant receives account setup email.
* Volunteer can log in.
* Volunteer can view available opportunities on calendar.
* Volunteer can click opportunity and see details.
* Volunteer can request a booking.
* Booking is created as pending.
* Admin can approve booking.
* Volunteer receives booking approval email.
* Volunteer can view booked sessions.
* Admin can create, edit, publish, cancel, and complete opportunities.
* Non-admin users cannot access admin pages.
* Volunteers cannot see other volunteers’ bookings.
* Full or cancelled opportunities cannot be booked.

---

## Future Improvements

Add later:

* Waitlist support
* Recurring volunteer sessions
* Attendance check-in
* Volunteer hour tracking
* Download volunteer hour report
* Admin email notifications for new applications
* Admin email notifications for new booking requests
* Calendar sync with Google Calendar
* SMS notifications
* File uploads for waivers or certificates
* Parent or guardian approval for minors
* Volunteer tags and skill matching
* Automatic reminders before sessions
* Public FAQ page
* Admin audit logs

---

## Cursor Instructions

When generating the project:

1. Use TypeScript everywhere.
2. Use App Router.
3. Use server components by default.
4. Use client components only when interactivity is needed.
5. Keep components small and reusable.
6. Use Supabase for auth and database.
7. Use RLS and server-side permission checks.
8. Use Tailwind and shadcn/ui for styling.
9. Use Zod for validation.
10. Use Resend for email sending.
11. Do not expose service role keys to the browser.
12. Add helpful empty, loading, and error states.
13. Make the UI responsive.
14. Keep the design clean, modern, and easy for non-technical admins to use.