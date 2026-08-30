import { EvidenceCardData, PeerReviewLabel, SourceVersion } from "@/lib/types";
import { isRelevantResult } from "@/lib/search/relevance";

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
  // Every OA location OpenAlex/Unpaywall knows for the work, not just the one
  // it picked as "best". Used to prefer a directly-openable published-version
  // PDF over a publisher landing page (which is where access walls appear).
  locations?: {
    is_oa?: boolean;
    version?: string | null;
    pdf_url?: string | null;
    landing_page_url?: string | null;
    source?: { type?: string | null } | null;
  }[];
  // Topic classification (developers.openalex.org). The domain is the coarse
  // bucket (Social Sciences / Health Sciences / Life Sciences / Physical
  // Sciences) used by the relevance gate to drop off-topic collisions.
  primary_topic?: {
    domain?: { display_name?: string | null } | null;
  } | null;
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
    // Drop off-topic keyword collisions (a cancer paper under "candidate", a
    // drone remote-sensing review under "remote"): see lib/search/relevance.ts.
    // Single-concept queries are passed through unfiltered by that gate.
    .filter((work) =>
      isRelevantResult(query, work.title, work.primary_topic?.domain?.display_name ?? null)
    )
    .map((work) => toEvidenceCard(work));
}

// OpenAlex's pdf_url (sourced from Unpaywall) is not always actually a PDF
// or article page. Found live: a ScienceDirect record whose pdf_url was
// https://ars.els-cdn.com/content/image/1-s2.0-...-ga1_lrg.jpg, a
// graphical-abstract thumbnail, not the paper, so "Read free" opened a
// picture instead of the source. Rather than guess at what a real
// full-text URL looks like (legitimate ones vary too widely: DOI
// redirects, "/pdf/full" paths, "?type=printable" query params), this
// blocks the specific, identifiable shapes of a non-document asset: an
// image/media file extension, or Elsevier's own "/content/image/" CDN
// path convention for exactly this kind of thumbnail.
const NON_DOCUMENT_URL_PATTERN =
  /\.(jpe?g|png|gif|svg|webp|bmp|tiff?|ico|mp4|mp3|avi|zip)(?:$|[?#])|\/content\/image\//i;

function isLikelyFullTextUrl(url: string | null | undefined): url is string {
  return Boolean(url) && !NON_DOCUMENT_URL_PATTERN.test(url as string);
}

// Choose the free-text link, preferring what a student can actually open.
// best_oa_location's own PDF stays the first choice (it is OpenAlex's vetted
// pick and keeps the prior graphical-abstract fix intact), but when that only
// offers a publisher *landing page* — where sign-in/access walls live — this
// reaches across the work's other open-access locations for a
// published-version PDF (e.g. a PMC or repository copy of the version of
// record) before falling back to the landing page. Only is_oa,
// published-version locations are considered, so no preprint or
// author-manuscript is ever surfaced as the source. Order is deliberate:
// best PDF, then any published-version PDF, then best landing page, then any
// published-version landing page. When the work carries no vouched-for OA
// location at all, this returns null (never a paywalled primary_location).
function selectFullTextUrl(work: OpenAlexWork): string | null {
  const publishedOa = (work.locations ?? []).filter(
    (loc) => loc?.is_oa && loc.version === "publishedVersion"
  );
  const ordered: (string | null | undefined)[] = [
    work.best_oa_location?.pdf_url,
    ...publishedOa.map((loc) => loc.pdf_url),
    work.best_oa_location?.landing_page_url,
    ...publishedOa.map((loc) => loc.landing_page_url),
  ];
  return ordered.find(isLikelyFullTextUrl) ?? null;
}

// Found from student testing (28 August 2026): several "free" results
// opened onto a publisher paywall instead. Root cause was here, not in
// OpenAlex's data: best_oa_location is OpenAlex/Unpaywall's own vouched-for
// open-access location, but primary_location is just wherever the work was
// indexed from, often the publisher's page, with no OA guarantee at all.
// The old code fell back to primary_location whenever best_oa_location was
// missing, so a work with open_access.is_oa:true (a data-quality edge case
// where OpenAlex has not populated a best_oa_location for it) could still
// hand back a fullTextUrl pointing straight at a paywall. There is no safe
// fallback for the *link* when best_oa_location is missing: if OpenAlex has
// not vouched for a specific OA location, this returns no link at all
// rather than guessing. The version label is a separate concern from the
// link: primary_location.version is still a legitimate signal of preprint
// status even when there is no working free-text link to show, so that one
// field alone keeps its old fallback.
function toEvidenceCard(work: OpenAlexWork): EvidenceCardData {
  const fullTextUrl = selectFullTextUrl(work);
  const version = mapVersion(work.best_oa_location?.version ?? work.primary_location?.version ?? null);
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
