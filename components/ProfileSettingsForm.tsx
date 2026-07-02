"use client";

import { Camera, UserRound } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import type { Profile } from "@/types/database";

type Props = {
  profile: Profile | null;
  userEmail?: string | null;
};

export function ProfileSettingsForm({ profile, userEmail }: Props) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const initials = useMemo(() => {
    const source = profile?.name || userEmail || "Koalapply";
    return source
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("");
  }, [profile?.name, userEmail]);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage("");

    const formData = new FormData(event.currentTarget);
    const response = await fetch("/api/profile/settings", { method: "POST", body: formData });
    const payload = await response.json();

    setMessage(response.ok ? "Profile settings saved." : payload.error ?? "Unable to save profile settings.");
    setLoading(false);

    if (response.ok) {
      router.refresh();
    }
  }

  return (
    <form onSubmit={submit} className="max-w-full overflow-x-clip rounded-[1.8rem] border border-slate-100 bg-white p-5 shadow-sm md:p-7 xl:p-8">
      <section className="mb-7 flex min-w-0 flex-col gap-4 rounded-[1.5rem] bg-slate-50 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-4">
          <div className="relative flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-[#d4ccff] to-violet-100 text-xl font-semibold text-[#2200ff] shadow-sm">
            {avatarPreview || profile?.avatar_url ? (
              <img src={avatarPreview ?? profile?.avatar_url} alt="Profile picture preview" className="h-full w-full object-cover" />
            ) : initials ? (
              initials
            ) : (
              <UserRound className="h-8 w-8" />
            )}
          </div>
          <div className="min-w-0">
            <h2 className="text-lg font-semibold text-slate-900">Profile picture</h2>
            <p className="mt-1 text-sm leading-6 text-slate-600">
              Add a friendly photo for your Koalapply workspace.
            </p>
          </div>
        </div>

        <label className="inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-full bg-white px-5 py-3 text-sm font-semibold text-[#2200ff] shadow-sm transition hover:-translate-y-0.5 hover:bg-[#ece8ff]">
          <Camera className="h-4 w-4" />
          Upload photo
          <input
            name="avatar_file"
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0];
              setAvatarPreview(file ? URL.createObjectURL(file) : null);
            }}
          />
        </label>
      </section>

      <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
        <label className="space-y-2">
          <span className="label">Name</span>
          <input name="name" className="field" defaultValue={profile?.name ?? ""} />
        </label>
        <label className="space-y-2">
          <span className="label">Email</span>
          <input name="email" type="email" className="field" defaultValue={profile?.email ?? userEmail ?? ""} />
        </label>
        <label className="space-y-2">
          <span className="label">Phone</span>
          <input name="phone" className="field" defaultValue={profile?.phone ?? ""} />
        </label>
        <label className="space-y-2">
          <span className="label">Location</span>
          <input name="location" className="field" defaultValue={profile?.location ?? ""} />
        </label>
        <label className="space-y-2 md:col-span-2 2xl:col-span-1">
          <span className="label">LinkedIn URL</span>
          <input name="linkedin_url" type="url" className="field" defaultValue={profile?.linkedin_url ?? ""} />
        </label>
        <label className="space-y-2">
          <span className="label">Target job titles</span>
          <input name="target_job_titles" className="field" defaultValue={profile?.target_job_titles?.join(", ") ?? ""} />
        </label>
        <label className="space-y-2">
          <span className="label">Preferred industries</span>
          <input name="preferred_industries" className="field" defaultValue={profile?.preferred_industries?.join(", ") ?? ""} />
        </label>
        <label className="space-y-2">
          <span className="label">Salary range</span>
          <input name="salary_range" className="field" defaultValue={profile?.salary_range ?? ""} />
        </label>
        <label className="space-y-2">
          <span className="label">Preferred locations</span>
          <input name="preferred_locations" className="field" defaultValue={profile?.preferred_locations?.join(", ") ?? ""} />
        </label>
        <label className="space-y-2">
          <span className="label">Job search status</span>
          <select name="job_search_intent" className="field" defaultValue={profile?.job_search_intent ?? ""}>
            <option value="">Not set</option>
            <option value="just_starting">Just starting out</option>
            <option value="actively_hunting">Actively hunting</option>
            <option value="employed_browsing">Employed, just browsing</option>
            <option value="levelling_up">Looking to level up</option>
            <option value="career_tips_only">Not searching yet</option>
          </select>
        </label>
      </div>

      <div className="mt-6 flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center">
        <button className="btn-primary min-h-11 w-full sm:w-auto" disabled={loading} type="submit">
          {loading ? "Saving..." : "Save profile settings"}
        </button>
        {message ? <p className="min-w-0 text-sm text-slate-600">{message}</p> : null}
      </div>
    </form>
  );
}
