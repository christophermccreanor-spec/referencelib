import { NextRequest, NextResponse } from "next/server";
import { decodeQuestion } from "@/lib/decoder/decode";
import { QualificationProfileId } from "@/lib/types";

export const runtime = "edge";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const question = typeof body?.question === "string" ? body.question : "";
  const qualificationProfileId = (body?.qualificationProfileId ??
    "cipd-7") as QualificationProfileId;

  if (!question.trim()) {
    return NextResponse.json({ error: "A question is required." }, { status: 400 });
  }
  if (question.length > 2000) {
    return NextResponse.json({ error: "Question is too long." }, { status: 400 });
  }

  const decoded = decodeQuestion(question, qualificationProfileId);
  // No paid AI call here, matches architecture doc section 5. Rule-based
  // decoding runs on every request at no marginal cost.
  return NextResponse.json(decoded);
}
