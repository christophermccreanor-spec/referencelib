import { describe, it, expect } from "vitest";
import { auditCitations } from "@/lib/citation/audit";

describe("auditCitations", () => {
  const referenceList = [
    "Smith, J. (2020) Organisational culture. London: Sage.",
    "Ahmed, K., Lee, T. and Osei, B. (2019a) Revisiting culture-wellbeing links. Journal of Work Psychology, 12(3), pp. 45-60.",
    "Jones, R. (2021) Employee engagement. Manchester: MUP.",
  ].join("\n");

  it("regression: matches an 'et al., YEARa' citation against its reference", () => {
    // The original CITATION_SEGMENT regex dropped this pattern entirely
    // (see comment history in lib/citation/audit.ts) because the optional
    // trailing-name group required text after "et al." that isn't there.
    const assignmentText =
      "Culture strongly predicts wellbeing outcomes (Ahmed et al., 2019a).";
    const result = auditCitations(assignmentText, referenceList);
    expect(result.citationCount).toBe(1);
    expect(result.unreferencedCitations).toEqual([]);
  });

  it("flags a citation with no matching reference entry", () => {
    const assignmentText = "This is supported by prior work (Nguyen, 2022).";
    const result = auditCitations(assignmentText, referenceList);
    expect(result.unreferencedCitations.length).toBe(1);
    expect(result.unreferencedCitations[0]).toContain("Nguyen");
  });

  it("flags a reference with no matching in-text citation", () => {
    const assignmentText = "Culture matters (Smith, 2020).";
    const result = auditCitations(assignmentText, referenceList);
    expect(result.uncitedReferences.some((r) => r.includes("Ahmed"))).toBe(true);
    expect(result.uncitedReferences.some((r) => r.includes("Jones"))).toBe(true);
  });

  it("reports a clean match when every citation and reference pair up", () => {
    const assignmentText = "As shown by Smith (2020) and Jones (2021), engagement matters.";
    const refs = [
      "Smith, J. (2020) Organisational culture. London: Sage.",
      "Jones, R. (2021) Employee engagement. Manchester: MUP.",
    ].join("\n");
    const result = auditCitations(assignmentText, refs);
    expect(result.unreferencedCitations).toEqual([]);
    expect(result.uncitedReferences).toEqual([]);
  });

  it("handles multiple citations in one parenthetical, separated by semicolons", () => {
    const assignmentText = "This is well established (Smith, 2020; Jones, 2021).";
    const result = auditCitations(assignmentText, referenceList);
    expect(result.citationCount).toBe(2);
  });

  it("matches narrative-style citations where the surname sits outside the parentheses", () => {
    // "Smith (2020) argues..." puts the year, not the surname, inside the
    // parentheses. The original implementation only looked inside "(...)"
    // for a surname+year pair together and silently missed this form.
    const assignmentText = "As shown by Smith (2020) and Jones (2021), engagement matters.";
    const result = auditCitations(assignmentText, referenceList);
    expect(result.unreferencedCitations).toEqual([]);
  });

  it("returns zero counts for empty input", () => {
    const result = auditCitations("", "");
    expect(result.citationCount).toBe(0);
    expect(result.referenceCount).toBe(0);
  });
});
