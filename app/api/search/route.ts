import { NextRequest, NextResponse } from "next/server";
import { searchOpenAlex } from "@/lib/sources/openalex";
import { isJournalInDOAJ } from "@/lib/sources/doaj";
import { EvidenceCardData } from "@/lib/types";
import { effectiveSinceYear } from "@/lib/search/recency";
import { searchRateLimit, clientIp, getCached, setCached } from "@/lib/upstash";

const CONTACT_EMAIL = process.env.CROSSREF_CONTACT_EMAIL || "christophermccreanor@gmail.com";

interface SearchPayload {
  results: EvidenceCardData[];
  query: string;
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const terms: string[] = Array.isArray(body?.terms) ? body.terms.filter(Boolean) : [];
  const requestedSinceYear: number | undefined =
    typeof body?.sinceYear === "number" ? body.sinceYear : undefined;

  if (terms.length === 0) {
    return NextResponse.json({ error: "At least one search term is required." }, { status: 400 });
  }

  // Enforce the recency floor even when the client sends no year (the common
  // case: the "Evidence from year" field is optional and usually left blank),
  // so peer-reviewed evidence stays within the last few years by default
  // rather than reaching back decades. See lib/search/recency.ts.
  const sinceYear = effectiveSinceYear(requestedSinceYear);

  // Per-IP rate limiting, architecture doc section 6. Fails open (no limiter
  // object) when Upstash isn't configured, so local development and any
  // outage of the free tier never breaks the search itself.
  if (searchRateLimit) {
    const ip = clientIp(req);
    const { success, reset } = await searchRateLimit.limit(ip);
    if (!success) {
      const retryAfterSeconds = Math.max(1, Math.ceil((reset - Date.now()) / 1000));
      return NextResponse.json(
        { error: "Too many searches in a short time. Please wait a moment and try again." },
        { status: 429, headers: { "Retry-After": String(retryAfterSeconds) } }
      );
    }
  }

  const query = terms.slice(0, 4).join(" ");
  const cacheKey = `referencelib:search:${query.toLowerCase()}:${sinceYear ?? "any"}`;

  const cached = await getCached<SearchPayload>(cacheKey);
  if (cached) {
    return NextResponse.json(cached);
  }

  try {
    // Over-fetch: the relevance gate (lib/search/relevance.ts) and the
    // preprint / free-link filters below both drop results, so ask OpenAlex
    // for more than the 8 shown to keep the panel full after filtering.
    const results = await searchOpenAlex(query, {
      perPage: 14,
      sinceYear,
      contactEmail: CONTACT_EMAIL,
    });

    // Preprints excluded by default, per blueprint section 6. Unknown
    // peer-review status is never presented as verified. Also requires a
    // resolved fullTextUrl: the results panel promises "Free full text
    // only" (app/page.tsx), but before this fix a card with no working
    // free link could still appear, which is exactly what let students
    // testing on 28 August 2026 click through to a paywall. The paragraph
    // route (app/api/paragraph/route.ts) already filtered this way; Find
    // evidence did not, which was the gap.
    const filtered = results
      .filter((r) => !r.isPreprint && r.fullTextUrl)
      .slice(0, 8);

    // Upgrade peer-review label to "verified" only where DOAJ confirms the
    // journal, checked for at most the top 5 results to stay inside DOAJ's
    // rate limits per architecture doc section 6.
    const upgraded: EvidenceCardData[] = await Promise.all(
      filtered.map(async (card, index) => {
        if (index >= 5 || !card.journal || card.peerReview !== "likely") return card;
        const confirmed = await isJournalInDOAJ(card.journal).catch(() => false);
        return confirmed ? { ...card, peerReview: "verified" as const } : card;
      })
    );

    const payload: SearchPayload = { results: upgraded, query };
    await setCached(cacheKey, payload);
    return NextResponse.json(payload);
  } catch (error) {
    console.error("[api/search]", error);
    return NextResponse.json(
      { error: "High demand or a temporary issue with the evidence source. Please try again shortly." },
      { status: 502 }
    );
  }
}
