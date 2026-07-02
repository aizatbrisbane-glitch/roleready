import { NextResponse } from "next/server";
import { splitCsv } from "@/lib/format";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    return NextResponse.json({ error: "Supabase is not configured." }, { status: 500 });
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Sign in before saving your profile." }, { status: 401 });
  }

  const formData = await request.formData();
  const avatarFile = formData.get("avatar_file");
  const avatarUpdate: { avatar_url?: string; avatar_storage_path?: string } = {};

  if (avatarFile instanceof File && avatarFile.size > 0) {
    if (!avatarFile.type.startsWith("image/")) {
      return NextResponse.json({ error: "Please upload an image file for your profile picture." }, { status: 400 });
    }

    if (avatarFile.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: "Profile pictures must be smaller than 5MB." }, { status: 400 });
    }

    const extension = avatarFile.name.split(".").pop()?.toLowerCase() || "jpg";
    const storagePath = `${user.id}/${Date.now()}-profile.${extension}`;
    const { error: uploadError } = await supabase.storage.from("profile-images").upload(storagePath, await avatarFile.arrayBuffer(), {
      contentType: avatarFile.type || "image/jpeg",
      upsert: false,
    });

    if (uploadError) {
      return NextResponse.json({ error: uploadError.message }, { status: 400 });
    }

    const { data } = supabase.storage.from("profile-images").getPublicUrl(storagePath);
    avatarUpdate.avatar_url = data.publicUrl;
    avatarUpdate.avatar_storage_path = storagePath;
  }

  const profile = {
    id: user.id,
    name: String(formData.get("name") ?? ""),
    email: String(formData.get("email") ?? user.email ?? ""),
    phone: String(formData.get("phone") ?? ""),
    location: String(formData.get("location") ?? ""),
    linkedin_url: String(formData.get("linkedin_url") ?? ""),
    target_job_titles: splitCsv(formData.get("target_job_titles")),
    preferred_industries: splitCsv(formData.get("preferred_industries")),
    salary_range: String(formData.get("salary_range") ?? ""),
    preferred_locations: splitCsv(formData.get("preferred_locations")),
    job_search_intent: String(formData.get("job_search_intent") ?? ""),
    ...avatarUpdate,
  };

  const { error } = await supabase.from("profiles").upsert(profile);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}

export async function PATCH(request: Request) {
  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    return NextResponse.json({ error: "Supabase is not configured." }, { status: 500 });
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Sign in before saving your profile." }, { status: 401 });
  }

  const allowed = ["location", "name", "phone", "linkedin_url", "salary_range", "job_search_intent"] as const;
  type AllowedKey = (typeof allowed)[number];

  const body = await request.json().catch(() => ({})) as Record<string, unknown>;
  const patch: Partial<Record<AllowedKey, string>> & { id: string } = { id: user.id };

  for (const key of allowed) {
    if (typeof body[key] === "string") {
      patch[key] = body[key] as string;
    }
  }

  const { error } = await supabase.from("profiles").upsert(patch);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
