import Link from "next/link";

const LINKS: { label: string; href: string }[] = [
  { label: "How verification works", href: "/how-verification-works" },
  { label: "Pricing and free tier", href: "/pricing" },
  { label: "Source and licence methodology", href: "/methodology" },
  { label: "Academic-integrity policy", href: "/academic-integrity" },
  { label: "AI and technology-use statement", href: "/ai-statement" },
  { label: "Privacy", href: "/privacy" },
  { label: "Terms", href: "/terms" },
  { label: "Administrative contact", href: "/contact" },
];

export function Footer() {
  return (
    <footer className="mt-8 grid gap-3 border-t border-neutral-200 pt-4 text-xs text-neutral-500">
      <div className="flex flex-wrap gap-4">
        {LINKS.map((link) => (
          <Link key={link.href} href={link.href} className="text-neutral-700 hover:underline">
            {link.label}
          </Link>
        ))}
      </div>
      <div>This tool supports research and citation accuracy. It does not provide individual research support and does not write assignment answers.</div>
      <div className="flex flex-wrap items-center gap-3">
        <a
          href="https://www.buymeacoffee.com/christopheu3"
          target="_blank"
          rel="noreferrer"
          className="btn btn-ghost"
        >
          ☕ Support this project
        </a>
        <a
          href="https://lovable.dev/projects/977cab57-8a71-4900-b9e8-b9a353d2ad9e"
          target="_blank"
          rel="noreferrer"
          className="text-neutral-700 hover:underline"
        >
          More ways to support development
        </a>
      </div>
      <div>
        Dr Christopher Paul Andrew McCreanor ·{" "}
        <a
          href="https://www.linkedin.com/in/christophermccreanor/"
          target="_blank"
          rel="noreferrer"
          className="text-neutral-700 hover:underline"
        >
          LinkedIn
        </a>
      </div>
    </footer>
  );
}
