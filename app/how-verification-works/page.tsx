import Link from "next/link";

export const metadata = { title: "How verification works — ReferenceLib" };

export default function HowVerificationWorksPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <Link href="/" className="btn btn-ghost">
        ← Back to ReferenceLib
      </Link>
      <div className="panel mt-4">
        <h1 className="text-base font-medium">How verification works</h1>
        <p className="text-sm text-neutral-700">
          Every check in ReferenceLib is an automated comparison against a public scholarly database. Nothing
          is verified by a person, and nothing is verified by a language model. Here is exactly what each
          label means and where it comes from.
        </p>

        <h2 className="text-sm font-medium">Evidence search results</h2>
        <p className="text-sm text-neutral-700">
          Results in Find Evidence and Evidence My Paragraph come from OpenAlex, a free, open scholarly index.
          Each result carries a peer-review label: &quot;Likely peer reviewed&quot; is based on the source
          type OpenAlex records for the journal. That label is upgraded to &quot;Peer reviewed, verified&quot;
          only when DOAJ (the Directory of Open Access Journals) independently confirms the journal itself is
          listed as a genuine, open-access, peer-reviewed publication. Preprints are excluded from results by
          default. A source with unknown peer-review status is never shown as verified.
        </p>

        <h2 className="text-sm font-medium">Reference verification</h2>
        <p className="text-sm text-neutral-700">
          The Verify a Reference tab checks a pasted DOI, title or full reference against Crossref, the
          official DOI registration database publishers use. A DOI match confirms the reference exists exactly
          as recorded by the publisher. Where no DOI is found, the tool falls back to a title search against
          the same database and says so explicitly, since a title match is lower confidence than a DOI match.
        </p>

        <h2 className="text-sm font-medium">What this does not do</h2>
        <p className="text-sm text-neutral-700">
          A verified label confirms a source exists in these public databases and meets the stated evidence
          criteria. It does not guarantee that a specific assessor, module or institution will accept the
          source, and it does not check whether the source actually supports the point you are using it for.
          That judgement stays yours.
        </p>
      </div>
    </div>
  );
}
