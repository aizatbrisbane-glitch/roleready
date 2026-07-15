import Link from "next/link";

const LINK_PATTERN = /\[([^\]]+)\]\(([^)]+)\)/g;

/**
 * Converts [text](url) patterns in a paragraph string into Next.js Link elements.
 * All other text is returned as plain strings. Safe — no dangerouslySetInnerHTML.
 */
export function renderInlineLinks(text: string): React.ReactNode {
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  LINK_PATTERN.lastIndex = 0;

  while ((match = LINK_PATTERN.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }
    const [, label, href] = match;
    const isExternal = href.startsWith("http");
    parts.push(
      isExternal ? (
        <a
          key={match.index}
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="font-semibold text-[#2200ff] underline decoration-[#2200ff]/30 underline-offset-2 hover:decoration-[#2200ff]"
        >
          {label}
        </a>
      ) : (
        <Link
          key={match.index}
          href={href}
          className="font-semibold text-[#2200ff] underline decoration-[#2200ff]/30 underline-offset-2 hover:decoration-[#2200ff]"
        >
          {label}
        </Link>
      )
    );
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts.length === 1 ? parts[0] : parts;
}
