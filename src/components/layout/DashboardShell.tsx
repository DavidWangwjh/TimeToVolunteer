"use client";

import { usePathname } from "next/navigation";
import { Sidebar } from "@/components/layout/Sidebar";

export function DashboardShell({
  children,
  variant,
}: {
  children: React.ReactNode;
  variant: "volunteer" | "admin";
}) {
  const pathname = usePathname();
  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#f8fafc_0%,#eef7f2_42%,#f8fafc_100%)]">
      <Sidebar variant={variant} currentPath={pathname} />
      <main className="min-h-screen px-4 py-6 sm:px-6 lg:ml-72 lg:px-8 lg:py-8">
        <div className="mx-auto max-w-7xl">{children}</div>
      </main>
    </div>
  );
}
