import { loadEnvConfig } from "@next/env";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { getVolunteerHours, getVolunteerRank } from "../src/lib/volunteer-ranks";
import { organizationCategories } from "../src/lib/organization-options";

import { DEV_ADMIN_EMAIL, DEV_LOGIN_PASSWORD, DEV_SUPABASE_PROJECT_REF, devQuickLoginGroups } from "../src/lib/dev-login-accounts";

loadEnvConfig(process.cwd());

const DEVELOPMENT_PROJECT_REF = DEV_SUPABASE_PROJECT_REF;
const PRODUCTION_PROJECT_REF = "chdnlpkoqoadqnmdpqrx";
const PASSWORD = DEV_LOGIN_PASSWORD;


type ProfileRole = "admin" | "organization" | "volunteer";
type OrganizationVisibility = "public" | "private";
type OpportunityVisibility = "public" | "private";
type BookingStatus = "invited" | "pending" | "approved" | "rejected" | "cancelled" | "completed";
type MembershipStatus = "pending" | "accepted" | "rejected";
type InboxKind =
  | "opportunity_invited"
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
  imageUrl: string | null;
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
  status?: "draft" | "published" | "cancelled" | "completed";
  recurringGroupId?: string;
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

  if (new URL(supabaseUrl).hostname !== `${DEVELOPMENT_PROJECT_REF}.supabase.co`) {
    throw new Error("Refusing to seed an unrecognized development project.");
  }

  return { supabaseUrl, serviceRoleKey };
}

function addDays(days: number) {
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Los_Angeles", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
  const date = new Date(`${today}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
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
  email: DEV_ADMIN_EMAIL,
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
    imageUrl: null,
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
    imageUrl: null,
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
    imageUrl: null,
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
    imageUrl: null,
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
    imageUrl: null,
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
    imageUrl: null,
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
    imageUrl: null,
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
    imageUrl: null,
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
    imageUrl: null,
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
    imageUrl: null,
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
    image_url: null,
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
    image_url: null,
    reason: "We need a simple way to publish service opportunities for students.",
    status: "contacted",
  },
];

// Edge cases complement the discovery and registration fixtures above.
const recurringGroupId = crypto.randomUUID();
for (const fixture of [
  { key: "today-shift", title: "Today: Robotics Check-in", daysFromNow: 0 },
  { key: "full-shift", title: "Full Robotics Session", daysFromNow: 2, maxVolunteers: 1 },
  { key: "draft-shift", title: "Draft Workshop", daysFromNow: 4, status: "draft" as const },
  { key: "cancelled-shift", title: "Cancelled Workshop", daysFromNow: 6, status: "cancelled" as const },
  { key: "completed-shift", title: "Completed Robotics Workshop", daysFromNow: -7, status: "completed" as const },
  ...[7, 14, 21].map(daysFromNow => ({ key: `weekly-${daysFromNow}`, title: `Weekly Mentoring: Session ${daysFromNow / 7}`, daysFromNow, recurringGroupId })),
]) {
  opportunities.push({ organizationKey: "code-ninjas", description: "Development fixture for testing schedules, capacity, and lifecycle states.", startTime: "16:00", endTime: "18:00", location: "Code Ninjas Union City", maxVolunteers: 6, visibility: "public", ...fixture });
}
bookings.push(
  { opportunityKey: "today-shift", volunteerEmail: "ava.volunteer@timetovolunteer.test", status: "approved" },
  { opportunityKey: "full-shift", volunteerEmail: "ben.volunteer@timetovolunteer.test", status: "approved" },
  { opportunityKey: "cancelled-shift", volunteerEmail: "ava.volunteer@timetovolunteer.test", status: "cancelled" },
  { opportunityKey: "completed-shift", volunteerEmail: "ava.volunteer@timetovolunteer.test", status: "completed", checkedIn: true },
  { opportunityKey: "coding-camp", volunteerEmail: "maya.volunteer@timetovolunteer.test", status: "rejected" },
  { opportunityKey: "lego-robotics", volunteerEmail: "jordan.volunteer@timetovolunteer.test", status: "cancelled" },
);
memberships.push({ organizationKey: "green-city", volunteerEmail: "maya.volunteer@timetovolunteer.test", status: "rejected" });
applicationRows.push({ ...applicationRows[0], organization_name: "Archived Test Application", email: "apply.rejected@timetovolunteer.test", status: "rejected" });

// UI coverage: five ranks, long/scrolled member lists, sparse profiles, invitations,
// repeat registration after removal, no-shows, and date/time lifecycle boundaries.
volunteerUsers.push({ email: "riley.volunteer@timetovolunteer.test", firstName: "Riley", lastName: "Chen", role: "volunteer", phone: "555-2105", dateOfBirth: "1998-05-17", volunteerIntro: "Long-time volunteer supporting STEM learning and environmental restoration.", volunteerInterests: ["Education", "Environment"] });
const memberNames = ["Olivia Patel", "Noah Williams", "Emma Garcia", "Liam Davis", "Sophia Nguyen", "Ethan Wilson", "Isabella Brown", "Lucas Anderson", "Amelia Thomas", "Mason Jackson", "Harper White", "Elijah Harris", "Evelyn Martin", "James Thompson", "Sofia Robinson", "Benjamin Clark", "Charlotte Lewis", "Henry Walker", "Mia Hall", "Alexander Young", "Camila Allen", "Daniel King", "Luna Wright", "Sebastian Scott"];
for (const [index, name] of memberNames.entries()) {
  const [firstName, lastName] = name.split(" ");
  const email = `member${index + 1}@timetovolunteer.test`;
  volunteerUsers.push({ email, firstName, lastName, role: "volunteer", phone: index % 5 === 0 ? undefined : `555-22${String(index).padStart(2, "0")}`, dateOfBirth: index === 0 ? undefined : `${1990 + index}-06-15`, volunteerIntro: index === 0 ? undefined : "I enjoy helping my community through education and hands-on service. Looking forward to meeting other volunteers and learning new skills.", volunteerInterests: index === 0 ? [] : ["Education", "Environment"] });
  memberships.push({ organizationKey: "code-ninjas", volunteerEmail: email, status: index >= 22 ? "rejected" : index >= 19 ? "pending" : "accepted" });
}
for (const volunteer of volunteerUsers.slice(0, 5)) {
  for (const organizationKey of ["code-ninjas", "green-city"]) {
    if (!memberships.some(row => row.organizationKey === organizationKey && row.volunteerEmail === volunteer.email)) memberships.push({ organizationKey, volunteerEmail: volunteer.email, status: "accepted" });
  }
}
const rankTargets = [
  { email: volunteerUsers[0].email, hours: 2, rank: "Bronze" },
  { email: volunteerUsers[1].email, hours: 50, rank: "Silver" },
  { email: volunteerUsers[2].email, hours: 100, rank: "Gold" },
  { email: volunteerUsers[3].email, hours: 250, rank: "Platinum" },
  { email: volunteerUsers[4].email, hours: 500, rank: "Diamond" },
];
for (const target of rankTargets) {
  const baseline = target.email === volunteerUsers[0].email ? 2 : target.email === volunteerUsers[2].email ? 3 : 0;
  let remaining = target.hours - baseline;
  for (let index = 0; remaining > 0; index++) {
    const hours = Math.min(8, remaining);
    const key = `rank-${target.rank}-${index}`;
    opportunities.push({ key, organizationKey: index % 2 ? "green-city" : "code-ninjas", title: `${target.rank} history · Service shift ${index + 1}`, description: "Checked-in historical service for rank and volunteer history testing.", daysFromNow: -30 - index, startTime: "09:00", endTime: `${String(9 + hours).padStart(2, "0")}:00`, location: "Community Learning Center", maxVolunteers: 10, visibility: "public", status: "completed" });
    bookings.push({ opportunityKey: key, volunteerEmail: target.email, status: "completed", checkedIn: true });
    remaining -= hours;
  }
}
for (const fixture of [
  { key: "ongoing", title: "Ongoing today · Community Open House", daysFromNow: 0, startTime: "00:00", endTime: "23:59" },
  { key: "no-show", title: "Past · Attendance and No-show Review", daysFromNow: -2, startTime: "10:00", endTime: "12:00", status: "completed" as const },
  { key: "past-published", title: "Past · Published Session", daysFromNow: -1, startTime: "10:00", endTime: "12:00" },
  { key: "invite-lab", title: "Invitation Lab · Join, Decline, and Rejoin", daysFromNow: 3, startTime: "10:00", endTime: "12:30" },
]) opportunities.push({ organizationKey: "code-ninjas", description: "Development scenario for attendance, invitations, and lifecycle UI.", location: "Code Ninjas Union City", maxVolunteers: 30, visibility: "public", ...fixture });
bookings.push(
  { opportunityKey: "invite-lab", volunteerEmail: volunteerUsers[0].email, status: "invited" },
  { opportunityKey: "invite-lab", volunteerEmail: volunteerUsers[1].email, status: "approved" },
  { opportunityKey: "invite-lab", volunteerEmail: volunteerUsers[2].email, status: "pending" },
  { opportunityKey: "invite-lab", volunteerEmail: volunteerUsers[3].email, status: "cancelled" },
  { opportunityKey: "invite-lab", volunteerEmail: volunteerUsers[4].email, status: "rejected" },
  { opportunityKey: "invite-lab", volunteerEmail: "member1@timetovolunteer.test", status: "invited" },
  { opportunityKey: "ongoing", volunteerEmail: volunteerUsers[0].email, status: "approved", checkedIn: true },
  { opportunityKey: "ongoing", volunteerEmail: volunteerUsers[1].email, status: "approved" },
  ...volunteerUsers.slice(0, 5).map(volunteer => ({ opportunityKey: "no-show", volunteerEmail: volunteer.email, status: "approved" as const })),
  { opportunityKey: "past-published", volunteerEmail: volunteerUsers[0].email, status: "approved" },
);

function validateFixtures() {
  const emails = new Set(volunteerUsers.map(user => user.email));
  const keys = new Set(opportunities.map(opportunity => opportunity.key));
  if (keys.size !== opportunities.length) throw new Error("Duplicate opportunity keys");
  const pairs = new Set<string>();
  for (const booking of bookings) {
    if (!emails.has(booking.volunteerEmail) || !keys.has(booking.opportunityKey)) throw new Error("Booking references a missing fixture");
    const pair = `${booking.volunteerEmail}/${booking.opportunityKey}`;
    if (pairs.has(pair)) throw new Error(`Duplicate booking: ${pair}`);
    pairs.add(pair);
  }
  for (const target of rankTargets) {
    const rows = bookings.filter(row => row.volunteerEmail === target.email).map(booking => {
      const opportunity = opportunities.find(row => row.key === booking.opportunityKey)!;
      return { status: booking.status, checked_in_at: booking.checkedIn ? "seed" : null, opportunity: { status: opportunity.status ?? "published" as const, date: addDays(opportunity.daysFromNow), start_time: opportunity.startTime + ":00", end_time: opportunity.endTime + ":00" } };
    });
    const hours = getVolunteerHours(rows);
    if (hours !== target.hours) throw new Error(`Fixture rank mismatch: ${target.email}: ${hours}`);
  }
}

function sessionTimestamp(opportunity: SeedOpportunity) {
  const date = addDays(opportunity.daysFromNow);
  const zone = new Intl.DateTimeFormat("en-US", { timeZone: "America/Los_Angeles", timeZoneName: "shortOffset" }).formatToParts(new Date(`${date}T12:00:00Z`)).find(part => part.type === "timeZoneName")!.value;
  const offset = zone === "GMT-8" ? "-08:00" : "-07:00";
  return `${date}T${opportunity.startTime}:00${offset}`;
}

async function ensureAuthUser(supabase: SupabaseClient, user: SeedUser, existing: Map<string, string>) {
  const id = existing.get(user.email);
  if (id) return id; // Preserve login credentials, metadata, avatar paths, and sessions.
  const { data, error } = await supabase.auth.admin.createUser({
    email: user.email, password: PASSWORD, email_confirm: true,
    user_metadata: { first_name: user.firstName, last_name: user.lastName, role: user.role },
  });
  if (error || !data.user) throw new Error(`Creating ${user.email}: ${error?.message}`);
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

  validateFixtures();
  if (process.argv.includes("--dry-run")) {
    console.log(JSON.stringify({ volunteers: volunteerUsers.length, organizations: organizations.length, opportunities: opportunities.length, memberships: memberships.length, bookings: bookings.length, ranks: rankTargets }, null, 2));
    return;
  }
  await assertServiceRoleTableAccess(supabase);

  const existingUsers = new Map<string, string>();
  for (let page = 1; ; page++) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw new Error(`Listing users: ${error.message}`);
    for (const user of data.users) if (user.email) existingUsers.set(user.email, user.id);
    if (data.users.length < 1000) break;
  }

  const users: SeedUser[] = [
    adminUser,
    ...primaryOrganizationOwners,
    ...additionalOrganizationOwners,
    ...volunteerUsers,
    ...applicationRows.map(application => ({ email: application.email, firstName: application.organization_name, lastName: "Admin", role: "organization" as const })),
  ];
  for (const account of devQuickLoginGroups.flatMap(group => group.accounts)) {
    if (!users.some(user => user.email === account.email)) {
      throw new Error(`Quick-login account is missing from seed data: ${account.email}`);
    }
  }
  const userIds = new Map<string, string>();

  for (const user of users) {
    userIds.set(user.email, await ensureAuthUser(supabase, user, existingUsers));
  }

  await clearTable(supabase, "inbox_messages");
  await clearTable(supabase, "bookings");
  await clearTable(supabase, "organization_memberships");
  await clearTable(supabase, "volunteer_opportunities");
  await clearTable(supabase, "organizations");
  await clearTable(supabase, "organization_applications");

  await failOnError(
    "Inserting profiles",
    supabase.from("profiles").upsert(
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
      memberships.map((membership, index) => ({
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
        created_at: `${addDays(-120 - index)}T16:00:00Z`,
        reviewed_at: membership.status !== "pending" ? `${addDays(-90 - index)}T16:00:00Z` : null,
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
            status: opportunity.status ?? "published",
            recurring_group_id: opportunity.recurringGroupId ?? null,
            recurring_frequency: opportunity.recurringGroupId ? "weekly" : null,
            recurring_until: opportunity.recurringGroupId ? addDays(28) : null,
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
              ["approved", "completed"].includes(booking.status) && organization
                ? userIds.get(organization.ownerEmail)
                : null,
            approved_at: ["approved", "completed"].includes(booking.status) && opportunity ? `${addDays(opportunity.daysFromNow - 1)}T16:00:00Z` : null,
            rejected_at: booking.status === "rejected" ? now : null,
            cancelled_at: booking.status === "cancelled" ? now : null,
            checked_in_by:
              booking.checkedIn && organization
                ? userIds.get(organization.ownerEmail)
                : null,
            checked_in_at: booking.checkedIn && opportunity ? sessionTimestamp(opportunity) : null,
          };
        })
      )
      .select("id, opportunity_id, volunteer_id, status")
  )) ?? [];

  await failOnError(
    "Inserting organization applications",
    supabase.from("organization_applications").insert(applicationRows.map(row => ({ ...row, admin_notes: row.status === "rejected" ? "Please add a verifiable organization website and describe how volunteers will be supervised before resubmitting." : null })))
  );

  const inboxRows = [
    ...insertedBookings.filter(booking => ["pending", "approved", "invited"].includes(booking.status)).map((booking) => {
      const opportunity = opportunities.find(
        (item) => opportunityIds.get(item.key) === booking.opportunity_id
      );
      const organization = organizations.find(
        (item) => item.key === opportunity?.organizationKey
      );
      const title = booking.status === "invited" ? "Opportunity invitation" :
        booking.status === "approved"
          ? "Registration confirmed"
          : "Registration request sent";
      const kind: InboxKind =
        booking.status === "invited" ? "opportunity_invited" : booking.status === "approved" ? "booking_approved" : "booking_requested";

      return {
        recipient_id:
          ["approved", "invited"].includes(booking.status)
            ? booking.volunteer_id
            : userIds.get(organization?.ownerEmail ?? ""),
        actor_id:
          ["approved", "invited"].includes(booking.status)
            ? userIds.get(organization?.ownerEmail ?? "")
            : booking.volunteer_id,
        organization_id: organizationIds.get(opportunity?.organizationKey ?? ""),
        opportunity_id: booking.opportunity_id,
        booking_id: booking.id,
        membership_id: null,
        kind,
        title,
        body: booking.status === "invited" ? `You are invited to ${opportunity?.title}. Accept or decline in My Opportunities.` :
          ["approved", "invited"].includes(booking.status)
            ? `${opportunity?.title} is confirmed for you.`
            : `A volunteer requested registration for ${opportunity?.title}.`,
        action_href:
          ["approved", "invited"].includes(booking.status)
            ? "/dashboard/volunteer/opportunities"
            : `/dashboard/organization/opportunities/${booking.opportunity_id}/edit?view=review`,
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

  await failOnError("Inserting pending organization accounts", supabase.from("organizations").insert(
    applicationRows.map(application => ({ owner_id: userIds.get(application.email), name: application.organization_name, category: application.category, description: application.organization_description, contact_email: application.email, visibility: "public", status: "inactive" }))
  ));
  await failOnError("Inserting accepted application history", supabase.from("organization_applications").insert({ ...applicationRows[0], organization_name: organizations[0].name, email: organizations[0].ownerEmail, status: "accepted" }));
  await failOnError("Inserting direct messages", supabase.from("inbox_messages").insert(
    [null, now].map(read_at => ({ recipient_id: userIds.get("ava.volunteer@timetovolunteer.test"), actor_id: userIds.get(adminUser.email), kind: "direct_message", title: read_at ? "Read: Welcome to testing" : "Unread: Welcome to testing", body: "Development fixture. No email was sent.", read_at, action_href: "/dashboard/volunteer/inbox" }))
  ));
  for (const table of ["profiles", "organizations", "organization_applications", "organization_memberships", "volunteer_opportunities", "bookings", "inbox_messages", "booking_email_reminders"]) {
    const { count, error } = await supabase.from(table).select("id", { count: "exact", head: true });
    if (error) throw new Error(`Verifying ${table}: ${error.message}`);
    console.log(`${table}: ${count}`);
  }

  for (const target of rankTargets) {
    const rows = await failOnError("Verifying rank", supabase.from("bookings").select("status, checked_in_at, volunteer_opportunities!inner(*)").eq("volunteer_id", userIds.get(target.email)!));
    const hours = getVolunteerHours((rows ?? []).map(row => ({ ...row, opportunity: (Array.isArray(row.volunteer_opportunities) ? row.volunteer_opportunities[0] : row.volunteer_opportunities) })));
    if (hours !== target.hours || getVolunteerRank(hours) !== target.rank) throw new Error(`Unexpected rank for ${target.email}: ${hours} hours`);
    console.log(`${target.rank}: ${hours} checked-in hours verified`);
  }
  console.log("\nSeed complete.");
  console.log("Existing Auth accounts and avatar metadata preserved.");
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
