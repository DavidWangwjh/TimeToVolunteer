"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Camera, HeartHandshake, Mail, Pencil, Phone, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ProfileForm } from "@/components/profile/ProfileForm";
import type { Profile } from "@/types/database";

export function VolunteerProfilePanel({ profile, userMetadata }: { profile: Profile; userMetadata: Record<string, unknown> }) {
  const router = useRouter();
  const fileInput = useRef<HTMLInputElement>(null);
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [version, setVersion] = useState(0);
  const [photoFailed, setPhotoFailed] = useState(false);
  const hasPhoto = Boolean(userMetadata.volunteer_avatar_path);
  const initials = `${profile.first_name[0] ?? ""}${profile.last_name[0] ?? ""}`.toUpperCase();

  async function savePhoto(file?: File) {
    if (file && (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 3 * 1024 * 1024)) {
      toast.error("Choose a JPEG, PNG, or WebP photo up to 3 MB"); return;
    }
    setBusy(true);
    try {
      const form = new FormData();
      if (file) form.set("photo", file);
      const response = await fetch("/api/volunteer/avatar", { method: file ? "POST" : "DELETE", body: file ? form : undefined });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Unable to update photo");
      setPhotoFailed(false);
      setVersion((value) => value + 1);
      router.refresh();
      toast.success(file ? "Profile photo updated" : "Profile photo removed");
    } catch (error) { toast.error(error instanceof Error ? error.message : "Unable to update photo"); }
    finally { setBusy(false); if (fileInput.current) fileInput.current.value = ""; }
  }

  return (
    <section aria-label="Your profile" className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="relative h-32 overflow-hidden bg-gradient-to-br from-emerald-950 via-emerald-800 to-teal-600 sm:h-40">
        <div aria-hidden="true" className="absolute -right-12 -top-36 size-96 rounded-full border-[40px] border-white/10" />
        <div aria-hidden="true" className="absolute right-60 top-16 size-64 rounded-full border-[30px] border-white/5" />
        <p className="absolute right-6 top-6 flex items-center gap-2 text-xs font-semibold tracking-[0.16em] text-emerald-100"><HeartHandshake className="size-5" />TIME WELL GIVEN</p>
      </div>
      <div className="px-6 pb-7 sm:px-8 sm:pb-8">
        <div className="relative -mt-12 flex flex-wrap items-end justify-between gap-4 sm:-mt-14">
          <div className="relative">
            <div className="flex size-28 items-center justify-center overflow-hidden rounded-full border-[5px] border-white bg-emerald-100 text-3xl font-bold text-emerald-900 shadow-md sm:size-32">
              {hasPhoto && !photoFailed ? <Image key={version} src={`/api/volunteer/avatar?v=${version}`} width={128} height={128} unoptimized alt={`${profile.first_name} ${profile.last_name}`} className="size-full object-cover" onError={() => setPhotoFailed(true)} /> : <span aria-label="Profile initials">{initials}</span>}
            </div>
            <button type="button" aria-label={hasPhoto ? "Change profile photo" : "Add profile photo"} title={hasPhoto ? "Change profile photo" : "Add profile photo"} disabled={busy} onClick={() => fileInput.current?.click()} className="absolute bottom-1 right-0 flex size-9 items-center justify-center rounded-full border-2 border-white bg-emerald-800 text-white shadow-sm hover:bg-emerald-900 disabled:opacity-50"><Camera className="size-4" /></button>
            <input ref={fileInput} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" aria-label="Upload profile photo" onChange={(event) => { const file = event.target.files?.[0]; if (file) void savePhoto(file); }} />
          </div>
          <Button variant="outline" className="mb-1 rounded-full" onClick={() => setEditing(true)}><Pencil className="size-4" />Edit profile</Button>
        </div>
        <div className="mt-5 grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(220px,0.45fr)]">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-widest text-emerald-700">Volunteer</p>
            <h1 className="mt-1 break-words text-3xl font-bold tracking-tight text-slate-950">{profile.first_name} {profile.last_name}</h1>
            <h2 className="mt-6 text-sm font-semibold text-slate-900">About me</h2>
            <p className="mt-2 max-w-2xl whitespace-pre-wrap break-words text-sm leading-7 text-slate-600">{profile.volunteer_intro || "Share a little about yourself and the difference you’d like to make."}</p>
          </div>
          <div className="space-y-3 rounded-xl bg-slate-50 p-4 lg:self-start">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500">Contact details</h2>
            <p className="flex items-start gap-2 break-all text-sm text-slate-700"><Mail className="mt-0.5 size-4 shrink-0 text-emerald-700" />{profile.email}</p>
            {profile.phone && <p className="flex items-center gap-2 text-sm text-slate-700"><Phone className="size-4 shrink-0 text-emerald-700" />{profile.phone}</p>}
          </div>
        </div>
        <div className="mt-6 border-t border-slate-100 pt-5">
          <h2 className="mb-3 text-sm font-semibold text-slate-900">Causes I care about</h2>
          <div className="flex flex-wrap gap-2">{profile.volunteer_interests?.length ? profile.volunteer_interests.map((interest) => <span key={interest} className="rounded-full border border-emerald-100 bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-900">{interest}</span>) : <p className="text-sm text-slate-500">Add your interests in Edit profile.</p>}</div>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-slate-500">
          <span role="status">{busy ? "Updating photo…" : "Profile photo: JPEG, PNG, or WebP · Up to 3 MB"}</span>
          {hasPhoto && <button type="button" disabled={busy} onClick={() => void savePhoto()} className="inline-flex items-center gap-1 underline hover:text-slate-900 disabled:opacity-50"><X className="size-3" />Remove photo</button>}
        </div>
      </div>
      <Dialog open={editing} onOpenChange={setEditing}>
        <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-xl">
          <DialogHeader><DialogTitle>Edit your profile</DialogTitle><DialogDescription>Introduce yourself and tell organizations what matters to you.</DialogDescription></DialogHeader>
          <ProfileForm profile={profile} userMetadata={userMetadata} onSaved={() => { setEditing(false); router.refresh(); }} />
        </DialogContent>
      </Dialog>
    </section>
  );
}
