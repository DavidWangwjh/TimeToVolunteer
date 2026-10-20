import { getVolunteerDashboardData } from "@/lib/volunteer-dashboard";
import { MyOpportunities } from "@/components/dashboard/MyOpportunities";

export default async function MyOpportunitiesPage() {
  const { bookings, approvedCounts } = await getVolunteerDashboardData();
  return <MyOpportunities bookings={bookings} approvedCounts={approvedCounts} initialNow={new Date().toISOString()} />;
}
