import { NextResponse } from "next/server";
import { createDocxBuffer, createPdfArrayBuffer } from "@/lib/documents";
import { slugifyFileName } from "@/lib/format";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { ApplicationWithJob } from "@/types/database";

type Props = {
  params: Promise<{ id: string }>;
};

export async function GET(request: Request, { params }: Props) {
  const { id } = await params;
  const url = new URL(request.url);
  const type = url.searchParams.get("type");
  const format = url.searchParams.get("format");
  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    return NextResponse.json({ error: "Supabase is not configured." }, { status: 500 });
  }

  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Sign in before exporting documents." }, { status: 401 });
  }

  if ((type !== "resume" && type !== "cover") || (format !== "docx" && format !== "pdf")) {
    return NextResponse.json({ error: "Invalid export request." }, { status: 400 });
  }

  const { data } = await supabase.from("applications").select("*, jobs(*)").eq("id", id).eq("user_id", user.id).maybeSingle();
  const application = data as ApplicationWithJob | null;

  if (!application || !application.jobs) {
    return NextResponse.json({ error: "Application not found." }, { status: 404 });
  }

  const content = type === "resume" ? application.tailored_resume : application.cover_letter;

  if (!content) {
    return NextResponse.json({ error: "Generate this application before exporting." }, { status: 400 });
  }

  const { data: profileData } = await supabase.from("profiles").select("name").eq("id", user.id).maybeSingle();
  const nameParts = (profileData?.name ?? "").trim().split(/\s+/);
  const firstName = nameParts[0] ?? "";
  const lastName = nameParts.slice(1).join(" ");
  const date = new Date().toISOString().slice(0, 10);

  const title = type === "resume" ? "Tailored Resume" : "Cover Letter";
  const docLabel = type === "resume" ? "resume" : "cover-letter";
  const PLACEHOLDER_COMPANY = "Company from job ad";
  const company = application.jobs.company === PLACEHOLDER_COMPANY ? "" : application.jobs.company;
  const fileNameParts = [firstName, lastName, application.jobs.title, company, date, docLabel].filter(Boolean);
  const baseName = slugifyFileName(fileNameParts.join("-"));
  const fileName = `${baseName}.${format}`;

  if (format === "docx") {
    const buffer = await createDocxBuffer(title, content);
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": `attachment; filename="${fileName}"`
      }
    });
  }

  const arrayBuffer = createPdfArrayBuffer(title, content);
  return new NextResponse(arrayBuffer, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${fileName}"`
    }
  });
}
