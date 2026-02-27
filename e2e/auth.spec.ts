import { test, expect } from '@playwright/test';

test.describe('Authentication', () => {
  test('should display login/register page', async ({ page }) => {
    await page.goto('/login-register');
    await page.waitForLoadState('domcontentloaded');

    // Should have email and password fields
    await expect(page.locator('#login-email')).toBeVisible();
    await expect(page.locator('#login-password')).toBeVisible();
  });

  test('should register new user', async ({ page }) => {
    await page.goto('/login-register');
    await page.waitForLoadState('domcontentloaded');

    await page.getByRole('tab', { name: /Đăng ký/i }).click();
    await page.locator('#register-email').waitFor({ state: 'visible' });

    const email = `test${Date.now()}@example.com`;

    // Fill registration form
    await page.fill('#register-firstname', 'Test');
    await page.fill('#register-lastname', 'User');
    await page.fill('#register-email', email);
    await page.fill('#register-password', 'Password123!');
    await page.fill('#register-confirm-password', 'Password123!');
    await page.check('#agree-terms');
    
    // Submit
    await page.click('button[type="submit"]');

    // Should redirect or show success
    // Adjust based on your actual implementation
    await page.waitForTimeout(2000);
  });

  test('should show error for invalid email', async ({ page }) => {
    await page.goto('/login-register');
    await page.waitForLoadState('domcontentloaded');
    await page.locator('#login-email').waitFor({ state: 'visible' });

    await page.fill('#login-email', 'invalid-email');
    await page.fill('#login-password', 'Password123!');
    await page.click('button[type="submit"]');

    // Should show error message
    const isValid = await page
      .locator('#login-email')
      .evaluate((input) => (input as HTMLInputElement).checkValidity());
    expect(isValid).toBe(false);
  });

  test('should show error for weak password', async ({ page }) => {
    await page.goto('/login-register');
    await page.waitForLoadState('domcontentloaded');
    await page.locator('#login-email').waitFor({ state: 'visible' });

    await page.fill('#login-email', 'test@example.com');
    await page.fill('#login-password', '123');
    await page.click('button[type="submit"]');

    // Should show error message about password
    await expect(
      page.locator('text=/Email hoặc mật khẩu không đúng|Đăng nhập thất bại/i')
    ).toBeVisible({ timeout: 5000 });
  });
});
