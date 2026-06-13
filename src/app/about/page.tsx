import Link from "next/link";
import type { Metadata } from "next";
import {
  Building2,
  CalendarCheck,
  Compass,
  GraduationCap,
  HeartHandshake,
  ShieldCheck,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Navbar } from "@/components/layout/Navbar";
import { absoluteUrl, siteName } from "@/lib/seo";

const aboutDescription =
  "Learn how TimeToVolunteer helps volunteers find local opportunities and helps organizations manage volunteer programs, registrations, and community impact.";

export const metadata: Metadata = {
  title: "About TimeToVolunteer | Connecting Volunteers with Local Organizations",
  description: aboutDescription,
  alternates: {
    canonical: "/about",
  },
  openGraph: {
    title: "About TimeToVolunteer | Connecting Volunteers with Local Organizations",
    description: aboutDescription,
    url: "/about",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "About TimeToVolunteer | Connecting Volunteers with Local Organizations",
    description: aboutDescription,
  },
};

export default function AboutPage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "AboutPage",
    name: `About ${siteName}`,
    url: absoluteUrl("/about"),
    description: aboutDescription,
    mainEntity: {
      "@type": "WebApplication",
      name: siteName,
      applicationCategory: "CommunityApplication",
      url: absoluteUrl("/"),
      description: aboutDescription,
    },
  };

  return (
    <div className="flex min-h-screen flex-col bg-white text-slate-950">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <Navbar />

      <main className="flex-1">
        <section className="border-b border-emerald-950/10 bg-emerald-50/40 px-4 py-16 lg:px-8">
          <div className="container mx-auto max-w-5xl">
            <div className="max-w-3xl">
              <p className="mb-4 inline-flex rounded-full border border-emerald-800/20 bg-white px-4 py-2 text-sm font-semibold text-emerald-800">
                About TimeToVolunteer
              </p>
              <h1 className="font-serif text-4xl font-bold leading-tight text-slate-950 sm:text-5xl">
                Connecting volunteers with trusted local organizations.
              </h1>
              <p className="mt-6 text-lg leading-8 text-slate-600">
                TimeToVolunteer helps people find meaningful volunteer
                opportunities near them and gives organizations a simple way to
                manage volunteer programs, memberships, registrations, and
                scheduling in one place.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Button asChild className="bg-emerald-800 hover:bg-emerald-700">
                  <Link href="/signup">Find Volunteer Opportunities</Link>
                </Button>
                <Button asChild variant="outline">
                  <Link href="/apply">Apply as an Organization</Link>
                </Button>
              </div>
            </div>
          </div>
        </section>

        <section className="px-4 py-14 lg:px-8">
          <div className="container mx-auto grid max-w-6xl gap-8 lg:grid-cols-[0.8fr_1fr]">
            <div>
              <h2 className="font-serif text-3xl font-bold text-slate-950">
                Our mission
              </h2>
              <p className="mt-5 text-base leading-8 text-slate-600">
                Volunteering should be easier to discover, easier to manage,
                and easier to fit into real life. Our mission is to help
                students, families, and community members connect with
                organizations that need reliable help, while giving
                organizations tools to coordinate people with less manual work.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              {[
                {
                  icon: Compass,
                  title: "Find opportunities",
                  description:
                    "Browse local volunteer opportunities, student volunteering options, and community service projects.",
                },
                {
                  icon: Building2,
                  title: "Join organizations",
                  description:
                    "Connect with public and private volunteer organizations that match your interests.",
                },
                {
                  icon: CalendarCheck,
                  title: "Manage registrations",
                  description:
                    "Register for open sessions, request approval when needed, and keep your schedule organized.",
                },
                {
                  icon: HeartHandshake,
                  title: "Build impact",
                  description:
                    "Help organizations coordinate volunteer programs and keep community work moving.",
                },
              ].map((item) => (
                <div
                  key={item.title}
                  className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm shadow-slate-950/5"
                >
                  <item.icon className="size-6 text-emerald-800" />
                  <h3 className="mt-4 font-semibold text-slate-950">
                    {item.title}
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    {item.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="border-y border-emerald-950/10 bg-slate-50 px-4 py-14 lg:px-8">
          <div className="container mx-auto max-w-6xl">
            <h2 className="text-center font-serif text-3xl font-bold text-slate-950">
              Built for volunteers and organizations
            </h2>
            <div className="mt-10 grid gap-6 md:grid-cols-2">
              <div className="rounded-lg border border-slate-200 bg-white p-6">
                <GraduationCap className="size-7 text-emerald-800" />
                <h3 className="mt-4 text-xl font-bold text-slate-950">
                  For volunteers and students
                </h3>
                <p className="mt-3 leading-7 text-slate-600">
                  Volunteers can create a profile, share interests, discover
                  volunteering opportunities, join organizations, and manage
                  registrations from a personal dashboard.
                </p>
              </div>

              <div className="rounded-lg border border-slate-200 bg-white p-6">
                <Users className="size-7 text-emerald-800" />
                <h3 className="mt-4 text-xl font-bold text-slate-950">
                  For volunteer organizations
                </h3>
                <p className="mt-3 leading-7 text-slate-600">
                  Organizations can manage their profile, create volunteer
                  programs and opportunities, review memberships, handle
                  registrations, and communicate updates through the inbox.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="px-4 py-14 lg:px-8">
          <div className="container mx-auto max-w-5xl">
            <div className="grid gap-8 rounded-lg border border-emerald-900/10 bg-emerald-900 p-6 text-white shadow-lg shadow-emerald-950/15 md:grid-cols-[1fr_auto] md:items-center md:p-8">
              <div>
                <div className="flex items-center gap-3">
                  <ShieldCheck className="size-7 text-emerald-100" />
                  <h2 className="font-serif text-3xl font-bold">
                    Simple, secure, and community focused.
                  </h2>
                </div>
                <p className="mt-4 max-w-2xl leading-7 text-emerald-50/90">
                  TimeToVolunteer is designed to help people find trusted
                  volunteer organizations and make it easier for those
                  organizations to coordinate real-world service.
                </p>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row md:flex-col">
                <Button asChild variant="secondary">
                  <Link href="/signup">Create Volunteer Account</Link>
                </Button>
                <Button
                  asChild
                  variant="outline"
                  className="border-white/30 bg-transparent text-white hover:bg-white/10"
                >
                  <Link href="/apply">Organization Application</Link>
                </Button>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-emerald-950/10 px-4 py-8 text-sm text-slate-500 lg:px-8">
        <div className="container mx-auto max-w-6xl">
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
