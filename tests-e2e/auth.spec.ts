import { test, expect } from '@playwright/test';

test.describe('Authentication Flow', () => {
  test('should load the auth page successfully', async ({ page }) => {
    // Navigate to the base URL (should show AuthForm initially)
    await page.goto('/');

    // 1. Wait for the main application header to be visible (indicates loading is complete)
    await expect(page.getByRole('heading', { name: /clicker game/i })).toBeVisible();

    // 2. Now check if the "Sign In" heading within AuthForm is visible
    await expect(page.getByRole('heading', { name: /sign in/i })).toBeVisible();

    // Check if the phone input field is visible
    await expect(page.getByPlaceholder(/example: 050-1234567/i)).toBeVisible();

    // Check if the "Create an account" button is visible
    await expect(page.getByRole('button', { name: /create an account/i })).toBeVisible();
  });

  // We can add more tests here later for actual sign-in, sign-up, sign-out flows.
  // These will require interacting with Supabase or mocking its responses at the network level.
});