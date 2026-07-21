// Google Books volumes:list endpoint. Public ISBN search works without a
// key at low volume (confirmed via developers.google.com/books/docs/v1/using);
// GOOGLE_BOOKS_API_KEY is optional and only raises the quota ceiling.
const GOOGLE_BOOKS_BASE = "https://www.googleapis.com/books/v1/volumes";

export interface GoogleBooksLookupResult {
  title: string;
  authors: string[];
  publisher: string | null;
  year: string | null;
}

interface GoogleBooksVolume {
  volumeInfo?: {
    title?: string;
    subtitle?: string;
    authors?: string[];
    publisher?: string;
    publishedDate?: string;
  };
}

function cleanIsbn(raw: string): string {
  return raw.replace(/[^0-9Xx]/g, "");
}

export async function lookupBookByIsbn(isbn: string): Promise<GoogleBooksLookupResult | null> {
  const cleaned = cleanIsbn(isbn);
  if (cleaned.length !== 10 && cleaned.length !== 13) {
    throw new Error("An ISBN is 10 or 13 digits. Check the number and try again.");
  }

  const params = new URLSearchParams({ q: `isbn:${cleaned}` });
  const apiKey = process.env.GOOGLE_BOOKS_API_KEY;
  if (apiKey) params.set("key", apiKey);

  const res = await fetch(`${GOOGLE_BOOKS_BASE}?${params.toString()}`, {
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) {
    throw new Error(`Google Books request failed: ${res.status}`);
  }

  const data = (await res.json()) as { items?: GoogleBooksVolume[] };
  const info = data.items?.[0]?.volumeInfo;
  if (!info?.title) return null;

  const title = info.subtitle ? `${info.title}: ${info.subtitle}` : info.title;
  return {
    title,
    authors: Array.isArray(info.authors) ? info.authors : [],
    publisher: info.publisher ?? null,
    year: typeof info.publishedDate === "string" ? info.publishedDate.slice(0, 4) : null,
  };
}
