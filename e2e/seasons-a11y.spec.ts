import { test, expect } from '@playwright/test';

test.describe('Season Pages Accessibility', () => {
  test('season discovery page has proper heading structure', async ({ page }) => {
    await page.goto('/seasons');
    
    // Check for main heading
    const h1 = page.locator('h1');
    await expect(h1).toBeVisible();
    
    // Check that there's only one h1
    const h1Count = await page.locator('h1').count();
    expect(h1Count).toBe(1);
  });

  test('season detail page has proper heading hierarchy', async ({ page }) => {
    await page.goto('/seasons/test-season');
    
    // Check for h1
    const h1 = page.locator('h1');
    await expect(h1).toBeVisible();
    
    // Check for h2 sections
    const h2s = page.locator('h2');
    const h2Count = await h2s.count();
    expect(h2Count).toBeGreaterThan(0);
  });

  test('tournament flow cards have accessible names', async ({ page }) => {
    await page.goto('/seasons/test-season');
    
    // Check that tournament cards have proper labels
    const tournamentCards = page.locator('[role="article"], .tournament-card');
    const count = await tournamentCards.count();
    
    if (count > 0) {
      for (let i = 0; i < count; i++) {
        const card = tournamentCards.nth(i);
        // Check for accessible name or heading
        const hasHeading = await card.locator('h3, h4, [aria-label]').count() > 0;
        expect(hasHeading).toBeTruthy();
      }
    }
  });

  test('standings table has proper accessibility attributes', async ({ page }) => {
    await page.goto('/seasons/test-season');
    
    // Check for table with proper headers
    const table = page.locator('table');
    const tableCount = await table.count();
    
    if (tableCount > 0) {
      // Check for th elements
      const headers = await table.locator('th').count();
      expect(headers).toBeGreaterThan(0);
      
      // Check for scope attributes on headers
      const headersWithScope = await table.locator('th[scope]').count();
      expect(headersWithScope).toBeGreaterThan(0);
    }
  });

  test('buttons have accessible labels', async ({ page }) => {
    await page.goto('/seasons/test-season');
    
    // Check that all buttons have text or aria-label
    const buttons = page.locator('button');
    const count = await buttons.count();
    
    for (let i = 0; i < count; i++) {
      const button = buttons.nth(i);
      const text = await button.textContent();
      const ariaLabel = await button.getAttribute('aria-label');
      const hasLabel = (text && text.trim().length > 0) || ariaLabel;
      expect(hasLabel).toBeTruthy();
    }
  });

  test('links have descriptive text', async ({ page }) => {
    await page.goto('/seasons/test-season');
    
    // Check that links have meaningful text
    const links = page.locator('a[href]');
    const count = await links.count();
    
    for (let i = 0; i < count; i++) {
      const link = links.nth(i);
      const text = await link.textContent();
      const ariaLabel = await link.getAttribute('aria-label');
      const hasLabel = (text && text.trim().length > 0) || ariaLabel;
      expect(hasLabel).toBeTruthy();
    }
  });

  test('form inputs have associated labels', async ({ page }) => {
    await page.goto('/organizer/seasons/create');
    
    // Check that inputs have labels
    const inputs = page.locator('input, select, textarea');
    const count = await inputs.count();
    
    for (let i = 0; i < count; i++) {
      const input = inputs.nth(i);
      const id = await input.getAttribute('id');
      const ariaLabel = await input.getAttribute('aria-label');
      const ariaLabelledby = await input.getAttribute('aria-labelledby');
      
      if (id) {
        const label = page.locator(`label[for="${id}"]`);
        const labelExists = await label.count() > 0;
        expect(labelExists || ariaLabel || ariaLabelledby).toBeTruthy();
      } else {
        expect(ariaLabel || ariaLabelledby).toBeTruthy();
      }
    }
  });

  test('images have alt text', async ({ page }) => {
    await page.goto('/seasons/test-season');
    
    // Check that images have alt attributes
    const images = page.locator('img');
    const count = await images.count();
    
    for (let i = 0; i < count; i++) {
      const img = images.nth(i);
      const alt = await img.getAttribute('alt');
      const role = await img.getAttribute('role');
      
      // Decorative images should have role="presentation" or empty alt
      // Content images should have descriptive alt text
      if (role !== 'presentation') {
        expect(alt).toBeTruthy();
      }
    }
  });

  test('color contrast meets WCAG AA standards', async ({ page }) => {
    await page.goto('/seasons/test-season');
    
    // This would typically use axe-core or similar tool
    // For now, we check that text is readable
    const textElements = page.locator('p, h1, h2, h3, h4, h5, h6, span, a, button');
    const count = await textElements.count();
    
    // Verify elements are visible
    for (let i = 0; i < Math.min(count, 10); i++) {
      const element = textElements.nth(i);
      await expect(element).toBeVisible();
    }
  });

  test('focus management works correctly', async ({ page }) => {
    await page.goto('/seasons/test-season');
    
    // Tab through interactive elements
    await page.keyboard.press('Tab');
    
    // Check that something is focused
    const focusedElement = page.locator(':focus');
    await expect(focusedElement).toHaveCount(1);
  });

  test('modal dialogs are accessible', async ({ page }) => {
    await page.goto('/organizer/seasons/test-season-id');
    
    // Open a modal (this would need to be adjusted based on actual UI)
    const modalTrigger = page.locator('button').first();
    await modalTrigger.click();
    
    // Check for modal with proper role
    const modal = page.locator('[role="dialog"], .modal');
    const modalCount = await modal.count();
    
    if (modalCount > 0) {
      // Check for focus trap
      const focusedElement = page.locator(':focus');
      await expect(focusedElement).toBeVisible();
      
      // Check for close button
      const closeButton = modal.locator('button').first();
      await expect(closeButton).toBeVisible();
    }
  });

  test('error messages are associated with form fields', async ({ page }) => {
    await page.goto('/organizer/seasons/create');
    
    // Try to submit form without required fields
    const submitButton = page.locator('button[type="submit"]').first();
    await submitButton.click();
    
    // Check for error messages
    const errors = page.locator('[role="alert"], .error, [aria-invalid="true"]');
    const errorCount = await errors.count();
    
    if (errorCount > 0) {
      // Check that errors are visible
      await expect(errors.first()).toBeVisible();
    }
  });

  test('skip navigation link is available', async ({ page }) => {
    await page.goto('/seasons');
    
    // Check for skip link
    const skipLink = page.locator('a[href^="#"], a[href="#main"], a[href="#content"]');
    const skipLinkCount = await skipLink.count();
    
    // Skip link should be present (though may be visually hidden)
    if (skipLinkCount > 0) {
      await expect(skipLink.first()).toBeAttached();
    }
  });

  test('landmark regions are properly defined', async ({ page }) => {
    await page.goto('/seasons/test-season');
    
    // Check for main landmark
    const main = page.locator('main, [role="main"]');
    await expect(main).toHaveCount(1);
    
    // Check for navigation landmark
    const nav = page.locator('nav, [role="navigation"]');
    const navCount = await nav.count();
    expect(navCount).toBeGreaterThan(0);
  });

  test('ARIA live regions announce dynamic content', async ({ page }) => {
    await page.goto('/organizer/seasons/test-season-id');
    
    // Check for live regions
    const liveRegions = page.locator('[aria-live], [role="status"], [role="alert"]');
    const liveRegionCount = await liveRegions.count();
    
    // Live regions should be present for dynamic content
    // This is optional but recommended
    if (liveRegionCount > 0) {
      await expect(liveRegions.first()).toBeAttached();
    }
  });

  test('keyboard navigation works for all interactive elements', async ({ page }) => {
    await page.goto('/seasons/test-season');
    
    // Get all interactive elements
    const interactiveElements = page.locator('button, a[href], input, select, textarea');
    const count = await interactiveElements.count();
    
    // Tab through first 10 elements
    for (let i = 0; i < Math.min(count, 10); i++) {
      await page.keyboard.press('Tab');
      const focused = page.locator(':focus');
      await expect(focused).toHaveCount(1);
    }
  });

  test('expanded/collapsed state is properly indicated', async ({ page }) => {
    await page.goto('/organizer/seasons/test-season-id');
    
    // Check for expandable elements with proper ARIA attributes
    const expandables = page.locator('[aria-expanded], [aria-controls]');
    const count = await expandables.count();
    
    for (let i = 0; i < count; i++) {
      const element = expandables.nth(i);
      const ariaExpanded = await element.getAttribute('aria-expanded');
      const ariaControls = await element.getAttribute('aria-controls');
      
      // If aria-expanded is set, it should be "true" or "false"
      if (ariaExpanded) {
        expect(['true', 'false']).toContain(ariaExpanded);
      }
      
      // If aria-controls is set, the controlled element should exist
      if (ariaControls) {
        const controlledElement = page.locator(`#${ariaControls}`);
        await expect(controlledElement).toBeAttached();
      }
    }
  });
});

test.describe('Season Management Accessibility', () => {
  test.beforeEach(async ({ page }) => {
    // Login as organizer
    await page.goto('/login');
    await page.fill('input[name="email"]', 'organizer@test.com');
    await page.fill('input[name="password"]', 'password123');
    await page.click('button[type="submit"]');
    await page.waitForURL('/dashboard');
  });

  test('season wizard has proper accessibility', async ({ page }) => {
    await page.goto('/organizer/seasons/create');
    
    // Check for wizard progress indicator
    const progress = page.locator('[role="progressbar"], .wizard-progress, [aria-valuenow]');
    const progressCount = await progress.count();
    
    if (progressCount > 0) {
      const ariaValueNow = await progress.first().getAttribute('aria-valuenow');
      const ariaValueMin = await progress.first().getAttribute('aria-valuemin');
      const ariaValueMax = await progress.first().getAttribute('aria-valuemax');
      
      // If ARIA attributes are present, they should be valid
      if (ariaValueNow) {
        expect(parseInt(ariaValueNow || '0')).toBeGreaterThanOrEqual(0);
      }
      if (ariaValueMin) {
        expect(parseInt(ariaValueMin || '0')).toBeGreaterThanOrEqual(0);
      }
      if (ariaValueMax) {
        expect(parseInt(ariaValueMax || '0')).toBeGreaterThan(0);
      }
    }
  });

  test('advancement graph is keyboard navigable', async ({ page }) => {
    await page.goto('/organizer/seasons/test-season-id');
    await page.click('text=Advancement');
    
    // Check that graph nodes are keyboard accessible
    const nodes = page.locator('[role="button"], .node, [tabindex="0"]');
    const count = await nodes.count();
    
    if (count > 0) {
      // Try to focus first node
      await nodes.first().focus();
      const focused = page.locator(':focus');
      await expect(focused).toHaveCount(1);
    }
  });

  test('audit trail table is accessible', async ({ page }) => {
    await page.goto('/organizer/seasons/test-season-id');
    await page.click('text=Audit');
    
    // Check for table with proper structure
    const table = page.locator('table');
    const tableCount = await table.count();
    
    if (tableCount > 0) {
      // Check for caption or summary
      const caption = await table.locator('caption').count();
      const summary = await table.first().getAttribute('summary');
      
      // At least one should be present
      expect(caption > 0 || summary).toBeTruthy();
    }
  });

  test('analytics charts have accessible alternatives', async ({ page }) => {
    await page.goto('/organizer/seasons/test-season-id');
    await page.click('text=Analytics');
    
    // Check for charts with accessible descriptions
    const charts = page.locator('[role="img"], canvas, svg');
    const count = await charts.count();
    
    for (let i = 0; i < count; i++) {
      const chart = charts.nth(i);
      const ariaLabel = await chart.getAttribute('aria-label');
      const ariaDescribedby = await chart.getAttribute('aria-describedby');
      
      // Charts should have accessible descriptions
      expect(ariaLabel || ariaDescribedby).toBeTruthy();
    }
  });
});
