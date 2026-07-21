# ReferenceLib

A low-cost, one-page research tool that helps students decode an assignment
question against Bloom's taxonomy and command-verb analysis, find free
peer-reviewed evidence through OpenAlex, Crossref and DOAJ, and generate
proper Harvard (Cite Them Right) or APA 7th edition citations. Built with
Next.js 14 (App Router), TypeScript and Tailwind CSS.

Live at:

https://www.referencelib.com

This repository is connected to Vercel for deployment. Every push to `main`
builds and deploys automatically; there is no manual deploy step.

## What is built

- Rule-based question decoder (command verb, Bloom's stage sequence,
  qualification-level expectations, concept extraction, search terms). No
  AI call, no cost.
- Evidence search against OpenAlex, with peer-review status upgraded to
  "verified" via DOAJ, and DOI/title verification via Crossref. Preprints
  excluded by default.
- Real citation formatting via citeproc-js, using the official CSL styles
  for Harvard (Cite Them Right) and APA 7th edition. These are the only
  two styles supported; MLA, Vancouver and IEEE were deliberately removed
  to keep the citation engine fast, reliable and low-token (see
  `planning/05-deployment-plan.md`, section 2, for the reasoning).
- Manual reference entry for books (with Open Library ISBN lookup),
  websites, and government/organisational reports, all stored as CSL-JSON.
- Local-only saved-reference list (browser local storage, no account, no
  server-side storage).
- Word document export of a saved reference list (via the `docx` package),
  replacing the earlier plain-text download.
- Eight real footer pages: how verification works, pricing, methodology,
  academic integrity, AI statement, privacy, terms, and contact. Four of
  these (academic integrity, AI statement, privacy, terms) carry a visible
  "first draft, pending review" badge until Christopher signs off on the
  wording.
- Footer links to Buy Me a Coffee (buymeacoffee.com/christopheu3) and the
  Lovable funding page, plus a credit line for Dr Christopher Paul Andrew
  McCreanor with an active LinkedIn link.
- A stubbed Paystack checkout route for a future paid membership tier, not
  yet activated.

## What is not built yet

- The AI paragraph/claim-checking feature (a paid, AI-powered feature).
- Any account or authentication system. Saved references are local to the
  browser; a lightweight export/import file is the planned way to move a
  reference list between devices, not yet built.
- The R599/year Paystack plan itself (code is stubbed, no live plan code
  configured).

## Setup

```bash
npm install
cp .env.example .env.local
```

Fill in `.env.local`:

- `CROSSREF_CONTACT_EMAIL` — your email, used for Crossref's polite pool.
  Free evidence search and citation verification work without this, but
  Crossref may rate-limit harder without it.
- Book ISBN lookups use Open Library, which is free and needs no key.
- `OPENALEX_API_KEY` — required as of February 2026, when OpenAlex
  retired its free mailto-only "polite pool". Without this key, evidence
  search shares a $0.10/day budget across every visitor. Free, 30-second
  signup at openalex.org, then copy the key from openalex.org/settings/api.
- `CORE_API_KEY` — optional, only needed if the CORE supplementary source
  is switched on. Register free at core.ac.uk.
- `PAYSTACK_SECRET_KEY` and `NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY` — from your
  Paystack dashboard. Needed only once a paid membership tier is switched
  on.
- `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` — optional, for
  rate-limiting once traffic grows. Not required for local development.

Then run the development server:

```bash
npm run dev
```

Open http://localhost:3000.

## Verifying the build yourself

```bash
npm install
npm run build
npm run lint
```

All three should complete with no errors. `next build` will show a
warning that the API routes disable static generation, which is expected:
they are dynamic by design.

## Deployment

Live on Vercel Hobby (free tier) at https://www.referencelib.com
(referencelib.com apex redirects to www; SSL provisioned automatically by
Vercel). This GitHub repository is connected to the `referencelib` Vercel
project, so a push to `main` triggers an automatic build and deploy — no
manual `vercel` commands needed.

`package-lock.json` is committed but Vercel does not require it to build;
`package.json` alone is sufficient. See `planning/05-deployment-plan.md`
for the full, current deployment procedure.

## Full project history and reasoning

See `planning/01-architecture-and-cost-model.md`,
`planning/02-blueprint.md`, `planning/03-pricing-and-ai-cost-model.md`,
`planning/04-go-live-checklist.md` and `planning/05-deployment-plan.md`
in the parent folder for the full reasoning behind every decision in this
build. Note: the `planning/` folder itself is not part of this repository
(it lives one level up, alongside `referencelib/`, and is not deployed).
