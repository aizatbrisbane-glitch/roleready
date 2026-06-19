import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { ApplicationWithJob, InterviewQuestion } from "@/types/database";

export const maxDuration = 120;

type Props = {
  params: Promise<{ id: string }>;
};

const responseSchema = {
  type: "object",
  additionalProperties: false,
  required: ["questions"],
  properties: {
    questions: {
      type: "array",
      minItems: 4,
      maxItems: 5,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["question", "star"],
        properties: {
          question: { type: "string" },
          star: {
            type: "object",
            additionalProperties: false,
            required: ["situation", "task", "action", "result"],
            properties: {
              situation: { type: "string", description: "2-4 sentences setting the scene from the candidate's real experience." },
              task: { type: "string", description: "2-3 sentences describing the candidate's specific responsibility or goal." },
              action: { type: "string", description: "3-5 sentences describing exactly what the candidate did — concrete steps." },
              result: { type: "string", description: "2-3 sentences describing the measurable or qualitative outcome." },
            },
          },
        },
      },
    },
  },
} as const;

const generationTimeoutMs = 110000;

function withTimeout<T>(promise: Promise<T>, label: string): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_resolve, reject) => {
    timeoutId = setTimeout(
      () => reject(new Error(`${label} timed out. Try again.`)),
      generationTimeoutMs
    );
  });
  return Promise.race([promise, timeout]).finally(() => {
    if (timeoutId) clearTimeout(timeoutId);
  });
}

async function generateInterviewPrep(
  resume: string,
  jobDescription: string,
  extraContext?: string | null
): Promise<InterviewQuestion[]> {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error("ANTHROPIC_API_KEY is not configured.");
  }

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY, maxRetries: 0 });
  const model = process.env.ANTHROPIC_MODEL || "claude-sonnet-4-6";

  const prompt = JSON.stringify({
    task: "Generate interview questions with STAR answers for this job application.",
    instructions: [
      "Generate 4 to 5 interview questions likely to be asked for this specific role.",
      "Include a mix of: behavioral questions ('Tell me about a time...'), role-specific competency questions, and situational questions.",
      "For each question draft a STAR answer using experience, projects, skills, and achievements from the candidate's resume AND any additional context provided.",
      "Never invent employers, tools, metrics, credentials, or experiences not present in the resume or additional context.",
      "Each STAR section should be 2-4 sentences. Be as specific and concrete as possible — use real names, numbers, timelines, and outcomes from the source material.",
      "Write all STAR answers in first person as if the candidate is speaking.",
      "Situation: set the context (where, when, what was happening).",
      "Task: explain the candidate's specific responsibility or goal in that situation.",
      "Action: describe the concrete steps the candidate personally took.",
      "Result: describe the outcome — measurable where the source material supports it, otherwise qualitative.",
      ...(extraContext ? ["The candidate has provided additional context below — prioritise this detail when drafting STAR answers as it contains specifics not captured in the resume."] : []),
    ],
    candidateResume: resume,
    ...(extraContext ? { additionalContext: extraContext } : {}),
    jobDescription,
  });

  const response = await withTimeout(
    client.messages.create({
      model,
      max_tokens: 4000,
      system:
        "You are an expert interview coach. Generate realistic interview questions tailored to the role, then draft STAR answers drawn exclusively from the candidate's actual resume — never invent anything.",
      tools: [
        {
          name: "generate_interview_prep",
          description: "Generate interview questions with STAR answers.",
          input_schema: responseSchema as unknown as Anthropic.Tool.InputSchema,
        },
      ],
      tool_choice: { type: "tool", name: "generate_interview_prep" },
      messages: [{ role: "user", content: prompt }],
    }),
    "Interview prep generation"
  );

  const toolUseBlock = response.content.find((b) => b.type === "tool_use");
  if (!toolUseBlock || toolUseBlock.type !== "tool_use") {
    throw new Error("Anthropic did not return a structured tool result.");
  }

  const result = toolUseBlock.input as { questions: InterviewQuestion[] };
  return result.questions;
}

export async function POST(request: Request, { params }: Props) {
  const { id } = await params;
  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    return NextResponse.json({ error: "Supabase is not configured." }, { status: 500 });
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Sign in to generate interview prep." }, { status: 401 });
  }

  let extraContext: string | null = null;
  try {
    const body = await request.json();
    if (typeof body?.context === "string" && body.context.trim()) {
      extraContext = body.context.trim();
    }
  } catch { /* no body is fine */ }

  const [{ data: application }, { data: masterResume }] = await Promise.all([
    supabase.from("applications").select("*, jobs(*)").eq("id", id).eq("user_id", user.id).maybeSingle(),
    supabase
      .from("master_resumes")
      .select("resume_text")
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  const app = application as (ApplicationWithJob & { interview_questions?: InterviewQuestion[] | null }) | null;

  if (!app || !app.jobs) {
    return NextResponse.json({ error: "Application not found." }, { status: 404 });
  }

  const jobDescription = String(app.jobs.description ?? "").trim();
  if (jobDescription.length < 80) {
    return NextResponse.json(
      { error: "Job description is too short. Paste the full job ad first." },
      { status: 400 }
    );
  }

  const resume = (app.tailored_resume ?? masterResume?.resume_text ?? "").trim();
  if (!resume) {
    return NextResponse.json(
      { error: "Add your master resume before generating interview prep." },
      { status: 400 }
    );
  }

  let questions: InterviewQuestion[];
  try {
    questions = await generateInterviewPrep(resume, jobDescription, extraContext);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "AI generation failed." },
      { status: 500 }
    );
  }

  const { error: updateError } = await supabase
    .from("applications")
    .update({ interview_questions: questions })
    .eq("id", app.id)
    .eq("user_id", user.id);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true, questions });
}
