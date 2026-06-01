import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/types/database";
import { isAdmin, isActiveVolunteer } from "@/lib/permissions";

export type AuthNavState =
  | { isSignedIn: false }
  | {
      isSignedIn: true;
      firstName: string;
      dashboardHref: string;
      dashboardLabel: string;
      role: Profile["role"];
      mustResetPassword: boolean;
    };

export async function getAuthNavState(): Promise<AuthNavState> {
  const user = await getCurrentUser();
  if (!user) {
    return { isSignedIn: false };
  }

  const profile = await getCurrentUserProfile();
  if (!profile) {
    return {
      isSignedIn: true,
      firstName: "there",
      dashboardHref: "/login",
      dashboardLabel: "Account",
      role: "volunteer",
      mustResetPassword: false,
    };
  }

  if (profile.must_reset_password) {
    return {
      isSignedIn: true,
      firstName: profile.first_name,
      dashboardHref: "/reset-password",
      dashboardLabel: "Set Password",
      role: profile.role,
      mustResetPassword: true,
    };
  }

  if (isAdmin(profile)) {
    return {
      isSignedIn: true,
      firstName: profile.first_name,
      dashboardHref: "/admin",
      dashboardLabel: "Organization Dashboard",
      role: profile.role,
      mustResetPassword: false,
    };
  }

  if (!isActiveVolunteer(profile)) {
    return {
      isSignedIn: true,
      firstName: profile.first_name,
      dashboardHref: "/login?error=inactive",
      dashboardLabel: "Account",
      role: profile.role,
      mustResetPassword: false,
    };
  }

  return {
    isSignedIn: true,
    firstName: profile.first_name,
    dashboardHref: "/dashboard",
    dashboardLabel: "My Dashboard",
    role: profile.role,
    mustResetPassword: false,
  };
}

export async function getCurrentUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

export async function getCurrentUserProfile(): Promise<Profile | null> {
  const user = await getCurrentUser();
  if (!user) return null;

  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  return data;
}

export async function requireAuth() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }
  return user;
}

export async function requireAdmin(): Promise<Profile> {
  const profile = await getCurrentUserProfile();
  if (!profile || !isAdmin(profile)) {
    redirect("/login");
  }
  if (profile.must_reset_password) {
    redirect("/reset-password");
  }
  return profile;
}

export async function requireActiveVolunteer(): Promise<Profile> {
  const profile = await getCurrentUserProfile();
  if (!profile) {
    redirect("/login");
  }
  if (!isActiveVolunteer(profile) && !isAdmin(profile)) {
    redirect("/login?error=inactive");
  }
  if (!isActiveVolunteer(profile)) {
    redirect("/admin");
  }
  if (profile.must_reset_password) {
    redirect("/reset-password");
  }
  return profile;
}
