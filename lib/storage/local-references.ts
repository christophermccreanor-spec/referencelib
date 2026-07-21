import { CitationRecord, SavedReference } from "@/lib/types";
import { evidenceCardToCitationRecord, isLegacyEvidenceCard } from "@/lib/citation/csl/adapter";

// Anonymous local storage only, per blueprint section 9: nothing saved here
// ever reaches the server. This is the entire "account" a free student needs
// for search, saving and citations.
const STORAGE_KEY = "referencelib:saved-references";
const PROJECT_KEY = "referencelib:project-name";

// Converts any reference saved under the pre-task-#38 data model (evidence
// stored as a plain EvidenceCardData, with `authors: string[]` and no CSL
// `author` field) into the current CitationRecord shape, in place, on load.
// This is what keeps a pilot student's already-saved references working
// after this update, without asking them to re-add anything.
function migrateLegacyReference(ref: SavedReference): SavedReference {
  if (!isLegacyEvidenceCard(ref.evidence)) return ref;
  return { ...ref, evidence: evidenceCardToCitationRecord(ref.evidence) };
}

export function loadSavedReferences(): SavedReference[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as SavedReference[];
    const migrated = parsed.map(migrateLegacyReference);
    // Persist the migration immediately so it only ever runs once per
    // browser, rather than re-checking on every load.
    if (migrated.some((ref, i) => ref !== parsed[i])) {
      saveSavedReferences(migrated);
    }
    return migrated;
  } catch {
    return [];
  }
}

export function saveSavedReferences(refs: SavedReference[]): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(refs));
}

export function addSavedReference(evidence: CitationRecord, assignedTo: string | null): SavedReference[] {
  const current = loadSavedReferences();
  if (current.some((r) => r.evidence.id === evidence.id)) return current;
  const next: SavedReference[] = [
    ...current,
    { id: evidence.id, addedAt: new Date().toISOString(), assignedTo, evidence },
  ];
  saveSavedReferences(next);
  return next;
}

export function removeSavedReference(id: string): SavedReference[] {
  const next = loadSavedReferences().filter((r) => r.id !== id);
  saveSavedReferences(next);
  return next;
}

export function loadProjectName(): string {
  if (typeof window === "undefined") return "My assignment";
  return window.localStorage.getItem(PROJECT_KEY) ?? "My assignment";
}

export function saveProjectName(name: string): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(PROJECT_KEY, name);
}
