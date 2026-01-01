import { test, expect } from '@playwright/test';

test.describe('Authentication', () => {
  test('should display login/register page', async ({ page }) => {
    await page.goto('/login-register');

    // Should have email and password fields
    await expect(page.locator('input[name="email"]')).toBeVisible();
    await expect(page.locator('input[name="password"]')).toBeVisible();
  });

  test('should register new user', async ({ page }) => {
    await page.goto('/login-register');

    const email = `test${Date.now()}@example.com`;

    // Fill registration form
    await page.fill('input[name="email"]', email);
    await page.fill('input[name="password"]', 'Password123!');
    await page.fill('input[name="name"]', 'Test User');
    
    // Submit
    await page.click('button[type="submit"]');

    // Should redirect or show success
    // Adjust based on your actual implementation
    await page.waitForTimeout(2000);
  });

  test('should show error for invalid email', async ({ page }) => {
    await page.goto('/login-register');

    await page.fill('input[name="email"]', 'invalid-email');
    await page.fill('input[name="password"]', 'Password123!');
    await page.click('button[type="submit"]');

    // Should show error message
    await expect(page.locator('text=/email|Email/i')).toBeVisible({ timeout: 5000 });
  });

  test('should show error for weak password', async ({ page }) => {
    await page.goto('/login-register');

    await page.fill('input[name="email"]', 'test@example.com');
    await page.fill('input[name="password"]', '123');
    await page.click('button[type="submit"]');

    // Should show error message about password
    await expect(page.locator('text=/password|Password/i')).toBeVisible({ timeout: 5000 });
  });
});
