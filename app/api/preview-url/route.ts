import { NextResponse } from "next/server";

const SUFFIXES = [
  " | SEEK", " | LinkedIn", " | Indeed", " | Jora", " | CareerOne",
  " - SEEK", " - LinkedIn", " - Indeed",
  " on LinkedIn",
];

export async function GET(request: Request) {
  const target = new URL(request.url).searchParams.get("url");
  if (!target) return NextResponse.json({ title: null });

  try { new URL(target); } catch { return NextResponse.json({ title: null }); }

  try {
    const res = await fetch(target, {
      signal: AbortSignal.timeout(4000),
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        "Accept": "text/html",
      },
    });

    if (!res.ok) return NextResponse.json({ title: null });

    const html = await res.text();
    const match = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    if (!match) return NextResponse.json({ title: null });

    let title = match[1].trim();

    for (const s of SUFFIXES) {
      if (title.toLowerCase().endsWith(s.toLowerCase())) {
        title = title.slice(0, -s.length).trim();
        break;
      }
    }

    title = title
      .replace(/&amp;/g, "&")
      .replace(/&ndash;/g, "–")
      .replace(/&mdash;/g, "—")
      .replace(/&#39;/g, "'")
      .replace(/&quot;/g, '"');

    return NextResponse.json({ title: title || null });
  } catch {
    return NextResponse.json({ title: null });
  }
}
