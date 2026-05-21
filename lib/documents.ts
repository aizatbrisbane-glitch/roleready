import { Document, Packer, Paragraph, TextRun, BorderStyle } from "docx";
import { jsPDF } from "jspdf";

// ─── Shared helpers ────────────────────────────────────────────────────────

interface Seg {
  text: string;
  bold: boolean;
}

function parseSegs(text: string): Seg[] {
  const out: Seg[] = [];
  const re = /\*\*(.*?)\*\*/g;
  let i = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    if (m.index > i) out.push({ text: text.slice(i, m.index), bold: false });
    if (m[1]) out.push({ text: m[1], bold: true });
    i = m.index + m[0].length;
  }
  if (i < text.length) out.push({ text: text.slice(i), bold: false });
  return out.length ? out : [{ text, bold: false }];
}

function stripMarkers(s: string): string {
  return s.replace(/\*\*(.*?)\*\*/g, "$1").replace(/\*(.*?)\*/g, "$1");
}

/**
 * Heuristic: treat a line as a section header if it looks like an all-caps
 * plain-text header (for backward compat with content generated before the
 * markdown format instruction was added to the prompt).
 * e.g. "PROFESSIONAL EXPERIENCE", "KEY SKILLS & COMPETENCIES", "EDUCATION"
 */
function looksLikePlainHeader(text: string): boolean {
  if (text.length < 4) return false;
  // Must not contain markdown markers or numbers
  if (/[#*\-•\d]/.test(text)) return false;
  // Must be entirely uppercase letters, spaces, & / ( ) :
  if (!/^[A-Z][A-Z\s&/():]+$/.test(text)) return false;
  const words = text.trim().split(/\s+/);
  // Multi-word all-caps, or single word >= 6 chars (SKILLS, EDUCATION, etc.)
  return words.length >= 2 || text.trim().length >= 6;
}

// ─── DOCX ──────────────────────────────────────────────────────────────────

const DOCX_NAVY = "1B3A6B";
const DOCX_DARK = "212121";
const DOCX_RULE = "B0BEC5";

// Note: font is NOT set on individual TextRuns — it's inherited from the
// document default style (Calibri). Setting font per-run can interfere with
// the bold property in some docx versions.
function docxRuns(text: string, sizePt2: number, color = DOCX_DARK, forceBold = false): TextRun[] {
  return parseSegs(text).map(
    (s) =>
      new TextRun({
        text: s.text,
        bold: s.bold || forceBold,
        size: sizePt2,
        color
      })
  );
}

function hrParagraph(): Paragraph {
  return new Paragraph({
    children: [],
    spacing: { before: 80, after: 80 },
    border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: DOCX_RULE, space: 1 } }
  });
}

function markdownToDocxParagraphs(md: string): Paragraph[] {
  const out: Paragraph[] = [];
  const BODY = 21; // 10.5 pt in half-points

  for (const raw of md.split("\n")) {
    const t = raw.trim();

    if (!t) {
      out.push(new Paragraph({ children: [], spacing: { before: 0, after: 80 } }));
      continue;
    }

    // Markdown horizontal rule — render as a thin divider
    if (t === "---" || t === "***" || t === "___") {
      out.push(hrParagraph());
      continue;
    }

    if (t.startsWith("# ")) {
      out.push(
        new Paragraph({
          children: [new TextRun({ text: stripMarkers(t.slice(2)).trim(), bold: true, size: 40, color: DOCX_NAVY })],
          spacing: { before: 0, after: 80 }
        })
      );
    } else if (t.startsWith("## ")) {
      out.push(
        new Paragraph({
          children: [new TextRun({ text: stripMarkers(t.slice(3)).trim().toUpperCase(), bold: true, size: 24, color: DOCX_NAVY })],
          spacing: { before: 280, after: 80 },
          border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: DOCX_RULE, space: 3 } }
        })
      );
    } else if (t.startsWith("### ")) {
      out.push(
        new Paragraph({
          children: docxRuns(t.slice(4).trim(), 22, DOCX_DARK, true),
          spacing: { before: 120, after: 40 }
        })
      );
    } else if (looksLikePlainHeader(t)) {
      // Backward-compat: plain all-caps section header (no ## prefix)
      out.push(
        new Paragraph({
          children: [new TextRun({ text: t.toUpperCase(), bold: true, size: 24, color: DOCX_NAVY })],
          spacing: { before: 280, after: 80 },
          border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: DOCX_RULE, space: 3 } }
        })
      );
    } else if (/^[*-] /.test(t)) {
      out.push(
        new Paragraph({
          children: docxRuns(t.slice(2).trim(), BODY),
          bullet: { level: 0 },
          spacing: { before: 0, after: 60 }
        })
      );
    } else {
      out.push(
        new Paragraph({
          children: docxRuns(t, BODY),
          spacing: { before: 0, after: 100 }
        })
      );
    }
  }

  return out;
}

function cleanMarkdown(text: string): string {
  return text
    .split("\n")
    .map((l) => l.trimEnd())
    .filter((l, i, arr) => {
      if (/^[-*_]{3,}\s*$/.test(l)) return false;
      if (l === "" && arr[i - 1] === "") return false;
      return true;
    })
    .join("\n")
    .trim();
}

export async function createDocxBuffer(_title: string, markdown: string): Promise<Buffer> {
  markdown = cleanMarkdown(markdown);
  const doc = new Document({
    styles: {
      default: {
        document: {
          run: { font: "Calibri", size: 21, color: DOCX_DARK }
        }
      }
    },
    sections: [
      {
        properties: {
          page: {
            margin: { top: 1080, right: 1080, bottom: 1080, left: 1080 } // 0.75 inch
          }
        },
        children: markdownToDocxParagraphs(markdown)
      }
    ]
  });

  return Packer.toBuffer(doc);
}

// ─── PDF ───────────────────────────────────────────────────────────────────

const PDF_NAVY: [number, number, number] = [27, 58, 107];
const PDF_DARK: [number, number, number] = [33, 33, 33];
const PDF_RULE: [number, number, number] = [176, 190, 197];

export function createPdfArrayBuffer(_title: string, markdown: string): ArrayBuffer {
  markdown = cleanMarkdown(markdown);
  const pdf = new jsPDF({ unit: "pt", format: "a4" });

  const ML = 72;
  const PW = pdf.internal.pageSize.getWidth();
  const PH = pdf.internal.pageSize.getHeight();
  const BODY_W = PW - ML * 2;
  const BOTTOM = PH - ML;
  const BODY_PT = 10.5;
  const BODY_LH = 15;

  let y = ML;

  function newPage() {
    pdf.addPage();
    y = ML;
  }

  function guard(needed: number) {
    if (y + needed > BOTTOM) newPage();
  }

  function drawHRule() {
    guard(12);
    pdf.setDrawColor(...PDF_RULE);
    pdf.setLineWidth(0.5);
    pdf.line(ML, y, ML + BODY_W, y);
    y += 10;
  }

  function renderMixed(text: string, size: number, lh: number, x: number): void {
    pdf.setFontSize(size);
    const availW = BODY_W - (x - ML);
    const segList = parseSegs(text);

    let totalW = 0;
    for (const s of segList) {
      pdf.setFont("helvetica", s.bold ? "bold" : "normal");
      totalW += pdf.getTextWidth(s.text);
    }

    if (totalW <= availW) {
      guard(lh);
      let cx = x;
      for (const s of segList) {
        if (!s.text) continue;
        pdf.setFont("helvetica", s.bold ? "bold" : "normal");
        pdf.text(s.text, cx, y);
        cx += pdf.getTextWidth(s.text);
      }
      y += lh;
      return;
    }

    // Word-wrap preserving bold segments
    const tokens: { w: string; bold: boolean }[] = [];
    for (const s of segList) {
      for (const part of s.text.split(/(\s+)/)) {
        tokens.push({ w: part, bold: s.bold });
      }
    }

    let lineToks: typeof tokens = [];
    let lineW = 0;

    function flush() {
      if (!lineToks.length) return;
      guard(lh);
      let cx = x;
      for (const tok of lineToks) {
        pdf.setFont("helvetica", tok.bold ? "bold" : "normal");
        if (tok.w) pdf.text(tok.w, cx, y);
        cx += pdf.getTextWidth(tok.w);
      }
      y += lh;
      lineToks = [];
      lineW = 0;
    }

    for (const tok of tokens) {
      pdf.setFont("helvetica", tok.bold ? "bold" : "normal");
      const tw = pdf.getTextWidth(tok.w);
      if (lineW + tw > availW && lineW > 0) flush();
      lineToks.push(tok);
      lineW += tw;
    }
    flush();
  }

  for (const raw of markdown.split("\n")) {
    const t = raw.trim();

    if (!t) {
      y += 4;
      continue;
    }

    // Markdown horizontal rule
    if (t === "---" || t === "***" || t === "___") {
      drawHRule();
      continue;
    }

    if (t.startsWith("# ")) {
      guard(28);
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(20);
      pdf.setTextColor(...PDF_NAVY);
      pdf.text(stripMarkers(t.slice(2)).trim(), ML, y);
      y += 26;
      pdf.setTextColor(...PDF_DARK);
    } else if (t.startsWith("## ") || looksLikePlainHeader(t)) {
      const label = t.startsWith("## ")
        ? stripMarkers(t.slice(3)).trim().toUpperCase()
        : t.toUpperCase();
      y += 10;
      guard(22);
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(11);
      pdf.setTextColor(...PDF_NAVY);
      pdf.text(label, ML, y);
      y += 4;
      pdf.setDrawColor(...PDF_RULE);
      pdf.setLineWidth(0.5);
      pdf.line(ML, y, ML + BODY_W, y);
      y += 11;
      pdf.setTextColor(...PDF_DARK);
    } else if (t.startsWith("### ")) {
      y += 5;
      guard(BODY_LH);
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(BODY_PT);
      pdf.setTextColor(...PDF_DARK);
      pdf.text(stripMarkers(t.slice(4)).trim(), ML, y);
      y += BODY_LH;
    } else if (/^[*-] /.test(t)) {
      guard(BODY_LH);
      pdf.setFontSize(BODY_PT);
      pdf.setFont("helvetica", "normal");
      pdf.setTextColor(...PDF_DARK);
      pdf.text("•", ML, y);
      renderMixed(t.slice(2).trim(), BODY_PT, BODY_LH, ML + 11);
    } else {
      pdf.setFontSize(BODY_PT);
      pdf.setTextColor(...PDF_DARK);
      renderMixed(t, BODY_PT, BODY_LH, ML);
    }
  }

  return pdf.output("arraybuffer");
}
