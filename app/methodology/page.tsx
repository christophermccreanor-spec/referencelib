import Link from "next/link";

export const metadata = { title: "Source and licence methodology — ReferenceLib" };

export default function MethodologyPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <Link href="/" className="btn btn-ghost">
        ← Back to ReferenceLib
      </Link>
      <div className="panel mt-4">
        <h1 className="text-base font-medium">Source and licence methodology</h1>

        <h2 className="text-sm font-medium">Where evidence comes from</h2>
        <p className="text-sm text-neutral-700">
          ReferenceLib searches and verifies against free, official, public APIs only. It does not scrape
          websites and does not bypass any paywall. The sources in use are: OpenAlex, for scholarly search,
          metadata and open-access locations; Crossref, for DOI and bibliographic verification; DOAJ, the
          Directory of Open Access Journals, for journal-level peer-review confirmation; and Google Books, for
          the optional ISBN lookup when manually citing a book. All four are free and openly licensed for this
          kind of use.
        </p>

        <h2 className="text-sm font-medium">How citations are formatted</h2>
        <p className="text-sm text-neutral-700">
          References and in-text citations are rendered by citeproc-js, the open-source Citation Style Language
          processing engine also used by Zotero and Mendeley. It is a complete, tested implementation of the
          published CSL specification, not a hand-written formatter. The style definitions themselves,
          Harvard (Cite Them Right) and APA 7th edition, are the official files published by the
          citation-style-language project under a Creative Commons Attribution-ShareAlike licence.
        </p>

        <h2 className="text-sm font-medium">Why only Harvard and APA</h2>
        <p className="text-sm text-neutral-700">
          ReferenceLib currently supports Harvard (Cite Them Right) and APA 7th edition: the two referencing
          styles most widely required by UK and international universities, including CIPD&apos;s own guidance.
          Other styles may be added in future, one at a time, once each is fully tested.
        </p>
      </div>
    </div>
  );
}
