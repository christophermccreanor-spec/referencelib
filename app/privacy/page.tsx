import Link from "next/link";

export const metadata = { title: "Privacy — ReferenceLib" };

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <Link href="/" className="btn btn-ghost">
        ← Back to ReferenceLib
      </Link>
      <div className="panel mt-4">
        <span className="badge">First draft, pending Christopher McCreanor&apos;s review</span>
        <h1 className="text-base font-medium">Privacy</h1>

        <h2 className="text-sm font-medium">No account, no server-side storage</h2>
        <p className="text-sm text-neutral-700">
          No account is required to use the question decoder, evidence search, evidence-my-paragraph, reference
          verification, or citation tools. Your saved references and project name are stored only in your own
          browser&apos;s local storage, on your own device. They are never sent to or stored on ReferenceLib&apos;s
          servers, and clearing your browser data removes them completely.
        </p>

        <h2 className="text-sm font-medium">What is sent, and to whom</h2>
        <p className="text-sm text-neutral-700">
          Your search terms, pasted references and pasted paragraphs are sent to the free public sources used to
          answer them: OpenAlex, Crossref, DOAJ, and, for the optional ISBN lookup, Google Books. ReferenceLib
          does not keep a record of what you searched for or pasted once the response has been returned to your
          browser.
        </p>

        <h2 className="text-sm font-medium">Error logs</h2>
        <p className="text-sm text-neutral-700">
          If something goes wrong, a technical error log may be recorded to help fix the problem. It does not
          include your assignment content, saved references or personal details.
        </p>

        <p className="text-sm text-neutral-500">
          Questions about privacy can be sent to{" "}
          <a href="mailto:christophermccreanor@gmail.com" className="text-neutral-700 hover:underline">
            christophermccreanor@gmail.com
          </a>
          . This page is a first draft and is not a substitute for formal legal advice.
        </p>
      </div>
    </div>
  );
}
