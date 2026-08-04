"use client";

import React from "react";

function splitHighlight(text: string, keyword: string): (string | React.ReactElement)[] {
  const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const regex = new RegExp(`(${escaped})`, "gi");
  const parts = text.split(regex);
  let matched = false;
  return parts.map((part, i) => {
    if (regex.test(part)) {
      matched = !matched;
      return (
        <mark key={i} className="kw-highlight rounded bg-yellow-200 px-0.5 not-italic">
          {part}
        </mark>
      );
    }
    return part;
  });
}

function applyInlineHighlights(text: string, terms: string[], className: string): (string | React.ReactElement)[] {
  const sorted = [...terms].sort((a, b) => b.length - a.length).filter(Boolean);
  if (!sorted.length) return [text];
  const pattern = sorted.map(s => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|");
  const splitRegex = new RegExp(`(${pattern})`, "gi");
  const matchRegex = new RegExp(`^(?:${pattern})$`, "i");
  return text.split(splitRegex).map((part, i) =>
    matchRegex.test(part)
      ? <mark key={i} className={className}>{part}</mark>
      : part
  );
}

function applySnippetHighlights(text: string, snippets: string[]): (string | React.ReactElement)[] {
  return applyInlineHighlights(text, snippets, "rounded bg-green-100 px-0.5 not-italic");
}

function applyPresentHighlights(text: string, terms: string[]): (string | React.ReactElement)[] {
  return applyInlineHighlights(text, terms, "rounded bg-blue-100 px-0.5 not-italic");
}

function InlineMd({ text, highlightKeyword, highlightSnippets, highlightTerms, highlightPresentTerms }: { text: string; highlightKeyword?: string | null; highlightSnippets?: string[]; highlightTerms?: string[]; highlightPresentTerms?: string[] }) {
  const boldParts = text.split(/(\*\*[^*]+\*\*)/g);

  // Snippets are plain text but the document may have **bold** markers splitting the string.
  // Check against the full line with bold markers stripped so we don't miss cross-bold matches.
  const plainText = text.replace(/\*\*([^*]+)\*\*/g, "$1");
  // highlightSnippets uses whole-line detection; highlightTerms is always inline-only
  const lineMatchesSnippet = !highlightTerms?.length && highlightSnippets?.some(s => s && plainText.includes(s));

  const renderedParts = boldParts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      const inner = part.slice(2, -2);
      let boldContent: (string | React.ReactElement)[] = highlightTerms?.length
        ? applySnippetHighlights(inner, highlightTerms)
        : [inner];
      if (highlightPresentTerms?.length)
        boldContent = boldContent.flatMap(n => typeof n === "string" ? applyPresentHighlights(n, highlightPresentTerms) : [n]);
      if (highlightKeyword) boldContent = boldContent.flatMap(n => typeof n === "string" ? splitHighlight(n, highlightKeyword) : [n]);
      return <strong key={i} className="font-semibold text-[#14213d]">{boldContent}</strong>;
    }
    if (!part) return null;

    // Apply inline highlights: terms (keyword names, always inline) or snippets (only when no line-level match)
    const inlineHighlights = highlightTerms?.length
      ? highlightTerms
      : (!lineMatchesSnippet && highlightSnippets?.length ? highlightSnippets : null);

    let withHighlights: (string | React.ReactElement)[] =
      inlineHighlights ? applySnippetHighlights(part, inlineHighlights) : [part];

    if (highlightPresentTerms?.length)
      withHighlights = withHighlights.flatMap(n => typeof n === "string" ? applyPresentHighlights(n, highlightPresentTerms) : [n]);

    const final = highlightKeyword
      ? withHighlights.flatMap(node => (typeof node === "string" ? splitHighlight(node, highlightKeyword) : [node]))
      : withHighlights;

    return <React.Fragment key={i}>{final.map((n, j) => typeof n === "string" ? <React.Fragment key={j}>{n}</React.Fragment> : n)}</React.Fragment>;
  });

  return lineMatchesSnippet
    ? <mark className="rounded bg-green-100 not-italic">{renderedParts}</mark>
    : <>{renderedParts}</>;
}

type ParsedLine =
  | { type: "h1"; text: string }
  | { type: "h2"; text: string }
  | { type: "h3"; text: string }
  | { type: "bullet"; text: string }
  | { type: "text"; text: string }
  | { type: "blank" };

function parseLines(content: string): ParsedLine[] {
  return content
    .replace(/\r\n/g, "\n")
    .split("\n")
    .map((raw): ParsedLine => {
      const line = raw.trim();
      if (line.startsWith("# ")) return { type: "h1", text: line.slice(2) };
      if (line.startsWith("## ")) return { type: "h2", text: line.slice(3) };
      if (line.startsWith("### ")) return { type: "h3", text: line.slice(4) };
      if (line.startsWith("- ")) return { type: "bullet", text: line.slice(2) };
      if (line === "") return { type: "blank" };
      return { type: "text", text: line };
    });
}

export function ResumeRenderer({ content, highlightKeyword, highlightSnippets, highlightTerms, highlightPresentTerms }: { content: string; highlightKeyword?: string | null; highlightSnippets?: string[]; highlightTerms?: string[]; highlightPresentTerms?: string[] }) {
  const lines = parseLines(content);
  const nodes: React.ReactNode[] = [];
  let bullets: string[] = [];
  let k = 0;

  const flushBullets = () => {
    if (bullets.length === 0) return;
    nodes.push(
      <ul key={k++} className="mt-1.5 space-y-1.5">
        {bullets.map((b, i) => (
          <li key={i} className="flex items-start gap-2.5 text-sm leading-6 text-slate-600">
            <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-slate-400" />
            <span><InlineMd text={b} highlightKeyword={highlightKeyword} highlightSnippets={highlightSnippets} highlightTerms={highlightTerms} highlightPresentTerms={highlightPresentTerms} /></span>
          </li>
        ))}
      </ul>
    );
    bullets = [];
  };

  for (const line of lines) {
    if (line.type === "bullet") {
      bullets.push(line.text);
      continue;
    }
    flushBullets();

    if (line.type === "h1") {
      nodes.push(
        <h1 key={k++} className="font-serif text-2xl font-bold tracking-tight text-[#1B3A6B]">
          <InlineMd text={line.text} highlightKeyword={highlightKeyword} highlightSnippets={highlightSnippets} highlightTerms={highlightTerms} highlightPresentTerms={highlightPresentTerms} />
        </h1>
      );
    } else if (line.type === "h2") {
      nodes.push(
        <h2 key={k++} className="mb-2 mt-6 border-b border-[#B0BEC5] pb-1 text-xs font-bold uppercase tracking-[0.15em] text-[#1B3A6B]">
          {line.text}
        </h2>
      );
    } else if (line.type === "h3") {
      nodes.push(
        <h3 key={k++} className="mt-3 text-sm font-semibold text-[#14213d]">
          <InlineMd text={line.text} highlightKeyword={highlightKeyword} highlightSnippets={highlightSnippets} highlightTerms={highlightTerms} highlightPresentTerms={highlightPresentTerms} />
        </h3>
      );
    } else if (line.type === "text") {
      nodes.push(
        <p key={k++} className="text-xs leading-5 text-slate-500">
          <InlineMd text={line.text} highlightKeyword={highlightKeyword} highlightSnippets={highlightSnippets} highlightTerms={highlightTerms} highlightPresentTerms={highlightPresentTerms} />
        </p>
      );
    }
    // blank lines intentionally skipped — spacing handled by margins
  }
  flushBullets();

  return (
    <div className="bg-slate-100 px-4 py-6 md:px-8 md:py-8">
      <div className="mx-auto w-full max-w-[794px] min-h-[1123px] bg-white px-10 py-10 shadow-[0_2px_16px_rgba(0,0,0,0.10)] md:px-16 md:py-14">
        {nodes}
      </div>
    </div>
  );
}

export function CoverLetterRenderer({ content, highlightKeyword, highlightSnippets, highlightTerms, highlightPresentTerms }: { content: string; highlightKeyword?: string | null; highlightSnippets?: string[]; highlightTerms?: string[]; highlightPresentTerms?: string[] }) {
  const lines = parseLines(content);
  const nodes: React.ReactNode[] = [];
  let k = 0;
  let pendingBlanks = 0;
  let inHeader = false;
  let headerDone = false;

  for (const line of lines) {
    if (line.type === "blank") {
      pendingBlanks++;
      if (inHeader) {
        inHeader = false;
        headerDone = true;
      }
      continue;
    }

    if (line.type === "h1") {
      inHeader = true;
      headerDone = false;
      nodes.push(
        <h1 key={k++} className="font-serif text-2xl font-bold tracking-tight text-[#1B3A6B]">
          <InlineMd text={line.text} highlightKeyword={highlightKeyword} highlightSnippets={highlightSnippets} highlightTerms={highlightTerms} highlightPresentTerms={highlightPresentTerms} />
        </h1>
      );
    } else if (line.type === "h2") {
      inHeader = false;
      headerDone = true;
      nodes.push(
        <h2 key={k++} className="mb-2 mt-6 border-b border-[#B0BEC5] pb-1 text-xs font-bold uppercase tracking-[0.15em] text-[#1B3A6B]">
          {line.text}
        </h2>
      );
    } else if (line.type === "text" || line.type === "h3") {
      if (inHeader && !headerDone) {
        nodes.push(
          <p key={k++} className="mt-0.5 text-xs leading-5 text-slate-500">
            <InlineMd text={line.text} highlightKeyword={highlightKeyword} highlightSnippets={highlightSnippets} highlightTerms={highlightTerms} highlightPresentTerms={highlightPresentTerms} />
          </p>
        );
      } else {
        const mt = pendingBlanks > 0 ? "mt-4" : "mt-1";
        nodes.push(
          <p key={k++} className={`${mt} text-sm leading-7 text-slate-700`}>
            <InlineMd text={line.text} highlightKeyword={highlightKeyword} highlightSnippets={highlightSnippets} highlightTerms={highlightTerms} highlightPresentTerms={highlightPresentTerms} />
          </p>
        );
      }
    }
    pendingBlanks = 0;
  }

  return (
    <div className="bg-slate-100 px-4 py-6 md:px-8 md:py-8">
      <div className="mx-auto w-full max-w-[794px] min-h-[1123px] bg-white px-10 py-10 shadow-[0_2px_16px_rgba(0,0,0,0.10)] md:px-16 md:py-14">
        {nodes}
      </div>
    </div>
  );
}
