"use client";

import { useEffect, useState } from "react";
import { Header } from "@/components/Header";
import { ToolTabs, ToolView } from "@/components/ToolTabs";
import { ProgressStrip } from "@/components/ProgressStrip";
import { Footer } from "@/components/Footer";
import { AdSlot } from "@/components/AdSlot";
import { EvidenceCard } from "@/components/EvidenceCard";
import { SavedReferencePanel, exportReferenceList } from "@/components/SavedReferencePanel";
import { ManualCitationForm } from "@/components/ManualCitationForm";
import {
  CitationRecord,
  DecodedQuestion,
  EvidenceCardData,
  QualificationProfileId,
  REFERENCING_STYLE_LABELS,
  ReferencingStyle,
  SavedReference,
  VerifyResponse,
} from "@/lib/types";
import { evidenceCardToCitationRecord } from "@/lib/citation/csl/adapter";
import { renderFullReference } from "@/lib/citation/csl/client";
import {
  addSavedReference,
  loadProjectName,
  loadSavedReferences,
  removeSavedReference,
  saveProjectName,
} from "@/lib/storage/local-references";

const VIEW_COPY: Record<ToolView, { heading: string; help: string; placeholder: string; action: string }> = {
  question: {
    heading: "What is your assignment question?",
    help: "The tool identifies the command verb, academic level and evidence needed. It does not write your answer.",
    placeholder: "Evaluate the influence of organisational culture on employee wellbeing and recommend two evidence-based interventions.",
    action: "Decode question",
  },
  paragraph: {
    heading: "Which paragraph needs evidence?",
    help: "Paste an argument you have already written. We aim to surface at least five relevant, freely readable, peer-reviewed sources. This does not judge whether your argument is well evidenced, that is still your assessor's call, and your own.",
    placeholder: "Paste your own paragraph here.",
    action: "Find evidence for this paragraph",
  },
  verify: {
    heading: "Which reference do you want to verify?",
    help: "Paste a full reference, a DOI or a title. Best accuracy comes from a DOI.",
    placeholder: "Paste one reference, DOI or title here.",
    action: "Verify reference",
  },
  audit: {
    heading: "Check citations against your reference list",
    help: "Paste assignment text and its reference list to find any citation with no matching reference.",
    placeholder: "Paste assignment text and reference list here.",
    action: "Run citation check",
  },
};

export default function Page() {
  const [view, setView] = useState<ToolView>("question");
  const [input, setInput] = useState(VIEW_COPY.question.placeholder);
  const [qualification, setQualification] = useState<QualificationProfileId>("cipd-7");
  const [style, setStyle] = useState<ReferencingStyle>("harvard-cite-them-right");

  const [decoded, setDecoded] = useState<DecodedQuestion | null>(null);
  const [decoding, setDecoding] = useState(false);
  const [decodeError, setDecodeError] = useState<string | null>(null);

  const [results, setResults] = useState<EvidenceCardData[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  const [verifyResult, setVerifyResult] = useState<VerifyResponse | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [verifyError, setVerifyError] = useState<string | null>(null);

  const [paragraphResults, setParagraphResults] = useState<EvidenceCardData[] | null>(null);
  const [paragraphMeetsTarget, setParagraphMeetsTarget] = useState(true);
  const [paragraphSearching, setParagraphSearching] = useState(false);
  const [paragraphError, setParagraphError] = useState<string | null>(null);
  // Read-before-copy gate: an evidence card's Save/Copy buttons unlock only
  // once its id is in this set, which only happens after the student clicks
  // Read free on that specific card. Cleared on every new paragraph search.
  const [openedIds, setOpenedIds] = useState<Set<string>>(new Set());

  const [savedRefs, setSavedRefs] = useState<SavedReference[]>([]);
  const [projectName, setProjectName] = useState("My assignment");
  const [manualEntryOpen, setManualEntryOpen] = useState(false);

  useEffect(() => {
    setSavedRefs(loadSavedReferences());
    setProjectName(loadProjectName());
  }, []);

  function switchView(next: ToolView) {
    setView(next);
    setInput(VIEW_COPY[next].placeholder);
    setDecoded(null);
    setResults(null);
    setDecodeError(null);
    setSearchError(null);
    setVerifyResult(null);
    setVerifyError(null);
    setParagraphResults(null);
    setParagraphError(null);
    setOpenedIds(new Set());
  }

  async function handleDecode() {
    setDecoding(true);
    setDecodeError(null);
    setResults(null);
    try {
      const res = await fetch("/api/decode", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: input, qualificationProfileId: qualification }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not decode the question.");
      setDecoded(data as DecodedQuestion);
    } catch (error) {
      setDecodeError(error instanceof Error ? error.message : "Something went wrong.");
    } finally {
      setDecoding(false);
    }
  }

  async function handleSearch() {
    if (!decoded) return;
    setSearching(true);
    setSearchError(null);
    try {
      const res = await fetch("/api/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ terms: decoded.searchTerms.length ? decoded.searchTerms : [decoded.question] }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Search failed.");
      setResults(data.results as EvidenceCardData[]);
    } catch (error) {
      setSearchError(error instanceof Error ? error.message : "Something went wrong.");
    } finally {
      setSearching(false);
    }
  }

  async function handleVerify() {
    if (!input.trim()) return;
    setVerifying(true);
    setVerifyError(null);
    setVerifyResult(null);
    try {
      const res = await fetch("/api/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ input }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not verify this reference.");
      setVerifyResult(data as VerifyResponse);
    } catch (error) {
      setVerifyError(error instanceof Error ? error.message : "Something went wrong.");
    } finally {
      setVerifying(false);
    }
  }

  async function handleParagraphEvidence() {
    if (!input.trim()) return;
    setParagraphSearching(true);
    setParagraphError(null);
    setParagraphResults(null);
    setOpenedIds(new Set());
    try {
      const res = await fetch("/api/paragraph", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paragraph: input }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not find evidence for this paragraph.");
      setParagraphResults(data.results as EvidenceCardData[]);
      setParagraphMeetsTarget(Boolean(data.meetsTarget));
    } catch (error) {
      setParagraphError(error instanceof Error ? error.message : "Something went wrong.");
    } finally {
      setParagraphSearching(false);
    }
  }

  function handleOpenReference(id: string) {
    setOpenedIds((prev) => {
      const next = new Set(prev);
      next.add(id);
      return next;
    });
  }

  function handleSave(card: EvidenceCardData) {
    const next = addSavedReference(
      evidenceCardToCitationRecord(card),
      decoded?.components[0]?.label ?? null
    );
    setSavedRefs(next);
  }

  async function handleCopyCitation(card: EvidenceCardData) {
    try {
      const text = await renderFullReference(evidenceCardToCitationRecord(card), style);
      await navigator.clipboard.writeText(text);
    } catch {
      // Low-stakes convenience copy: fail silently rather than interrupt
      // the student with an error for a clipboard action.
    }
  }

  function handleRemove(id: string) {
    setSavedRefs(removeSavedReference(id));
  }

  function handleAddManualCitation(record: CitationRecord) {
    const next = addSavedReference(record, decoded?.components[0]?.label ?? null);
    setSavedRefs(next);
    setManualEntryOpen(false);
  }

  function handleProjectNameChange(name: string) {
    setProjectName(name);
    saveProjectName(name);
  }

  const copy = VIEW_COPY[view];
  const stepIndex = results ? 2 : decoded ? 1 : 0;

  return (
    <div>
      <Header savedCount={savedRefs.length} />
      <ToolTabs active={view} onChange={switchView} />
      <ProgressStrip activeIndex={savedRefs.length > 0 ? 3 : stepIndex} />

      <div className="grid gap-4 lg:grid-cols-[2fr_0.85fr] lg:items-start">
        <main className="grid gap-4">
          <section className="panel">
            <div>
              <h2 className="text-base font-medium">{copy.heading}</h2>
              <div className="text-xs text-neutral-500">{copy.help}</div>
            </div>
            <label className="form-label">
              Assignment question
              <textarea
                className="form-control min-h-[100px]"
                value={input}
                onChange={(e) => setInput(e.target.value)}
              />
            </label>
            {view === "question" && (
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="form-label">
                  Qualification level
                  <select
                    className="form-control"
                    value={qualification}
                    onChange={(e) => setQualification(e.target.value as QualificationProfileId)}
                  >
                    <option value="cipd-3">CIPD Level 3</option>
                    <option value="cipd-5">CIPD Level 5</option>
                    <option value="cipd-7">CIPD Level 7</option>
                    <option value="undergraduate">Undergraduate</option>
                    <option value="postgraduate-diploma">Postgraduate diploma</option>
                    <option value="masters">Master&apos;s</option>
                    <option value="doctoral">Doctoral</option>
                  </select>
                </label>
                <label className="form-label">
                  Referencing style
                  <select
                    className="form-control"
                    value={style}
                    onChange={(e) => setStyle(e.target.value as ReferencingStyle)}
                  >
                    {Object.entries(REFERENCING_STYLE_LABELS).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            )}
            <div className="flex items-center gap-3">
              {view === "question" && (
                <button className="btn btn-primary" onClick={handleDecode} disabled={decoding}>
                  {decoding ? "Decoding..." : copy.action}
                </button>
              )}
              {view === "verify" && (
                <button className="btn btn-primary" onClick={handleVerify} disabled={verifying}>
                  {verifying ? "Verifying..." : copy.action}
                </button>
              )}
              {view === "paragraph" && (
                <button className="btn btn-primary" onClick={handleParagraphEvidence} disabled={paragraphSearching}>
                  {paragraphSearching ? "Searching..." : copy.action}
                </button>
              )}
              <span className="text-xs text-neutral-500">No account needed for evidence search or citations.</span>
            </div>
            {decodeError && <div className="text-sm text-red-600">{decodeError}</div>}
            {verifyError && <div className="text-sm text-red-600">{verifyError}</div>}
            {paragraphError && <div className="text-sm text-red-600">{paragraphError}</div>}
            {view === "audit" && (
              <div className="text-sm text-neutral-500">
                This mode is on the build roadmap. Find evidence, Verify a reference, and Evidence my paragraph
                are fully working now.
              </div>
            )}
          </section>

          {view === "paragraph" && paragraphResults && (
            <section className="panel">
              <h2 className="text-base font-medium">Evidence for your paragraph</h2>
              <div className="text-xs text-neutral-500">
                Free full text only. Preprints excluded by default. Open and read a source before you can save
                or copy its citation, that is the point: this finds candidates for you, it does not do the
                reading for you.
              </div>
              {!paragraphMeetsTarget && paragraphResults.length > 0 && (
                <div className="text-xs text-neutral-500">
                  Found {paragraphResults.length} freely readable source{paragraphResults.length === 1 ? "" : "s"}
                  {" "}for this paragraph, fewer than the five we aim for. Try a more specific paragraph, or
                  narrow it to one claim at a time, for a fuller list.
                </div>
              )}
              {paragraphResults.length === 0 && (
                <div className="text-sm text-neutral-500">
                  No open-access sources found for this paragraph. Try being more specific about the concept,
                  theory or construct your paragraph relies on.
                </div>
              )}
              {paragraphResults.map((card) => (
                <EvidenceCard
                  key={card.id}
                  card={card}
                  saved={savedRefs.some((r) => r.id === card.id)}
                  locked
                  opened={openedIds.has(card.id)}
                  onOpen={() => handleOpenReference(card.id)}
                  onSave={() => handleSave(card)}
                  onCopyCitation={() => handleCopyCitation(card)}
                />
              ))}
            </section>
          )}

          {view === "verify" && verifyResult && (
            <section className="panel">
              <h2 className="text-base font-medium">Verification result</h2>
              {verifyResult.method === "doi" && (
                verifyResult.found ? (
                  <div className="grid gap-1.5">
                    <span className="badge">Confirmed in Crossref</span>
                    <div className="text-sm font-medium">{verifyResult.title ?? "Untitled"}</div>
                    <div className="text-xs text-neutral-500">
                      {verifyResult.journal ?? "Journal unknown"} · {verifyResult.year ?? "n.d."}
                      {verifyResult.doi ? ` · DOI: ${verifyResult.doi}` : ""}
                    </div>
                  </div>
                ) : (
                  <div className="text-sm text-red-600">
                    No matching record found in Crossref for this DOI. Check the DOI is correct, or it may not
                    exist.
                  </div>
                )
              )}
              {verifyResult.method === "title-search" && (
                <div className="grid gap-2.5">
                  <div className="text-xs text-neutral-500">
                    No DOI was found in what you pasted, so these are the closest title matches from Crossref.
                    A title match is lower confidence than a DOI match.
                  </div>
                  {verifyResult.candidates.length === 0 && (
                    <div className="text-sm text-neutral-500">No close matches found.</div>
                  )}
                  {verifyResult.candidates.map((c, i) => (
                    <div key={i} className="border-t border-neutral-200 pt-2 text-sm first:border-t-0 first:pt-0">
                      <div className="font-medium">{c.title ?? "Untitled"}</div>
                      <div className="text-xs text-neutral-500">
                        {c.journal ?? "Journal unknown"} · {c.year ?? "n.d."}
                        {c.doi ? ` · DOI: ${c.doi}` : ""}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          )}

          <AdSlot label="Advertising position 1 of 3: between input and decoded results." />

          {decoded && (
            <section className="panel">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-base font-medium">Question decoded</h2>
                  <div className="text-xs text-neutral-500">{decoded.qualificationExpectation}</div>
                </div>
                <span className="badge">{decoded.bloomSequence.join(" → ") || "No verb detected"}</span>
              </div>
              <div className="grid gap-2.5 sm:grid-cols-2">
                <div className="border-l-2 border-primary pl-2.5 text-sm">
                  <strong className="block text-sm">Command verbs</strong>
                  {decoded.commandVerbs.map((v) => v.verb).join(", ") || "None detected"}
                </div>
                <div className="border-l-2 border-primary pl-2.5 text-sm">
                  <strong className="block text-sm">Core concepts</strong>
                  {decoded.components.map((c) => c.label).join(", ") || "None detected"}
                </div>
              </div>
              {decoded.commandVerbs.some((v) => v.confidence === "institution-dependent") && (
                <div className="text-xs text-neutral-500">
                  {decoded.commandVerbs
                    .filter((v) => v.confidence === "institution-dependent")
                    .map((v) => `"${v.verb}": ${v.note}`)
                    .join(" ")}
                </div>
              )}
              <div className="flex items-center gap-3">
                <button className="btn btn-primary" onClick={handleSearch} disabled={searching}>
                  {searching ? "Searching..." : "Find free peer-reviewed evidence"}
                </button>
              </div>
              {searchError && <div className="text-sm text-red-600">{searchError}</div>}
            </section>
          )}

          {results && (
            <section className="panel">
              <h2 className="text-base font-medium">Verified evidence</h2>
              <div className="text-xs text-neutral-500">Free full text only. Preprints excluded by default.</div>
              {results.length === 0 && (
                <div className="text-sm text-neutral-500">No open-access results found. Try editing the search terms.</div>
              )}
              {results.map((card) => (
                <EvidenceCard
                  key={card.id}
                  card={card}
                  saved={savedRefs.some((r) => r.id === card.id)}
                  onSave={() => handleSave(card)}
                  onCopyCitation={() => handleCopyCitation(card)}
                />
              ))}
            </section>
          )}

          <AdSlot label="Advertising position 2 of 3: shown after the evidence results." />
        </main>

        <SavedReferencePanel
          refs={savedRefs}
          projectName={projectName}
          onProjectNameChange={handleProjectNameChange}
          style={style}
          onStyleChange={setStyle}
          onRemove={handleRemove}
          onExport={() => void exportReferenceList(savedRefs, style)}
          onOpenManualEntry={() => setManualEntryOpen(true)}
        />
      </div>

      {manualEntryOpen && (
        <ManualCitationForm
          style={style}
          onCancel={() => setManualEntryOpen(false)}
          onAdd={handleAddManualCitation}
        />
      )}

      <Footer />
    </div>
  );
}
