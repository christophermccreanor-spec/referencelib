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
  return Array.from(
    new Set(components.flatMap((c) => c.searchTerms).filter((t) => t.length > 2))
  );
}
