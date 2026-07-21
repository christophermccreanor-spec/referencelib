import fs from "fs";
import path from "path";
import type { ReferencingStyle } from "@/lib/types";

// citeproc-js has no official TypeScript types. This is the actual rendering
// engine behind Zotero and Mendeley: a complete, tested implementation of the
// Citation Style Language spec (github.com/Juris-M/citeproc-js), not a
// hand-rolled formatter. It is style-agnostic: adding a new referencing
// style later (MLA, Chicago, Vancouver) means adding one more free, official
// .csl file from github.com/citation-style-language/styles, not writing new
// rendering logic.
const CSL = require("citeproc");

// The style list itself lives in lib/types.ts (as ReferencingStyle), not
// here, because that file is imported by client components and this file is
// not: it reads .csl/.xml files from disk via fs/path, which only works in
// a server context (Node), never in the browser. Aliasing it here keeps
// every other reference to "SupportedCslStyle" in this module unchanged.
export type SupportedCslStyle = ReferencingStyle;

// Only two styles are supported (planning/05-deployment-plan.md): Harvard
// is small enough to bundle with the app and is read straight from disk.
// APA is a large (85KB) official CSL file; rather than bundle it, it is
// fetched once at request time from the free, official
// citation-style-language GitHub repository (the same source Zotero and
// Mendeley ship) and cached in memory for the life of the serverless
// function. This keeps deployments small without changing what gets
// rendered: it is the identical CC-BY-SA licensed file either way.
const LOCAL_STYLE_FILES: Partial<Record<SupportedCslStyle, string>> = {
  "harvard-cite-them-right": "harvard-cite-them-right.csl",
};

const REMOTE_STYLE_URLS: Partial<Record<SupportedCslStyle, string>> = {
  apa: "https://raw.githubusercontent.com/citation-style-language/styles/master/apa.csl",
};

// Locale files (32KB each) are always fetched from the official CSL locales
// repository for the same reason: every style needs one, so bundling them
// buys nothing but deployment weight.
const REMOTE_LOCALE_BASE_URL = "https://raw.githubusercontent.com/citation-style-language/locales/master/locales-";

// The default locale each style expects. Harvard (Cite Them Right) is a
// British convention; APA is written for US English.
const STYLE_DEFAULT_LOCALE: Record<SupportedCslStyle, string> = {
  "harvard-cite-them-right": "en-GB",
  apa: "en-US",
};

const stylesDir = path.join(process.cwd(), "lib", "citation", "csl", "styles");

const styleCache = new Map<string, string>();
const localeCache = new Map<string, string>();

async function fetchRemoteText(url: string): Promise<string> {
  const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
  if (!res.ok) throw new Error(`Could not fetch ${url}: ${res.status}`);
  return res.text();
}

async function readStyle(style: SupportedCslStyle): Promise<string> {
  const cached = styleCache.get(style);
  if (cached) return cached;
  const localFile = LOCAL_STYLE_FILES[style];
  const content = localFile
    ? fs.readFileSync(path.join(stylesDir, localFile), "utf-8")
    : await fetchRemoteText(REMOTE_STYLE_URLS[style]!);
  styleCache.set(style, content);
  return content;
}

async function readLocale(lang: string): Promise<string> {
  const cached = localeCache.get(lang);
  if (cached) return cached;
  const content = await fetchRemoteText(`${REMOTE_LOCALE_BASE_URL}${lang}.xml`);
  localeCache.set(lang, content);
  return content;
}

// A CSL-JSON item. This mirrors the format citeproc-js (and every other CSL
// processor) consumes directly, so it is the natural target data model for
// task #38's redesign, not an EvidenceBridge-specific shape.
export interface CslJsonItem {
  id: string;
  type: string;
  title?: string;
  author?: { family?: string; given?: string; literal?: string }[];
  issued?: { "date-parts": number[][] };
  accessed?: { "date-parts": number[][] };
  "container-title"?: string;
  publisher?: string;
  "publisher-place"?: string;
  volume?: string | number;
  issue?: string | number;
  page?: string;
  DOI?: string;
  URL?: string;
  ISBN?: string;
  edition?: string | number;
  genre?: string;
  [cslField: string]: unknown;
}

export type CslOutputFormat = "text" | "html";

async function buildSys(items: CslJsonItem[], style: SupportedCslStyle) {
  const itemsById = new Map(items.map((item) => [item.id, item]));
  const defaultLocale = STYLE_DEFAULT_LOCALE[style];
  // citeproc-js calls retrieveLocale synchronously, so every locale it might
  // ask for must already be cached before the engine is constructed.
  // Pre-fetch the style's own default locale here; the callback below falls
  // back to it for any other locale citeproc requests (e.g. a bare "en").
  await readLocale(defaultLocale);
  return {
    retrieveLocale: (lang: string) => localeCache.get(lang) ?? localeCache.get(defaultLocale)!,
    retrieveItem: (id: string) => itemsById.get(id),
  };
}

/**
 * Render a full bibliography (reference list) for a set of CSL-JSON items in
 * the given referencing style. Returns one formatted string per item, in
 * citeproc's own sorted order.
 */
export async function renderBibliography(
  items: CslJsonItem[],
  style: SupportedCslStyle,
  format: CslOutputFormat = "text"
): Promise<string[]> {
  if (items.length === 0) return [];
  const styleXml = await readStyle(style);
  const defaultLocale = STYLE_DEFAULT_LOCALE[style];
  const sys = await buildSys(items, style);
  const engine = new CSL.Engine(sys, styleXml, defaultLocale);
  if (format === "text") engine.setOutputFormat("text");
  engine.updateItems(items.map((item) => item.id));
  const [, entries] = engine.makeBibliography();
  return entries as string[];
}

/**
 * Render a single in-text (parenthetical) citation, e.g. "(Armstrong and
 * Taylor, 2023)", for one CSL-JSON item.
 */
export async function renderInTextCitation(
  item: CslJsonItem,
  style: SupportedCslStyle,
  format: CslOutputFormat = "text"
): Promise<string> {
  const styleXml = await readStyle(style);
  const defaultLocale = STYLE_DEFAULT_LOCALE[style];
  const sys = await buildSys([item], style);
  const engine = new CSL.Engine(sys, styleXml, defaultLocale);
  if (format === "text") engine.setOutputFormat("text");
  engine.updateItems([item.id]);
  return engine.makeCitationCluster([{ id: item.id }]) as string;
}
