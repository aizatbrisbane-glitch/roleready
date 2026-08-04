import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import { getAccessState } from "@/lib/entitlements";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const maxDuration = 60;

type Props = { params: Promise<{ id: string }> };

// The AI now returns a PATCH (find → replace) instead of the full document.
// We apply the patch ourselves, making duplication structurally impossible.
const strengthenSchema = {
  type: "object",
  additionalProperties: false,
  required: ["hasRelevantExperience", "originalSnippet", "changedSnippet"],
  properties: {
    hasRelevantExperience: {
      type: "boolean",
      description: "true if relevant experience was found and a change was prepared. false if no genuinely relevant experience exists.",
    },
    originalSnippet: {
      type: "string",
      description: "The EXACT sentence, phrase, or bullet point from the document to replace — copied character-for-character, preserving all markdown (e.g. **bold**, - bullet prefix). Empty string only if adding a completely new sentence or if hasRelevantExperience is false.",
    },
    changedSnippet: {
      type: "string",
      description: "The replacement text in the same markdown format as originalSnippet. This is what replaces originalSnippet in the document. If originalSnippet is empty, this is the new sentence to insert after anchorText. Empty string if hasRelevantExperience is false.",
    },
    anchorText: {
      type: "string",
      description: "Only when originalSnippet is empty: the EXACT sentence (verbatim, including markdown) immediately before where changedSnippet should be inserted. Empty string if originalSnippet is provided or hasRelevantExperience is false.",
    },
  },
};

// Apply a find→replace patch to a document. Returns null if the original text cannot be located.
function applyPatch(doc: string, original: string, changed: string, anchor: string): string | null {
  const stripMd = (s: string) =>
    s.replace(/\*\*([^*]+)\*\*/g, "$1")
     .replace(/^#{1,6}\s+/, "")
     .replace(/^[-*•]\s+/, "")
     .trim();

  if (original) {
    // 1. Exact match (verbatim with markdown)
    if (doc.includes(original)) return doc.replace(original, changed);

    // 2. Case-insensitive match
    const lowerDoc = doc.toLowerCase();
    const idx = lowerDoc.indexOf(original.toLowerCase());
    if (idx !== -1) return doc.slice(0, idx) + changed + doc.slice(idx + original.length);

    // 3. Line-level markdown-stripped match
    const lines = doc.split("\n");
    const strippedTarget = stripMd(original).toLowerCase();
    for (let i = 0; i < lines.length; i++) {
      if (stripMd(lines[i]).toLowerCase() === strippedTarget) {
        lines[i] = changed;
        return lines.join("\n");
      }
    }

    return null; // could not locate
  }

  if (anchor) {
    if (doc.includes(anchor)) return doc.replace(anchor, anchor + " " + changed);
    const lowerDoc = doc.toLowerCase();
    const idx = lowerDoc.indexOf(anchor.toLowerCase());
    if (idx !== -1) return doc.slice(0, idx + anchor.length) + " " + changed + doc.slice(idx + anchor.length);
  }

  return null;
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
    "Read the ENTIRE document first before deciding where to make the change.",
    "Identify the single best existing sentence to modify — prefer adding a word or short phrase to an existing sentence over inserting a whole new sentence.",
    "Only add a brand-new sentence if the keyword concept is genuinely absent from the entire document. If you do add one, keep it to one sentence maximum.",
    "Never use em dashes or these words: dynamic, innovative, passionate, results-driven, detail-oriented, proven track record, leverage, utilize, spearhead, champion, delve, tapestry, transformative.",
    "Do NOT return the full document. Return only: originalSnippet (the exact verbatim sentence/bullet from the document to replace), changedSnippet (the replacement with the same markdown format), and anchorText (only if adding a new sentence).",
    "originalSnippet must be copied EXACTLY from the document — same characters, same markdown formatting.",
    "changedSnippet must use the same markdown format as originalSnippet (keep any **bold**, - prefix, etc.).",
    ...(protectedKeywords.length > 0
      ? [`CRITICAL: The following keywords are already present in the document and must NOT be removed or paraphrased away: ${protectedKeywords.map(k => `"${k}"`).join(", ")}. Work around them.`]
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
        task: "Find the best sentence in the document to modify, then return only the patch (originalSnippet → changedSnippet) that adds the keyword using the user's evidence.",
        ...sharedContext,
        userEvidence: evidence,
        rules: [
          "Use ONLY the evidence the user has provided — do not invent, embellish, or add details not in userEvidence.",
          "Prefer specific, concrete evidence (numbers, outcomes, scale, timeframes). If the evidence is vague, weave it in modestly.",
          ...styleRules,
          "Set hasRelevantExperience to true.",
        ],
      })
    : JSON.stringify({
        task: "Search the master resume for experience relevant to the keyword. If found, return only the patch (originalSnippet → changedSnippet) that weaves it into the document. If no genuinely relevant experience exists, signal not found.",
        ...sharedContext,
        masterResumeText,
        rules: [
          "Search masterResumeText thoroughly for any experience, skill, project, or achievement genuinely related to the keyword.",
          "If relevant experience is found: return the patch. Set hasRelevantExperience to true.",
          "If no genuinely relevant experience exists: set hasRelevantExperience to false, set all snippet fields to empty strings. Do NOT invent experience.",
          "Prefer specific, concrete evidence from the master resume (numbers, outcomes, scale, timeframes).",
          ...styleRules,
        ],
      });

  const system = evidence
    ? "You are a senior job application writer. Your job is to identify the single best sentence in the document to modify, and return a precise find→replace patch. Never write out the full document — return only originalSnippet and changedSnippet. Never invent experience beyond what the user provides."
    : "You are a careful senior job application writer. Search the master resume for genuine experience related to the keyword, identify the best sentence in the document to modify, and return a precise find→replace patch. Never write out the full document — return only originalSnippet and changedSnippet. Never fabricate experience.";

  let result: { hasRelevantExperience: boolean; originalSnippet: string; changedSnippet: string; anchorText?: string };
  try {
    const response = await client.messages.create({
      model,
      max_tokens: 1000,
      system,
      tools: [
        {
          name: "return_patch",
          description: "Return the find→replace patch that adds the keyword to the document, or signal no relevant experience found.",
          input_schema: strengthenSchema as Anthropic.Tool.InputSchema,
        },
      ],
      tool_choice: { type: "tool", name: "return_patch" },
      messages: [{ role: "user", content: prompt }],
    });

    const toolBlock = response.content.find((b) => b.type === "tool_use");
    if (!toolBlock || toolBlock.type !== "tool_use")
      return NextResponse.json({ error: "AI did not return a result" }, { status: 500 });

    result = toolBlock.input as { hasRelevantExperience: boolean; originalSnippet: string; changedSnippet: string; anchorText?: string };
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "AI failed" }, { status: 500 });
  }

  if (!result.hasRelevantExperience) {
    return NextResponse.json({ ok: true, hasRelevantExperience: false, tailoredResume: null, coverLetter: null, changedSnippet: "", originalSnippet: "" });
  }

  const original = result.originalSnippet ?? "";
  const changed = result.changedSnippet ?? "";
  const anchor = result.anchorText ?? "";

  // Apply the patch to produce the updated document(s)
  const patchedResume = target !== "cover_letter" && effectiveResume
    ? applyPatch(effectiveResume, original, changed, anchor)
    : null;
  const patchedCover = target !== "resume" && effectiveCover
    ? applyPatch(effectiveCover, original, changed, anchor)
    : null;

  // If the patch could not be applied, the AI quoted a snippet that doesn't exist in the doc
  if (target !== "cover_letter" && effectiveResume && !patchedResume)
    return NextResponse.json({ error: "Could not locate the change in the document. Please try again." }, { status: 500 });
  if (target !== "resume" && effectiveCover && !patchedCover)
    return NextResponse.json({ error: "Could not locate the change in the document. Please try again." }, { status: 500 });

  const cleanedResume = patchedResume ? cleanDocument(patchedResume) : null;
  const cleanedCover = patchedCover ? cleanDocument(patchedCover) : null;

  if (!preview) {
    const currentStrengthened = (application.strengthened_keywords as string[]) ?? [];
    const currentSnippets = (application.strengthened_keyword_snippets as Record<string, string>) ?? {};
    const currentOriginals = (application.strengthened_keyword_originals as Record<string, string>) ?? {};
    await supabase.from("applications").update({
      ...(cleanedResume ? { tailored_resume: cleanedResume } : {}),
      ...(cleanedCover ? { cover_letter: cleanedCover } : {}),
      strengthened_keywords: [...new Set([...currentStrengthened, keyword])],
      strengthened_keyword_snippets: { ...currentSnippets, [keyword]: changed },
      strengthened_keyword_originals: { ...currentOriginals, [keyword]: original },
    }).eq("id", appId).eq("user_id", user.id);
  }

  return NextResponse.json({
    ok: true,
    hasRelevantExperience: true,
    tailoredResume: cleanedResume,
    coverLetter: cleanedCover,
    changedSnippet: changed,
    originalSnippet: original,
  });
}
