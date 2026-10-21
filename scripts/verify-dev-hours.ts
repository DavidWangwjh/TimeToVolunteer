import { loadEnvConfig } from "@next/env";
import { createClient } from "@supabase/supabase-js";
import { DEV_SUPABASE_PROJECT_REF } from "../src/lib/dev-login-accounts";
import { getVolunteerHours, getVolunteerRank } from "../src/lib/volunteer-ranks";

loadEnvConfig(process.cwd());
async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  if (process.env.APP_ENV !== "development" || new URL(url).hostname !== `${DEV_SUPABASE_PROJECT_REF}.supabase.co`) throw new Error("Dev project required");
  const db = createClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false, autoRefreshToken: false } });
  for (const [name, expected] of [["ava", 2], ["ben", 50], ["maya", 100], ["jordan", 250], ["riley", 500]] as const) {
    const { data: profile, error: profileError } = await db.from("profiles").select("id").eq("email", `${name}.volunteer@timetovolunteer.test`).single();
    if (profileError) throw profileError;
    const { data, error } = await db.from("bookings").select("status, checked_in_at, volunteer_opportunities!inner(*)").eq("volunteer_id", profile.id);
    if (error) throw error;
    const rows = (data ?? []).map(row => ({ ...row, opportunity: Array.isArray(row.volunteer_opportunities) ? row.volunteer_opportunities[0] : row.volunteer_opportunities }));
    const credited = rows.filter(row => getVolunteerHours([row]) > 0);
    const hours = getVolunteerHours(rows);
    if (hours !== expected) throw new Error(`${name}: expected ${expected} hours, found ${hours}`);
    console.log(`${name}: ${credited.length} attended past sessions = ${hours} hours (${getVolunteerRank(hours)})`);
  }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
