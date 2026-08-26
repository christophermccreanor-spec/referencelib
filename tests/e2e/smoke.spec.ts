import { test, expect } from "@playwright/test";

// Covers the same path a real student takes on first visit, and the same
// path used manually to verify the 26 August 2026 homepage changes
// (value proposition line, ad slot text fix). If any of this breaks, a
// real visitor's first few seconds on the site are broken.

test.describe("Homepage", () => {
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
  test("every tab switches without a runtime error", async ({ page }) => {
    await page.goto("/");

    for (const label of ["Evidence my paragraph", "Verify a reference", "Check citations", "Find evidence"]) {
      await page.getByRole("button", { name: label, exact: true }).click();
      await expect(page.getByText("Something went wrong", { exact: false })).toHaveCount(0);
    }
  });
});

test.describe("Manual citation entry", () => {
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
