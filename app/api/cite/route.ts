import { NextRequest, NextResponse } from "next/server";
import { CitationRecord, ReferencingStyle } from "@/lib/types";
import { citationRecordToCslJson } from "@/lib/citation/csl/adapter";
import { renderBibliography, renderInTextCitation } from "@/lib/citation/csl/engine";

const VALID_STYLES: ReferencingStyle[] = ["harvard-cite-them-right", "apa"];

// Stateless by design, per the "no server-side storage" principle in the
// go-live checklist: this route renders citations from whatever the client
// sends and stores nothing. It exists at all only because citeproc-js
// (lib/citation/csl/engine.ts) reads .csl/.xml style files from disk via
// Node's fs/path, which cannot run in a client component or the browser.
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const items = Array.isArray(body?.items) ? (body.items as CitationRecord[]) : null;
  const style = body?.style as ReferencingStyle | undefined;
  const mode = body?.mode === "in-text" ? "in-text" : "bibliography";

  if (!items || items.length === 0) {
    return NextResponse.json({ error: "No references supplied." }, { status: 400 });
  }
  if (items.length > 200) {
    return NextResponse.json({ error: "Too many references in one request." }, { status: 400 });
  }
  if (!style || !VALID_STYLES.includes(style)) {
    return NextResponse.json({ error: "Unknown or missing referencing style." }, { status: 400 });
  }
  if (mode === "in-text" && items.length !== 1) {
    return NextResponse.json(
      { error: "In-text citation rendering takes exactly one reference." },
      { status: 400 }
    );
  }

  try {
    const cslItems = items.map(citationRecordToCslJson);

    if (mode === "in-text") {
      const citation = await renderInTextCitation(cslItems[0], style);
      return NextResponse.json({ citation });
    }

    const entries = await renderBibliography(cslItems, style);
    return NextResponse.json({ entries });
  } catch (error) {
    console.error("[api/cite]", error);
    return NextResponse.json(
      { error: "Could not render that citation. Please try again shortly." },
      { status: 502 }
    );
  }
}
