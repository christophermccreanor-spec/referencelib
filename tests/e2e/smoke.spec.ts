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

async function addManualBookCitation(page: Page, title: string) {
  await page.getByRole("button", { name: "+ Cite a source manually" }).click();
  const dialog = page.getByRole("dialog", { name: "Cite a source" });
  await dialog.getByLabel("Title", { exact: false }).fill(title);
  await dialog.getByLabel("Author(s) or organisation", { exact: false }).fill("Smith, J.");
  await dialog.getByLabel("Year of publication", { exact: false }).fill("2023");
  await dialog.getByLabel("Publisher", { exact: false }).fill("Kogan Page");
  await dialog.getByRole("button", { name: "Add source" }).click();
  await expect(dialog).toHaveCount(0);
}

test.describe("Project switcher", () => {
  // Added alongside the multi-project storage layer (task #78-83): a
  // student juggling more than one module or assignment now gets a
  // separate saved-reference list per project, switchable from a
  // dropdown in the references panel. This is the one flow a unit test
  // cannot cover on its own, since it depends on real React state and
  // real DOM re-rendering across a project switch, not just what ends up
  // in local storage.
  test.beforeEach(async ({ page }) => skipWelcomeTour(page));

  test("keeps different projects' saved references separate", async ({ page }) => {
    await page.goto("/");

    await addManualBookCitation(page, "Organisational Culture and Change");
    await expect(page.getByText("1 saved")).toBeVisible();

    await page.getByRole("button", { name: "+ New project" }).click();
    await page.getByPlaceholder("e.g. CIPD Level 7: Employee Wellbeing").fill("Second module");
    await page.getByRole("button", { name: "Create" }).click();

    // A freshly created project must start empty, and must not show the
    // first project's reference.
    await expect(page.getByText("0 saved")).toBeVisible();
    await expect(page.getByText("Organisational Culture and Change")).toHaveCount(0);

    await addManualBookCitation(page, "Reward Management in Practice");
    await expect(page.getByText("1 saved")).toBeVisible();

    // Switch back to the first (now second-most-recently-touched) project
    // in the list and confirm its own reference is back, and the second
    // project's reference is not visible here.
    await page.getByLabel("Switch project").selectOption({ index: 1 });
    await expect(page.getByText("Organisational Culture and Change")).toBeVisible();
    await expect(page.getByText("Reward Management in Practice")).toHaveCount(0);
    await expect(page.getByText("1 saved")).toBeVisible();
  });

  test("deleting a project falls back to a remaining one and hides the delete control", async ({ page }) => {
    // The "Delete this project" control only ever renders once a second
    // project exists (SavedReferencePanel.tsx), so a student can never
    // reach a zero-projects state through the UI. The pathological "this
    // was the last project" fallback itself is covered directly in
    // tests/storage/local-references.test.ts; this test covers the
    // reachable UI path only.
    page.on("dialog", (dialog) => dialog.accept());
    await page.goto("/");
    await expect(page.getByRole("button", { name: "Delete this project" })).toHaveCount(0);

    await page.getByRole("button", { name: "+ New project" }).click();
    await page.getByPlaceholder("e.g. CIPD Level 7: Employee Wellbeing").fill("Temporary project");
    await page.getByRole("button", { name: "Create" }).click();
    await expect(page.getByRole("button", { name: "Delete this project" })).toBeVisible();

    await page.getByRole("button", { name: "Delete this project" }).click();
    // Deleting back down to one project removes the delete button again
    // (it only shows when there is more than one project to fall back
    // to), and the app must still show a working, usable project.
    await expect(page.getByRole("button", { name: "Delete this project" })).toHaveCount(0);
    await expect(page.getByLabel("Switch project")).toBeVisible();
  });
});
