import { CitationRecord, ReferencingStyle } from "@/lib/types";

// Browser-safe wrappers around the /api/cite route. citeproc-js itself
// (lib/citation/csl/engine.ts) cannot run in a client component: it reads
// .csl/.xml style files from disk via Node's fs/path. These functions are
// the only way client components should ever render a citation.

export async function renderFullReference(
  item: CitationRecord,
  style: ReferencingStyle
): Promise<string> {
  const entries = await renderBibliographyEntries([item], style);
  return entries[0] ?? "";
}

export async function renderBibliographyEntries(
  items: CitationRecord[],
  style: ReferencingStyle
): Promise<string[]> {
  if (items.length === 0) return [];
  const res = await fetch("/api/cite", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ items, style, mode: "bibliography" }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? "Could not render the reference list.");
  return data.entries as string[];
}

export async function renderInTextCitationForItem(
  item: CitationRecord,
  style: ReferencingStyle
): Promise<string> {
  const res = await fetch("/api/cite", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ items: [item], style, mode: "in-text" }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? "Could not render the citation.");
  return data.citation as string;
}
