import Link from "next/link";

export const metadata = { title: "AI and technology-use statement — ReferenceLib" };

export default function AiStatementPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <Link href="/" className="btn btn-ghost">
        ← Back to ReferenceLib
      </Link>
      <div className="panel mt-4">
        <span className="badge">First draft, pending Christopher McCreanor&apos;s review</span>
        <h1 className="text-base font-medium">AI and technology-use statement</h1>

        <h2 className="text-sm font-medium">What is live today</h2>
        <p className="text-sm text-neutral-700">
          No feature currently in ReferenceLib uses a generative language model. The question decoder matches
          command verbs and Bloom&apos;s taxonomy stages using fixed rules, not AI. Evidence search and
          reference verification match your question or claim against OpenAlex, Crossref and DOAJ&apos;s own
          published metadata. Citations are produced by a deterministic citation-formatting engine (citeproc-js),
          not generated text. Nothing you read on this site today has been written or paraphrased by a language
          model on your behalf.
        </p>

        <h2 className="text-sm font-medium">What is planned, not yet built</h2>
        <p className="text-sm text-neutral-700">
          A future feature is planned that would use a language model for one narrow purpose: checking whether
          a claim you have already written yourself is supported by evidence the free search has already found,
          and stating plainly what is missing for it to meet the required academic standard. Per the
          academic-integrity policy, it will not write or rewrite your argument, and will not be built to
          disguise its own use.
        </p>

        <p className="text-sm text-neutral-500">
          This page will be updated if and when that feature is built, so it always reflects what the tool
          actually does, not what is planned.
        </p>
      </div>
    </div>
  );
}
