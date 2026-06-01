import Link from "next/link";
import { cn } from "@/lib/utils";
import {
  Calendar,
  ClipboardList,
  User,
  LayoutDashboard,
  Users,
  FileText,
  Briefcase,
  CalendarDays,
} from "lucide-react";
import { SignOutButton } from "@/components/layout/SignOutButton";

const volunteerLinks = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/dashboard/calendar", label: "Calendar", icon: Calendar },
  { href: "/dashboard/bookings", label: "My Bookings", icon: ClipboardList },
  { href: "/dashboard/profile", label: "Profile", icon: User },
];

const adminLinks = [
  { href: "/admin", label: "Overview", icon: LayoutDashboard },
  { href: "/admin/applications", label: "Applications", icon: FileText },
  { href: "/admin/volunteers", label: "Volunteers", icon: Users },
  { href: "/admin/opportunities", label: "Opportunities", icon: Briefcase },
  { href: "/admin/bookings", label: "Bookings", icon: ClipboardList },
  { href: "/admin/calendar", label: "Calendar", icon: CalendarDays },
];

interface SidebarProps {
  variant: "volunteer" | "admin";
  currentPath: string;
}

export function Sidebar({ variant, currentPath }: SidebarProps) {
  const links = variant === "admin" ? adminLinks : volunteerLinks;
  const label = variant === "admin" ? "Program ops" : "Volunteer hub";

  function isActive(href: string) {
    return (
      currentPath === href ||
      (href !== "/dashboard" && href !== "/admin" && currentPath.startsWith(href))
    );
  }

  return (
    <>
      <div className="sticky top-0 z-40 border-b border-emerald-950/10 bg-white/90 backdrop-blur lg:hidden">
        <div className="flex items-center justify-between gap-3 px-4 py-3">
          <div className="min-w-0">
            <Link href="/" className="block truncate text-lg font-bold text-emerald-800">
              TimeToVolunteer
            </Link>
            <p className="truncate text-xs font-medium text-slate-500">{label}</p>
          </div>
          <SignOutButton />
        </div>
        <nav className="flex gap-2 overflow-x-auto px-4 pb-3">
          {links.map(({ href, label: itemLabel, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={cn(
                "inline-flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold transition-colors",
                isActive(href)
                  ? "bg-emerald-800 text-white shadow-sm shadow-emerald-950/20"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-950"
              )}
            >
              <Icon className="size-4" />
              {itemLabel}
            </Link>
          ))}
        </nav>
      </div>

      <aside className="fixed inset-y-0 left-0 z-40 hidden w-72 border-r border-emerald-950/10 bg-white/85 p-4 shadow-xl shadow-slate-950/5 backdrop-blur lg:flex lg:flex-col">
        <div className="rounded-lg bg-emerald-900 p-5 text-white shadow-lg shadow-emerald-950/20">
          <Link href="/" className="text-xl font-bold">
            TimeToVolunteer
          </Link>
        </div>

        <nav className="mt-5 flex-1 space-y-1">
          {links.map(({ href, label: itemLabel, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={cn(
                "group flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-semibold transition-colors",
                isActive(href)
                  ? "bg-emerald-50 text-emerald-900 ring-1 ring-emerald-200"
                  : "text-slate-500 hover:bg-slate-100 hover:text-slate-950"
              )}
            >
              <span
                className={cn(
                  "flex size-8 items-center justify-center rounded-lg transition-colors",
                  isActive(href)
                    ? "bg-emerald-800 text-white"
                    : "bg-slate-100 text-slate-500 group-hover:bg-white group-hover:text-slate-800"
                )}
              >
                <Icon className="size-4" />
              </span>
              {itemLabel}
            </Link>
          ))}
        </nav>
        <div className="border-t border-slate-200 pt-4">
          <SignOutButton className="w-full justify-center" />
        </div>
      </aside>
    </>
  );
}
