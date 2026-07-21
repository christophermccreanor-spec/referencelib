import { QuestionComponent } from "@/lib/types";

const STOPWORDS = new Set([
  "the", "a", "an", "of", "and", "or", "to", "for", "in", "on", "with", "your", "you",
  "is", "are", "be", "how", "what", "why", "does", "do", "their", "its", "as", "at",
  "by", "from", "that", "this", "these", "those", "into", "using", "based",
]);

const COMMAND_VERBS = [
  "critically evaluate", "evaluate", "assess", "analyse", "compare", "contrast",
  "discuss", "explore", "consider", "recommend", "propose", "design", "develop",
  "justify", "outline", "define", "identify", "describe", "explain", "apply", "examine", "critique",
];

// Rule-based, no AI: split the question on command verbs and "and", extract
// noun-ish phrases as core concepts, and generate grouped search terms per
// component rather than searching the raw sentence, per architecture doc
// section 4.
export function extractComponents(question: string): QuestionComponent[] {
  const components: QuestionComponent[] = [];
  const lower = question.toLowerCase();

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
    const words = clause
      .split(/\s+/)
      .filter((w) => w.length > 2 && !STOPWORDS.has(w));
    if (words.length === 0) continue;

    // Group into short noun phrases (2-4 words) as core concepts rather than
    // treating every remaining word as its own component.
    const phrase = words.slice(0, 6).join(" ");
    if (phrase.length < 4) continue;

    const label = phrase
      .split(" ")
      .slice(0, 4)
      .join(" ");

    components.push({
      label,
      type: "concept",
      evidenceNeeded: "Established theory, conceptual literature and, where available, empirical studies.",
      searchTerms: buildSearchTerms(label),
    });
  }

  // De-duplicate near-identical components.
  const seen = new Set<string>();
  const deduped = components.filter((c) => {
    const key = c.label.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  return deduped.slice(0, 6);
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
