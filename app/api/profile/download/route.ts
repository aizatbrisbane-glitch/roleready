import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type");

  const supabase = await createSupabaseServerClient();
  if (!supabase) return NextResponse.json({ error: "Not configured." }, { status: 500 });

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  if (type === "resume") {
    const { data } = await supabase
      .from("master_resumes")
      .select("storage_path, file_name, resume_text")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!data) return NextResponse.json({ error: "No resume found." }, { status: 404 });

    if (data.storage_path) {
      const { data: signed } = await supabase.storage
        .from("master-resumes")
        .createSignedUrl(data.storage_path, 120);
      if (signed?.signedUrl) return NextResponse.redirect(signed.signedUrl);
    }

    // Fall back: export the text content as a .txt file
    return new NextResponse(data.resume_text ?? "", {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Content-Disposition": `attachment; filename="${data.file_name ?? "master-resume.txt"}"`,
      },
    });
  }

  if (type === "cover") {
    const { data } = await supabase
      .from("master_cover_letters")
      .select("storage_path, file_name, cover_letter_text")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!data) return NextResponse.json({ error: "No cover letter found." }, { status: 404 });

    if (data.storage_path) {
      const { data: signed } = await supabase.storage
        .from("master-cover-letters")
        .createSignedUrl(data.storage_path, 120);
      if (signed?.signedUrl) return NextResponse.redirect(signed.signedUrl);
    }

    // Fall back: export the text content as a .txt file
    return new NextResponse(data.cover_letter_text ?? "", {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Content-Disposition": `attachment; filename="${data.file_name ?? "master-cover-letter.txt"}"`,
      },
    });
  }

  return NextResponse.json({ error: "Invalid type. Use ?type=resume or ?type=cover" }, { status: 400 });
}
