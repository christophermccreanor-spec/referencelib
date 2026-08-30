// Peer-reviewed evidence surfaced for CIPD assignment use must be recent.
// Before this, a search with no "Evidence from year" set returned work as old
// as the 1990s: the search route defaulted sinceYear to undefined, i.e. no
// year filter at all. A 30 August 2026 audit of eight realistic HR queries
// found ~half of peer-reviewed results were older than six years by default
// (including a 1991 and a 2000 paper), even though the OpenAlex query already
// supported a working year filter that was simply never applied.
//
// The default is a rolling window (currentYear - DEFAULT_RECENCY_YEARS) so it
// stays correct as years pass without any code change. Change the constant to
// 5 for a stricter five-year window.
export const DEFAULT_RECENCY_YEARS = 6;

// Resolve the year floor actually sent to the evidence source.
//
// - No year requested  -> the rolling recency floor (currentYear - N).
// - A year requested    -> honoured, but clamped so it can never widen the
//   window past the floor. The "Evidence from year" control is therefore a
//   way to narrow to something *more* recent, never to reach back past the
//   recency rule. This keeps the "peer-reviewed must be recent" guarantee
//   even if an older year is passed (e.g. a stale cached client, or a manual
//   API call), rather than trusting the caller to respect it.
//
// `now` is injectable purely so the rolling behaviour is deterministic in
// tests; production always uses the real current date.
export function effectiveSinceYear(
  requestedSinceYear: number | undefined,
  now: Date = new Date()
): number {
  const floor = now.getUTCFullYear() - DEFAULT_RECENCY_YEARS;
  if (typeof requestedSinceYear !== "number" || !Number.isFinite(requestedSinceYear)) {
    return floor;
  }
  return Math.max(requestedSinceYear, floor);
}
