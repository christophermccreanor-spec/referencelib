import { describe, it, expect, vi, afterEach } from "vitest";
import { searchOpenAlex } from "@/lib/sources/openalex";

function mockOpenAlexResponse(results: unknown[]) {
  global.fetch = vi.fn().mockResolvedValue({
    ok: true,
    json: async () => ({ results }),
  }) as unknown as typeof fetch;
}

describe("searchOpenAlex", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("regression: propagates volume/issue/page from biblio so a published article is not mislabelled a preprint", () => {
    // Found while testing the citeproc-js Harvard style (task #38): without
    // these fields, a fully published journal article was read as lacking
    // publication data and rendered "[Preprint]" in the reference list.
    mockOpenAlexResponse([
      {
        id: "https://openalex.org/W1",
        doi: "https://doi.org/10.1/example",
        title: "A study of organisational culture",
        publication_year: 2021,
        type: "article",
        authorships: [{ author: { display_name: "J. Smith" } }],
        primary_location: {
          source: { display_name: "Journal of Work Psychology", type: "journal" },
          version: "publishedVersion",
        },
        open_access: { is_oa: true },
        biblio: { volume: "12", issue: "3", first_page: "45", last_page: "60" },
      },
    ]);

    return searchOpenAlex("organisational culture").then((cards) => {
      expect(cards).toHaveLength(1);
      const card = cards[0];
      expect(card.isPreprint).toBe(false);
      expect(card.volume).toBe("12");
      expect(card.issue).toBe("3");
      expect(card.page).toBe("45-60");
    });
  });

  it("formats a single-page result without a range", () => {
    mockOpenAlexResponse([
      {
        id: "https://openalex.org/W2",
        doi: null,
        title: "A short note",
        publication_year: 2020,
        type: "article",
        authorships: [],
        primary_location: { source: { display_name: "Journal X", type: "journal" }, version: "publishedVersion" },
        open_access: { is_oa: true },
        biblio: { volume: "1", issue: "1", first_page: "10", last_page: "10" },
      },
    ]);

    return searchOpenAlex("test").then((cards) => {
      expect(cards[0].page).toBe("10");
    });
  });

  it("marks a submitted-version work as a preprint", () => {
    mockOpenAlexResponse([
      {
        id: "https://openalex.org/W3",
        doi: null,
        title: "Working paper draft",
        publication_year: 2023,
        type: "preprint",
        authorships: [],
        primary_location: { source: { display_name: null, type: "repository" }, version: "submittedVersion" },
        open_access: { is_oa: true },
      },
    ]);

    return searchOpenAlex("test").then((cards) => {
      expect(cards[0].isPreprint).toBe(true);
      expect(cards[0].version).toBe("preprint");
    });
  });

  it("filters out results with no title", () => {
    mockOpenAlexResponse([
      { id: "https://openalex.org/W4", doi: null, title: null, publication_year: 2020, type: "article" },
    ]);

    return searchOpenAlex("test").then((cards) => {
      expect(cards).toHaveLength(0);
    });
  });

  it("regression: falls back to the landing page when pdf_url points at a graphical-abstract image, not the paper", () => {
    // Found live: this exact ars.els-cdn.com URL shape was returned as
    // best_oa_location.pdf_url for a ScienceDirect article. It is a
    // thumbnail of the paper's graphical abstract, not the full text, so
    // clicking "Read free" opened a picture instead of the source.
    mockOpenAlexResponse([
      {
        id: "https://openalex.org/W5",
        doi: "https://doi.org/10.1/example2",
        title: "The joint impact of green HRM and culture",
        publication_year: 2021,
        type: "article",
        authorships: [],
        primary_location: { source: { display_name: "Journal of Cleaner Production", type: "journal" } },
        open_access: { is_oa: true },
        best_oa_location: {
          pdf_url: "https://ars.els-cdn.com/content/image/1-s2.0-S0959652621023301-ga1_lrg.jpg",
          landing_page_url: "https://www.sciencedirect.com/science/article/pii/S0959652621023301",
          version: "publishedVersion",
        },
      },
    ]);

    return searchOpenAlex("test").then((cards) => {
      expect(cards[0].fullTextUrl).toBe(
        "https://www.sciencedirect.com/science/article/pii/S0959652621023301"
      );
    });
  });

  it("keeps a real pdf_url that happens to use query params or non-.pdf paths", () => {
    // Guards against over-fixing: legitimate full-text links seen live
    // rarely end in a plain ".pdf" (DOI redirects, "/pdf/full" paths,
    // "?type=printable" query strings), so the fix must not reject these.
    mockOpenAlexResponse([
      {
        id: "https://openalex.org/W6",
        doi: null,
        title: "A systematic review",
        publication_year: 2018,
        type: "article",
        authorships: [],
        primary_location: { source: { display_name: "PLoS ONE", type: "journal" } },
        open_access: { is_oa: true },
        best_oa_location: {
          pdf_url: "https://journals.plos.org/plosone/article/file?id=10.1371/journal.pone.0203000&type=printable",
          version: "publishedVersion",
        },
      },
    ]);

    return searchOpenAlex("test").then((cards) => {
      expect(cards[0].fullTextUrl).toBe(
        "https://journals.plos.org/plosone/article/file?id=10.1371/journal.pone.0203000&type=printable"
      );
    });
  });

  it("throws a clear error when the OpenAlex request fails", () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: false, status: 503 }) as unknown as typeof fetch;
    return expect(searchOpenAlex("test")).rejects.toThrow("OpenAlex request failed: 503");
  });
});
