import { REFERENCING_STYLE_LABELS, ReferencingStyle, SavedReference } from "@/lib/types";
import { renderBibliographyEntries, renderInTextCitationForItem } from "@/lib/citation/csl/client";
import { AdSlot } from "@/components/AdSlot";

export function SavedReferencePanel({
  refs,
  projectName,
  onProjectNameChange,
  style,
  onStyleChange,
  onRemove,
  onExport,
  onOpenManualEntry,
}: {
  refs: SavedReference[];
  projectName: string;
  onProjectNameChange: (name: string) => void;
  style: ReferencingStyle;
  onStyleChange: (style: ReferencingStyle) => void;
  onRemove: (id: string) => void;
  onExport: () => void;
  onOpenManualEntry: () => void;
}) {
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

        <label className="form-label">
          Project name
          <input
            className="form-control"
            value={projectName}
            onChange={(e) => onProjectNameChange(e.target.value)}
          />
        </label>

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
              <div className="flex gap-2">
                <button className="btn btn-ghost" onClick={() => handleCopy(ref)}>
                  Copy {REFERENCING_STYLE_LABELS[style]}
                </button>
                <button className="btn btn-ghost" onClick={() => onRemove(ref.id)}>
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
      </section>
      <AdSlot label="Advertising position 3 of 3: desktop rectangle, below the saved-reference panel." />
    </aside>
  );
}

export async function exportReferenceList(refs: SavedReference[], style: ReferencingStyle) {
  const entries = await renderBibliographyEntries(
    refs.map((r) => r.evidence),
    style
  );
  const text = entries.join("\n\n");
  const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "reference-list.txt";
  a.click();
  URL.revokeObjectURL(url);
}
