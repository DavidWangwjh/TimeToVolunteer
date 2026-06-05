import Link from "next/link";
import type { Metadata } from "next";
import {
  ArrowRight,
  Calendar,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Compass,
  Heart,
  MapPin,
  ShieldCheck,
  SlidersHorizontal,
  Users,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Navbar } from "@/components/layout/Navbar";
import { getAuthNavState } from "@/lib/auth";
import { absoluteUrl, siteDescription, siteName } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Volunteer Opportunities That Fit Your Schedule",
  description: siteDescription,
  alternates: {
    canonical: "/",
  },
};

export default async function HomePage() {
  const auth = await getAuthNavState();
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: siteName,
    applicationCategory: "CommunityApplication",
    operatingSystem: "Web",
    url: absoluteUrl("/"),
    description: siteDescription,
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
    },
  };

  return (
    <div className="flex min-h-screen flex-col overflow-x-hidden bg-white text-slate-950">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <Navbar />

      <main className="flex-1 overflow-hidden">
        <section className="relative border-b border-emerald-950/10 px-4 py-10 sm:py-16 lg:px-8 xl:py-20">
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-28 overflow-hidden text-emerald-100">
            <div className="absolute -bottom-14 left-0 h-32 w-full rounded-[50%] border-t border-emerald-200/70" />
            <div className="absolute -bottom-20 left-0 h-40 w-full rounded-[50%] border-t border-emerald-200/60" />
            <div className="absolute -bottom-28 left-0 h-52 w-full rounded-[50%] border-t border-emerald-200/50" />
          </div>

          <div className="container relative mx-auto grid max-w-7xl items-center gap-10 xl:grid-cols-[0.72fr_1fr] xl:gap-12">
            <div className="mx-auto max-w-2xl text-center xl:mx-0 xl:max-w-xl xl:text-left">
              <div className="mb-6 inline-flex max-w-full items-center gap-3 rounded-full border border-emerald-800/20 bg-emerald-50 px-4 py-2 text-sm font-medium text-emerald-800 sm:mb-7">
                <Heart className="size-4 fill-emerald-800" />
                <span className="truncate">Make a difference in your community</span>
              </div>

              <h1 className="font-serif text-4xl font-bold leading-[1.08] text-slate-950 min-[430px]:text-5xl sm:text-6xl xl:text-7xl">
                {auth.isSignedIn ? (
                  <>
                    Welcome back,{" "}
                    <span className="italic text-emerald-800">{auth.firstName}</span>
                  </>
                ) : (
                  <>
                    Find Your Place to <span className="italic text-emerald-800">Help</span>
                  </>
                )}
              </h1>

              <p className="mx-auto mt-6 max-w-lg text-base leading-7 text-slate-600 sm:mt-7 sm:text-lg sm:leading-8 xl:mx-0">
                {auth.isSignedIn
                  ? auth.mustResetPassword
                    ? "Please set a new password to continue using your account."
                    : auth.role === "organization" || auth.role === "admin"
                      ? "Manage organization opportunities, membership requests, and registrations from your dashboard."
                      : "Continue browsing sessions and managing your volunteer registrations."
                  : "Create a volunteer profile, join trusted organizations, and find meaningful opportunities that fit your schedule."}
              </p>

              <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:justify-center xl:justify-start">
                {auth.isSignedIn ? (
                  <Button
                    asChild
                    size="lg"
                    className="h-12 w-full bg-emerald-800 px-7 text-base shadow-lg shadow-emerald-950/15 hover:bg-emerald-700 sm:w-auto"
                  >
                    <Link href={auth.dashboardHref}>
                      {auth.dashboardLabel}
                      <ArrowRight className="ml-2 size-5" />
                    </Link>
                  </Button>
                ) : (
                  <>
                    <Button
                      asChild
                      size="lg"
                      className="h-12 w-full bg-emerald-800 px-7 text-base shadow-lg shadow-emerald-950/15 hover:bg-emerald-700 sm:w-auto"
                    >
                      <Link href="/signup">
                        Create Volunteer Account
                        <ArrowRight className="ml-2 size-5" />
                      </Link>
                    </Button>
                    <Button
                      asChild
                      variant="outline"
                      size="lg"
                      className="h-12 w-full border-slate-200 bg-white px-7 text-base text-slate-900 shadow-sm hover:bg-slate-50 sm:w-auto"
                    >
                      <Link href="/apply">Apply as Organization</Link>
                    </Button>
                  </>
                )}
              </div>

              <div className="mx-auto mt-8 grid max-w-lg grid-cols-1 gap-4 text-left text-sm text-slate-600 min-[520px]:grid-cols-3 sm:mt-10 xl:mx-0">
                {[
                  { icon: Users, label: "Trusted by local organizations" },
                  { icon: Calendar, label: "Flexible scheduling that works for you" },
                  { icon: ShieldCheck, label: "Safe, simple, and secure" },
                ].map((item) => (
                  <div key={item.label} className="flex items-center gap-3">
                    <item.icon className="size-6 shrink-0 text-emerald-800" />
                    <span className="leading-snug">{item.label}</span>
                  </div>
                ))}
              </div>
            </div>

            <HeroCalendar />
          </div>
        </section>

        <section className="border-b border-emerald-950/10 bg-emerald-50/40 px-4 py-8 lg:px-8">
          <div className="container mx-auto max-w-5xl">
            <h2 className="mb-6 text-center font-serif text-2xl font-bold">
              How it works
            </h2>
            <div className="grid gap-6 md:grid-cols-3 md:divide-x md:divide-emerald-950/15">
              {[
                {
                  icon: Compass,
                  title: "Create Profile",
                  description:
                    "Sign up as a volunteer and keep your interests and contact details current.",
                },
                {
                  icon: CheckCircle2,
                  title: "Join Organizations",
                  description:
                    "Request access to private organizations or browse public opportunities.",
                },
                {
                  icon: Calendar,
                  title: "Book & Volunteer",
                  description:
                    "Apply for sessions, track approvals, and show up ready to help.",
                },
              ].map((item, index) => (
                <div
                  key={item.title}
                  className="grid grid-cols-[auto_1fr] items-center gap-4 px-2 py-3 md:px-8"
                >
                  <div className="flex size-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-800">
                    <item.icon className="size-7" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-950">
                      {index + 1}. {item.title}
                    </h3>
                    <p className="mt-2 text-sm leading-6 text-slate-600">
                      {item.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="px-4 py-14 lg:px-8">
          <div className="container mx-auto max-w-6xl">
            <h2 className="text-center font-serif text-3xl font-bold text-slate-950">
              Built for volunteers. Backed by community.
            </h2>
            <div className="mt-12 grid gap-8 md:grid-cols-2 lg:grid-cols-4">
              {[
                {
                  icon: Compass,
                  title: "Meaningful Opportunities",
                  description: "Find causes you care about and make a real impact.",
                },
                {
                  icon: Calendar,
                  title: "Flexible & Convenient",
                  description: "Choose times and places that work for your life.",
                },
                {
                  icon: Users,
                  title: "Stronger Communities",
                  description: "Connect with local organizations and like-minded people.",
                },
                {
                  icon: ShieldCheck,
                  title: "Safe & Reliable",
                  description:
                    "Background-checked organizations and secure data practices.",
                },
              ].map((item) => (
                <div key={item.title} className="grid grid-cols-[auto_1fr] gap-5">
                  <div className="flex size-11 items-center justify-center rounded-full border-2 border-emerald-700 text-emerald-800">
                    <item.icon className="size-6" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-950">{item.title}</h3>
                    <p className="mt-4 text-sm leading-6 text-slate-600">
                      {item.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-emerald-950/10 px-4 py-8">
        <div className="container mx-auto max-w-4xl text-center text-sm text-slate-500">
          <p className="mb-1 font-medium text-slate-950">TimeToVolunteer</p>
          <p>Questions? Contact us at volunteer@timetovolunteer.org</p>
          <p className="mt-2">
            &copy; {new Date().getFullYear()} TimeToVolunteer. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}

function HeroCalendar() {
  const days = [
    ["SUN", "18"],
    ["MON", "19"],
    ["TUE", "20"],
    ["WED", "21"],
    ["THU", "22"],
    ["FRI", "23"],
    ["SAT", "24"],
  ];

  return (
    <div className="relative min-w-0">
      <div className="absolute -left-10 -top-8 hidden grid-cols-6 gap-3 text-emerald-800/20 lg:grid">
        {Array.from({ length: 48 }).map((_, index) => (
          <span key={index} className="size-1 rounded-full bg-current" />
        ))}
      </div>

      <div className="relative rounded-lg border border-slate-200 bg-white p-4 shadow-2xl shadow-slate-950/10 sm:p-6">
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_18rem]">
          <div>
            <div className="mb-7 flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-4 sm:gap-6">
                <h2 className="text-lg font-bold text-slate-950">May 2025</h2>
                <div className="flex items-center gap-4 text-slate-800">
                  <button type="button" aria-label="Previous week">
                    <ChevronLeft className="size-4" />
                  </button>
                  <button type="button" aria-label="Next week">
                    <ChevronRight className="size-4" />
                  </button>
                </div>
                <span className="rounded-md border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600">
                  Today
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-600">
                Filters
                <SlidersHorizontal className="size-4 text-slate-700" />
              </div>
            </div>

            <div className="hidden overflow-x-auto pb-2 md:block">
              <div className="grid min-w-[46rem] grid-cols-[3rem_repeat(7,minmax(6rem,1fr))] text-center text-xs xl:min-w-0">
                <div />
                {days.map(([day, date]) => (
                  <div key={date} className="pb-4">
                    <div
                      className={`font-semibold ${
                        day === "WED" ? "text-emerald-800" : "text-slate-500"
                      }`}
                    >
                      {day}
                    </div>
                    <div
                      className={`mx-auto mt-2 flex size-8 items-center justify-center rounded-full font-bold ${
                        day === "WED"
                          ? "bg-emerald-800 text-white shadow-lg shadow-emerald-900/20"
                          : "text-slate-700"
                      }`}
                    >
                      {date}
                    </div>
                  </div>
                ))}

                {[
                  "9 AM",
                  "10 AM",
                  "11 AM",
                  "12 PM",
                  "1 PM",
                  "2 PM",
                  "3 PM",
                  "4 PM",
                ].map((time, row) => (
                  <div key={time} className="contents">
                    <div className="border-t border-slate-200 pt-2 text-left text-xs font-medium text-slate-500">
                      {time}
                    </div>
                    {days.map(([, date], column) => (
                      <div
                        key={`${time}-${date}`}
                        className="relative min-h-14 border-l border-t border-slate-200"
                      >
                        {row === 1 && column === 1 ? (
                          <CalendarEvent
                            className="border-emerald-300 bg-emerald-50"
                            title="Food Pantry"
                            time="9:30 - 12:00 PM"
                            team="Helping Hands"
                          />
                        ) : null}
                        {row === 4 && column === 1 ? (
                          <CalendarEvent
                            className="border-amber-300 bg-amber-50"
                            title="Community Garden"
                            time="1:00 - 3:00 PM"
                            team="Green City Project"
                          />
                        ) : null}
                        {row === 2 && column === 5 ? (
                          <CalendarEvent
                            className="border-sky-300 bg-sky-50"
                            title="Youth Tutoring"
                            time="10:00 AM - 12:00 PM"
                            team="Bright Futures"
                          />
                        ) : null}
                        {row === 5 && column === 5 ? (
                          <CalendarEvent
                            className="border-emerald-300 bg-emerald-50"
                            title="Park Cleanup"
                            time="2:00 - 4:00 PM"
                            team="City Green Team"
                          />
                        ) : null}
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-3 md:hidden">
              {[
                {
                  title: "Food Pantry",
                  time: "9:30 AM - 12:00 PM",
                  team: "Helping Hands",
                  className: "border-emerald-300 bg-emerald-50",
                },
                {
                  title: "Community Garden",
                  time: "1:00 - 3:00 PM",
                  team: "Green City Project",
                  className: "border-amber-300 bg-amber-50",
                },
                {
                  title: "Park Cleanup",
                  time: "2:00 - 4:00 PM",
                  team: "City Green Team",
                  className: "border-emerald-300 bg-emerald-50",
                },
              ].map((event) => (
                <div
                  key={event.title}
                  className={`rounded-md border p-3 text-left shadow-sm ${event.className}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <p className="font-bold text-slate-800">{event.title}</p>
                    <p className="shrink-0 text-xs font-semibold text-slate-600">
                      {event.time}
                    </p>
                  </div>
                  <p className="mt-2 flex items-center gap-1 text-sm text-slate-600">
                    <Heart className="size-3" />
                    {event.team}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <aside className="hidden rounded-lg border border-slate-200 bg-white p-4 shadow-sm xl:block">
            <div className="relative h-28 overflow-hidden rounded-md bg-gradient-to-br from-emerald-200 via-sky-100 to-amber-100">
              <div className="absolute inset-x-0 bottom-0 h-10 bg-emerald-700/35" />
              <div className="absolute bottom-5 left-5 size-12 rounded-full bg-emerald-700/80" />
              <div className="absolute bottom-7 left-14 h-16 w-5 rounded-full bg-emerald-800/70" />
              <div className="absolute bottom-5 left-24 size-10 rounded-full bg-slate-700/70" />
              <div className="absolute bottom-8 right-10 h-16 w-5 rounded-full bg-emerald-700/75" />
              <button
                className="absolute right-3 top-3 flex size-7 items-center justify-center rounded-full bg-white text-slate-700 shadow-sm"
                type="button"
                aria-label="Close opportunity preview"
              >
                <X className="size-4" />
              </button>
            </div>
            <h3 className="mt-5 text-xl font-bold text-slate-950">Park Cleanup</h3>
            <div className="mt-3 flex items-center gap-2 text-sm text-slate-600">
              <CheckCircle2 className="size-4 fill-emerald-700 text-white" />
              City Green Team
              <Check className="size-3 text-emerald-700" />
            </div>
            <div className="mt-5 space-y-3 text-sm text-slate-600">
              <div className="flex items-center gap-3">
                <Calendar className="size-4 text-slate-600" />
                Saturday, May 24, 2025
              </div>
              <div className="flex items-center gap-3">
                <Clock className="size-4 text-slate-600" />
                2:00 PM - 4:00 PM
              </div>
              <div className="flex items-start gap-3">
                <MapPin className="mt-0.5 size-4 text-slate-600" />
                <span>
                  Riverside Park
                  <br />
                  123 Greenway Dr, Springfield
                </span>
              </div>
            </div>
            <div className="my-5 border-t border-slate-200" />
            <p className="text-sm leading-6 text-slate-600">
              Help keep our parks beautiful. We&apos;ll be picking up litter,
              clearing trails, and improving the community space.
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              <span className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-800">
                Outdoors
              </span>
              <span className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-800">
                Group Friendly
              </span>
            </div>
            <Button className="mt-6 h-10 w-full bg-emerald-800 hover:bg-emerald-700">
              View & Sign Up
            </Button>
          </aside>
        </div>
      </div>
    </div>
  );
}

function CalendarEvent({
  title,
  time,
  team,
  className,
}: {
  title: string;
  time: string;
  team: string;
  className: string;
}) {
  return (
    <div
      className={`absolute inset-x-1 top-0 z-10 rounded-md border p-2 text-left shadow-sm ${className}`}
    >
      <p className="text-xs font-bold text-slate-800">{title}</p>
      <p className="mt-2 text-[0.68rem] font-medium text-slate-600">{time}</p>
      <p className="mt-2 flex items-center gap-1 text-[0.68rem] text-slate-600">
        <Heart className="size-3" />
        {team}
      </p>
    </div>
  );
}
