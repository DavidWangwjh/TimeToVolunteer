import { loadEnvConfig } from "@next/env";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { organizationCategories } from "../src/lib/organization-options";

loadEnvConfig(process.cwd());

const PRODUCTION_PROJECT_REF = "chdnlpkoqoadqnmdpqrx";
const PASSWORD = "password123";
const SEEDED_EMAIL_DOMAIN = "@timetovolunteer.test";

type ProfileRole = "admin" | "organization" | "volunteer";
type OrganizationVisibility = "public" | "private";
type OpportunityVisibility = "public" | "private";
type BookingStatus = "pending" | "approved";
type MembershipStatus = "pending" | "accepted";
type InboxKind =
  | "booking_requested"
  | "booking_approved"
  | "membership_requested"
  | "membership_accepted";

interface SeedUser {
  email: string;
  firstName: string;
  lastName: string;
  role: ProfileRole;
  phone?: string;
  volunteerInterests?: string[];
  volunteerIntro?: string;
  dateOfBirth?: string;
}

interface SeedOrganization {
  key: string;
  ownerEmail: string;
  name: string;
  category: (typeof organizationCategories)[number];
  description: string;
  visibility: OrganizationVisibility;
  imageUrl: string;
  website: string;
  contactPhone: string;
}

interface SeedOpportunity {
  key: string;
  organizationKey: string;
  title: string;
  description: string;
  daysFromNow: number;
  startTime: string;
  endTime: string;
  location: string;
  maxVolunteers: number;
  visibility: OpportunityVisibility;
}

interface SeedMembership {
  organizationKey: string;
  volunteerEmail: string;
  status: MembershipStatus;
}

interface SeedBooking {
  opportunityKey: string;
  volunteerEmail: string;
  status: BookingStatus;
  checkedIn?: boolean;
}

function requireEnv(name: string) {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`${name} is required.`);
  }
  return value;
}

function validateSafeEnvironment() {
  const appEnv = requireEnv("APP_ENV");
  const appUrl = requireEnv("NEXT_PUBLIC_APP_URL");
  const supabaseUrl = requireEnv("NEXT_PUBLIC_SUPABASE_URL");
  const serviceRoleKey = requireEnv("SUPABASE_SERVICE_ROLE_KEY");

  if (appEnv !== "development") {
    throw new Error(`Refusing to seed because APP_ENV is "${appEnv}", not "development".`);
  }

  if (appUrl !== "http://localhost:3000") {
    throw new Error(
      `Refusing to seed because NEXT_PUBLIC_APP_URL is "${appUrl}", not "http://localhost:3000".`
    );
  }

  if (supabaseUrl.includes(PRODUCTION_PROJECT_REF)) {
    throw new Error(
      `Refusing to seed production Supabase project ${PRODUCTION_PROJECT_REF}.`
    );
  }

  return { supabaseUrl, serviceRoleKey };
}

function addDays(days: number) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

async function failOnError<T>(
  label: string,
  promise: PromiseLike<{ data: T; error: { message: string } | null }>
) {
  const { data, error } = await promise;
  if (error) {
    throw new Error(`${label}: ${error.message}`);
  }
  return data;
}

async function clearTable(supabase: SupabaseClient, table: string) {
  await failOnError(
    `Clearing ${table}`,
    supabase.from(table).delete().neq("id", "00000000-0000-0000-0000-000000000000")
  );
}

async function assertServiceRoleTableAccess(supabase: SupabaseClient) {
  const { error } = await supabase
    .from("inbox_messages")
    .select("id", { count: "exact", head: true });

  if (!error) return;

  if (error.message.toLowerCase().includes("permission denied")) {
    throw new Error(
      [
        "The configured Supabase key cannot access app tables.",
        "This usually means the dev project schema is missing API role grants, or SUPABASE_SERVICE_ROLE_KEY is not the service role key.",
        "",
        "In your DEV Supabase SQL editor, run the grant block from supabase/schema.sql, or run:",
        "grant usage on schema public to anon, authenticated, service_role;",
        "grant select, insert, update, delete on all tables in schema public to service_role;",
        "grant select, insert, update, delete on profiles, organization_applications, organizations, organization_memberships, volunteer_opportunities, bookings, inbox_messages to authenticated;",
        "grant insert on organization_applications to anon;",
      ].join("\n")
    );
  }

  throw new Error(`Checking service role table access: ${error.message}`);
}

const adminUser: SeedUser = {
  email: "admin@timetovolunteer.test",
  firstName: "Alex",
  lastName: "Admin",
  role: "admin",
  phone: "555-0100",
};

const primaryOrganizationOwners: SeedUser[] = [
  {
    email: "org.codeninjas@timetovolunteer.test",
    firstName: "Casey",
    lastName: "Nguyen",
    role: "organization",
    phone: "555-1101",
  },
  {
    email: "org.greencity@timetovolunteer.test",
    firstName: "Morgan",
    lastName: "Reed",
    role: "organization",
    phone: "555-1102",
  },
];

const additionalOrganizationOwners: SeedUser[] = [
  ["org.brightfutures@timetovolunteer.test", "Priya", "Shah"],
  ["org.communitytable@timetovolunteer.test", "Daniel", "Brooks"],
  ["org.trailkeepers@timetovolunteer.test", "Elena", "Park"],
  ["org.seniorconnect@timetovolunteer.test", "Grace", "Wilson"],
  ["org.pawscare@timetovolunteer.test", "Sam", "Rivera"],
  ["org.homefirst@timetovolunteer.test", "Taylor", "Kim"],
  ["org.artsbridge@timetovolunteer.test", "Jordan", "Miles"],
  ["org.wellness@timetovolunteer.test", "Riley", "Chen"],
].map(([email, firstName, lastName], index) => ({
  email,
  firstName,
  lastName,
  role: "organization" as const,
  phone: `555-12${String(index).padStart(2, "0")}`,
}));

const volunteerUsers: SeedUser[] = [
  {
    email: "ava.volunteer@timetovolunteer.test",
    firstName: "Ava",
    lastName: "Martinez",
    role: "volunteer",
    phone: "555-2101",
    volunteerInterests: ["Education", "Youth Programs"],
    volunteerIntro:
      "High school student interested in tutoring, robotics, and youth mentorship.",
    dateOfBirth: "2008-04-12",
  },
  {
    email: "ben.volunteer@timetovolunteer.test",
    firstName: "Ben",
    lastName: "Carter",
    role: "volunteer",
    phone: "555-2102",
    volunteerInterests: ["Environment", "Community Development"],
    volunteerIntro:
      "Enjoys outdoor service projects, park cleanups, and neighborhood events.",
    dateOfBirth: "2006-09-30",
  },
  {
    email: "maya.volunteer@timetovolunteer.test",
    firstName: "Maya",
    lastName: "Johnson",
    role: "volunteer",
    phone: "555-2103",
    volunteerInterests: ["Food Security", "Housing", "Senior Services"],
    volunteerIntro:
      "Community volunteer focused on food access and direct support programs.",
    dateOfBirth: "2005-11-08",
  },
  {
    email: "jordan.volunteer@timetovolunteer.test",
    firstName: "Jordan",
    lastName: "Lee",
    role: "volunteer",
    phone: "555-2104",
    volunteerInterests: ["Animal Welfare", "Health & Wellness", "Arts & Culture"],
    volunteerIntro:
      "College student looking for flexible weekend volunteering opportunities.",
    dateOfBirth: "2004-02-21",
  },
];

const organizations: SeedOrganization[] = [
  {
    key: "code-ninjas",
    ownerEmail: "org.codeninjas@timetovolunteer.test",
    name: "Code Ninjas Union City",
    category: "Youth Programs",
    description:
      "STEM enrichment center helping students build confidence through coding, robotics, and creative technology projects.",
    visibility: "public",
    imageUrl: "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=1200&q=80",
    website: "https://www.codeninjas.com/ca-union-city",
    contactPhone: "555-3101",
  },
  {
    key: "green-city",
    ownerEmail: "org.greencity@timetovolunteer.test",
    name: "Green City Project",
    category: "Environment",
    description:
      "Neighborhood cleanup, planting, and park stewardship programs that make public spaces healthier and more welcoming.",
    visibility: "private",
    imageUrl: "https://images.unsplash.com/photo-1448375240586-882707db888b?auto=format&fit=crop&w=1200&q=80",
    website: "https://greencity.example.org",
    contactPhone: "555-3102",
  },
  {
    key: "bright-futures",
    ownerEmail: "org.brightfutures@timetovolunteer.test",
    name: "Bright Futures Tutoring",
    category: "Education",
    description:
      "After-school tutoring and mentorship for middle and high school students preparing for academic success.",
    visibility: "public",
    imageUrl: "https://images.unsplash.com/photo-1523240795612-9a054b0db644?auto=format&fit=crop&w=1200&q=80",
    website: "https://brightfutures.example.org",
    contactPhone: "555-3103",
  },
  {
    key: "community-table",
    ownerEmail: "org.communitytable@timetovolunteer.test",
    name: "Community Table Network",
    category: "Food Security",
    description:
      "Food pantry, meal prep, and grocery delivery programs for families experiencing food insecurity.",
    visibility: "public",
    imageUrl: "https://images.unsplash.com/photo-1593113598332-cd288d649433?auto=format&fit=crop&w=1200&q=80",
    website: "https://communitytable.example.org",
    contactPhone: "555-3104",
  },
  {
    key: "trail-keepers",
    ownerEmail: "org.trailkeepers@timetovolunteer.test",
    name: "Trail Keepers Alliance",
    category: "Environment",
    description:
      "Weekend trail maintenance, habitat restoration, and outdoor safety education led by local volunteers.",
    visibility: "private",
    imageUrl: "https://images.unsplash.com/photo-1476231682828-37e571bc172f?auto=format&fit=crop&w=1200&q=80",
    website: "https://trailkeepers.example.org",
    contactPhone: "555-3105",
  },
  {
    key: "senior-connect",
    ownerEmail: "org.seniorconnect@timetovolunteer.test",
    name: "Senior Connect",
    category: "Senior Services",
    description:
      "Technology help, social visits, and errand support programs that help older adults stay connected.",
    visibility: "public",
    imageUrl: "https://images.unsplash.com/photo-1581579438747-104c53d7fbc4?auto=format&fit=crop&w=1200&q=80",
    website: "https://seniorconnect.example.org",
    contactPhone: "555-3106",
  },
  {
    key: "paws-care",
    ownerEmail: "org.pawscare@timetovolunteer.test",
    name: "Paws & Care Shelter",
    category: "Animal Welfare",
    description:
      "Animal shelter support with enrichment, adoption events, donation sorting, and community pet care outreach.",
    visibility: "public",
    imageUrl: "https://images.unsplash.com/photo-1450778869180-41d0601e046e?auto=format&fit=crop&w=1200&q=80",
    website: "https://pawscare.example.org",
    contactPhone: "555-3107",
  },
  {
    key: "homefirst",
    ownerEmail: "org.homefirst@timetovolunteer.test",
    name: "HomeFirst Outreach",
    category: "Housing",
    description:
      "Housing navigation, supply drives, and renter support clinics for neighbors seeking stable housing.",
    visibility: "private",
    imageUrl: "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=1200&q=80",
    website: "https://homefirst.example.org",
    contactPhone: "555-3108",
  },
  {
    key: "artsbridge",
    ownerEmail: "org.artsbridge@timetovolunteer.test",
    name: "ArtsBridge Collective",
    category: "Arts & Culture",
    description:
      "Community arts workshops, youth showcases, and cultural events powered by creative volunteers.",
    visibility: "public",
    imageUrl: "https://images.unsplash.com/photo-1460661419201-fd4cecdf8a8b?auto=format&fit=crop&w=1200&q=80",
    website: "https://artsbridge.example.org",
    contactPhone: "555-3109",
  },
  {
    key: "wellness-together",
    ownerEmail: "org.wellness@timetovolunteer.test",
    name: "Wellness Together",
    category: "Health & Wellness",
    description:
      "Health fairs, wellness workshops, and community resource events focused on practical prevention and support.",
    visibility: "private",
    imageUrl: "https://images.unsplash.com/photo-1505751172876-fa1923c5c528?auto=format&fit=crop&w=1200&q=80",
    website: "https://wellnesstogether.example.org",
    contactPhone: "555-3110",
  },
];

const opportunities: SeedOpportunity[] = [
  {
    key: "lego-robotics",
    organizationKey: "code-ninjas",
    title: "LEGO Robotics Volunteer",
    description:
      "Help students build, test, and present beginner-friendly robotics projects.",
    daysFromNow: 7,
    startTime: "16:00",
    endTime: "18:00",
    location: "Code Ninjas Union City",
    maxVolunteers: 8,
    visibility: "public",
  },
  {
    key: "coding-camp",
    organizationKey: "code-ninjas",
    title: "Coding Camp Mentor",
    description:
      "Support small groups of students during a summer coding workshop.",
    daysFromNow: 12,
    startTime: "09:00",
    endTime: "12:00",
    location: "Code Ninjas Union City",
    maxVolunteers: 6,
    visibility: "private",
  },
  {
    key: "park-cleanup",
    organizationKey: "green-city",
    title: "Park Cleanup Volunteer",
    description:
      "Pick up litter, refresh garden beds, and prepare the park for summer events.",
    daysFromNow: 10,
    startTime: "09:00",
    endTime: "12:00",
    location: "Riverside Park",
    maxVolunteers: 12,
    visibility: "public",
  },
  {
    key: "community-garden",
    organizationKey: "green-city",
    title: "Community Garden Team",
    description:
      "Help with planting, composting, and seasonal garden maintenance.",
    daysFromNow: 16,
    startTime: "13:00",
    endTime: "15:30",
    location: "Green City Garden",
    maxVolunteers: 5,
    visibility: "private",
  },
  {
    key: "youth-tutoring",
    organizationKey: "bright-futures",
    title: "Youth Tutoring Assistant",
    description:
      "Work with students on homework support, study habits, and reading practice.",
    daysFromNow: 5,
    startTime: "15:30",
    endTime: "17:30",
    location: "Bright Futures Learning Center",
    maxVolunteers: 10,
    visibility: "public",
  },
  {
    key: "food-pantry",
    organizationKey: "community-table",
    title: "Food Pantry Support",
    description:
      "Sort donations, pack grocery boxes, and assist families during pantry hours.",
    daysFromNow: 9,
    startTime: "10:00",
    endTime: "13:00",
    location: "Community Table Warehouse",
    maxVolunteers: 14,
    visibility: "public",
  },
  {
    key: "senior-tech",
    organizationKey: "senior-connect",
    title: "Senior Tech Help",
    description:
      "Help older adults use phones, email, video calls, and online appointment tools.",
    daysFromNow: 14,
    startTime: "11:00",
    endTime: "13:00",
    location: "Senior Connect Center",
    maxVolunteers: 6,
    visibility: "private",
  },
  {
    key: "animal-shelter",
    organizationKey: "paws-care",
    title: "Animal Shelter Support",
    description:
      "Prepare enrichment toys, organize donations, and help with adoption event setup.",
    daysFromNow: 18,
    startTime: "10:00",
    endTime: "12:30",
    location: "Paws & Care Shelter",
    maxVolunteers: 8,
    visibility: "public",
  },
  {
    key: "supply-drive",
    organizationKey: "homefirst",
    title: "Housing Supply Drive",
    description:
      "Sort hygiene kits, welcome supplies, and household essentials for outreach teams.",
    daysFromNow: 21,
    startTime: "14:00",
    endTime: "17:00",
    location: "HomeFirst Outreach Hub",
    maxVolunteers: 10,
    visibility: "private",
  },
  {
    key: "past-food-pantry",
    organizationKey: "community-table",
    title: "Completed Pantry Shift",
    description:
      "Past pantry shift included for testing completed checked-in volunteer hours.",
    daysFromNow: -14,
    startTime: "09:00",
    endTime: "12:00",
    location: "Community Table Warehouse",
    maxVolunteers: 6,
    visibility: "public",
  },
];

const memberships: SeedMembership[] = [
  { organizationKey: "code-ninjas", volunteerEmail: "ava.volunteer@timetovolunteer.test", status: "accepted" },
  { organizationKey: "green-city", volunteerEmail: "ben.volunteer@timetovolunteer.test", status: "accepted" },
  { organizationKey: "green-city", volunteerEmail: "ava.volunteer@timetovolunteer.test", status: "pending" },
  { organizationKey: "community-table", volunteerEmail: "maya.volunteer@timetovolunteer.test", status: "accepted" },
  { organizationKey: "trail-keepers", volunteerEmail: "ben.volunteer@timetovolunteer.test", status: "pending" },
  { organizationKey: "senior-connect", volunteerEmail: "jordan.volunteer@timetovolunteer.test", status: "accepted" },
  { organizationKey: "paws-care", volunteerEmail: "jordan.volunteer@timetovolunteer.test", status: "pending" },
  { organizationKey: "homefirst", volunteerEmail: "maya.volunteer@timetovolunteer.test", status: "accepted" },
];

const bookings: SeedBooking[] = [
  { opportunityKey: "lego-robotics", volunteerEmail: "ava.volunteer@timetovolunteer.test", status: "approved" },
  { opportunityKey: "coding-camp", volunteerEmail: "ava.volunteer@timetovolunteer.test", status: "pending" },
  { opportunityKey: "park-cleanup", volunteerEmail: "ben.volunteer@timetovolunteer.test", status: "approved" },
  { opportunityKey: "community-garden", volunteerEmail: "ben.volunteer@timetovolunteer.test", status: "pending" },
  { opportunityKey: "food-pantry", volunteerEmail: "maya.volunteer@timetovolunteer.test", status: "approved" },
  { opportunityKey: "senior-tech", volunteerEmail: "jordan.volunteer@timetovolunteer.test", status: "pending" },
  { opportunityKey: "animal-shelter", volunteerEmail: "jordan.volunteer@timetovolunteer.test", status: "approved" },
  { opportunityKey: "past-food-pantry", volunteerEmail: "maya.volunteer@timetovolunteer.test", status: "approved", checkedIn: true },
];

const applicationRows = [
  {
    organization_name: "New Roots Community Farm",
    category: "Community Development",
    email: "apply.newroots@timetovolunteer.test",
    phone: "555-4101",
    website: "https://newroots.example.org",
    organization_description:
      "Urban farming and neighborhood education programs that connect residents with fresh produce and practical gardening skills.",
    image_url:
      "https://images.unsplash.com/photo-1464226184884-fa280b87c399?auto=format&fit=crop&w=1200&q=80",
    reason: "We want to coordinate recurring garden volunteer shifts more efficiently.",
    status: "pending",
  },
  {
    organization_name: "Student Service Lab",
    category: "Other",
    email: "apply.servicelab@timetovolunteer.test",
    phone: "555-4102",
    website: "https://studentsservicelab.example.org",
    organization_description:
      "Student-led volunteer projects connecting schools with local nonprofits and service-learning mentors.",
    image_url:
      "https://images.unsplash.com/photo-1523580846011-d3a5bc25702b?auto=format&fit=crop&w=1200&q=80",
    reason: "We need a simple way to publish service opportunities for students.",
    status: "contacted",
  },
];

async function deleteSeedAuthUsers(supabase: SupabaseClient) {
  let page = 1;
  const perPage = 1000;
  let deleted = 0;

  while (true) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage });
    if (error) throw new Error(`Listing auth users: ${error.message}`);

    for (const user of data.users) {
      if (user.email?.endsWith(SEEDED_EMAIL_DOMAIN)) {
        const { error: deleteError } = await supabase.auth.admin.deleteUser(user.id);
        if (deleteError) {
          throw new Error(`Deleting auth user ${user.email}: ${deleteError.message}`);
        }
        deleted += 1;
      }
    }

    if (data.users.length < perPage) break;
    page += 1;
  }

  return deleted;
}

async function createAuthUser(supabase: SupabaseClient, user: SeedUser) {
  const { data, error } = await supabase.auth.admin.createUser({
    email: user.email,
    password: PASSWORD,
    email_confirm: true,
    user_metadata: {
      first_name: user.firstName,
      last_name: user.lastName,
      role: user.role,
    },
  });

  if (error || !data.user) {
    throw new Error(`Creating auth user ${user.email}: ${error?.message ?? "No user returned"}`);
  }

  return data.user.id;
}

async function seed() {
  const { supabaseUrl, serviceRoleKey } = validateSafeEnvironment();
  console.warn("============================================================");
  console.warn("Seeding TimeToVolunteer development data");
  console.warn(`Supabase URL: ${supabaseUrl}`);
  console.warn("This script refuses to run against production.");
  console.warn("============================================================");

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  await assertServiceRoleTableAccess(supabase);

  const deletedAuthUsers = await deleteSeedAuthUsers(supabase);
  await clearTable(supabase, "inbox_messages");
  await clearTable(supabase, "bookings");
  await clearTable(supabase, "organization_memberships");
  await clearTable(supabase, "volunteer_opportunities");
  await clearTable(supabase, "organizations");
  await clearTable(supabase, "organization_applications");
  await clearTable(supabase, "profiles");

  const users = [
    adminUser,
    ...primaryOrganizationOwners,
    ...additionalOrganizationOwners,
    ...volunteerUsers,
  ];
  const userIds = new Map<string, string>();

  for (const user of users) {
    userIds.set(user.email, await createAuthUser(supabase, user));
  }

  await failOnError(
    "Inserting profiles",
    supabase.from("profiles").insert(
      users.map((user) => ({
        id: userIds.get(user.email),
        first_name: user.firstName,
        last_name: user.lastName,
        email: user.email,
        phone: user.phone ?? null,
        role: user.role,
        status: "active",
        must_reset_password: false,
        volunteer_interests: user.volunteerInterests ?? [],
        volunteer_intro: user.volunteerIntro ?? null,
        date_of_birth: user.dateOfBirth ?? null,
      }))
    )
  );

  const insertedOrganizations =
    (await failOnError(
    "Inserting organizations",
    supabase
      .from("organizations")
      .insert(
        organizations.map((organization) => ({
          owner_id: userIds.get(organization.ownerEmail),
          name: organization.name,
          category: organization.category,
          description: organization.description,
          image_url: organization.imageUrl,
          website: organization.website,
          contact_email: organization.ownerEmail,
          contact_phone: organization.contactPhone,
          visibility: organization.visibility,
          status: "active",
        }))
      )
      .select("id, name")
  )) ?? [];

  const organizationIds = new Map<string, string>();
  for (const organization of organizations) {
    const inserted = insertedOrganizations.find((row) => row.name === organization.name);
    if (!inserted) throw new Error(`Missing inserted organization ${organization.name}`);
    organizationIds.set(organization.key, inserted.id);
  }

  await failOnError(
    "Inserting memberships",
    supabase.from("organization_memberships").insert(
      memberships.map((membership) => ({
        organization_id: organizationIds.get(membership.organizationKey),
        volunteer_id: userIds.get(membership.volunteerEmail),
        status: membership.status,
        volunteer_note:
          membership.status === "pending"
            ? "I would like to help with upcoming volunteer opportunities."
            : "Accepted seed membership.",
        reviewed_by:
          membership.status === "accepted"
            ? userIds.get(
                organizations.find((org) => org.key === membership.organizationKey)!
                  .ownerEmail
              )
            : null,
        reviewed_at: membership.status === "accepted" ? new Date().toISOString() : null,
      }))
    )
  );

  const insertedOpportunities =
    (await failOnError(
    "Inserting opportunities",
    supabase
      .from("volunteer_opportunities")
      .insert(
        opportunities.map((opportunity) => {
          const organization = organizations.find(
            (org) => org.key === opportunity.organizationKey
          );
          if (!organization) {
            throw new Error(`Missing organization for ${opportunity.title}`);
          }

          return {
            organization_id: organizationIds.get(opportunity.organizationKey),
            title: opportunity.title,
            description: opportunity.description,
            date: addDays(opportunity.daysFromNow),
            start_time: opportunity.startTime,
            end_time: opportunity.endTime,
            location: opportunity.location,
            experience_required: "No prior experience required.",
            max_volunteers: opportunity.maxVolunteers,
            status: "published",
            visibility: opportunity.visibility,
            created_by: userIds.get(organization.ownerEmail),
          };
        })
      )
      .select("id, title")
  )) ?? [];

  const opportunityIds = new Map<string, string>();
  for (const opportunity of opportunities) {
    const inserted = insertedOpportunities.find((row) => row.title === opportunity.title);
    if (!inserted) throw new Error(`Missing inserted opportunity ${opportunity.title}`);
    opportunityIds.set(opportunity.key, inserted.id);
  }

  const now = new Date().toISOString();
  const insertedBookings =
    (await failOnError(
    "Inserting bookings",
    supabase
      .from("bookings")
      .insert(
        bookings.map((booking) => {
          const opportunity = opportunities.find(
            (item) => item.key === booking.opportunityKey
          );
          const organization = organizations.find(
            (item) => item.key === opportunity?.organizationKey
          );

          return {
            opportunity_id: opportunityIds.get(booking.opportunityKey),
            volunteer_id: userIds.get(booking.volunteerEmail),
            status: booking.status,
            volunteer_note:
              booking.status === "pending"
                ? "I am available and would like to register."
                : null,
            approved_by:
              booking.status === "approved" && organization
                ? userIds.get(organization.ownerEmail)
                : null,
            approved_at: booking.status === "approved" ? now : null,
            checked_in_by:
              booking.checkedIn && organization
                ? userIds.get(organization.ownerEmail)
                : null,
            checked_in_at: booking.checkedIn ? now : null,
          };
        })
      )
      .select("id, opportunity_id, volunteer_id, status")
  )) ?? [];

  await failOnError(
    "Inserting organization applications",
    supabase.from("organization_applications").insert(applicationRows)
  );

  const inboxRows = [
    ...insertedBookings.map((booking) => {
      const opportunity = opportunities.find(
        (item) => opportunityIds.get(item.key) === booking.opportunity_id
      );
      const organization = organizations.find(
        (item) => item.key === opportunity?.organizationKey
      );
      const title =
        booking.status === "approved"
          ? "Registration confirmed"
          : "Registration request sent";
      const kind: InboxKind =
        booking.status === "approved" ? "booking_approved" : "booking_requested";

      return {
        recipient_id:
          booking.status === "approved"
            ? booking.volunteer_id
            : userIds.get(organization?.ownerEmail ?? ""),
        actor_id:
          booking.status === "approved"
            ? userIds.get(organization?.ownerEmail ?? "")
            : booking.volunteer_id,
        organization_id: organizationIds.get(opportunity?.organizationKey ?? ""),
        opportunity_id: booking.opportunity_id,
        booking_id: booking.id,
        membership_id: null,
        kind,
        title,
        body:
          booking.status === "approved"
            ? `${opportunity?.title} is confirmed for you.`
            : `A volunteer requested registration for ${opportunity?.title}.`,
        action_href:
          booking.status === "approved"
            ? "/dashboard/volunteer"
            : "/dashboard/organization/bookings",
      };
    }),
    {
      recipient_id: userIds.get("org.greencity@timetovolunteer.test"),
      actor_id: userIds.get("ava.volunteer@timetovolunteer.test"),
      organization_id: organizationIds.get("green-city"),
      opportunity_id: null,
      booking_id: null,
      membership_id: null,
      kind: "membership_requested" as InboxKind,
      title: "New membership request",
      body: "Ava Martinez requested to join Green City Project.",
      action_href: "/dashboard/organization/memberships",
    },
    {
      recipient_id: userIds.get("ben.volunteer@timetovolunteer.test"),
      actor_id: userIds.get("org.greencity@timetovolunteer.test"),
      organization_id: organizationIds.get("green-city"),
      opportunity_id: null,
      booking_id: null,
      membership_id: null,
      kind: "membership_accepted" as InboxKind,
      title: "Membership accepted",
      body: "Green City Project accepted your organization membership.",
      action_href: "/dashboard/volunteer/organizations",
    },
  ];

  await failOnError(
    "Inserting inbox messages",
    supabase.from("inbox_messages").insert(inboxRows)
  );

  console.log("\nSeed complete.");
  console.log(`Deleted seeded auth users: ${deletedAuthUsers}`);
  console.log("\nTest login accounts:");
  console.log(`Admin: ${adminUser.email} / ${PASSWORD}`);
  console.log("Organizations:");
  for (const user of primaryOrganizationOwners) {
    console.log(`- ${user.email} / ${PASSWORD}`);
  }
  console.log("Volunteers:");
  for (const user of volunteerUsers) {
    console.log(`- ${user.email} / ${PASSWORD}`);
  }
}

seed().catch((error) => {
  console.error("\nSeed failed:");
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
