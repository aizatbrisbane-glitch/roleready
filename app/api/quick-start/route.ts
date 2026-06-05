import { NextResponse } from "next/server";
import { extractTextFromFile } from "@/lib/file-text";
import { fetchJobAdDetails, detectJobSource, isBlockedJobBoard } from "@/lib/job-ad";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const maxDuration = 60;

async function saveMasterDocument({
  bucket,
  table,
  textColumn,
  fileField,
  fallbackText,
  userId,
  formData,
  supabase
}: {
  bucket: string;
  table: "master_resumes" | "master_cover_letters";
  textColumn: "resume_text" | "cover_letter_text";
  fileField: string;
  fallbackText: string;
  userId: string;
  formData: FormData;
  supabase: NonNullable<Awaited<ReturnType<typeof createSupabaseServerClient>>>;
}) {
  const file = formData.get(fileField);

  if (!(file instanceof File) || file.size === 0) {
    return;
  }

  const extractedText = await extractTextFromFile(file);
  const documentText = extractedText || fallbackText;

  if (!documentText.trim()) {
    throw new Error(`I could not read ${file.name}. Try a DOCX, PDF, TXT, or MD file.`);
  }

  const storagePath = `${userId}/${Date.now()}-${file.name}`;
  const { error: uploadError } = await supabase.storage.from(bucket).upload(storagePath, await file.arrayBuffer(), {
    contentType: file.type || "application/octet-stream",
    upsert: true
  });

  if (uploadError) {
    throw new Error(uploadError.message);
  }

  const { error } = await supabase.from(table).insert({
    user_id: userId,
    file_name: file.name,
    storage_path: storagePath,
    [textColumn]: documentText
  });

  if (error) {
    throw new Error(error.message);
  }
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
    return NextResponse.json({ error: "Sign in once first, then Quick Apply will be simple." }, { status: 401 });
  }

  const formData = await request.formData();
  const jobUrl = String(formData.get("job_url") ?? "").trim();
  const fallbackDescription = String(formData.get("job_description_fallback") ?? "").trim();

  if (!jobUrl && !fallbackDescription) {
    return NextResponse.json({ error: "Paste a job ad link or the full job description first." }, { status: 400 });
  }

  try {
    await saveMasterDocument({
      bucket: "master-resumes",
      table: "master_resumes",
      textColumn: "resume_text",
      fileField: "resume_file",
      fallbackText: "",
      userId: user.id,
      formData,
      supabase
    });

    await saveMasterDocument({
      bucket: "master-cover-letters",
      table: "master_cover_letters",
      textColumn: "cover_letter_text",
      fileField: "cover_letter_file",
      fallbackText: "",
      userId: user.id,
      formData,
      supabase
    });

    let jobDetails;
    if (!jobUrl) {
      jobDetails = {
        title: "Job from pasted description",
        company: "Company from job ad",
        location: "",
        salary: "",
        description: fallbackDescription
      };
    } else {
      try {
        jobDetails = await fetchJobAdDetails(jobUrl);
        if (fallbackDescription && jobDetails.description.trim().length < 300) {
          jobDetails.description = fallbackDescription;
        }
      } catch (error) {
        if (!fallbackDescription) {
          throw new Error(
            isBlockedJobBoard(jobUrl)
              ? "This site blocked our request. Open the job page in Chrome, click the Job Assistant extension, then come back, or paste the full job description in the box below."
              : error instanceof Error
                ? error.message
                : "Could not read this job link."
          );
        }
        jobDetails = {
          title: "Job from pasted link",
          company: "Company from job ad",
          location: "",
          salary: "",
          description: fallbackDescription
        };
      }
    }

    if (!jobDetails.description.trim()) {
      return NextResponse.json({ error: "I could not find job ad text. Paste the ad into the box below." }, { status: 400 });
    }

    const { data: job, error: jobError } = await supabase
      .from("jobs")
      .insert({
        user_id: user.id,
        title: jobDetails.title,
        company: jobDetails.company,
        location: jobDetails.location,
        salary: jobDetails.salary,
        job_url: jobUrl,
        description: jobDetails.description,
        source: jobUrl ? detectJobSource(jobUrl) : "Manual"
      })
      .select("id")
      .single();

    if (jobError || !job) {
      throw new Error(jobError?.message ?? "Unable to create job.");
    }

    const { data: application, error: applicationError } = await supabase
      .from("applications")
      .insert({
        user_id: user.id,
        job_id: job.id,
        status: "New"
      })
      .select("id")
      .single();

    if (applicationError || !application) {
      throw new Error(applicationError?.message ?? "Unable to create application.");
    }

    return NextResponse.json({ applicationId: application.id });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to create application." }, { status: 400 });
  }
}
