import Link from "next/link";

export const metadata = { title: "Terms — ReferenceLib" };

export default function TermsPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <Link href="/" className="btn btn-ghost">
        ← Back to ReferenceLib
      </Link>
      <div className="panel mt-4">
        <span className="badge">First draft, pending Christopher McCreanor&apos;s review</span>
        <h1 className="text-base font-medium">Terms</h1>

        <h2 className="text-sm font-medium">What this tool is</h2>
        <p className="text-sm text-neutral-700">
          ReferenceLib is a free research and citation support tool, currently in private pilot for CIPD
          students. It helps you find, verify and cite evidence. It does not write assignment answers, and
          using it does not remove your own responsibility to check every source and citation before you submit
          your work, per the academic-integrity policy.
        </p>

        <h2 className="text-sm font-medium">Accuracy of automated labels</h2>
        <p className="text-sm text-neutral-700">
          Peer-review and verification labels are produced by automated checks against public databases (see
          How verification works). They are not a guarantee that a particular institution or assessor will
          accept a given source. Full-text links point to lawful, open-access copies at the time they were
          checked; availability can change afterwards.
        </p>

        <h2 className="text-sm font-medium">No warranty</h2>
        <p className="text-sm text-neutral-700">
          ReferenceLib is provided free, as-is, during the pilot, without a guarantee of uninterrupted
          availability or complete accuracy. Report anything that looks wrong to{" "}
          <a href="mailto:christophermccreanor@gmail.com" className="text-neutral-700 hover:underline">
            christophermccreanor@gmail.com
          </a>
          .
        </p>

        <p className="text-sm text-neutral-500">
          This page is a first draft and is not a substitute for formal legal advice.
        </p>
      </div>
    </div>
  );
}
