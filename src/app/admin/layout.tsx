import { requireAdmin } from "@/lib/auth";
import { DashboardShell } from "@/components/layout/DashboardShell";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireAdmin();

  return <DashboardShell variant="admin">{children}</DashboardShell>;
}
