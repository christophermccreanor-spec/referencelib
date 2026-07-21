import { QuestionComponent } from "@/lib/types";

const STOPWORDS = new Set([
  "the", "a", "an", "of", "and", "or", "to", "for", "in", "on", "with", "your", "you",
  "is", "are", "be", "how", "what", "why", "does", "do", "their", "its", "as", "at",
  "by", "from", "that", "this", "these", "those", "into", "using", "based",
  // Instructional/meta words describe how to answer, not what the question
  // is about, so they must never end up inside a concept label or an
  // evidence search term. Added after a live pilot question ("Your response
  // should focus particularly on...") produced the literal search term
  // "response should focus particularly", which returned evidence about an
  // entirely unrelated topic (climate change) instead of the question's own
  // subject. See planning/05-deployment-plan.md.
  "response", "should", "must", "will", "shall", "particularly", "focus",
  "ensure", "need", "needs", "make", "sure", "clearly", "fully", "answer",
  "submission", "also", "further",
]);

const COMMAND_VERBS = [
  "critically evaluate", "evaluate", "assess", "analyse", "compare", "contrast",
  "discuss", "explore", "consider", "recommend", "propose", "design", "develop",
  "justify", "outline", "define", "identify", "describe", "explain", "apply", "examine", "critique",
];

// Common assignment-brief scaffolding that introduces the real content
// further into the sentence (e.g. "Your response should focus particularly
// on X"). Stripped wholesale, case-insensitively, before concept extraction
// so the instructional stem itself is never mistaken for a concept, and the
// words that follow it are read as the start of a clause in their own
// right rather than a continuation of "should focus...".
const INSTRUCTION_LEAD_INS = [
  /\byour\s+(?:response|answer|work|submission)\s+(?:should|must|is\s+expected\s+to|needs?\s+to)\s+(?:also\s+)?(?:focus\s+(?:particularly\s+)?on|address|cover|consider|include|discuss|examine|explore)\b/gi,
  /\byou\s+(?:should|must|need\s+to)\s+(?:also\s+)?(?:focus\s+(?:particularly\s+)?on|consider|address|include|discuss|examine|explore)\b/gi,
  /\b(?:consideration|attention)\s+should\s+be\s+given\s+to\b/gi,
  /\bmake\s+sure\s+(?:you|your\s+answer|your\s+response)\s+(?:also\s+)?(?:cover|address|include|discuss)s?\b/gi,
];

// Rule-based, no AI: strip instructional scaffolding, assessment-criteria
// references and the scenario organisation's name, split the question on
// command verbs and list structure (commas, "and"), and extract short
// noun-ish phrases as core concepts, generating grouped search terms per
// component rather than searching the raw sentence, per architecture doc
// section 4.
export function extractComponents(question: string): QuestionComponent[] {
  const components: QuestionComponent[] = [];

  // Assessment-criteria references like "(AC 1.3)" are metadata about the
  // assignment brief, not part of the question's subject matter.
  let cleaned = question.replace(/\([^)]*\)/g, " ");
  for (const pattern of INSTRUCTION_LEAD_INS) {
    cleaned = cleaned.replace(pattern, " ");
  }
  // A scenario organisation named mid-sentence ("...engagement at
  // Portstride") is never itself something to find peer-reviewed evidence
  // about, so it is dropped before word-casing destroys the capitalisation
  // signal that identifies it as a proper noun.
  cleaned = cleaned.replace(/\bat\s+[A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+){0,3}\b/g, " ");

  const lower = cleaned.toLowerCase();

  let remainder = lower;
  for (const verb of COMMAND_VERBS) {
    remainder = remainder.split(verb).join(" | ");
  }
  const clauses = remainder
    .split(/[|.;]/)
    .map((c) => c.trim())
    .filter((c) => c.length > 3);

  const numberWordMatch = lower.match(/\b(two|three|four|five|\d+)\s+([a-z][a-z\s]{2,40})/);
  if (numberWordMatch) {
    components.push({
      label: `${numberWordMatch[1]} ${numberWordMatch[2]}`.trim(),
      type: "output-requirement",
      evidenceNeeded: "Exactly the stated number of distinct, defensible items.",
      searchTerms: [],
    });
  }

  for (const clause of clauses) {
    // Split on list structure ("attraction, retention and engagement") so
    // each item becomes its own concept instead of one phrase truncated
    // partway through the list, which is what previously produced
    // fragments like "impact demographic change shifting".
    const segments = clause
      .split(/,| and /)
      .map((s) => s.trim())
      .filter(Boolean);

    for (const segment of segments) {
      const words = segment
        .split(/\s+/)
        .map((w) => w.replace(/[,;:.]+$/, ""))
        .filter((w) => w.length > 2 && !STOPWORDS.has(w));
      if (words.length === 0) continue;

      // A safety cap for the rare segment that is still a long run-on
      // phrase after list-splitting; genuine list items are almost always
      // shorter than this.
      const label = words.slice(0, 6).join(" ");
      if (label.length < 4) continue;

      components.push({
        label,
        type: "concept",
        evidenceNeeded: "Established theory, conceptual literature and, where available, empirical studies.",
        searchTerms: buildSearchTerms(label),
      });
    }
  }

  // De-duplicate near-identical components.
  const seen = new Set<string>();
  const deduped = components.filter((c) => {
    const key = c.label.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  return deduped.slice(0, 8);
}

function buildSearchTerms(phrase: string): string[] {
  const base = phrase.trim();
  const terms = [base];
  // Simple academic-synonym scaffolding. Deliberately small at launch; grows
  // as real pilot questions reveal gaps, per architecture doc section 5.
  const synonymPairs: [RegExp, string][] = [
    [/culture/i, "organisational climate"],
    [/wellbeing/i, "psychological wellbeing"],
    [/employee/i, "worker"],
    [/leadership/i, "management style"],
    [/performance/i, "outcomes"],
    [/motivation/i, "engagement"],
  ];
  for (const [pattern, synonym] of synonymPairs) {
    if (pattern.test(base) && !base.toLowerCase().includes(synonym)) {
      terms.push(base.replace(pattern, synonym));
    }
  }
  return Array.from(new Set(terms));
}
