import { createClient } from "@/lib/supabase/server";
import { ApplicationTable } from "@/components/applications/ApplicationTable";
import { AdminStatusNavigation } from "@/components/admin/AdminStatusNavigation";

interface Props {
  searchParams: Promise<{ status?: string }>;
}

export default async function ApplicationsPage({ searchParams }: Props) {
  const { status } = await searchParams;
  const supabase = await createClient();

  const query = supabase
    .from("organization_applications")
    .select("*")
    .order("created_at", { ascending: false });

  const { data: allRows } = await query;
  const counts = (allRows ?? []).reduce<Record<string, number>>((counts, row) => { counts.all += 1; counts[row.status] = (counts[row.status] ?? 0) + 1; return counts; }, { all: 0 });
  const applications = (allRows ?? []).filter(row => !status || status === "all" || row.status === status);

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold">Organization applications</h1>
      <AdminStatusNavigation basePath="/dashboard/admin/applications" currentStatus={status ?? "all"} statuses={["pending", "contacted", "accepted", "rejected"]} counts={counts} />
      <div className="mt-4">
        <ApplicationTable applications={applications ?? []} />
      </div>
    </div>
  );
}
