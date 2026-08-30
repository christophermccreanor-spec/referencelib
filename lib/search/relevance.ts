// Topic-relevance gate for evidence search.
//
// Found in the 30 August 2026 audit: broad OpenAlex full-text search let a
// single incidental word pull in off-topic work — a cancer-chemotherapy paper
// under "candidate", a molecular-biology paper under "selection", a drone
// remote-sensing review under "remote". These rank surprisingly high and are
// useless for a CIPD/HR assignment.
//
// Two signals separate real matches from collisions, and a result must pass
// EITHER:
//   1. Its primary topic is in scope (OpenAlex "Social Sciences" domain, which
//      is where Business & Management, Psychology and Economics all live).
//   2. Its title shares at least two distinct query-concept roots — enough to
//      rescue genuinely relevant work that OpenAlex mis-tags into another
//      domain (e.g. an AI-in-recruitment paper filed under Computer Science),
//      while a one-incidental-word collision never clears the bar.
//
// Deliberately lenient in two ways, to avoid throwing away good evidence:
// single-concept queries are not filtered at all (one word is too little to
// judge topicality), and any in-scope-domain result is kept regardless of
// title wording.

const IN_SCOPE_DOMAINS = new Set(["Social Sciences"]);

// Generic words that carry no topic signal, so they neither define a query
// concept nor count as a title match. Kept short on purpose: over-stripping
// risks discarding real concepts.
const STOPWORDS = new Set([
  "the", "and", "for", "with", "from", "into", "this", "that", "these", "those",
  "study", "studies", "research", "review", "analysis", "impact", "effect",
  "effects", "role", "roles", "using", "based", "approach", "approaches",
  "evidence", "case", "cases", "new", "use", "uses", "among", "between",
  "toward", "towards", "within", "their", "there", "have", "has", "are",
  "two", "three", "intervention", "interventions", "systematic", "literature",
]);

// A light two-phase stemmer: enough to unify the inflected forms that show up
// in titles vs. decoded query terms (recruitment/recruiting -> recruit,
// selection/selecting -> select, candidate/candidates -> candidate,
// experience/experiences -> experi, working/work -> work). Not linguistically
// complete, just consistent: the only requirement is that a query word and its
// title counterpart reduce to the same root.
//
// Phase 1 removes a plural "s"/"es" (guarding genuine -ss/-us/-is endings like
// business/status/analysis). Phase 2 removes one derivational suffix. Doing
// plurals first is what keeps candidate/candidates aligned: a naive one-pass
// list strips the longer "es" and yields "candidat".
function stem(word: string): string {
  let w = word;

  // Phase 1: de-pluralise.
  if (/(?:ss|us|is)$/.test(w)) {
    // keep: business, status, analysis, process ...
  } else if (/(?:ches|shes|xes|zes|ses)$/.test(w)) {
    w = w.slice(0, -2);
  } else if (/ies$/.test(w) && w.length > 4) {
    w = w.slice(0, -3) + "y";
  } else if (/s$/.test(w)) {
    w = w.slice(0, -1); // candidates -> candidate, systems -> system
  }

  // Phase 2: one derivational suffix, longest first.
  const suffixes = [
    "ational", "ization", "isation", "ements", "ement", "ances", "ance",
    "ences", "ence", "ments", "ment", "ings", "ing", "ity", "ers", "ion",
    "ant", "ent", "est", "ed", "ly", "er",
  ];
  for (const s of suffixes) {
    if (w.endsWith(s) && w.length - s.length >= 4) {
      return w.slice(0, -s.length);
    }
  }
  return w;
}

export function conceptRoots(text: string): Set<string> {
  const roots = new Set<string>();
  for (const raw of (text.toLowerCase().match(/[a-z]+/g) ?? [])) {
    if (raw.length < 4 || STOPWORDS.has(raw)) continue;
    roots.add(stem(raw));
  }
  return roots;
}

// Returns true if a result should be shown for this query. `query` is the same
// space-joined search string sent to OpenAlex; `title` and `topicDomain` come
// from the work. A missing topic domain simply means the title test decides.
export function isRelevantResult(
  query: string,
  title: string | null,
  topicDomain: string | null | undefined
): boolean {
  const queryRoots = conceptRoots(query);
  // Too little to judge on: never filter a one-concept search.
  if (queryRoots.size < 2) return true;

  if (topicDomain && IN_SCOPE_DOMAINS.has(topicDomain)) return true;

  const titleRoots = conceptRoots(title ?? "");
  let overlap = 0;
  for (const root of queryRoots) {
    if (titleRoots.has(root)) overlap += 1;
    if (overlap >= 2) return true;
  }
  return false;
}
