import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/layout/PageHeader";
import { ApplicationTable } from "@/components/applications/ApplicationTable";
import { ApplicationFilters } from "@/components/applications/ApplicationFilters";

interface Props {
  searchParams: Promise<{ status?: string }>;
}

export default async function ApplicationsPage({ searchParams }: Props) {
  const { status } = await searchParams;
  const supabase = await createClient();

  let query = supabase
    .from("volunteer_applications")
    .select("*")
    .order("created_at", { ascending: false });

  if (status && status !== "all") {
    query = query.eq("status", status);
  }

  const { data: applications } = await query;

  return (
    <div>
      <PageHeader
        title="Volunteer Applications"
        description="Review and manage volunteer applications."
      />
      <ApplicationFilters currentStatus={status ?? "all"} />
      <div className="mt-4">
        <ApplicationTable applications={applications ?? []} />
      </div>
    </div>
  );
}
