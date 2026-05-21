import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";
import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const maxDuration = 60;
import type { ApplicationWithJob, MasterCoverLetter, MasterResume, Profile } from "@/types/database";

type Props = {
  params: Promise<{ id: string }>;
};

type GeneratedApplication = {
  matchScore: number;
  matchExplanation: string;
  missingKeywords: string[];
  tailoredResume: string;
  coverLetter: string;
};

const responseSchema = {
  type: "object",
  additionalProperties: false,
  required: ["matchScore", "matchExplanation", "missingKeywords", "tailoredResume", "coverLetter"],
  properties: {
    matchScore: { type: "integer", description: "Integer from 0 to 100." },
    matchExplanation: { type: "string" },
    missingKeywords: {
      type: "array",
      items: { type: "string" }
    },
    tailoredResume: { type: "string" },
    coverLetter: { type: "string" }
  }
};

const systemInstructions =
  "You are a careful senior job application writer. Never invent experience, employers, dates, credentials, metrics, tools, or achievements. Only rewrite, reorder, condense, and emphasize information that appears in the master resume. Use the master cover letter only for tone, structure, and already stated facts. Make the resume ATS-friendly, concrete, and targeted to the job ad. Avoid generic claims unless the resume proves them. Clearly identify missing requirements.";

const generationTimeoutMs = 90000;

async function withTimeout<T>(promise: Promise<T>, label: string) {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_resolve, reject) => {
    timeoutId = setTimeout(() => reject(new Error(`${label} timed out after 90 seconds. Try the other AI provider or shorten the job ad text.`)), generationTimeoutMs);
  });

  try {
    return await Promise.race([promise, timeout]);
  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  }
}

function buildPrompt({
  profile,
  masterResume,
  masterCoverLetter,
  job
}: {
  profile: Profile | null;
  masterResume: MasterResume;
  masterCoverLetter: MasterCoverLetter | null;
  job: NonNullable<ApplicationWithJob["jobs"]>;
}) {
  return JSON.stringify({
    task: "Create a highly specific tailored application package.",
    outputRules: [
      "Tailored resume must use concrete wording from the master resume.",
      "Put the most job-relevant skills and achievements near the top.",
      "Do not add skills, tools, certifications, companies, achievements, or metrics unless present in the master resume.",
      "If a job requirement is missing or weak, list it in missingKeywords instead of pretending it exists.",
      "Cover letter must sound natural, specific to this company and role, and be under 350 words.",
      "Avoid generic phrases like 'I am excited to apply' unless followed by a specific reason from the job ad.",
      "Match explanation must cite evidence from the resume and the job ad.",
      "Format tailoredResume in markdown: use # for the candidate name, ## for every section heading (e.g. ## EXPERIENCE), ### for each job title / employer / date line, - for every bullet point, and **text** for bold emphasis. Do NOT use ---, <hr>, horizontal rules, extra blank lines between bullets, or any other visual separators. One blank line between sections only. Do NOT use emoji or markdown links — write contact details as plain text only (e.g. 'Phone: 0422 178 121 | Email: user@example.com | LinkedIn: linkedin.com/in/username').",
      "Format coverLetter in markdown: use # for the candidate name header, then plain paragraphs separated by a single blank line. No bullet points, no section headings, no horizontal rules."
    ],
    profile,
    masterResumeText: masterResume.resume_text,
    masterCoverLetterText: masterCoverLetter?.cover_letter_text ?? "",
    job
  });
}

async function generateWithOpenAI(prompt: string) {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is not configured.");
  }

  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const selectedModel = process.env.OPENAI_MODEL || "gpt-5.4-mini";

  const response = await withTimeout(
    client.responses.create({
      model: selectedModel,
      instructions: systemInstructions,
      input: [
        {
          role: "user",
          content: [{ type: "input_text", text: prompt }]
        }
      ],
      text: {
        format: {
          type: "json_schema",
          name: "generated_application",
          schema: responseSchema,
          strict: true
        }
      }
    } as OpenAI.Responses.ResponseCreateParamsNonStreaming),
    "OpenAI generation"
  );

  return JSON.parse(response.output_text) as GeneratedApplication;
}

async function generateWithAnthropic(prompt: string) {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error("ANTHROPIC_API_KEY is not configured.");
  }

  const client = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
    maxRetries: 0
  });
  const selectedModel = process.env.ANTHROPIC_MODEL || "claude-sonnet-4-6";

  const response = await withTimeout(
    client.messages.create({
      model: selectedModel,
      max_tokens: 4000,
      system: systemInstructions,
      tools: [
        {
          name: "generate_application",
          description: "Generate a tailored job application package including match analysis and documents.",
          input_schema: responseSchema as Anthropic.Tool.InputSchema
        }
      ],
      tool_choice: { type: "tool", name: "generate_application" },
      messages: [
        {
          role: "user",
          content: prompt
        }
      ]
    }),
    "Anthropic generation"
  );

  const toolUseBlock = response.content.find((block) => block.type === "tool_use");

  if (!toolUseBlock || toolUseBlock.type !== "tool_use") {
    throw new Error("Anthropic did not return a structured tool result.");
  }

  return toolUseBlock.input as GeneratedApplication;
}

function cleanDocument(text: string): string {
  return text
    .split("\n")
    .map((line) => line.trimEnd())
    .filter((line, i, arr) => {
      // Remove horizontal rule lines (---, ***, ___)
      if (/^[-*_]{3,}\s*$/.test(line)) return false;
      // Collapse consecutive blank lines into one
      if (line === "" && arr[i - 1] === "") return false;
      return true;
    })
    .join("\n")
    .trim();
}

function normalizeProvider(value: unknown) {
  return value === "anthropic" || value === "openai" ? value : null;
}

export async function POST(request: Request, { params }: Props) {
  const { id } = await params;
  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    return NextResponse.json({ error: "Supabase is not configured." }, { status: 500 });
  }

  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Sign in before preparing applications." }, { status: 401 });
  }

  let requestedProvider: "anthropic" | "openai" | null = null;

  try {
    const body = await request.json();
    requestedProvider = normalizeProvider(body?.provider);
  } catch {
    requestedProvider = null;
  }

  const [{ data: application }, { data: profile }, { data: masterResume }, { data: masterCoverLetter }] = await Promise.all([
    supabase.from("applications").select("*, jobs(*)").eq("id", id).eq("user_id", user.id).maybeSingle(),
    supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
    supabase.from("master_resumes").select("*").eq("user_id", user.id).order("updated_at", { ascending: false }).limit(1).maybeSingle(),
    supabase.from("master_cover_letters").select("*").eq("user_id", user.id).order("updated_at", { ascending: false }).limit(1).maybeSingle()
  ]);

  const app = application as ApplicationWithJob | null;

  if (!app || !app.jobs) {
    return NextResponse.json({ error: "Application not found." }, { status: 404 });
  }

  if (!masterResume || !(masterResume as MasterResume).resume_text.trim()) {
    return NextResponse.json({ error: "Add your master resume text before preparing an application." }, { status: 400 });
  }

  const prompt = buildPrompt({
    profile: profile as Profile | null,
    masterResume: masterResume as MasterResume,
    masterCoverLetter: masterCoverLetter as MasterCoverLetter | null,
    job: app.jobs
  });

  let generated: GeneratedApplication;

  try {
    const provider = requestedProvider ?? normalizeProvider(process.env.AI_PROVIDER) ?? "openai";
    generated = provider === "anthropic" ? await generateWithAnthropic(prompt) : await generateWithOpenAI(prompt);
    generated.matchScore = Math.max(0, Math.min(100, Math.round(generated.matchScore)));
    generated.tailoredResume = cleanDocument(generated.tailoredResume);
    generated.coverLetter = cleanDocument(generated.coverLetter);
    const { error: updateError } = await supabase
      .from("applications")
      .update({
        status: "Ready",
        match_score: generated.matchScore,
        match_explanation: generated.matchExplanation,
        missing_keywords: generated.missingKeywords,
        tailored_resume: generated.tailoredResume,
        cover_letter: generated.coverLetter,
        generated_by: provider,
        generated_at: new Date().toISOString()
      })
      .eq("id", app.id)
      .eq("user_id", user.id);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 400 });
    }

    await supabase.from("generated_documents").insert([
      {
        user_id: user.id,
        application_id: app.id,
        document_type: "tailored_resume",
        format: "markdown",
        generated_by: provider,
        content: generated.tailoredResume
      },
      {
        user_id: user.id,
        application_id: app.id,
        document_type: "cover_letter",
        format: "markdown",
        generated_by: provider,
        content: generated.coverLetter
      }
    ]);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "AI generation failed." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
