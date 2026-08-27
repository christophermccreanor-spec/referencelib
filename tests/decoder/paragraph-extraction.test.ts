import { describe, it, expect } from "vitest";
import { extractParagraphSearchTerms } from "@/lib/decoder/paragraph-extraction";

describe("extractParagraphSearchTerms", () => {
  it("regression: keeps the paragraph's actual topic words instead of auxiliary verbs and prepositions", () => {
    // Live pilot paragraph that previously returned four completely
    // unrelated results (AI ethics in higher education, an unrelated
    // theology journal, a book on legal history, a 1920s employment
    // thesis) because "has" was not filtered as a stopword, silently
    // pushing "wellbeing" out past the six-word cap in the first concept,
    // and "through"/"within" polluted the second concept's search term.
    const terms = extractParagraphSearchTerms(
      "Organisational culture has a significant influence on employee wellbeing, " +
        "particularly through the psychological safety it creates within teams."
    );
    const joined = terms.join(" ").toLowerCase();
    expect(joined).toContain("wellbeing");
    expect(joined).not.toContain("has ");
    expect(joined).not.toMatch(/\bthrough\b/);
    expect(joined).not.toMatch(/\bwithin\b/);
  });

  it("returns no terms for a paragraph with no identifiable concept", () => {
    expect(extractParagraphSearchTerms("It was that.")).toEqual([]);
  });
});
