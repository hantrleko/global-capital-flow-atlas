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

  test('8. EUGENE FINANCE Brand Identity, Deep-Link Sharing & Cross-Module Entity Pinning', async ({ page }) => {
    // Navigate with deep-linked parameters
    await page.goto('/?country=GB&tab=map&q=2026Q1');
    const mainViewport = page.locator('#main-viewport');
    await expect(mainViewport).toBeVisible({ timeout: 10000 });

    // 1. EUGENE FINANCE Brand Logo & Identity
    await expect(page.getByText('EUGENE FINANCE').first()).toBeVisible();
    const brandLogo = page.locator('img[alt="EUGENE FINANCE"], [data-testid="eugene-logo"]').first();
    await expect(brandLogo).toBeVisible();

    // 2. Deep-Link Share Button
    const shareBtn = page.getByTitle(/一键复制当前推演视图深度链接/);
    await expect(shareBtn).toBeVisible();

    // 3. Macro Insights Banner
    await expect(page.getByText(/本季 30 秒宏观洞察/)).toBeVisible();

    // 4. Global Pinned Entity Bar for GB
    const pinnedBar = page.locator('#pinned-entity-bar');
    await expect(pinnedBar).toBeVisible();
    await expect(pinnedBar).toContainText('GB');
    const contagionDrillBtn = pinnedBar.getByRole('button', { name: /传染压力推演/ });
    await expect(contagionDrillBtn).toBeVisible();

    // Drill down to Contagion Simulator with GB pinned
    await contagionDrillBtn.click();
    await page.waitForTimeout(600);
    expect(page.url()).toContain('tab=contagion');
  });

  test('9. Phase 1 & Version Lifecycle: Scenario A/B Diff Workbench, Chart Card & Changelog Modal', async ({ page }) => {
    await page.goto('/');
    const mainViewport = page.locator('#main-viewport');
    await expect(mainViewport).toBeVisible({ timeout: 10000 });

    // 1. Verify v3.0.0 Changelog Modal opens and renders evolution timeline
    const changelogBtn = page.getByRole('button', { name: /v[2-4]\./i }).first();
    await expect(changelogBtn).toBeVisible();
    await changelogBtn.click();

    await expect(page.getByText('版本更迭记录与架构演进日志')).toBeVisible({ timeout: 5000 });
    await expect(page.getByText(/Phase 5 终极跃迁/i).first()).toBeVisible();
    const closeChangelogBtn = page.getByRole('button', { name: /关闭/i }).last();
    await closeChangelogBtn.click();

    // 2. Verify Publication-Ready Institutional Chart Card Modal
    const chartCardBtn = page.getByRole('button', { name: /研报卡片/i }).first();
    await expect(chartCardBtn).toBeVisible();
    await chartCardBtn.click();

    await expect(page.getByText('投行级研报单图卡片导出 (Publication-Ready Chart Card)')).toBeVisible({ timeout: 5000 });
    await expect(page.getByText('全球跨国银行信贷总量与美元流动性态势')).toBeVisible();
    const closeCardBtn = page.locator('[data-testid="close-chart-card-modal"]').first();
    await closeCardBtn.click();

    // 3. Verify Scenario A/B Parallel Delta Diff in Contagion Simulator
    await page.goto('/?tab=contagion&q=2026Q1');
    await expect(page.locator('#main-viewport')).toBeVisible({ timeout: 10000 });

    const diffTabBtn = page.getByRole('button', { name: /A\/B 差分对比/i });
    await expect(diffTabBtn).toBeVisible();
    await diffTabBtn.click();

    await expect(page.getByText('平行情景 A/B 差分对比实验台 (Scenario A vs. B Delta Diff)')).toBeVisible({ timeout: 5000 });
    await expect(page.getByText('全网违约赤字差值 (Delta S_total)')).toBeVisible();
    await expect(page.getByText('跨国经济体受损差分明细表')).toBeVisible();
  });

  test('10. Phase 2 v1.8.0: Look-Through OFCs Toggle, Sector Slicing & Card Template', async ({ page }) => {
    await page.goto('/?tab=map&q=2026Q1');
    const mainViewport = page.locator('#main-viewport');
    await expect(mainViewport).toBeVisible({ timeout: 10000 });

    // 1. Verify Look-Through Toggle button is present on Capital Flow Map toolbar
    const lookThroughToggle = page.locator('[data-testid="toggle-look-through-ofcs"]');
    await expect(lookThroughToggle).toBeVisible();

    // Click toggle to enable Ultimate Risk Look-Through
    await lookThroughToggle.click();

    // Verify Active Look-Through Banner is displayed
    const activeBanner = page.locator('[data-testid="look-through-active-banner"]');
    await expect(activeBanner).toBeVisible({ timeout: 5000 });
    await expect(activeBanner).toContainText('已开启离岸中心穿透还原 (Look-Through OFCs · CBS Table B)');
    await expect(activeBanner).toContainText('按母国国籍穿透并入母公司最终风险敞口');

    // 2. Open Chart Card Modal and verify Template 5 (Look-Through OFC Card)
    const chartCardBtn = page.getByRole('button', { name: /研报卡片/i }).first();
    await expect(chartCardBtn).toBeVisible();
    await chartCardBtn.click();

    await expect(page.getByText('投行级研报单图卡片导出 (Publication-Ready Chart Card)')).toBeVisible({ timeout: 5000 });

    // Switch to Template 5: 5. 离岸中心穿透卡
    const ofcCardTab = page.getByRole('button', { name: /5\.\s*离岸中心穿透卡/i });
    await expect(ofcCardTab).toBeVisible();
    await ofcCardTab.click();

    // Assert Template 5 content rendered
    await expect(page.getByText('离岸金融中心穿透还原与最终风险承担者')).toBeVisible();
    await expect(page.getByText('CBS Table B', { exact: true }).first()).toBeVisible();
    await expect(page.getByText('离岸穿透信贷池')).toBeVisible();
    await expect(page.getByText('穿透后最终母国再分配敞口')).toBeVisible();

    const closeCardBtn = page.locator('[data-testid="close-chart-card-modal"]').first();
    await closeCardBtn.click();
  });

  test('11. Phase 3 v2.0.0: Portfolio Stress Overlay, Presets, Sensitivity & Card Template', async ({ page }) => {
    // 1. Visit Portfolio Stress Overlay page
    await page.goto('/?tab=portfolio&q=2026Q1');
    const mainViewport = page.locator('#main-viewport');
    await expect(mainViewport).toBeVisible({ timeout: 10000 });

    const overlay = page.locator('[data-testid="portfolio-stress-overlay"]');
    await expect(overlay).toBeVisible({ timeout: 10000 });
    await expect(overlay.getByText('我的组合压力映射').first()).toBeVisible();
    await expect(overlay.getByText('v6.0.0 · 专户风控').first()).toBeVisible();

    // 2. Verify KPI row values
    await expect(page.getByText('组合基准资产规模')).toBeVisible();
    await expect(page.getByText('预期压力净减记')).toBeVisible();
    await expect(page.getByText('$500M').first()).toBeVisible();

    // 3. Switch Presets: Check Bank Treasury & Liquidity Book ($2000M)
    const bankPresetBtn = page.locator('[data-testid="preset-bank_treasury_liquidity"]');
    await expect(bankPresetBtn).toBeVisible();
    await bankPresetBtn.click();
    await expect(page.getByText('$2000M').first()).toBeVisible({ timeout: 5000 });

    // Switch Presets: Check EM High Yield Credit ($250M)
    const emPresetBtn = page.locator('[data-testid="preset-em_high_yield_credit"]');
    await expect(emPresetBtn).toBeVisible();
    await emPresetBtn.click();
    await expect(page.getByText('$250M').first()).toBeVisible({ timeout: 5000 });

    // 4. Switch Macro Scenario: Offshore Dollar Squeeze
    const scenarioBtn = page.locator('[data-testid="scenario-dollar_liquidity_freeze"]');
    await expect(scenarioBtn).toBeVisible();
    await scenarioBtn.click();

    // 5. Verify ECharts canvas container exists
    const chartCanvas = page.locator('[data-testid="portfolio-stress-chart"] canvas, [data-testid="portfolio-stress-chart"]').first();
    await expect(chartCanvas).toBeVisible({ timeout: 10000 });

    // 6. Test Header quick-access button [组合压力]
    const headerBtn = page.locator('[data-testid="header-portfolio-btn"]');
    await expect(headerBtn).toBeVisible();

    // 7. Open Chart Card Modal and verify Template 6 (Portfolio Stress Card)
    const chartCardBtn = page.getByRole('button', { name: /研报卡片/i }).first();
    await expect(chartCardBtn).toBeVisible();
    await chartCardBtn.click();

    await expect(page.getByText('投行级研报单图卡片导出 (Publication-Ready Chart Card)')).toBeVisible({ timeout: 5000 });

    // Switch to Template 6: 6. 组合压力映射卡
    const portfolioCardTab = page.getByRole('button', { name: /6\.\s*组合压力映射卡/i });
    await expect(portfolioCardTab).toBeVisible();
    await portfolioCardTab.click();

    await expect(page.getByText('机构账户组合压力映射与极端 VaR 评估')).toBeVisible();
    await expect(page.getByText('预期净减记额')).toBeVisible();
    await expect(page.getByText('受损最深持仓敞口')).toBeVisible();

    const closeCardBtn = page.locator('[data-testid="close-chart-card-modal"]').first();
    await closeCardBtn.click();
  });

  test('12. Phase 4 v2.5.0: Executive Verdict Banner, Guided Investigation Track & Focus Mode Toggle', async ({ page }) => {
    // 1. Visit root view
    await page.goto('/?tab=map&q=2026Q1');
    const mainViewport = page.locator('#main-viewport');
    await expect(mainViewport).toBeVisible({ timeout: 10000 });

    // 2. Verify Compact First-Screen Verdict Strip & Expandable 3-Stage Reasoning Deck
    const verdictBanner = page.locator('[data-testid="executive-verdict-banner"]');
    await expect(verdictBanner).toBeVisible({ timeout: 5000 });
    await expect(verdictBanner.getByText(/实时研判/).first()).toBeVisible();

    const toggleVerdictBtn = page.locator('[data-testid="toggle-verdict-details"]');
    await expect(toggleVerdictBtn).toBeVisible();
    await toggleVerdictBtn.click();

    await expect(verdictBanner.getByText(/宏观异动现象/).first()).toBeVisible();
    await expect(verdictBanner.getByText(/深层驱动机理/).first()).toBeVisible();
    await expect(verdictBanner.getByText(/研判结论与行动/).first()).toBeVisible();

    // 3. Test Causal Next-Step Bridge CTA Button
    const shadowNextBtn = verdictBanner.getByRole('button', { name: /穿透离岸影子通道/i }).first();
    await expect(shadowNextBtn).toBeVisible();
    await shadowNextBtn.click();

    // Verify Tab jumped to Shadow Banking
    await expect(page.getByText('离岸影子银行与非银机构表外负债透视').first()).toBeVisible({ timeout: 6000 });
    await expect(verdictBanner.getByText(/实时研判 · 影子银行与非银机构透视/).first()).toBeVisible();

    // 4. Test Header Mode Toggle (Focus Mode vs Pro Mode)
    const modeToggle = page.locator('[data-testid="header-view-mode-toggle"]');
    await expect(modeToggle).toBeVisible();
    await expect(modeToggle).toContainText('焦点模式');

    // Click toggle to switch to Pro Mode
    await modeToggle.click();
    await expect(modeToggle).toContainText('专家模式');

    // Click toggle back to Focus Mode
    await modeToggle.click();
    await expect(modeToggle).toContainText('焦点模式');

    // 5. Test Guided Investigation Playbook Modal & Floating HUD
    const investigationBtn = page.locator('[data-testid="header-investigation-btn"]');
    await expect(investigationBtn).toBeVisible();
    await investigationBtn.click();

    // Verify Modal
    await expect(page.getByText('剧本式宏观侦探主线 (Guided Investigation Playbooks)')).toBeVisible({ timeout: 5000 });
    await expect(page.getByText('离岸美元避税与影子杠杆穿透追踪')).toBeVisible();

    // Start Track 1
    const startTrackBtn = page.getByRole('button', { name: /启程调查/i }).first();
    await expect(startTrackBtn).toBeVisible();
    await startTrackBtn.click();

    // Verify Floating HUD
    await expect(page.getByText('侦探主线 [1/4]').first()).toBeVisible({ timeout: 5000 });
    await expect(page.getByText('第 1 步：发现避税中枢资金异常积聚').first()).toBeVisible();

    // Advance to Step 2
    const nextStepBtn = page.getByRole('button', { name: /下一步：前往影子银行核查表外掉期/i }).first();
    await expect(nextStepBtn).toBeVisible();
    await nextStepBtn.click();

    // Verify Step 2 HUD
    await expect(page.getByText('侦探主线 [2/4]').first()).toBeVisible({ timeout: 5000 });
    await expect(page.getByText('第 2 步：核查非银机构外汇掉期暗雷').first()).toBeVisible();

    // Exit Guided Track
    const exitBtn = page.getByRole('button', { name: '✕' }).first();
    await expect(exitBtn).toBeVisible();
    await exitBtn.click();

    // 6. Verify Changelog Modal Displays v6.0.0 Current
    const changelogBtn = page.getByRole('button', { name: /v[2-6]\.[05]\.0/i }).first();
    await expect(changelogBtn).toBeVisible();
    await changelogBtn.click();

    await expect(page.getByText('v6.0.0 Current').first()).toBeVisible({ timeout: 5000 });
    await expect(page.getByText(/反向求根与智能风控处方系统/).first()).toBeVisible();
  });

  test('13. Phase 5 v3.0.0: Automated Playbook State Choreography, Live Contagion-to-Portfolio Bridge & Active Hedge Overlay', async ({ page }) => {
    // 1. Start on Capital Flow Map with clean URL
    await page.goto('/?tab=map&q=2026Q1');
    const mainViewport = page.locator('#main-viewport');
    await expect(mainViewport).toBeVisible({ timeout: 10000 });

    // 2. Open Guided Investigation Playbooks and check state choreography on Track 1
    const investigationBtn = page.locator('[data-testid="header-investigation-btn"]');
    await expect(investigationBtn).toBeVisible();
    await investigationBtn.click();

    await expect(page.getByText('剧本式宏观侦探主线 (Guided Investigation Playbooks)')).toBeVisible({ timeout: 5000 });

    // Start Track 1: 离岸美元避税与影子杠杆穿透追踪
    const startTrackBtn = page.getByRole('button', { name: /启程调查/i }).first();
    await expect(startTrackBtn).toBeVisible();
    await startTrackBtn.click();

    // Verify HUD mounts at Step 1 and automatically choreographs Map state (KY focus, Look-Through enabled)
    await expect(page.locator('[data-testid="hud-step-badge"]')).toContainText('侦探主线 [1/4]');
    const activeLookThroughBanner = page.locator('[data-testid="look-through-active-banner"]');
    await expect(activeLookThroughBanner).toBeVisible({ timeout: 5000 });

    // Advance to Step 3 (Cascade Contagion Simulation shock on KY)
    const nextStepBtn = page.getByRole('button', { name: /下一步/i }).first();
    await expect(nextStepBtn).toBeVisible();
    await nextStepBtn.click(); // to Step 2
    await expect(page.locator('[data-testid="hud-step-badge"]')).toContainText('侦探主线 [2/4]');

    await nextStepBtn.click(); // to Step 3
    await expect(page.locator('[data-testid="hud-step-badge"]')).toContainText('侦探主线 [3/4]');

    // Exit Guided Track HUD
    const exitBtn = page.getByRole('button', { name: '✕' }).first();
    await expect(exitBtn).toBeVisible();
    await exitBtn.click();

    // 3. Test Contagion-to-Portfolio Bridge in Contagion Simulator
    await page.goto('/?tab=contagion&q=2026Q1');
    await expect(page.locator('#main-viewport')).toBeVisible({ timeout: 10000 });

    // Click [🛡️ 映射至组合对冲 ➔] button
    const mapToPortfolioBtn = page.locator('[data-testid="map-contagion-to-portfolio-btn"]');
    await expect(mapToPortfolioBtn).toBeVisible({ timeout: 8000 });
    await mapToPortfolioBtn.click();

    // Verify it automatically navigated to portfolio tab with custom contagion shock active
    await expect(page.locator('[data-testid="portfolio-stress-overlay"]')).toBeVisible({ timeout: 8000 });
    await expect(page.getByText(/实时清算冲击/i).first()).toBeVisible();

    // 4. Test Interactive Institutional Hedges in Portfolio Stress Overlay
    // Verify hedge switches exist
    const cdsToggle = page.locator('[data-testid="hedge-toggle-cds_hedge"]');
    await expect(cdsToggle).toBeVisible();

    // Verify Net Saved Capital badge is rendered
    await expect(page.getByText(/挽回 \+\$/i).first()).toBeVisible({ timeout: 5000 });
    await expect(page.getByText('主动宏观对冲防护台').first()).toBeVisible();

    // Toggle on Offshore Derisking
    const deriskToggle = page.locator('[data-testid="hedge-toggle-derisk_ofc"]');
    await expect(deriskToggle).toBeVisible();
    await deriskToggle.click();

    // Verify saved capital reflects active hedges
    await expect(page.getByText(/保全 \+\$/i).first()).toBeVisible();
  });

  test('14. Phase 6 v3.5.0: Quiet-Luxury Shell, Typography Floor, Single-Source Verdict Parity & Light Theme', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 850 });
    await page.goto('/?tab=map&q=2026Q1');
    const mainViewport = page.locator('#main-viewport');
    await expect(mainViewport).toBeVisible({ timeout: 10000 });

    // 1. Compact 2-Row Header Height (<= 88px) & Zero Horizontal Overflow
    const shellMetrics = await page.evaluate(() => {
      const header = document.querySelector('header');
      const rect = header ? header.getBoundingClientRect() : { height: 999 };
      return {
        headerHeight: Math.round(rect.height),
        overflowX: document.documentElement.scrollWidth - window.innerWidth
      };
    });
    expect(shellMetrics.headerHeight).toBeLessThanOrEqual(88);
    expect(shellMetrics.overflowX).toBeLessThanOrEqual(1);

    // 2. First-Screen Top Verdict Strip Visibility Above the Fold
    const verdictBanner = page.locator('[data-testid="executive-verdict-banner"]');
    await expect(verdictBanner).toBeVisible();
    const verdictBox = await verdictBanner.boundingBox();
    expect(verdictBox).not.toBeNull();
    expect(verdictBox.y).toBeLessThanOrEqual(260);

    // 3. Structured Toolbox Popover & Research Paper Light Theme Toggle
    const toolboxBtn = page.locator('[data-testid="header-toolbox-btn"]');
    await expect(toolboxBtn).toBeVisible();
    await toolboxBtn.click();

    const toolboxPopover = page.locator('[data-testid="header-toolbox-popover"]');
    await expect(toolboxPopover).toBeVisible();

    const toolboxThemeToggle = page.locator('[data-testid="toolbox-theme-toggle"]');
    await expect(toolboxThemeToggle).toBeVisible();
    await toolboxThemeToggle.click();

    const isLight = await page.evaluate(() => document.body.classList.contains('theme-light'));
    expect(isLight).toBe(true);

    // Toggle back to Quiet-Luxury Dark Theme via header quick button
    await page.locator('[data-testid="header-theme-toggle"]').click();
    const isDarkBack = await page.evaluate(() => !document.body.classList.contains('theme-light'));
    expect(isDarkBack).toBe(true);

    // 4. Single-Source-of-Truth Verdict Parity & >=11px Typography Floor on Portfolio View
    await page.goto('/?tab=portfolio&q=2026Q1');
    await expect(page.locator('[data-testid="portfolio-stress-overlay"]')).toBeVisible({ timeout: 10000 });

    // Wait briefly for initial render / animated KPI settlement
    await page.waitForTimeout(350);

    const kpiLossText = (await page.locator('[data-testid="portfolio-kpi-total-loss"]').innerText()).trim();
    const headlineText = (await page.locator('[data-testid="verdict-live-headline"]').innerText()).trim();
    expect(kpiLossText).toBe('-$47.7M');
    expect(headlineText).toContain(kpiLossText);

    // Verify >=11px minimum font floor across visible text nodes inside #main-viewport
    const sub11Nodes = await page.evaluate(() => {
      const root = document.getElementById('main-viewport');
      if (!root) return [];
      const violations = [];
      const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
      let node;
      while ((node = walker.nextNode())) {
        const text = node.textContent.trim();
        if (!text) continue;
        const el = node.parentElement;
        if (!el || el.closest('svg, canvas')) continue;
        const style = window.getComputedStyle(el);
        if (style.display === 'none' || style.visibility === 'hidden' || parseFloat(style.opacity) === 0) continue;
        const rect = el.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) continue;
        const fontSize = parseFloat(style.fontSize);
        if (fontSize < 10.9) {
          violations.push({ text: text.slice(0, 30), fontSize });
        }
      }
      return violations;
    });
    expect(sub11Nodes).toEqual([]);
  });

  test('15. Phase 7 v4.0.0: Cognitive Onboarding, Plain-Language Lens, Concept Tooltip & Visual Diagrams', async ({ page }) => {
    // 1. Visit Atlas with intro suppressed
    await page.goto('/?intro=0&q=2026Q1');
    await expect(page.locator('#main-viewport')).toBeVisible({ timeout: 10000 });

    // 2. Beginner Mode Toggle Verification
    const beginnerToggle = page.locator('[data-testid="header-beginner-toggle"]');
    await expect(beginnerToggle).toBeVisible();

    // Verify initial state has beginner lens
    await expect(page.locator('[data-testid="verdict-beginner-badge"]')).toBeVisible();

    // Toggle to professional terminology
    await beginnerToggle.click();
    await expect(page.locator('[data-testid="verdict-beginner-badge"]')).not.toBeVisible();
    await expect(beginnerToggle).toContainText('专业术语');

    // Toggle back to plain-language mode
    await beginnerToggle.click();
    await expect(page.locator('[data-testid="verdict-beginner-badge"]')).toBeVisible();
    await expect(beginnerToggle).toContainText('白话解读');

    // 3. Newbie Tour Guide Modal & 3 Personas Selection
    const tourBtn = page.locator('[data-testid="header-tour-btn"]');
    await expect(tourBtn).toBeVisible();
    await tourBtn.click();

    const introModal = page.locator('[data-testid="project-intro-modal"]');
    await expect(introModal).toBeVisible({ timeout: 5000 });
    await expect(introModal.getByText('30 秒极速就绪：选择您的探索身份')).toBeVisible();

    // Verify all 3 persona cards exist
    const explorerCard = page.locator('[data-testid="persona-card-curious_explorer"]');
    const investorCard = page.locator('[data-testid="persona-card-macro_investor"]');
    const researcherCard = page.locator('[data-testid="persona-card-quant_researcher"]');
    await expect(explorerCard).toBeVisible();
    await expect(investorCard).toBeVisible();
    await expect(researcherCard).toBeVisible();

    // Select Macro Investor Persona -> Should navigate directly to Portfolio Stress Overlay
    await investorCard.click();
    await expect(introModal).not.toBeVisible();

    // Verify Portfolio Stress View is active and breadcrumb strip is displayed
    const portfolioOverlay = page.locator('[data-testid="portfolio-stress-overlay"]');
    await expect(portfolioOverlay).toBeVisible({ timeout: 10000 });
    const causalBreadcrumb = page.locator('[data-testid="portfolio-causal-breadcrumb"]');
    await expect(causalBreadcrumb).toBeVisible();
    await expect(causalBreadcrumb).toContainText('全景因果链');

    // 4. Focus Mode Causal Workflow Navigation
    // Navigate to Step 1: 查资金去向 (map)
    const mapTabBtn = page.locator('[data-testid="header-tab-map"]');
    await expect(mapTabBtn).toBeVisible();
    await mapTabBtn.click();

    // Enable Look-Through OFCs on map using canonical toggle
    const lookThroughToggle = page.locator('[data-testid="toggle-look-through-ofcs"]');
    await expect(lookThroughToggle).toBeVisible({ timeout: 5000 });
    const isAlreadyActive = await page.locator('[data-testid="look-through-active-banner"]').isVisible();
    if (!isAlreadyActive) {
      await lookThroughToggle.click();
    }
    const lookThroughDiagram = page.locator('[data-testid="look-through-visual-diagram"]');
    await expect(lookThroughDiagram).toBeVisible({ timeout: 5000 });
    await expect(page.getByText('出资国跨国大行')).toBeVisible();
    await expect(page.getByText('剥离离岸过桥空壳')).toBeVisible();
    await expect(page.getByText('还原最终风险母国')).toBeVisible();

    // Navigate to Step 3: 算多米诺骨牌 (contagion)
    const contagionTabBtn = page.locator('[data-testid="header-tab-contagion"]');
    await expect(contagionTabBtn).toBeVisible();
    await contagionTabBtn.click();

    // Verify Domino 4-Stage Shockwave Strip
    const dominoStrip = page.locator('[data-testid="domino-shockwave-strip"]');
    await expect(dominoStrip).toBeVisible({ timeout: 10000 });
    await expect(dominoStrip.getByText('第0阶: 震中引爆')).toBeVisible();
    await expect(dominoStrip.getByText('第1阶: 直接债主冲销')).toBeVisible();
    await expect(dominoStrip.getByText('第2阶: 同业踩踏外溢')).toBeVisible();
    await expect(dominoStrip.getByText('第3阶: 专户组合防线')).toBeVisible();
  });

  test('16. Phase 8 v5.0.0: Institutional Workspace, Reproducibility Code & Sensitivity Tornado', async ({ page }) => {
    // 1. Visit root view
    await page.goto('/?tab=map&q=2026Q1');
    const mainViewport = page.locator('#main-viewport');
    await expect(mainViewport).toBeVisible({ timeout: 10000 });

    // 2. Open Institutional Local Workspace Modal from Header
    const workspaceBtn = page.locator('[data-testid="header-workspace-btn"]');
    await expect(workspaceBtn).toBeVisible();
    await workspaceBtn.click();

    const workspaceModal = page.locator('[data-testid="institutional-workspace-modal"]');
    await expect(workspaceModal).toBeVisible({ timeout: 5000 });
    await expect(workspaceModal.getByText('机构投研工作区 (Institutional Workspace)')).toBeVisible();

    // Verify "本季 3 件事" digest cards exist
    await expect(workspaceModal.getByText(/本季 3 件事/i).first()).toBeVisible();
    await expect(workspaceModal.getByText('全球跨国银行总债权').first()).toBeVisible();

    // Verify Tab switching: 自定义专户
    const portfolioTab = workspaceModal.getByRole('button', { name: /自定义专户/i }).first();
    await portfolioTab.click();
    await expect(workspaceModal.getByText('宏观对冲优选组合')).toBeVisible();

    // Verify Tab switching: 收藏情景与复现码
    const scenariosTab = workspaceModal.getByRole('button', { name: /收藏情景/i }).first();
    await scenariosTab.click();
    await expect(workspaceModal.getByText(/输入学术复现码立即还原推演情景/i)).toBeVisible();
    await expect(workspaceModal.locator('input[placeholder*="ATLAS-"]')).toBeVisible();

    // Close Workspace Modal
    const closeWorkspaceBtn = page.locator('[data-testid="close-workspace-modal"]').first();
    await closeWorkspaceBtn.click();
    await expect(workspaceModal).not.toBeVisible();

    // 3. Navigate to Contagion Simulator
    const contagionTabBtn = page.locator('[data-testid="header-tab-contagion"]');
    await contagionTabBtn.click();

    const contagionSimulator = page.locator('[data-testid="network-contagion-simulator"]');
    await expect(contagionSimulator).toBeVisible({ timeout: 10000 });

    // 4. Verify Reproducibility Code Copy Button
    const copyRepCodeBtn = page.locator('[data-testid="copy-reproducibility-code-btn"]');
    await expect(copyRepCodeBtn).toBeVisible();
    await copyRepCodeBtn.click();
    await expect(copyRepCodeBtn).toContainText('已复制');

    // 5. Switch to Sensitivity Tornado Tab
    const sensitivityTabBtn = page.locator('[data-testid="tab-sensitivity-tornado"]');
    await expect(sensitivityTabBtn).toBeVisible();
    await sensitivityTabBtn.click();

    // Verify Sensitivity Tornado Component
    const tornadoComponent = page.locator('[data-testid="contagion-sensitivity-tornado"]');
    await expect(tornadoComponent).toBeVisible({ timeout: 5000 });
    await expect(tornadoComponent.getByText(/模型敏感性龙卷风图/i)).toBeVisible();
    await expect(tornadoComponent.getByText(/研判启示/i)).toBeVisible();
    await expect(tornadoComponent.getByText(/波动范围/i).first()).toBeVisible();
  });

  test('17. Phase 9 v6.0.0: Reverse Stress Solver, Historical Crisis Backtest, Optimal Hedge Optimizer & IC PitchDeck Presentation', async ({ page }) => {
    // 1. Visit Portfolio Stress Overlay page
    await page.goto('/?tab=portfolio&q=2026Q1');
    const mainViewport = page.locator('#main-viewport');
    await expect(mainViewport).toBeVisible({ timeout: 10000 });

    const overlay = page.locator('[data-testid="portfolio-stress-overlay"]');
    await expect(overlay).toBeVisible({ timeout: 10000 });
    await expect(overlay.getByText('v6.0.0 · 专户风控').first()).toBeVisible();

    // 2. Verify Save Portfolio to Workspace button
    const savePortfolioBtn = page.locator('[data-testid="save-portfolio-to-workspace-btn"]');
    await expect(savePortfolioBtn).toBeVisible();

    // 3. Switch to Reverse Stress Testing Tab
    const reverseStressTab = page.locator('[data-testid="tab-reverse-stress"]');
    await expect(reverseStressTab).toBeVisible();
    await reverseStressTab.click();

    // Verify Reverse Stress Cushion Gauge
    const cushionGauge = page.locator('[data-testid="reverse-stress-cushion-gauge"]');
    await expect(cushionGauge).toBeVisible({ timeout: 5000 });
    await expect(cushionGauge.getByText('破防临界点 (α*)')).toBeVisible();
    await expect(cushionGauge.getByText('安全缓冲垫 (Safety Cushion)')).toBeVisible();

    // 4. Switch to Historical Crisis Backtest Tab
    const crisisTab = page.locator('[data-testid="tab-crisis-backtest"]');
    await expect(crisisTab).toBeVisible();
    await crisisTab.click();

    // Verify Crisis Backtest Matrix
    const crisisMatrix = page.locator('[data-testid="crisis-backtest-matrix"]');
    await expect(crisisMatrix).toBeVisible({ timeout: 5000 });
    await expect(crisisMatrix.getByText('历史经典危机平行穿越回测').first()).toBeVisible();
    await expect(crisisMatrix.getByText('2008 全球金融危机').first()).toBeVisible();
    await expect(crisisMatrix.getByText('2011 欧债危机').first()).toBeVisible();
    await expect(crisisMatrix.getByText('2020 离岸美元荒').first()).toBeVisible();

    // 5. Open Optimal Hedge Optimizer Modal
    const hedgeOptimizerBtn = page.locator('[data-testid="auto-hedge-optimizer-btn"]');
    await expect(hedgeOptimizerBtn).toBeVisible();
    await hedgeOptimizerBtn.click();

    const hedgeModal = page.locator('[data-testid="optimal-hedge-modal"]');
    await expect(hedgeModal).toBeVisible({ timeout: 5000 });
    await expect(hedgeModal.getByText('帕累托最优对冲处方求解器')).toBeVisible();
    await expect(hedgeModal.getByText('首选对冲处方')).toBeVisible();

    // Apply Optimal Hedge
    const applyHedgeBtn = page.locator('[data-testid="apply-optimal-hedge-btn"]');
    await expect(applyHedgeBtn).toBeVisible();
    await applyHedgeBtn.click();
    await expect(hedgeModal).not.toBeVisible();

    // 6. Launch Investment Committee (IC) PitchDeck Presentation from Header
    const pitchDeckHeaderBtn = page.locator('[data-testid="header-pitchdeck-btn"]');
    await expect(pitchDeckHeaderBtn).toBeVisible();
    await pitchDeckHeaderBtn.click();

    const pitchDeckModal = page.locator('[data-testid="ic-pitchdeck-modal"]');
    await expect(pitchDeckModal).toBeVisible({ timeout: 5000 });
    await expect(pitchDeckModal.getByText('投委会决策路演 (IC PitchDeck)')).toBeVisible();
    await expect(pitchDeckModal.getByText('01 / 04')).toBeVisible();

    // Navigate to Slide 2
    const nextSlideBtn = page.locator('[data-testid="next-slide-btn"]');
    await expect(nextSlideBtn).toBeVisible();
    await nextSlideBtn.click();
    await expect(pitchDeckModal.getByText('02 / 04')).toBeVisible();

    // Navigate to Slide 3
    await nextSlideBtn.click();
    await expect(pitchDeckModal.getByText('03 / 04')).toBeVisible();

    // Navigate to Slide 4
    await nextSlideBtn.click();
    await expect(pitchDeckModal.getByText('04 / 04')).toBeVisible();
    await expect(pitchDeckModal.getByText('投委会首选帕累托最优对冲处方')).toBeVisible();

    // Test Copy IC Memo
    const copyMemoBtn = page.locator('[data-testid="copy-ic-memo-btn"]');
    await expect(copyMemoBtn).toBeVisible();
    await copyMemoBtn.click();
    await expect(copyMemoBtn).toContainText('已复制');

    // Close PitchDeck Modal
    const closePitchDeckBtn = page.locator('[data-testid="close-pitchdeck-btn"]');
    await expect(closePitchDeckBtn).toBeVisible();
    await closePitchDeckBtn.click();
    await expect(pitchDeckModal).not.toBeVisible();
  });

});
