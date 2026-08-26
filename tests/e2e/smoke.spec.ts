import { test, expect, Page } from "@playwright/test";

// Covers the same path a real student takes on first visit, and the same
// path used manually to verify the 26 August 2026 homepage changes
// (value proposition line, ad slot text fix). If any of this breaks, a
// real visitor's first few seconds on the site are broken.

// Every test here except the "Welcome tour" suite is exercising the tool
// itself, not the first-visit onboarding, so it seeds the "already seen
// the welcome tour" flag before navigating. Without this, the tour dialog
// would sit on top of the page in every fresh Playwright browser context
// (each test gets its own, so every context looks like a first visit) and
// intercept clicks meant for the page underneath.
async function skipWelcomeTour(page: Page) {
  await page.addInitScript(() => {
    window.localStorage.setItem("referencelib:seen-intro", "1");
  });
}

test.describe("Homepage", () => {
  test.beforeEach(async ({ page }) => skipWelcomeTour(page));

  test("loads with the value proposition and clean ad slots", async ({ page }) => {
    await page.goto("/");

    await expect(
      page.getByText("Free evidence search and Harvard/APA referencing", { exact: false })
    ).toBeVisible();

    // Regression guard for the August 2026 bug: internal ad-slot
    // engineering notes ("Advertising position 1 of 3: ...") must never
    // be visible text on the page, only a generic "Advertisement" label.
    await expect(page.getByText("Advertising position", { exact: false })).toHaveCount(0);

    const adSlots = page.locator(".ad-slot");
    await expect(adSlots).toHaveCount(3);
    await expect(adSlots.first()).toHaveText("Advertisement");
  });
});

test.describe("Find evidence flow", () => {
  test.beforeEach(async ({ page }) => skipWelcomeTour(page));

  test("decodes a question and returns evidence", async ({ page }) => {
    await page.goto("/");

    await page.getByRole("button", { name: "Decode question" }).click();
    await expect(page.getByText("Question decoded")).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText("Command verbs")).toBeVisible();

    await page.getByRole("button", { name: "Find free peer-reviewed evidence" }).click();
    await expect(page.getByText("Verified evidence")).toBeVisible({ timeout: 20_000 });
  });
});

test.describe("Tool tabs", () => {
  test.beforeEach(async ({ page }) => skipWelcomeTour(page));

  test("every tab switches without a runtime error", async ({ page }) => {
    await page.goto("/");

    for (const label of ["Evidence my paragraph", "Verify a reference", "Check citations", "Find evidence"]) {
      await page.getByRole("button", { name: label, exact: true }).click();
      await expect(page.getByText("Something went wrong", { exact: false })).toHaveCount(0);
    }
  });
});

test.describe("Manual citation entry", () => {
  test.beforeEach(async ({ page }) => skipWelcomeTour(page));

  test("opens the dialog with the book fields visible", async ({ page }) => {
    await page.goto("/");

    await page.getByRole("button", { name: "+ Cite a source manually" }).click();

    const dialog = page.getByRole("dialog", { name: "Cite a source" });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole("button", { name: "Add source" })).toBeVisible();

    await dialog.getByRole("button", { name: "Cancel" }).first().click();
    await expect(dialog).toHaveCount(0);
  });
});

test.describe("Welcome tour", () => {
  // Deliberately does not seed the "seen" flag: this suite tests the
  // actual first-visit behaviour every real new student gets.

  test("shows once on first visit, and not again after it is dismissed", async ({ page }) => {
    await page.goto("/");

    const tour = page.getByRole("dialog", { name: "How ReferenceLib works" });
    await expect(tour).toBeVisible();
    await expect(tour.getByText("assignment question box already has a worked example", { exact: false })).toBeVisible();

    await tour.getByRole("button", { name: "Got it, let's start" }).click();
    await expect(tour).toHaveCount(0);

    // A returning visit in the same browser must not show it again.
    await page.reload();
    await expect(page.getByRole("dialog", { name: "How ReferenceLib works" })).toHaveCount(0);
  });

  test("can be reopened from the How this works link", async ({ page }) => {
    await skipWelcomeTour(page);
    await page.goto("/");

    await expect(page.getByRole("dialog", { name: "How ReferenceLib works" })).toHaveCount(0);

    await page.getByRole("button", { name: "How this works" }).click();
    await expect(page.getByRole("dialog", { name: "How ReferenceLib works" })).toBeVisible();
  });
});
