import { NextRequest, NextResponse } from "next/server";
import { extractParagraphSearchTerms } from "@/lib/decoder/paragraph-extraction";
import { searchOpenAlex } from "@/lib/sources/openalex";
import { isJournalInDOAJ } from "@/lib/sources/doaj";
import { EvidenceCardData } from "@/lib/types";

// Evidence my paragraph: a free, rule-based tool for the real problem
// Christopher described from his own assessing experience. Students often
// have a sound argument but no citations for it ("says who?"). This finds
// candidate peer-reviewed sources for a student's own written paragraph,
// the same way Find Evidence does for a question. It does not judge
// whether the argument is well evidenced, that verdict needs AI and is a
// separate, deferred feature (blueprint section 14, item 7).
//
// The read-before-copy gate that makes this a genuine research exercise
// rather than a citation-generator shortcut lives entirely in the
// frontend (app/page.tsx and components/EvidenceCard.tsx): Save reference
// and Copy citation stay disabled per card until the student has clicked
// Read free on that specific card.

const CONTACT_EMAIL = process.env.CROSSREF_CONTACT_EMAIL || "christophermccreanor@gmail.com";
const TARGET_RESULTS = 5;

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const paragraph: string = typeof body?.paragraph === "string" ? body.paragraph.trim() : "";

  if (!paragraph) {
    return NextResponse.json({ error: "Paste your paragraph first." }, { status: 400 });
  }
  if (paragraph.length > 4000) {
    return NextResponse.json(
      { error: "That's too long. Paste one paragraph at a time." },
      { status: 400 }
    );
  }

  const searchTerms = extractParagraphSearchTerms(paragraph);
  if (searchTerms.length === 0) {
    return NextResponse.json(
      { error: "Could not identify a clear concept to search for. Try a more specific paragraph." },
      { status: 400 }
    );
  }

  try {
    const query = searchTerms.slice(0, 4).join(" ");
    // Ask for more than needed, since preprints and sources with no free
    // full-text link get filtered out below, and a card the student can't
    // open would be a dead end against the read-before-copy rule.
    const results = await searchOpenAlex(query, { perPage: 15, contactEmail: CONTACT_EMAIL });

    const filtered = results.filter((r) => !r.isPreprint && r.fullTextUrl);

    const upgraded: EvidenceCardData[] = await Promise.all(
      filtered.map(async (card, index) => {
        if (index >= 5 || !card.journal || card.peerReview !== "likely") return card;
        const confirmed = await isJournalInDOAJ(card.journal).catch(() => false);
        return confirmed ? { ...card, peerReview: "verified" as const } : card;
      })
    );

    const final = upgraded.slice(0, 10);
    return NextResponse.json({
      results: final,
      searchTerms,
      meetsTarget: final.length >= TARGET_RESULTS,
    });
  } catch (error) {
    console.error("[api/paragraph]", error);
    return NextResponse.json(
      { error: "High demand or a temporary issue with the evidence source. Please try again shortly." },
      { status: 502 }
    );
  }
}
