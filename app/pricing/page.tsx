import Link from "next/link";

export const metadata = { title: "Pricing and free tier — ReferenceLib" };

export default function PricingPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <Link href="/" className="btn btn-ghost">
        ← Back to ReferenceLib
      </Link>
      <div className="panel mt-4">
        <h1 className="text-base font-medium">Pricing and free tier</h1>

        <h2 className="text-sm font-medium">Right now: free, no account, during the CIPD pilot</h2>
        <p className="text-sm text-neutral-700">
          ReferenceLib is currently in a private pilot for CIPD students. Every feature that exists today,
          question decoding, evidence search, evidence for your paragraph, reference verification, citation
          generation and manual source entry, is free, with no account and no payment details required. Nothing
          you use today will ever ask you to pay during the pilot.
        </p>

        <h2 className="text-sm font-medium">The plan for after the pilot</h2>
        <p className="text-sm text-neutral-700">
          Question decoding, evidence search and citation generation are planned to stay free and unlimited for
          everyone, with no account required, permanently. A future feature that uses a language model to check
          whether a claim you have already written is supported by evidence (not yet built) is planned to be
          the only thing gated: five free uses every rolling 30 days on a free account (email only, no payment
          details), or unlimited use on a full membership planned at R599 a year (roughly $36). No feature that
          is live in the tool today will be moved behind that paywall retroactively.
        </p>

        <p className="text-sm text-neutral-500">
          This page describes the current plan and is updated as pricing decisions are finalised. It is not a
          contract.
        </p>
      </div>
    </div>
  );
}
