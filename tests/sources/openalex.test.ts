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

  it("regression: does not fall back to primary_location for the free-text link when best_oa_location is missing", () => {
    // Found from real student testing (28 August 2026): several results
    // marked as free open access opened onto a publisher paywall instead.
    // Root cause: when OpenAlex has not populated best_oa_location for a
    // work (a data-quality gap that happens even when open_access.is_oa is
    // true), the old code fell back to primary_location, which is just
    // wherever the work was indexed from and carries no OA guarantee at
    // all. This work has a primary_location landing page but no
    // best_oa_location, mirroring what a paywalled publisher record looks
    // like from the API. fullTextUrl must be null, not that paywalled URL.
    mockOpenAlexResponse([
      {
        id: "https://openalex.org/W7",
        doi: "https://doi.org/10.1/example3",
        title: "A paywalled record with no vouched-for OA location",
        publication_year: 2019,
        type: "article",
        authorships: [],
        primary_location: {
          source: { display_name: "Some Publisher Journal", type: "journal" },
          landing_page_url: "https://paywalled-publisher.example.com/article/123",
          is_oa: false,
        },
        open_access: { is_oa: true },
      },
    ]);

    return searchOpenAlex("test").then((cards) => {
      expect(cards[0].fullTextUrl).toBeNull();
    });
  });

  it("regression: drops an off-topic collision that shares one incidental word with the query", () => {
    // A cancer-chemotherapy paper ranked into a "recruitment selection
    // candidate experience" search on the strength of "drug candidates".
    // Health Sciences domain + only one query concept in the title => dropped.
    mockOpenAlexResponse([
      {
        id: "https://openalex.org/W8",
        doi: "https://doi.org/10.1/onco",
        title: "Cancer chemotherapy and beyond: Current status, drug candidates, associated risks",
        publication_year: 2022,
        type: "article",
        authorships: [],
        primary_location: { source: { display_name: "Genes & Diseases", type: "journal" } },
        primary_topic: { domain: { display_name: "Health Sciences" } },
        open_access: { is_oa: true },
        best_oa_location: {
          pdf_url: "https://example.org/onco.pdf",
          version: "publishedVersion",
        },
      },
      {
        id: "https://openalex.org/W9",
        doi: "https://doi.org/10.1/hr",
        title: "Memorable Candidate Experiences Throughout the Recruitment and Selection Process",
        publication_year: 2024,
        type: "article",
        authorships: [],
        primary_location: { source: { display_name: "HR Journal", type: "journal" } },
        primary_topic: { domain: { display_name: "Social Sciences" } },
        open_access: { is_oa: true },
        best_oa_location: {
          pdf_url: "https://example.org/hr.pdf",
          version: "publishedVersion",
        },
      },
    ]);

    return searchOpenAlex("recruitment selection candidate experience").then((cards) => {
      expect(cards).toHaveLength(1);
      expect(cards[0].title).toContain("Candidate Experiences");
    });
  });

  it("prefers a published-version PDF from another OA location over a best_oa_location landing page", () => {
    // best_oa_location is a publisher landing page (no PDF) — where access
    // walls appear. A PMC copy of the same version of record offers a direct
    // PDF, so the free-text link should be that PDF, not the publisher page.
    mockOpenAlexResponse([
      {
        id: "https://openalex.org/W10",
        doi: "https://doi.org/10.1/example4",
        title: "Flexible working and employee performance",
        publication_year: 2023,
        type: "article",
        authorships: [],
        primary_location: { source: { display_name: "Publisher Journal", type: "journal" } },
        primary_topic: { domain: { display_name: "Social Sciences" } },
        open_access: { is_oa: true },
        best_oa_location: {
          landing_page_url: "https://publisher.example.com/article/abc",
          version: "publishedVersion",
        },
        locations: [
          {
            is_oa: true,
            version: "publishedVersion",
            landing_page_url: "https://publisher.example.com/article/abc",
            source: { type: "journal" },
          },
          {
            is_oa: true,
            version: "publishedVersion",
            pdf_url: "https://www.ncbi.nlm.nih.gov/pmc/articles/PMC123456/pdf/main.pdf",
            source: { type: "repository" },
          },
        ],
      },
    ]);

    return searchOpenAlex("flexible working employee performance").then((cards) => {
      expect(cards[0].fullTextUrl).toBe(
        "https://www.ncbi.nlm.nih.gov/pmc/articles/PMC123456/pdf/main.pdf"
      );
    });
  });

  it("does not surface a submitted-version (preprint) repository copy as the free link", () => {
    // Only published-version OA locations are eligible for the cross-location
    // rescue; a submitted-version manuscript must not stand in for the source.
    // Here best_oa_location has the published PDF, so that is used.
    mockOpenAlexResponse([
      {
        id: "https://openalex.org/W11",
        doi: "https://doi.org/10.1/example5",
        title: "Talent retention and development",
        publication_year: 2023,
        type: "article",
        authorships: [],
        primary_location: { source: { display_name: "HR Journal", type: "journal" } },
        primary_topic: { domain: { display_name: "Social Sciences" } },
        open_access: { is_oa: true },
        best_oa_location: {
          pdf_url: "https://example.org/published.pdf",
          version: "publishedVersion",
        },
        locations: [
          {
            is_oa: true,
            version: "submittedVersion",
            pdf_url: "https://repository.example.edu/preprint.pdf",
            source: { type: "repository" },
          },
          {
            is_oa: true,
            version: "publishedVersion",
            pdf_url: "https://example.org/published.pdf",
            source: { type: "journal" },
          },
        ],
      },
    ]);

    return searchOpenAlex("talent retention development").then((cards) => {
      expect(cards[0].fullTextUrl).toBe("https://example.org/published.pdf");
    });
  });

  it("throws a clear error when the OpenAlex request fails", () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: false, status: 503 }) as unknown as typeof fetch;
    return expect(searchOpenAlex("test")).rejects.toThrow("OpenAlex request failed: 503");
  });
});
