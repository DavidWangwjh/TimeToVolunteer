import Link from "next/link";
import Image from "next/image";
import { cn } from "@/lib/utils";
import {
  ClipboardList,
  User,
  LayoutDashboard,
  Users,
  Building2,
  Mail,
  Search,
} from "lucide-react";
import { SignOutButton } from "@/components/layout/SignOutButton";

const volunteerLinks = [
  { href: "/dashboard/volunteer", label: "Overview", icon: LayoutDashboard },
  { href: "/dashboard/volunteer/organizations", label: "My Organizations", icon: Building2 },
  { href: "/dashboard/volunteer/explore", label: "Explore", icon: Search },
  { href: "/dashboard/volunteer/inbox", label: "Inbox", icon: Mail },
  { href: "/dashboard/volunteer/profile", label: "Profile", icon: User },
];

const platformAdminLinks = [
  { href: "/dashboard/admin", label: "Overview", icon: LayoutDashboard },
  { href: "/dashboard/admin/applications", label: "Applications", icon: ClipboardList },
  { href: "/dashboard/admin/volunteers", label: "Volunteers", icon: Users },
  { href: "/dashboard/admin/organizations", label: "Organizations", icon: Building2 },
  { href: "/dashboard/admin/opportunities", label: "Opportunities", icon: ClipboardList },
];

const organizationAdminLinks = [
  { href: "/dashboard/organization", label: "Overview", icon: LayoutDashboard },
  { href: "/dashboard/organization/inbox", label: "Inbox", icon: Mail },
  { href: "/dashboard/organization/memberships", label: "Memberships", icon: Users },
  { href: "/dashboard/organization/bookings", label: "Registrations", icon: ClipboardList },
  { href: "/dashboard/organization/profile", label: "Profile", icon: User },
];

const lockedOrganizationLinks = [
  { href: "/dashboard/organization", label: "Overview", icon: LayoutDashboard },
  { href: "/dashboard/organization/inbox", label: "Inbox", icon: Mail },
  { href: "/dashboard/organization/profile", label: "Profile", icon: User },
];

interface SidebarProps {
  variant: "volunteer" | "admin";
  currentPath: string;
  navCounts?: Record<string, number>;
  adminKind?: "platform" | "organization";
  organizationLocked?: boolean;
}

export function Sidebar({
  variant,
  currentPath,
  navCounts = {},
  adminKind = "platform",
  organizationLocked = false,
}: SidebarProps) {
  const links =
    variant === "admin"
      ? adminKind === "platform"
        ? platformAdminLinks
        : organizationLocked
        ? lockedOrganizationLinks
        : organizationAdminLinks
      : volunteerLinks;
  const label =
    variant === "admin"
      ? adminKind === "organization"
        ? "Organization Dashboard"
        : "Admin Dashboard"
      : "Volunteer Dashboard";

  function isActive(href: string) {
    return (
      currentPath === href ||
      (!["/dashboard/volunteer", "/dashboard/admin", "/dashboard/organization"].includes(href) &&
        currentPath.startsWith(href))
    );
  }

  function countFor(href: string) {
    return navCounts[href];
  }

  function CountBadge({ count, active }: { count: number; active: boolean }) {
    return (
      <span
        className={cn(
          "ml-auto inline-flex min-w-6 items-center justify-center rounded-full px-2 py-0.5 text-xs font-bold tabular-nums",
          active
            ? "bg-white text-emerald-900 ring-1 ring-emerald-950/10"
            : count > 0
            ? "bg-emerald-100 text-emerald-800"
            : "bg-slate-100 text-slate-500"
        )}
      >
        {count}
      </span>
    );
  }

  return (
    <>
      <div className="sticky top-0 z-40 border-b border-emerald-950/10 bg-white/90 backdrop-blur lg:hidden">
        <div className="flex items-center justify-between gap-3 px-4 py-3">
          <Link href="/" className="flex min-w-0 items-center gap-2">
            <Image
              src="/logo-no-bg.png"
              alt=""
              width={28}
              height={28}
              className="size-8 sm:size-10 shrink-0 object-contain"
            />

            <div className="min-w-0 text-left">
              <p className="truncate text-lg font-bold leading-tight text-emerald-800 sm:text-xl">
                TimeToVolunteer
              </p>
              <p className="truncate text-xs font-medium text-slate-500">
                {label}
              </p>
            </div>
          </Link>
          <SignOutButton />
        </div>
        <nav className="flex gap-2 overflow-x-auto px-4 pb-3">
          {links.map(({ href, label: itemLabel, icon: Icon }) => {
            const active = isActive(href);
            const count = countFor(href);

            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "inline-flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold transition-colors",
                  active
                    ? "bg-emerald-800 text-white shadow-sm shadow-emerald-950/20"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-950"
                )}
              >
                <Icon className="size-4" />
                {itemLabel}
                {count !== undefined && <CountBadge active={active} count={count} />}
              </Link>
            );
          })}
        </nav>
      </div>

      <aside className="fixed inset-y-0 left-0 z-40 hidden w-72 border-r border-emerald-950/10 bg-white/85 p-4 shadow-xl shadow-slate-950/5 backdrop-blur lg:flex lg:flex-col">
        <div className="rounded-lg bg-emerald-900 p-3 text-white shadow-lg shadow-emerald-950/20">
          <Link href="/" className="flex min-w-0 items-center gap-3">
            <Image
              src="/logo-no-bg.png"
              alt=""
              width={32}
              height={32}
              className="size-10 shrink-0 object-contain"
            />

            <div className="min-w-0 text-left">
              <p className="truncate text-xl font-bold leading-tight">
                TimeToVolunteer
              </p>
              <p className="truncate text-xs font-medium text-emerald-50/70">
                {label}
              </p>
            </div>
          </Link>
        </div>

        <nav className="mt-5 flex-1 space-y-1">
          {links.map(({ href, label: itemLabel, icon: Icon }) => {
            const active = isActive(href);
            const count = countFor(href);

            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "group flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-semibold transition-colors",
                  active
                    ? "bg-emerald-50 text-emerald-900 ring-1 ring-emerald-200"
                    : "text-slate-500 hover:bg-slate-100 hover:text-slate-950"
                )}
              >
                <span
                  className={cn(
                    "flex size-8 items-center justify-center rounded-lg transition-colors",
                    active
                      ? "bg-emerald-800 text-white"
                      : "bg-slate-100 text-slate-500 group-hover:bg-white group-hover:text-slate-800"
                  )}
                >
                  <Icon className="size-4" />
                </span>
                <span className="min-w-0 flex-1 truncate">{itemLabel}</span>
                {count !== undefined && <CountBadge active={active} count={count} />}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-slate-200 pt-4">
          <SignOutButton className="w-full justify-center" />
        </div>
      </aside>
    </>
  );
}
