import { EvidenceCardData } from "@/lib/types";

const PEER_REVIEW_LABEL: Record<EvidenceCardData["peerReview"], string> = {
  verified: "Peer reviewed, verified",
  likely: "Likely peer reviewed",
  unknown: "Peer-review status unknown",
};

export function EvidenceCard({
  card,
  onSave,
  onCopyCitation,
  saved,
  locked,
  opened,
  onOpen,
}: {
  card: EvidenceCardData;
  onSave: () => void;
  onCopyCitation: () => void;
  saved: boolean;
  // When true (Evidence my paragraph only), Save and Copy stay disabled
  // until the student has actually opened the free full text at least
  // once, so the tool cannot be used as a citation shortcut without
  // reading anything. Find Evidence never sets this.
  locked?: boolean;
  opened?: boolean;
  onOpen?: () => void;
}) {
  const mustReadFirst = Boolean(locked) && !opened;

  return (
    <article className="grid gap-2 border-t border-neutral-200 pt-3 first:border-t-0 first:pt-0">
      <div className="text-sm font-medium">{card.title}</div>
      <div className="text-xs text-neutral-500">
        {card.authors.slice(0, 3).join(", ") || "Author unknown"}
        {card.authors.length > 3 ? " et al." : ""} · {card.journal ?? "Source unknown"} · {card.year ?? "n.d."}
        {card.doi ? ` · DOI verified` : ""}
      </div>
      <div className="flex flex-wrap gap-1.5">
        <span className="badge">{PEER_REVIEW_LABEL[card.peerReview]}</span>
        {card.openAccess === "open" && <span className="badge">Free full text</span>}
        <span className="badge">{card.version.replace(/-/g, " ")}</span>
      </div>
      <div className="flex flex-wrap gap-2">
        {card.fullTextUrl && (
          <a href={card.fullTextUrl} target="_blank" rel="noreferrer" className="btn" onClick={onOpen}>
            Read free
          </a>
        )}
        <button className="btn" onClick={onSave} disabled={saved || mustReadFirst}>
          {saved ? "Saved" : "Save reference"}
        </button>
        <button className="btn" onClick={onCopyCitation} disabled={mustReadFirst}>
          Copy citation
        </button>
      </div>
      {mustReadFirst && (
        <div className="text-xs text-neutral-500">
          Open and read the free full text first. Save and copy unlock once you have.
        </div>
      )}
    </article>
  );
}
