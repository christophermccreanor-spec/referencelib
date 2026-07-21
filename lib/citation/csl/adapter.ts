import { CitationRecord, CslName, EvidenceCardData, PeerReviewLabel, SourceCredibility } from "@/lib/types";
import { CslJsonItem } from "./engine";

// Splits a plain "Given Family" string (the shape OpenAlex/Crossref/DOAJ
// author names already come back as) into CSL-JSON's { family, given }
// fields. This is a pragmatic heuristic, not a full name-parsing library:
// it matches how the current app already stores author names, so existing
// saved references convert without needing to re-fetch anything.
export function splitAuthorName(name: string): CslName {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return { family: parts[0] };
  const family = parts[parts.length - 1];
  const given = parts.slice(0, -1).join(" ");
  return { family, given };
}

// Maps the journal-article-specific peer-review signal already shown on
// search results onto the general-purpose credibility label used once a
// source is saved, across all source types. Journal articles found through
// the free search (OpenAlex/Crossref/DOAJ) are treated as at least "likely"
// credible even when peer-review status could not be confirmed, since they
// come from indexed scholarly databases; "unverified" is reserved for
// sources with no such check at all, such as manually entered websites.
function peerReviewToCredibility(peerReview: PeerReviewLabel): SourceCredibility {
  if (peerReview === "verified") return "verified";
  if (peerReview === "likely") return "likely";
  return "likely";
}

/**
 * Converts a journal-article EvidenceCardData record (the shape produced by
 * the OpenAlex/Crossref/DOAJ search) into the canonical CitationRecord used
 * once a source is saved. This is the only place volume/issue/page from
 * OpenAlex's biblio field reach the citation record, which is what fixes
 * the "[Preprint]" mislabelling: without them, the Harvard Cite Them Right
 * style reads the source as lacking full publication data.
 */
export function evidenceCardToCitationRecord(card: EvidenceCardData): CitationRecord {
  return {
    id: card.id,
    type: "article-journal",
    title: card.title,
    author: card.authors.map(splitAuthorName),
    issued: card.year ? { "date-parts": [[card.year]] } : undefined,
    "container-title": card.journal ?? undefined,
    volume: card.volume ?? undefined,
    issue: card.issue ?? undefined,
    page: card.page ?? undefined,
    DOI: card.doi ?? undefined,
    URL: card.fullTextUrl ?? undefined,
    credibility: peerReviewToCredibility(card.peerReview),
    openAccess: card.openAccess,
    fullTextUrl: card.fullTextUrl,
    linkCheckedAt: card.linkCheckedAt,
    method: card.method,
  };
}

/**
 * Converts a saved CitationRecord into the plain CSL-JSON shape citeproc-js
 * consumes. CitationRecord is already CSL-JSON-shaped for the fields that
 * matter to rendering; this strips the ReferenceLib-only metadata fields
 * (credibility, openAccess, fullTextUrl, linkCheckedAt, method) that
 * citeproc-js does not know about and does not need.
 */
export function citationRecordToCslJson(record: CitationRecord): CslJsonItem {
  return {
    id: record.id,
    type: record.type,
    title: record.title,
    author: record.author,
    issued: record.issued,
    accessed: record.accessed,
    "container-title": record["container-title"],
    publisher: record.publisher,
    "publisher-place": record["publisher-place"],
    volume: record.volume,
    issue: record.issue,
    page: record.page,
    DOI: record.DOI,
    URL: record.URL,
    ISBN: record.ISBN,
    edition: record.edition,
    genre: record.genre,
    number: record.number,
  };
}

// A pre-migration SavedReference.evidence, as it exists in a pilot tester's
// browser localStorage before this data-model change: an EvidenceCardData
// with a plural `authors: string[]` field and no CSL-shaped `author` field
// at all. Used only to detect the old shape on load so it can be converted
// automatically, without losing anything a student has already saved.
export function isLegacyEvidenceCard(value: unknown): value is EvidenceCardData {
  if (!value || typeof value !== "object") return false;
  const record = value as Record<string, unknown>;
  return Array.isArray(record.authors) && !("author" in record);
}
