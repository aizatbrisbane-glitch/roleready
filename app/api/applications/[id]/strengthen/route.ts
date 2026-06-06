import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import { getAccessState } from "@/lib/entitlements";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const maxDuration = 60;

type Props = { params: Promise<{ id: string }> };

const strengthenSchema = {
  type: "object",
  additionalProperties: false,
  required: ["tailoredResume", "coverLetter", "changedSnippet"],
  properties: {
    tailoredResume: { type: ["string", "null"] },
    coverLetter: { type: ["string", "null"] },
    changedSnippet: {
      type: "string",
      description: "The single sentence or bullet point that was changed, as plain text with no markdown.",
    },
  },
};

function cleanDocument(text: string): string {
  return text
    .split("\n")
    .map((line) => line.trimEnd())
    .filter((line, i, arr) => {
      if (/^[-*_]{3,}\s*$/.test(line)) return false;
      if (line === "" && arr[i - 1] === "") return false;
      return true;
    })
    .join("\n")
    .trim();
}

export async function POST(request: Request, { params }: Props) {
  const { id: appId } = await params;
  const supabase = await createSupabaseServerClient();
  if (!supabase) return NextResponse.json({ error: "Not configured" }, { status: 500 });

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const access = await getAccessState(supabase, user.id);
  if (access.planType === "free") return NextResponse.json({ error: "Premium feature" }, { status: 402 });

  let keyword: string, evidence: string, target: "resume" | "cover_letter" | "both";
  try {
    const body = await request.json();
    keyword = String(body.keyword ?? "").trim();
    evidence = String(body.evidence ?? "").trim();
    target = body.target;
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  if (!keyword) return NextResponse.json({ error: "keyword is required" }, { status: 400 });
  if (!evidence) return NextResponse.json({ error: "evidence is required" }, { status: 400 });
  if (!["resume", "cover_letter", "both"].includes(target))
    return NextResponse.json({ error: "target must be resume, cover_letter, or both" }, { status: 400 });

  const { data: application } = await supabase
    .from("applications")
    .select("*, jobs(*)")
    .eq("id", appId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!application) return NextResponse.json({ error: "Application not found" }, { status: 404 });

  if (target !== "cover_letter" && !application.tailored_resume)
    return NextResponse.json({ error: "Generate your application first." }, { status: 400 });
  if (target !== "resume" && !application.cover_letter)
    return NextResponse.json({ error: "Generate your application first." }, { status: 400 });

  if (!process.env.ANTHROPIC_API_KEY)
    return NextResponse.json({ error: "AI not configured" }, { status: 500 });

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY, maxRetries: 0 });
  const model = process.env.ANTHROPIC_MODEL || "claude-sonnet-4-6";

  const prompt = JSON.stringify({
    task: "Weave the keyword into the specified document(s) using only the evidence the user provided.",
    keyword,
    userEvidence: evidence,
    target,
    rules: [
      "Use ONLY the evidence the user has provided — do not invent, embellish, or add details not in userEvidence.",
      "Integrate the keyword naturally into existing bullet points or paragraphs — do not awkwardly append a disconnected sentence.",
      "Preserve all existing markdown formatting, structure, and document length.",
      "Never use em dashes or these words: dynamic, innovative, passionate, results-driven, detail-oriented, proven track record, leverage, utilize, spearhead, champion, delve, tapestry, transformative.",
      "Return the full updated document, not just the changed section.",
      "If target is 'resume', return tailoredResume and set coverLetter to null.",
      "If target is 'cover_letter', return coverLetter and set tailoredResume to null.",
      "If target is 'both', return both documents.",
      "Always populate changedSnippet with the single sentence or bullet point you inserted or modified, as plain readable text with no markdown symbols (no **, no -, no #).",
    ],
    currentTailoredResume: target !== "cover_letter" ? application.tailored_resume : null,
    currentCoverLetter: target !== "resume" ? application.cover_letter : null,
    jobTitle: application.jobs?.title ?? "",
    jobCompany: application.jobs?.company ?? "",
  });

  let result: { tailoredResume: string | null; coverLetter: string | null; changedSnippet: string };
  try {
    const response = await client.messages.create({
      model,
      max_tokens: 4000,
      system:
        "You are a senior job application writer. Weave keywords into documents using only the evidence the user provides. Never invent experience, employers, dates, credentials, metrics, tools, or achievements beyond what the user explicitly states.",
      tools: [
        {
          name: "update_documents",
          description: "Return the updated document(s) with the keyword naturally woven in.",
          input_schema: strengthenSchema as Anthropic.Tool.InputSchema,
        },
      ],
      tool_choice: { type: "tool", name: "update_documents" },
      messages: [{ role: "user", content: prompt }],
    });

    const toolBlock = response.content.find((b) => b.type === "tool_use");
    if (!toolBlock || toolBlock.type !== "tool_use")
      return NextResponse.json({ error: "AI did not return a result" }, { status: 500 });

    result = toolBlock.input as { tailoredResume: string | null; coverLetter: string | null; changedSnippet: string };
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "AI failed" }, { status: 500 });
  }

  const patch: Record<string, unknown> = {};
  if (result.tailoredResume && target !== "cover_letter") patch.tailored_resume = cleanDocument(result.tailoredResume);
  if (result.coverLetter && target !== "resume") patch.cover_letter = cleanDocument(result.coverLetter);

  const currentStrengthened = (application.strengthened_keywords as string[]) ?? [];
  patch.strengthened_keywords = [...new Set([...currentStrengthened, keyword])];

  const currentSnippets = (application.strengthened_keyword_snippets as Record<string, string>) ?? {};
  patch.strengthened_keyword_snippets = { ...currentSnippets, [keyword]: result.changedSnippet ?? "" };

  await supabase.from("applications").update(patch).eq("id", appId).eq("user_id", user.id);

  return NextResponse.json({
    ok: true,
    tailoredResume: patch.tailored_resume ?? null,
    coverLetter: patch.cover_letter ?? null,
    changedSnippet: result.changedSnippet ?? "",
  });
}
