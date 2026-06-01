"use client";

import { useTransition } from "react";
import { signOut } from "@/lib/actions";
import { Button } from "@/components/ui/button";

interface SignOutButtonProps {
  className?: string;
}

export function SignOutButton({ className }: SignOutButtonProps) {
  const [pending, startTransition] = useTransition();

  return (
    <Button
      variant="outline"
      size="sm"
      className={className}
      disabled={pending}
      onClick={() => startTransition(() => signOut())}
    >
      {pending ? "Signing out..." : "Sign Out"}
    </Button>
  );
}
