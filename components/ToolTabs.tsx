export type ToolView = "question" | "paragraph" | "verify" | "audit";

const TABS: { id: ToolView; label: string }[] = [
  { id: "question", label: "Find evidence" },
  { id: "paragraph", label: "Evidence my paragraph" },
  { id: "verify", label: "Verify a reference" },
  { id: "audit", label: "Check citations" },
];

export function ToolTabs({ active, onChange }: { active: ToolView; onChange: (v: ToolView) => void }) {
  return (
    <nav className="mb-4 flex flex-wrap gap-1.5">
      {TABS.map((tab) => (
        <button
          key={tab.id}
          className={active === tab.id ? "btn btn-primary" : "btn"}
          aria-pressed={active === tab.id}
          onClick={() => onChange(tab.id)}
        >
          {tab.label}
        </button>
      ))}
    </nav>
  );
}
