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
    const pdfParse = (await import("pdf-parse")).default;
    const result = await pdfParse(Buffer.from(arrayBuffer));
    return result.text.trim();
  }

  return "";
}
