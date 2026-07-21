const STEPS = ["Understand the task", "Find evidence", "Read and save", "Cite and check"];

export function ProgressStrip({ activeIndex }: { activeIndex: number }) {
  return (
    <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
      {STEPS.map((step, i) => (
        <div
          key={step}
          className={
            "rounded-lg border px-3 py-2 text-xs " +
            (i === activeIndex
              ? "border-primary bg-primary-tint text-primary-dark"
              : "border-neutral-200 bg-white text-neutral-500")
          }
        >
          <span
            className={
              "mr-1.5 inline-flex h-4 w-4 items-center justify-center rounded-full text-[10px] " +
              (i === activeIndex ? "bg-primary text-white" : "bg-neutral-200 text-neutral-500")
            }
          >
            {i + 1}
          </span>
          {step}
        </div>
      ))}
    </div>
  );
}
