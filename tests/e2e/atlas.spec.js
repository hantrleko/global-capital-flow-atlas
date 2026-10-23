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

});
