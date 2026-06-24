"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { signIn } from "@/lib/actions";
import { loginSchema } from "@/lib/validators";

interface QuickLoginAccount {
  label: string;
  email: string;
  password: string;
}

interface QuickLoginGroup {
  role: string;
  accounts: QuickLoginAccount[];
}

interface LoginFormProps {
  quickLoginGroups?: QuickLoginGroup[];
}

export function LoginForm({ quickLoginGroups = [] }: LoginFormProps) {
  const searchParams = useSearchParams();
  const errorParam = searchParams.get("error");
  const redirectTo = searchParams.get("redirect");
  const [quickLoginEmail, setQuickLoginEmail] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<{ email: string; password: string }>({
    resolver: zodResolver(loginSchema),
  });

  async function onSubmit(data: { email: string; password: string }) {
    const result = await signIn(data.email, data.password, redirectTo);
    if (result?.error) {
      toast.error(result.error);
    }
  }

  async function handleQuickLogin(account: QuickLoginAccount) {
    setQuickLoginEmail(account.email);
    const result = await signIn(account.email, account.password, redirectTo);
    if (result?.error) {
      toast.error(result.error);
      setQuickLoginEmail(null);
    }
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle>Log In</CardTitle>
      </CardHeader>
      <CardContent>
        {errorParam === "inactive" && (
          <div className="mb-4 rounded-lg bg-yellow-50 border border-yellow-200 p-3 text-sm text-yellow-800">
            Your account is not active yet. Please contact an administrator.
          </div>
        )}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" {...register("email")} />
            {errors.email && (
              <p className="text-sm text-destructive">{errors.email.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input id="password" type="password" {...register("password")} />
            {errors.password && (
              <p className="text-sm text-destructive">{errors.password.message}</p>
            )}
          </div>
          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? "Signing in..." : "Sign In"}
          </Button>
        </form>
        <p className="mt-3 text-center text-sm">
          <Link href="/forgot-password" className="text-emerald-700 hover:underline">
            Forgot password?
          </Link>
        </p>
        <p className="mt-4 text-center text-sm text-muted-foreground">
          Not a volunteer yet?{" "}
          <Link href="/signup" className="text-emerald-700 hover:underline">
            Create an account
          </Link>
        </p>
        <p className="mt-2 text-center text-sm text-muted-foreground">
          Creating an organization?{" "}
          <Link href="/apply" className="text-emerald-700 hover:underline">
            Apply here
          </Link>
        </p>

        {quickLoginGroups.length > 0 && (
          <div className="mt-6 border-t border-slate-200 pt-5">
            <div className="mb-3">
              <p className="text-sm font-semibold text-slate-950">
                Dev quick login
              </p>
              <p className="mt-1 text-xs leading-5 text-slate-500">
                Seeded local accounts only. Hidden outside development.
              </p>
            </div>

            <div className="space-y-4">
              {quickLoginGroups.map((group) => (
                <div key={group.role} className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    {group.role}
                  </p>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {group.accounts.map((account) => (
                      <Button
                        key={account.email}
                        type="button"
                        variant="outline"
                        size="sm"
                        className="justify-start overflow-hidden"
                        disabled={Boolean(quickLoginEmail)}
                        onClick={() => handleQuickLogin(account)}
                      >
                        <span className="truncate">
                          {quickLoginEmail === account.email
                            ? "Signing in..."
                            : account.label}
                        </span>
                      </Button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
