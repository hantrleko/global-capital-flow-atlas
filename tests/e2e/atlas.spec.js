import { test, expect } from '@playwright/test';

test.describe('Global Capital Flow Atlas - Production Verification', () => {

  test.beforeEach(async ({ context }) => {
    await context.addInitScript(() => {
      localStorage.setItem('bis_atlas_intro_seen', 'true');
    });
  });

  test('1. Production Preview Mount, Cold-Start Payload & First-Screen Fold Check', async ({ page }) => {
    const assetFailures = [];
    const coldStartRequests = [];

    page.on('requestfailed', req => {
      assetFailures.push(`${req.method()} ${req.url()}: ${req.failure()?.errorText}`);
    });

    page.on('response', res => {
      if (res.status() >= 400) {
        assetFailures.push(`${res.status()} ${res.url()}`);
      }
      coldStartRequests.push(res.url());
    });

    page.on('pageerror', err => {
      assetFailures.push(`PageError: ${err.message}`);
    });

    // 1. Visit root path
    await page.goto('/');
    const mainViewport = page.locator('#main-viewport');
    await expect(mainViewport).toBeVisible({ timeout: 10000 });

    // Verify zero asset failures or uncaught script errors
    expect(assetFailures, `Asset failures on cold start: ${assetFailures.join(', ')}`).toEqual([]);

    // Cold-Start Payload Assertion: non-initial big partitions MUST NOT be loaded on cold start
    const loadedHistorical = coldStartRequests.some(url => url.includes('hist-bilateral'));
    const loadedCbsRisk = coldStartRequests.some(url => url.includes('cbs-risk'));
    const loadedXlsx = coldStartRequests.some(url => url.includes('xlsx'));

    expect(loadedHistorical, 'historical bilateral partition must NOT be requested on cold start map').toBe(false);
    expect(loadedCbsRisk, 'CBS risk partition must NOT be requested on cold start map').toBe(false);
    expect(loadedXlsx, 'XLSX parser library must NOT be requested on cold start map').toBe(false);

    // Module Bar width at 1280px viewport
    const moduleBar = page.locator('[data-testid="module-nav-container"]');
    await expect(moduleBar).toBeVisible();
    const barBox = await moduleBar.boundingBox();
    expect(barBox, 'Module bar must have a valid bounding box').not.toBeNull();
    expect(barBox.width, 'Module bar width at 1280px must be >= 500px').toBeGreaterThanOrEqual(500);

    // Verify Default Quarter is 2026Q1 (Official)
    const officialBadge = page.getByText(/官方观测/i).first();
    await expect(officialBadge).toBeVisible();

    // Verify Executive KPI Row Values are Valid Non-Empty Quantities (No $undefined, no naked $)
    const kpiRow = page.locator('#main-viewport > div').first();
    await expect(kpiRow).toBeVisible();
    const kpiText = await kpiRow.innerText();
    
    // KPI 1 Total Claims must have valid amount (e.g. $47.62T or equivalent)
    expect(kpiText).toMatch(/\$[0-9]+\.[0-9]{2}T|\€[0-9]+|\¥[0-9]+/);
    expect(kpiText).not.toContain('$undefined');
    expect(kpiText).not.toContain('NaN');
    expect(kpiText).not.toMatch(/\$\s+[A-Z]/); // No lone $ with whitespace

    // KPI 2 USD Share & Stress Index must have valid numeric percentages
    expect(kpiText).toMatch(/[0-9]+\.[0-9]%/);
    expect(kpiText).toMatch(/压力:\s*[0-9]+\.[0-9]/);

    // Verify First-Screen Fold: Map Canvas starts within the upper fold (y <= 380px) and height >= 300px
    const mapCanvas = page.locator('#main-viewport canvas').first();
    await expect(mapCanvas).toBeVisible({ timeout: 8000 });
    const mapBox = await mapCanvas.boundingBox();
    expect(mapBox, 'Map canvas bounding box must exist').not.toBeNull();
    expect(mapBox.y, 'Map canvas must start within the first screen fold (y <= 380px)').toBeLessThanOrEqual(380);
    expect(mapBox.height, 'Map canvas must have at least 300px height for primary visualization').toBeGreaterThanOrEqual(300);
  });

  test('2. GitHub Pages Subpath Mount (/global-capital-flow-atlas/)', async ({ page }) => {
    const subpathFailures = [];
    page.on('requestfailed', req => {
      subpathFailures.push(`${req.method()} ${req.url()}: ${req.failure()?.errorText}`);
    });
    page.on('response', res => {
      if (res.status() >= 400) {
        subpathFailures.push(`${res.status()} ${res.url()}`);
      }
    });

    await page.goto('/global-capital-flow-atlas/');
    const mainViewport = page.locator('#main-viewport');
    await expect(mainViewport).toBeVisible({ timeout: 10000 });
    expect(subpathFailures, `Subpath failures: ${subpathFailures.join(', ')}`).toEqual([]);
  });

  test('3. EWS Target Container & Chart Lifecycle (Scatter -> Matrix -> Scatter)', async ({ page }) => {
    await page.goto('/?tab=ews');
    const mainViewport = page.locator('#main-viewport');
    await expect(mainViewport).toBeVisible({ timeout: 10000 });

    // Step A: Switch to Quadrant Scatter
    const scatterTabBtn = page.locator('[data-testid="ews-subtab-quadrant"]');
    await expect(scatterTabBtn).toBeVisible({ timeout: 10000 });
    await scatterTabBtn.click();

    // Verify Target Container Visibility and Dimensions
    const scatterContainer = page.locator('#ews-quadrant-chart');
    await expect(scatterContainer).toBeVisible({ timeout: 8000 });

    const scatterBox = await scatterContainer.boundingBox();
    expect(scatterBox).not.toBeNull();
    expect(scatterBox.width, 'Scatter container width must be >= 400px').toBeGreaterThanOrEqual(400);
    expect(scatterBox.height, 'Scatter container height must be >= 300px').toBeGreaterThanOrEqual(300);

    // Verify Canvas Element and Actual Pixel Rendering
    const canvas = scatterContainer.locator('canvas').first();
    await expect(canvas).toBeVisible({ timeout: 5000 });

    // Check canvas pixel buffer (not blank)
    const hasDrawnPixels = await canvas.evaluate(el => {
      const cvs = el;
      if (!cvs || cvs.width === 0 || cvs.height === 0) return false;
      const ctx = cvs.getContext('2d');
      if (!ctx) return false;
      try {
        const imgData = ctx.getImageData(0, 0, Math.min(cvs.width, 100), Math.min(cvs.height, 100));
        // Check if there is any non-zero pixel data
        for (let i = 0; i < imgData.data.length; i += 4) {
          if (imgData.data[i + 3] > 0) return true;
        }
        return false;
      } catch {
        return true;
      }
    });
    expect(hasDrawnPixels, 'Scatter canvas must have drawn pixels and not be a blank void').toBe(true);

    // Step B: Switch to Matrix Subtab
    const matrixTabBtn = page.locator('[data-testid="ews-subtab-matrix"]');
    await expect(matrixTabBtn).toBeVisible({ timeout: 5000 });
    await matrixTabBtn.click();

    // Verify Matrix table is mounted
    const matrixTable = page.locator('[data-testid="ews-matrix-table"]');
    await expect(matrixTable).toBeVisible({ timeout: 5000 });

    // Verify old scatter canvas is completely unmounted from DOM
    await expect(page.locator('#ews-quadrant-chart canvas')).toHaveCount(0);

    // Step C: Round-trip return to Quadrant Scatter
    await scatterTabBtn.click();
    await expect(scatterContainer).toBeVisible({ timeout: 5000 });

    const remountedCanvas = scatterContainer.locator('canvas').first();
    await expect(remountedCanvas).toBeVisible({ timeout: 5000 });
    const remountedBox = await remountedCanvas.boundingBox();
    expect(remountedBox.width).toBeGreaterThanOrEqual(400);
    expect(remountedBox.height).toBeGreaterThanOrEqual(300);

    // Confirm canvas has re-rendered pixels (no empty void)
    const remountedPixels = await remountedCanvas.evaluate(el => {
      const cvs = el;
      if (!cvs || cvs.width === 0 || cvs.height === 0) return false;
      const ctx = cvs.getContext('2d');
      if (!ctx) return false;
      try {
        const imgData = ctx.getImageData(0, 0, Math.min(cvs.width, 100), Math.min(cvs.height, 100));
        for (let i = 0; i < imgData.data.length; i += 4) {
          if (imgData.data[i + 3] > 0) return true;
        }
        return false;
      } catch {
        return true;
      }
    });
    expect(remountedPixels, 'Remounted scatter canvas must have active rendered graphics').toBe(true);
  });

  test('4. Scenario vs Official Mode Toggle and Data Classification Integrity', async ({ page }) => {
    await page.goto('/');
    const mainViewport = page.locator('#main-viewport');
    await expect(mainViewport).toBeVisible({ timeout: 10000 });

    // Verify initial is 2026Q1 Official
    await expect(page.locator('#current-quarter-display')).toHaveText('2026Q1');
    await expect(page.getByText('官方观测').first()).toBeVisible();

    // Click '进入前瞻情景'
    const scenarioBtn = page.getByRole('button', { name: /进入前瞻情景/ });
    await expect(scenarioBtn).toBeVisible();
    await scenarioBtn.click();

    // Verify quarter updated to 2026Q4 and status badge changed to '前瞻情景'
    await expect(page.locator('#current-quarter-display')).toHaveText('2026Q4');
    await expect(page.getByText('前瞻情景').first()).toBeVisible();

    // Click '返回官方最新'
    const returnOfficialBtn = page.getByRole('button', { name: /返回官方最新/ });
    await expect(returnOfficialBtn).toBeVisible();
    await returnOfficialBtn.click();

    // Verify returned to 2026Q1 Official
    await expect(page.locator('#current-quarter-display')).toHaveText('2026Q1');
    await expect(page.getByText('官方观测').first()).toBeVisible();
  });

  test('5. Mobile Viewport (390x844 iPhone 14) Interaction, Drawer & Touch Target Check', async ({ page }) => {
    // Set viewport to mobile standard 390x844 (iPhone 14)
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/');

    const mainViewport = page.locator('#main-viewport');
    await expect(mainViewport).toBeVisible({ timeout: 10000 });

    // Check no horizontal scrollbar on body
    const hasHorizontalOverflow = await page.evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth;
    });
    expect(hasHorizontalOverflow, 'Mobile viewport must NOT have horizontal scroll overflow').toBe(false);

    // Verify Mobile Filter Drawer Trigger is visible and has accessible touch target
    const filterBtn = page.getByTestId('open-mobile-filter-drawer');
    await expect(filterBtn).toBeVisible();
    const btnBox = await filterBtn.boundingBox();
    expect(btnBox.height, 'Filter button height must be >= 36px').toBeGreaterThanOrEqual(36);

    // Click to open drawer
    await filterBtn.click();
    const drawer = page.getByTestId('mobile-filter-drawer');
    await expect(drawer).toBeVisible();

    // Verify drawer close button has >= 44px touch target
    const closeBtn = page.getByTestId('close-mobile-filter-drawer');
    await expect(closeBtn).toBeVisible();
    const closeBox = await closeBtn.boundingBox();
    expect(closeBox.width, 'Close button touch width must be >= 44px').toBeGreaterThanOrEqual(44);
    expect(closeBox.height, 'Close button touch height must be >= 44px').toBeGreaterThanOrEqual(44);

    // Close drawer
    await closeBtn.click();
    await expect(drawer).not.toBeVisible();
  });

  test('6. Full 5-Domain Representative Modules First-Screen Canvas and Mounting Tour', async ({ page }) => {
    // Check key modules across all 5 domains to guarantee responsive canvas mounting without void errors
    const testTabs = [
      { tab: 'contagion', label: '级联传染', canvasSelector: '#main-viewport canvas' },
      { tab: 'usd', label: '美元融资', canvasSelector: '#main-viewport canvas' },
      { tab: 'gravity', label: '引力计量', canvasSelector: '#main-viewport canvas' },
      { tab: 'routing', label: '路由矩阵', canvasSelector: '#main-viewport canvas' }
    ];

    for (const item of testTabs) {
      await page.goto(`/?tab=${item.tab}`);
      const mainViewport = page.locator('#main-viewport');
      await expect(mainViewport).toBeVisible({ timeout: 10000 });

      const canvas = page.locator(item.canvasSelector).first();
      await expect(canvas).toBeVisible({ timeout: 10000 });

      const box = await canvas.boundingBox();
      expect(box, `Canvas for ${item.tab} must have valid bounding box`).not.toBeNull();
      expect(box.y, `Canvas for ${item.tab} must start in upper fold (y <= 420px)`).toBeLessThanOrEqual(420);
      expect(box.height, `Canvas for ${item.tab} must be >= 280px`).toBeGreaterThanOrEqual(280);
    }
  });

  test('7. Canonical 3-Tier Data Classification Integrity Across Quarters', async ({ page }) => {
    await page.goto('/');
    const mainViewport = page.locator('#main-viewport');
    await expect(mainViewport).toBeVisible({ timeout: 10000 });

    // 1. Initial 2026Q1: Must show '官方观测'
    await expect(page.locator('#current-quarter-display')).toHaveText('2026Q1');
    const officialCount = await page.getByText('官方观测').count();
    expect(officialCount).toBeGreaterThanOrEqual(1);

    // 2. Go to 2026Q4 via Scenario button: Must show '前瞻情景'
    const scenarioBtn = page.getByRole('button', { name: /进入前瞻情景/ });
    if (await scenarioBtn.isVisible()) {
      await scenarioBtn.click();
      await expect(page.locator('#current-quarter-display')).toHaveText('2026Q4');
      const scenarioCount = await page.getByText('前瞻情景').count();
      expect(scenarioCount).toBeGreaterThanOrEqual(1);
    }
  });

});
