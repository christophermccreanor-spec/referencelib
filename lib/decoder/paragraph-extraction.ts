import { extractComponents } from "@/lib/decoder/concept-extraction";

// Reuses the same rule-based, no-AI concept extraction the question decoder
// uses (lib/decoder/concept-extraction.ts). A written paragraph has no
// command verb to split on, but extractComponents already splits on
// sentence punctuation too, so it degrades gracefully to per-sentence
// concept extraction. This deliberately does not judge whether the
// paragraph's argument is well evidenced, that verdict needs AI and is
// still deferred (blueprint section 14, item 7). This only finds
// candidate sources; the student and their assessor judge relevance.
export function extractParagraphSearchTerms(paragraph: string): string[] {
  const components = extractComponents(paragraph);
  // One representative term per concept, not every synonym variant; see the
  // matching comment in decode.ts for why this matters once only the first
  // few terms are actually sent to the search API.
  return Array.from(
    new Set(
      components
        .filter((c) => c.type === "concept")
        .map((c) => c.searchTerms[0])
        .filter((t): t is string => Boolean(t) && t.length > 2)
    )
  );
}
