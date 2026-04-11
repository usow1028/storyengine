import { expect, test, type Page } from "@playwright/test";

const RUN_ID = "run:revision:test:2026-04-10T12:30:00Z";
const ENCODED_RUN_ID = encodeURIComponent(RUN_ID);
const INSPECTION_ROUTE = `/inspection/runs/${ENCODED_RUN_ID}`;
const API_ROUTE = `/api/inspection/runs/${ENCODED_RUN_ID}`;
const REDACTED_FIELDS = ["sourceWorkIds", "snapshotDir", "snapshotSet"] as const;

async function bodyText(page: Page) {
  return page.locator("body").innerText();
}

test("serves the inspection console and verifies verdict exploration in Chromium", async ({
  page,
  request
}) => {
  await page.goto(INSPECTION_ROUTE);

  await expect(page.getByRole("heading", { name: "Inspection Console" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Verdict Triage" })).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Mixed-state warning banner" })
  ).toBeVisible();
  await expect(page.getByLabel("Chapter or section filter")).toBeVisible();
  await expect(page.getByLabel("Review state filter")).toBeVisible();
  await expect(page.getByLabel("Segment filter")).toBeVisible();
  await expect(
    page.locator(".verdict-subgroup-heading").filter({ hasText: "Chapter 1" }).first()
  ).toBeVisible();
  await expect(
    page.locator(".verdict-subgroup-heading").filter({ hasText: "Chapter 2" }).first()
  ).toBeVisible();
  await expect(page.getByText("landing", { exact: false })).toHaveCount(0);
  await expect(page.getByText("marketing", { exact: false })).toHaveCount(0);
  await expect(page.getByText("onboarding", { exact: false })).toHaveCount(0);

  const loadedText = await bodyText(page);
  const hardIndex = loadedText.indexOf("Hard Contradiction");
  const repairableIndex = loadedText.indexOf("Repairable Gap");
  const softIndex = loadedText.indexOf("Soft Drift");
  const consistentIndex = loadedText.indexOf("Consistent");
  expect(hardIndex).toBeGreaterThanOrEqual(0);
  expect(repairableIndex).toBeGreaterThan(hardIndex);
  expect(softIndex).toBeGreaterThan(repairableIndex);
  expect(consistentIndex).toBeGreaterThan(softIndex);

  await expect(page.getByRole("heading", { name: "Deterministic Verdict" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Evidence Summary" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Event Timeline" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Repair Candidates" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Structured Trace" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Advisory Pattern Signal" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Source Context" })).toBeVisible();
  await expect(
    page.getByText("Pattern signal only. Hard verdict remains deterministic.")
  ).toBeVisible();

  await page.getByLabel("Review state filter").selectOption("stale");
  await expect(page.locator(".triage-rail .verdict-row")).toHaveCount(1);
  await expect(page.locator(".triage-rail")).toContainText("Arrival beat 1");
  await expect(page.locator(".triage-rail")).not.toContainText("Arrival beat 2");
  await page.getByLabel("Review state filter").selectOption("all");

  await page.getByRole("button", { name: "Show Structured Trace" }).click();
  await expect(page.getByText("Conflict path", { exact: true })).toBeVisible();

  const detailHeading = page.locator("#detail-heading");
  const initialDetail = await detailHeading.innerText();
  const verdictButtons = page.getByRole("button", { name: /Inspect Verdict/ });
  const verdictButtonCount = await verdictButtons.count();
  expect(verdictButtonCount).toBeGreaterThan(1);
  for (let index = 0; index < verdictButtonCount; index += 1) {
    const button = verdictButtons.nth(index);
    if ((await button.getAttribute("aria-current")) !== "true") {
      await button.click();
      break;
    }
  }
  await expect(detailHeading).not.toHaveText(initialDetail);
  await expect(page.getByRole("heading", { name: "Verdict Triage" })).toBeVisible();

  const apiResponse = await request.get(API_ROUTE);
  expect(apiResponse.status()).toBe(200);
  expect(apiResponse.headers()["content-type"]).toContain("application/json");
  const apiText = await apiResponse.text();
  expect(apiText).toContain("Hard Contradiction");
  expect(apiText).toContain("operationalSummary");
  expect(apiText).toContain("secondaryGroup");

  const htmlResponse = await request.get(INSPECTION_ROUTE);
  expect(htmlResponse.status()).toBe(200);
  expect(htmlResponse.headers()["content-type"]).toContain("text/html");
  expect(await htmlResponse.text()).toContain("Inspection Console");

  const renderedText = await bodyText(page);
  for (const field of REDACTED_FIELDS) {
    expect(apiText).not.toContain(field);
    expect(renderedText).not.toContain(field);
  }
});
