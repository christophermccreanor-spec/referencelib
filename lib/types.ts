export type BloomStage =
  | "remember"
  | "understand"
  | "apply"
  | "analyse"
  | "evaluate"
  | "create";

export type VerbConfidence = "high" | "institution-dependent";

export interface CommandVerbMatch {
  verb: string;
  bloomStages: BloomStage[];
  confidence: VerbConfidence;
  note: string;
}

export type QualificationProfileId =
  | "cipd-3"
  | "cipd-5"
  | "cipd-7"
  | "undergraduate"
  | "postgraduate-diploma"
  | "masters"
  | "doctoral"
  | "custom";

export interface QualificationProfile {
  id: QualificationProfileId;
  label: string;
  expectation: string;
  evidenceHierarchy: string[];
}

export interface QuestionComponent {
  label: string;
  type: "concept" | "constraint" | "output-requirement";
  evidenceNeeded: string;
  searchTerms: string[];
}

export interface DecodedQuestion {
  question: string;
  qualificationProfileId: QualificationProfileId;
  commandVerbs: CommandVerbMatch[];
  bloomSequence: BloomStage[];
  components: QuestionComponent[];
  qualificationExpectation: string;
  searchTerms: string[];
}

export type PeerReviewLabel = "verified" | "likely" | "unknown";
export type OpenAccessStatus = "open" | "closed" | "unknown";
export type SourceVersion = "version-of-record" | "accepted-manuscript" | "preprint" | "unknown";

export interface EvidenceCardData {
  id: string;
  title: string;
  authors: string[];
  year: number | null;
  journal: string | null;
  doi: string | null;
  sourceType: string;
  peerReview: PeerReviewLabel;
  openAccess: OpenAccessStatus;
  version: SourceVersion;
  fullTextUrl: string | null;
  linkCheckedAt: string;
  method: string | null;
  isPreprint: boolean;
  // Added alongside the citeproc-js migration (task #38) to fix a real bug
  // found during testing: without these, the official Harvard Cite Them
  // Right CSL style reads a journal article as lacking full publication
  // data and mislabels it "[Preprint]" in the reference list, even for a
  // fully published article. OpenAlex's `biblio` field carries this data;
  // it was simply not being read before.
  volume?: string | null;
  issue?: string | null;
  page?: string | null;
}

// Deliberately restricted to the two styles most UK and international
// universities actually ask for (decision recorded in
// planning/05-deployment-plan.md, July 2026): Harvard (Cite Them Right) for
// UK/Europe and APA 7th edition for the US and most GCC/Gulf and Asian
// universities following US convention. MLA, Vancouver and IEEE were
// dropped, not because they don't matter in principle, but because
// bundling their CSL style files pushed a single deployment over what this
// environment can reliably send in one call, which caused repeated broken
// deployments. Both remaining styles render text, not html, and are
// resolved by lib/citation/csl/engine.ts: Harvard from a small bundled
// file, APA fetched once from the official CSL style repository and
// cached in memory. Kept here, not in the citeproc-js engine module,
// because that module reads files from disk (Node-only) and must never be
// imported into client-side code; this file is imported by both client
// components and server routes, so it is the correct single source of
// truth for the style list.
export type ReferencingStyle = "harvard-cite-them-right" | "apa";

export const REFERENCING_STYLE_LABELS: Record<ReferencingStyle, string> = {
  "harvard-cite-them-right": "Harvard (Cite Them Right)",
  apa: "APA 7th edition",
};

// The source types the manual entry form (task #39) covers, beyond the
// journal articles the free search already finds. Matches CIPD's own
// evidence hierarchy (peer-reviewed journals, books, CIPD/government
// publications, international-body reports) while staying broad enough for
// non-CIPD students and professionals, per Christopher's direction that the
// tool serves all students, not one qualification.
export type SourceType = "article-journal" | "book" | "webpage" | "report";

export const SOURCE_TYPE_LABELS: Record<SourceType, string> = {
  "article-journal": "Journal article",
  book: "Book",
  webpage: "Website",
  report: "Report (government, CIPD, or international body)",
};

// A CSL-JSON author name. `literal` is for organisational/corporate authors
// (a government department, CIPD, the ILO), which is common for the report
// source type and must not be forced into family/given fields it doesn't
// have.
export interface CslName {
  family?: string;
  given?: string;
  literal?: string;
}

export interface CslDate {
  "date-parts": number[][];
}

// Credibility signalling extended to every source type, not just journal
// articles. Christopher's explicit concern: "CIPD sources are not always
// correct and we have to make sure they are correct." PeerReviewLabel above
// stays journal-article-specific (it already exists throughout the search
// UI); this is the general-purpose version used for book, website and
// report sources, where "peer review" as a concept does not apply but
// source reliability still needs a signal.
export type SourceCredibility = "verified" | "likely" | "unverified";

export const CREDIBILITY_LABELS: Record<SourceCredibility, string> = {
  verified: "Verified credible source",
  likely: "Likely credible source",
  unverified: "Credibility not verified — check independently",
};

// The canonical citation record used everywhere once a source is saved:
// CSL-JSON fields directly (so citeproc-js renders it with no translation
// step), plus a small amount of ReferenceLib-only metadata for the UI and
// credibility signalling. Journal-article search results still arrive as
// EvidenceCardData (OpenAlex's natural shape) and are converted to this
// shape only once saved, via evidenceCardToCitationRecord in
// lib/citation/csl/adapter.ts. Manual entry (task #39) for book, website
// and report sources builds this shape directly.
export interface CitationRecord {
  id: string;
  type: SourceType;
  title: string;
  author: CslName[];
  issued?: CslDate;
  accessed?: CslDate;
  "container-title"?: string;
  publisher?: string;
  "publisher-place"?: string;
  volume?: string;
  issue?: string;
  page?: string;
  DOI?: string;
  URL?: string;
  ISBN?: string;
  edition?: string;
  genre?: string;
  number?: string;

  // ReferenceLib-only metadata, not part of CSL-JSON.
  credibility: SourceCredibility;
  openAccess?: OpenAccessStatus;
  fullTextUrl?: string | null;
  linkCheckedAt?: string;
  method?: string | null;
}

export interface SavedReference {
  id: string;
  addedAt: string;
  assignedTo: string | null;
  evidence: CitationRecord;
}

export interface CrossrefVerification {
  found: boolean;
  title?: string;
  journal?: string;
  year?: number;
  doi?: string;
}

export type VerifyResponse =
  | ({ method: "doi" } & CrossrefVerification)
  | { method: "title-search"; candidates: CrossrefVerification[] };
