export async function extractTextFromFile(file: File) {
  const name = file.name.toLowerCase();
  const arrayBuffer = await file.arrayBuffer();

  if (name.endsWith(".txt") || name.endsWith(".md")) {
    return new TextDecoder().decode(arrayBuffer).trim();
  }

  if (name.endsWith(".docx")) {
    const mammoth = await import("mammoth");
    const result = await mammoth.extractRawText({ buffer: Buffer.from(arrayBuffer) });
    return result.value.trim();
  }

  if (name.endsWith(".pdf")) {
    // pdfjs-dist (used internally by pdf-parse v2) requires DOMMatrix which isn't
    // a global in Node.js 18 serverless. Stub it before the dynamic import.
    if (typeof (globalThis as Record<string, unknown>).DOMMatrix === "undefined") {
      (globalThis as Record<string, unknown>).DOMMatrix = class DOMMatrix {
        constructor(_init?: string | number[]) {}
      };
    }
    const { PDFParse } = await import("pdf-parse");
    const parser = new PDFParse({ data: Buffer.from(arrayBuffer) });
    try {
      const result = await parser.getText();
      return result.text.trim();
    } finally {
      await parser.destroy();
    }
  }

  return "";
}
