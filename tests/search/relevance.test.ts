import { describe, it, expect } from "vitest";
import { isRelevantResult, conceptRoots } from "@/lib/search/relevance";

// Fixtures are the real OpenAlex top results captured on 30 August 2026 for
// the two queries whose drift the audit found. "keep" = genuinely relevant HR
// evidence (including papers OpenAlex mis-tags out of Social Sciences but whose
// titles carry the query concepts); "drop" = off-topic collisions.
const RECRUIT_Q = "recruitment selection candidate experience";
const REMOTE_Q = "remote working hybrid working productivity";

describe("isRelevantResult", () => {
  it("keeps in-scope Social Sciences results regardless of title wording", () => {
    expect(
      isRelevantResult(REMOTE_Q, "Online Learning and Emergency Remote Teaching", "Social Sciences")
    ).toBe(true);
    expect(
      isRelevantResult(RECRUIT_Q, "Memorable Candidate Experiences Throughout the Recruitment and Selection Process", "Social Sciences")
    ).toBe(true);
  });

  it("rescues relevant work that OpenAlex mis-tags into another domain, via title concepts", () => {
    // Real mis-tags: an AI-recruiting paper filed under Health Informatics, an
    // AI-recruitment paper under Computer Science. Both name recruit + select.
    expect(
      isRelevantResult(RECRUIT_Q, "Ethics of AI-Enabled Recruiting and Selection: A Review and Research Agenda", "Health Sciences")
    ).toBe(true);
    expect(
      isRelevantResult(RECRUIT_Q, "The Impact of AI on Recruitment and Selection Processes: Analysing the role of AI in automation", "Physical Sciences")
    ).toBe(true);
  });

  it("drops out-of-scope collisions that share only one incidental word", () => {
    expect(
      isRelevantResult(RECRUIT_Q, "Cancer chemotherapy and beyond: Current status, drug candidates, associated risks and progress", "Health Sciences")
    ).toBe(false);
    expect(
      isRelevantResult(RECRUIT_Q, "Context-specific regulation of extracellular vesicle biogenesis and cargo selection", "Life Sciences")
    ).toBe(false);
    expect(
      isRelevantResult(RECRUIT_Q, "Questioning the AI: Informing Design Practices for Explainable AI User Experiences", "Physical Sciences")
    ).toBe(false);
    expect(
      isRelevantResult(REMOTE_Q, "Unmanned aerial systems for photogrammetry and remote sensing: A review", "Physical Sciences")
    ).toBe(false);
  });

  it("does not filter single-concept queries (too little to judge)", () => {
    expect(isRelevantResult("wellbeing", "Cancer chemotherapy drug candidates", "Health Sciences")).toBe(true);
  });

  it("keeps a result when the topic domain is unknown but the title matches", () => {
    expect(isRelevantResult(RECRUIT_Q, "A study of recruitment and selection practice", null)).toBe(true);
  });

  it("drops a result when the topic domain is unknown and the title does not match", () => {
    expect(isRelevantResult(RECRUIT_Q, "A study of photosynthesis in maize", null)).toBe(false);
  });
});

describe("conceptRoots stemming", () => {
  it("unifies the inflected forms that appear in titles vs decoded query terms", () => {
    const same = (a: string, b: string) => {
      const ra = [...conceptRoots(a)][0];
      const rb = [...conceptRoots(b)][0];
      expect(ra).toBe(rb);
    };
    same("recruitment", "recruiting");
    same("selection", "selecting");
    same("candidate", "candidates");
    same("experience", "experiences");
    same("working", "work");
  });

  it("strips generic words so they carry no topic signal", () => {
    expect(conceptRoots("The impact of a study review").size).toBe(0);
  });
});
