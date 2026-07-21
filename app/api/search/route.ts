import { NextRequest, NextResponse } from "next/server";
import { searchOpenAlex } from "@/lib/sources/openalex";
import { isJournalInDOAJ } from "@/lib/sources/doaj";
import { EvidenceCardData } from "@/lib/types";

const CONTACT_EMAIL = process.env.CROSSREF_CONTACT_EMAIL || "christophermccreanor@gmail.com";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const terms: string[] = Array.isArray(body?.terms) ? body.terms.filter(Boolean) : [];
  const sinceYear: number | undefined = typeof body?.sinceYear === "number" ? body.sinceYear : undefined;

  if (terms.length === 0) {
    return NextResponse.json({ error: "At least one search term is required." }, { status: 400 });
  }

  try {
    const query = terms.slice(0, 4).join(" ");
    const results = await searchOpenAlex(query, {
      perPage: 8,
      sinceYear,
      contactEmail: CONTACT_EMAIL,
    });

    // Preprints excluded by default, per blueprint section 6. Unknown
    // peer-review status is never presented as verified.
    const filtered = results.filter((r) => !r.isPreprint);

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

    return NextResponse.json({ results: upgraded, query });
  } catch (error) {
    console.error("[api/search]", error);
    return NextResponse.json(
      { error: "High demand or a temporary issue with the evidence source. Please try again shortly." },
      { status: 502 }
    );
  }
}
