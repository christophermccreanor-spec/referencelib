import type { Metadata } from "next";
import "./globals.css";

// While NEXT_PUBLIC_PILOT_MODE is not explicitly set to "false", the site
// is treated as an unlisted private pilot and asks search engines not to
// index it. Set NEXT_PUBLIC_PILOT_MODE=false in the Vercel project once
// ready for public launch, so this lifts automatically.
const PILOT_MODE = process.env.NEXT_PUBLIC_PILOT_MODE !== "false";

export const metadata: Metadata = {
  title: "ReferenceLib — free peer-reviewed evidence and citations",
  description:
    "Decode your assignment question, find free peer-reviewed evidence, and generate accurate citations. Built for CIPD and academic students.",
  robots: PILOT_MODE ? { index: false, follow: false } : { index: true, follow: true },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-GB">
      <body>
        {/* Hidden until it receives keyboard focus, then jumps a keyboard
            or screen-reader user straight to #main-content, past the
            header and tool tabs that repeat on every page (WCAG 2.4.1
            Bypass Blocks). */}
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-white focus:px-3 focus:py-2 focus:text-sm focus:font-medium focus:text-neutral-900 focus:shadow-lg"
        >
          Skip to main content
        </a>
        <div className="mx-auto max-w-6xl px-4 py-6">{children}</div>
      </body>
    </html>
  );
}
