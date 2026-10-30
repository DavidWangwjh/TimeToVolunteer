import Link from "next/link";
import { CategoryCarousel } from "@/components/landing/CategoryCarousel";
import type { Metadata } from "next";
import {
  ArrowRight,
  Calendar,
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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Navbar } from "@/components/layout/Navbar";
import { getAuthNavState } from "@/lib/auth";
import { absoluteUrl, siteDescription, siteName } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Volunteer Near Me & Student Volunteer Opportunities",
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
        <section className="relative border-b border-emerald-950/10 px-4 py-5 lg:px-8">
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-28 overflow-hidden text-emerald-100">
            <div className="absolute -bottom-14 left-0 h-32 w-full rounded-[50%] border-t border-emerald-200/70" />
            <div className="absolute -bottom-20 left-0 h-40 w-full rounded-[50%] border-t border-emerald-200/60" />
            <div className="absolute -bottom-28 left-0 h-52 w-full rounded-[50%] border-t border-emerald-200/50" />
          </div>

          <div className="container relative mx-auto grid max-w-6xl items-start gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-8">
            <div className="mx-auto w-full max-w-2xl text-center lg:mx-0 lg:text-left">
              <div className="mb-4 inline-flex max-w-full items-center gap-3 rounded-full border border-emerald-800/20 bg-emerald-50 px-4 py-2 text-sm font-medium text-emerald-800">
                <Heart className="size-4 fill-emerald-800" />
                <span className="truncate">Make a difference in your community</span>
              </div>

              <h1 className="font-serif text-4xl font-bold leading-[1.12] tracking-tight text-slate-950 sm:text-5xl xl:text-[3.5rem]">
                Find Volunteer<br className="hidden xl:block" /> Opportunities{" "}
                <span className="block italic text-emerald-800">Near You</span>
              </h1>

              <p className="mx-auto mt-4 max-w-lg text-base leading-7 text-slate-600 lg:mx-0 lg:max-w-none">
                Make time for what matters. Connect with local organizations, find a cause you care about, and choose opportunities that fit your schedule—all in one place.
              </p>

              <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:justify-center lg:justify-start">
                <Button
                  asChild
                  size="lg"
                  className="h-11 w-full bg-emerald-800 px-5 text-sm shadow-lg shadow-emerald-950/15 hover:bg-emerald-700 sm:w-auto"
                >
                  <Link href={auth.isSignedIn ? auth.dashboardHref : "/signup"}>
                    {auth.isSignedIn ? auth.dashboardLabel : "Create Volunteer Account"}
                    <ArrowRight className="ml-2 size-5" />
                  </Link>
                </Button>
                <Button
                  asChild
                  variant="outline"
                  size="lg"
                  className="h-11 w-full border-slate-200 bg-white px-5 text-sm text-slate-900 shadow-sm hover:bg-slate-50 sm:w-auto"
                >
                  <Link href={auth.isSignedIn ? "/about" : "/apply"}>{auth.isSignedIn ? "About TimeToVolunteer" : "Apply as Organization"}</Link>
                </Button>
              </div>

              <div className="mx-auto mt-5 max-w-lg border-t border-emerald-950/10 pt-4 text-left lg:mx-0 lg:max-w-none">
                <h2 className="mb-2 text-sm font-semibold text-slate-900">{auth.isSignedIn ? "Volunteering in 3 simple steps" : "Get started in 3 simple steps"}</h2>
                <ol className="space-y-3">
                  {[
                    { title: "Create your account", description: "Add a few details about yourself to get started." },
                    { title: "Find your community", description: "Explore local organizations and request to join your favorites." },
                    { title: "Pick a time. Make a difference.", description: "Sign up for an opportunity. Once approved, you’re ready to help." },
                  ].map((step, index) => (
                    <li key={step.title} className="flex items-start gap-3">
                      <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-xs font-semibold text-emerald-800">{index + 1}</span>
                      <div><h3 className="text-sm font-semibold">{step.title}</h3><p className="mt-0.5 text-sm leading-5 text-slate-600">{step.description}</p></div>
                    </li>
                  ))}
                </ol>
              </div>

            </div>

            <HeroCalendar actionHref={auth.isSignedIn ? auth.dashboardHref : "/signup"} actionLabel={auth.isSignedIn ? auth.dashboardLabel : "Get started"} />
          </div>
        </section>

        <section aria-labelledby="explore-heading" className="border-b border-emerald-950/10 bg-gradient-to-b from-emerald-50/70 to-white px-4 py-6 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <CategoryCarousel />
          </div>
        </section>

        <section className="px-4 py-9 lg:px-8">
          <div className="container mx-auto max-w-6xl">
            <h2 className="text-center font-serif text-2xl font-bold text-slate-950">
              Built for volunteers. Backed by community.
            </h2>
            <div className="mt-6 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
              {[
                {
                  icon: Compass,
                  title: "Volunteer Opportunities",
                  description:
                    "Find volunteering opportunities near you and make a real impact.",
                },
                {
                  icon: Calendar,
                  title: "Flexible & Convenient",
                  description:
                    "Choose volunteer programs and schedules that work for your life.",
                },
                {
                  icon: Users,
                  title: "Student Friendly",
                  description:
                    "Find volunteering for students, service hours, and community projects.",
                },
                {
                  icon: ShieldCheck,
                  title: "Safe & Reliable",
                  description:
                    "Connect with trusted volunteer organizations and secure data practices.",
                },
              ].map((item) => (
                <div key={item.title} className="grid grid-cols-[auto_1fr] gap-5">
                  <div className="flex size-11 items-center justify-center rounded-full border-2 border-emerald-700 text-emerald-800">
                    <item.icon className="size-6" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-950">{item.title}</h3>
                    <p className="mt-2 text-sm leading-6 text-slate-600">
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
          <p>Questions? Contact us at support@timetovolunteer.org</p>
          <p className="mt-2">
            &copy; {new Date().getFullYear()} TimeToVolunteer. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}

function HeroCalendar({ actionHref, actionLabel }: { actionHref: string; actionLabel: string }) {
  const today = new Date();
  const visibleStart = new Date(today);
  visibleStart.setDate(today.getDate() - 2);
  const monthLabel = today.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });
  const days = Array.from({ length: 5 }, (_, index) => {
    const date = new Date(visibleStart);
    date.setDate(visibleStart.getDate() + index);

    return {
      key: date.toISOString(),
      label: date.toLocaleDateString("en-US", { weekday: "short" }).toUpperCase(),
      date: String(date.getDate()),
      isToday: date.toDateString() === today.toDateString(),
    };
  });

  return (
    <div className="relative min-w-0">
      <div aria-hidden="true" className="pointer-events-none absolute -right-20 top-8 size-72 rounded-full bg-emerald-100/50" />
      <div aria-hidden="true" className="pointer-events-none absolute -right-8 top-24 size-72 rounded-full bg-emerald-100/40" />
      <div className="absolute -left-10 -top-8 hidden grid-cols-6 gap-3 text-emerald-800/20 lg:grid">
        {Array.from({ length: 48 }).map((_, index) => (
          <span key={index} className="size-1 rounded-full bg-current" />
        ))}
      </div>

      <div className="relative mx-auto max-w-[33rem] lg:max-w-none rounded-2xl border border-slate-200 bg-white p-3 shadow-xl shadow-slate-950/10 sm:p-4">
        <div className="grid gap-3">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-emerald-700">Volunteering at a Glance</p>
          <div>
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3 sm:gap-4">
                <h2 className="text-base font-bold text-slate-950">
                  {monthLabel}
                </h2>
                <div className="flex items-center gap-3 text-slate-800">
                  <span aria-hidden="true">
                    <ChevronLeft className="size-4" />
                  </span>
                  <span aria-hidden="true">
                    <ChevronRight className="size-4" />
                  </span>
                </div>
                <span className="rounded-md border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-600">
                  Today
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-600">
                Filters
                <SlidersHorizontal className="size-4 text-slate-700" />
              </div>
            </div>

            <div className="hidden overflow-x-auto pb-2 md:block">
              <div className="grid min-w-0 grid-cols-[2.75rem_repeat(5,minmax(0,1fr))] text-center text-xs xl:min-w-0">
                <div />
                {days.map((day) => (
                  <div key={day.key} className="pb-2">
                    <div
                      className={`font-semibold ${
                        day.isToday ? "text-emerald-800" : "text-slate-500"
                      }`}
                    >
                      {day.label}
                    </div>
                    <div
                      className={`mx-auto mt-1.5 flex size-7 items-center justify-center rounded-full font-bold ${
                        day.isToday
                          ? "bg-emerald-800 text-white shadow-lg shadow-emerald-900/20"
                          : "text-slate-700"
                      }`}
                    >
                      {day.date}
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
                    {days.map((day, column) => (
                      <div
                        key={`${time}-${day.key}`}
                        className="relative min-h-9 border-l border-t border-slate-200"
                      >
                        {row === 0 && column === 0 ? (
                          <CalendarEvent
                            className="border-emerald-300 bg-emerald-50"
                            title="Food Pantry"
                            time="9:30 AM - 12:00 PM"
                            team="Helping Hands"
                          />
                        ) : null}
                        {row === 4 && column === 0 ? (
                          <CalendarEvent
                            className="border-amber-300 bg-amber-50"
                            title="Community Garden"
                            time="1:00 - 3:00 PM"
                            team="Green City Project"
                          />
                        ) : null}
                        {row === 1 && column === 3 ? (
                          <CalendarEvent
                            className="border-sky-300 bg-sky-50"
                            title="Youth Tutoring"
                            time="10:00 AM - 12:00 PM"
                            team="Bright Futures"
                          />
                        ) : null}
                        {row === 5 && column === 3 ? (
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

          <aside className="hidden rounded-lg border border-slate-200 bg-slate-50/70 p-3 shadow-sm md:block">
            <div className="flex items-center gap-3">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-emerald-800">
                <CheckCircle2 className="size-5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-bold leading-tight text-slate-950">
                    Park Cleanup
                  </h3>
                  <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-800">
                    Open
                  </span>
                </div>
                <p className="mt-1 text-xs text-slate-600">
                  City Green Team · Riverside Park
                </p>
              </div>
              <Button asChild className="h-8 shrink-0 bg-emerald-800 px-3 text-xs hover:bg-emerald-700">
                <Link href={actionHref}>{actionLabel}</Link>
              </Button>
            </div>
            <div className="mt-3 grid gap-2 border-t border-slate-200 pt-3 text-xs text-slate-600 sm:grid-cols-3">
              <span className="flex items-center gap-1.5">
                <Calendar className="size-3.5" />
                {new Date(visibleStart.getFullYear(), visibleStart.getMonth(), visibleStart.getDate() + 3).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
              </span>
              <span className="flex items-center gap-1.5">
                <Clock className="size-3.5" />
                2:00-4:00 PM
              </span>
              <span className="flex items-center gap-1.5">
                <MapPin className="size-3.5" />
                Outdoors
              </span>
            </div>
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
      className={`absolute inset-x-1 top-0 z-10 rounded-md border p-1.5 text-left shadow-sm ${className}`}
    >
      <p className="text-[0.72rem] font-bold leading-tight text-slate-800">{title}</p>
      <p className="mt-1.5 text-[0.63rem] font-medium leading-tight text-slate-600">{time}</p>
      <p className="mt-1.5 flex items-center gap-1 text-[0.63rem] leading-tight text-slate-600">
        <Heart className="size-2.5" />
        {team}
      </p>
    </div>
  );
}
