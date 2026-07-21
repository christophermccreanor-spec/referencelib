// Open Library Books API (openlibrary.org/dev/docs/api/books). Free, no
// API key, no rate-limit-by-key scheme, and unlike Google Books it does
// not block requests from cloud/datacenter IP ranges (confirmed live:
// Google Books returned repeated "backendFailed" 503s from Vercel's
// serverless IPs, while Open Library answered normally on the same
// request from the same origin). This is why book ISBN lookups use Open
// Library rather than Google Books; see planning/05-deployment-plan.md.
const OPEN_LIBRARY_BASE = "https://openlibrary.org/api/books";

export interface OpenLibraryLookupResult {
  title: string;
  authors: string[];
  publisher: string | null;
  year: string | null;
}

interface OpenLibraryRecord {
  title?: string;
  subtitle?: string;
  authors?: { name?: string }[];
  publishers?: { name?: string }[];
  publish_date?: string;
}

function cleanIsbn(raw: string): string {
  return raw.replace(/[^0-9Xx]/g, "");
}

function extractYear(publishDate: string | undefined): string | null {
  if (!publishDate) return null;
  const match = publishDate.match(/\d{4}/);
  return match ? match[0] : null;
}

export async function lookupBookByIsbn(isbn: string): Promise<OpenLibraryLookupResult | null> {
  const cleaned = cleanIsbn(isbn);
  if (cleaned.length !== 10 && cleaned.length !== 13) {
    throw new Error("An ISBN is 10 or 13 digits. Check the number and try again.");
  }

  const bibkey = `ISBN:${cleaned}`;
  const params = new URLSearchParams({ bibkeys: bibkey, format: "json", jscmd: "data" });

  const res = await fetch(`${OPEN_LIBRARY_BASE}?${params.toString()}`, {
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) {
    throw new Error(`Open Library request failed: ${res.status}`);
  }

  const data = (await res.json()) as Record<string, OpenLibraryRecord>;
  const record = data[bibkey];
  if (!record?.title) return null;

  const title = record.subtitle ? `${record.title}: ${record.subtitle}` : record.title;
  return {
    title,
    authors: Array.isArray(record.authors)
      ? record.authors.map((a) => a.name).filter((n): n is string => Boolean(n))
      : [],
    publisher: record.publishers?.[0]?.name ?? null,
    year: extractYear(record.publish_date),
  };
}

