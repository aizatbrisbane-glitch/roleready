"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";

export type Props = {
  content: string;
  onChange: (val: string) => void;
  onSave: (content: string) => Promise<void>;
  onCancel: () => void;
  saving: boolean;
  saveMessage?: string;
  PreviewComponent?: React.ComponentType<{ content: string }>;
};

// ── markdown → HTML ──────────────────────────────────────────────────────────

function esc(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function inlineMd(text: string) {
  return esc(text).replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
}

function mdToHtml(md: string): string {
  const lines = md.replace(/\r\n/g, "\n").split("\n");
  const out: string[] = [];
  let inUl = false;
  const closeUl = () => { if (inUl) { out.push("</ul>"); inUl = false; } };

  for (const raw of lines) {
    const line = raw.trim();
    if      (line.startsWith("# "))  { closeUl(); out.push(`<h1>${esc(line.slice(2))}</h1>`); }
    else if (line.startsWith("## ")) { closeUl(); out.push(`<h2>${esc(line.slice(3))}</h2>`); }
    else if (line.startsWith("### ")){ closeUl(); out.push(`<h3>${esc(line.slice(4))}</h3>`); }
    else if (line.startsWith("- "))  { if (!inUl) { out.push("<ul>"); inUl = true; } out.push(`<li>${inlineMd(line.slice(2))}</li>`); }
    else if (line === "")            { closeUl(); }
    else                             { closeUl(); out.push(`<p>${inlineMd(line)}</p>`); }
  }
  closeUl();
  return out.join("");
}

// ── DOM → markdown ────────────────────────────────────────────────────────────

function inlineToMd(node: Node): string {
  if (node.nodeType === Node.TEXT_NODE) return node.textContent ?? "";
  const el = node as HTMLElement;
  const tag = el.tagName?.toLowerCase();
  const inner = Array.from(el.childNodes).map(inlineToMd).join("");
  if (tag === "strong" || tag === "b") return `**${inner}**`;
  if (tag === "br") return "";
  return inner;
}

function domToMd(root: HTMLElement): string {
  const lines: string[] = [];

  function walk(node: Node) {
    if (node.nodeType !== Node.ELEMENT_NODE) return;
    const el = node as HTMLElement;
    const tag = el.tagName.toLowerCase();

    if (tag === "h1") {
      lines.push(`# ${el.innerText.trim()}`);
    } else if (tag === "h2") {
      lines.push(`## ${el.innerText.trim()}`);
    } else if (tag === "h3") {
      lines.push(`### ${el.innerText.trim()}`);
    } else if (tag === "ul" || tag === "ol") {
      for (const child of Array.from(el.children)) {
        if (child.tagName.toLowerCase() === "li") {
          const text = Array.from(child.childNodes).map(inlineToMd).join("").trim();
          if (text) lines.push(`- ${text}`);
        }
      }
    } else if (tag === "li") {
      // handled by parent ul/ol
    } else if (tag === "p") {
      const text = Array.from(el.childNodes).map(inlineToMd).join("").trim();
      if (text) lines.push(text);
    } else if (tag === "div") {
      const text = Array.from(el.childNodes).map(inlineToMd).join("").trim();
      if (text) lines.push(text);
      else lines.push("");
    } else if (tag === "br") {
      // skip
    } else {
      for (const child of el.childNodes) walk(child);
    }
  }

  for (const child of root.childNodes) walk(child);
  return lines.join("\n").replace(/\n{3,}/g, "\n\n").trim();
}

// ── Component ─────────────────────────────────────────────────────────────────

export function DocumentEditor({ content, onChange, onSave, onCancel, saving, saveMessage, PreviewComponent }: Props) {
  const editorRef = useRef<HTMLDivElement>(null);
  const lastSyncRef = useRef(content);
  const [showPreview, setShowPreview] = useState(false);

  useEffect(() => {
    if (editorRef.current) {
      editorRef.current.innerHTML = mdToHtml(content);
      lastSyncRef.current = content;
    }
  }, []);

  useEffect(() => {
    if (content !== lastSyncRef.current && editorRef.current) {
      editorRef.current.innerHTML = mdToHtml(content);
      lastSyncRef.current = content;
    }
  }, [content]);

  function readMd() {
    return editorRef.current ? domToMd(editorRef.current) : content;
  }

  function handleInput() {
    const md = readMd();
    lastSyncRef.current = md;
    onChange(md);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    if (e.key !== "Enter") return;
    const sel = window.getSelection();
    if (!sel?.rangeCount) return;
    const anchor = sel.anchorNode;
    const block = (anchor?.nodeType === Node.TEXT_NODE ? anchor.parentElement : anchor as Element)
      ?.closest("h1,h2,h3");
    if (!block) return;
    e.preventDefault();
    const p = document.createElement("p");
    p.innerHTML = "<br>";
    block.after(p);
    const range = document.createRange();
    range.setStart(p, 0);
    range.collapse(true);
    sel.removeAllRanges();
    sel.addRange(range);
    handleInput();
  }

  function execCmd(cmd: string, value?: string) {
    editorRef.current?.focus();
    document.execCommand(cmd, false, value ?? undefined);
    handleInput();
  }

  const TOOLBAR = [
    { key: "H1", label: "H1", title: "Heading 1 — name / page title",        fn: () => execCmd("formatBlock", "H1") },
    { key: "H2", label: "H2", title: "Heading 2 — section (Experience…)",     fn: () => execCmd("formatBlock", "H2") },
    { key: "H3", label: "H3", title: "Heading 3 — role or sub-heading",       fn: () => execCmd("formatBlock", "H3") },
    { key: "P",  label: "¶",  title: "Normal text",                            fn: () => execCmd("formatBlock", "P")  },
    { key: "UL", label: "•",  title: "Bullet point",                           fn: () => execCmd("insertUnorderedList") },
    { key: "B",  label: "B",  title: "Bold — select text first, then click",  fn: () => execCmd("bold"), bold: true },
  ];

  async function handleSave() {
    const md = readMd();
    onChange(md);
    await onSave(md);
  }

  return (
    <div>
      {/* Frozen toolbar — sits outside the scrollable document area */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 px-5 py-3">
        <div className="flex items-center gap-0.5 rounded-lg border border-slate-200 bg-slate-50 p-0.5">
          {TOOLBAR.map(({ key, label, title, fn, bold }) => (
            <button
              key={key}
              type="button"
              title={title}
              onMouseDown={(e) => { e.preventDefault(); fn(); }}
              className={`flex h-7 min-w-[28px] items-center justify-center rounded px-2 text-sm text-slate-600 transition hover:bg-white hover:shadow-sm ${bold ? "font-bold" : "font-semibold"}`}
            >
              {label}
            </button>
          ))}
        </div>

        <button type="button" onClick={handleSave} disabled={saving}
          className="inline-flex items-center gap-1.5 rounded-full bg-[#2200ff] px-4 py-1.5 text-sm font-semibold text-white transition hover:bg-[#1a00cc] disabled:opacity-60">
          {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
          {saving ? "Saving…" : "Save"}
        </button>
        <button type="button" onClick={onCancel} disabled={saving}
          className="inline-flex items-center rounded-full border border-slate-200 bg-white px-4 py-1.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60">
          Cancel
        </button>

        {PreviewComponent && (
          <button type="button" onClick={() => setShowPreview(p => !p)}
            className="ml-auto text-sm text-[#2200ff] hover:underline">
            {showPreview ? "← Edit" : "Preview export →"}
          </button>
        )}

        {saveMessage && (
          <span className={`text-sm ${saveMessage.includes("failed") || saveMessage.includes("Network") ? "text-rose-600" : "text-slate-500"}`}>
            {saveMessage}
          </span>
        )}
      </div>

      {/* Scrollable document area — toolbar stays above this */}
      <div className="max-h-[680px] overflow-auto rounded-b-[1.6rem]">
        {showPreview && PreviewComponent ? (
          <PreviewComponent content={readMd()} />
        ) : (
          <div className="bg-slate-100 px-4 py-6 md:px-8 md:py-8">
            <div className="mx-auto w-full max-w-[794px] bg-white px-10 py-10 shadow-[0_2px_16px_rgba(0,0,0,0.10)] md:px-16 md:py-14">
              <div
                ref={editorRef}
                contentEditable={true}
                suppressContentEditableWarning={true}
                onInput={handleInput}
                onKeyDown={handleKeyDown}
                className={[
                  "min-h-[400px] outline-none",
                  "[&_h1]:font-serif [&_h1]:text-2xl [&_h1]:font-bold [&_h1]:tracking-tight [&_h1]:text-[#1B3A6B]",
                  "[&_h2]:mb-2 [&_h2]:mt-6 [&_h2]:border-b [&_h2]:border-[#B0BEC5] [&_h2]:pb-1 [&_h2]:text-xs [&_h2]:font-bold [&_h2]:uppercase [&_h2]:tracking-[0.15em] [&_h2]:text-[#1B3A6B]",
                  "[&_h3]:mt-3 [&_h3]:text-sm [&_h3]:font-semibold [&_h3]:text-[#14213d]",
                  "[&_p]:text-xs [&_p]:leading-5 [&_p]:text-slate-500",
                  "[&_ul]:mt-1.5 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-1",
                  "[&_li]:text-sm [&_li]:leading-6 [&_li]:text-slate-600",
                  "[&_strong]:font-semibold [&_strong]:text-[#14213d]",
                  "[&_b]:font-semibold [&_b]:text-[#14213d]",
                ].join(" ")}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
