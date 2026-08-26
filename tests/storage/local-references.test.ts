import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  addSavedReference,
  createProject,
  deleteProject,
  getActiveProjectId,
  hasSeenIntro,
  listProjects,
  loadProjectName,
  loadSavedReferences,
  markIntroSeen,
  saveProjectName,
  setActiveProjectId,
} from "@/lib/storage/local-references";
import { CitationRecord } from "@/lib/types";

// Covers the welcome-tour visibility flag and the multi-project storage
// layer (components: the project switcher in SavedReferencePanel.tsx and
// app/page.tsx). The vitest environment here is "node" (see
// vitest.config.mts), so `window` does not exist by default; a tiny
// in-memory localStorage stand-in is stubbed in per test rather than
// pulling in jsdom for this one file.
function createMemoryLocalStorage(seed: Record<string, string> = {}) {
  const store = new Map<string, string>(Object.entries(seed));
  return {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => void store.set(key, value),
    removeItem: (key: string) => void store.delete(key),
    clear: () => store.clear(),
  };
}

function fakeCitation(id: string): CitationRecord {
  return {
    id,
    type: "article-journal",
    title: `Test source ${id}`,
    author: [{ family: "Smith", given: "Jo" }],
    issued: { "date-parts": [[2023]] },
  } as unknown as CitationRecord;
}

describe("welcome tour seen flag", () => {
  beforeEach(() => {
    vi.stubGlobal("window", { localStorage: createMemoryLocalStorage() });
  });

  it("defaults to not seen for a fresh browser", () => {
    expect(hasSeenIntro()).toBe(false);
  });

  it("is seen after markIntroSeen is called", () => {
    markIntroSeen();
    expect(hasSeenIntro()).toBe(true);
  });
});

describe("multi-project storage", () => {
  beforeEach(() => {
    vi.stubGlobal("window", { localStorage: createMemoryLocalStorage() });
  });

  it("gives a brand new browser exactly one project to start with", () => {
    const projects = listProjects();
    expect(projects).toHaveLength(1);
    expect(projects[0].referenceCount).toBe(0);
    expect(getActiveProjectId()).toBe(projects[0].id);
  });

  it("keeps each project's saved references separate", () => {
    const firstId = getActiveProjectId();
    addSavedReference(fakeCitation("a"), null);
    expect(loadSavedReferences()).toHaveLength(1);

    const secondId = createProject("CIPD Level 7");
    expect(secondId).not.toBe(firstId);
    expect(loadSavedReferences()).toHaveLength(0);

    addSavedReference(fakeCitation("b"), null);
    expect(loadSavedReferences()).toHaveLength(1);
    expect(loadSavedReferences()[0].id).toBe("b");

    setActiveProjectId(firstId);
    const backOnFirst = loadSavedReferences();
    expect(backOnFirst).toHaveLength(1);
    expect(backOnFirst[0].id).toBe("a");
  });

  it("lists newly created projects alongside the original", () => {
    createProject("Second module");
    expect(listProjects()).toHaveLength(2);
  });

  it("renames the active project via saveProjectName", () => {
    saveProjectName("Employee wellbeing report");
    expect(loadProjectName()).toBe("Employee wellbeing report");
    expect(listProjects()[0].name).toBe("Employee wellbeing report");
  });

  it("never leaves the app with zero projects after deleting the last one", () => {
    const onlyId = getActiveProjectId();
    const newActiveId = deleteProject(onlyId);
    expect(listProjects()).toHaveLength(1);
    expect(newActiveId).toBe(getActiveProjectId());
    expect(loadSavedReferences()).toHaveLength(0);
  });

  it("switches to a remaining project when the active one is deleted", () => {
    const firstId = getActiveProjectId();
    const secondId = createProject("Second module");
    expect(getActiveProjectId()).toBe(secondId);

    const newActiveId = deleteProject(secondId);
    expect(newActiveId).toBe(firstId);
    expect(getActiveProjectId()).toBe(firstId);
    expect(listProjects()).toHaveLength(1);
  });

  it("migrates a pre-multi-project browser's saved references into a first project with nothing lost", () => {
    const legacyRefs = [
      { id: "legacy-1", addedAt: "2026-01-01T00:00:00.000Z", assignedTo: null, evidence: fakeCitation("legacy-1") },
    ];
    vi.stubGlobal(
      "window",
      {
        localStorage: createMemoryLocalStorage({
          "referencelib:saved-references": JSON.stringify(legacyRefs),
          "referencelib:project-name": "My original assignment",
        }),
      }
    );

    const projects = listProjects();
    expect(projects).toHaveLength(1);
    expect(projects[0].name).toBe("My original assignment");
    expect(projects[0].referenceCount).toBe(1);
    expect(loadSavedReferences()[0].id).toBe("legacy-1");
  });
});
