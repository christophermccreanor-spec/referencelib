import Link from "next/link";

export const metadata = { title: "Administrative contact — ReferenceLib" };

export default function ContactPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <Link href="/" className="btn btn-ghost">
        ← Back to ReferenceLib
      </Link>
      <div className="panel mt-4">
        <h1 className="text-base font-medium">Administrative contact</h1>
        <p className="text-sm text-neutral-700">
          ReferenceLib is built and maintained by Dr Christopher Paul Andrew McCreanor.
        </p>
        <p className="text-sm text-neutral-700">
          Email:{" "}
          <a href="mailto:christophermccreanor@gmail.com" className="text-neutral-700 hover:underline">
            christophermccreanor@gmail.com
          </a>
        </p>
        <p className="text-sm text-neutral-700">
          LinkedIn:{" "}
          <a
            href="https://www.linkedin.com/in/christophermccreanor/"
            target="_blank"
            rel="noreferrer"
            className="text-neutral-700 hover:underline"
          >
            linkedin.com/in/christophermccreanor
          </a>
        </p>
      </div>
    </div>
  );
}
