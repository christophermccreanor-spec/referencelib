const STEPS = ["Understand the task", "Find evidence", "Read and save", "Cite and check"];

// An ordered list with aria-current="step" on the active item gives
// assistive-technology users the same "you are here" signal sighted users
// get from the highlighted border and colour, which otherwise only exists
// visually (WCAG 1.3.1: state conveyed by colour alone is not
// programmatically determinable).
export function ProgressStrip({ activeIndex }: { activeIndex: number }) {
  return (
    <ol aria-label="Your progress through this tool" className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
      {STEPS.map((step, i) => (
        <li
          key={step}
          aria-current={i === activeIndex ? "step" : undefined}
          className={
            "rounded-lg border px-3 py-2 text-xs " +
            (i === activeIndex
              ? "border-primary bg-primary-tint text-primary-dark"
              : "border-neutral-200 bg-white text-neutral-500")
          }
        >
          <span
            aria-hidden="true"
            className={
              "mr-1.5 inline-flex h-4 w-4 items-center justify-center rounded-full text-[10px] " +
              (i === activeIndex ? "bg-primary text-white" : "bg-neutral-200 text-neutral-500")
            }
          >
            {i + 1}
          </span>
          {step}
        </li>
      ))}
    </ol>
  );
}
