import Link from "next/link";
import Image from "next/image";
import { cn } from "@/lib/utils";
import {
  ClipboardList,
  User,
  LayoutDashboard,
  Users,
  FileText,
  Building2,
  Mail,
} from "lucide-react";
import { SignOutButton } from "@/components/layout/SignOutButton";

const volunteerLinks = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/dashboard/inbox", label: "Inbox", icon: Mail },
  { href: "/dashboard/organizations", label: "Explore", icon: Building2 },
  { href: "/dashboard/profile", label: "Profile", icon: User },
];

const platformAdminLinks = [
  { href: "/admin", label: "Overview", icon: LayoutDashboard },
  { href: "/admin/inbox", label: "Inbox", icon: Mail },
  { href: "/admin/applications", label: "Applications", icon: FileText },
  { href: "/admin/memberships", label: "Memberships", icon: Users },
  { href: "/admin/volunteers", label: "Volunteers", icon: Users },
  { href: "/admin/bookings", label: "Registrations", icon: ClipboardList },
  { href: "/admin/profile", label: "Profile", icon: User },
];

const organizationAdminLinks = [
  { href: "/admin", label: "Overview", icon: LayoutDashboard },
  { href: "/admin/inbox", label: "Inbox", icon: Mail },
  { href: "/admin/memberships", label: "Memberships", icon: Users },
  { href: "/admin/bookings", label: "Registrations", icon: ClipboardList },
  { href: "/admin/profile", label: "Profile", icon: User },
];

interface SidebarProps {
  variant: "volunteer" | "admin";
  currentPath: string;
  navCounts?: Record<string, number>;
  adminKind?: "platform" | "organization";
}

export function Sidebar({
  variant,
  currentPath,
  navCounts = {},
  adminKind = "platform",
}: SidebarProps) {
  const links =
    variant === "admin"
      ? adminKind === "platform"
        ? platformAdminLinks
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
      (href !== "/dashboard" && href !== "/admin" && currentPath.startsWith(href))
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
          <div className="min-w-0">
            <Link
              href="/"
              className="flex min-w-0 items-center gap-2 text-lg font-bold text-emerald-800"
            >
              <Image
                src="/logo-no-bg.png"
                alt=""
                width={28}
                height={28}
                className="size-10 shrink-0 object-contain"
              />
              <span className="truncate">TimeToVolunteer</span>
            </Link>
            <p className="truncate text-xs font-medium text-slate-500">{label}</p>
          </div>
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
        <div className="rounded-lg bg-emerald-900 p-5 text-white shadow-lg shadow-emerald-950/20">
          <Link href="/" className="flex min-w-0 items-center gap-2 text-xl font-bold">
            <Image
              src="/logo-no-bg.png"
              alt=""
              width={32}
              height={32}
              className="size-10 shrink-0 object-contain"
            />
            <span className="truncate">TimeToVolunteer</span>
          </Link>
          <p className="mt-1 text-xs font-medium text-emerald-50/70">
            {label}
          </p>
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
