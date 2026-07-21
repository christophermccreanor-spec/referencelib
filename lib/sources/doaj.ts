const DOAJ_JOURNAL_SEARCH = "https://doaj.org/api/search/journals";

// Journal-level open-access and peer-review confirmation, free, no key.
// This is the source that can upgrade an evidence card's peer-review label
// from "likely" to "verified", per blueprint section 6.
export async function isJournalInDOAJ(journalName: string): Promise<boolean> {
  if (!journalName.trim()) return false;
  const res = await fetch(
    `${DOAJ_JOURNAL_SEARCH}/${encodeURIComponent(journalName)}`,
    { headers: { Accept: "application/json" }, signal: AbortSignal.timeout(6000) }
  ).catch(() => null);
  if (!res || !res.ok) return false;
  const data = await res.json();
  return Array.isArray(data.results) && data.results.length > 0;
}
