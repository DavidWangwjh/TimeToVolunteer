import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { getAuthNavState } from "@/lib/auth";
import { SignOutButton } from "@/components/layout/SignOutButton";

export async function Navbar() {
  const auth = await getAuthNavState();

  return (
    <header className="sticky top-0 z-50 border-b border-emerald-950/10 bg-white/90 backdrop-blur-sm">
      <div className="container mx-auto flex h-16 items-center justify-between gap-3 px-4 sm:h-20 lg:px-8">
        <Link
          href="/"
          className="flex min-w-0 items-center gap-2 text-xl font-bold leading-none text-emerald-800 sm:text-2xl"
        >
          <Image
            src="/logo-no-bg.png"
            alt=""
            width={32}
            height={32}
            className="size-12 shrink-0 object-contain"
            priority
          />
          <span className="truncate">TimeToVolunteer</span>
        </Link>
        <nav className="flex shrink-0 items-center gap-3 sm:gap-8">
          <Link
            href="/"
            className="hidden text-sm font-semibold text-slate-700 transition-colors hover:text-emerald-800 min-[440px]:inline"
          >
            Home
          </Link>

          {auth.isSignedIn ? (
            <>
              <Button
                asChild
                size="sm"
                className="h-9 bg-emerald-800 px-3 shadow-sm shadow-emerald-950/20 hover:bg-emerald-700 sm:h-10 sm:px-5"
              >
                <Link href={auth.dashboardHref}>{auth.dashboardLabel}</Link>
              </Button>
              <SignOutButton />
            </>
          ) : (
            <>
              <Link
                href="/apply"
                className="hidden text-sm font-semibold text-slate-700 transition-colors hover:text-emerald-800 sm:inline"
              >
                Organizations
              </Link>
              <Link
                href="/signup"
                className="text-sm font-semibold text-slate-700 transition-colors hover:text-emerald-800"
              >
                Sign Up
              </Link>
              <Button
                asChild
                size="sm"
                className="h-9 bg-emerald-800 px-3 shadow-sm shadow-emerald-950/20 hover:bg-emerald-700 sm:h-10 sm:px-5"
              >
                <Link href="/login">Log In</Link>
              </Button>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
