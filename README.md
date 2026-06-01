# TimeToVolunteer

A volunteer scheduling platform built with Next.js, Supabase, and Resend.

## Features

- Public landing page and volunteer application form
- Admin dashboard for managing applications, volunteers, opportunities, and bookings
- Volunteer dashboard with calendar, booking requests, and profile
- Email notifications via Resend (account setup, booking approval/rejection)
- Row Level Security via Supabase

## Getting Started

### 1. Install dependencies

```bash
npm install
```

### 2. Set up Supabase

1. Create a project at [supabase.com](https://supabase.com)
2. Run the SQL in `supabase/schema.sql` in the Supabase SQL Editor
3. If you already ran an older version of the schema, also run `supabase/migrations/001_add_must_reset_password.sql`
4. Create an admin user in Supabase Auth, then insert their profile:

```sql
insert into profiles (id, first_name, last_name, email, role, status)
values ('YOUR_AUTH_USER_ID', 'Admin', 'User', 'admin@example.com', 'admin', 'active');
```

### 3. Configure Supabase Auth redirects

In **Supabase Dashboard → Authentication → URL Configuration**, add:

- Site URL: `http://localhost:3000` (or your production URL)
- Redirect URLs: `http://localhost:3000/auth/callback`

### 4. Configure environment variables

Copy `.env.local.example` to `.env.local` and fill in your values:

```bash
cp .env.local.example .env.local
```

### 5. Run the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Tech Stack

- Next.js (App Router) + TypeScript
- Tailwind CSS + shadcn/ui
- Supabase (Postgres, Auth, RLS)
- Resend (transactional email)
- FullCalendar, Zod, React Hook Form, date-fns

## Project Structure

See `instructions.md` for full implementation details and acceptance criteria.
