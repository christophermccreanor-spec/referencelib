export type ToolView = "question" | "paragraph" | "verify" | "audit";

// The one-line description under each tab exists because student testing
// (28 August 2026) found the tabs themselves gave no indication of what
// each one actually does: "Verify a reference" and "Check citations" in
// particular read as near-synonyms until you click in and read the
// per-tab help text, which only ever appears after the tab is already
// active. This puts a short answer to "what is this for?" in view before
// a student commits to a tab, and keeps it visible afterwards too, rather
// than relying entirely on the one-off welcome tour.
const TABS: { id: ToolView; label: string; description: string }[] = [
  { id: "question", label: "Find evidence", description: "Search from an assignment question" },
  { id: "paragraph", label: "Evidence my paragraph", description: "Search from a paragraph you've already written" },
  { id: "verify", label: "Verify a reference", description: "Check one reference is real and accurate" },
  { id: "audit", label: "Check citations", description: "Match in-text citations to your reference list" },
];

export function ToolTabs({ active, onChange }: { active: ToolView; onChange: (v: ToolView) => void }) {
  return (
    <nav className="mb-4 flex flex-wrap gap-3">
      {TABS.map((tab) => {
        const descriptionId = `tab-desc-${tab.id}`;
        return (
          <div key={tab.id} className="flex max-w-[11rem] flex-col gap-1">
            <button
              className={active === tab.id ? "btn btn-primary" : "btn"}
              aria-pressed={active === tab.id}
              aria-describedby={descriptionId}
              onClick={() => onChange(tab.id)}
            >
              {tab.label}
            </button>
            <span id={descriptionId} className="text-[11px] leading-tight text-neutral-500">
              {tab.description}
            </span>
          </div>
        );
      })}
    </nav>
  );
}
