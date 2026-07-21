import { CrossrefVerification } from "@/lib/types";

const CROSSREF_BASE = "https://api.crossref.org/works";

// DOI and bibliographic verification, free, no key. Crossref asks for a
// contact email in the User-Agent for the "polite pool" (faster, more
// reliable responses), per architecture doc section 3.
export async function verifyByDoi(
  doi: string,
  contactEmail?: string
): Promise<CrossrefVerification> {
  const cleaned = doi.trim().replace(/^https?:\/\/doi\.org\//i, "");
  const res = await fetch(`${CROSSREF_BASE}/${encodeURIComponent(cleaned)}`, {
    headers: {
      Accept: "application/json",
      "User-Agent": `ReferenceLib/0.1 (mailto:${contactEmail ?? "unknown@example.com"})`,
    },
    signal: AbortSignal.timeout(8000),
  });

  if (res.status === 404) return { found: false };
  if (!res.ok) throw new Error(`Crossref request failed: ${res.status}`);

  const data = await res.json();
  const message = data.message;
  return {
    found: true,
    title: message.title?.[0],
    journal: message["container-title"]?.[0],
    year: message.issued?.["date-parts"]?.[0]?.[0],
    doi: message.DOI,
  };
}

// Fallback: verify by title/author search when no DOI is available, used by
// Verify a reference for pasted (possibly AI-hallucinated) citations.
export async function verifyByTitle(
  title: string,
  contactEmail?: string
): Promise<CrossrefVerification[]> {
  const params = new URLSearchParams({ "query.bibliographic": title, rows: "3" });
  const res = await fetch(`${CROSSREF_BASE}?${params.toString()}`, {
    headers: {
      Accept: "application/json",
      "User-Agent": `ReferenceLib/0.1 (mailto:${contactEmail ?? "unknown@example.com"})`,
    },
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) throw new Error(`Crossref search failed: ${res.status}`);

  const data = await res.json();
  return (data.message.items ?? []).map((item: any) => ({
    found: true,
    title: item.title?.[0],
    journal: item["container-title"]?.[0],
    year: item.issued?.["date-parts"]?.[0]?.[0],
    doi: item.DOI,
  }));
}
