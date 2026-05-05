import { test, expect } from '@playwright/test';

test.describe('Season Public Pages', () => {
  test('should display season discovery page', async ({ page }) => {
    await page.goto('/seasons');
    
    // Check for season list
    await expect(page.locator('h1')).toContainText('Seasons');
  });

  test('should display season detail page', async ({ page }) => {
    // Navigate to a specific season (this assumes a season exists)
    await page.goto('/seasons/test-season');
    
    // Check for season hero
    await expect(page.locator('h1')).toBeVisible();
  });

  test('should display tournament flow on season page', async ({ page }) => {
    await page.goto('/seasons/test-season');
    
    // Check for tournament circuit section
    await expect(page.locator('text=Tournament Circuit')).toBeVisible();
  });

  test('should display standings on season page', async ({ page }) => {
    await page.goto('/seasons/test-season');
    
    // Check for standings section
    await expect(page.locator('text=Season Standings')).toBeVisible();
  });

  test('should display schedule on season page', async ({ page }) => {
    await page.goto('/seasons/test-season');
    
    // Check for schedule section
    await expect(page.locator('text=Schedule')).toBeVisible();
  });
});

test.describe('Season Management', () => {
  test.beforeEach(async ({ page }) => {
    // Login as organizer
    await page.goto('/login');
    await page.fill('input[name="email"]', 'organizer@test.com');
    await page.fill('input[name="password"]', 'password123');
    await page.click('button[type="submit"]');
    await page.waitForURL('/dashboard');
  });

  test('should create a new season', async ({ page }) => {
    await page.goto('/organizer/seasons/create');
    
    // Fill in season details
    await page.fill('input[name="name"]', 'Test Season');
    await page.fill('textarea[name="description"]', 'Test season description');
    await page.selectOption('select[name="game"]', 'valorant');
    
    // Navigate through wizard steps
    await page.click('button:has-text("Next")');
    await page.click('button:has-text("Next")');
    await page.click('button:has-text("Next")');
    
    // Create season
    await page.click('button:has-text("Create Season")');
    
    // Check for success
    await expect(page.locator('text=Season created successfully')).toBeVisible();
  });

  test('should publish a season', async ({ page }) => {
    await page.goto('/organizer/seasons/test-season-id');
    
    // Click publish button
    await page.click('button:has-text("Publish Season")');
    
    // Confirm in modal
    await page.click('button:has-text("Confirm")');
    
    // Check for success
    await expect(page.locator('text=Season published successfully')).toBeVisible();
  });

  test('should add tournament to season', async ({ page }) => {
    await page.goto('/organizer/seasons/test-season-id');
    
    // Navigate to tournaments tab
    await page.click('text=Tournaments');
    
    // Click add tournament button
    await page.click('button:has-text("Add Tournament")');
    
    // Select tournament
    await page.click('text=Select Tournament');
    await page.click('text=Test Tournament');
    
    // Add tournament
    await page.click('button:has-text("Add")');
    
    // Check for success
    await expect(page.locator('text=Tournament added successfully')).toBeVisible();
  });

  test('should create announcement', async ({ page }) => {
    await page.goto('/organizer/seasons/test-season-id');
    
    // Navigate to announcements tab
    await page.click('text=Announcements');
    
    // Click new announcement button
    await page.click('button:has-text("New Announcement")');
    
    // Fill in announcement details
    await page.fill('input[name="title"]', 'Test Announcement');
    await page.fill('textarea[name="body"]', 'Test announcement message');
    await page.selectOption('select[name="targetAudience"]', 'all');
    
    // Send announcement
    await page.click('button:has-text("Send Announcement")');
    
    // Check for success
    await expect(page.locator('text=Announcement sent successfully')).toBeVisible();
  });

  test('should view audit trail', async ({ page }) => {
    await page.goto('/organizer/seasons/test-season-id');
    
    // Navigate to audit tab
    await page.click('text=Audit');
    
    // Check for audit log table
    await expect(page.locator('table')).toBeVisible();
  });

  test('should view analytics dashboard', async ({ page }) => {
    await page.goto('/organizer/seasons/test-season-id');
    
    // Navigate to analytics tab
    await page.click('text=Analytics');
    
    // Check for analytics metrics
    await expect(page.locator('text=Total Participants')).toBeVisible();
    await expect(page.locator('text=Completed Tournaments')).toBeVisible();
  });
});

test.describe('Season Advancement', () => {
  test.beforeEach(async ({ page }) => {
    // Login as organizer
    await page.goto('/login');
    await page.fill('input[name="email"]', 'organizer@test.com');
    await page.fill('input[name="password"]', 'password123');
    await page.click('button[type="submit"]');
    await page.waitForURL('/dashboard');
  });

  test('should view advancement dashboard', async ({ page }) => {
    await page.goto('/organizer/seasons/test-season-id');
    
    // Navigate to advancement tab
    await page.click('text=Advancement');
    
    // Check for advancement records table
    await expect(page.locator('text=Advancement Dashboard')).toBeVisible();
  });

  test('should validate advancement graph', async ({ page }) => {
    await page.goto('/organizer/seasons/test-season-id');
    
    // Navigate to advancement tab
    await page.click('text=Advancement');
    
    // Click validate button
    await page.click('button:has-text("Validate Graph")');
    
    // Check for validation result
    await expect(page.locator('text=Validation complete')).toBeVisible();
  });

  test('should perform manual override', async ({ page }) => {
    await page.goto('/organizer/seasons/test-season-id');
    
    // Navigate to manual override section
    await page.click('text=Manual Override');
    
    // Select team
    await page.click('text=Select Team');
    await page.click('text=Test Team');
    
    // Select target tournament
    await page.click('text=Select Target Tournament');
    await page.click('text=Main Event');
    
    // Fill in reason
    await page.fill('textarea[name="reason"]', 'Admin decision for testing');
    
    // Execute override
    await page.click('button:has-text("Execute Manual Override")');
    
    // Confirm
    await page.click('button:has-text("Confirm")');
    
    // Check for success
    await expect(page.locator('text=Manual override executed successfully')).toBeVisible();
  });
});

test.describe('Season Player Experience', () => {
  test('should view team journey', async ({ page }) => {
    // Login as player
    await page.goto('/login');
    await page.fill('input[name="email"]', 'player@test.com');
    await page.fill('input[name="password"]', 'password123');
    await page.click('button[type="submit"]');
    await page.waitForURL('/dashboard');
    
    // Navigate to season page
    await page.goto('/seasons/test-season');
    
    // Click on team journey
    await page.click('text=View Journey');
    
    // Check for journey visualization
    await expect(page.locator('text=Team Journey')).toBeVisible();
  });

  test('should register for qualifier tournament', async ({ page }) => {
    // Login as player
    await page.goto('/login');
    await page.fill('input[name="email"]', 'player@test.com');
    await page.fill('input[name="password"]', 'password123');
    await page.click('button[type="submit"]');
    await page.waitForURL('/dashboard');
    
    // Navigate to season page
    await page.goto('/seasons/test-season');
    
    // Click register button on qualifier
    await page.click('button:has-text("Register")');
    
    // Confirm registration
    await page.click('button:has-text("Confirm Registration")');
    
    // Check for success
    await expect(page.locator('text=Registration successful')).toBeVisible();
  });

  test('should see locked tournament status', async ({ page }) => {
    // Login as player
    await page.goto('/login');
    await page.fill('input[name="email"]', 'player@test.com');
    await page.fill('input[name="password"]', 'password123');
    await page.click('button[type="submit"]');
    await page.waitForURL('/dashboard');
    
    // Navigate to season page
    await page.goto('/seasons/test-season');
    
    // Check for locked tournament
    await expect(page.locator('text=Locked')).toBeVisible();
  });
});
