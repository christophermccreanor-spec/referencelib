import { CitationRecord, SavedReference } from "@/lib/types";
import { evidenceCardToCitationRecord, isLegacyEvidenceCard } from "@/lib/citation/csl/adapter";

// Anonymous local storage only, per blueprint section 9: nothing saved here
// ever reaches the server. This is the entire "account" a free student needs
// for search, saving and citations.
const STORAGE_KEY = "referencelib:saved-references";
const PROJECT_KEY = "referencelib:project-name";
const INTRO_SEEN_KEY = "referencelib:seen-intro";

// Gates the first-visit welcome tour (components/WelcomeTour.tsx) so it
// shows once per browser, not on every visit. Fails open (treated as
// "already seen") if storage is unavailable, since a broken tour flag
// must never trap a returning student behind the tour every time.
export function hasSeenIntro(): boolean {
  if (typeof window === "undefined") return true;
  try {
    return window.localStorage.getItem(INTRO_SEEN_KEY) === "1";
  } catch {
    return true;
  }
}

export function markIntroSeen(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(INTRO_SEEN_KEY, "1");
  } catch {
    // Ignore: worst case the tour reappears next visit, which is harmless.
  }
}

// --- Multi-project support -------------------------------------------------
//
// Added so a student juggling more than one module or research task in the
// same browser does not overwrite one assignment's saved references with
// another's. Still entirely local storage, no account, no server: a browser
// now holds several named "projects", each with its own saved-reference
// list, and one of them is marked active at a time. Everything below this
// point (loadSavedReferences, saveSavedReferences, loadProjectName,
// saveProjectName) reads and writes whichever project is currently active,
// so existing call sites elsewhere in the app did not need to change.
export interface ProjectSummary {
  id: string;
  name: string;
  referenceCount: number;
  updatedAt: string;
}

interface ProjectIndexEntry {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

const PROJECTS_INDEX_KEY = "referencelib:projects";
const ACTIVE_PROJECT_KEY = "referencelib:active-project";

function projectReferencesKey(id: string): string {
  return `referencelib:project:${id}:references`;
}

function generateProjectId(): string {
  return `p_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function readProjectIndex(): ProjectIndexEntry[] | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(PROJECTS_INDEX_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as ProjectIndexEntry[];
  } catch {
    return null;
  }
}

function writeProjectIndex(index: ProjectIndexEntry[]): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(PROJECTS_INDEX_KEY, JSON.stringify(index));
}

// Moves a student who used ReferenceLib before multi-project support
// existed (a single reference list under STORAGE_KEY, one project name
// under PROJECT_KEY) into the new model as their first project, with zero
// loss: their saved references and project name both carry over exactly
// as they were. Runs at most once per browser: after this, the presence
// of PROJECTS_INDEX_KEY is what every other function checks, so a second
// call is always a no-op, even for a brand new browser with nothing to
// migrate.
function ensureMigrated(): ProjectIndexEntry[] {
  const existing = readProjectIndex();
  if (existing) return existing;
  if (typeof window === "undefined") return [];

  let legacyRefs: SavedReference[] = [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) legacyRefs = JSON.parse(raw) as SavedReference[];
  } catch {
    legacyRefs = [];
  }
  const legacyName = window.localStorage.getItem(PROJECT_KEY) ?? "My assignment";

  const id = generateProjectId();
  const now = new Date().toISOString();
  const index: ProjectIndexEntry[] = [{ id, name: legacyName, createdAt: now, updatedAt: now }];

  window.localStorage.setItem(projectReferencesKey(id), JSON.stringify(legacyRefs));
  writeProjectIndex(index);
  window.localStorage.setItem(ACTIVE_PROJECT_KEY, id);

  return index;
}

export function getActiveProjectId(): string {
  if (typeof window === "undefined") return "";
  const index = ensureMigrated();
  const stored = window.localStorage.getItem(ACTIVE_PROJECT_KEY);
  if (stored && index.some((p) => p.id === stored)) return stored;
  // Active pointer missing or stale (its project was deleted, or this is
  // the very first load): fall back to the first project rather than
  // leaving the app pointed at nothing.
  const fallback = index[0]?.id ?? "";
  if (fallback) window.localStorage.setItem(ACTIVE_PROJECT_KEY, fallback);
  return fallback;
}

export function setActiveProjectId(id: string): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(ACTIVE_PROJECT_KEY, id);
}

export function listProjects(): ProjectSummary[] {
  if (typeof window === "undefined") return [];
  const index = ensureMigrated();
  return index
    .map((entry) => {
      let count = 0;
      try {
        const raw = window.localStorage.getItem(projectReferencesKey(entry.id));
        count = raw ? (JSON.parse(raw) as SavedReference[]).length : 0;
      } catch {
        count = 0;
      }
      return { id: entry.id, name: entry.name, referenceCount: count, updatedAt: entry.updatedAt };
    })
    .sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1));
}

export function createProject(name: string): string {
  const index = ensureMigrated();
  const id = generateProjectId();
  const now = new Date().toISOString();
  const trimmed = name.trim() || "New project";
  writeProjectIndex([...index, { id, name: trimmed, createdAt: now, updatedAt: now }]);
  if (typeof window !== "undefined") {
    window.localStorage.setItem(projectReferencesKey(id), JSON.stringify([]));
    window.localStorage.setItem(ACTIVE_PROJECT_KEY, id);
  }
  return id;
}

function renameActiveProject(name: string): void {
  const index = ensureMigrated();
  const activeId = getActiveProjectId();
  const trimmed = name.trim() || "My assignment";
  const next = index.map((p) =>
    p.id === activeId ? { ...p, name: trimmed, updatedAt: new Date().toISOString() } : p
  );
  writeProjectIndex(next);
}

// Deleting the project a student is currently looking at must never leave
// the app pointed at a project that no longer exists: this switches to
// whichever project is now first in the list, or creates one fresh empty
// project if that was the very last one, so the app is never left with
// zero projects to show.
export function deleteProject(id: string): string {
  const index = ensureMigrated();
  const remaining = index.filter((p) => p.id !== id);
  if (typeof window !== "undefined") {
    window.localStorage.removeItem(projectReferencesKey(id));
  }

  if (remaining.length === 0) {
    const now = new Date().toISOString();
    const newId = generateProjectId();
    writeProjectIndex([{ id: newId, name: "My assignment", createdAt: now, updatedAt: now }]);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(projectReferencesKey(newId), JSON.stringify([]));
      window.localStorage.setItem(ACTIVE_PROJECT_KEY, newId);
    }
    return newId;
  }

  writeProjectIndex(remaining);
  const activeId = getActiveProjectId();
  if (activeId === id || !remaining.some((p) => p.id === activeId)) {
    const fallback = remaining[0].id;
    if (typeof window !== "undefined") window.localStorage.setItem(ACTIVE_PROJECT_KEY, fallback);
    return fallback;
  }
  return activeId;
}

function touchActiveProjectUpdatedAt(): void {
  if (typeof window === "undefined") return;
  const index = readProjectIndex();
  if (!index) return;
  const activeId = window.localStorage.getItem(ACTIVE_PROJECT_KEY);
  if (!activeId) return;
  writeProjectIndex(
    index.map((p) => (p.id === activeId ? { ...p, updatedAt: new Date().toISOString() } : p))
  );
}

// --- End multi-project support ---------------------------------------------

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
    const id = getActiveProjectId();
    if (!id) return [];
    const raw = window.localStorage.getItem(projectReferencesKey(id));
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
  const id = getActiveProjectId();
  if (!id) return;
  window.localStorage.setItem(projectReferencesKey(id), JSON.stringify(refs));
  touchActiveProjectUpdatedAt();
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
  const index = ensureMigrated();
  const id = getActiveProjectId();
  return index.find((p) => p.id === id)?.name ?? "My assignment";
}

export function saveProjectName(name: string): void {
  renameActiveProject(name);
}

// Lightweight file-based portability, in place of an account system (see
// README, "What is not built yet"): a saved-reference list lives only in
// this browser's local storage, so moving it to another device or browser
// means exporting it to a file here and importing that same file there.
// Export/import both operate on the active project only.

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
