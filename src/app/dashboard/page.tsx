import { redirect } from "next/navigation";
import { getCurrentUserProfile } from "@/lib/auth";

export default async function DashboardRedirectPage() {
  const profile = await getCurrentUserProfile();

  if (profile?.role === "admin") {
    redirect("/dashboard/admin");
  }

  if (profile?.role === "organization") {
    redirect("/dashboard/organization");
  }

  redirect("/dashboard/volunteer");
}
