import { NextResponse } from "next/server";
import { extractTextFromFile } from "@/lib/file-text";
import { splitCsv } from "@/lib/format";
import { createSupabaseServerClient } from "@/lib/supabase/server";

function unreadableFileMessage(fileName: string) {
  return `I could not read text from ${fileName}. If this is a scanned PDF, upload a DOCX file or paste the text into the box below.`;
}

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    return NextResponse.json({ error: "Supabase is not configured." }, { status: 500 });
  }

  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Sign in before saving your profile." }, { status: 401 });
  }

  const formData = await request.formData();
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
    preferred_locations: splitCsv(formData.get("preferred_locations"))
  };

  const { error: profileError } = await supabase.from("profiles").upsert(profile);

  if (profileError) {
    return NextResponse.json({ error: profileError.message }, { status: 400 });
  }

  let resumeText = String(formData.get("resume_text") ?? "");
  const file = formData.get("resume_file");
  let fileName: string | null = null;
  let storagePath: string | null = null;

  if (file instanceof File && file.size > 0) {
    fileName = file.name;
    try {
      resumeText = (await extractTextFromFile(file)) || resumeText;
    } catch {
      return NextResponse.json({ error: unreadableFileMessage(file.name) }, { status: 400 });
    }

    if (!resumeText.trim()) {
      return NextResponse.json({ error: unreadableFileMessage(file.name) }, { status: 400 });
    }

    storagePath = `${user.id}/${Date.now()}-${file.name}`;
    const { error: uploadError } = await supabase.storage.from("master-resumes").upload(storagePath, await file.arrayBuffer(), {
      contentType: file.type || "application/octet-stream",
      upsert: true
    });

    if (uploadError) {
      return NextResponse.json({ error: uploadError.message }, { status: 400 });
    }
  }

  if (resumeText.trim() || fileName) {
    const { error: resumeError } = await supabase.from("master_resumes").insert({
      user_id: user.id,
      file_name: fileName,
      storage_path: storagePath,
      resume_text: resumeText
    });

    if (resumeError) {
      return NextResponse.json({ error: resumeError.message }, { status: 400 });
    }
  }

  let coverLetterText = String(formData.get("cover_letter_text") ?? "");
  const coverLetterFile = formData.get("cover_letter_file");
  let coverLetterFileName: string | null = null;
  let coverLetterStoragePath: string | null = null;

  if (coverLetterFile instanceof File && coverLetterFile.size > 0) {
    coverLetterFileName = coverLetterFile.name;
    try {
      coverLetterText = (await extractTextFromFile(coverLetterFile)) || coverLetterText;
    } catch {
      return NextResponse.json({ error: unreadableFileMessage(coverLetterFile.name) }, { status: 400 });
    }

    if (!coverLetterText.trim()) {
      return NextResponse.json({ error: unreadableFileMessage(coverLetterFile.name) }, { status: 400 });
    }

    coverLetterStoragePath = `${user.id}/${Date.now()}-${coverLetterFile.name}`;
    const { error: uploadError } = await supabase.storage.from("master-cover-letters").upload(coverLetterStoragePath, await coverLetterFile.arrayBuffer(), {
      contentType: coverLetterFile.type || "application/octet-stream",
      upsert: true
    });

    if (uploadError) {
      return NextResponse.json({ error: uploadError.message }, { status: 400 });
    }
  }

  if (coverLetterText.trim() || coverLetterFileName) {
    const { error: coverLetterError } = await supabase.from("master_cover_letters").insert({
      user_id: user.id,
      file_name: coverLetterFileName,
      storage_path: coverLetterStoragePath,
      cover_letter_text: coverLetterText
    });

    if (coverLetterError) {
      return NextResponse.json({ error: coverLetterError.message }, { status: 400 });
    }
  }

  return NextResponse.json({ ok: true });
}
