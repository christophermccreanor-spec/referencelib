import { describe, it, expect } from "vitest";
import { effectiveSinceYear, DEFAULT_RECENCY_YEARS } from "@/lib/search/recency";

// Regression for the 30 August 2026 audit: a default evidence search (no year
// requested) returned peer-reviewed work older than six years, because the
// route defaulted the year filter to "no filter". These lock in that the
// default is always the rolling recency floor, and that the floor cannot be
// widened past by an explicit older year.
describe("effectiveSinceYear", () => {
  const now = new Date("2026-08-30T00:00:00Z");
  const floor = 2026 - DEFAULT_RECENCY_YEARS; // 2020 with the default window

  it("defaults to the rolling recency floor when no year is requested", () => {
    expect(effectiveSinceYear(undefined, now)).toBe(floor);
  });

  it("treats a non-finite value the same as no request", () => {
    expect(effectiveSinceYear(NaN, now)).toBe(floor);
  });

  it("clamps an explicit older year up to the floor (recency rule wins)", () => {
    expect(effectiveSinceYear(1991, now)).toBe(floor);
    expect(effectiveSinceYear(2010, now)).toBe(floor);
    expect(effectiveSinceYear(floor - 1, now)).toBe(floor);
  });

  it("honours an explicit year that is more recent than the floor", () => {
    expect(effectiveSinceYear(2024, now)).toBe(2024);
    expect(effectiveSinceYear(floor + 1, now)).toBe(floor + 1);
  });

  it("keeps the floor exactly at the boundary year", () => {
    expect(effectiveSinceYear(floor, now)).toBe(floor);
  });

  it("rolls forward with the current year", () => {
    const later = new Date("2030-01-15T00:00:00Z");
    expect(effectiveSinceYear(undefined, later)).toBe(2030 - DEFAULT_RECENCY_YEARS);
  });
});
