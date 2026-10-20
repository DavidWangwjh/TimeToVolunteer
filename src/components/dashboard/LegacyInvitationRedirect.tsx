"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

// Existing inbox messages store this older dashboard anchor.
export function LegacyInvitationRedirect() {
  const router = useRouter();
  useEffect(() => {
    const navigate = () => { if (window.location.hash === "#invitations") router.replace("/dashboard/volunteer/opportunities#invitations"); };
    navigate();
    window.addEventListener("hashchange", navigate);
    return () => window.removeEventListener("hashchange", navigate);
  }, [router]);
  return null;
}
