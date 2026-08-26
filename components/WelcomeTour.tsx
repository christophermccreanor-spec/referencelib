import { useEffect, useRef } from "react";

// First-visit orientation, shown once per browser (gated by
// hasSeenIntro/markIntroSeen in lib/storage/local-references.ts) and
// reopenable at any time from the "How this works" link in app/page.tsx.
// Follows the same dialog pattern as ManualCitationForm.tsx (role="dialog",
// focus moved on mount, Escape closes) for consistency and to keep the
// same accessibility guarantees already in place elsewhere in the app.
export function WelcomeTour({ onClose }: { onClose: () => void }) {
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    dialogRef.current?.focus();
  }, []);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="welcome-tour-heading"
        tabIndex={-1}
        className="grid max-h-[90vh] w-full max-w-lg gap-4 overflow-y-auto rounded-xl bg-white p-5"
      >
        <div>
          <h2 id="welcome-tour-heading" className="text-lg font-semibold">
            How ReferenceLib works
          </h2>
          <div className="text-xs text-neutral-500">
            Four steps, no account needed. Takes about a minute to try.
          </div>
        </div>

        <ol className="grid gap-3 text-sm text-neutral-800">
          <li className="flex gap-2.5">
            <span
              aria-hidden="true"
              className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary text-xs text-white"
            >
              1
            </span>
            <span>
              <strong>Understand the task.</strong> The assignment question box already has a worked example
              in it, that is not your question. Clear it and paste your own, or leave it as it is just to see
              how the tool responds first.
            </span>
          </li>
          <li className="flex gap-2.5">
            <span
              aria-hidden="true"
              className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary text-xs text-white"
            >
              2
            </span>
            <span>
              <strong>Find evidence.</strong> Decode question breaks down what your assignment is asking for,
              then Find evidence searches OpenAlex, Crossref and DOAJ for free, peer-reviewed sources.
            </span>
          </li>
          <li className="flex gap-2.5">
            <span
              aria-hidden="true"
              className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary text-xs text-white"
            >
              3
            </span>
            <span>
              <strong>Read and save.</strong> Open a source and read it before you can save or copy its
              citation, that is deliberate: this finds candidates for you, it does not do the reading for you.
            </span>
          </li>
          <li className="flex gap-2.5">
            <span
              aria-hidden="true"
              className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary text-xs text-white"
            >
              4
            </span>
            <span>
              <strong>Cite and check.</strong> Your references panel on the right builds a formatted reference
              list as you go, and Check citations catches any in-text citation that does not match it.
            </span>
          </li>
        </ol>

        <div className="text-xs text-neutral-500">
          The other tabs above, Evidence my paragraph, Verify a reference and Check citations, work the same
          way for a paragraph you have already written, a reference you want to double check, or your full
          assignment text.
        </div>

        <div className="flex justify-end">
          <button className="btn btn-primary" onClick={onClose}>
            Got it, let&apos;s start
          </button>
        </div>
      </div>
    </div>
  );
}
