import { describe, it, expect } from "vitest";
import { findCommandVerbs } from "@/lib/decoder/command-verbs";

describe("findCommandVerbs", () => {
  it("matches 'critically evaluate' as a single phrase, not 'evaluate' twice", () => {
    const matches = findCommandVerbs("Critically evaluate the theory of change.");
    const verbs = matches.map((m) => m.verb);
    expect(verbs).toContain("critically evaluate");
    // "evaluate" alone must not also match inside the same span, since the
    // longer phrase is sorted first specifically to prevent this overlap.
    expect(verbs.filter((v) => v === "evaluate").length).toBe(0);
  });

  it("finds multiple distinct command verbs in one question", () => {
    const matches = findCommandVerbs("Identify and explain the key drivers of motivation.");
    const verbs = matches.map((m) => m.verb);
    expect(verbs).toContain("identify");
    expect(verbs).toContain("explain");
  });

  it("regression: two short verbs close together are not treated as overlapping", () => {
    // A flat 30-character exclusion radius around each match's start index
    // previously suppressed any second verb starting within 30 characters
    // of the first, even when the two spans didn't actually overlap. Exact
    // span-overlap checking fixed this; this pins the behaviour.
    const matches = findCommandVerbs("Define and outline the theory.");
    const verbs = matches.map((m) => m.verb);
    expect(verbs).toContain("define");
    expect(verbs).toContain("outline");
  });

  it("flags institution-dependent verbs distinctly from high-confidence ones", () => {
    const matches = findCommandVerbs("Discuss the merits of flexible working.");
    const discuss = matches.find((m) => m.verb === "discuss");
    expect(discuss?.confidence).toBe("institution-dependent");
  });

  it("returns an empty array when no command verb is present", () => {
    expect(findCommandVerbs("Organisational culture and employee wellbeing.")).toEqual([]);
  });
});
