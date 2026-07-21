import Link from "next/link";

export const metadata = { title: "Academic-integrity policy — ReferenceLib" };

export default function AcademicIntegrityPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <Link href="/" className="btn btn-ghost">
        ← Back to ReferenceLib
      </Link>
      <div className="panel mt-4">
        <span className="badge">First draft, pending Christopher McCreanor&apos;s review</span>
        <h1 className="text-base font-medium">Academic-integrity policy</h1>
        <p className="text-sm text-neutral-700">
          ReferenceLib is a research and citation support tool. It is built to keep a firm, deliberate line
          between helping you find and reference evidence, and doing your academic work for you.
        </p>

        <h2 className="text-sm font-medium">What ReferenceLib does</h2>
        <p className="text-sm text-neutral-700">
          Decodes an assignment question into its command verb, cognitive level and required evidence. Identifies
          the claims in text you have written yourself. Generates search concepts from your question or claim.
          Locates and verifies evidence against public scholarly databases. Shows you supporting, contradictory
          and mixed findings, without deciding your argument for you. Formats citations and references. Checks
          whether the citations in your text correspond to your reference list.
        </p>

        <h2 className="text-sm font-medium">What ReferenceLib will not do</h2>
        <p className="text-sm text-neutral-700">
          Write your assignment answers. Rewrite your own prose to disguise that artificial intelligence was
          used. &quot;Humanise&quot; generated text. Invent quotations, page numbers or sources. Attach a
          source to your work that does not actually support the claim you are making. Generate a false
          declaration that no AI tool was used.
        </p>

        <p className="text-sm text-neutral-500">
          You remain responsible for your own academic submission, including checking that every source
          ReferenceLib surfaces genuinely supports the point you use it for, and for declaring your use of any
          tool as your institution requires.
        </p>
      </div>
    </div>
  );
}
