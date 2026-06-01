import { requireActiveVolunteer } from "@/lib/auth";
import { DashboardShell } from "@/components/layout/DashboardShell";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireActiveVolunteer();

  return <DashboardShell variant="volunteer">{children}</DashboardShell>;
}
