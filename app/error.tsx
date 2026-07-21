"use client";

// Next.js App Router error boundary. Without this file, an unhandled
// runtime error anywhere in the page tree falls through to a generic
// browser-level crash screen. This keeps the failure contained, on-brand,
// and recoverable, since students should never see a blank white page.
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <div className="panel">
        <h2 className="text-base font-medium">Something went wrong</h2>
        <p className="text-sm text-neutral-500">
          This page hit an unexpected error. Nothing you saved has been lost, since saved references live in
          your browser, not on our server. Try again, and if it keeps happening, let us know what you were
          doing when it occurred.
        </p>
        <button className="btn btn-primary" onClick={() => reset()}>
          Try again
        </button>
      </div>
    </div>
  );
}
