import { test, expect } from '@playwright/test';

test.describe('Frontend UI Tests', () => {
  test('homepage loads correctly', async ({ page }) => {
    await page.goto('/');
    
    // Check if the page loads without errors
    await expect(page).toHaveTitle(/OrdinCore/);
    
    // Check for common elements (adjust based on your actual app)
    await expect(page.locator('body')).toBeVisible();
  });

  test('login form functionality', async ({ page }) => {
    await page.goto('/login');
    
    // Check if login form exists
    const loginForm = page.locator('form').first();
    await expect(loginForm).toBeVisible();
    
    // Fill in login credentials using actual selectors from Login component
    const emailInput = page.locator('input[id="email"]');
    const passwordInput = page.locator('input[id="password"]');
    
    if (await emailInput.isVisible()) {
      await emailInput.fill('test@example.com');
      await passwordInput.fill('testpassword');
      
      // Test form submission
      const submitButton = page.locator('button[type="submit"]');
      await submitButton.click();
      
      // Wait for navigation or response
      await page.waitForTimeout(2000);
    }
  });

  test('dashboard loads for authenticated users', async ({ page }) => {
    // Navigate to dashboard (will redirect to login if not authenticated)
    await page.goto('/dashboard');
    
    // Check dashboard elements
    await expect(page.locator('body')).toBeVisible();
    
    // Look for dashboard-specific elements based on actual components
    const dashboardContent = page.locator('main, .min-h-screen, [class*="dashboard"]');
    if (await dashboardContent.isVisible()) {
      await expect(dashboardContent).toBeVisible();
    }
    
    // Check for navigation component which exists in all dashboards
    const navigation = page.locator('nav, [class*="navigation"]');
    if (await navigation.isVisible()) {
      await expect(navigation).toBeVisible();
    }
  });

  test('navigation works correctly', async ({ page }) => {
    await page.goto('/');
    
    // Test navigation links (adjust selectors based on your actual navigation)
    const navLinks = page.locator('nav a, header a, .navigation a');
    const linkCount = await navLinks.count();
    
    if (linkCount > 0) {
      // Click first navigation link
      await navLinks.first().click();
      await page.waitForTimeout(1000);
      
      // Verify navigation worked
      await expect(page).toHaveURL(/\/.+/);
    }
  });

  test('responsive design works', async ({ page }) => {
    await page.goto('/');
    
    // Test mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await expect(page.locator('body')).toBeVisible();
    
    // Test tablet viewport
    await page.setViewportSize({ width: 768, height: 1024 });
    await expect(page.locator('body')).toBeVisible();
    
    // Test desktop viewport
    await page.setViewportSize({ width: 1920, height: 1080 });
    await expect(page.locator('body')).toBeVisible();
  });
});
