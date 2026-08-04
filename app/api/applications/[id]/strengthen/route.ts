import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import { getAccessState } from "@/lib/entitlements";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const maxDuration = 60;

type Props = { params: Promise<{ id: string }> };

const strengthenSchema = {
  type: "object",
  additionalProperties: false,
  required: ["tailoredResume", "coverLetter", "changedSnippet", "originalSnippet", "hasRelevantExperience"],
  properties: {
    tailoredResume: { type: ["string", "null"] },
    coverLetter: { type: ["string", "null"] },
    changedSnippet: {
      type: "string",
      description: "The single sentence or bullet point that was changed, as plain text with no markdown. Empty string if hasRelevantExperience is false.",
    },
    originalSnippet: {
      type: "string",
      description: "The original sentence or bullet point before modification, as plain text with no markdown. Empty string if hasRelevantExperience is false or if the keyword was added rather than modifying an existing line.",
    },
    hasRelevantExperience: {
      type: "boolean",
      description: "true if relevant experience was found and a draft was produced. false if no genuinely relevant experience exists — in that case set tailoredResume and coverLetter to null and snippets to empty strings.",
    },
  },
};

function extractActualChange(original: string | null, updated: string | null): string {
  if (!original || !updated) return "";
  const stripMd = (line: string) =>
    line.trim()
      .replace(/^#+\s+/, "")
      .replace(/^[-*]\s+/, "")
      .replace(/\*\*([^*]+)\*\*/g, "$1");
  const originalLines = new Set(original.split("\n").map(stripMd).filter(Boolean));
  const changedLines = updated.split("\n").map(stripMd).filter(l => l && !originalLines.has(l));
  return changedLines[0] ?? "";
}

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

function buildStyleRules(protectedKeywords: string[]) {
  return [
    "Read the ENTIRE document first. Identify every existing sentence and paragraph before making any change.",
    "CRITICAL — no duplication: Do NOT add any sentence, phrase, or idea that is already expressed anywhere else in the document, even if worded differently. The document must not repeat itself after your edit.",
    "Integrate the keyword by modifying an existing sentence that is already close to the topic — prefer a one-word or short-phrase addition over inserting a whole new sentence.",
    "Only add a brand-new sentence if the keyword concept is genuinely absent from the entire document. If you do add one, keep it to one sentence maximum and place it within an existing paragraph — never append a new standalone paragraph.",
    "Preserve all existing markdown formatting, structure, and document length. Do not lengthen the document.",
    "Never use em dashes or these words: dynamic, innovative, passionate, results-driven, detail-oriented, proven track record, leverage, utilize, spearhead, champion, delve, tapestry, transformative.",
    "Return the full updated document, not just the changed section.",
    "If target is 'resume', return tailoredResume and set coverLetter to null.",
    "If target is 'cover_letter', return coverLetter and set tailoredResume to null.",
    "If target is 'both', return both documents.",
    "Always populate changedSnippet with the single sentence or bullet point you inserted or modified, as plain readable text with no markdown symbols (no **, no -, no #).",
    "Always populate originalSnippet with the original sentence or bullet point you replaced, as plain readable text with no markdown symbols. Empty string if you added a new line rather than modifying an existing one.",
    ...(protectedKeywords.length > 0
      ? [`CRITICAL: The following keywords are already present in the document and must NOT be removed, replaced, or paraphrased away: ${protectedKeywords.map(k => `"${k}"`).join(", ")}. Find a different location or phrasing to add the new keyword without touching these.`]
      : []),
  ];
}

export async function POST(request: Request, { params }: Props) {
  const { id: appId } = await params;
  const url = new URL(request.url);
  const preview = url.searchParams.get("preview") === "true";

  const supabase = await createSupabaseServerClient();
  if (!supabase) return NextResponse.json({ error: "Not configured" }, { status: 500 });

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const access = await getAccessState(supabase, user.id);
  if (access.planType === "free") return NextResponse.json({ error: "Premium feature" }, { status: 402 });

  let keyword: string, evidence: string, target: "resume" | "cover_letter" | "both";
  let clientResume: string | null = null;
  let clientCover: string | null = null;
  try {
    const body = await request.json();
    keyword = String(body.keyword ?? "").trim();
    evidence = String(body.evidence ?? "").trim();
    target = body.target;
    // Client sends the current in-memory document so the AI works from the latest version,
    // which may include keywords accepted since the last DB save.
    if (body.currentTailoredResume) clientResume = String(body.currentTailoredResume);
    if (body.currentCoverLetter) clientCover = String(body.currentCoverLetter);
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  if (!keyword) return NextResponse.json({ error: "keyword is required" }, { status: 400 });
  if (!["resume", "cover_letter", "both"].includes(target))
    return NextResponse.json({ error: "target must be resume, cover_letter, or both" }, { status: 400 });

  const { data: application } = await supabase
    .from("applications")
    .select("*, jobs(*)")
    .eq("id", appId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!application) return NextResponse.json({ error: "Application not found" }, { status: 404 });

  const effectiveResume = clientResume ?? application.tailored_resume;
  const effectiveCover = clientCover ?? application.cover_letter;

  if (target !== "cover_letter" && !effectiveResume)
    return NextResponse.json({ error: "Generate your application first." }, { status: 400 });
  if (target !== "resume" && !effectiveCover)
    return NextResponse.json({ error: "Generate your application first." }, { status: 400 });

  // Auto mode: fetch master resume to use as evidence source
  let masterResumeText: string | null = null;
  if (!evidence) {
    const { data: masterResume } = await supabase
      .from("master_resumes")
      .select("resume_text")
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    masterResumeText = masterResume?.resume_text?.trim() || null;
    if (!masterResumeText) {
      return NextResponse.json({ error: "no_master_resume" }, { status: 400 });
    }
  }

  if (!process.env.ANTHROPIC_API_KEY)
    return NextResponse.json({ error: "AI not configured" }, { status: 500 });

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY, maxRetries: 0 });
  const model = process.env.ANTHROPIC_MODEL || "claude-sonnet-4-6";

  const sharedContext = {
    keyword,
    target,
    currentTailoredResume: target !== "cover_letter" ? effectiveResume : null,
    currentCoverLetter: target !== "resume" ? effectiveCover : null,
    jobTitle: application.jobs?.title ?? "",
    jobCompany: application.jobs?.company ?? "",
  };

  const protectedKeywords = ((application.strengthened_keywords as string[]) ?? []).filter(k => k !== keyword);
  const styleRules = buildStyleRules(protectedKeywords);

  const prompt = evidence
    ? JSON.stringify({
        task: "Weave the keyword into the specified document(s) using only the evidence the user provided.",
        ...sharedContext,
        userEvidence: evidence,
        rules: [
          "Use ONLY the evidence the user has provided — do not invent, embellish, or add details not in userEvidence.",
          "Prefer specific, concrete evidence (numbers, outcomes, scale, timeframes). If the evidence is vague or very brief, still weave it in but keep the language modest — do not inflate thin evidence into confident-sounding achievement claims the evidence doesn't support.",
          ...styleRules,
          "Set hasRelevantExperience to true.",
        ],
      })
    : JSON.stringify({
        task: "Search the master resume for experience relevant to the keyword. If found, weave it naturally into the specified document(s). If no genuinely relevant experience exists, signal not found.",
        ...sharedContext,
        masterResumeText,
        rules: [
          "Search masterResumeText thoroughly for any experience, skill, project, or achievement genuinely related to the keyword.",
          "If relevant experience is found: weave it naturally into the specified document(s). Set hasRelevantExperience to true. Populate changedSnippet and originalSnippet.",
          "If no genuinely relevant experience exists in the master resume: set hasRelevantExperience to false, set tailoredResume and coverLetter to null, set changedSnippet and originalSnippet to empty strings. Do NOT invent or imply experience that is not there.",
          "Prefer specific, concrete evidence from the master resume (numbers, outcomes, scale, timeframes). Do not inflate thin evidence into confident claims.",
          ...styleRules,
        ],
      });

  const system = evidence
    ? "You are a senior job application writer. Weave keywords into documents using only the evidence the user provides. Never invent experience, employers, dates, credentials, metrics, tools, or achievements beyond what the user explicitly states. Never duplicate content — read the full document first and only modify or add text that does not already exist."
    : "You are a careful senior job application writer. Search the candidate's master resume for genuine experience related to the keyword. If you find it, weave it naturally into their tailored document by modifying an existing sentence — never add content that duplicates or restates what is already in the document. If you do not find genuinely relevant experience, signal that clearly — never fabricate or imply experience that is not in the master resume.";

  let result: { tailoredResume: string | null; coverLetter: string | null; changedSnippet: string; originalSnippet: string; hasRelevantExperience: boolean };
  try {
    const response = await client.messages.create({
      model,
      max_tokens: 4000,
      system,
      tools: [
        {
          name: "update_documents",
          description: "Return the updated document(s) with the keyword naturally woven in, or signal no relevant experience found.",
          input_schema: strengthenSchema as Anthropic.Tool.InputSchema,
        },
      ],
      tool_choice: { type: "tool", name: "update_documents" },
      messages: [{ role: "user", content: prompt }],
    });

    const toolBlock = response.content.find((b) => b.type === "tool_use");
    if (!toolBlock || toolBlock.type !== "tool_use")
      return NextResponse.json({ error: "AI did not return a result" }, { status: 500 });

    result = toolBlock.input as { tailoredResume: string | null; coverLetter: string | null; changedSnippet: string; originalSnippet: string; hasRelevantExperience: boolean };
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "AI failed" }, { status: 500 });
  }

  const cleanedResume = result.hasRelevantExperience && result.tailoredResume && target !== "cover_letter" ? cleanDocument(result.tailoredResume) : null;
  const cleanedCover = result.hasRelevantExperience && result.coverLetter && target !== "resume" ? cleanDocument(result.coverLetter) : null;

  const actualChangedSnippet =
    (cleanedResume ? extractActualChange(effectiveResume, cleanedResume) : "") ||
    (cleanedCover ? extractActualChange(effectiveCover, cleanedCover) : "") ||
    (result.changedSnippet ?? "");

  if (!preview && result.hasRelevantExperience) {
    const currentStrengthened = (application.strengthened_keywords as string[]) ?? [];
    const currentSnippets = (application.strengthened_keyword_snippets as Record<string, string>) ?? {};
    const currentOriginals = (application.strengthened_keyword_originals as Record<string, string>) ?? {};
    await supabase.from("applications").update({
      ...(cleanedResume ? { tailored_resume: cleanedResume } : {}),
      ...(cleanedCover ? { cover_letter: cleanedCover } : {}),
      strengthened_keywords: [...new Set([...currentStrengthened, keyword])],
      strengthened_keyword_snippets: { ...currentSnippets, [keyword]: actualChangedSnippet },
      strengthened_keyword_originals: { ...currentOriginals, [keyword]: result.originalSnippet ?? "" },
    }).eq("id", appId).eq("user_id", user.id);
  }

  return NextResponse.json({
    ok: true,
    hasRelevantExperience: result.hasRelevantExperience,
    tailoredResume: cleanedResume,
    coverLetter: cleanedCover,
    changedSnippet: actualChangedSnippet,
    originalSnippet: result.originalSnippet ?? "",
  });
}
