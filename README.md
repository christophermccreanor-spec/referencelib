# ReferenceLib

A low-cost, one-page research tool that helps students decode an assignment
question against Bloom's taxonomy and command-verb analysis, find free
peer-reviewed evidence through OpenAlex, Crossref and DOAJ, and generate
Harvard or APA 7 citations. Built with Next.js 14 (App Router), TypeScript
and Tailwind CSS.

This build has been verified: `npm install`, `next build` and `next lint`
all complete cleanly (confirmed 19 July 2026), and the same build has been
deployed live and tested in production (confirmed 20 July 2026):

https://www.referencelib.com

The product was renamed from EvidenceBridge to ReferenceLib on 20 July 2026,
to match the domain referencelib.com, which was attached and verified live
with SSL the same day. The underlying Vercel project slug still says
"evidencebridge" internally (kept as-is to avoid an unnecessary project
migration); the site itself is fully on the custom domain now. The original
https://evidencebridge.vercel.app URL still works and serves the same
deployment.

Pilot mode is on by default, so the site asks search engines not to index
it and shows a "Private pilot" badge instead of the account and payment
buttons. See `planning/04-go-live-checklist.md` for full deployment status
and remaining steps.

## What is built

- Rule-based question decoder (command verb, Bloom's stage sequence,
  qualification-level expectations, concept extraction, search terms). No
  AI call, no cost.
- Evidence search against OpenAlex, with peer-review status upgraded to
  "verified" via DOAJ, and DOI/title verification via Crossref. Preprints
  excluded by default.
- Harvard and APA 7 citation formatting (template-based; see the note in
  `lib/citation/format.ts` on the citeproc-js upgrade path noted in the
  architecture document).
- Local-only saved-reference list (browser local storage, no account, no
  server-side storage).
- A stubbed Paystack checkout route for the R599/year full membership,
  ready to activate once a Paystack plan code exists.

## What is not built yet

- The AI paragraph/claim-checking feature itself (the paid, GPT-4o mini
  powered feature). The free tier's 5-checks-per-30-days limit has nowhere
  to attach until this exists.
- Any account or authentication system. The free tier's usage cap needs an
  email-only account to enforce; this has not been built.
- Full citeproc-js/CSL citation formatting. The current formatter is a
  documented placeholder covering Harvard and APA 7 only.

## Setup

```bash
npm install
cp .env.example .env.local
```

Fill in `.env.local`:

- `CROSSREF_CONTACT_EMAIL` — your email, used for Crossref's polite pool.
  Free evidence search and citation verification work without this, but
  Crossref may rate-limit harder without it.
- `CORE_API_KEY` — optional, only needed if the CORE supplementary source
  is switched on. Register free at core.ac.uk.
- `PAYSTACK_SECRET_KEY` and `NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY` — from your
  Paystack dashboard. Needed only once the full-membership checkout is
  switched on.
- `PAYSTACK_PLAN_CODE` — the subscription plan code from Paystack, once
  the R599/year plan has been created there.
- `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` — optional, for
  rate-limiting once the site is public. Not required for local
  development or the private pilot.

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

Live on Vercel Hobby (free tier), as the architecture document specified,
at https://www.referencelib.com (referencelib.com apex redirects to www;
SSL provisioned automatically by Vercel). Deployed directly from source, no
Git repository required. To redeploy after a future code change, either
connect this folder to a Git repository and push, or use `npx vercel --prod`
from inside the folder once logged in with `npx vercel login`.

## Next steps before the CIPD pilot

1. Select three real CIPD assignment questions for usability testing and
   run them through the live decoder (still open, per the blueprint's
   section 14).
2. Register a CORE API key if the supplementary source is wanted (optional,
   not required for pilot).

## Deferred to public launch, not needed for the pilot

3. Decide on live advertising (ad slots currently render nothing, by
   design, while pilot mode is on).
4. Create the R599/year subscription plan in the Paystack dashboard and
   set `PAYSTACK_PLAN_CODE`.

See `planning/02-blueprint.md`, `planning/01-architecture-and-cost-model.md`
and `planning/03-pricing-and-ai-cost-model.md` in the parent folder for the
full reasoning behind every decision in this build.
