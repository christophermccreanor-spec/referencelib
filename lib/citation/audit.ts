// Rule-based citation audit, no AI, per architecture doc section 4 ("Check
// citations"): the launch version compares the student's reference list
// against in-text citation markers pasted alongside it and reports
// unmatched entries in either direction. This was previously a stub in the
// UI ("this mode is on the build roadmap"); this is the first working
// version. Full document upload and automated bidirectional audit against a
// real Word/PDF file is still Phase 2 per blueprint section 13, this works
// on pasted plain text only.
//
// Matching is deliberately conservative: first author's surname plus a
// four-digit year (with an optional trailing disambiguator letter, as in
// "2020a"). This will not catch every citation style variant a student
// might paste (numeric styles like IEEE are out of scope, since Harvard and
// APA are the two styles this product supports), and two different authors
// sharing a surname and year will be treated as a match. Both limitations
// are stated in the UI copy rather than hidden.

export interface CitationAuditResult {
  citationCount: number;
  referenceCount: number;
  matchedCount: number;
  unreferencedCitations: string[];
  uncitedReferences: string[];
}

interface ParsedCitation {
  raw: string;
  surname: string;
  year: string;
}

interface ParsedReference {
  raw: string;
  surname: string;
  years: string[];
}

function normaliseSurname(raw: string): string {
  return raw.trim().toLowerCase().replace(/[^a-z]/g, "");
}

// Matches the first author-surname-plus-year inside one parenthetical
// citation segment, e.g. "Smith, 2020", "Smith and Jones, 2020",
// "Smith et al., 2020", "Smith, 2020a".
const CITATION_SEGMENT =
  /([A-Z][A-Za-z'-]+)(?:\s+(?:and|&)\s+[A-Za-z'\-.\s]+|\s+et\s+al\.?)?,?\s*(\d{4}[a-z]?)/;

// Narrative-style citation, e.g. "Smith (2020) argues that...", "Smith and
// Jones (2020) found...", "Ahmed et al. (2019a) revisited...". Here the
// surname sits outside the parentheses and only the year is inside, which
// the parenthetical pattern above cannot see since it only looks at text
// already inside a "(...)" pair. Found missing during test-suite build-out:
// a citation-check tool that only reads "(Surname, Year)" and misses
// "Surname (Year)" would flag every narrative citation in a normal essay as
// unreferenced, which is not acceptable next to paid competitors that
// handle both forms.
const NARRATIVE_CITATION =
  /\b([A-Z][A-Za-z'-]+)(?:\s+(?:and|&)\s+[A-Za-z'\-.\s]+|\s+et\s+al\.?)?\s*\((\d{4}[a-z]?)\)/g;

function extractInTextCitations(text: string): ParsedCitation[] {
  const found: ParsedCitation[] = [];

  const parenRegex = /\(([^()]{4,200})\)/g;
  let match: RegExpExecArray | null;
  while ((match = parenRegex.exec(text)) !== null) {
    const segments = match[1].split(";").map((s) => s.trim());
    for (const segment of segments) {
      const m = segment.match(CITATION_SEGMENT);
      if (m) {
        found.push({ raw: segment, surname: normaliseSurname(m[1]), year: m[2] });
      }
    }
  }

  let narrativeMatch: RegExpExecArray | null;
  NARRATIVE_CITATION.lastIndex = 0;
  while ((narrativeMatch = NARRATIVE_CITATION.exec(text)) !== null) {
    found.push({
      raw: narrativeMatch[0],
      surname: normaliseSurname(narrativeMatch[1]),
      year: narrativeMatch[2],
    });
  }

  return found;
}

function extractReferenceEntries(text: string): ParsedReference[] {
  return text
    .split(/\n+/)
    .map((line) => line.trim())
    .filter((line) => line.length > 8)
    .map((line) => {
      const surnameMatch = line.match(/^([A-Z][A-Za-z'-]+)/);
      const years = Array.from(line.matchAll(/\b(19|20)\d{2}[a-z]?\b/g)).map((m) => m[0]);
      return {
        raw: line,
        surname: surnameMatch ? normaliseSurname(surnameMatch[1]) : "",
        years,
      };
    })
    .filter((r) => r.surname.length > 0);
}

export function auditCitations(assignmentText: string, referenceListText: string): CitationAuditResult {
  const citations = extractInTextCitations(assignmentText);
  const references = extractReferenceEntries(referenceListText);

  const uniqueCitations = new Map<string, ParsedCitation>();
  for (const c of citations) uniqueCitations.set(`${c.surname}__${c.year}`, c);

  const unreferencedCitations: string[] = [];
  for (const c of uniqueCitations.values()) {
    const hasMatch = references.some((r) => r.surname === c.surname && r.years.includes(c.year));
    if (!hasMatch) unreferencedCitations.push(c.raw);
  }

  const uncitedReferences: string[] = [];
  for (const r of references) {
    const hasMatch = citations.some((c) => c.surname === r.surname && r.years.includes(c.year));
    if (!hasMatch) uncitedReferences.push(r.raw);
  }

  return {
    citationCount: uniqueCitations.size,
    referenceCount: references.length,
    matchedCount: uniqueCitations.size - unreferencedCitations.length,
    unreferencedCitations,
    uncitedReferences,
  };
}
