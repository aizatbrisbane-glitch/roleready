import Link from "next/link";

// Matches [text](url) links and **bold** text
const INLINE_PATTERN = /\[([^\]]+)\]\(([^)]+)\)|\*\*([^*]+)\*\*/g;

/**
 * Converts [text](url) and **bold** patterns into React elements.
 * Safe — no dangerouslySetInnerHTML.
 */
export function renderInlineLinks(text: string): React.ReactNode {
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  INLINE_PATTERN.lastIndex = 0;

  while ((match = INLINE_PATTERN.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }

    if (match[1] !== undefined) {
      // Link: [label](href)
      const label = match[1];
      const href = match[2];
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
    } else {
      // Bold: **text**
      parts.push(
        <strong key={match.index} className="font-bold text-slate-900">
          {match[3]}
        </strong>
      );
    }

    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts.length === 1 ? parts[0] : parts;
}
