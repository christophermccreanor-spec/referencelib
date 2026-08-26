// Reserved ad position, renders a plain placeholder until AdSense approval,
// per architecture doc section 7. The reserved space stays (this is real
// revenue that funds the free service), but the visible text is a normal,
// generic "Advertisement" label rather than the internal dev-facing
// position/placement note, since that internal note was showing to real
// visitors on the live site. `label` is kept as an internal identifier for
// each position (useful once real ad tags are wired in) but is never
// rendered. Never rendered inside an evidence card.
// aria-hidden: this is inert filler, not real content, so it should not be
// announced to screen-reader users as if it were meaningful.
export function AdSlot({ label }: { label: string }) {
  return (
    <div className="ad-slot" aria-hidden="true" data-slot={label}>
      Advertisement
    </div>
  );
}
