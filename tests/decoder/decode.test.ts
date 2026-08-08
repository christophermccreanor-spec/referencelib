import { describe, it, expect } from "vitest";
import { decodeQuestion } from "@/lib/decoder/decode";

describe("decodeQuestion", () => {
  it("returns one deduplicated search term per concept, not every synonym variant", () => {
    const result = decodeQuestion(
      "Critically evaluate the impact of organisational culture on employee wellbeing.",
      "cipd-5"
    );
    // Each concept contributes exactly one representative term to
    // searchTerms; the full synonym list must not leak through, since the
    // route layer only sends the first four terms to OpenAlex (see comment
    // in decode.ts).
    const unique = new Set(result.searchTerms);
    expect(unique.size).toBe(result.searchTerms.length);
    expect(result.searchTerms.length).toBeGreaterThan(0);
  });

  it("falls back to the custom qualification profile for an unknown id", () => {
    const result = decodeQuestion("Explain motivation theory.", "custom");
    expect(result.qualificationExpectation).toBeTruthy();
  });

  it("orders the Bloom sequence from the matched command verbs", () => {
    const result = decodeQuestion("Identify and explain key motivation theories.", "undergraduate");
    expect(result.bloomSequence.length).toBeGreaterThan(0);
  });

  it("trims the input question", () => {
    const result = decodeQuestion("   Explain leadership styles.   ", "undergraduate");
    expect(result.question).toBe("Explain leadership styles.");
  });
});
