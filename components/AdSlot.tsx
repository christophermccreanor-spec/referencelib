// Reserved ad position, renders a plain placeholder until AdSense approval,
// per architecture doc section 7. Never rendered inside an evidence card.
// aria-hidden: this is inert filler text, not real content, so it should
// not be announced to screen-reader users as if it were meaningful.
export function AdSlot({ label }: { label: string }) {
  return (
    <div className="ad-slot" aria-hidden="true">
      {label}
    </div>
  );
}
