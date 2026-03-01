import { test, expect } from "@playwright/test";

test.describe("Home Page", () => {
  test("should display the hero section", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("h1")).toContainText("Production");
    await expect(page.locator("h1")).toContainText("Template");
  });

  test("should display feature cards", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByText("Clerk Authentication")).toBeVisible();
    await expect(page.getByText("Prisma ORM")).toBeVisible();
  });

  test("should show sign in button for unauthenticated users", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByText("Sign In")).toBeVisible();
  });

  test("should have correct page title", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle(/Production Template/);
  });
});
