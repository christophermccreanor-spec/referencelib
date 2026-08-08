import { NextRequest, NextResponse } from "next/server";
import { verifyByDoi, verifyByTitle } from "@/lib/sources/crossref";
import { verifyRateLimit, clientIp, getCached, setCached } from "@/lib/upstash";
import { VerifyResponse } from "@/lib/types";

const CONTACT_EMAIL = process.env.CROSSREF_CONTACT_EMAIL || "christophermccreanor@gmail.com";

const DOI_PATTERN = /10\.\d{4,9}\/[^\s"'<>]+/i;

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const input: string = typeof body?.input === "string" ? body.input.trim() : "";

  if (!input) {
    return NextResponse.json({ error: "Paste a reference, DOI or title." }, { status: 400 });
  }
  if (input.length > 4000) {
    return NextResponse.json({ error: "That's too long to verify. Paste a single reference, DOI or title." }, { status: 400 });
  }

  // Per-IP rate limiting, architecture doc section 6. Fails open when
  // Upstash isn't configured.
  if (verifyRateLimit) {
    const ip = clientIp(req);
    const { success, reset } = await verifyRateLimit.limit(ip);
    if (!success) {
      const retryAfterSeconds = Math.max(1, Math.ceil((reset - Date.now()) / 1000));
      return NextResponse.json(
        { error: "Too many checks in a short time. Please wait a moment and try again." },
        { status: 429, headers: { "Retry-After": String(retryAfterSeconds) } }
      );
    }
  }

  const cacheKey = `referencelib:verify:${input.toLowerCase()}`;
  const cached = await getCached<VerifyResponse>(cacheKey);
  if (cached) {
    return NextResponse.json(cached);
  }

  try {
    const doiMatch = input.match(DOI_PATTERN);
    let payload: VerifyResponse;
    if (doiMatch) {
      const result = await verifyByDoi(doiMatch[0], CONTACT_EMAIL);
      payload = { method: "doi", ...result };
    } else {
      // No DOI found in the pasted text: fall back to a title search. This is
      // the lower-confidence path and is presented as such in the UI, since a
      // title match is not the same certainty as a DOI match.
      const candidates = await verifyByTitle(input.slice(0, 300), CONTACT_EMAIL);
      payload = { method: "title-search", candidates };
    }
    await setCached(cacheKey, payload);
    return NextResponse.json(payload);
  } catch (error) {
    console.error("[api/verify]", error);
    return NextResponse.json(
      { error: "Could not reach the verification source. Please try again shortly." },
      { status: 502 }
    );
  }
}
