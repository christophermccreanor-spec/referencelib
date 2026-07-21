import { CitationRecord, CslName, SourceCredibility, SourceType } from "@/lib/types";
import { splitAuthorName } from "@/lib/citation/csl/adapter";

// Manual entry covers the source types the free search does not find:
// students bring these in from their own reading (a set textbook, a CIPD
// factsheet, a government report). Journal articles are excluded here on
// purpose: they are found and saved through the search tabs, which already
// capture volume/issue/page correctly (task #38).
export type ManualSourceType = Extract<SourceType, "book" | "webpage" | "report">;

export const MANUAL_SOURCE_TYPE_LABELS: Record<ManualSourceType, string> = {
  book: "Book",
  webpage: "Website",
  report: "Report",
};

// The plain-text state a form binds to. Every field is a string (or
// boolean for the one checkbox) so the form component can stay a simple
// controlled form; buildCitationRecord below does all the parsing.
export interface ManualEntryValues {
  authorText: string;
  authorIsOrganisation: boolean;
  title: string;
  year: string;
  publisher: string;
  publisherPlace: string;
  containerTitle: string;
  edition: string;
  isbn: string;
  reportNumber: string;
  url: string;
  accessedDate: string;
}

export function emptyManualEntryValues(): ManualEntryValues {
  return {
    authorText: "",
    authorIsOrganisation: false,
    title: "",
    year: "",
    publisher: "",
    publisherPlace: "",
    containerTitle: "",
    edition: "",
    isbn: "",
    reportNumber: "",
    url: "",
    accessedDate: new Date().toISOString().slice(0, 10),
  };
}

export type ManualFieldKey = keyof ManualEntryValues;

export interface ManualFieldConfig {
  key: ManualFieldKey;
  label: string;
  // Shown under every field, always, per Christopher's explicit brief:
  // CIPD and non-CIPD students alike consistently do not know where in a
  // source to find bibliographic detail, so the form has to teach this,
  // not just collect data.
  guidance: string;
  inputType: "text" | "date" | "checkbox";
  placeholder?: string;
  // Hard-required: the record cannot be saved without it, and there is no
  // sensible "the source doesn't have one" bypass (a book has a title by
  // definition; a website citation has a URL by definition).
  hardRequired?: boolean;
  // Soft-required: normally present, but the source may genuinely lack it.
  // Triggers the "Missing information" confirmation prompt on submission
  // rather than a hard block, mirroring the reference screenshots.
  softRequired?: boolean;
}

const AUTHOR_FIELD: ManualFieldConfig = {
  key: "authorText",
  label: "Author(s) or organisation",
  guidance:
    "Look on the cover, title page or byline for a named author. If none is given, use the organisation responsible for the source instead, and tick the box below. For more than one author, put each on its own line, in the order they appear.",
  inputType: "text",
  softRequired: true,
};

const AUTHOR_ORG_FIELD: ManualFieldConfig = {
  key: "authorIsOrganisation",
  label: "This source's author is an organisation, not a named person",
  guidance: "Tick this if you entered an organisation above, such as CIPD, a government department, or the ILO.",
  inputType: "checkbox",
};

const YEAR_FIELD: ManualFieldConfig = {
  key: "year",
  label: "Year of publication",
  guidance:
    "Found on the copyright page, near the © symbol, or wherever a publication or 'last updated' date is shown. If the source is genuinely undated, leave this blank rather than guessing; it will be marked 'n.d.'.",
  inputType: "text",
  placeholder: "e.g. 2023",
  softRequired: true,
};

const FIELD_LIBRARY: Record<ManualSourceType, ManualFieldConfig[]> = {
  book: [
    {
      key: "title",
      label: "Title",
      guidance: "The full title as printed on the title page, including any subtitle after a colon.",
      inputType: "text",
      hardRequired: true,
    },
    AUTHOR_FIELD,
    AUTHOR_ORG_FIELD,
    YEAR_FIELD,
    {
      key: "publisher",
      label: "Publisher",
      guidance: "Found on the copyright page, usually near the bottom, e.g. 'Kogan Page' or 'Routledge'.",
      inputType: "text",
      softRequired: true,
    },
    {
      key: "publisherPlace",
      label: "Place of publication",
      guidance: "Also on the copyright page, usually printed next to the publisher's name, e.g. 'London'.",
      inputType: "text",
    },
    {
      key: "edition",
      label: "Edition",
      guidance:
        "Only needed if this is not a first edition. Printed on the title page or copyright page, e.g. '2nd edition' or '16th ed.'. Leave blank for a first edition.",
      inputType: "text",
      placeholder: "e.g. 16",
    },
    {
      key: "isbn",
      label: "ISBN",
      guidance: "A 10 or 13-digit number on the copyright page or the back cover, usually next to a barcode. Optional.",
      inputType: "text",
    },
  ],
  webpage: [
    {
      key: "title",
      label: "Title of the page",
      guidance:
        "The heading of the specific page you used, not just the website's name. Usually the largest heading on the page, or the text shown in your browser tab.",
      inputType: "text",
      hardRequired: true,
    },
    AUTHOR_FIELD,
    AUTHOR_ORG_FIELD,
    YEAR_FIELD,
    {
      key: "containerTitle",
      label: "Website or organisation name",
      guidance:
        "The name of the overall website or publishing body, e.g. 'NHS' or 'Chartered Institute of Personnel and Development'. Leave blank if this is the same as the author above.",
      inputType: "text",
    },
    {
      key: "url",
      label: "Web address (URL)",
      guidance: "Copy the full web address from your browser's address bar.",
      inputType: "text",
      hardRequired: true,
    },
    {
      key: "accessedDate",
      label: "Date you accessed this page",
      guidance:
        "The date you actually read the page, defaulted to today. Websites can change, so referencing styles ask for this alongside the URL.",
      inputType: "date",
      hardRequired: true,
    },
  ],
  report: [
    {
      key: "title",
      label: "Title",
      guidance: "The full title as printed on the report's cover page.",
      inputType: "text",
      hardRequired: true,
    },
    AUTHOR_FIELD,
    AUTHOR_ORG_FIELD,
    YEAR_FIELD,
    {
      key: "publisher",
      label: "Publisher / issuing organisation",
      guidance:
        "Usually the same as the author for official reports, e.g. 'CIPD' or 'HM Government'. Found on the cover or inside title page.",
      inputType: "text",
      softRequired: true,
    },
    {
      key: "publisherPlace",
      label: "Place of publication",
      guidance: "Where the publisher is based, found on the copyright or details page, e.g. 'London'. Optional.",
      inputType: "text",
    },
    {
      key: "reportNumber",
      label: "Report or reference number",
      guidance:
        "Some official reports carry a reference code, e.g. 'Cm 1234'. Found on the cover or copyright page, if present. Optional.",
      inputType: "text",
    },
    {
      key: "url",
      label: "Web address (URL), if read online",
      guidance: "If you read this report online rather than in print, copy the full web address. Otherwise leave blank.",
      inputType: "text",
    },
    {
      key: "accessedDate",
      label: "Date you accessed this report online",
      guidance: "Only needed if you gave a URL above: the date you actually read it.",
      inputType: "date",
    },
  ],
};

export function getFieldsForType(type: ManualSourceType): ManualFieldConfig[] {
  return FIELD_LIBRARY[type];
}

// Fields eligible for the "Missing information" confirmation prompt: soft
// required, currently blank. Hard-required blank fields block submission
// directly instead, since there is no genuine ambiguity to confirm (every
// book has a title; a website citation cannot exist without a URL).
export function getSoftMissingFields(
  type: ManualSourceType,
  values: ManualEntryValues
): ManualFieldConfig[] {
  return getFieldsForType(type).filter((field) => {
    if (!field.softRequired) return false;
    const raw = values[field.key];
    return typeof raw === "string" && raw.trim() === "";
  });
}

export function getHardMissingFields(
  type: ManualSourceType,
  values: ManualEntryValues
): ManualFieldConfig[] {
  return getFieldsForType(type).filter((field) => {
    if (!field.hardRequired) return false;
    // The report type's URL/accessed-date are only hard-required once a URL
    // has been started; treated as a pair below rather than in this loop.
    if (type === "report" && (field.key === "url" || field.key === "accessedDate")) return false;
    const raw = values[field.key];
    return typeof raw === "string" && raw.trim() === "";
  });
}

// For a report accessed online, both URL and accessed date must be given
// together; the guidance for accessedDate above explains this is
// conditional, so it is checked separately from the standard hard-required
// pass rather than always being demanded.
export function getReportUrlPairIssue(values: ManualEntryValues): string | null {
  const hasUrl = values.url.trim() !== "";
  const hasDate = values.accessedDate.trim() !== "";
  if (hasUrl && !hasDate) return "Give the date you accessed this report online, or remove the web address.";
  return null;
}

function parseAuthors(values: ManualEntryValues): CslName[] {
  const text = values.authorText.trim();
  if (!text) return [];
  if (values.authorIsOrganisation) return [{ literal: text }];
  return text
    .split(/\n|;/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map(splitAuthorName);
}

function parseYear(raw: string): number | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const year = Number.parseInt(trimmed, 10);
  return Number.isFinite(year) ? year : null;
}

function parseAccessedDate(raw: string): { "date-parts": number[][] } | undefined {
  const trimmed = raw.trim();
  if (!trimmed) return undefined;
  const parts = trimmed.split("-").map((p) => Number.parseInt(p, 10));
  if (parts.length !== 3 || parts.some((p) => Number.isNaN(p))) return undefined;
  return { "date-parts": [parts] };
}

export function buildCitationRecord(
  type: ManualSourceType,
  values: ManualEntryValues,
  credibility: SourceCredibility
): CitationRecord {
  const year = parseYear(values.year);
  return {
    id: `manual-${type}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    type,
    title: values.title.trim(),
    author: parseAuthors(values),
    issued: year ? { "date-parts": [[year]] } : undefined,
    accessed: parseAccessedDate(values.accessedDate),
    "container-title": values.containerTitle.trim() || undefined,
    publisher: values.publisher.trim() || undefined,
    "publisher-place": values.publisherPlace.trim() || undefined,
    edition: values.edition.trim() || undefined,
    ISBN: values.isbn.trim() || undefined,
    number: values.reportNumber.trim() || undefined,
    URL: values.url.trim() || undefined,
    credibility,
  };
}
