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

// Lightweight file-based portability, in place of an account system (see
// README, "What is not built yet"): a saved-reference list lives only in
// this browser's local storage, so moving it to another device or browser
// means exporting it to a file here and importing that same file there.

interface ExportedReferenceFile {
  version: 1;
  exportedAt: string;
  projectName: string;
  references: SavedReference[];
}

export function exportReferencesToFile(refs: SavedReference[], projectName: string): void {
  if (typeof window === "undefined") return;
  const payload: ExportedReferenceFile = {
    version: 1,
    exportedAt: new Date().toISOString(),
    projectName,
    references: refs,
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "referencelib-export.json";
  a.click();
  URL.revokeObjectURL(url);
}

export interface ImportResult {
  merged: SavedReference[];
  addedCount: number;
  skippedCount: number;
  error: string | null;
}

function isPlausibleSavedReference(item: unknown): item is SavedReference {
  if (!item || typeof item !== "object") return false;
  const r = item as Partial<SavedReference>;
  if (typeof r.id !== "string" || !r.evidence || typeof r.evidence !== "object") return false;
  // A legacy evidence card and a current CitationRecord both carry a
  // string title, so this check accepts either shape; migrateLegacyReference
  // below normalises whichever one came in.
  return typeof (r.evidence as { title?: unknown }).title === "string";
}

// Parses a file previously produced by exportReferencesToFile (or a bare
// array of the same shape) and merges it into the current saved-reference
// list. Existing references always win on id collision: an import can only
// add references, never overwrite ones already saved on this device.
export function importReferencesFromJson(raw: string, current: SavedReference[]): ImportResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return {
      merged: current,
      addedCount: 0,
      skippedCount: 0,
      error: "That file is not valid JSON. Use “Export references” to create one, then import that exact file.",
    };
  }

  const candidates: unknown[] | null = Array.isArray(parsed)
    ? parsed
    : parsed && typeof parsed === "object" && Array.isArray((parsed as { references?: unknown }).references)
      ? (parsed as { references: unknown[] }).references
      : null;

  if (!candidates) {
    return {
      merged: current,
      addedCount: 0,
      skippedCount: 0,
      error: "That file does not look like a ReferenceLib export.",
    };
  }

  const existingIds = new Set(current.map((r) => r.id));
  const additions: SavedReference[] = [];
  let skipped = 0;

  for (const item of candidates) {
    if (!isPlausibleSavedReference(item)) {
      skipped++;
      continue;
    }
    const ref = migrateLegacyReference(item);
    if (existingIds.has(ref.id)) {
      skipped++;
      continue;
    }
    existingIds.add(ref.id);
    additions.push(ref);
  }

  if (additions.length === 0) {
    return {
      merged: current,
      addedCount: 0,
      skippedCount: skipped,
      error:
        skipped > 0
          ? "Every reference in that file is already saved on this device."
          : "No references were found in that file.",
    };
  }

  const merged = [...current, ...additions];
  saveSavedReferences(merged);
  return { merged, addedCount: additions.length, skippedCount: skipped, error: null };
}
