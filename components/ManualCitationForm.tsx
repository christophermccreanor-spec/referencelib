import { useEffect, useMemo, useState } from "react";
import { CitationRecord, ReferencingStyle, REFERENCING_STYLE_LABELS } from "@/lib/types";
import { renderFullReference } from "@/lib/citation/csl/client";
import {
  ManualEntryValues,
  ManualFieldConfig,
  ManualSourceType,
  MANUAL_SOURCE_TYPE_LABELS,
  buildCitationRecord,
  emptyManualEntryValues,
  getFieldsForType,
  getHardMissingFields,
  getReportUrlPairIssue,
  getSoftMissingFields,
} from "@/lib/citation/manual-entry";

const MANUAL_TYPES: ManualSourceType[] = ["book", "webpage", "report"];

export function ManualCitationForm({
  style,
  onCancel,
  onAdd,
}: {
  style: ReferencingStyle;
  onCancel: () => void;
  onAdd: (record: CitationRecord) => void;
}) {
  const [activeType, setActiveType] = useState<ManualSourceType>("book");
  const [values, setValues] = useState<ManualEntryValues>(emptyManualEntryValues());
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [missingQueue, setMissingQueue] = useState<ManualFieldConfig[] | null>(null);
  const [missingIndex, setMissingIndex] = useState(0);
  const [preview, setPreview] = useState<string>("");
  const [previewLoading, setPreviewLoading] = useState(false);
  const [isbnLookupStatus, setIsbnLookupStatus] = useState<"idle" | "loading" | "error" | "success">("idle");
  const [isbnLookupMessage, setIsbnLookupMessage] = useState<string | null>(null);

  const fields = getFieldsForType(activeType);
  const sourceTypeLabel = MANUAL_SOURCE_TYPE_LABELS[activeType];

  function switchType(next: ManualSourceType) {
    setActiveType(next);
    setValues(emptyManualEntryValues());
    setFieldErrors({});
    setMissingQueue(null);
  }

  function setField<K extends keyof ManualEntryValues>(key: K, value: ManualEntryValues[K]) {
    setValues((prev) => ({ ...prev, [key]: value }));
    setFieldErrors((prev) => {
      if (!(key in prev)) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }

  // Live preview, debounced, so the student sees the reference take shape
  // as they type, matching the reference screenshots' layout. Skipped
  // until a title is entered since an empty citation is not useful and
  // would just add noise while the student is still filling in the form.
  useEffect(() => {
    if (!values.title.trim()) {
      setPreview("");
      return;
    }
    setPreviewLoading(true);
    const timer = setTimeout(async () => {
      try {
        const draft = buildCitationRecord(activeType, values, "unverified");
        const text = await renderFullReference(draft, style);
        setPreview(text);
      } catch {
        setPreview("Preview unavailable. Check the fields above and try again.");
      } finally {
        setPreviewLoading(false);
      }
    }, 400);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [values, activeType, style]);

  // Autofill only ever writes into fields the student has left blank, so a
  // lookup can never silently overwrite something they already typed or
  // corrected. Title, author and year are still opt-in to double-check:
  // the status message below the button says as much.
  async function handleIsbnLookup() {
    const isbn = values.isbn.trim();
    if (!isbn) {
      setIsbnLookupStatus("error");
      setIsbnLookupMessage("Enter an ISBN first.");
      return;
    }
    setIsbnLookupStatus("loading");
    setIsbnLookupMessage(null);
    try {
      const res = await fetch("/api/books", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isbn }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not look up that ISBN.");
      setValues((prev) => ({
        ...prev,
        title: prev.title.trim() ? prev.title : (data.title as string) ?? prev.title,
        authorText: prev.authorText.trim()
          ? prev.authorText
          : ((data.authors as string[]) ?? []).join("\n"),
        publisher: prev.publisher.trim() ? prev.publisher : (data.publisher as string) ?? prev.publisher,
        year: prev.year.trim() ? prev.year : (data.year as string) ?? prev.year,
      }));
      setIsbnLookupStatus("success");
      setIsbnLookupMessage("Filled in what we found. Check it against your copy before adding.");
    } catch (error) {
      setIsbnLookupStatus("error");
      setIsbnLookupMessage(error instanceof Error ? error.message : "Could not look up that ISBN.");
    }
  }

  const reportUrlPairIssue = useMemo(
    () => (activeType === "report" ? getReportUrlPairIssue(values) : null),
    [activeType, values]
  );

  function handleAddClick() {
    const hardMissing = getHardMissingFields(activeType, values);
    const errors: Record<string, string> = {};
    for (const field of hardMissing) {
      errors[field.key] = `${field.label} is required. Check your source again: ${field.guidance}`;
    }
    if (reportUrlPairIssue) errors.accessedDate = reportUrlPairIssue;
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    const softMissing = getSoftMissingFields(activeType, values);
    if (softMissing.length > 0) {
      setMissingQueue(softMissing);
      setMissingIndex(0);
      return;
    }

    submit();
  }

  function submit() {
    const record = buildCitationRecord(activeType, values, "unverified");
    onAdd(record);
    setValues(emptyManualEntryValues());
    setFieldErrors({});
    setMissingQueue(null);
    setPreview("");
  }

  function handleMissingConfirmAbsent() {
    if (!missingQueue) return;
    if (missingIndex + 1 < missingQueue.length) {
      setMissingIndex(missingIndex + 1);
    } else {
      setMissingQueue(null);
      submit();
    }
  }

  function handleMissingGoBack() {
    if (!missingQueue) return;
    const field = missingQueue[missingIndex];
    setMissingQueue(null);
    // Give the student a clear next step rather than just closing the
    // prompt: highlight the field so they know exactly where to go back
    // and check their source.
    setFieldErrors((prev) => ({
      ...prev,
      [field.key]: `Check your source again for the ${field.label.toLowerCase()}, then update it above.`,
    }));
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="grid max-h-[90vh] w-full max-w-2xl gap-4 overflow-y-auto rounded-xl bg-white p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-base font-medium">Cite a source</h2>
            <div className="text-xs text-neutral-500">
              For sources you found yourself, not through the evidence search: a book, a website, or a
              government, CIPD or international-body report.
            </div>
          </div>
          <button className="btn btn-ghost" onClick={onCancel} aria-label="Close">
            Cancel
          </button>
        </div>

        <nav className="flex flex-wrap gap-1.5">
          {MANUAL_TYPES.map((type) => (
            <button
              key={type}
              className={activeType === type ? "btn btn-primary" : "btn"}
              aria-pressed={activeType === type}
              onClick={() => switchType(type)}
            >
              {MANUAL_SOURCE_TYPE_LABELS[type]}
            </button>
          ))}
        </nav>

        <div className="grid gap-3">
          {fields.map((field) => (
            <div key={field.key} className="grid gap-1.5">
            <label className="form-label">
              {field.inputType !== "checkbox" && field.label}
              {field.inputType !== "checkbox" && (
                <div className="text-xs font-normal text-neutral-500">
                  Where to find this: {field.guidance}
                </div>
              )}
              {field.inputType === "checkbox" ? (
                <span className="flex items-start gap-2 text-sm font-normal text-neutral-800">
                  <input
                    type="checkbox"
                    className="mt-0.5"
                    checked={values.authorIsOrganisation}
                    onChange={(e) => setField("authorIsOrganisation", e.target.checked)}
                  />
                  <span>
                    {field.label}
                    <span className="block text-xs text-neutral-500">{field.guidance}</span>
                  </span>
                </span>
              ) : field.inputType === "date" ? (
                <input
                  type="date"
                  className="form-control"
                  value={values[field.key] as string}
                  onChange={(e) => setField(field.key, e.target.value)}
                />
              ) : field.key === "authorText" ? (
                <textarea
                  className="form-control min-h-[70px]"
                  placeholder={field.placeholder}
                  value={values[field.key] as string}
                  onChange={(e) => setField(field.key, e.target.value)}
                />
              ) : (
                <input
                  type="text"
                  className="form-control"
                  placeholder={field.placeholder}
                  value={values[field.key] as string}
                  onChange={(e) => setField(field.key, e.target.value)}
                />
              )}
              {fieldErrors[field.key] && (
                <div className="text-xs text-red-600">{fieldErrors[field.key]}</div>
              )}
            </label>
            {activeType === "book" && field.key === "isbn" && (
              <div className="grid gap-1.5">
                <button
                  type="button"
                  className="btn justify-self-start"
                  onClick={handleIsbnLookup}
                  disabled={isbnLookupStatus === "loading"}
                >
                  {isbnLookupStatus === "loading" ? "Looking up..." : "Look up by ISBN"}
                </button>
                {isbnLookupMessage && (
                  <div
                    className={
                      isbnLookupStatus === "error" ? "text-xs text-red-600" : "text-xs text-neutral-500"
                    }
                  >
                    {isbnLookupMessage}
                  </div>
                )}
              </div>
            )}
            </div>
          ))}
        </div>

        <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-3">
          <div className="text-xs font-medium text-neutral-600">
            Preview ({REFERENCING_STYLE_LABELS[style]})
          </div>
          <div className="mt-1 text-sm text-neutral-900">
            {values.title.trim() === ""
              ? "Add a title to see how this reference will look."
              : previewLoading
                ? "Rendering..."
                : preview}
          </div>
        </div>

        <div className="text-xs text-neutral-500">
          Manually entered sources are not automatically checked. Double check every detail against your
          source before you submit your assignment.
        </div>

        <div className="flex justify-end gap-2">
          <button className="btn btn-ghost" onClick={onCancel}>
            Cancel
          </button>
          <button className="btn btn-primary" onClick={handleAddClick}>
            Add source
          </button>
        </div>
      </div>

      {missingQueue && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
          <div className="grid w-full max-w-md gap-3 rounded-xl bg-white p-5">
            <div className="text-xs font-medium text-neutral-500">
              Missing information ({missingIndex + 1} of {missingQueue.length})
            </div>
            <h3 className="text-base font-medium">
              We could not confirm the {missingQueue[missingIndex].label.toLowerCase()} for this{" "}
              {sourceTypeLabel.toLowerCase()}.
            </h3>
            <p className="text-sm text-neutral-700">
              Please check your source again. {missingQueue[missingIndex].guidance}
            </p>
            <p className="text-sm font-medium text-neutral-800">
              Does this source have {startsWithVowel(missingQueue[missingIndex].label) ? "an" : "a"}{" "}
              {missingQueue[missingIndex].label.toLowerCase()}?
            </p>
            <div className="flex justify-end gap-2">
              <button className="btn btn-ghost" onClick={handleMissingGoBack}>
                Yes, let me check again
              </button>
              <button className="btn btn-primary" onClick={handleMissingConfirmAbsent}>
                No, it doesn&apos;t have one
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function startsWithVowel(label: string): boolean {
  return /^[aeiou]/i.test(label.trim());
}
