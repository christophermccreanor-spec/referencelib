import { NextRequest, NextResponse } from "next/server";
import { lookupBookByIsbn } from "@/lib/sources/open-library";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const isbn = typeof body?.isbn === "string" ? body.isbn.trim() : "";
  if (!isbn) {
    return NextResponse.json({ error: "An ISBN is required." }, { status: 400 });
  }
  try {
    const result = await lookupBookByIsbn(isbn);
    if (!result) {
      return NextResponse.json(
        { error: "No book found for that ISBN. Check the digits, or enter the details manually." },
        { status: 404 }
      );
    }
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not look up that ISBN.";
    const isValidationError = message.startsWith("An ISBN is");
    console.error("[api/books]", error);
    return NextResponse.json(
      { error: isValidationError ? message : "Could not reach the book lookup service. Please try again shortly, or enter the details manually." },
      { status: isValidationError ? 400 : 502 }
    );
  }
}
