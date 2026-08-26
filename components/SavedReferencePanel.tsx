import { useRef, useState } from "react";
import { REFERENCING_STYLE_LABELS, ReferencingStyle, SavedReference } from "@/lib/types";
import { renderBibliographyEntries, renderInTextCitationForItem } from "@/lib/citation/csl/client";
import { ProjectSummary } from "@/lib/storage/local-references";
import { AdSlot } from "@/components/AdSlot";

export function SavedReferencePanel({
  refs,
  projectName,
  onProjectNameChange,
  projects,
  activeProjectId,
  onSwitchProject,
  onCreateProject,
  onDeleteProject,
  style,
  onStyleChange,
  onRemove,
  onExport,
  onExportJson,
  onImportFile,
  importMessage,
  onOpenManualEntry,
}: {
  refs: SavedReference[];
  projectName: string;
  onProjectNameChange: (name: string) => void;
  projects: ProjectSummary[];
  activeProjectId: string;
  onSwitchProject: (id: string) => void;
  onCreateProject: (name: string) => void;
  onDeleteProject: () => void;
  style: ReferencingStyle;
  onStyleChange: (style: ReferencingStyle) => void;
  onRemove: (id: string) => void;
  onExport: () => void;
  onExportJson: () => void;
  onImportFile: (file: File) => void;
  importMessage?: { text: string; isError: boolean } | null;
  onOpenManualEntry: () => void;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [addingProject, setAddingProject] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");

  function handleFileChosen(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) onImportFile(file);
    // Reset so choosing the same filename again still fires onChange.
    e.target.value = "";
  }
  async function handleCopy(ref: SavedReference) {
    try {
      const citation = await renderInTextCitationForItem(ref.evidence, style);
      await navigator.clipboard.writeText(citation);
    } catch {
      // Silently no-ops on failure: the button label doesn't change state,
      // so a failed render simply leaves the clipboard unchanged rather
      // than showing an error for what is a low-stakes convenience copy.
    }
  }

  function handleCreateProject() {
    if (!newProjectName.trim()) return;
    onCreateProject(newProjectName);
    setNewProjectName("");
    setAddingProject(false);
  }

  return (
    <aside className="grid gap-3">
      <section className="panel">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-medium">My references</h2>
          <span className="badge">{refs.length} saved</span>
        </div>
        <div className="text-xs text-neutral-500">Saved to this device just now</div>

        <button className="btn" onClick={onOpenManualEntry}>
          + Cite a source manually
        </button>
        <div className="text-xs text-neutral-500">
          For a book, website, or government/CIPD/international-body report you found yourself.
        </div>

        <div className="grid gap-1.5 border-b border-neutral-200 pb-3">
          <label className="form-label">
            Switch project
            <select
              className="form-control"
              value={activeProjectId}
              onChange={(e) => onSwitchProject(e.target.value)}
            >
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.referenceCount} saved)
                </option>
              ))}
            </select>
          </label>
          <div className="text-xs text-neutral-500">
            Each project keeps its own separate saved references, so different modules or
            assignments never mix.
          </div>

          {!addingProject ? (
            <div className="flex gap-2">
              <button className="btn btn-ghost" onClick={() => setAddingProject(true)}>
                + New project
              </button>
              {projects.length > 1 && (
                <button className="btn btn-ghost" onClick={onDeleteProject}>
                  Delete this project
                </button>
              )}
            </div>
          ) : (
            <div className="flex gap-2">
              <input
                className="form-control"
                value={newProjectName}
                onChange={(e) => setNewProjectName(e.target.value)}
                placeholder="e.g. CIPD Level 7: Employee Wellbeing"
                autoFocus
              />
              <button className="btn btn-primary" onClick={handleCreateProject} disabled={!newProjectName.trim()}>
                Create
              </button>
              <button
                className="btn btn-ghost"
                onClick={() => {
                  setAddingProject(false);
                  setNewProjectName("");
                }}
              >
                Cancel
              </button>
            </div>
          )}

          <label className="form-label">
            Rename this project
            <input
              className="form-control"
              value={projectName}
              onChange={(e) => onProjectNameChange(e.target.value)}
            />
          </label>
        </div>

        <label className="form-label">
          Reference list style
          <select
            className="form-control"
            value={style}
            onChange={(e) => onStyleChange(e.target.value as ReferencingStyle)}
          >
            {Object.entries(REFERENCING_STYLE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <div className="text-xs text-neutral-500">
          Changing this re-formats every saved reference below. Nothing is re-searched.
        </div>

        <div className="grid gap-2.5">
          {refs.length === 0 && (
            <div className="text-sm text-neutral-500">No references saved yet.</div>
          )}
          {refs.map((ref) => (
            <div key={ref.id} className="grid gap-1 border-b border-neutral-200 pb-2.5 last:border-b-0">
              <strong className="text-sm">{ref.evidence.title}</strong>
              {ref.assignedTo && (
                <span className="text-xs text-neutral-500">Assigned to: {ref.assignedTo}</span>
              )}
              {/* Every card on this list repeats the same "Copy" / "Remove"
                  labels, so a screen-reader user tabbing through several
                  saved references would otherwise hear "Remove, button"
                  over and over with no way to tell them apart. The
                  aria-label names the specific reference each control
                  acts on (WCAG 2.4.6 / 4.1.2) while the visible text stays
                  short. */}
              <div className="flex gap-2">
                <button
                  className="btn btn-ghost"
                  onClick={() => handleCopy(ref)}
                  aria-label={`Copy ${REFERENCING_STYLE_LABELS[style]} citation for ${ref.evidence.title}`}
                >
                  Copy {REFERENCING_STYLE_LABELS[style]}
                </button>
                <button
                  className="btn btn-ghost"
                  onClick={() => onRemove(ref.id)}
                  aria-label={`Remove ${ref.evidence.title} from saved references`}
                >
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>

        <button className="btn btn-primary" onClick={onExport} disabled={refs.length === 0}>
          Download reference list
        </button>
        <div className="text-xs text-neutral-500">
          Saved on this device only. Clearing browser data removes it. A free account only becomes
          necessary when you use the AI paragraph-checking feature, not for search, saving or citations.
        </div>

        <div className="grid gap-1.5 border-t border-neutral-200 pt-3">
          <span className="text-xs font-medium text-neutral-700">Move this project to another device</span>
          <div className="flex gap-2">
            <button className="btn btn-ghost" onClick={onExportJson} disabled={refs.length === 0}>
              Export references
            </button>
            <button className="btn btn-ghost" onClick={() => fileInputRef.current?.click()}>
              Import references
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="application/json,.json"
              className="hidden"
              onChange={handleFileChosen}
            />
          </div>
          <div className="text-xs text-neutral-500">
            Export saves a file for the project shown above, to bring into ReferenceLib on another
            device or browser. Importing only adds references to the current project, it never
            removes or overwrites what is already saved here.
          </div>
          {importMessage && (
            <div role="status" className={`text-xs ${importMessage.isError ? "text-red-600" : "text-emerald-700"}`}>
              {importMessage.text}
            </div>
          )}
        </div>
      </section>
      <AdSlot label="Advertising position 3 of 3: desktop rectangle, below the saved-reference panel." />
    </aside>
  );
}

// Word export, not plain text: a reference list a student hands in as part
// of an assignment should look like a document, not a .txt file. Uses
// docx (docx.js), the same isomorphic, pure-JS library used elsewhere for
// Word generation in this workspace; Packer.toBlob runs entirely in the
// browser, no server round trip and nothing leaves the student's device.
export async function exportReferenceList(
  refs: SavedReference[],
  style: ReferencingStyle,
  projectName: string
) {
  const { Document, Packer, Paragraph, HeadingLevel } = await import("docx");
  const entries = await renderBibliographyEntries(
    refs.map((r) => r.evidence),
    style
  );

  const doc = new Document({
    sections: [
      {
        children: [
          new Paragraph({
            text: projectName.trim() || "Reference list",
            heading: HeadingLevel.HEADING_1,
          }),
          new Paragraph({
            text: `${REFERENCING_STYLE_LABELS[style]} reference list, generated by ReferenceLib`,
            spacing: { after: 300 },
          }),
          ...entries.map(
            (entry) =>
              new Paragraph({
                text: entry,
                spacing: { after: 200 },
              })
          ),
        ],
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "reference-list.docx";
  a.click();
  URL.revokeObjectURL(url);
}
