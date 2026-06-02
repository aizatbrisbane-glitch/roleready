import { NextResponse } from "next/server";
import { extractTextFromFile } from "@/lib/file-text";
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
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Sign in before saving your documents." }, { status: 401 });
  }

  const formData = await request.formData();

  let resumeText = String(formData.get("resume_text") ?? "");
  const resumeFile = formData.get("resume_file");
  let resumeFileName: string | null = null;
  let resumeStoragePath: string | null = null;

  if (resumeFile instanceof File && resumeFile.size > 0) {
    resumeFileName = resumeFile.name;
    try {
      resumeText = (await extractTextFromFile(resumeFile)) || resumeText;
    } catch {
      return NextResponse.json({ error: unreadableFileMessage(resumeFile.name) }, { status: 400 });
    }

    if (!resumeText.trim()) {
      return NextResponse.json({ error: unreadableFileMessage(resumeFile.name) }, { status: 400 });
    }

    resumeStoragePath = `${user.id}/${Date.now()}-${resumeFile.name}`;
    const { error: uploadError } = await supabase.storage.from("master-resumes").upload(resumeStoragePath, await resumeFile.arrayBuffer(), {
      contentType: resumeFile.type || "application/octet-stream",
      upsert: true,
    });

    if (uploadError) {
      return NextResponse.json({ error: uploadError.message }, { status: 400 });
    }
  }

  if (resumeText.trim() || resumeFileName) {
    const { error: resumeError } = await supabase.from("master_resumes").insert({
      user_id: user.id,
      file_name: resumeFileName,
      storage_path: resumeStoragePath,
      resume_text: resumeText,
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
      upsert: true,
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
      cover_letter_text: coverLetterText,
    });

    if (coverLetterError) {
      return NextResponse.json({ error: coverLetterError.message }, { status: 400 });
    }
  }

  return NextResponse.json({ ok: true });
}
