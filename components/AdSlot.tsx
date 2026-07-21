// Reserved ad position, renders a plain placeholder until AdSense approval,
// per architecture doc section 7. Never rendered inside an evidence card.
export function AdSlot({ label }: { label: string }) {
  return <div className="ad-slot">{label}</div>;
}
