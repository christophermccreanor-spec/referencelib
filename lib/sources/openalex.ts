import { EvidenceCardData, PeerReviewLabel, SourceVersion } from "@/lib/types";

const OPENALEX_BASE = "https://api.openalex.org/works";

interface OpenAlexWork {
  id: string;
  doi: string | null;
  title: string | null;
  publication_year: number | null;
  type: string | null;
  authorships?: { author: { display_name: string } }[];
  primary_location?: {
    source?: { display_name?: string; type?: string };
    is_oa?: boolean;
    landing_page_url?: string | null;
    pdf_url?: string | null;
    version?: string | null;
  };
  open_access?: { is_oa: boolean; oa_url?: string | null };
  best_oa_location?: {
    landing_page_url?: string | null;
    pdf_url?: string | null;
    version?: string | null;
    license?: string | null;
  };
  // Confirmed via OpenAlex's official API reference
  // (developers.openalex.org/api-reference/works/get-a-single-work): every
  // Work carries this object, all fields nullable strings. Capturing it is
  // the real fix for the "[Preprint]" mislabelling bug found while testing
  // the citeproc-js Harvard style: without volume/page data, that style
  // reads a fully published journal article as lacking publication data.
  biblio?: {
    volume: string | null;
    issue: string | null;
    first_page: string | null;
    last_page: string | null;
  };
}

// OpenAlex retired the free mailto-only "polite pool" in February 2026.
// Without a key the app now shares a $0.10/day budget across every visitor,
// which will not sustain real usage. A free account at openalex.org gives a
// key with a $1/day budget (openalex.org/settings/api); set it as
// OPENALEX_API_KEY. Without one, search still works but degrades fast under
// any real traffic. The mailto parameter is kept as a harmless identifier
// even though it no longer earns a rate-limit tier on its own.
export async function searchOpenAlex(
  query: string,
  options: { perPage?: number; sinceYear?: number; contactEmail?: string } = {}
): Promise<EvidenceCardData[]> {
  const perPage = options.perPage ?? 8;
  const params = new URLSearchParams({
    search: query,
    per_page: String(perPage),
    filter: [
      "open_access.is_oa:true",
      options.sinceYear ? `publication_year:>${options.sinceYear - 1}` : null,
    ]
      .filter(Boolean)
      .join(","),
  });
  if (options.contactEmail) params.set("mailto", options.contactEmail);
  const apiKey = process.env.OPENALEX_API_KEY;
  if (apiKey) params.set("api_key", apiKey);

  const res = await fetch(`${OPENALEX_BASE}?${params.toString()}`, {
    headers: { Accept: "application/json" },
    // Search-result caching per architecture doc section 6 happens at the
    // route layer; this fetch itself just asks Next.js to cache briefly.
    next: { revalidate: 60 * 60 * 24 },
    // A hung upstream request must not hang the serverless function. Eight
    // seconds leaves headroom inside typical platform execution limits.
    signal: AbortSignal.timeout(8000),
  });

  if (!res.ok) {
    throw new Error(`OpenAlex request failed: ${res.status}`);
  }

  const data = (await res.json()) as { results: OpenAlexWork[] };
  return data.results
    .filter((work) => work.title)
    .map((work) => toEvidenceCard(work));
}

function toEvidenceCard(work: OpenAlexWork): EvidenceCardData {
  const oaLocation = work.best_oa_location ?? work.primary_location;
  const fullTextUrl = oaLocation?.pdf_url ?? oaLocation?.landing_page_url ?? null;
  const version = mapVersion(oaLocation?.version ?? null);
  const isPreprint = work.type === "preprint" || version === "preprint";
  const sourceType = work.primary_location?.source?.type ?? work.type ?? "unknown";

  // OpenAlex metadata alone never earns the "verified" peer-review label.
  // That upgrade only happens once DOAJ or Crossref confirms it, per
  // blueprint section 6: peer review alone is not asserted from one source.
  const peerReview: PeerReviewLabel =
    sourceType === "journal" && !isPreprint ? "likely" : "unknown";

  const page = formatPageRange(work.biblio?.first_page ?? null, work.biblio?.last_page ?? null);

  return {
    id: work.id,
    title: work.title ?? "Untitled",
    authors: (work.authorships ?? []).map((a) => a.author.display_name).slice(0, 6),
    year: work.publication_year,
    journal: work.primary_location?.source?.display_name ?? null,
    doi: work.doi ? work.doi.replace("https://doi.org/", "") : null,
    sourceType,
    peerReview,
    openAccess: work.open_access?.is_oa ? "open" : "unknown",
    version,
    fullTextUrl,
    linkCheckedAt: new Date().toISOString(),
    method: null,
    isPreprint,
    volume: work.biblio?.volume ?? null,
    issue: work.biblio?.issue ?? null,
    page,
  };
}

function formatPageRange(firstPage: string | null, lastPage: string | null): string | null {
  if (!firstPage) return null;
  if (!lastPage || lastPage === firstPage) return firstPage;
  return `${firstPage}-${lastPage}`;
}

function mapVersion(raw: string | null): SourceVersion {
  if (raw === "publishedVersion") return "version-of-record";
  if (raw === "acceptedVersion") return "accepted-manuscript";
  if (raw === "submittedVersion") return "preprint";
  return "unknown";
}
