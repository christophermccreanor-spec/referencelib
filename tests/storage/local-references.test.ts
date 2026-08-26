import { describe, it, expect, beforeEach, vi } from "vitest";
import { hasSeenIntro, markIntroSeen } from "@/lib/storage/local-references";

// Covers the welcome-tour visibility flag only (components/WelcomeTour.tsx):
// it must default to "not seen" for a fresh browser, and stay "seen" once
// marked, so the tour shows exactly once per browser rather than on every
// visit or never again after a storage hiccup. The vitest environment here
// is "node" (see vitest.config.mts), so `window` does not exist by
// default; a tiny in-memory localStorage stand-in is stubbed in per test
// rather than pulling in jsdom for this one file.
function createMemoryLocalStorage() {
  const store = new Map<string, string>();
  return {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => void store.set(key, value),
    removeItem: (key: string) => void store.delete(key),
    clear: () => store.clear(),
  };
}

describe("welcome tour seen flag", () => {
  beforeEach(() => {
    vi.stubGlobal("window", { localStorage: createMemoryLocalStorage() });
  });

  it("defaults to not seen for a fresh browser", () => {
    expect(hasSeenIntro()).toBe(false);
  });

  it("is seen after markIntroSeen is called", () => {
    markIntroSeen();
    expect(hasSeenIntro()).toBe(true);
  });
});
