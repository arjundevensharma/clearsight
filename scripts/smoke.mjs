// Browser-level smoke test for the production bundle in docs/.
// Serves docs/ over HTTP, drives the real quick-judge workflow in headless
// Chrome, and fails on any page error, console error, or broken milestone.
// Usage: npm run smoke  (optionally CLEARSIGHT_SMOKE_DIR=docs/current)

import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { existsSync, readdirSync } from 'node:fs';
import { extname, join, normalize, resolve } from 'node:path';
import { homedir } from 'node:os';
import puppeteer from 'puppeteer-core';

const ROOT = resolve(process.cwd(), process.env.CLEARSIGHT_SMOKE_DIR || 'docs');
const EXPECTED_SIM_CARDS = 12; // 7 CVD modes + 5 low-vision modes
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.webmanifest': 'application/manifest+json',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.md': 'text/markdown; charset=utf-8',
};

function findChrome() {
  if (process.env.PUPPETEER_EXECUTABLE_PATH) {
    return process.env.PUPPETEER_EXECUTABLE_PATH;
  }
  const cacheRoot = join(homedir(), '.cache', 'puppeteer');
  const candidates = [];
  for (const flavor of ['chrome-headless-shell', 'chrome']) {
    const flavorDir = join(cacheRoot, flavor);
    if (!existsSync(flavorDir)) continue;
    for (const version of readdirSync(flavorDir)) {
      const base = join(flavorDir, version);
      candidates.push(
        join(base, 'chrome-headless-shell-mac-arm64', 'chrome-headless-shell'),
        join(base, 'chrome-headless-shell-mac-x64', 'chrome-headless-shell'),
        join(base, 'chrome-headless-shell-linux64', 'chrome-headless-shell'),
        join(
          base,
          'chrome-mac-arm64',
          'Google Chrome for Testing.app',
          'Contents',
          'MacOS',
          'Google Chrome for Testing',
        ),
        join(base, 'chrome-linux64', 'chrome'),
      );
    }
  }
  candidates.push(
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/usr/bin/google-chrome',
    '/usr/bin/chromium-browser',
  );
  return candidates.find((path) => existsSync(path)) || null;
}

function startServer() {
  const server = createServer(async (req, res) => {
    try {
      const urlPath = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
      const relative = normalize(urlPath).replace(/^([/\\])+/, '');
      const filePath = resolve(ROOT, relative === '' ? 'index.html' : relative);
      if (!filePath.startsWith(ROOT)) {
        res.writeHead(403).end();
        return;
      }
      const body = await readFile(filePath);
      res.writeHead(200, { 'Content-Type': MIME[extname(filePath)] || 'application/octet-stream' });
      res.end(body);
    } catch {
      res.writeHead(404).end('not found');
    }
  });
  return new Promise((resolveServer) => {
    server.listen(0, '127.0.0.1', () => resolveServer(server));
  });
}

const failures = [];
const pageProblems = [];

function check(label, ok, detail = '') {
  const status = ok ? 'ok' : 'FAIL';
  console.log(`  [${status}] ${label}${detail ? ` — ${detail}` : ''}`);
  if (!ok) failures.push(`${label}${detail ? ` (${detail})` : ''}`);
}

const executablePath = findChrome();
if (!executablePath) {
  console.error('smoke: no Chrome/Chromium binary found; set PUPPETEER_EXECUTABLE_PATH.');
  process.exit(2);
}

const server = await startServer();
const origin = `http://127.0.0.1:${server.address().port}`;
console.log(`smoke: serving ${ROOT} at ${origin}`);
console.log(`smoke: using browser ${executablePath}`);

const browser = await puppeteer.launch({
  executablePath,
  headless: true,
  // Headless pages count as backgrounded, which clamps setTimeout/rAF to ~200ms
  // ticks — that starves the in-page MediaRecorder strobe used by the video
  // flash-scan check, so keep renderer timers running at full rate.
  args: [
    '--disable-background-timer-throttling',
    '--disable-renderer-backgrounding',
    '--disable-backgrounding-occluded-windows',
  ],
});
try {
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 1024 });
  page.on('pageerror', (error) => pageProblems.push(`pageerror: ${error.message}`));
  page.on('console', (message) => {
    if (message.type() === 'error') {
      pageProblems.push(`console.error: ${message.text()}`);
    }
  });
  page.on('requestfailed', (request) => {
    pageProblems.push(`requestfailed: ${request.url()} (${request.failure()?.errorText})`);
  });

  await page.goto(`${origin}/index.html`, { waitUntil: 'networkidle0', timeout: 30000 });

  check('page title mentions ClearSight', /clearsight/i.test(await page.title()));
  check(
    'deployment metadata ships a canonical judge-ready social card',
    await page.evaluate(() => {
      const canonical = document.querySelector('link[rel="canonical"]')?.href;
      const image = document.querySelector('meta[property="og:image"]')?.content;
      const width = document.querySelector('meta[property="og:image:width"]')?.content;
      const height = document.querySelector('meta[property="og:image:height"]')?.content;
      const twitterCard = document.querySelector('meta[name="twitter:card"]')?.content;
      const description = document.querySelector('meta[name="description"]')?.content || '';
      return canonical === 'https://arjundevensharma.github.io/clearsight/' &&
        image === 'https://arjundevensharma.github.io/clearsight/og-card.png' &&
        width === '1200' && height === '630' && twitterCard === 'summary_large_image' &&
        description.includes('six evidence-backed axes');
    }),
  );
  check(
    'quick demo button is present and enabled',
    await page.$eval('#quickDemoBtn', (btn) => !btn.disabled).catch(() => false),
  );
  check(
    'hero communicates the screenshot-to-proof loop',
    await page
      .$eval('.hero', (hero) =>
        /one screenshot/i.test(hero.textContent) &&
        /proof you can ship/i.test(hero.textContent) &&
        /pixels never uploaded/i.test(hero.textContent),
      )
      .catch(() => false),
  );
  check(
    'hero exposes an enabled one-click audit action',
    await page.$eval('#heroDemoBtn', (btn) => !btn.disabled).catch(() => false),
  );
  const progressiveDisclosure = await page.evaluate(() => ({
    labs: [...document.querySelectorAll('.advanced-audit-card')].map((details) => details.open),
    primaryExports: document.querySelectorAll('.evidence-dock-actions > button').length,
    secondaryClosed: !document.querySelector('.secondary-exports')?.open,
  }));
  check(
    'specialist labs use progressive disclosure by default',
    progressiveDisclosure.labs.length === 2 &&
      progressiveDisclosure.labs.every((open) => !open),
    JSON.stringify(progressiveDisclosure.labs),
  );
  check(
    'evidence dock promotes four primary artifacts and tucks away secondary formats',
    progressiveDisclosure.primaryExports === 4 && progressiveDisclosure.secondaryClosed,
    `${progressiveDisclosure.primaryExports} primary exports`,
  );

  const offlineReady = await page
    .waitForFunction(
      async () =>
        Boolean(navigator.serviceWorker?.controller) &&
        (await caches.keys()).some((name) => name.startsWith('clearsight-static-')),
      { timeout: 10000 },
    )
    .then(() => true)
    .catch(() => false);
  check('offline app shell is installed', offlineReady);
  if (offlineReady) {
    await page.setOfflineMode(true);
    const offlineReloaded = await page
      .reload({ waitUntil: 'domcontentloaded', timeout: 10000 })
      .then(async () => /clearsight/i.test(await page.title()))
      .catch(() => false);
    check('app reloads with network disconnected', offlineReloaded);
    await page.setOfflineMode(false);
  }

  // Drive the full guided workflow: sample load -> all simulations -> contrast.
  await page.click('#quickDemoBtn');
  const rendered = await page
    .waitForFunction(
      (expected) => document.querySelectorAll('#simGrid .sim-card.is-done').length >= expected,
      { timeout: 60000 },
      EXPECTED_SIM_CARDS,
    )
    .then(() => true)
    .catch(() => false);
  const doneCount = await page.$$eval('#simGrid .sim-card.is-done', (cards) => cards.length);
  check(`all ${EXPECTED_SIM_CARDS} simulations render`, rendered, `${doneCount} completed`);
  check(
    'no simulation card errored',
    (await page.$$eval('#simGrid .sim-card.is-error', (cards) => cards.length)) === 0,
  );

  const impactChips = await page.$$eval('#impactSummary button, #impactSummary .impact-chip', (chips) => chips.length);
  check('impact summary is populated', impactChips > 0, `${impactChips} chips`);

  const contrastText = await page.$eval('#contrastOut', (el) => el.textContent.trim()).catch(() => '');
  check('contrast check produced output', /:1|ratio/i.test(contrastText));

  const paletteSwatches = await page.$$eval('#paletteSwatches *', (nodes) => nodes.length).catch(() => 0);
  check('palette audit rendered swatches', paletteSwatches > 0, `${paletteSwatches} nodes`);

  // CVD color-collision scan: distinct dominant pairs that collapse under color-blindness.
  // The UI sample's teal/blue action buttons become near-identical grays in grayscale.
  const collisionState = await page.evaluate(() => ({
    status: document.getElementById('collisionStatus')?.textContent.trim() || '',
    count: Number(document.getElementById('collisionStatus')?.dataset.collisions ?? NaN),
    rows: document.querySelectorAll('#collisionList .collision-pair').length,
    chips: document.querySelectorAll('#collisionList .collision-chip').length,
  })).catch(() => null);
  check(
    'palette collision scan flags color-only distinction risks',
    Boolean(collisionState) && Number.isFinite(collisionState.count) && collisionState.count >= 1 && collisionState.rows === collisionState.count,
    collisionState?.status || 'missing',
  );
  check(
    'collision rows pair typical-vision and projected swatches',
    Boolean(collisionState) && collisionState.rows > 0 && collisionState.chips === collisionState.rows * 4,
    collisionState ? `${collisionState.rows} rows, ${collisionState.chips} chips` : 'missing',
  );

  // Automatic text contrast scan: regions detected, overlay painted, worst-first list.
  const textScanVisible = await page.$eval('#textScanResult', (el) => !el.hidden).catch(() => false);
  const textScanStatus = await page.$eval('#textScanStatus', (el) => el.textContent.trim()).catch(() => '');
  check('text contrast scan detects regions', textScanVisible, textScanStatus);
  const commandCenter = await page.evaluate(() => ({
    badge: document.getElementById('findingsVerdictBadge')?.textContent.trim(),
    belowAA: document.getElementById('findingTextIssueCount')?.textContent.trim(),
    cvd: document.getElementById('findingCvdIssueCount')?.textContent.trim(),
    collisions: document.getElementById('findingCollisionCount')?.textContent.trim(),
    components: document.getElementById('findingComponentIssueCount')?.textContent.trim(),
    targets: document.getElementById('findingTargetIssueCount')?.textContent.trim(),
    title: document.getElementById('findings-command-title')?.textContent.trim(),
    summary: document.getElementById('findingsCommandSummary')?.textContent.trim(),
    action: document.getElementById('findingsActionBtn')?.textContent.trim(),
    enabled: !document.getElementById('findingsActionBtn')?.disabled,
  })).catch(() => null);
  check(
    'live audit verdict prioritizes the detected risks',
    Boolean(
      commandCenter?.enabled &&
      commandCenter.belowAA === '1' &&
      Number(commandCenter.cvd) > 0 &&
      Number(commandCenter.collisions) > 0 &&
      commandCenter.components === '1' &&
      commandCenter.targets === '3' &&
      /surface.*target risk/.test(commandCenter.title) &&
      /component surfaces.*tap targets measured/.test(commandCenter.summary) &&
      /repair/i.test(commandCenter.action)
    ),
    JSON.stringify(commandCenter),
  );
  if (textScanVisible) {
    const textScanRegions = await page.$$eval('#textScanList .palette-pair', (rows) => rows.length);
    check('text scan lists detected regions', textScanRegions > 0, `${textScanRegions} regions`);
    const overlayPainted = await page.$eval(
      '#textScanCanvas',
      (canvas) => canvas.width > 0 && canvas.height > 0,
    );
    check('text scan overlay canvas is painted', overlayPainted);
    const issueLens = await page.$eval('#textScanLens', (lens) => ({
      visible: !lens.hidden,
      pixels: document.getElementById('textScanLensCanvas')?.width || 0,
      detail: document.getElementById('textScanLensDetail')?.textContent || '',
    })).catch(() => null);
    check(
      'issue lens magnifies the worst detected finding',
      Boolean(issueLens?.visible && issueLens.pixels > 0 && /Finding #1/.test(issueLens.detail)),
      issueLens ? `${issueLens.pixels}px · ${issueLens.detail}` : 'missing',
    );
    const annotatedScanReady = await page.$eval(
      '#downloadTextScanBtn',
      (button) => !button.disabled && button.offsetParent !== null,
    );
    check('annotated text scan export is ready', annotatedScanReady);
    const bulkRepairState = await page.$eval('#repairAllTextBtn', (button) => ({
      enabled: !button.disabled,
      label: button.textContent.trim(),
      ariaLabel: button.getAttribute('aria-label') || '',
    })).catch(() => null);
    check(
      'one-click text autofix targets every detected failure',
      Boolean(
        bulkRepairState?.enabled &&
        /fix all 1 detected failure/i.test(bulkRepairState.label) &&
        /automatically repair and verify all 1/i.test(bulkRepairState.ariaLabel),
      ),
      JSON.stringify(bulkRepairState),
    );
    const completeRepairState = await page.$eval('#repairAllAuditBtn', (button) => ({
      enabled: !button.disabled,
      label: button.textContent.trim(),
      helper: button.parentElement?.textContent || '',
    })).catch(() => null);
    check(
      'complete repair combines text and component failures in one verified action',
      Boolean(
        completeRepairState?.enabled &&
        /fix all 2 text \+ component failures/i.test(completeRepairState.label) &&
        /six audit axes/i.test(completeRepairState.helper),
      ),
      JSON.stringify(completeRepairState),
    );
    const scanRatios = await page.$$eval('#textScanList .palette-pair-detail', (nodes) =>
      nodes.map((node) => Number((node.textContent.match(/(\d+(?:\.\d+)?):1/) || [])[1])),
    );
    const sortedWorstFirst = scanRatios.every(
      (ratio, index) => index === 0 || (Number.isFinite(ratio) && ratio >= scanRatios[index - 1]),
    );
    check('text scan regions are ordered worst-contrast first', sortedWorstFirst, scanRatios.join(', '));
    // The guided review loads the worst pair, checks it, and creates remediation choices.
    await page.$eval('#reviewWorstTextBtn', (button) => button.click());
    const guidedReviewReady = await page
      .waitForFunction(() => {
        const suggestions = document.querySelectorAll('#suggestions .palette-card');
        return suggestions.length > 0;
      }, { timeout: 5000 })
      .then(() => true)
      .catch(() => false);
    const guidedReviewDetail = await page.evaluate(() => ({
      suggestions: document.getElementById('suggestions')?.textContent.trim().slice(0, 120),
      text: document.getElementById('contrastTextHex')?.value,
      background: document.getElementById('contrastBgHex')?.value,
      worst: document.querySelector('#textScanList .palette-pair-detail')?.textContent,
      message: document.getElementById('message')?.textContent,
    })).catch(() => null);
    check('worst text region loads and guided review generates fixes', guidedReviewReady, JSON.stringify(guidedReviewDetail));

    // Text scan findings must reach every judge-facing export artifact.
    const exportIntegration = await page.evaluate(() => {
      const hooks = window.__clearsightReportHooks;
      if (!hooks) return null;
      const report = hooks.buildAccessibilityReport();
      return {
        reportRegions: report.textScan?.regions?.length || 0,
        reportBelowAA: report.textScan?.summary?.belowAA ?? null,
        remediationMentionsScan: (report.remediationActions || []).some((action) =>
          /text scan flagged/i.test(action.text),
        ),
        regionsHaveCvd: (report.textScan?.regions || []).every(
          (region) => Number.isFinite(region.cvdWorstRatio) && Boolean(region.cvdWorstMode),
        ),
        contrastHasCvdProjection: (report.contrast?.lastChecked?.cvdProjection?.projections?.length || 0) === 7,
        contrastHasApca: Number.isFinite(report.contrast?.lastChecked?.apca?.lc),
        regionsHaveApca: (report.textScan?.regions || []).every((region) => Number.isFinite(region.apcaLc)),
        summaryHasApcaLine: /APCA \(WCAG 3 draft\):/.test(hooks.buildJudgeSummaryMarkdown()),
        csvHasApca: /apca_lc/.test(hooks.buildAccessibilityReportCsv()),
        summaryHasCvdLine: /Color-vision projection:/.test(hooks.buildJudgeSummaryMarkdown()),
        summaryHasSection: /## Automatic text contrast scan/.test(hooks.buildJudgeSummaryMarkdown()),
        csvHasColumns: /text_scan_regions/.test(hooks.buildAccessibilityReportCsv()),
        packetHasSection: /Automatic text contrast scan/.test(hooks.buildReviewerPacketHtml()),
        manifestHasSection: /Automatic text contrast scan:/.test(hooks.buildSubmissionManifestText()),
        collisionCount: report.paletteCollisions?.summary?.collisions ?? null,
        collisionPairsComplete: (report.paletteCollisions?.pairs || []).every(
          (pair) => pair.projectedA && pair.projectedB && pair.worstMode && Number.isFinite(pair.baseDeltaE),
        ),
        summaryHasCollisionLine: /Color-only distinction \(WCAG 1\.4\.1\):/.test(hooks.buildJudgeSummaryMarkdown()),
        csvHasCollisionColumns: /palette_collision_pairs/.test(hooks.buildAccessibilityReportCsv()),
        packetHasCollisionLine: /Color-only distinction \(WCAG 1\.4\.1\)/.test(hooks.buildReviewerPacketHtml()),
        remediationMentionsCollision: (report.remediationActions || []).some((action) => /1\.4\.1/.test(action.text)),
      };
    });
    check(
      'accessibility report JSON embeds text scan findings',
      Boolean(exportIntegration?.reportRegions),
      `${exportIntegration?.reportRegions ?? 0} regions, ${exportIntegration?.reportBelowAA ?? 'n/a'} below AA`,
    );
    check(
      'remediation plan flags below-AA text scan regions',
      exportIntegration?.reportBelowAA === 0 || Boolean(exportIntegration?.remediationMentionsScan),
    );
    check('text scan regions carry CVD-projected contrast', Boolean(exportIntegration?.regionsHaveCvd));
    check('contrast report embeds 7-mode CVD projection', Boolean(exportIntegration?.contrastHasCvdProjection));
    check('contrast report embeds APCA (WCAG 3 draft) score', Boolean(exportIntegration?.contrastHasApca));
    check('text scan regions carry APCA Lc scores', Boolean(exportIntegration?.regionsHaveApca));
    check('judge summary includes APCA snapshot line', Boolean(exportIntegration?.summaryHasApcaLine));
    check('accessibility report CSV includes APCA columns', Boolean(exportIntegration?.csvHasApca));
    check('judge summary includes color-vision projection line', Boolean(exportIntegration?.summaryHasCvdLine));
    check('judge summary markdown includes text scan section', Boolean(exportIntegration?.summaryHasSection));
    check('accessibility report CSV includes text scan columns', Boolean(exportIntegration?.csvHasColumns));
    check('reviewer packet HTML includes text scan section', Boolean(exportIntegration?.packetHasSection));
    check('submission manifest includes text scan section', Boolean(exportIntegration?.manifestHasSection));
    check(
      'accessibility report JSON embeds palette collision findings',
      Number(exportIntegration?.collisionCount) >= 1 && Boolean(exportIntegration?.collisionPairsComplete),
      `${exportIntegration?.collisionCount ?? 'n/a'} collisions`,
    );
    check('judge summary includes color-only distinction line', Boolean(exportIntegration?.summaryHasCollisionLine));
    check('accessibility report CSV includes palette collision columns', Boolean(exportIntegration?.csvHasCollisionColumns));
    check('reviewer packet HTML includes color-only distinction line', Boolean(exportIntegration?.packetHasCollisionLine));
    check(
      'remediation plan cites WCAG 1.4.1 for collision risks',
      exportIntegration?.collisionCount === 0 || Boolean(exportIntegration?.remediationMentionsCollision),
    );
    const targetedRepairReady = await page
      .$eval('#textScanLensRepairBtn', (button) => !button.disabled && /repair region/i.test(button.textContent || ''))
      .catch(() => false);
    check('worst text finding offers a targeted local repair', targetedRepairReady);

    // WCAG 1.4.11: component surfaces with no visible boundary against the page.
    const componentScanState = await page.evaluate(() => {
      const hooks = window.__clearsightReportHooks;
      if (!hooks) return null;
      const report = hooks.buildAccessibilityReport();
      return {
        panelVisible: !document.getElementById('componentScanResult')?.hidden,
        status: document.getElementById('componentScanStatus')?.textContent.trim() || '',
        rows: document.querySelectorAll('#componentScanList .collision-pair').length,
        firstDetail: document.querySelector('#componentScanList .collision-detail')?.textContent || '',
        reportSummary: report.componentContrast?.summary || null,
        reportWorst: report.componentContrast?.findings?.[0] || null,
        summaryHasLine: /UI component contrast \(WCAG 1\.4\.11\):/.test(hooks.buildJudgeSummaryMarkdown()),
        csvHasColumns: /component_surfaces_below_3_1/.test(hooks.buildAccessibilityReportCsv()),
        remediationMentionsSurface: (report.remediationActions || []).some((action) => /1\.4\.11/.test(action.text)),
      };
    });
    check(
      'component surface scan flags the ghost input below 3:1 (WCAG 1.4.11)',
      Boolean(
        componentScanState?.panelVisible &&
        componentScanState.rows >= 1 &&
        componentScanState.reportWorst &&
        componentScanState.reportWorst.ratio < 3,
      ),
      componentScanState?.reportWorst
        ? `${componentScanState.rows} finding(s) · worst ${componentScanState.reportWorst.surface} vs ${componentScanState.reportWorst.surrounding} at ${componentScanState.reportWorst.ratio}:1`
        : 'missing',
    );
    check(
      'component scan verdict names the failing surface and the 3:1 minimum',
      Boolean(/needs 3:1/.test(componentScanState?.firstDetail || '') && /below 3:1/.test(componentScanState?.status || '')),
      componentScanState?.status,
    );
    check(
      'accessibility report JSON embeds component surface findings',
      Number(componentScanState?.reportSummary?.failing) >= 1 &&
        Number(componentScanState?.reportSummary?.evaluated) >= Number(componentScanState?.reportSummary?.failing),
      JSON.stringify(componentScanState?.reportSummary),
    );
    check('judge summary includes UI component contrast (WCAG 1.4.11) line', Boolean(componentScanState?.summaryHasLine));
    check('accessibility report CSV includes component surface columns', Boolean(componentScanState?.csvHasColumns));
    check(
      'remediation plan cites WCAG 1.4.11 for invisible component surfaces',
      Boolean(componentScanState?.remediationMentionsSurface),
    );

    // Tap target size (WCAG 2.5.8): the demo toolbar's 16px icon buttons pass
    // every color lens yet are too small and too crowded to tap — a failure
    // only geometric measurement can see.
    const targetSizeState = await page.evaluate(() => {
      const hooks = window.__clearsightReportHooks;
      const report = hooks.buildAccessibilityReport();
      return {
        status: document.getElementById('targetSizeStatus')?.textContent.trim() || '',
        undersized: Number(document.getElementById('targetSizeStatus')?.dataset.undersized ?? NaN),
        rows: document.querySelectorAll('#targetSizeList .collision-pair').length,
        visible: !document.getElementById('targetSizeResult')?.hidden,
        reportSummary: report.targetSizes?.summary || null,
        worst: report.targetSizes?.findings?.[0] || null,
        summaryHasLine: /Tap target size \(WCAG 2\.5\.8\):\*\* \d+ of \d+ measured targets below/.test(
          hooks.buildJudgeSummaryMarkdown() || '',
        ),
        csvHasColumns: /target_size_targets,target_size_undersized_2_5_8,target_size_worst/.test(
          hooks.buildAccessibilityReportCsv() || '',
        ),
        remediationMentions: (report.remediationActions || []).some((action) =>
          /2\.5\.8/.test(action.text) && /layout change/.test(action.text),
        ),
      };
    });
    check(
      'target size scan flags the crowded 16px icon toolbar (WCAG 2.5.8)',
      Boolean(targetSizeState?.visible) &&
        targetSizeState.undersized === 3 &&
        targetSizeState.rows === 3 &&
        targetSizeState.reportSummary?.undersized === 3 &&
        Number(targetSizeState.worst?.widthCss) < 24 &&
        Number(targetSizeState.worst?.heightCss) < 24,
      targetSizeState?.worst
        ? `${targetSizeState.undersized} undersized · smallest ${targetSizeState.worst.widthCss}×${targetSizeState.worst.heightCss} CSS px`
        : 'missing',
    );
    check(
      'target size verdict names the 24px minimum and the spacing exception',
      /24×24 CSS px minimum/.test(targetSizeState?.status || '') &&
        /spacing exception/.test(targetSizeState?.status || ''),
      targetSizeState?.status,
    );
    check(
      'target size scan measures passing control surfaces alongside failures',
      Number(targetSizeState?.reportSummary?.targets) >= 4 &&
        Number(targetSizeState?.reportSummary?.passing) >= 1 &&
        Number(targetSizeState?.reportSummary?.targets) ===
          Number(targetSizeState?.reportSummary?.undersized) +
            Number(targetSizeState?.reportSummary?.spacingExempt) +
            Number(targetSizeState?.reportSummary?.passing),
      JSON.stringify(targetSizeState?.reportSummary),
    );
    check('judge summary includes tap target size (WCAG 2.5.8) line', Boolean(targetSizeState?.summaryHasLine));
    check('accessibility report CSV includes target size columns', Boolean(targetSizeState?.csvHasColumns));
    check(
      'remediation plan cites WCAG 2.5.8 with an honest layout-change fix',
      Boolean(targetSizeState?.remediationMentions),
    );

    // Developer handoff: the CSS fix sheet must carry the same verified
    // replacement colors the one-click repairs paint, as paste-ready CSS.
    const cssFixSheetState = await page.evaluate(() => {
      const hooks = window.__clearsightReportHooks;
      const css = hooks?.buildCssFixSheetText?.() || '';
      return {
        css,
        copyDisabled: document.getElementById('copyCssFixesBtn')?.disabled ?? true,
        downloadDisabled: document.getElementById('downloadCssFixesBtn')?.disabled ?? true,
        manifestHasCssRow: /-fixes\.css \| Developer CSS fix sheet/.test(
          hooks?.buildSubmissionManifestText?.() || '',
        ),
      };
    });
    check(
      'CSS fix sheet actions enable once repairable failures exist',
      !cssFixSheetState.copyDisabled && !cssFixSheetState.downloadDisabled,
    );
    check(
      'CSS fix sheet ships paste-ready custom properties for text and surface fixes',
      /:root \{/.test(cssFixSheetState.css) &&
        /--clearsight-text-1-color: #[0-9A-F]{6}; \/\* was #[0-9A-F]{6} \*\//.test(cssFixSheetState.css) &&
        /--clearsight-component-1-surface: #[0-9A-F]{6}; \/\* was #DAE2EB \*\//.test(cssFixSheetState.css) &&
        /\.clearsight-component-fix-1 \{/.test(cssFixSheetState.css) &&
        /\.clearsight-target-fix-1 \{/.test(cssFixSheetState.css) &&
        /min-inline-size: 24px/.test(cssFixSheetState.css),
      cssFixSheetState.css.slice(0, 200),
    );
    check(
      'CSS fix sheet states honest before/after ratios and WCAG criteria',
        /surface vs page 1\.25:1 → \d+\.\d{2}:1/.test(cssFixSheetState.css) &&
        /WCAG 1\.4\.3 contrast minimum/.test(cssFixSheetState.css) &&
        /WCAG 1\.4\.11 non-text contrast/.test(cssFixSheetState.css) &&
        /WCAG 2\.5\.8 target size/.test(cssFixSheetState.css) &&
        /real source selector/.test(cssFixSheetState.css),
    );
    check('submission manifest lists the developer CSS fix sheet', cssFixSheetState.manifestHasCssRow);
    const cssDownloadMessage = await page
      .$eval('#downloadCssFixesBtn', (btn) => {
        btn.click();
        return true;
      })
      .then(() =>
        page.waitForFunction(
          () => /CSS fix sheet exported as .*-fixes\.css/.test(document.getElementById('message')?.textContent || ''),
          { timeout: 5000 },
        ),
      )
      .then(() => true)
      .catch(() => false);
    check('Download fix sheet button exports a named .css artifact', cssDownloadMessage);

    // VPAT-style conformance summary: every machine-checked criterion must map
    // to an honest outcome with the same measured evidence the audit shows.
    const conformanceState = await page.evaluate(() => {
      const hooks = window.__clearsightReportHooks;
      const markdown = hooks?.buildConformanceSummaryText?.() || '';
      return {
        markdown,
        downloadDisabled: document.getElementById('downloadConformanceBtn')?.disabled ?? true,
        manifestHasRow: /-conformance-summary\.md \| WCAG conformance summary markdown/.test(
          hooks?.buildSubmissionManifestText?.() || '',
        ),
      };
    });
    check(
      'conformance summary maps the demo audit criterion-by-criterion (1.4.3/1.4.11/2.5.8/1.4.1 fail)',
      /\| 1\.4\.3 Contrast \(Minimum\) \| AA \| Does Not Support \| 1 of \d+ detected text regions/.test(conformanceState.markdown) &&
        /\| 1\.4\.11 Non-text Contrast \| AA \| Does Not Support \|.*1\.25:1/.test(conformanceState.markdown) &&
        /\| 2\.5\.8 Target Size \(Minimum\) \| AA \| Does Not Support \| 3 of \d+ targets/.test(conformanceState.markdown) &&
        /\| 1\.4\.1 Use of Color \| A \| Does Not Support \| 3 palette pairs/.test(conformanceState.markdown),
      conformanceState.markdown.split('\n').filter((line) => line.startsWith('| 1.4') || line.startsWith('| 2.')).join(' // ').slice(0, 400),
    );
    check(
      'conformance summary keeps motion criteria honest for a static screenshot',
      /\| 2\.3\.1 Three Flashes or Below Threshold \| A \| Not Evaluated \| Static screenshot only/.test(
        conformanceState.markdown,
      ),
    );
    check(
      'conformance summary carries advisory CVD/APCA lenses and hidden-failure evidence',
      /## Advisory lenses \(beyond WCAG 2\.2\)/.test(conformanceState.markdown) &&
        /Color-vision projected contrast \| Risk detected \| 2 text regions pass WCAG 2 AA/.test(conformanceState.markdown),
    );
    check(
      'conformance summary states honest scope and manual-testing criteria',
      /not a legal conformance claim/.test(conformanceState.markdown) &&
        /## Requires manual testing/.test(conformanceState.markdown) &&
        /2\.4\.7 Focus Visible/.test(conformanceState.markdown) &&
        /- ClearSight Score: \d+\/100 \(Grade [A-F]\)/.test(conformanceState.markdown),
    );
    check('submission manifest lists the conformance summary', conformanceState.manifestHasRow);
    const conformanceDownloadMessage = await page
      .$eval('#downloadConformanceBtn', (btn) => {
        if (btn.disabled) return false;
        btn.click();
        return true;
      })
      .then((clicked) =>
        clicked
          ? page.waitForFunction(
              () =>
                /Downloaded WCAG conformance summary as .*-conformance-summary\.md/.test(
                  document.getElementById('message')?.textContent || '',
                ),
              { timeout: 5000 },
            ).then(() => true)
          : false,
      )
      .catch(() => false);
    check('Download conformance summary button exports a named .md artifact', conformanceDownloadMessage);

    // One-click WCAG 1.4.11 remediation: repaint the ghost surface, rerun the
    // complete audit, and require a verified before→after proof.
    const componentRepairClicked = await page
      .$eval('#componentScanList .component-repair-btn', (btn) => {
        btn.click();
        return true;
      })
      .catch(() => false);
    check('failing component surface offers a one-click repair action', componentRepairClicked);
    if (componentRepairClicked) {
      const repairProofShown = await page
        .waitForFunction(() => {
          const proof = document.getElementById('componentScanRepairProof');
          return proof && !proof.hidden && /verified/i.test(proof.textContent || '');
        }, { timeout: 90000 })
        .then(() => true)
        .catch(() => false);
      const repairState = await page.evaluate(() => {
        const hooks = window.__clearsightReportHooks;
        const report = hooks.buildAccessibilityReport();
        return {
          proof: document.getElementById('componentScanRepairProof')?.textContent.trim() || '',
          status: document.getElementById('componentScanStatus')?.textContent.trim() || '',
          failing: report.componentContrast?.summary?.failing ?? null,
          evaluated: report.componentContrast?.summary?.evaluated ?? null,
          belowAA: report.textScan?.summary?.belowAA ?? null,
          repair: hooks.getComponentRepair(),
          sourceName: hooks.getSourceMeta()?.name || '',
        };
      }).catch(() => null);
      check(
        'component surface repair re-audits with a verified before/after proof',
        repairProofShown && /\d+\.\d\d:1 → /.test(repairState?.proof || ''),
        repairState?.proof,
      );
      check(
        'repaired component surface passes the 3:1 re-scan',
        repairState?.failing === 0 && Number(repairState?.evaluated) >= 1,
        `failing=${repairState?.failing} evaluated=${repairState?.evaluated} · ${repairState?.status}`,
      );
      check(
        'surface repair keeps the pinned below-AA text contract without adding failures',
        repairState?.belowAA === 1,
        `belowAA=${repairState?.belowAA}`,
      );
      check(
        'surface repair promotes a locally generated source for the re-audit',
        /surface-fixed/.test(repairState?.sourceName || '') && Number(repairState?.repair?.changedPixels) > 0,
        `${repairState?.sourceName} · ${repairState?.repair?.changedPixels ?? 0} px`,
      );
      const scoreProofAfterSurfaceRepair = await page
        .$eval('#clearsightScoreProof', (el) => ({ hidden: el.hidden, text: el.textContent.trim() }))
        .catch(() => null);
      check(
        'surface repair records a ClearSight Score before/after proof',
        Boolean(
          scoreProofAfterSurfaceRepair &&
            !scoreProofAfterSurfaceRepair.hidden &&
            /\d+ → \d+/.test(scoreProofAfterSurfaceRepair.text),
        ),
        scoreProofAfterSurfaceRepair?.text,
      );
      const repairProofCard = await page.evaluate(() => {
        const card = window.__clearsightReportHooks?.buildRepairProofCard?.();
        return card
          ? {
              width: card.width,
              height: card.height,
              png: card.dataUrl.startsWith('data:image/png;base64,'),
              bytes: card.dataUrl.length,
              enabled: !document.getElementById('downloadRepairProofBtn')?.disabled,
              manifest: window.__clearsightReportHooks.buildSubmissionManifestText(),
            }
          : null;
      }).catch(() => null);
      check(
        'verified repair creates a painted 1200×630 before/after proof card',
        repairProofCard?.width === 1200 &&
          repairProofCard?.height === 630 &&
          repairProofCard?.png &&
          repairProofCard?.bytes > 10000,
        JSON.stringify(repairProofCard && {
          width: repairProofCard.width,
          height: repairProofCard.height,
          bytes: repairProofCard.bytes,
        }),
      );
      check('repair proof download unlocks only after verified re-audit', repairProofCard?.enabled === true);
      check(
        'submission manifest includes verified repair proof when available',
        /repair-proof-card\.png.*Verified accessibility repair proof/i.test(repairProofCard?.manifest || ''),
      );
      const cssFixAfterSurfaceRepair = await page.evaluate(() => {
        const hooks = window.__clearsightReportHooks;
        const css = hooks?.buildCssFixSheetText?.() || '';
        return {
          css,
          copyDisabled: document.getElementById('copyCssFixesBtn')?.disabled ?? true,
        };
      });
      check(
        'CSS fix sheet tracks live state: repaired surface drops out, remaining text fix stays',
        !cssFixAfterSurfaceRepair.copyDisabled &&
          /1 text fix \(WCAG 1\.4\.3 contrast minimum\)/.test(cssFixAfterSurfaceRepair.css) &&
          !/WCAG 1\.4\.11 non-text contrast/.test(cssFixAfterSurfaceRepair.css),
        cssFixAfterSurfaceRepair.css.split('\n')[2] || '',
      );
      const conformanceAfterRepair = await page.evaluate(
        () => window.__clearsightReportHooks?.buildConformanceSummaryText?.() || '',
      );
      check(
        'conformance summary tracks the live re-audit: repaired 1.4.11 flips to Supports',
        /\| 1\.4\.11 Non-text Contrast \| AA \| Supports \| All \d+ resolved component surfaces/.test(
          conformanceAfterRepair,
        ) && /\| 1\.4\.3 Contrast \(Minimum\) \| AA \| Does Not Support \|/.test(conformanceAfterRepair),
        conformanceAfterRepair.split('\n').find((line) => line.startsWith('| 1.4.11')) || '',
      );

      const undoRepairClicked = await page
        .$eval('#undoImageRepairBtn', (button) => {
          if (button.disabled) return false;
          button.click();
          return true;
        })
        .catch(() => false);
      const undoRepairRestored = undoRepairClicked && await page
        .waitForFunction(() => {
          const report = window.__clearsightReportHooks?.buildAccessibilityReport?.();
          const button = document.getElementById('undoImageRepairBtn');
          return report?.componentContrast?.summary?.failing === 1 && button?.disabled;
        }, { timeout: 90000 })
        .then(() => true)
        .catch(() => false);
      const undoRepairState = await page.evaluate(() => ({
        sourceName: window.__clearsightReportHooks?.getSourceMeta?.()?.name || '',
        message: document.getElementById('message')?.textContent.trim() || '',
        proofHidden: document.getElementById('componentScanRepairProof')?.hidden ?? false,
      }));
      check(
        'screenshot repair undo restores the exact pre-repair audit and provenance',
        undoRepairRestored &&
          undoRepairState.sourceName === 'ui-sample.png' &&
          undoRepairState.proofHidden,
        JSON.stringify(undoRepairState),
      );
    }

    // ClearSight Score: one graded 0-100 verdict across all six analysis axes.
    const scoreState = await page.evaluate(() => {
      const hooks = window.__clearsightReportHooks;
      const card = document.getElementById('clearsightScoreCard');
      const report = hooks.buildAccessibilityReport();
      return {
        visible: Boolean(card && !card.hidden),
        score: Number(card?.dataset.score ?? NaN),
        grade: card?.dataset.grade || '',
        ringValue: document.getElementById('clearsightScoreValue')?.textContent.trim() || '',
        verdict: document.getElementById('clearsightScoreVerdict')?.textContent.trim() || '',
        reportScore: report.accessibilityScore?.score ?? null,
        reportGrade: report.accessibilityScore?.grade ?? null,
        axisCount: report.accessibilityScore?.axes?.length ?? 0,
        scoredAxes: (report.accessibilityScore?.axes || []).filter((axis) => Number.isFinite(axis.score)).length,
        fingerprintAxes: Number(document.getElementById('riskFingerprintChart')?.dataset.axes ?? 0),
        fingerprintPoints: document.getElementById('riskFingerprintShape')?.getAttribute('points') || '',
        fingerprintDescription: document.getElementById('risk-fingerprint-desc')?.textContent || '',
        csvHasScore: /clearsight_score/.test(hooks.buildAccessibilityReportCsv()),
        summaryHasScore: /ClearSight Score/.test(hooks.buildJudgeSummaryMarkdown())
          && /\d+\/100 \(Grade [A-F]/.test(hooks.buildJudgeSummaryMarkdown()),
        packetHasScore: /ClearSight Score: \d+\/100/.test(hooks.buildReviewerPacketHtml()),
      };
    }).catch(() => null);
    check(
      'ClearSight Score card shows a live graded verdict',
      Boolean(scoreState?.visible) &&
        Number.isFinite(scoreState.score) &&
        scoreState.score >= 0 &&
        scoreState.score <= 100 &&
        /^[A-F]$/.test(scoreState.grade) &&
        scoreState.ringValue === String(scoreState.score),
      scoreState ? `${scoreState.ringValue}/100 · ${scoreState.verdict}` : 'missing',
    );
    check(
      'score reflects the demo sample\'s real findings (0 < score < 100)',
      Number.isFinite(scoreState?.score) && scoreState.score > 0 && scoreState.score < 100,
      String(scoreState?.score),
    );
    check(
      'report JSON embeds the ClearSight Score with six weighted axes',
      scoreState?.reportScore === scoreState?.score &&
        scoreState?.reportGrade === scoreState?.grade &&
        scoreState?.axisCount === 6 &&
        scoreState?.scoredAxes >= 5,
      `${scoreState?.reportScore ?? 'n/a'} (${scoreState?.scoredAxes ?? 0}/6 axes scored)`,
    );
    check(
      'live risk fingerprint visualizes and describes all six score axes',
      scoreState?.fingerprintAxes === 6 &&
        scoreState.fingerprintPoints.split(' ').length === 6 &&
        /Text contrast.*Color-vision safety.*Tap target size/.test(scoreState.fingerprintDescription),
      `${scoreState?.fingerprintAxes ?? 0} axes · ${scoreState?.fingerprintPoints || 'missing shape'}`,
    );
    check('accessibility report CSV includes clearsight_score columns', Boolean(scoreState?.csvHasScore));
    check(
      'judge summary and reviewer packet report the graded score',
      Boolean(scoreState?.summaryHasScore && scoreState?.packetHasScore),
    );
  }

  const readiness = await page
    .$eval('#submissionReadinessText', (el) => el.textContent.trim())
    .catch(() => '');
  const readinessScore = await page
    .$eval('#submissionReadinessScore', (el) => el.textContent.trim())
    .catch(() => '');
  check('judge readiness reaches 100%', /100/.test(readinessScore) || /ready/i.test(readiness), `${readinessScore} ${readiness}`);

  const exportUnlocked = await page.$eval('#downloadPackageBtn', (btn) => !btn.disabled).catch(() => false);
  check('submission package export unlocked', exportUnlocked);

  const verdictCard = await page.evaluate(() => {
    const card = window.__clearsightReportHooks?.buildAuditVerdictCard?.();
    return card
      ? {
          width: card.width,
          height: card.height,
          png: card.dataUrl.startsWith('data:image/png;base64,'),
          bytes: card.dataUrl.length,
          manifest: window.__clearsightReportHooks.buildSubmissionManifestText(),
        }
      : null;
  });
  check(
    'audit verdict card is a painted 1200×630 PNG',
    verdictCard?.width === 1200 && verdictCard?.height === 630 && verdictCard?.png && verdictCard?.bytes > 10000,
    JSON.stringify(verdictCard && { width: verdictCard.width, height: verdictCard.height, bytes: verdictCard.bytes }),
  );
  check(
    'submission manifest includes audit verdict card',
    /audit-verdict-card\.png.*Presentation-ready audit verdict card/i.test(verdictCard?.manifest || ''),
  );
  // PDF audit report: written byte-by-byte in the browser with zero libraries.
  const pdfState = await page
    .evaluate(() => {
      const hooks = window.__clearsightReportHooks;
      if (!hooks?.buildAuditPdfBytes) return null;
      const bytes = hooks.buildAuditPdfBytes();
      let text = '';
      for (let index = 0; index < bytes.length; index += 1) {
        text += String.fromCharCode(bytes[index]);
      }
      return {
        size: bytes.length,
        header: text.slice(0, 8),
        endsWithEof: text.trimEnd().endsWith('%%EOF'),
        hasScoreHeadline: /Grade [A-F]/.test(text) && text.includes('ClearSight Score'),
        hasFindings: text.includes('Findings overview') && text.includes('Prioritized remediation plan'),
        hasJpegImage: text.includes('/Filter /DCTDecode') && text.includes('/Im1 Do'),
        pdfButtonEnabled: !document.getElementById('downloadAuditPdfBtn')?.disabled,
        manifestListsPdf: /-audit-report\.pdf \| Audit report PDF/.test(hooks.buildSubmissionManifestText()),
      };
    })
    .catch(() => null);
  check(
    'PDF audit report builds valid client-side PDF bytes',
    Boolean(pdfState) && pdfState.header === '%PDF-1.4' && pdfState.endsWithEof && pdfState.size > 4000,
    pdfState ? `${pdfState.size} bytes` : 'hook missing',
  );
  check(
    'PDF embeds the graded score, findings, and remediation plan',
    Boolean(pdfState?.hasScoreHeadline && pdfState?.hasFindings),
  );
  check('PDF embeds the audited screenshot as a JPEG XObject', Boolean(pdfState?.hasJpegImage));
  check(
    'PDF download is unlocked and listed in the submission manifest',
    Boolean(pdfState?.pdfButtonEnabled && pdfState?.manifestListsPdf),
  );

  // Shareable audit link: the whole verdict travels in the URL fragment.
  const shareLink = await page
    .evaluate(() => window.__clearsightReportHooks?.buildShareLink?.())
    .catch(() => null);
  check(
    'shareable audit link is generated with a compressed fragment',
    typeof shareLink === 'string' && shareLink.includes('#share=1z.') && shareLink.length < 6000,
    shareLink ? `${shareLink.length} chars` : 'no link',
  );

  if (typeof shareLink === 'string' && shareLink.includes('#share=')) {
    const sharePage = await browser.newPage();
    await sharePage.goto(shareLink, { waitUntil: 'networkidle0', timeout: 30000 });
    const sharedView = await sharePage
      .evaluate(() => {
        const panel = document.getElementById('sharedAuditPanel');
        const body = document.getElementById('sharedAuditBody');
        const errorEl = document.getElementById('sharedAuditError');
        return panel && body
          ? {
              visible: !panel.hidden,
              errorHidden: !errorEl || errorEl.hidden,
              hasScoreRing: Boolean(body.querySelector('.score-ring[data-grade]')),
              scoreText: body.querySelector('.score-verdict')?.textContent || '',
              findingCount: body.querySelectorAll('.shared-audit-findings li').length,
              remediationCount: body.querySelectorAll('.shared-audit-remediation li').length,
              remediationCheckboxes: body.querySelectorAll('.shared-audit-remediation input[type="checkbox"]').length,
              progressText: body.querySelector('.shared-audit-progress strong')?.textContent || '',
              planButtonVisible: !document.getElementById('sharedAuditPlanBtn')?.hidden,
              metaText: document.getElementById('sharedAuditMeta')?.textContent || '',
            }
          : null;
      })
      .catch(() => null);
    check(
      'shared link renders the read-only audit verdict on a fresh page',
      Boolean(sharedView?.visible && sharedView?.errorHidden && sharedView?.hasScoreRing),
      sharedView ? sharedView.scoreText : 'panel missing',
    );
    check(
      'shared verdict includes findings and the remediation plan',
      Boolean(sharedView && sharedView.findingCount > 0 && sharedView.remediationCount > 0),
      sharedView ? `${sharedView.findingCount} findings, ${sharedView.remediationCount} actions` : '',
    );
    check(
      'shared remediation plan is an interactive local progress tracker',
      Boolean(
        sharedView &&
        sharedView.remediationCheckboxes === sharedView.remediationCount &&
        sharedView.planButtonVisible &&
        new RegExp(`0/${sharedView.remediationCount} actions complete`).test(sharedView.progressText),
      ),
      sharedView?.progressText || '',
    );
    const progressPersists = await sharePage
      .evaluate(() => {
        const checkbox = document.querySelector('.shared-audit-remediation input[type="checkbox"]');
        checkbox?.click();
        return {
          checked: checkbox?.checked,
          progress: document.querySelector('.shared-audit-progress strong')?.textContent || '',
          button: document.getElementById('sharedAuditPlanBtn')?.textContent || '',
        };
      })
      .then(async (beforeReload) => {
        await sharePage.reload({ waitUntil: 'networkidle0', timeout: 30000 });
        const afterReload = await sharePage.evaluate(() => ({
          checked: document.querySelector('.shared-audit-remediation input[type="checkbox"]')?.checked,
          progress: document.querySelector('.shared-audit-progress strong')?.textContent || '',
        }));
        return { beforeReload, afterReload };
      })
      .catch(() => null);
    check(
      'shared remediation completion persists for the exact audit link',
      Boolean(
        progressPersists?.beforeReload?.checked &&
        /1\/\d+ actions complete/.test(progressPersists.beforeReload.progress) &&
        /1\/\d+/.test(progressPersists.beforeReload.button) &&
        progressPersists?.afterReload?.checked &&
        /1\/\d+ actions complete/.test(progressPersists.afterReload.progress),
      ),
      progressPersists?.afterReload?.progress || '',
    );
    check(
      'shared verdict names the audited source',
      Boolean(sharedView?.metaText && /clearsight|sample|demo|\d+×\d+/i.test(sharedView.metaText)),
      sharedView?.metaText || '',
    );

    await sharePage.goto(`${origin}/index.html#share=1z.not-a-real-token`, {
      waitUntil: 'networkidle0',
      timeout: 30000,
    });
    const shareError = await sharePage
      .evaluate(() => {
        const panel = document.getElementById('sharedAuditPanel');
        const errorEl = document.getElementById('sharedAuditError');
        return {
          panelVisible: Boolean(panel && !panel.hidden),
          errorShown: Boolean(errorEl && !errorEl.hidden && errorEl.textContent.includes('Could not decode')),
        };
      })
      .catch(() => null);
    check(
      'corrupted share link shows a friendly decode error',
      Boolean(shareError?.panelVisible && shareError?.errorShown),
    );
    await sharePage.close().catch(() => {});
  }

  // QR share code: the same audit link rendered as a scannable QR by ClearSight's
  // own from-scratch encoder, entirely on-device.
  const qrState = await page
    .evaluate(async () => {
      const button = document.getElementById('showShareQrBtn');
      if (!button || button.disabled) return null;
      button.click();
      await new Promise((resolve) => setTimeout(resolve, 500));
      const raw = window.__clearsightReportHooks?.getShareQrRaw?.();
      const card = document.getElementById('shareQrCard');
      const canvas = document.getElementById('shareQrCanvas');
      if (!raw || !card || !canvas) return { missing: true };
      const { size, modules, scale } = raw;
      const at = (row, col) => modules[row * size + col];
      let timingOk = true;
      for (let i = 8; i <= size - 9; i += 1) {
        if (at(6, i) !== (i % 2 === 0 ? 1 : 0)) timingOk = false;
      }
      const findersOk = at(3, 3) === 1 && at(3, size - 4) === 1 && at(size - 4, 3) === 1;
      const context = canvas.getContext('2d');
      const corner = context.getImageData(0, 0, 1, 1).data;
      const finderPixel = context.getImageData(4 * scale + 1, 4 * scale + 1, 1, 1).data;
      return {
        cardVisible: !card.hidden,
        canvasSize: canvas.width,
        expectedCanvas: (size + 8) * scale,
        metaText: document.getElementById('shareQrMeta')?.textContent || '',
        version: raw.version,
        size,
        ecLevel: raw.ecLevel,
        byteLength: raw.byteLength,
        linkLength: raw.linkLength,
        timingOk,
        findersOk,
        quietZoneWhite: corner[0] === 255 && corner[1] === 255 && corner[2] === 255,
        finderDark: finderPixel[0] === 0 && finderPixel[1] === 0 && finderPixel[2] === 0,
      };
    })
    .catch(() => null);
  check(
    'QR share code renders in-app from the real button',
    Boolean(qrState?.cardVisible && qrState.canvasSize > 0 && qrState.canvasSize === qrState.expectedCanvas),
    qrState ? `canvas ${qrState.canvasSize}px` : 'no QR state',
  );
  check(
    'QR share code encodes the full share link at a valid version',
    Boolean(
      qrState &&
      qrState.version >= 1 &&
      qrState.version <= 40 &&
      qrState.size === 17 + qrState.version * 4 &&
      qrState.byteLength === qrState.linkLength &&
      ['L', 'M'].includes(qrState.ecLevel),
    ),
    qrState ? `v${qrState.version} ${qrState.ecLevel} · ${qrState.byteLength} bytes` : '',
  );
  check('QR matrix carries spec finder and timing patterns', Boolean(qrState?.timingOk && qrState?.findersOk));
  check(
    'QR canvas paints a white quiet zone around dark finder modules',
    Boolean(qrState?.quietZoneWhite && qrState?.finderDark),
  );
  check(
    'QR meta names the version and error correction level',
    Boolean(qrState?.metaText && /QR version \d+/.test(qrState.metaText) && /error correction [LM]/.test(qrState.metaText)),
    qrState?.metaText || '',
  );
  const qrHidden = await page
    .evaluate(() => {
      document.getElementById('hideShareQrBtn')?.click();
      return (
        document.getElementById('shareQrCard')?.hidden === true &&
        !window.__clearsightReportHooks?.getShareQrRaw?.()
      );
    })
    .catch(() => false);
  check('QR share card hides and clears via its Hide control', qrHidden);

  // Vision reel: record a real client-side video cycling every rendered view.
  const reelButtonReady = await page.$eval('#downloadReelBtn', (btn) => !btn.disabled).catch(() => false);
  check('vision reel export button is unlocked', reelButtonReady);
  const reelResult = await page
    .evaluate(async () => {
      const hooks = window.__clearsightReportHooks;
      if (!hooks?.exportVisionReel) return null;
      return hooks.exportVisionReel({ segmentMs: 200, download: false });
    })
    .catch(() => null);
  check(
    'vision reel records a video of all rendered views',
    Boolean(reelResult && reelResult.size > 0 && reelResult.segments === EXPECTED_SIM_CARDS + 1),
    reelResult
      ? `${reelResult.segments} views, ${reelResult.mimeType}, ${reelResult.size} bytes`
      : 'no reel result',
  );
  const manifestHasReel = await page
    .evaluate(() => /vision-reel/i.test(window.__clearsightReportHooks?.buildSubmissionManifestText() || ''))
    .catch(() => false);
  check('submission manifest lists the vision reel artifact', manifestHasReel);

  // Preview modal: open top-impact, verify, close via Escape.
  await page.click('#openTopImpactBtn').catch(() => {});
  const modalOpen = await page
    .waitForFunction(() => {
      const modal = document.getElementById('previewModal');
      return modal && !modal.hidden && modal.getAttribute('aria-hidden') !== 'true';
    }, { timeout: 5000 })
    .then(() => true)
    .catch(() => false);
  check('top-impact preview modal opens', modalOpen);
  if (modalOpen) {
    await page.keyboard.press('Escape');
    const modalClosed = await page
      .waitForFunction(() => {
        const modal = document.getElementById('previewModal');
        return !modal || modal.hidden || modal.getAttribute('aria-hidden') === 'true';
      }, { timeout: 5000 })
      .then(() => true)
      .catch(() => false);
    check('preview modal closes with Escape', modalClosed);
  }

  // Contrast X-ray loupe: hover-probe any spot under all three contrast lenses.
  // Runs after the preview modal is closed so real pointer events reach the canvas.
  const xrayInfo = await page.evaluate(() => {
    const button = document.getElementById('xrayToggleBtn');
    const canvas = document.getElementById('sourceCanvas');
    if (!button || button.disabled || !canvas) {
      return null;
    }
    canvas.scrollIntoView({ block: 'center' });
    button.click();
    const rect = canvas.getBoundingClientRect();
    const region = window.__clearsightReportHooks.buildAccessibilityReport().textScan?.regions?.[0] || null;
    return {
      pressed: button.getAttribute('aria-pressed'),
      rect: { left: rect.left, top: rect.top, width: rect.width, height: rect.height },
      canvasSize: { width: canvas.width, height: canvas.height },
      region: region ? { x: region.x, y: region.y, width: region.width, height: region.height } : null,
    };
  }).catch(() => null);
  check('contrast X-ray toggle activates', Boolean(xrayInfo && xrayInfo.pressed === 'true'));
  if (xrayInfo?.region) {
    const probeX = xrayInfo.region.x + xrayInfo.region.width / 2;
    const probeY = xrayInfo.region.y + xrayInfo.region.height / 2;
    const pageX = xrayInfo.rect.left + (probeX / xrayInfo.canvasSize.width) * xrayInfo.rect.width;
    const pageY = xrayInfo.rect.top + (probeY / xrayInfo.canvasSize.height) * xrayInfo.rect.height;
    await page.mouse.move(pageX, pageY);
    await page
      .waitForFunction(() => {
        const loupe = document.getElementById('xrayLoupe');
        return loupe && !loupe.hidden && /:1/.test(document.getElementById('xrayReadout')?.textContent || '');
      }, { timeout: 5000 })
      .catch(() => {});
    const xrayState = await page.evaluate(() => {
      const sample = window.__clearsightReportHooks.getXraySample();
      return {
        loupeVisible: Boolean(document.getElementById('xrayLoupe') && !document.getElementById('xrayLoupe').hidden),
        readout: document.getElementById('xrayReadout')?.textContent || '',
        sample:
          sample && !sample.flat
            ? {
                ratio: sample.ratio,
                text: sample.text?.hex || '',
                background: sample.background?.hex || '',
                cvdWorst: sample.cvd?.worstRatio,
                apcaLc: sample.apca?.lc,
              }
            : null,
      };
    }).catch(() => null);
    check(
      'X-ray loupe renders a live sample over the worst text finding',
      Boolean(xrayState?.loupeVisible && xrayState.sample && xrayState.sample.ratio > 0 && /:1/.test(xrayState.readout)),
      xrayState?.readout.replace(/\s+/g, ' ').slice(0, 90) || 'missing',
    );
    check(
      'X-ray sample carries CVD and APCA lens data',
      Boolean(xrayState?.sample) &&
        Number.isFinite(xrayState.sample.cvdWorst) &&
        Number.isFinite(xrayState.sample.apcaLc),
    );
    await page.mouse.click(pageX, pageY);
    const xrayApplied = await page.evaluate(() => {
      const sample = window.__clearsightReportHooks.getXraySample();
      return {
        textHex: (document.getElementById('contrastTextHex')?.value || '').toUpperCase(),
        bgHex: (document.getElementById('contrastBgHex')?.value || '').toUpperCase(),
        sampleText: (sample?.text?.hex || '').toUpperCase(),
        sampleBg: (sample?.background?.hex || '').toUpperCase(),
      };
    }).catch(() => null);
    check(
      'X-ray click sends the sampled pair to the contrast checker',
      Boolean(xrayApplied?.textHex) &&
        xrayApplied.textHex === xrayApplied.sampleText &&
        xrayApplied.bgHex === xrayApplied.sampleBg,
      xrayApplied ? `${xrayApplied.textHex} on ${xrayApplied.bgHex}` : 'missing',
    );
    await page.keyboard.press('Escape');
    const xrayOff = await page.evaluate(() => ({
      pressed: document.getElementById('xrayToggleBtn')?.getAttribute('aria-pressed'),
      loupeHidden: document.getElementById('xrayLoupe')?.hidden !== false,
    })).catch(() => null);
    check(
      'Escape exits contrast X-ray and hides the loupe',
      Boolean(xrayOff) && xrayOff.pressed === 'false' && xrayOff.loupeHidden,
    );
  }

  // Accessible recolor preview: repaint the screenshot with WCAG-passing colors.
  // Runs after the preview modal is closed so the overlay cannot swallow the click.
  const recolorOffered = await page
    .$eval('#paletteRecolor', (el) => !el.hidden)
    .catch(() => false);
  check('accessible recolor preview is offered for failing palette', recolorOffered);
  if (recolorOffered) {
    await page.$eval('#recolorPreviewBtn', (button) => button.click()).catch(() => {});
    const recolorRendered = await page
      .waitForFunction(() => {
        const compare = document.getElementById('recolorCompare');
        const after = document.getElementById('recolorAfterCanvas');
        return compare && !compare.hidden && after && after.width > 0 && after.height > 0;
      }, { timeout: 15000 })
      .then(() => true)
      .catch(() => false);
    const recolorStatus = await page
      .$eval('#recolorStatus', (el) => el.textContent.trim())
      .catch(() => '');
    check('accessible recolor renders before/after canvases', recolorRendered, recolorStatus);
    check('recolor status reports fixed pairings', /fixed \d+ of \d+/i.test(recolorStatus), recolorStatus);
    const recolorRevealWorks = await page.evaluate(() => {
      const range = document.getElementById('recolorRevealRange');
      const stage = document.getElementById('recolorWipeStage');
      range.value = '73';
      range.dispatchEvent(new Event('input', { bubbles: true }));
      return stage.style.getPropertyValue('--recolor-reveal') === '73%'
        && range.getAttribute('aria-valuetext') === '73% accessible fix visible';
    }).catch(() => false);
    check('accessible recolor proof slider updates its visual reveal and accessible value', recolorRevealWorks);
    const verifyOffered = await page.$eval('#recolorApplyBtn', (button) => !button.hidden && !button.disabled).catch(() => false);
    check('recolor can be applied for verification', verifyOffered);
    if (verifyOffered) {
      await page.$eval('#recolorApplyBtn', (button) => button.click());
      const proofRendered = await page
        .waitForFunction(() => {
          const proof = document.getElementById('remediationProof');
          return proof && !proof.hidden && /(fix verified|re-audit caught)/i.test(proof.textContent || '');
        }, { timeout: 60000 })
        .then(() => true)
        .catch(() => false);
      const proofText = await page.$eval('#remediationProof', (el) => el.textContent.trim()).catch(() => '');
      check('recolor is re-simulated with before/after proof', proofRendered, proofText);
      const scoreAfterFix = await page
        .evaluate(() => ({
          score: Number(document.getElementById('clearsightScoreCard')?.dataset.score ?? NaN),
          grade: document.getElementById('clearsightScoreCard')?.dataset.grade || '',
        }))
        .catch(() => null);
      check(
        'ClearSight Score re-computes after the applied fix',
        Number.isFinite(scoreAfterFix?.score) && /^[A-F]$/.test(scoreAfterFix?.grade || ''),
        scoreAfterFix ? `${scoreAfterFix.score}/100 (${scoreAfterFix.grade})` : 'missing',
      );
      const scoreProof = await page
        .$eval('#clearsightScoreProof', (el) => ({ hidden: el.hidden, text: el.textContent.trim() }))
        .catch(() => null);
      check(
        'applied fix preserves a verified score before/after proof',
        Boolean(scoreProof && !scoreProof.hidden && /(verified improvement|regression caught|score unchanged)/i.test(scoreProof.text) && /\d+ → \d+/.test(scoreProof.text)),
        scoreProof?.text,
      );
    }
  }

  // Contrast checker: enter a failing pair and confirm live re-check + suggestions.
  await page.evaluate(() => {
    const setValue = (id, value) => {
      const input = document.getElementById(id);
      input.value = value;
      input.dispatchEvent(new Event('input', { bubbles: true }));
    };
    setValue('contrastTextHex', '#777777');
    setValue('contrastBgHex', '#888888');
  });
  const failDetected = await page
    .waitForFunction(() => /fail/i.test(document.getElementById('contrastOut')?.textContent || ''), {
      timeout: 5000,
    })
    .then(() => true)
    .catch(() => false);
  check('live contrast re-check flags failing pair', failDetected);

  await page.click('#suggestBtn').catch(() => {});
  const suggestionCount = await page
    .waitForFunction(() => document.querySelectorAll('#suggestions .palette-card').length > 0, {
      timeout: 5000,
    })
    .then(() => page.$$eval('#suggestions .palette-card', (nodes) => nodes.length))
    .catch(() => 0);
  check('accessible pair suggestions generated', suggestionCount > 0, `${suggestionCount} suggestions`);

  // Hidden CVD failure: pure red on black passes AA (5.25:1) for typical vision
  // but collapses under the projected color-vision matrices.
  await page.evaluate(() => {
    const setValue = (id, value) => {
      const input = document.getElementById(id);
      input.value = value;
      input.dispatchEvent(new Event('input', { bubbles: true }));
    };
    setValue('contrastTextHex', '#ff0000');
    setValue('contrastBgHex', '#000000');
  });
  const hiddenFailureDetected = await page
    .waitForFunction(
      () => document.querySelector('#cvdProjection[data-hidden-failure="true"]') !== null,
      { timeout: 5000 },
    )
    .then(() => true)
    .catch(() => false);
  const cvdProjectionDetail = await page.evaluate(() => ({
    chips: document.querySelectorAll('#cvdProjection .cvd-chip').length,
    failingChips: document.querySelectorAll('#cvdProjection .cvd-chip--fail').length,
    note: document.querySelector('#cvdProjection .cvd-projection-note')?.textContent.trim(),
  })).catch(() => null);
  check(
    'CVD projection flags hidden failure for red-on-black',
    hiddenFailureDetected && /hidden failure/i.test(cvdProjectionDetail?.note || ''),
    cvdProjectionDetail?.note,
  );
  check(
    'CVD projection renders all 7 mode chips with failures marked',
    cvdProjectionDetail?.chips === 7 && (cvdProjectionDetail?.failingChips || 0) > 0,
    `${cvdProjectionDetail?.chips ?? 0} chips, ${cvdProjectionDetail?.failingChips ?? 0} failing`,
  );
  const cvdSafeSuggestion = await page.evaluate(() => {
    const row = document.querySelector('#contrastOut .contrast-suggestion-row');
    return {
      safeBadge: row?.querySelector('.suggestion-tier--cvd-safe')?.textContent.trim() || '',
      pair: row?.textContent.trim() || '',
    };
  }).catch(() => null);
  check(
    'hidden failure receives a replacement verified across all CVD modes',
    /7\/7 modes/i.test(cvdSafeSuggestion?.safeBadge || ''),
    cvdSafeSuggestion?.pair,
  );

  // APCA perceptual false pass: #AAAAAA on #000000 passes WCAG 2 at 9.04:1
  // (AAA) and survives every CVD matrix unchanged (gray is CVD-invariant),
  // yet scores only Lc 56 — below APCA's fluent-text minimum. Only the APCA
  // lens catches it.
  await page.evaluate(() => {
    const setValue = (id, value) => {
      const input = document.getElementById(id);
      input.value = value;
      input.dispatchEvent(new Event('input', { bubbles: true }));
    };
    setValue('contrastTextHex', '#aaaaaa');
    setValue('contrastBgHex', '#000000');
  });
  // Wait for the gray-on-black result specifically (9.04:1) so the readout
  // left over from the previous red-on-black check cannot satisfy the wait.
  const apcaFalsePassDetected = await page
    .waitForFunction(
      () => {
        const readout = document.querySelector('#apcaReadout[data-false-pass="true"]');
        return readout !== null && /9\.04:1/.test(readout.textContent || '');
      },
      { timeout: 5000 },
    )
    .then(() => true)
    .catch(() => false);
  const apcaDetail = await page.evaluate(() => ({
    lc: document.querySelector('#apcaReadout .apca-lc-value')?.textContent.trim(),
    note: document.querySelector('#apcaReadout .cvd-projection-note')?.textContent.trim(),
    wcagPasses: /AA \(4\.5\): PASS/.test(document.getElementById('contrastOut')?.textContent || ''),
    cvdFailingChips: document.querySelectorAll('#cvdProjection .cvd-chip--fail').length,
  })).catch(() => null);
  check(
    'APCA flags perceptual false pass for gray-on-black',
    apcaFalsePassDetected && /false pass/i.test(apcaDetail?.note || ''),
    apcaDetail?.note,
  );
  check(
    'false pass is invisible to WCAG 2 and CVD projection (APCA-only catch)',
    Boolean(apcaDetail?.wcagPasses) && apcaDetail?.cvdFailingChips === 0,
    `WCAG passes: ${apcaDetail?.wcagPasses}, CVD failing chips: ${apcaDetail?.cvdFailingChips}`,
  );
  check(
    'APCA readout displays the Lc score',
    /Lc \d+/.test(apcaDetail?.lc || ''),
    apcaDetail?.lc,
  );

  // Batch audit: score multiple screens headlessly and rank them worst-first.
  await page.click('#batchAuditSampleBtn').catch(() => {});
  const batchRendered = await page
    .waitForFunction(
      () => document.querySelectorAll('#batchAuditList .batch-audit-row').length === 2,
      { timeout: 20000 },
    )
    .then(() => true)
    .catch(() => false);
  const batchState = await page.evaluate(() => {
    const hooks = window.__clearsightReportHooks;
    const batch = hooks?.getBatchAudit?.() || null;
    const csv = hooks?.buildBatchAuditCsvText?.() || '';
    return {
      batch,
      csvLines: csv ? csv.split('\n').length : 0,
      csvHasHeader: /^rank,screen,width,height,clearsight_score,clearsight_grade/.test(csv),
      csvHasSamples: /demo-ui-sample\.png/.test(csv) && /demo-dashboard-sample\.png/.test(csv),
      summary: document.getElementById('batchAuditSummary')?.textContent.trim() || '',
      summaryVisible: !document.getElementById('batchAuditSummary')?.hidden,
      portfolioVisible: !document.getElementById('batchAuditPortfolio')?.hidden,
      portfolioGate: document.getElementById('batchAuditPortfolio')?.dataset.gate || '',
      portfolioText: document.getElementById('batchAuditPortfolio')?.textContent.trim() || '',
      status: document.getElementById('batchAuditStatus')?.textContent.trim() || '',
      openButtons: document.querySelectorAll('#batchAuditList .batch-audit-open').length,
      ringValues: Array.from(document.querySelectorAll('#batchAuditList .batch-audit-ring-inner')).map(
        (node) => node.textContent.trim(),
      ),
      csvButtonEnabled: !document.getElementById('batchAuditCsvBtn')?.disabled,
      pdfButtonEnabled: !document.getElementById('batchAuditPdfBtn')?.disabled,
      pdf: (() => {
        const bytes = hooks?.buildBatchAuditPdfBytes?.();
        if (!bytes) return null;
        const text = new TextDecoder('latin1').decode(bytes);
        return {
          size: bytes.length,
          valid: text.startsWith('%PDF-1.4') && text.includes('%%EOF'),
          hasPortfolio: text.includes('Portfolio debt map') && text.includes('demo-ui-sample.png'),
        };
      })(),
    };
  }).catch(() => null);
  check(
    'batch audit scores both built-in sample screens',
    batchRendered && batchState?.batch?.entries?.length === 2,
    batchState?.status,
  );
  const batchScores = (batchState?.batch?.entries || []).map((entry) => entry.score);
  check(
    'batch entries carry graded scores ranked riskiest-first',
    batchScores.length === 2 &&
      batchScores.every((score) => Number.isFinite(score) && score > 0 && score < 100) &&
      batchScores[0] <= batchScores[1] &&
      batchState.ringValues.join(',') === batchScores.join(','),
    `scores: ${batchScores.join(', ')}`,
  );
  check(
    'batch summary names the riskiest screen with its grade',
    Boolean(batchState?.summaryVisible) && /riskiest: .+Grade [A-F]/.test(batchState?.summary || ''),
    batchState?.summary,
  );
  check(
    'batch debt map exposes portfolio score, weakest axis, and release gate',
    Boolean(
      batchState?.portfolioVisible &&
      Number.isFinite(batchState?.batch?.portfolio?.portfolioScore) &&
      batchState?.batch?.portfolio?.weakestAxis &&
      ['blocked', 'review', 'ready'].includes(batchState?.portfolioGate) &&
      /Portfolio score|Release (?:blocked|ready)|Needs review/.test(batchState?.portfolioText || ''),
    ),
    batchState?.portfolioText,
  );
  check(
    'batch rows expose per-screen axis findings and open actions',
    batchState?.openButtons === 2 &&
      (batchState?.batch?.entries || []).some((entry) => entry.belowAA > 0 || entry.collisions > 0),
    JSON.stringify(batchState?.batch?.entries || []),
  );
  check(
    'batch CSV export is ready with one row per screen',
    Boolean(batchState?.csvButtonEnabled && batchState.csvHasHeader && batchState.csvHasSamples) &&
      batchState.csvLines === 3,
    `${batchState?.csvLines ?? 0} lines`,
  );
  check(
    'batch portfolio PDF is ready and contains ranked screen evidence',
    Boolean(
      batchState?.pdfButtonEnabled &&
      batchState.pdf?.valid &&
      batchState.pdf?.hasPortfolio &&
      batchState.pdf.size > 5000
    ),
    `${batchState?.pdf?.size ?? 0} bytes`,
  );
  const regressionState = await page.evaluate(() => {
    const hooks = window.__clearsightReportHooks;
    const current = hooks?.getBatchAudit?.()?.entries || [];
    if (current.length < 2) return null;
    const comparison = hooks.compareBatchBaseline({
      screens: [
        { name: current[0].name, score: { score: current[0].score + 5 } },
        { name: current[1].name, score: { score: current[1].score - 4 } },
      ],
    });
    return {
      comparison,
      summary: document.getElementById('batchRegressionSummary')?.textContent.trim() || '',
      gate: document.getElementById('batchRegressionSummary')?.dataset.gate || '',
      deltas: Array.from(document.querySelectorAll('#batchAuditList .batch-delta')).map((node) => ({
        text: node.textContent.trim(),
        status: node.dataset.status || '',
      })),
    };
  }).catch(() => null);
  check(
    'browser baseline comparison catches regressions and improvements by filename',
    Boolean(
      regressionState?.comparison?.pass === false &&
      regressionState?.comparison?.counts?.regressed === 1 &&
      regressionState?.comparison?.counts?.improved === 1 &&
      regressionState?.gate === 'failed' &&
      /Regression gate failed/.test(regressionState?.summary || '') &&
      regressionState?.deltas?.some((item) => item.status === 'regressed') &&
      regressionState?.deltas?.some((item) => item.status === 'improved')
    ),
    JSON.stringify(regressionState),
  );

  // Live capture: stub getDisplayMedia with an animated canvas stream and drive
  // the real capture button through frame-grab -> PNG -> full audit pipeline.
  check(
    'live capture button is present',
    Boolean(await page.$('#captureScreenBtn')),
  );
  const captureStreamSupported = await page.evaluate(
    () => typeof document.createElement('canvas').captureStream === 'function',
  );
  if (captureStreamSupported) {
    await page.evaluate(() => {
      const fakeScreen = document.createElement('canvas');
      fakeScreen.width = 640;
      fakeScreen.height = 360;
      const ctx = fakeScreen.getContext('2d');
      const paint = () => {
        ctx.fillStyle = '#f4f6fb';
        ctx.fillRect(0, 0, 640, 360);
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(48, 40, 260, 34);
        ctx.fillStyle = '#8a93a6';
        ctx.fillRect(48, 100, 380, 18);
        ctx.fillStyle = '#0284c7';
        ctx.fillRect(48, 150, 140, 44);
        ctx.fillStyle = '#0f766e';
        ctx.fillRect(210, 150, 140, 44);
      };
      paint();
      window.__fakeCaptureTimer = setInterval(paint, 100);
      if (!navigator.mediaDevices) {
        Object.defineProperty(navigator, 'mediaDevices', { value: {}, configurable: true });
      }
      navigator.mediaDevices.getDisplayMedia = async () => fakeScreen.captureStream(10);
      const btn = document.getElementById('captureScreenBtn');
      if (btn) {
        btn.disabled = false;
      }
    });
    await page.click('#captureScreenBtn');
    const captureLoaded = await page
      .waitForFunction(
        () => {
          const meta = window.__clearsightReportHooks?.getSourceMeta?.();
          return Boolean(meta?.name?.startsWith('live-capture-'));
        },
        { timeout: 15000 },
      )
      .then(() => true)
      .catch(() => false);
    check('live capture loads the shared frame as the audit source', captureLoaded);
    const captureRendered = await page
      .waitForFunction(
        (expected) => document.querySelectorAll('#simGrid .sim-card.is-done').length >= expected,
        { timeout: 60000 },
        EXPECTED_SIM_CARDS,
      )
      .then(() => true)
      .catch(() => false);
    const captureMeta = await page.evaluate(() => {
      clearInterval(window.__fakeCaptureTimer);
      return {
        meta: window.__clearsightReportHooks?.getSourceMeta?.() || null,
        buttonEnabled: !document.getElementById('captureScreenBtn')?.disabled,
        message: document.getElementById('message')?.textContent.trim() || '',
      };
    });
    check(
      `captured frame renders all ${EXPECTED_SIM_CARDS} simulations at true capture size`,
      captureRendered && captureMeta?.meta?.width === 640 && captureMeta?.meta?.height === 360,
      JSON.stringify(captureMeta?.meta || {}),
    );
    check(
      'capture button is re-enabled after the audit',
      Boolean(captureMeta?.buttonEnabled),
      captureMeta?.message,
    );

    // Walkthrough recording: cycle the fake shared surface through three
    // distinct app scenes and verify each one is kept exactly once, repeats
    // are skipped, and stopping runs the full batch audit over the keyframes.
    await page.evaluate(() => {
      const fakeScreen = document.createElement('canvas');
      fakeScreen.width = 640;
      fakeScreen.height = 360;
      const ctx = fakeScreen.getContext('2d');
      const scenes = [
        () => {
          ctx.fillStyle = '#f4f6fb';
          ctx.fillRect(0, 0, 640, 360);
          ctx.fillStyle = '#0f172a';
          ctx.font = '700 28px sans-serif';
          ctx.fillText('Team dashboard', 48, 70);
          ctx.fillStyle = '#8a93a6';
          ctx.font = '16px sans-serif';
          ctx.fillText('Weekly retention is trending upward across cohorts.', 48, 120);
          ctx.fillStyle = '#0284c7';
          ctx.fillRect(48, 160, 150, 44);
          ctx.fillStyle = '#ffffff';
          ctx.fillText('View report', 70, 188);
        },
        () => {
          ctx.fillStyle = '#0f172a';
          ctx.fillRect(0, 0, 640, 360);
          ctx.fillStyle = '#f8fafc';
          ctx.font = '700 28px sans-serif';
          ctx.fillText('Billing settings', 48, 70);
          ctx.fillStyle = '#64748b';
          ctx.font = '16px sans-serif';
          ctx.fillText('Your plan renews automatically on the 1st.', 48, 120);
          ctx.fillStyle = '#38bdf8';
          ctx.fillRect(48, 160, 190, 44);
          ctx.fillStyle = '#0f172a';
          ctx.fillText('Update payment', 66, 188);
        },
        () => {
          ctx.fillStyle = '#7c2d12';
          ctx.fillRect(0, 0, 640, 360);
          ctx.fillStyle = '#fde68a';
          ctx.font = '700 28px sans-serif';
          ctx.fillText('Welcome aboard', 48, 70);
          ctx.fillStyle = '#fdba74';
          ctx.font = '16px sans-serif';
          ctx.fillText('Three quick steps and your workspace is ready.', 48, 120);
          ctx.fillStyle = '#fff7ed';
          ctx.fillRect(48, 160, 170, 44);
          ctx.fillStyle = '#7c2d12';
          ctx.fillText('Get started', 76, 188);
        },
      ];
      let sceneIndex = 0;
      const paint = () => scenes[sceneIndex % scenes.length]();
      paint();
      window.__walkthroughPaintTimer = setInterval(paint, 250);
      window.__walkthroughSceneTimer = setInterval(() => {
        sceneIndex += 1;
      }, 1500);
      navigator.mediaDevices.getDisplayMedia = async () => fakeScreen.captureStream(10);
    });
    await page.click('#recordWalkthroughBtn');
    const walkthroughStarted = await page
      .waitForFunction(
        () => window.__clearsightReportHooks?.getWalkthroughState?.().recording === true,
        { timeout: 10000 },
      )
      .then(() => true)
      .catch(() => false);
    check('walkthrough recording starts from the batch panel button', walkthroughStarted);
    const walkthroughCaptured = await page
      .waitForFunction(
        () => window.__clearsightReportHooks?.getWalkthroughState?.().kept >= 3,
        { timeout: 30000 },
      )
      .then(() => true)
      .catch(() => false);
    // Repeat-frame dedupe needs a stable re-sample of an already-kept scene;
    // under load the third keyframe can land before any duplicate was sampled,
    // so let the still-cycling fake stream produce one before asserting.
    const walkthroughDeduped = await page
      .waitForFunction(
        () => (window.__clearsightReportHooks?.getWalkthroughState?.().duplicates ?? 0) > 0,
        { timeout: 15000 },
      )
      .then(() => true)
      .catch(() => false);
    const walkthroughState = await page.evaluate(() => {
      clearInterval(window.__walkthroughPaintTimer);
      clearInterval(window.__walkthroughSceneTimer);
      return {
        state: window.__clearsightReportHooks?.getWalkthroughState?.() || null,
        buttonText: document.getElementById('recordWalkthroughBtn')?.textContent || '',
      };
    });
    check(
      'walkthrough keeps one keyframe per distinct scene and skips repeat frames',
      walkthroughCaptured &&
        walkthroughDeduped &&
        /Stop & audit/.test(walkthroughState.buttonText),
      JSON.stringify(walkthroughState),
    );
    await page.click('#recordWalkthroughBtn');
    const walkthroughAudited = await page
      .waitForFunction(
        () => {
          const batch = window.__clearsightReportHooks?.getBatchAudit?.();
          return Boolean(
            batch?.entries?.length >= 3 &&
              batch.entries.every((entry) => entry.name.startsWith('walkthrough-screen-')),
          );
        },
        { timeout: 30000 },
      )
      .then(() => true)
      .catch(() => false);
    const walkthroughBatch = await page.evaluate(() => {
      const batch = window.__clearsightReportHooks?.getBatchAudit?.() || null;
      return {
        entries: (batch?.entries || []).map((entry) => ({ name: entry.name, score: entry.score })),
        rows: document.querySelectorAll('#batchAuditList .batch-audit-row').length,
        portfolioVisible: !document.getElementById('batchAuditPortfolio')?.hidden,
        status: document.getElementById('batchAuditStatus')?.textContent.trim() || '',
        recording: window.__clearsightReportHooks?.getWalkthroughState?.().recording,
        flashScan: window.__clearsightReportHooks?.buildAccessibilityReport?.().flashScan || null,
      };
    });
    check(
      'stopping the walkthrough batch-audits every captured screen',
      walkthroughAudited &&
        walkthroughBatch.rows >= 3 &&
        walkthroughBatch.portfolioVisible &&
        walkthroughBatch.recording === false &&
        walkthroughBatch.entries.every((entry) => Number.isFinite(entry.score)) &&
        walkthroughBatch.flashScan?.label === 'Live app walkthrough' &&
        walkthroughBatch.flashScan?.frameCount >= 2,
      JSON.stringify(walkthroughBatch),
    );
  } else {
    console.log('smoke: canvas.captureStream unavailable, skipping live-capture pipeline checks');
  }

  await page.$eval('.flash-scan-card', (details) => { details.open = true; });
  await page.click('#flashScanDemoBtn');
  const flashVerdictShown = await page
    .waitForFunction(
      () => {
        const result = document.getElementById('flashScanResult');
        const verdict = document.getElementById('flashScanVerdict');
        return result && !result.hidden && verdict?.dataset.risk === 'high';
      },
      { timeout: 15000 },
    )
    .then(() => true)
    .catch(() => false);
  check('flash scan demo flags the flashing banner as high risk', flashVerdictShown);
  const flashState = await page.evaluate(() => {
    const timeline = document.getElementById('flashScanTimeline');
    const context = timeline?.getContext('2d');
    let timelinePainted = false;
    if (context) {
      const pixels = context.getImageData(0, 0, timeline.width, timeline.height).data;
      for (let index = 0; index < pixels.length; index += 4) {
        if (pixels[index + 3] > 0) {
          timelinePainted = true;
          break;
        }
      }
    }
    const hooks = window.__clearsightReportHooks;
    const reportFlash = hooks?.buildAccessibilityReport?.().flashScan || null;
    const summary = hooks?.buildJudgeSummaryMarkdown?.() || '';
    return {
      statTiles: document.querySelectorAll('#flashScanStats div').length,
      timelinePainted,
      hookFlash: hooks?.getFlashScan?.() || null,
      reportRisk: reportFlash?.riskLevel || null,
      reportPeak: reportFlash?.peakFlashesPerSecond || 0,
      reportGeneralPeak: reportFlash?.peakGeneralFlashesPerSecond ?? -1,
      reportRedPeak: reportFlash?.peakRedFlashesPerSecond || 0,
      summaryHasFlashLine: /Animation flash scan \(WCAG 2\.3\.1\).*flashes\/sec/.test(summary),
    };
  });
  check(
    'flash scan renders stats and a painted luminance timeline',
    flashState.statTiles >= 4 && flashState.timelinePainted,
    `${flashState.statTiles} tiles`,
  );
  check(
    'flash scan findings reach report JSON and judge summary',
    flashState.reportRisk === 'high' && flashState.reportPeak > 3 &&
      flashState.reportGeneralPeak === 0 && flashState.reportRedPeak > 3 && flashState.summaryHasFlashLine,
    JSON.stringify(flashState.hookFlash || {}),
  );

  await page.$eval('.focus-check-card', (details) => { details.open = true; });
  await page.click('#focusDemoWeakBtn');
  const weakFocusShown = await page
    .waitForFunction(
      () => {
        const result = document.getElementById('focusCheckResult');
        const verdict = document.getElementById('focusCheckVerdict');
        return result && !result.hidden && verdict?.dataset.verdict === 'weak';
      },
      { timeout: 15000 },
    )
    .then(() => true)
    .catch(() => false);
  check('focus demo diff flags the faint 2px ring as below the 2.4.13 bar', weakFocusShown);
  const weakFocusState = await page.evaluate(() => {
    const hooks = window.__clearsightReportHooks;
    const focus = hooks?.getFocusCheck?.() || null;
    const report = hooks?.buildAccessibilityReport?.() || {};
    const summary = hooks?.buildJudgeSummaryMarkdown?.() || '';
    const conformance = hooks?.buildConformanceSummaryText?.() || '';
    return {
      focus,
      statTiles: document.querySelectorAll('#focusCheckStats div').length,
      status: document.getElementById('focusCheckStatus')?.textContent || '',
      reportVerdict: report.focusCheck?.verdict || null,
      remediationHasFocusAction: JSON.stringify(report).includes('higher-contrast focus color'),
      summaryHasFocusLine: /Focus appearance \(WCAG 2\.4\.7\/2\.4\.13\).*BELOW the 2\.4\.13 bar/.test(summary),
      conformancePartial: /\| 2\.4\.7 Focus Visible \| AA \| Partially Supports \|/.test(conformance),
      conformanceAppearanceFails: /\| 2\.4\.13 Focus Appearance \| AAA \| Does Not Support \|/.test(conformance),
      manualListHas247: /- 2\.4\.7 Focus Visible \(Level AA\)/.test(conformance),
    };
  });
  check(
    'weak focus indicator is measured honestly (visible, zero pixels at 3:1 change contrast)',
    weakFocusState.focus?.verdict === 'weak' &&
      weakFocusState.focus?.focusVisibleOutcome === 'partial' &&
      weakFocusState.focus?.changedPixels > 1000 &&
      weakFocusState.focus?.contrastingPixels === 0 &&
      weakFocusState.statTiles === 5 &&
      /changed px, 0 at ≥3:1/.test(weakFocusState.status),
    JSON.stringify({ verdict: weakFocusState.focus?.verdict, changed: weakFocusState.focus?.changedPixels }),
  );
  check(
    'weak focus pair reaches report JSON, judge summary, remediation, and conformance rows',
    weakFocusState.reportVerdict === 'weak' &&
      weakFocusState.remediationHasFocusAction &&
      weakFocusState.summaryHasFocusLine &&
      weakFocusState.conformancePartial &&
      weakFocusState.conformanceAppearanceFails &&
      !weakFocusState.manualListHas247,
    JSON.stringify({
      report: weakFocusState.reportVerdict,
      remediation: weakFocusState.remediationHasFocusAction,
      summary: weakFocusState.summaryHasFocusLine,
      conformance: weakFocusState.conformancePartial,
    }),
  );

  await page.click('#focusDemoStrongBtn');
  const strongFocusShown = await page
    .waitForFunction(
      () => document.getElementById('focusCheckVerdict')?.dataset.verdict === 'strong',
      { timeout: 15000 },
    )
    .then(() => true)
    .catch(() => false);
  check('focus demo diff passes the bold 6px ring against the 2.4.13 metrics', strongFocusShown);
  const strongFocusState = await page.evaluate(() => {
    const hooks = window.__clearsightReportHooks;
    const focus = hooks?.getFocusCheck?.() || null;
    const conformance = hooks?.buildConformanceSummaryText?.() || '';
    const overlay = document.getElementById('focusCheckOverlay');
    const context = overlay?.getContext('2d');
    let magentaPixels = 0;
    if (context && overlay.width) {
      const pixels = context.getImageData(0, 0, overlay.width, overlay.height).data;
      for (let index = 0; index < pixels.length; index += 4) {
        if (pixels[index] === 217 && pixels[index + 1] === 70 && pixels[index + 2] === 239) {
          magentaPixels += 1;
        }
      }
    }
    return {
      focus,
      magentaPixels,
      overlaySize: `${overlay?.width || 0}x${overlay?.height || 0}`,
      conformanceSupports:
        /\| 2\.4\.7 Focus Visible \| AA \| Supports \|/.test(conformance) &&
        /\| 2\.4\.13 Focus Appearance \| AAA \| Supports \|/.test(conformance),
    };
  });
  check(
    'strong focus ring meets the measured 2.4.13 area + change-contrast minimums',
    strongFocusState.focus?.verdict === 'strong' &&
      strongFocusState.focus?.focusVisibleOutcome === 'supports' &&
      strongFocusState.focus?.contrastingPixels > 0 &&
      strongFocusState.focus?.contrastingAreaCss >= strongFocusState.focus?.requiredIndicatorArea &&
      strongFocusState.focus?.maxChangeRatio >= 3 &&
      strongFocusState.conformanceSupports,
    JSON.stringify({
      verdict: strongFocusState.focus?.verdict,
      area: strongFocusState.focus?.contrastingAreaCss,
      required: strongFocusState.focus?.requiredIndicatorArea,
      ratio: strongFocusState.focus?.maxChangeRatio,
    }),
  );
  check(
    'focus overlay paints the contrasting indicator pixels in solid magenta on the focused frame',
    strongFocusState.magentaPixels > 1000 && strongFocusState.overlaySize === '1280x720',
    `${strongFocusState.magentaPixels} magenta px on ${strongFocusState.overlaySize}`,
  );

  await page.click('#focusSequenceDemoBtn');
  const focusSequenceShown = await page
    .waitForFunction(
      () => {
        const result = document.getElementById('focusSequenceResult');
        const verdict = document.getElementById('focusSequenceVerdict');
        return result && !result.hidden && verdict?.dataset.verdict === 'weak';
      },
      { timeout: 20000 },
    )
    .then(() => true)
    .catch(() => false);
  check('focus order demo maps the 7-frame tab-through and lands on a weak aggregate verdict', focusSequenceShown);
  const focusSequenceState = await page.evaluate(() => {
    const hooks = window.__clearsightReportHooks;
    const sequence = hooks?.getFocusSequence?.() || null;
    const report = hooks?.buildAccessibilityReport?.() || {};
    const summary = hooks?.buildJudgeSummaryMarkdown?.() || '';
    const conformance = hooks?.buildConformanceSummaryText?.() || '';
    const overlay = document.getElementById('focusSequenceOverlay');
    const context = overlay?.getContext('2d');
    let strongBadgePixels = 0;
    let weakBadgePixels = 0;
    if (context && overlay.width) {
      const pixels = context.getImageData(0, 0, overlay.width, overlay.height).data;
      for (let index = 0; index < pixels.length; index += 4) {
        if (pixels[index] === 21 && pixels[index + 1] === 128 && pixels[index + 2] === 61) {
          strongBadgePixels += 1;
        } else if (pixels[index] === 180 && pixels[index + 1] === 83 && pixels[index + 2] === 9) {
          weakBadgePixels += 1;
        }
      }
    }
    return {
      sequence,
      statTiles: document.querySelectorAll('#focusSequenceStats div').length,
      stopItems: Array.from(document.querySelectorAll('#focusSequenceStops li')).map(
        (item) => item.dataset.verdict,
      ),
      status: document.getElementById('focusSequenceStatus')?.textContent || '',
      overlaySize: `${overlay?.width || 0}x${overlay?.height || 0}`,
      overlayPngBytes: overlay?.toDataURL('image/png').length || 0,
      strongBadgePixels,
      weakBadgePixels,
      downloadEnabled: !document.getElementById('downloadFocusSequenceBtn')?.disabled,
      manifestHasFocusMap: /-focus-order-map\.png \| WCAG 2\.4\.7 \/ 2\.4\.13 focus-order evidence/.test(
        hooks?.buildSubmissionManifestText?.() || '',
      ),
      reportAggregate: report.focusSequence?.aggregateVerdict || null,
      reportStops: report.focusSequence?.summary?.stops ?? null,
      remediationHasSequenceAction: JSON.stringify(report).includes(
        'focus stops mapped from the tab-through recording',
      ),
      summaryHasOrderLine: /Focus order map \(WCAG 2\.4\.7\/2\.4\.13\).*3 focus stops mapped.*1 BELOW it/.test(summary),
      conformancePartial: /\| 2\.4\.7 Focus Visible \| AA \| Partially Supports \|/.test(conformance),
      conformanceSequenceEvidence: /focus stops mapped across the tab-through recording/.test(conformance),
      manualListHas247: /- 2\.4\.7 Focus Visible \(Level AA\)/.test(conformance),
    };
  });
  check(
    'focus sequence dedupes duplicates, counts the revisit, and grades every stop honestly',
    focusSequenceState.sequence?.summary?.framesAnalyzed === 6 &&
      focusSequenceState.sequence?.summary?.stops === 3 &&
      focusSequenceState.sequence?.summary?.strong === 2 &&
      focusSequenceState.sequence?.summary?.weak === 1 &&
      focusSequenceState.sequence?.summary?.duplicateFrames === 1 &&
      focusSequenceState.sequence?.summary?.revisitFrames === 1 &&
      focusSequenceState.sequence?.summary?.noIndicatorFrames === 1 &&
      focusSequenceState.sequence?.worstStopOrder === 2 &&
      focusSequenceState.sequence?.stops?.[1]?.verdict === 'weak' &&
      focusSequenceState.sequence?.stops?.[1]?.contrastingPixels === 0,
    JSON.stringify(focusSequenceState.sequence?.summary || {}),
  );
  check(
    'focus sequence panel renders stats, ordered stop list, and status with the mapped counts',
    focusSequenceState.statTiles === 5 &&
      focusSequenceState.stopItems.length === 3 &&
      focusSequenceState.stopItems[0] === 'strong' &&
      focusSequenceState.stopItems[1] === 'weak' &&
      focusSequenceState.stopItems[2] === 'strong' &&
      /6 frames → 3 stops \(2 strong · 1 weak\)/.test(focusSequenceState.status),
    JSON.stringify({ tiles: focusSequenceState.statTiles, items: focusSequenceState.stopItems, status: focusSequenceState.status }),
  );
  check(
    'focus order overlay paints numbered verdict badges and stop outlines on the baseline',
    focusSequenceState.overlaySize === '1280x720' &&
      focusSequenceState.strongBadgePixels > 1500 &&
      focusSequenceState.weakBadgePixels > 800,
    `${focusSequenceState.strongBadgePixels} strong / ${focusSequenceState.weakBadgePixels} weak badge px on ${focusSequenceState.overlaySize}`,
  );
  check(
    'focus order map is a downloadable PNG and is bundled in the submission manifest',
    focusSequenceState.downloadEnabled &&
      focusSequenceState.overlayPngBytes > 10000 &&
      focusSequenceState.manifestHasFocusMap,
    JSON.stringify({
      downloadEnabled: focusSequenceState.downloadEnabled,
      pngBytes: focusSequenceState.overlayPngBytes,
      manifest: focusSequenceState.manifestHasFocusMap,
    }),
  );
  check(
    'focus sequence reaches report JSON, judge summary, and remediation',
    focusSequenceState.reportAggregate === 'weak' &&
      focusSequenceState.reportStops === 3 &&
      focusSequenceState.remediationHasSequenceAction &&
      focusSequenceState.summaryHasOrderLine,
    JSON.stringify({
      aggregate: focusSequenceState.reportAggregate,
      stops: focusSequenceState.reportStops,
      remediation: focusSequenceState.remediationHasSequenceAction,
      summary: focusSequenceState.summaryHasOrderLine,
    }),
  );
  check(
    'weak sequence overrides the strong pair check in conformance rows (worst verdict wins)',
    focusSequenceState.conformancePartial &&
      focusSequenceState.conformanceSequenceEvidence &&
      !focusSequenceState.manualListHas247,
    JSON.stringify({
      partial: focusSequenceState.conformancePartial,
      evidence: focusSequenceState.conformanceSequenceEvidence,
      manual: focusSequenceState.manualListHas247,
    }),
  );

  const videoScanSupported = await page.evaluate(
    () =>
      typeof MediaRecorder === 'function' &&
      typeof document.createElement('canvas').captureStream === 'function',
  );
  if (videoScanSupported) {
    const videoScan = await page.evaluate(async () => {
      const canvas = document.createElement('canvas');
      canvas.width = 320;
      canvas.height = 180;
      const context = canvas.getContext('2d');
      const stream = canvas.captureStream(30);
      const [videoTrack] = stream.getVideoTracks();
      const recorder = new MediaRecorder(stream, { mimeType: 'video/webm' });
      const chunks = [];
      recorder.ondataavailable = (event) => {
        if (event.data.size) chunks.push(event.data);
      };
      const stopped = new Promise((resolve) => {
        recorder.onstop = resolve;
      });
      recorder.start(100);
      const start = performance.now();
      await new Promise((resolve) => {
        // Headless clamps setTimeout/rAF to ~200ms, which aliases against the
        // strobe period — a MessageChannel task loop is not throttled, so state
        // flips land on time, and requestFrame() pushes each one to the encoder.
        const channel = new MessageChannel();
        let lastBright = -1;
        channel.port1.onmessage = () => {
          const elapsed = performance.now() - start;
          // Toggling every 105ms (~4.8 flashes/sec) stays detectable at the
          // scanner's 10 fps sampling rate without phase-locking to it.
          const bright = Math.floor(elapsed / 105) % 2 === 0 ? 1 : 0;
          if (bright !== lastBright) {
            lastBright = bright;
            context.fillStyle = bright ? '#ffffff' : '#000000';
            context.fillRect(0, 0, canvas.width, canvas.height);
            if (typeof videoTrack.requestFrame === 'function') {
              videoTrack.requestFrame();
            }
          }
          if (elapsed >= 2400) {
            resolve();
            return;
          }
          channel.port2.postMessage(0);
        };
        channel.port2.postMessage(0);
      });
      recorder.stop();
      await stopped;
      stream.getTracks().forEach((track) => track.stop());
      const blob = new Blob(chunks, { type: 'video/webm' });
      const file = new File([blob], 'strobe-recording.webm', { type: 'video/webm' });
      const scan = await window.__clearsightReportHooks.scanFlashFile(file);
      const verdict = document.getElementById('flashScanVerdict');
      const status = document.getElementById('flashScanStatus');
      return {
        blobBytes: blob.size,
        scan,
        verdictRisk: verdict?.dataset.risk || null,
        verdictText: verdict?.textContent || '',
        statusText: status?.textContent || '',
      };
    });
    check(
      'video flash scan decodes a recorded WebM and flags full-frame strobing as high risk',
      videoScan.blobBytes > 0 &&
        videoScan.scan?.riskLevel === 'high' &&
        videoScan.verdictRisk === 'high' &&
        videoScan.verdictText.includes('strobe-recording.webm'),
      JSON.stringify({ bytes: videoScan.blobBytes, scan: videoScan.scan, status: videoScan.statusText }),
    );
    check(
      'video flash scan samples enough frames and exceeds the flash-rate limit',
      (videoScan.scan?.frameCount || 0) >= 12 && (videoScan.scan?.peakFlashesPerSecond || 0) > 3,
      `frames: ${videoScan.scan?.frameCount}, peak: ${videoScan.scan?.peakFlashesPerSecond}/sec`,
    );
  } else {
    console.log('smoke: MediaRecorder unavailable, skipping video flash-scan checks');
  }

  const benignProblem = (text) => /favicon\.ico/.test(text);
  const realProblems = pageProblems.filter((text) => !benignProblem(text));
  check('no console/page errors', realProblems.length === 0, realProblems.slice(0, 5).join(' | '));
} finally {
  await browser.close();
  server.close();
}

if (failures.length > 0) {
  console.error(`\nsmoke: FAILED (${failures.length}): \n - ${failures.join('\n - ')}`);
  process.exit(1);
}
console.log('\nsmoke: all checks passed');
