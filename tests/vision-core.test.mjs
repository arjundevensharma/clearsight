import { strict as assert } from 'node:assert';
import test from 'node:test';
import {
  parseHexColor,
  rgbToHex,
  contrastRatio,
  relativeLuminance,
  formatBytes,
  calculateImpactPercent,
  createVisualDifferenceHeatmap,
  getDemoScriptText,
  getSubmissionChecklistText,
  suggestAccessiblePairs,
  evaluateContrast,
  transformImageDataWithMatrix,
  extractDominantColors,
  buildPaletteContrastMatrix,
  buildAccessibleRecolorPlan,
  applyPaletteRemapToImageData,
  detectTextLikeRegions,
  scanComponentSurfaceContrast,
  COMPONENT_CONTRAST_DEFAULTS,
  scanTargetSizes,
  TARGET_SIZE_DEFAULTS,
  planComponentSurfaceRepair,
  applyComponentSurfaceContrastFix,
  COMPONENT_SURFACE_FIX_DEFAULTS,
  sampleRegionContrast,
  applyTextRegionContrastFix,
  orderVisionReelSegments,
  applyFieldLossMask,
  projectContrastAcrossCvdModes,
  rankSuggestionsByCvdSafety,
  apcaContrast,
  evaluateApcaContrast,
  compareWcagVsApca,
  findCvdColorCollisions,
  labDeltaE,
  computeAccessibilityScore,
  auditImageAccessibility,
  buildBatchAuditCsv,
  summarizeBatchAudit,
  compareBatchAuditToBaseline,
  analyzeFlashRisk,
  planVideoFrameSampling,
  computeFrameSignature,
  frameSignatureDistance,
  evaluateWalkthroughFrame,
  selectWalkthroughKeyframes,
  WALKTHROUGH_KEYFRAME_DEFAULTS,
  buildPdfReport,
  buildAuditPdfDoc,
  buildPortfolioPdfDoc,
  PDF_GRADE_COLORS,
  CVD_MODES,
  buildShareableAuditPayload,
  parseShareableAuditPayload,
  SHAREABLE_AUDIT_VERSION,
  SHAREABLE_AUDIT_LIMITS,
  buildCssFixSheet,
  CSS_FIX_SHEET_DEFAULTS,
  buildWcagConformanceSummary,
  buildConformanceStatementMarkdown,
  analyzeFocusIndicator,
  FOCUS_APPEARANCE_LABELS,
  analyzeFocusSequence,
  createFocusSequenceTracker,
  trackFocusSequenceFrame,
  summarizeFocusSequence,
  FOCUS_SEQUENCE_DEFAULTS,
  FOCUS_SEQUENCE_LABELS,
  CONFORMANCE_OUTCOME_LABELS,
  CONFORMANCE_MANUAL_CRITERIA,
  encodeQrMatrix,
  qrReedSolomonEncode,
  qrFormatInfoBits,
  qrVersionInfoBits,
  qrBlockStructure,
  QR_ENCODE_DEFAULTS,
} from '../docs/js/vision-core.js';

test('buildPortfolioPdfDoc renders browser batch results with baseline deltas', () => {
  const entries = [
    {
      name: 'checkout.png',
      audit: {
        score: { score: 52, grade: 'F' },
        textScan: { summary: { belowAA: 3, cvdHiddenFailures: 1, apcaFalsePasses: 2 } },
        palette: { collisions: { summary: { collisions: 1 } } },
      },
    },
    {
      name: 'home.png',
      audit: {
        score: { score: 90, grade: 'A' },
        textScan: { summary: {} },
        palette: { collisions: { summary: {} } },
      },
    },
  ];
  const portfolio = summarizeBatchAudit(entries);
  const doc = buildPortfolioPdfDoc({
    entries,
    portfolio,
    baselineComparison: {
      pass: false,
      failures: [{ name: 'checkout.png' }],
      comparisons: [
        { name: 'checkout.png', status: 'regressed', delta: -7 },
        { name: 'home.png', status: 'improved', delta: 4 },
      ],
    },
    skipped: ['broken.png could not be decoded'],
    generatedAt: '2026-07-23 12:00 UTC',
  });
  const pdf = Buffer.from(buildPdfReport(doc)).toString('latin1');

  assert.equal(doc.score.value, portfolio.portfolioScore);
  assert.match(pdf, /^%PDF-1\.4/);
  assert.match(pdf, /Portfolio debt map/);
  assert.match(pdf, /checkout\.png/);
  assert.match(pdf, /Baseline regression gate/);
  assert.match(pdf, /Skipped 1 screen/);
  assert.throws(() => buildPortfolioPdfDoc({ entries: [], portfolio }), /audited entries/i);
});

test('compareBatchAuditToBaseline exposes improvements, regressions, and new screens', () => {
  const entries = [
    { name: 'home.png', audit: { score: { score: 84 } } },
    { name: 'checkout.png', audit: { score: { score: 61 } } },
    { name: 'new-route.png', audit: { score: { score: 90 } } },
  ];
  const baseline = {
    screens: [
      { name: 'home.png', score: { score: 79 } },
      { name: 'checkout.png', score: { score: 70 } },
    ],
  };
  const comparison = compareBatchAuditToBaseline(entries, baseline);
  assert.equal(comparison.pass, false);
  assert.equal(comparison.matched, 2);
  assert.deepEqual(comparison.counts, { improved: 1, regressed: 1, new: 1 });
  assert.equal(comparison.failures[0].delta, -9);
  assert.equal(compareBatchAuditToBaseline(entries, baseline, 10).pass, true);
  assert.throws(() => compareBatchAuditToBaseline(entries, {}, 0), /screens array/i);
});

test('summarizeBatchAudit exposes portfolio debt, weakest axis, and blocked release gate', () => {
  const entries = [
    {
      name: 'checkout.png',
      audit: {
        score: { score: 52, grade: 'F', axes: [{ id: 'text', label: 'Text contrast', score: 40 }] },
        textScan: { summary: { belowAA: 2, cvdHiddenFailures: 1, apcaFalsePasses: 0 } },
        palette: { collisions: { summary: { collisions: 1 } } },
      },
    },
    {
      name: 'home.png',
      audit: {
        score: { score: 92, grade: 'A', axes: [{ id: 'text', label: 'Text contrast', score: 80 }] },
        textScan: { summary: { belowAA: 0, cvdHiddenFailures: 0, apcaFalsePasses: 1 } },
        palette: { collisions: { summary: { collisions: 0 } } },
      },
    },
  ];
  const summary = summarizeBatchAudit(entries);
  assert.equal(summary.averageScore, 72);
  assert.equal(summary.portfolioScore, 67);
  assert.equal(summary.lowestScreen, 'checkout.png');
  assert.deepEqual(summary.gradeCounts, { F: 1, A: 1 });
  assert.deepEqual(summary.totals, { belowAA: 2, cvdHiddenFailures: 1, apcaFalsePasses: 1, collisions: 1, componentFailures: 0, undersizedTargets: 0 });
  assert.deepEqual(summary.weakestAxis, { id: 'text', label: 'Text contrast', score: 60 });
  assert.equal(summary.releaseGate.status, 'blocked');
});

test('summarizeBatchAudit handles clean and unscored portfolios', () => {
  const clean = summarizeBatchAudit([{
    name: 'settings.png',
    audit: {
      score: { score: 94, grade: 'A', axes: [{ id: 'text', label: 'Text contrast', score: 94 }] },
      textScan: { summary: {} },
      palette: { collisions: { summary: {} } },
    },
  }]);
  assert.equal(clean.releaseGate.status, 'ready');
  assert.equal(clean.portfolioScore, 94);
  assert.equal(summarizeBatchAudit([{ name: 'blank', audit: {} }]).releaseGate.status, 'insufficient');
  assert.throws(() => summarizeBatchAudit(null), /must be an array/i);
});

test('parseHexColor accepts short and full hex', () => {
  assert.deepEqual(parseHexColor('#abc'), { r: 170, g: 187, b: 204, hex: '#aabbcc' });
  assert.deepEqual(parseHexColor('112233'), { r: 17, g: 34, b: 51, hex: '#112233' });
});

test('parseHexColor accepts hex with alpha notation and strips alpha channel', () => {
  assert.deepEqual(parseHexColor('#0f1a'), { r: 0, g: 255, b: 17, hex: '#00ff11' });
  assert.deepEqual(parseHexColor('80ff00ff'), { r: 128, g: 255, b: 0, hex: '#80ff00' });
});

test('parseHexColor accepts rgb() and rgba() inputs', () => {
  assert.deepEqual(parseHexColor('rgb(255, 255, 255)'), { r: 255, g: 255, b: 255, hex: '#ffffff' });
  assert.deepEqual(parseHexColor('rgb(0%, 100%, 0%)'), { r: 0, g: 255, b: 0, hex: '#00ff00' });
  assert.deepEqual(parseHexColor('rgba(0, 128, 255, 0.25)'), { r: 0, g: 128, b: 255, hex: '#0080ff' });
  assert.deepEqual(parseHexColor('rgb(0 128 255 / 75%)'), { r: 0, g: 128, b: 255, hex: '#0080ff' });
});

test('parseHexColor accepts hsl() and hsla() inputs', () => {
  assert.deepEqual(parseHexColor('hsl(0, 0%, 0%)'), { r: 0, g: 0, b: 0, hex: '#000000' });
  assert.deepEqual(parseHexColor('hsl(0 0% 100%)'), { r: 255, g: 255, b: 255, hex: '#ffffff' });
  assert.deepEqual(parseHexColor('hsla(120, 100%, 50%, 0.33)'), { r: 0, g: 255, b: 0, hex: '#00ff00' });
});

test('parseHexColor accepts common CSS color names', () => {
  assert.deepEqual(parseHexColor('rebeccapurple'), { r: 102, g: 51, b: 153, hex: '#663399' });
  assert.deepEqual(parseHexColor('DodgerBlue'), { r: 30, g: 144, b: 255, hex: '#1e90ff' });
  assert.deepEqual(parseHexColor(' WHITE '), { r: 255, g: 255, b: 255, hex: '#ffffff' });
});

test('parseHexColor rejects malformed rgb() inputs', () => {
  assert.throws(() => parseHexColor('rgb(300, 0, 0)'), /Invalid hex color/i);
  assert.throws(() => parseHexColor('rgba(0, 0, 0)'), /Invalid hex color/i);
  assert.throws(() => parseHexColor('rgb(50, 20)'), /Invalid hex color/i);
  assert.throws(() => parseHexColor('rgb(0, 0, 0, 0.5)'), /Invalid hex color/i);
});

test('parseHexColor rejects unknown color names', () => {
  assert.throws(() => parseHexColor('not-a-color-name'), /Invalid hex color/i);
});

test('parseHexColor rejects malformed hsl() inputs', () => {
  assert.throws(() => parseHexColor('hsl(0, 0, 0)'), /Invalid hex color/i);
  assert.throws(() => parseHexColor('hsl(120, 40%, 50%) 0.5'), /Invalid hex color/i);
  assert.throws(() => parseHexColor('hsla(120, 40%, 50%)'), /Invalid hex color/i);
  assert.throws(() => parseHexColor('hsla(120, 40%, 50%, 1.5)'), /Invalid hex color/i);
  assert.throws(() => parseHexColor('hsl(120, 40%, 50%, 0.5)'), /Invalid hex color/i);
  assert.throws(() => parseHexColor('hsl(120, 40%, 50% / 0.5)'), /Invalid hex color/i);
});

test('parseHexColor throws for invalid values', () => {
  assert.throws(() => parseHexColor('xyz'), /Invalid hex color/i);
  assert.throws(() => parseHexColor('#12345'), /Invalid hex color/i);
  assert.throws(() => parseHexColor(''), /Invalid hex color/i);
});

test('rgbToHex normalizes and pads values', () => {
  assert.equal(rgbToHex({ r: -1, g: 255, b: 16.9 }), '#00ff11');
});

test('contrast for black and white is maximum of visible combinations', () => {
  const ratio = contrastRatio(parseHexColor('#000'), parseHexColor('#fff'));
  assert.ok(ratio > 20);
});

test('relativeLuminance validates channel ranges', () => {
  assert.throws(() => relativeLuminance({ r: -1, g: 0, b: 0 }), /between 0 and 255/);
  assert.throws(() => relativeLuminance({ r: 0, g: 0, b: 300 }), /between 0 and 255/);
  assert.throws(() => relativeLuminance({ r: '0', g: 0, b: 0 }), /finite number/);
});

test('equal colors return contrast 1', () => {
  const color = parseHexColor('#445566');
  const ratio = contrastRatio(color, color);
  assert.equal(ratio.toFixed(3), '1.000');
});

test('contrastRatio validates input color objects', () => {
  assert.throws(() => contrastRatio(parseHexColor('#000000'), null), /requires two RGB objects/);
  assert.throws(() => contrastRatio(null, parseHexColor('#fff')), /requires two RGB objects/);
});

test('evaluateContrast exposes AA and AAA states', () => {
  const result = evaluateContrast(parseHexColor('#000000'), parseHexColor('#ffffff'));
  assert.equal(result.passesAA, true);
  assert.equal(result.passesAAA, true);
  assert.equal(result.passesLAA, true);
});

test('evaluateContrast validates thresholds', () => {
  assert.throws(() => evaluateContrast(parseHexColor('#000'), parseHexColor('#fff'), -1), /AA threshold/i);
  assert.throws(() => evaluateContrast(parseHexColor('#000'), parseHexColor('#fff'), 4.5, 4.1), /AAA threshold/i);
});

test('calculateImpactPercent measures pixel delta and normalizes to percent', () => {
  const base = new Uint8ClampedArray([0, 0, 0, 255, 255, 255, 255, 128]);
  const candidate = new Uint8ClampedArray([255, 0, 0, 255, 0, 255, 0, 64]);
  const value = calculateImpactPercent(base, candidate);
  assert.equal(value.toFixed(2), '50.00');
});

test('calculateImpactPercent handles no color channels by returning zero', () => {
  assert.equal(calculateImpactPercent(new Uint8ClampedArray([]), new Uint8ClampedArray([])), 0);
});

test('calculateImpactPercent returns null when image buffers do not align', () => {
  const base = new Uint8ClampedArray([0, 0, 0, 255]);
  const candidate = new Uint8ClampedArray([0, 0, 0]);
  assert.equal(calculateImpactPercent(base, candidate), null);
});

test('createVisualDifferenceHeatmap keeps unchanged pixels muted and highlights large changes', () => {
  const source = new Uint8ClampedArray([100, 100, 100, 255, 0, 0, 0, 255]);
  const candidate = new Uint8ClampedArray([100, 100, 100, 255, 255, 255, 255, 255]);
  const heatmap = createVisualDifferenceHeatmap(source, candidate, 2, 1);

  assert.deepEqual([...heatmap.data.slice(0, 3)], [70, 70, 70]);
  assert.ok(heatmap.data[4] > heatmap.data[5]);
  assert.ok(heatmap.data[4] > 200);
  assert.equal(heatmap.data[7], 255);
});

test('createVisualDifferenceHeatmap validates buffers and dimensions', () => {
  const pixel = new Uint8ClampedArray([0, 0, 0, 255]);
  assert.throws(() => createVisualDifferenceHeatmap(pixel, new Uint8ClampedArray(0), 1, 1), /matching lengths/i);
  assert.throws(() => createVisualDifferenceHeatmap(pixel, pixel, 2, 1), /does not match/i);
});

test('suggestAccessiblePairs returns usable color combinations', () => {
  const suggestions = suggestAccessiblePairs('#000000', '#ffffff');
  assert.ok(Array.isArray(suggestions));
  assert.ok(suggestions.length > 0);
  assert.ok(suggestions.every((pair) => pair.ratio >= 4.5 - 0.0001));
});

test('suggestAccessiblePairs prioritizes visually nearby high-contrast alternatives', () => {
  const suggestions = suggestAccessiblePairs('#8A4D3B', '#6D5B4F', 4.5, 8);
  assert.ok(suggestions.length > 0);
  assert.ok(suggestions[0].ratio >= 4.5);
  assert.ok(suggestions[0].ratio <= 6.0);
  assert.notEqual(`${suggestions[0].text.toLowerCase()}/${suggestions[0].background.toLowerCase()}`, '#000000/#ffffff');

  const baseText = parseHexColor('#8A4D3B');
  const baseBg = parseHexColor('#6D5B4F');
  const textDistance = (a, b) =>
    Math.sqrt((a.r - b.r) ** 2 + (a.g - b.g) ** 2 + (a.b - b.b) ** 2);
  const nearest = suggestions.some((pair) => {
    const text = parseHexColor(pair.text);
    const background = parseHexColor(pair.background);
    const totalDistance = textDistance(text, baseText) + textDistance(background, baseBg);
    return totalDistance <= 250;
  });

  assert.ok(nearest);
});

test('suggestAccessiblePairs validates parameters', () => {
  assert.throws(() => suggestAccessiblePairs('#000', '#fff', 0.5), /Target contrast ratio/i);
  assert.throws(() => suggestAccessiblePairs('#000', '#fff', 4.5, 0), /Suggestion limit/i);
});

test('suggestAccessiblePairs returns no results when target is impossible without fallback', () => {
  const strict = suggestAccessiblePairs('#123456', '#abcdef', 99, 4);
  assert.deepEqual(strict, []);
});

test('suggestAccessiblePairs returns closest fallback alternatives when fallback is enabled', () => {
  const fallback = suggestAccessiblePairs('#123456', '#abcdef', 99, 4, true);
  assert.ok(Array.isArray(fallback));
  assert.equal(fallback.length, 4);
  assert.ok(fallback.every((pair) => pair.ratio < 99));
  assert.ok(fallback.every((pair) => pair.ratio > 1));
  assert.ok(fallback[0].ratio >= fallback[fallback.length - 1].ratio);
});

test('demo helper text is bundled for copy actions', () => {
  const demoText = getDemoScriptText();
  const checklist = getSubmissionChecklistText();
  assert.ok(demoText.includes('1-3 Minute Demo Script'));
  assert.ok(checklist.includes('sim-protanopia.png'));
});

test('formatBytes provides readable human sizes', () => {
  assert.equal(formatBytes(0), '0 B');
  assert.equal(formatBytes(1024), '1.00 KB');
  assert.equal(formatBytes(1048576, 1), '1.0 MB');
  assert.equal(formatBytes(1536, 2), '1.50 KB');
});

test('formatBytes validates input values', () => {
  assert.throws(() => formatBytes(-1), /Byte count must be/);
  assert.throws(() => formatBytes('bad'), /Byte count must be/);
  assert.throws(() => formatBytes(1024, 2.5), /Bytes formatting precision/);
});

test('each CVD mode has a valid transform matrix', () => {
  for (const mode of CVD_MODES) {
    assert.equal(mode.matrix.length, 3);
    mode.matrix.forEach((row) => assert.equal(row.length, 3));
  }
});

test('transformImageDataWithMatrix throws for invalid matrix', () => {
  const source = { data: new Uint8ClampedArray([0, 0, 0, 255]), width: 1, height: 1 };
  assert.throws(() => transformImageDataWithMatrix(source, [[1, 0], [0, 1], [0, 0]]), /Invalid image data or matrix/i);
  assert.throws(() => transformImageDataWithMatrix(source, [[1, 0, 0], [0, 1, 0], ['a', 0, 0]]), /Invalid image data or matrix/i);
});

test('transformImageDataWithMatrix validates image dimensions and raw data', () => {
  const tiny = { data: new Uint8ClampedArray([0, 0, 0]), width: 1, height: 1 };
  assert.throws(() => transformImageDataWithMatrix(tiny, CVD_MODES[0].matrix), /Image data length does not match expected dimensions/);
  assert.throws(
    () =>
      transformImageDataWithMatrix(
        { data: new Uint8ClampedArray([0, 0, 0, 255]), width: 0, height: 0 },
        CVD_MODES[0].matrix,
      ),
    /Invalid image data dimensions/i,
  );
});

test('transformImageDataWithMatrix transforms image data in place', () => {
  const source = {
    data: new Uint8ClampedArray([255, 0, 0, 255, 0, 255, 0, 255]),
    width: 1,
    height: 2,
  };
  const mode = CVD_MODES.find(({ id }) => id === 'protanopia');
  const output = transformImageDataWithMatrix(source, mode.matrix);
  assert.equal(output.data[0], source.data[0]);
  assert.equal(output.width, 1);
});

function fillPixels(data, startPixel, count, [r, g, b, a = 255]) {
  for (let pixel = startPixel; pixel < startPixel + count; pixel += 1) {
    const i = pixel * 4;
    data[i] = r;
    data[i + 1] = g;
    data[i + 2] = b;
    data[i + 3] = a;
  }
}

test('extractDominantColors ranks colors by pixel share', () => {
  const data = new Uint8ClampedArray(10 * 10 * 4);
  fillPixels(data, 0, 70, [255, 0, 0]);
  fillPixels(data, 70, 30, [255, 255, 255]);

  const colors = extractDominantColors(data, 10, 10);
  assert.equal(colors.length, 2);
  assert.equal(colors[0].hex, '#ff0000');
  assert.ok(Math.abs(colors[0].sharePercent - 70) < 0.01);
  assert.equal(colors[1].hex, '#ffffff');
  assert.ok(Math.abs(colors[1].sharePercent - 30) < 0.01);
});

test('extractDominantColors merges near-identical colors and skips transparent pixels', () => {
  const data = new Uint8ClampedArray(10 * 10 * 4);
  fillPixels(data, 0, 40, [255, 0, 0]);
  fillPixels(data, 40, 40, [250, 4, 4]);
  fillPixels(data, 80, 20, [0, 255, 0, 0]);

  const colors = extractDominantColors(data, 10, 10);
  assert.equal(colors.length, 1);
  assert.ok(Math.abs(colors[0].sharePercent - 100) < 0.01);
});

test('extractDominantColors respects maxColors and validates input', () => {
  const data = new Uint8ClampedArray(4 * 1 * 4);
  fillPixels(data, 0, 1, [255, 0, 0]);
  fillPixels(data, 1, 1, [0, 255, 0]);
  fillPixels(data, 2, 1, [0, 0, 255]);
  fillPixels(data, 3, 1, [255, 255, 0]);

  const colors = extractDominantColors(data, 4, 1, { maxColors: 2, minSharePercent: 0 });
  assert.equal(colors.length, 2);

  assert.throws(() => extractDominantColors(data, 3, 1), /width \* height \* 4/);
  assert.throws(() => extractDominantColors(null, 4, 1), /width \* height \* 4/);
  assert.throws(() => extractDominantColors(data, 0, 4), /positive integers/);
});

test('extractDominantColors returns empty list for fully transparent input', () => {
  const data = new Uint8ClampedArray(2 * 2 * 4);
  assert.deepEqual(extractDominantColors(data, 2, 2), []);
});

test('buildPaletteContrastMatrix orders pairs worst-first with WCAG levels', () => {
  const { pairs, summary } = buildPaletteContrastMatrix(['#000000', '#ffffff', '#777777']);

  assert.equal(pairs.length, 3);
  assert.equal(pairs[0].text, '#777777');
  assert.equal(pairs[0].background, '#ffffff');
  assert.equal(pairs[0].level, 'aa-large');
  assert.equal(pairs[0].passesAA, false);
  assert.equal(pairs[1].level, 'aa');
  assert.equal(pairs[2].level, 'aaa');
  assert.ok(pairs[0].ratio <= pairs[1].ratio && pairs[1].ratio <= pairs[2].ratio);
  assert.ok(Math.abs(pairs[2].ratio - 21) < 0.01);

  assert.deepEqual(summary, {
    total: 3,
    aaa: 1,
    aa: 1,
    aaLargeOnly: 1,
    fail: 0,
    belowAA: 1,
  });
});

test('buildPaletteContrastMatrix accepts color objects and flags failing pairs', () => {
  const { pairs, summary } = buildPaletteContrastMatrix([
    { hex: '#888888' },
    { hex: '#999999' },
  ]);

  assert.equal(pairs.length, 1);
  assert.equal(pairs[0].level, 'fail');
  assert.equal(summary.fail, 1);
  assert.equal(summary.belowAA, 1);
});

test('buildPaletteContrastMatrix validates parameters', () => {
  assert.throws(() => buildPaletteContrastMatrix('#000000'), /must be an array/);
  assert.throws(() => buildPaletteContrastMatrix(['not-a-color']), /Invalid hex color|Color input/);
  assert.throws(
    () => buildPaletteContrastMatrix(['#000000', '#ffffff'], { aaThreshold: 5, aaaThreshold: 4 }),
    /AAA threshold/,
  );
});

test('buildAccessibleRecolorPlan fixes a failing two-color palette by adjusting the lower-share color', () => {
  const plan = buildAccessibleRecolorPlan([
    { hex: '#ffffff', sharePercent: 60 },
    { hex: '#aaaaaa', sharePercent: 30 },
  ]);

  assert.equal(plan.summary.initialBelowAA, 1);
  assert.equal(plan.summary.remainingBelowAA, 0);
  assert.equal(plan.summary.fixedPairs, 1);
  assert.equal(plan.remaps.length, 1);
  assert.equal(plan.remaps[0].from.hex, '#aaaaaa');
  assert.notEqual(plan.remaps[0].to.hex, '#aaaaaa');
  assert.ok(contrastRatio(plan.remaps[0].to, parseHexColor('#ffffff')) >= 4.5);
});

test('buildAccessibleRecolorPlan leaves an already-passing palette untouched', () => {
  const plan = buildAccessibleRecolorPlan(['#ffffff', '#111111']);

  assert.equal(plan.summary.initialBelowAA, 0);
  assert.equal(plan.summary.fixedPairs, 0);
  assert.equal(plan.remaps.length, 0);
  assert.ok(plan.palette.every((entry) => entry.from === entry.to && !entry.adjusted));
});

test('buildAccessibleRecolorPlan never breaks pairs that already pass AA', () => {
  const plan = buildAccessibleRecolorPlan([
    { hex: '#ffffff', sharePercent: 60 },
    { hex: '#222222', sharePercent: 30 },
    { hex: '#808080', sharePercent: 10 },
  ]);

  assert.equal(plan.summary.initialBelowAA, 2);
  assert.ok(plan.summary.fixedPairs >= 1);
  assert.ok(plan.summary.remainingBelowAA < plan.summary.initialBelowAA);

  const finalWhite = parseHexColor(plan.palette[0].to);
  const finalDark = parseHexColor(plan.palette[1].to);
  assert.ok(contrastRatio(finalWhite, finalDark) >= 4.5);
  plan.remaps.forEach((remap) => assert.notEqual(remap.from.hex, remap.to.hex));
});

test('applyPaletteRemapToImageData repaints matching pixels and preserves pixel offsets', () => {
  const data = new Uint8ClampedArray([
    255, 0, 0, 255,
    250, 10, 5, 255,
    0, 0, 255, 255,
    255, 0, 0, 0,
  ]);

  const result = applyPaletteRemapToImageData(data, 4, 1, [{ from: '#ff0000', to: '#008000' }]);

  assert.equal(result.totalPixels, 4);
  assert.equal(result.changedPixels, 2);
  assert.deepEqual(Array.from(data.slice(0, 4)), [0, 128, 0, 255]);
  assert.deepEqual(Array.from(data.slice(4, 8)), [0, 138, 5, 255]);
  assert.deepEqual(Array.from(data.slice(8, 12)), [0, 0, 255, 255]);
  assert.deepEqual(Array.from(data.slice(12, 16)), [255, 0, 0, 0]);
});

test('applyPaletteRemapToImageData picks the nearest anchor and honors identity remaps', () => {
  const data = new Uint8ClampedArray([
    100, 100, 100, 255,
    120, 120, 120, 255,
  ]);

  const result = applyPaletteRemapToImageData(data, 2, 1, [
    { from: '#646464', to: '#646464' },
    { from: '#787878', to: { r: 170, g: 170, b: 170 } },
  ]);

  assert.equal(result.changedPixels, 1);
  assert.deepEqual(Array.from(data.slice(0, 4)), [100, 100, 100, 255]);
  assert.deepEqual(Array.from(data.slice(4, 8)), [170, 170, 170, 255]);
});

test('recolor plan and remap validate malformed input', () => {
  assert.throws(() => buildAccessibleRecolorPlan('not-an-array'));
  assert.throws(() => buildAccessibleRecolorPlan(['#ffffff']));
  assert.throws(() => buildAccessibleRecolorPlan(['#ffffff', '#000000'], { aaThreshold: 0 }));
  assert.throws(() => applyPaletteRemapToImageData(new Uint8ClampedArray(4), 2, 1, []));
  assert.throws(() => applyPaletteRemapToImageData(new Uint8ClampedArray(8), 2, 1, 'nope'));
  assert.throws(() => applyPaletteRemapToImageData(new Uint8ClampedArray(8), 2, 1, [{ from: '#zz0000', to: '#000000' }]));
});

function createSolidImage(width, height, [r, g, b]) {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let pixel = 0; pixel < width * height; pixel += 1) {
    const offset = pixel * 4;
    data[offset] = r;
    data[offset + 1] = g;
    data[offset + 2] = b;
    data[offset + 3] = 255;
  }
  return data;
}

function paintVerticalStripes(data, imageWidth, x0, y0, w, h, [r, g, b], on = 2, off = 2) {
  for (let y = y0; y < y0 + h; y += 1) {
    for (let x = x0; x < x0 + w; x += 1) {
      if ((x - x0) % (on + off) < on) {
        const offset = (y * imageWidth + x) * 4;
        data[offset] = r;
        data[offset + 1] = g;
        data[offset + 2] = b;
        data[offset + 3] = 255;
      }
    }
  }
}

test('detectTextLikeRegions finds striped text bands and orders them worst-contrast first', () => {
  const width = 144;
  const height = 96;
  const data = createSolidImage(width, height, [255, 255, 255]);
  // Low-contrast "text": #999999 stripes on white (~2.85:1, fails WCAG).
  paintVerticalStripes(data, width, 12, 12, 72, 24, [153, 153, 153]);
  // High-contrast "text": black stripes on white (21:1, AAA).
  paintVerticalStripes(data, width, 12, 60, 72, 24, [0, 0, 0]);

  const { regions, summary, grid } = detectTextLikeRegions(data, width, height);
  assert.equal(regions.length, 2);
  assert.equal(grid.tileSize, 12);

  const [worst, best] = regions;
  assert.ok(worst.ratio < best.ratio, 'regions are sorted worst-contrast first');
  assert.equal(worst.text.hex, '#999999');
  assert.equal(worst.background.hex, '#ffffff');
  assert.ok(Math.abs(worst.ratio - 2.85) < 0.1);
  assert.equal(worst.level, 'fail');
  assert.equal(worst.passesAA, false);

  assert.equal(best.text.hex, '#000000');
  assert.equal(best.level, 'aaa');
  assert.ok(best.ratio > 20);

  assert.equal(summary.total, 2);
  assert.equal(summary.fail, 1);
  assert.equal(summary.aaa, 1);
  assert.equal(summary.belowAA, 1);

  // Bounding boxes stay on the painted bands (tile-aligned).
  assert.ok(worst.y >= 12 && worst.y + worst.height <= 36);
  assert.ok(best.y >= 60 && best.y + best.height <= 84);
});

test('detectTextLikeRegions treats the minority luminance cluster as the text color', () => {
  const width = 144;
  const height = 96;
  const data = createSolidImage(width, height, [255, 255, 255]);
  // Dark panel flush with the image origin, holding sparse white "glyph" stripes:
  // white is the minority cluster, so it must be reported as the text color.
  for (let y = 0; y < 24; y += 1) {
    for (let x = 0; x < 72; x += 1) {
      const offset = (y * width + x) * 4;
      data[offset] = 30;
      data[offset + 1] = 58;
      data[offset + 2] = 95;
      data[offset + 3] = 255;
    }
  }
  paintVerticalStripes(data, width, 0, 0, 72, 24, [255, 255, 255], 2, 4);

  const { regions } = detectTextLikeRegions(data, width, height);
  assert.equal(regions.length, 1);
  assert.equal(regions[0].text.hex, '#ffffff');
  assert.equal(regions[0].background.hex, '#1e3a5f');
  assert.equal(regions[0].passesAA, true);
});

test('detectTextLikeRegions returns no regions for flat images and validates input', () => {
  const width = 60;
  const height = 48;
  const flat = createSolidImage(width, height, [240, 240, 240]);
  const result = detectTextLikeRegions(flat, width, height);
  assert.deepEqual(result.regions, []);
  assert.equal(result.summary.total, 0);
  assert.equal(result.summary.belowAA, 0);

  assert.throws(() => detectTextLikeRegions(flat, 0, 0), /positive integers/i);
  assert.throws(() => detectTextLikeRegions(new Uint8ClampedArray(4), width, height), /width \* height \* 4/i);
  assert.throws(() => detectTextLikeRegions(flat, width, height, { tileSize: 1 }), /tile size/i);
  assert.throws(() => detectTextLikeRegions(flat, width, height, { maxRegions: 0 }), /max regions/i);
});

function paintRect(data, imageWidth, x0, y0, w, h, [r, g, b]) {
  for (let y = y0; y < y0 + h; y += 1) {
    for (let x = x0; x < x0 + w; x += 1) {
      const offset = (y * imageWidth + x) * 4;
      data[offset] = r;
      data[offset + 1] = g;
      data[offset + 2] = b;
      data[offset + 3] = 255;
    }
  }
}

test('scanComponentSurfaceContrast flags a ghost component surface below 3:1 (WCAG 1.4.11)', () => {
  const width = 240;
  const height = 160;
  const data = createSolidImage(width, height, [248, 250, 252]);
  // Pale "ghost input": visibly drawn (#DDE5EE) but ~1.2:1 against the page.
  paintRect(data, width, 40, 50, 160, 60, [221, 229, 238]);
  paintVerticalStripes(data, width, 64, 68, 96, 24, [71, 85, 105]);

  const { regions } = detectTextLikeRegions(data, width, height);
  assert.ok(regions.length >= 1, 'placeholder text is detected');
  const scan = scanComponentSurfaceContrast(data, width, height, regions);

  assert.equal(scan.summary.failing, 1);
  assert.equal(scan.summary.worstRatio, scan.findings[0].ratio);
  const finding = scan.findings[0];
  assert.equal(finding.outcome, 'fail');
  assert.ok(finding.ratio < COMPONENT_CONTRAST_DEFAULTS.minRatio, `ratio ${finding.ratio} is below 3:1`);
  // The march must resolve the true page color outside the component surface.
  assert.ok(labDeltaE(finding.surrounding.rgb, { r: 248, g: 250, b: 252 }) < 3);
  assert.ok(labDeltaE(finding.surface.rgb, { r: 221, g: 229, b: 238 }) < 6);
  assert.ok(Number.isFinite(finding.boundaryDistance) && finding.boundaryDistance > 0);
});

test('scanComponentSurfaceContrast passes strong component surfaces', () => {
  const width = 240;
  const height = 160;
  const data = createSolidImage(width, height, [248, 250, 252]);
  // Solid teal button with white glyph stripes: surface holds >5:1 vs the page.
  paintRect(data, width, 40, 50, 160, 60, [15, 118, 110]);
  paintVerticalStripes(data, width, 64, 68, 96, 24, [255, 255, 255]);

  const { regions } = detectTextLikeRegions(data, width, height);
  assert.ok(regions.length >= 1);
  const scan = scanComponentSurfaceContrast(data, width, height, regions);

  assert.equal(scan.summary.failing, 0);
  assert.ok(scan.summary.passing >= 1);
  const component = scan.components.find((entry) => entry.outcome === 'pass');
  assert.ok(component.ratio >= 3);
});

test('scanComponentSurfaceContrast reports plain page text as page-surface, never a failure', () => {
  const width = 240;
  const height = 160;
  const data = createSolidImage(width, height, [255, 255, 255]);
  // Text painted straight onto the page: no component surface exists, so the
  // outward march never finds a boundary and must not invent a 1.4.11 finding.
  paintVerticalStripes(data, width, 84, 68, 96, 24, [17, 24, 39]);

  const { regions } = detectTextLikeRegions(data, width, height);
  assert.ok(regions.length >= 1);
  const scan = scanComponentSurfaceContrast(data, width, height, regions);

  assert.equal(scan.summary.failing, 0);
  assert.equal(scan.summary.evaluated, 0);
  assert.ok(scan.summary.pageSurfaces >= 1);
  assert.equal(scan.summary.worstRatio, null);
});

test('scanComponentSurfaceContrast validates input', () => {
  const width = 60;
  const height = 48;
  const flat = createSolidImage(width, height, [240, 240, 240]);
  assert.throws(() => scanComponentSurfaceContrast(flat, 0, 0, []), /positive integers/i);
  assert.throws(() => scanComponentSurfaceContrast(new Uint8ClampedArray(4), width, height, []), /width \* height \* 4/i);
  assert.throws(() => scanComponentSurfaceContrast(flat, width, height, 'nope'), /array/i);
  assert.throws(() => scanComponentSurfaceContrast(flat, width, height, [], { minRatio: 0 }), /minimum ratio/i);

  // Malformed regions are counted as inconclusive instead of crashing.
  const scan = scanComponentSurfaceContrast(flat, width, height, [{ x: 1, y: 1 }]);
  assert.equal(scan.summary.inconclusive, 1);
  assert.equal(scan.summary.failing, 0);
});

test('scanTargetSizes flags a crowded row of undersized icon buttons (WCAG 2.5.8)', () => {
  const width = 240;
  const height = 160;
  const data = createSolidImage(width, height, [255, 255, 255]);
  // Three crisp 14x14 icon buttons, 6px apart: every contrast lens passes,
  // but each target is under 24px and its 24px circle hits its neighbor's.
  paintRect(data, width, 60, 60, 14, 14, [15, 118, 110]);
  paintRect(data, width, 80, 60, 14, 14, [15, 118, 110]);
  paintRect(data, width, 100, 60, 14, 14, [15, 118, 110]);

  const { regions } = detectTextLikeRegions(data, width, height);
  assert.ok(regions.length >= 1, 'icon cluster is detected as a region');
  const componentScan = scanComponentSurfaceContrast(data, width, height, regions);
  const result = scanTargetSizes(data, width, height, regions, componentScan.components);

  assert.equal(result.summary.targets, 3);
  assert.equal(result.summary.undersized, 3);
  assert.equal(result.summary.spacingExempt, 0);
  assert.equal(result.summary.worst.widthCss, 14);
  for (const target of result.findings) {
    assert.equal(target.outcome, 'fail');
    assert.equal(target.kind, 'solid-block');
    assert.equal(target.widthCss, 14);
    assert.equal(target.heightCss, 14);
    assert.ok(target.minCss < TARGET_SIZE_DEFAULTS.minTargetCss);
  }
});

test('scanTargetSizes honors the WCAG 2.5.8 spacing exception for isolated small targets', () => {
  const width = 240;
  const height = 160;
  const data = createSolidImage(width, height, [255, 255, 255]);
  // Same undersized icons, but 40px apart: a 24px circle centered on each
  // never intersects the other, so the spacing exception applies. (Offset by
  // 1px from the tile grid so each icon's edge gradients land inside tiles
  // that also contain its dark pixels.)
  paintRect(data, width, 61, 61, 14, 14, [15, 118, 110]);
  paintRect(data, width, 115, 61, 14, 14, [15, 118, 110]);

  const { regions } = detectTextLikeRegions(data, width, height);
  assert.ok(regions.length >= 1);
  const componentScan = scanComponentSurfaceContrast(data, width, height, regions);
  const result = scanTargetSizes(data, width, height, regions, componentScan.components);

  assert.equal(result.summary.undersized, 0);
  assert.equal(result.summary.spacingExempt, 2);
  assert.equal(result.findings.length, 0);

  // The same layout read at 2x device pixels (cssPixelRatio 2) shrinks the
  // CSS measurement to 7px and the finding must stay spacing-exempt.
  const retina = scanTargetSizes(data, width, height, regions, componentScan.components, {
    cssPixelRatio: 2,
    minBlobCss: 6,
  });
  assert.equal(retina.summary.spacingExempt, 2);
  assert.equal(retina.targets[0].widthCss, 7);
});

test('scanTargetSizes measures component surfaces to pixel precision and passes real buttons', () => {
  const width = 240;
  const height = 160;
  const data = createSolidImage(width, height, [248, 250, 252]);
  // Solid teal 160x60 button with glyph stripes: the detector box is
  // tile-quantized, but the flood fill must recover the true button extent.
  paintRect(data, width, 40, 50, 160, 60, [15, 118, 110]);
  paintVerticalStripes(data, width, 64, 68, 96, 24, [255, 255, 255]);

  const { regions } = detectTextLikeRegions(data, width, height);
  const componentScan = scanComponentSurfaceContrast(data, width, height, regions);
  assert.ok(componentScan.summary.passing >= 1);
  const result = scanTargetSizes(data, width, height, regions, componentScan.components);

  assert.equal(result.summary.undersized, 0);
  assert.ok(result.summary.passing >= 1);
  const button = result.targets.find((target) => target.kind === 'component-surface');
  assert.ok(button, 'button surface is measured as a target');
  assert.ok(Math.abs(button.widthCss - 160) <= 2, `width ${button.widthCss} ≈ 160`);
  assert.ok(Math.abs(button.heightCss - 60) <= 2, `height ${button.heightCss} ≈ 60`);
  assert.equal(button.outcome, 'pass');
});

test('scanTargetSizes never treats plain text glyphs as tap targets', () => {
  const width = 240;
  const height = 160;
  const data = createSolidImage(width, height, [255, 255, 255]);
  // Thin glyph strokes straight on the page: the solidity/min-size filters
  // must reject them so words are never reported as undersized targets.
  paintVerticalStripes(data, width, 84, 68, 96, 24, [17, 24, 39]);

  const { regions } = detectTextLikeRegions(data, width, height);
  assert.ok(regions.length >= 1);
  const componentScan = scanComponentSurfaceContrast(data, width, height, regions);
  const result = scanTargetSizes(data, width, height, regions, componentScan.components);

  assert.equal(result.summary.targets, 0);
  assert.equal(result.summary.undersized, 0);
});

test('scanTargetSizes validates input', () => {
  const width = 60;
  const height = 48;
  const flat = createSolidImage(width, height, [240, 240, 240]);
  assert.throws(() => scanTargetSizes(flat, 0, 0, []), /positive integers/i);
  assert.throws(() => scanTargetSizes(new Uint8ClampedArray(4), width, height, []), /width \* height \* 4/i);
  assert.throws(() => scanTargetSizes(flat, width, height, 'nope'), /array/i);
  assert.throws(() => scanTargetSizes(flat, width, height, [], 'nope'), /array/i);
  assert.throws(
    () => scanTargetSizes(flat, width, height, [], [], { cssPixelRatio: 0 }),
    /css pixel ratio/i,
  );
  assert.throws(
    () => scanTargetSizes(flat, width, height, [], [], { minTargetCss: 0 }),
    /minimum target size/i,
  );

  // Malformed regions are skipped instead of crashing.
  const result = scanTargetSizes(flat, width, height, [{ x: 1 }], []);
  assert.equal(result.summary.targets, 0);
});

test('planComponentSurfaceRepair darkens a ghost surface minimally and rescues crushed text', () => {
  const surface = { r: 221, g: 229, b: 238 };
  const surrounding = { r: 248, g: 250, b: 252 };
  const text = { r: 71, g: 85, b: 105 };
  const plan = planComponentSurfaceRepair(surface, surrounding, text);

  assert.ok(plan.surfaceRatio >= COMPONENT_SURFACE_FIX_DEFAULTS.minRatio, `surface reaches 3:1 (${plan.surfaceRatio})`);
  // A near-white page forces the surface toward mid-tone, so it must get darker…
  assert.ok(relativeLuminance(plan.surface.rgb) < relativeLuminance(surface));
  // …with a minimal shift, not a jump to an extreme.
  assert.ok(plan.surfaceDeltaE < labDeltaE({ r: 0, g: 0, b: 0 }, surface));
  // The original dark text cannot hold AA on that mid-tone, so the plan adjusts it too.
  assert.equal(plan.textAdjusted, true);
  assert.ok(plan.text && plan.textRatio >= COMPONENT_SURFACE_FIX_DEFAULTS.textMinRatio, `text holds AA (${plan.textRatio})`);
  assert.equal(plan.originalText.hex, rgbToHex(text));

  // Without a text sample the plan only moves the surface.
  const surfaceOnly = planComponentSurfaceRepair(surface, surrounding);
  assert.ok(surfaceOnly.surfaceRatio >= 3);
  assert.equal(surfaceOnly.text, null);
  assert.equal(surfaceOnly.textRatio, null);
  assert.equal(surfaceOnly.textAdjusted, false);
});

test('planComponentSurfaceRepair keeps text untouched when a qualifying surface preserves it', () => {
  // Near-white card on a white page with black text: the darkened surface that
  // reaches 3:1 vs the page still leaves black text far above 4.5:1.
  const plan = planComponentSurfaceRepair(
    { r: 250, g: 250, b: 250 },
    { r: 255, g: 255, b: 255 },
    { r: 0, g: 0, b: 0 },
  );
  assert.ok(plan.surfaceRatio >= 3);
  assert.equal(plan.textAdjusted, false);
  assert.equal(plan.text, null);
  assert.ok(plan.textRatio >= 4.5);

  assert.throws(() => planComponentSurfaceRepair({ r: 1, g: 2 }, { r: 0, g: 0, b: 0 }), /surface color/i);
  assert.throws(
    () => planComponentSurfaceRepair({ r: 10, g: 10, b: 10 }, { r: 0, g: 0, b: 0 }, null, { minRatio: 0 }),
    /minimum ratio/i,
  );
});

test('planComponentSurfaceRepair holds an APCA floor when asked, flipping to light-on-dark', () => {
  const surface = { r: 218, g: 226, b: 235 };
  const surrounding = { r: 248, g: 250, b: 252 };
  const text = { r: 90, g: 106, b: 122 };
  // Physics: on a near-white page, every 3:1 surface that keeps DARK text
  // WCAG-legible scores below APCA Lc 60. With an APCA floor the plan must
  // choose a genuinely dark surface with light text instead.
  const plan = planComponentSurfaceRepair(surface, surrounding, text, { textMinApcaLc: 62 });
  assert.ok(plan.surfaceRatio >= 3);
  assert.equal(plan.textAdjusted, true);
  assert.ok(plan.textRatio >= 4.5, `text holds AA (${plan.textRatio})`);
  assert.ok(plan.textApcaLc >= 62, `text holds APCA (${plan.textApcaLc})`);
  assert.ok(relativeLuminance(plan.text.rgb) > relativeLuminance(plan.surface.rgb), 'light text on dark surface');

  // Without the floor the same repair reports its (weaker) APCA magnitude honestly.
  const withoutFloor = planComponentSurfaceRepair(surface, surrounding, text);
  assert.ok(Number.isFinite(withoutFloor.textApcaLc) && withoutFloor.textApcaLc < 62);
});

test('applyComponentSurfaceContrastFix repairs a ghost input end-to-end (detect → plan → repaint → re-scan)', () => {
  const width = 240;
  const height = 160;
  const data = createSolidImage(width, height, [248, 250, 252]);
  paintRect(data, width, 40, 50, 160, 60, [221, 229, 238]);
  paintVerticalStripes(data, width, 64, 68, 96, 24, [71, 85, 105]);

  const { regions } = detectTextLikeRegions(data, width, height);
  const scan = scanComponentSurfaceContrast(data, width, height, regions);
  assert.equal(scan.summary.failing, 1);
  const finding = scan.findings[0];
  const region = regions[finding.regionIndex];
  const plan = planComponentSurfaceRepair(finding.surface.rgb, finding.surrounding.rgb, region.text.rgb, {
    minRatio: 3.3,
    textMinRatio: 5,
    textMinApcaLc: 62,
  });

  const repaired = new Uint8ClampedArray(data);
  const summary = applyComponentSurfaceContrastFix(repaired, width, height, finding, plan);
  assert.ok(summary.surfacePixels > 0, 'surface pixels repainted');
  assert.ok(summary.textPixels > 0, 'crushed text repainted');
  assert.equal(summary.changedPixels, summary.surfacePixels + summary.textPixels);

  // A page pixel far outside the component is untouched.
  const pageOffset = (10 * width + 10) * 4;
  assert.deepEqual([...repaired.slice(pageOffset, pageOffset + 3)], [248, 250, 252]);

  // The repaired image must now pass the same scans it failed: the surface
  // holds 3:1 vs the page and the region's text still holds AA.
  const reRegions = detectTextLikeRegions(repaired, width, height);
  const reScan = scanComponentSurfaceContrast(repaired, width, height, reRegions.regions);
  assert.equal(reScan.summary.failing, 0);
  assert.ok(reScan.summary.evaluated >= 1, 'repaired surface is still a distinct component');
  assert.equal(reRegions.summary.belowAA, 0);
  // The repair must not create an APCA perceptual false pass either: every
  // re-detected pair that passes WCAG 2 must also clear the Lc 60 fluent bar.
  for (const reRegion of reRegions.regions) {
    assert.ok(
      Math.abs(apcaContrast(reRegion.text.rgb, reRegion.background.rgb)) >= 60,
      `region at (${reRegion.x},${reRegion.y}) holds APCA after the repair`,
    );
  }
});

test('applyComponentSurfaceContrastFix validates input', () => {
  const width = 60;
  const height = 48;
  const flat = createSolidImage(width, height, [240, 240, 240]);
  const finding = {
    box: { x: 10, y: 10, width: 20, height: 12 },
    boundaryDistance: 6,
    surface: { rgb: { r: 220, g: 220, b: 220 } },
    surrounding: { rgb: { r: 240, g: 240, b: 240 } },
  };
  const plan = planComponentSurfaceRepair(finding.surface.rgb, finding.surrounding.rgb);

  assert.throws(() => applyComponentSurfaceContrastFix(flat, 0, 0, finding, plan), /positive integers/i);
  assert.throws(() => applyComponentSurfaceContrastFix(new Uint8ClampedArray(4), width, height, finding, plan), /width \* height \* 4/i);
  assert.throws(() => applyComponentSurfaceContrastFix(flat, width, height, { box: { x: 1, y: 1 } }, plan), /surface, and surrounding/i);
  assert.throws(() => applyComponentSurfaceContrastFix(flat, width, height, finding, null), /repair plan/i);
  assert.throws(
    () => applyComponentSurfaceContrastFix(flat, width, height, { ...finding, box: { x: -500, y: -500, width: 10, height: 10 } }, plan),
    /overlap/i,
  );
});

test('sampleRegionContrast probes a local pair and scores it under all three lenses', () => {
  const width = 80;
  const height = 80;
  const data = createSolidImage(width, height, [255, 255, 255]);
  // Sparse black "glyph" stripes: black is the minority cluster → text color.
  paintVerticalStripes(data, width, 20, 20, 40, 40, [0, 0, 0], 2, 6);

  const sample = sampleRegionContrast(data, width, height, 40, 40);
  assert.equal(sample.flat, false);
  assert.equal(sample.text.hex, '#000000');
  assert.equal(sample.background.hex, '#ffffff');
  assert.ok(sample.ratio > 20, `expected ~21:1, got ${sample.ratio}`);
  assert.equal(sample.level, 'aaa');
  assert.equal(sample.passesAA, true);
  assert.equal(sample.passesAAA, true);
  assert.equal(sample.cvd.hiddenFailure, false);
  assert.deepEqual(sample.cvd.failingModes, []);
  assert.ok(sample.cvd.worstRatio > 4.5);
  assert.ok(Number.isFinite(sample.apca.lc));
  assert.equal(sample.apca.falsePass, false);
  // Window is clamped to the image and centered on the probe.
  assert.ok(sample.window.x >= 0 && sample.window.y >= 0);
  assert.ok(sample.window.x + sample.window.width <= width);
  assert.ok(sample.window.y + sample.window.height <= height);
});

test('sampleRegionContrast exposes hidden CVD failures at the probe point', () => {
  const width = 80;
  const height = 80;
  const data = createSolidImage(width, height, [0, 0, 0]);
  // Pure red strokes on black: WCAG 2 passes AA (~5.25:1) yet the pair
  // collapses to ~1.74:1 under achromatopsia — a hidden color-vision failure.
  paintVerticalStripes(data, width, 20, 20, 40, 40, [255, 0, 0], 2, 6);

  const sample = sampleRegionContrast(data, width, height, 40, 40);
  assert.equal(sample.flat, false);
  assert.equal(sample.text.hex, '#ff0000');
  assert.equal(sample.background.hex, '#000000');
  assert.equal(sample.passesAA, true);
  assert.equal(sample.cvd.hiddenFailure, true);
  assert.ok(sample.cvd.worstRatio < 2, `expected collapse below 2:1, got ${sample.cvd.worstRatio}`);
  assert.ok(sample.cvd.failingModes.includes('achromatopsia'));
});

test('sampleRegionContrast reports flat windows and validates input', () => {
  const width = 40;
  const height = 40;
  const flat = createSolidImage(width, height, [240, 240, 240]);
  const sample = sampleRegionContrast(flat, width, height, 20, 20);
  assert.equal(sample.flat, true);
  assert.equal(sample.color.hex, '#f0f0f0');
  assert.ok(sample.window.width > 0 && sample.window.height > 0);

  // Probe coordinates outside the image clamp instead of throwing.
  const clamped = sampleRegionContrast(flat, width, height, -50, 999);
  assert.equal(clamped.flat, true);

  assert.throws(() => sampleRegionContrast(flat, 0, 0, 1, 1), /positive integers/i);
  assert.throws(() => sampleRegionContrast(new Uint8ClampedArray(4), width, height, 1, 1), /width \* height \* 4/i);
  assert.throws(() => sampleRegionContrast(flat, width, height, Number.NaN, 2), /finite coordinates/i);
  assert.throws(() => sampleRegionContrast(flat, width, height, 2, 2, { radius: 0 }), /sample radius/i);
});

test('applyTextRegionContrastFix recolors only the detected foreground cluster', () => {
  const width = 6;
  const height = 4;
  const data = createSolidImage(width, height, [240, 240, 240]);
  for (const [x, y] of [[2, 1], [3, 1], [2, 2], [3, 2]]) {
    const offset = (y * width + x) * 4;
    data[offset] = 120;
    data[offset + 1] = 120;
    data[offset + 2] = 120;
  }
  const result = applyTextRegionContrastFix(data, width, height, {
    x: 1, y: 0, width: 4, height: 4,
    text: { rgb: { r: 120, g: 120, b: 120 } },
    background: { rgb: { r: 240, g: 240, b: 240 } },
  }, '#202020');
  assert.equal(result.changedPixels, 4);
  assert.equal(result.replacement, '#202020');
  assert.deepEqual(Array.from(data.slice((1 * width + 2) * 4, (1 * width + 2) * 4 + 3)), [32, 32, 32]);
  assert.deepEqual(Array.from(data.slice(0, 3)), [240, 240, 240]);
});

test('applyTextRegionContrastFix validates image and region input', () => {
  const data = createSolidImage(2, 2, [255, 255, 255]);
  assert.throws(() => applyTextRegionContrastFix(data, 0, 2, {}, '#000'), /positive integers/i);
  assert.throws(() => applyTextRegionContrastFix(data, 2, 2, {}, '#000'), /detected text region/i);
});

test('orderVisionReelSegments puts the source first and simulations in impact order', () => {
  const ordered = orderVisionReelSegments([
    { id: 'protanopia', impactPercent: 12.4 },
    { id: 'source', impactPercent: null },
    { id: 'tritanopia', impactPercent: 21.9 },
    { id: 'achromatopsia', impactPercent: 3.1 },
  ]);
  assert.deepEqual(
    ordered.map((entry) => entry.id),
    ['source', 'tritanopia', 'protanopia', 'achromatopsia'],
  );
});

test('orderVisionReelSegments keeps unmeasured simulations last and preserves tie order', () => {
  const ordered = orderVisionReelSegments([
    { id: 'low-vision-blur', impactPercent: null },
    { id: 'deuteranopia', impactPercent: 8 },
    { id: 'protanopia', impactPercent: 8 },
    { id: 'low-vision-contrast' },
    { id: 'source' },
  ]);
  assert.deepEqual(
    ordered.map((entry) => entry.id),
    ['source', 'deuteranopia', 'protanopia', 'low-vision-blur', 'low-vision-contrast'],
  );
});

test('orderVisionReelSegments validates input and drops malformed entries', () => {
  assert.throws(() => orderVisionReelSegments(null), /array/i);
  assert.throws(() => orderVisionReelSegments('source'), /array/i);
  const ordered = orderVisionReelSegments([
    null,
    { id: '' },
    { impactPercent: 50 },
    { id: 'source' },
    { id: 'source' },
    { id: 'protanopia', impactPercent: 4 },
  ]);
  assert.deepEqual(
    ordered.map((entry) => entry.id),
    ['source', 'protanopia'],
  );
});

function buildSolidImageData(width, height, [r, g, b]) {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let offset = 0; offset < data.length; offset += 4) {
    data[offset] = r;
    data[offset + 1] = g;
    data[offset + 2] = b;
    data[offset + 3] = 255;
  }
  return data;
}

test('applyFieldLossMask peripheral shape darkens edges and preserves the center', () => {
  const width = 41;
  const height = 41;
  const data = buildSolidImageData(width, height, [255, 255, 255]);
  const summary = applyFieldLossMask(data, width, height, {
    shape: 'peripheral',
    innerRadius: 0.3,
    outerRadius: 0.8,
    fill: [10, 10, 10],
  });

  const centerOffset = (Math.floor(height / 2) * width + Math.floor(width / 2)) * 4;
  assert.equal(data[centerOffset], 255, 'center pixel should stay untouched');

  const cornerOffset = 0;
  assert.equal(data[cornerOffset], 10, 'corner pixel should be fully occluded');
  assert.equal(data[cornerOffset + 3], 255, 'alpha channel should be preserved');

  assert.ok(summary.occludedRatio > 0 && summary.occludedRatio < 1);
  assert.equal(summary.totalPixels, width * height);
});

test('applyFieldLossMask central shape occludes the center and preserves edges', () => {
  const width = 41;
  const height = 41;
  const data = buildSolidImageData(width, height, [200, 220, 240]);
  const summary = applyFieldLossMask(data, width, height, {
    shape: 'central',
    innerRadius: 0.15,
    outerRadius: 0.45,
    fill: [70, 65, 60],
  });

  const centerOffset = (Math.floor(height / 2) * width + Math.floor(width / 2)) * 4;
  assert.equal(data[centerOffset], 70, 'center pixel should match the fill color');
  assert.equal(data[centerOffset + 1], 65);
  assert.equal(data[centerOffset + 2], 60);

  const cornerOffset = 0;
  assert.equal(data[cornerOffset], 200, 'corner pixel should stay untouched');

  assert.ok(summary.occludedPixels > 0);
  assert.ok(summary.occludedRatio < 0.5, 'central scotoma should cover a minority of the frame');
});

test('applyFieldLossMask validates dimensions, shape, radii, and fill', () => {
  const data = buildSolidImageData(4, 4, [0, 0, 0]);
  assert.throws(() => applyFieldLossMask(data, 0, 4), /positive integers/i);
  assert.throws(() => applyFieldLossMask(data, 4, 4.5), /positive integers/i);
  assert.throws(() => applyFieldLossMask(new Uint8ClampedArray(8), 4, 4), /width \* height \* 4/i);
  assert.throws(() => applyFieldLossMask(data, 4, 4, { shape: 'diagonal' }), /shape/i);
  assert.throws(() => applyFieldLossMask(data, 4, 4, { innerRadius: -0.2 }), /inner radius/i);
  assert.throws(
    () => applyFieldLossMask(data, 4, 4, { innerRadius: 0.5, outerRadius: 0.4 }),
    /outer radius/i,
  );
  assert.throws(() => applyFieldLossMask(data, 4, 4, { fill: [300, 0, 0] }), /fill/i);
  assert.throws(() => applyFieldLossMask(data, 4, 4, { fill: [0, 0] }), /fill/i);
});

test('projectContrastAcrossCvdModes exposes hidden failures for pure red on black', () => {
  const projection = projectContrastAcrossCvdModes('#ff0000', '#000000');

  assert.ok(projection.baseRatio > 5, 'red on black should pass AA for typical vision');
  assert.equal(projection.basePassesAA, true);
  assert.equal(projection.projections.length, 7, 'all seven non-normal matrix modes project');

  const achromatopsia = projection.projections.find((entry) => entry.id === 'achromatopsia');
  assert.ok(achromatopsia, 'achromatopsia projection is present');
  assert.ok(achromatopsia.ratio < 2, 'red on black must collapse under achromatopsia');
  assert.ok(achromatopsia.delta < 0, 'projected ratio should drop below the base ratio');

  assert.equal(projection.hiddenFailure, true, 'passing base + failing projection is a hidden failure');
  assert.ok(projection.failingModes.includes('achromatopsia'));
  assert.equal(projection.worst.id, 'achromatopsia');
});

test('projectContrastAcrossCvdModes keeps achromatic pairs invariant', () => {
  const projection = projectContrastAcrossCvdModes({ r: 118, g: 118, b: 118 }, '#ffffff');

  assert.equal(projection.hiddenFailure, false);
  assert.equal(projection.failingModes.length, 0);
  for (const entry of projection.projections) {
    assert.ok(
      Math.abs(entry.delta) < 0.05,
      `${entry.id} should preserve gray-on-white contrast (delta ${entry.delta.toFixed(4)})`,
    );
    assert.equal(entry.passesAA, true);
  }
});

test('projectContrastAcrossCvdModes validates colors, thresholds, and modes', () => {
  assert.throws(() => projectContrastAcrossCvdModes('#zzzzzz', '#000000'), /invalid hex color/i);
  assert.throws(() => projectContrastAcrossCvdModes('#ffffff', '#000000', { aaThreshold: 0 }), /aa threshold/i);
  assert.throws(() => projectContrastAcrossCvdModes('#ffffff', '#000000', { modes: 'protanopia' }), /array/i);
  assert.throws(
    () => projectContrastAcrossCvdModes('#ffffff', '#000000', { modes: [{ id: 'blur', kind: 'filter' }] }),
    /matrix-based/i,
  );

  const scoped = projectContrastAcrossCvdModes('#ffffff', '#000000', {
    modes: CVD_MODES.filter((mode) => mode.id === 'deuteranopia'),
  });
  assert.equal(scoped.projections.length, 1);
  assert.equal(scoped.worst.id, 'deuteranopia');
});

test('rankSuggestionsByCvdSafety promotes pairs that hold AA across every CVD mode', () => {
  const ranked = rankSuggestionsByCvdSafety([
    { text: '#ff0000', background: '#000000', ratio: 5.25, score: 1 },
    { text: '#ffffff', background: '#000000', ratio: 21, score: 20 },
  ]);

  assert.equal(ranked[0].text, '#ffffff');
  assert.equal(ranked[0].cvdSafe, true);
  assert.equal(ranked[0].cvdFailingModes.length, 0);
  assert.equal(ranked[1].cvdSafe, false);
  assert.ok(ranked[1].cvdWorstRatio < 4.5);
});

test('rankSuggestionsByCvdSafety preserves source order among safe suggestions', () => {
  const ranked = rankSuggestionsByCvdSafety([
    { text: '#f8fafc', background: '#0f172a', ratio: 17 },
    { text: '#ffffff', background: '#000000', ratio: 21 },
  ]);

  assert.equal(ranked[0].text, '#f8fafc');
  assert.ok(ranked.every((pair) => pair.cvdSafe));
});

test('rankSuggestionsByCvdSafety validates suggestions and threshold', () => {
  assert.throws(() => rankSuggestionsByCvdSafety(null), /must be an array/i);
  assert.throws(() => rankSuggestionsByCvdSafety([null]), /must include text and background/i);
  assert.throws(
    () => rankSuggestionsByCvdSafety([{ text: '#ffffff', background: '#000000' }], 0),
    /AA threshold/i,
  );
});

test('apcaContrast matches published apca-w3 reference values', () => {
  const near = (actual, expected) => assert.ok(Math.abs(actual - expected) < 0.1, `${actual} !≈ ${expected}`);
  near(apcaContrast('#888888', '#ffffff'), 63.056);
  near(apcaContrast('#ffffff', '#888888'), -68.541);
  near(apcaContrast('#000000', '#aaaaaa'), 58.146);
  near(apcaContrast('#aaaaaa', '#000000'), -56.241);
  near(apcaContrast('#112233', '#ddeeff'), 91.668);
  near(apcaContrast('#ddeeff', '#112233'), -93.067);
});

test('evaluateApcaContrast reports polarity and usage ratings', () => {
  const dark = evaluateApcaContrast('#000000', '#ffffff');
  assert.equal(dark.polarity, 'dark-on-light');
  assert.equal(dark.level, 'preferred-body');
  assert.ok(dark.passesBodyText && dark.passesFluentText);

  const light = evaluateApcaContrast('#ffffff', '#000000');
  assert.equal(light.polarity, 'light-on-dark');
  assert.ok(light.lc < 0 && light.absLc > 100);

  const weak = evaluateApcaContrast('#777777', '#888888');
  assert.equal(weak.level, 'fail');
  assert.ok(!weak.passesNonText);
});

test('compareWcagVsApca flags perceptual false passes hidden from WCAG 2', () => {
  // #AAAAAA on #000000: WCAG 2 rates it 9.04:1 (passes AAA), gray survives
  // every CVD matrix unchanged, yet APCA scores Lc -56 — below fluent text.
  const comparison = compareWcagVsApca('#aaaaaa', '#000000');
  assert.ok(comparison.wcagRatio > 9);
  assert.ok(comparison.wcagPassesAA);
  assert.equal(comparison.falsePass, true);
  assert.equal(comparison.agreement, false);
  assert.ok(comparison.apca.lc < -50 && comparison.apca.lc > -60);

  const agreeing = compareWcagVsApca('#0f172a', '#f8fafc');
  assert.equal(agreeing.falsePass, false);
  assert.equal(agreeing.agreement, true);
  assert.ok(agreeing.apca.passesBodyText);
});

test('compareWcagVsApca accepts rgb objects and validates inputs', () => {
  const fromObjects = compareWcagVsApca({ r: 170, g: 170, b: 170 }, { r: 0, g: 0, b: 0 });
  assert.ok(Math.abs(fromObjects.apca.lc - -56.241) < 0.1);
  assert.throws(() => compareWcagVsApca('#not-a-color', '#000000'), /color/i);
  assert.throws(() => compareWcagVsApca('#ffffff', '#000000', { aaThreshold: 0 }), /AA threshold/i);
});

test('labDeltaE matches known perceptual anchors', () => {
  assert.ok(Math.abs(labDeltaE({ r: 0, g: 0, b: 0 }, { r: 255, g: 255, b: 255 }) - 100) < 0.01);
  assert.equal(labDeltaE({ r: 128, g: 64, b: 32 }, { r: 128, g: 64, b: 32 }), 0);
  assert.throws(() => labDeltaE(null, { r: 0, g: 0, b: 0 }), /color/i);
});

test('findCvdColorCollisions flags status-color pairs that collapse for color-blind users', () => {
  // Green vs amber — the dashboard demo sample's status colors. Clearly
  // distinct hues for typical vision, near-identical once hue is removed.
  const result = findCvdColorCollisions(['#16a34a', '#d97706', '#ffffff']);
  assert.equal(result.summary.evaluatedModes, 7);
  assert.ok(result.summary.collisions >= 1);

  const greenAmber = result.pairs.find(
    (pair) =>
      (pair.colorA === '#16A34A' && pair.colorB === '#D97706') ||
      (pair.colorA === '#D97706' && pair.colorB === '#16A34A'),
  );
  assert.ok(greenAmber, 'green vs amber must be flagged');
  assert.ok(greenAmber.baseDeltaE > 80, 'green and amber are clearly distinct for typical vision');
  assert.equal(greenAmber.worst.id, 'achromatopsia');
  assert.ok(greenAmber.worst.deltaE < 12, 'projected pair reads as near-identical');
  assert.ok(greenAmber.worst.retentionPercent < 15);
  assert.match(greenAmber.worst.projectedA.hex, /^#[0-9A-F]{6}$/);
  assert.match(greenAmber.worst.projectedB.hex, /^#[0-9A-F]{6}$/);
  // Colliding modes are sorted worst-first and pairs sorted by worst deltaE.
  const deltas = greenAmber.collidingModes.map((mode) => mode.deltaE);
  assert.deepEqual(deltas, [...deltas].sort((a, b) => a - b));
});

test('findCvdColorCollisions catches tritan amber/red collision beyond grayscale collapse', () => {
  const result = findCvdColorCollisions(['#d97706', '#dc2626']);
  assert.equal(result.summary.collisions, 1);
  const modeIds = result.pairs[0].collidingModes.map((mode) => mode.id);
  assert.ok(modeIds.includes('tritanopia'), `expected tritanopia in ${modeIds}`);
});

test('findCvdColorCollisions leaves luminance-separated pairs alone', () => {
  const result = findCvdColorCollisions([
    '#000000',
    '#ffffff',
    { hex: '#f8fafc' },
    { hex: '#0f172a' },
  ]);
  assert.equal(result.summary.collisions, 0);
  assert.equal(result.summary.worstPair, null);
  assert.ok(result.summary.candidatePairs >= 2);
});

test('findCvdColorCollisions skips near-identical base pairs and validates input', () => {
  // Base ΔE below the distinct threshold is a design choice, not a CVD issue.
  const similar = findCvdColorCollisions(['#334155', '#3b4a63']);
  assert.equal(similar.summary.candidatePairs, 0);
  assert.equal(similar.summary.collisions, 0);

  assert.throws(() => findCvdColorCollisions('nope'), /must be an array/i);
  assert.throws(() => findCvdColorCollisions(['#ff0000', '#00ff00'], { collisionThreshold: 40 }), /threshold/i);
  assert.throws(() => findCvdColorCollisions(['#ff0000', 'not-a-color']), /hex/i);
  assert.throws(() => findCvdColorCollisions(['#ff0000', '#00ff00'], { modes: [] }), /matrix-based/i);
});

test('computeAccessibilityScore returns 100/A for a clean full six-axis audit', () => {
  const result = computeAccessibilityScore({
    textRegions: [{ ratio: 7.2 }, { ratio: 5.1 }, { ratio: 12 }],
    cvdHiddenFailures: 0,
    apcaFalsePasses: 0,
    paletteSummary: { candidatePairs: 10, collisions: 0 },
    componentSummary: { evaluated: 4, failing: 0 },
    targetSizeSummary: { targets: 6, undersized: 0 },
  });
  assert.equal(result.score, 100);
  assert.equal(result.grade, 'A');
  assert.equal(result.verdictLabel, 'Excellent');
  assert.equal(result.scoredAxes, 6);
  assert.ok(result.axes.every((axis) => axis.score === 100));
});

test('computeAccessibilityScore blends mean and worst so one AA failure cannot be averaged away', () => {
  const result = computeAccessibilityScore({
    textRegions: [{ ratio: 7 }, { ratio: 7 }, { ratio: 7 }, { ratio: 2.75 }],
    cvdHiddenFailures: 0,
    apcaFalsePasses: 0,
  });
  // Failing region: 60 * (2.75-1)/(4.5-1) = 30; mean = 82.5; axis = 56.25.
  const textAxis = result.axes.find((axis) => axis.id === 'textContrast');
  assert.equal(textAxis.score, 56.3);
  // Palette axis has no data: composite = (40*56.25 + 25*100 + 15*100) / 80.
  assert.equal(result.score, 78);
  assert.equal(result.grade, 'C');
  const paletteAxis = result.axes.find((axis) => axis.id === 'colorIndependence');
  assert.equal(paletteAxis.score, null);
  assert.equal(result.scoredAxes, 3);
});

test('computeAccessibilityScore penalizes hidden CVD failures and APCA false passes on their own axes', () => {
  const result = computeAccessibilityScore({
    textRegions: [{ ratio: 5 }, { ratio: 5 }, { ratio: 5 }, { ratio: 5 }],
    cvdHiddenFailures: 1,
    apcaFalsePasses: 2,
  });
  assert.equal(result.axes.find((axis) => axis.id === 'cvdSafety').score, 75);
  assert.equal(result.axes.find((axis) => axis.id === 'perceptualContrast').score, 50);
  // (40*100 + 25*75 + 15*50) / 80 = 82.8 -> 83.
  assert.equal(result.score, 83);
  assert.equal(result.grade, 'B');
});

test('computeAccessibilityScore renormalizes weights when only the palette axis has data', () => {
  const result = computeAccessibilityScore({
    paletteSummary: { candidatePairs: 4, collisions: 1 },
  });
  assert.equal(result.score, 75);
  assert.equal(result.grade, 'C');
  assert.equal(result.scoredAxes, 1);
  assert.equal(result.axes.find((axis) => axis.id === 'textContrast').score, null);

  const empty = computeAccessibilityScore({});
  assert.equal(empty.score, null);
  assert.equal(empty.grade, null);
  assert.equal(empty.verdictLabel, 'Insufficient data');
  assert.equal(empty.scoredAxes, 0);
});

test('computeAccessibilityScore penalizes failing component surfaces as an independent WCAG 1.4.11 axis', () => {
  const result = computeAccessibilityScore({
    textRegions: [{ ratio: 7 }, { ratio: 7 }],
    componentSummary: { evaluated: 4, failing: 2 },
  });
  const axis = result.axes.find((candidate) => candidate.id === 'componentContrast');
  assert.equal(axis.score, 50);
  assert.match(axis.detail, /2 of 4 component surfaces fail 3:1/);
  assert.equal(result.scoredAxes, 4);
  assert.ok(result.score < 100);
});

test('computeAccessibilityScore penalizes undersized crowded targets as an independent WCAG 2.5.8 axis', () => {
  const result = computeAccessibilityScore({
    textRegions: [{ ratio: 7 }, { ratio: 7 }],
    targetSizeSummary: { targets: 4, undersized: 3 },
  });
  const axis = result.axes.find((candidate) => candidate.id === 'targetSize');
  assert.equal(axis.score, 25);
  assert.match(axis.detail, /3 of 4 targets fail 24×24/);
  assert.equal(result.scoredAxes, 4);
  assert.ok(result.score < 100);
});

test('computeAccessibilityScore validates its inputs', () => {
  assert.throws(() => computeAccessibilityScore(null), /must be an object/i);
  assert.throws(() => computeAccessibilityScore({ textRegions: 'nope' }), /array or null/i);
  assert.throws(() => computeAccessibilityScore({ textRegions: [{ ratio: 0.4 }] }), /at least 1/i);
  assert.throws(
    () => computeAccessibilityScore({ textRegions: [{ ratio: 5 }], cvdHiddenFailures: 2 }),
    /cannot exceed/i,
  );
  assert.throws(
    () => computeAccessibilityScore({ textRegions: [{ ratio: 5 }], apcaFalsePasses: -1 }),
    /non-negative integer/i,
  );
  assert.throws(
    () => computeAccessibilityScore({ paletteSummary: { candidatePairs: 2, collisions: 3 } }),
    /between 0 and/i,
  );
  assert.throws(
    () => computeAccessibilityScore({ componentSummary: { evaluated: 1, failing: 2 } }),
    /between 0 and/i,
  );
  assert.throws(
    () => computeAccessibilityScore({ targetSizeSummary: { targets: 1, undersized: 2 } }),
    /between 0 and/i,
  );
});

test('auditImageAccessibility runs the full six-axis audit headlessly', () => {
  const width = 144;
  const height = 96;
  const data = createSolidImage(width, height, [255, 255, 255]);
  // Low-contrast "text" band (~2.85:1, below AA) plus a compliant black band.
  paintVerticalStripes(data, width, 12, 12, 72, 24, [153, 153, 153]);
  paintVerticalStripes(data, width, 12, 60, 72, 24, [0, 0, 0]);

  const audit = auditImageAccessibility(data, width, height);
  assert.equal(audit.width, width);
  assert.equal(audit.height, height);
  assert.equal(audit.textScan.summary.total, 2);
  assert.equal(audit.textScan.summary.belowAA, 1);

  // Regions carry the same CVD/APCA augmentation the in-app scan attaches.
  audit.textScan.regions.forEach((region) => {
    assert.ok(region.cvd && Number.isFinite(region.cvd.worstRatio));
    assert.ok(typeof region.cvd.worstMode === 'string' && region.cvd.worstMode.length > 0);
    assert.ok(region.apca && Number.isFinite(region.apca.lc));
  });
  assert.ok(Number.isInteger(audit.textScan.summary.cvdHiddenFailures));
  assert.ok(Number.isInteger(audit.textScan.summary.apcaFalsePasses));

  assert.ok(audit.palette.colors.length >= 2, 'dominant palette extracted');
  assert.ok(audit.palette.collisions, 'collision scan ran');
  assert.ok(Number.isInteger(audit.palette.collisions.summary.candidatePairs));
  assert.ok(audit.componentContrast, 'component-surface scan ran');
  assert.ok(Number.isInteger(audit.componentContrast.summary.failing));
  assert.ok(audit.targetSizes, 'tap-target scan ran');
  assert.ok(Number.isInteger(audit.targetSizes.summary.undersized));
  assert.equal(audit.score.axes.length, 6);

  assert.ok(Number.isFinite(audit.score.score));
  assert.ok(audit.score.score > 0 && audit.score.score < 100, 'mixed screen scores between bounds');
  assert.ok(typeof audit.score.grade === 'string');
});

test('auditImageAccessibility scores palette-only images honestly and validates input', () => {
  const width = 60;
  const height = 48;
  const flat = createSolidImage(width, height, [240, 240, 240]);
  const audit = auditImageAccessibility(flat, width, height);
  assert.equal(audit.textScan.summary.total, 0);
  assert.equal(audit.score.score, null, 'no text and no distinct pairs yields insufficient data');
  assert.equal(audit.score.verdictLabel, 'Insufficient data');

  assert.throws(() => auditImageAccessibility(flat, 0, 0), /positive integers/i);
  assert.throws(() => auditImageAccessibility(flat, width, height, 'nope'), /options must be an object/i);
});

test('buildBatchAuditCsv serializes ranked entries with escaping and validates input', () => {
  const width = 144;
  const height = 96;
  const data = createSolidImage(width, height, [255, 255, 255]);
  paintVerticalStripes(data, width, 12, 12, 72, 24, [153, 153, 153]);
  paintVerticalStripes(data, width, 12, 60, 72, 24, [0, 0, 0]);
  const audit = auditImageAccessibility(data, width, height);
  const flatAudit = auditImageAccessibility(createSolidImage(60, 48, [240, 240, 240]), 60, 48);

  const csv = buildBatchAuditCsv([
    { name: 'checkout, "final".png', audit },
    { name: 'flat.png', audit: flatAudit },
  ]);
  const lines = csv.split('\n');
  assert.equal(lines.length, 3);
  assert.ok(lines[0].startsWith('rank,screen,width,height,clearsight_score,clearsight_grade'));
  assert.ok(lines[1].startsWith('1,"checkout, ""final"".png",144,96,'));
  assert.ok(lines[1].includes(`,${audit.score.score},${audit.score.grade},2,1,`));
  assert.ok(lines[2].startsWith('2,flat.png,60,48,,,0,0,'), 'unscored screens keep empty score cells');

  assert.throws(() => buildBatchAuditCsv('nope'), /must be an array/i);
  assert.throws(() => buildBatchAuditCsv([{ name: 'broken.png' }]), /must include an audit result/i);
});

function makeFlashFrames({ width, height, frames, durationMs = 100, paint }) {
  return Array.from({ length: frames }, (unused, frameIndex) => {
    const data = new Uint8ClampedArray(width * height * 4);
    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        const offset = (y * width + x) * 4;
        const value = paint(frameIndex, x, y);
        data[offset] = value.r;
        data[offset + 1] = value.g;
        data[offset + 2] = value.b;
        data[offset + 3] = 255;
      }
    }
    return { data, width, height, durationMs };
  });
}

test('analyzeFlashRisk flags full-frame fast strobing as high risk', () => {
  const frames = makeFlashFrames({
    width: 32,
    height: 32,
    frames: 12,
    durationMs: 100,
    paint: (frameIndex) => (frameIndex % 2 === 0 ? { r: 255, g: 255, b: 255 } : { r: 0, g: 0, b: 0 }),
  });
  const result = analyzeFlashRisk(frames);
  assert.equal(result.riskLevel, 'high');
  assert.ok(result.peakFlashesPerSecond > 3, 'strobe should exceed three flashes per second');
  assert.equal(result.peakViolatingAreaPercent, 100);
  assert.ok(result.worstWindow && result.worstWindow.endMs - result.worstWindow.startMs === 1000);
  assert.equal(result.frameCount, 12);
  assert.equal(result.averageFps, 10);
  assert.equal(result.luminanceTimeline.length, 12);
});

test('analyzeFlashRisk treats slow blinking as low risk', () => {
  const frames = makeFlashFrames({
    width: 16,
    height: 16,
    frames: 8,
    durationMs: 500,
    paint: (frameIndex) => (frameIndex % 2 === 0 ? { r: 255, g: 255, b: 255 } : { r: 0, g: 0, b: 0 }),
  });
  const result = analyzeFlashRisk(frames);
  assert.equal(result.riskLevel, 'low');
  assert.ok(result.peakFlashesPerSecond <= 1);
});

test('analyzeFlashRisk downgrades small-area strobing to caution', () => {
  const frames = makeFlashFrames({
    width: 64,
    height: 64,
    frames: 12,
    durationMs: 100,
    paint: (frameIndex, x, y) => {
      const insideStrobe = x < 8 && y < 8;
      if (insideStrobe && frameIndex % 2 === 0) {
        return { r: 255, g: 255, b: 255 };
      }
      return { r: 16, g: 16, b: 16 };
    },
  });
  const result = analyzeFlashRisk(frames);
  assert.equal(result.riskLevel, 'caution', 'one block of sixty-four is under the 25% area threshold');
  assert.ok(result.peakFlashesPerSecond > 3);
  assert.ok(result.peakViolatingAreaPercent < 25);
});

test('analyzeFlashRisk ignores bright-only flicker per the darker-luminance exemption', () => {
  const frames = makeFlashFrames({
    width: 16,
    height: 16,
    frames: 12,
    durationMs: 100,
    paint: (frameIndex) => (frameIndex % 2 === 0 ? { r: 255, g: 255, b: 255 } : { r: 240, g: 240, b: 240 }),
  });
  const result = analyzeFlashRisk(frames);
  assert.equal(result.riskLevel, 'low');
  assert.equal(result.totalFlashEvents, 0);
});

test('analyzeFlashRisk catches saturated-red flashes that evade the general luminance threshold', () => {
  const frames = makeFlashFrames({
    width: 32,
    height: 32,
    frames: 12,
    durationMs: 100,
    paint: (frameIndex) => (frameIndex % 2 === 0 ? { r: 255, g: 0, b: 0 } : { r: 0, g: 128, b: 0 }),
  });
  const result = analyzeFlashRisk(frames);
  assert.equal(result.riskLevel, 'high');
  assert.equal(result.peakGeneralFlashesPerSecond, 0, 'red/green luminance swing stays below 0.1');
  assert.ok(result.peakRedFlashesPerSecond > 3, 'chromatic red flashes independently exceed the rate limit');
  assert.equal(result.peakViolatingAreaPercent, 100);
  assert.ok(result.totalRedFlashEvents > 0);
});

test('planVideoFrameSampling spaces uniform sample times across the full clip', () => {
  const plan = planVideoFrameSampling(1400);
  assert.equal(plan.frameDurationMs, 100);
  assert.equal(plan.frameCount, 14);
  assert.equal(plan.totalFrames, 14);
  assert.equal(plan.truncated, false);
  assert.equal(plan.timesMs.length, 14);
  assert.equal(plan.timesMs[0], 0);
  assert.equal(plan.timesMs[13], 1300);
  assert.equal(plan.analyzedDurationMs, 1400);
  assert.ok(
    plan.timesMs.every((time) => time < 1400),
    'every sample time must be seekable inside the clip',
  );
});

test('planVideoFrameSampling truncates long videos at the frame cap and reports it', () => {
  const plan = planVideoFrameSampling(60000, { sampleFps: 10, maxFrames: 240 });
  assert.equal(plan.frameCount, 240);
  assert.equal(plan.totalFrames, 600);
  assert.equal(plan.truncated, true);
  assert.equal(plan.analyzedDurationMs, 24000);
  assert.equal(plan.timesMs[239], 23900);
});

test('planVideoFrameSampling validates duration, fps, and frame-cap inputs', () => {
  assert.throws(() => planVideoFrameSampling(Number.NaN), /positive, finite video duration/i);
  assert.throws(() => planVideoFrameSampling(-5), /positive, finite video duration/i);
  assert.throws(() => planVideoFrameSampling(150), /too short/i);
  assert.throws(() => planVideoFrameSampling(1000, { sampleFps: 0 }), /sampleFps/i);
  assert.throws(() => planVideoFrameSampling(1000, { maxFrames: 1 }), /maxFrames/i);
  const short = planVideoFrameSampling(320);
  assert.ok(short.frameCount >= 2, 'a just-long-enough clip still yields at least two frames');
});

test('analyzeFlashRisk validates its input', () => {
  const [single] = makeFlashFrames({
    width: 8,
    height: 8,
    frames: 1,
    paint: () => ({ r: 0, g: 0, b: 0 }),
  });
  assert.throws(() => analyzeFlashRisk([]), /at least two frames/i);
  assert.throws(() => analyzeFlashRisk([single, { ...single, width: 4 }]), /dimensions/i);
  assert.throws(
    () => analyzeFlashRisk([single, { width: 8, height: 8, data: new Uint8ClampedArray(4) }]),
    /RGBA buffer/i,
  );
  assert.throws(() => analyzeFlashRisk([single, single], { gridSize: 0 }), /gridSize/i);
});

function makeSolidFrame(width, height, [r, g, b]) {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let pixel = 0; pixel < width * height; pixel += 1) {
    data[pixel * 4] = r;
    data[pixel * 4 + 1] = g;
    data[pixel * 4 + 2] = b;
    data[pixel * 4 + 3] = 255;
  }
  return data;
}

test('computeFrameSignature averages colors per grid cell', () => {
  const width = 4;
  const height = 4;
  const data = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const offset = (y * width + x) * 4;
      const isLeft = x < 2;
      data[offset] = isLeft ? 255 : 0;
      data[offset + 2] = isLeft ? 0 : 255;
      data[offset + 3] = 255;
    }
  }

  const signature = computeFrameSignature(data, width, height, 2);
  assert.equal(signature.length, 12);
  // Cells 0 and 2 are the left (red) half; cells 1 and 3 are the right (blue) half.
  assert.deepEqual(signature.slice(0, 3), [255, 0, 0]);
  assert.deepEqual(signature.slice(3, 6), [0, 0, 255]);
  assert.deepEqual(signature.slice(6, 9), [255, 0, 0]);
  assert.deepEqual(signature.slice(9, 12), [0, 0, 255]);

  assert.throws(() => computeFrameSignature(data, 3, 4, 2), /length/);
  assert.throws(() => computeFrameSignature(data, width, height, 1), /grid size/i);
});

test('frameSignatureDistance is normalized to 0..1', () => {
  const black = computeFrameSignature(makeSolidFrame(8, 8, [0, 0, 0]), 8, 8, 2);
  const white = computeFrameSignature(makeSolidFrame(8, 8, [255, 255, 255]), 8, 8, 2);
  assert.equal(frameSignatureDistance(black, black), 0);
  assert.equal(frameSignatureDistance(black, white), 1);
  assert.throws(() => frameSignatureDistance(black, [1, 2, 3]), /same length/);
  assert.throws(() => frameSignatureDistance([], []), /non-empty/);
});

test('selectWalkthroughKeyframes keeps each distinct stable screen exactly once', () => {
  const screenA = [10, 10, 10];
  const screenAJitter = [10.5, 10.5, 10.5];
  const screenB = [120, 120, 120];
  const screenC = [200, 40, 90];
  const result = selectWalkthroughKeyframes([
    screenA, // kept: first stable frame
    screenAJitter, // duplicate of kept A
    screenB, // transition: differs sharply from the previous sample
    screenB, // kept: stable and distinct from A
    [121, 121, 121], // duplicate of kept B
    screenA, // transition back to A
    screenA, // duplicate: revisiting screen A must not re-capture it
    screenC, // transition
    screenC, // kept
  ]);

  assert.deepEqual(result.keptIndices, [0, 3, 8]);
  assert.deepEqual(result.summary, { total: 9, kept: 3, duplicates: 3, transitions: 3, overflow: 0 });
  assert.equal(result.decisions[0].nearestKeptDistance, null);
  assert.equal(result.decisions[6].status, 'duplicate');
  assert.equal(result.decisions[6].nearestKeptIndex, 0);
});

test('selectWalkthroughKeyframes marks distinct screens beyond the cap as overflow', () => {
  const result = selectWalkthroughKeyframes(
    [
      [10, 10, 10],
      [120, 120, 120],
      [120, 120, 120],
    ],
    { maxKeyframes: 1 },
  );
  assert.deepEqual(result.keptIndices, [0]);
  assert.equal(result.decisions[1].status, 'transition');
  assert.equal(result.decisions[2].status, 'overflow');
  assert.equal(result.summary.overflow, 1);
});

test('walkthrough keyframe selection works end-to-end from raw frames', () => {
  const width = 16;
  const height = 12;
  const frames = [
    makeSolidFrame(width, height, [244, 246, 251]),
    makeSolidFrame(width, height, [244, 246, 251]),
    makeSolidFrame(width, height, [15, 23, 42]),
    makeSolidFrame(width, height, [15, 23, 42]),
  ];
  const signatures = frames.map((frame) => computeFrameSignature(frame, width, height));
  const result = selectWalkthroughKeyframes(signatures);
  // Frame 2 is the first sight of the dark screen, so it reads as a transition;
  // frame 3 proves the screen is stable and becomes the keyframe.
  assert.deepEqual(result.keptIndices, [0, 3]);
  assert.equal(result.summary.duplicates, 1);
  assert.equal(result.summary.transitions, 1);
});

test('walkthrough keyframe helpers validate their input', () => {
  assert.throws(() => selectWalkthroughKeyframes([]), /non-empty/);
  assert.throws(
    () => evaluateWalkthroughFrame([1, 2, 3], null, [[1, 2, 3]], { maxKeyframes: 0 }),
    /positive integer/,
  );
  assert.throws(
    () => evaluateWalkthroughFrame([1, 2, 3], null, null),
    /must be an array/,
  );
  assert.throws(
    () => evaluateWalkthroughFrame([1, 2, 3], null, [], { distinctThreshold: 0 }),
    /Distinct threshold/,
  );
  assert.equal(WALKTHROUGH_KEYFRAME_DEFAULTS.maxKeyframes, 12);
});

function pdfToLatin1(bytes) {
  return Buffer.from(bytes).toString('latin1');
}

function makePdfAuditReport() {
  return {
    generatedAt: '2026-07-23T10:00:00.000Z',
    source: {
      fileName: 'sample-ui.png',
      renderedSize: { width: 680, height: 453 },
      originalSize: { width: 1440, height: 960 },
      wasDownscaled: false,
    },
    accessibilityScore: {
      score: 76,
      grade: 'C',
      verdictLabel: 'Needs attention',
      axes: [
        { id: 'textContrast', label: 'Text contrast (WCAG 2)', weight: 40, score: 71 },
        { id: 'cvdSafety', label: 'Color-vision safety', weight: 25, score: 80 },
      ],
    },
    topImpactMode: { label: 'Achromatopsia', impactPercent: 41.2, impactLevel: 'high' },
    contrast: {
      text: '#0F172A',
      background: '#FFFFFF',
      lastChecked: {
        ratio: 3.86,
        passesAA: false,
        passesAAA: false,
        cvdProjection: { hiddenFailure: true, worst: { ratio: 2.75, label: 'Tritanopia' } },
        apca: { lc: 55.2, rating: 'Spot text only', falsePass: true },
      },
    },
    textScan: {
      summary: { total: 6, belowAA: 2, cvdHiddenFailures: 1, apcaFalsePasses: 1 },
      regions: [
        {
          rank: 1,
          x: 620,
          y: 410,
          width: 180,
          height: 40,
          text: '#6B7280',
          background: '#F3F4F6',
          ratio: 3.86,
          levelLabel: 'Large text only',
          passesAA: false,
          cvdWorstRatio: 2.75,
          cvdWorstMode: 'Tritanopia',
          cvdHiddenFailure: false,
          apcaLc: 52.1,
          apcaFalsePass: true,
        },
      ],
    },
    paletteCollisions: {
      summary: { colorsEvaluated: 8, candidatePairs: 12, collisions: 3 },
      pairs: [
        {
          colorA: '#0F766E',
          colorB: '#0284C7',
          baseDeltaE: 46.8,
          worstModeLabel: 'Achromatopsia (full)',
          worstDeltaE: 5.3,
          retentionPercent: 11.3,
        },
      ],
    },
    flashScan: null,
    simulations: [
      { label: 'Achromatopsia', impactPercent: 41.2, impactLevel: 'high' },
      { label: 'Tritanopia', impactPercent: 22.9, impactLevel: 'medium' },
    ],
    remediationActions: [
      { priority: 'high', priorityLabel: 'High', text: 'Fix the flagged Export button pair.' },
    ],
  };
}

test('buildPdfReport writes a structurally valid PDF with correct xref offsets', () => {
  const bytes = buildPdfReport({
    title: 'ClearSight test report',
    subtitle: 'one screen',
    generatedAt: '2026-07-23',
    score: { value: 76, grade: 'C', label: 'Needs attention' },
    blocks: [
      { type: 'heading', text: 'Findings overview' },
      { type: 'text', text: 'One paragraph of findings.' },
      { type: 'keyValues', rows: [['Key metric', 'value']] },
    ],
  });
  const text = pdfToLatin1(bytes);

  assert.ok(text.startsWith('%PDF-1.4\n'));
  assert.ok(text.trimEnd().endsWith('%%EOF'));
  assert.match(text, /\/Type \/Catalog/);
  assert.match(text, /\/Count 1/);
  assert.match(text, /ClearSight test report/);
  assert.match(text, /Findings overview/);

  // Every xref entry must point at the matching "N 0 obj" header.
  const startxref = Number(text.match(/startxref\n(\d+)/)[1]);
  const xrefBlock = text.slice(startxref);
  const entries = xrefBlock.match(/\d{10} \d{5} [nf]/g);
  entries.slice(1).forEach((entry, index) => {
    const offset = Number(entry.slice(0, 10));
    assert.equal(
      text.slice(offset, offset + `${index + 1} 0 obj`.length),
      `${index + 1} 0 obj`,
      `xref entry ${index + 1} points at its object header`,
    );
  });
  assert.equal(PDF_GRADE_COLORS.F, '#e03131');
});

test('buildPdfReport paginates long content and numbers page footers', () => {
  const blocks = [];
  for (let index = 0; index < 90; index += 1) {
    blocks.push({ type: 'text', text: `Finding number ${index + 1} with enough words to occupy a full line of the page.` });
  }
  const text = pdfToLatin1(buildPdfReport({ title: 'Pagination test', blocks }));
  const pageCount = Number(text.match(/\/Count (\d+)/)[1]);
  assert.ok(pageCount >= 2, `expected 2+ pages, got ${pageCount}`);
  assert.match(text, new RegExp(`Page 1 of ${pageCount}`));
  assert.match(text, new RegExp(`Page ${pageCount} of ${pageCount}`));
});

test('buildPdfReport embeds a JPEG image as a DCTDecode XObject', () => {
  const fakeJpeg = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x13, 0x37, 0x42, 0x42, 0xff, 0xd9]);
  const text = pdfToLatin1(
    buildPdfReport({
      title: 'Image test',
      blocks: [{ type: 'heading', text: 'Audited screenshot' }, { type: 'image' }],
      image: { data: fakeJpeg, width: 4, height: 2 },
    }),
  );
  assert.match(text, /\/Subtype \/Image/);
  assert.match(text, /\/Filter \/DCTDecode/);
  assert.match(text, /\/Width 4 \/Height 2/);
  assert.match(text, /\/Im1 Do/);
  assert.ok(text.includes('\x13\x37\x42\x42'), 'raw image bytes are embedded verbatim');
});

test('buildPdfReport escapes delimiters and sanitizes unicode to WinAnsi', () => {
  const text = pdfToLatin1(
    buildPdfReport({
      title: 'Report (v1) — ΔE 46.8 → 5.3 ✓ 好',
      blocks: [{ type: 'text', text: 'Back\\slash and (parens) survive.' }],
    }),
  );
  assert.ok(text.includes('Report \\(v1\\) \x97 dE 46.8 -> 5.3 OK ?'));
  assert.ok(text.includes('Back\\\\slash and \\(parens\\) survive.'));
});

test('buildAuditPdfDoc maps the accessibility report into PDF blocks', () => {
  const report = makePdfAuditReport();
  const doc = buildAuditPdfDoc(report);

  assert.equal(doc.title, 'ClearSight accessibility audit');
  assert.match(doc.subtitle, /sample-ui\.png/);
  assert.equal(doc.score.value, 76);
  assert.equal(doc.score.grade, 'C');
  assert.equal(doc.image, null);
  assert.ok(!doc.blocks.some((block) => block.type === 'image'), 'no image block without an image');

  const rendered = pdfToLatin1(buildPdfReport(doc));
  assert.match(rendered, /#6B7280/);
  assert.match(rendered, /#0F766E vs #0284C7/);
  assert.match(rendered, /HIDDEN FAILURE/);
  assert.match(rendered, /PERCEPTUAL FALSE PASS/);
  assert.match(rendered, /Prioritized remediation plan/);
  assert.match(rendered, /Not scanned \\\(static image\\\)/);

  const fakeJpeg = new Uint8Array([0xff, 0xd8, 0xff, 0xd9]);
  const docWithImage = buildAuditPdfDoc(report, { image: { data: fakeJpeg, width: 8, height: 4 } });
  assert.ok(docWithImage.blocks.some((block) => block.type === 'image'));
  assert.match(pdfToLatin1(buildPdfReport(docWithImage)), /Audited screenshot/);
});

test('PDF builders validate their input', () => {
  assert.throws(() => buildPdfReport({ blocks: [] }), /title is required/);
  assert.throws(() => buildPdfReport({ title: 'x', blocks: [{ type: 'nope' }] }), /Unknown PDF block type/);
  assert.throws(
    () => buildPdfReport({ title: 'x', blocks: [], score: { value: 250 } }),
    /between 0 and 100/,
  );
  assert.throws(
    () => buildPdfReport({ title: 'x', blocks: [], image: { data: 'nope', width: 2, height: 2 } }),
    /Uint8Array/,
  );
  assert.throws(() => buildAuditPdfDoc(null), /report is required/);
});

test('buildShareableAuditPayload compacts a full report for URL sharing', () => {
  const report = makePdfAuditReport();
  const payload = buildShareableAuditPayload(report);

  assert.equal(payload.v, SHAREABLE_AUDIT_VERSION);
  assert.equal(payload.generatedAt, '2026-07-23T10:00:00.000Z');
  assert.equal(payload.source.name, 'sample-ui.png');
  assert.equal(payload.source.width, 1440);
  assert.equal(payload.source.height, 960);
  assert.equal(payload.score.score, 76);
  assert.equal(payload.score.grade, 'C');
  assert.equal(payload.score.axes.length, 2);
  assert.equal(payload.simulations[0].label, 'Achromatopsia');
  assert.equal(payload.textScan.regions, 6);
  assert.equal(payload.textScan.belowAA, 2);
  assert.equal(payload.textScan.worst[0].text, '#6B7280');
  assert.equal(payload.textScan.worst[0].apcaFalsePass, true);
  assert.equal(payload.collisions.total, 3);
  assert.equal(payload.collisions.pairs[0].colorA, '#0F766E');
  assert.equal(payload.contrast.ratio, 3.86);
  assert.equal(payload.contrast.cvdHiddenFailure, true);
  assert.equal(payload.contrast.apcaFalsePass, true);
  assert.equal(payload.flash, null);
  assert.equal(payload.remediation.length, 1);
  assert.equal(payload.remediation[0].priority, 'high');

  assert.throws(() => buildShareableAuditPayload(null), /report object/);
  assert.throws(() => buildShareableAuditPayload([1, 2]), /report object/);
});

test('buildShareableAuditPayload truncates long arrays to keep links small', () => {
  const report = makePdfAuditReport();
  report.simulations = Array.from({ length: 12 }, (_, i) => ({
    label: `Mode ${i}`,
    impactPercent: 40 - i,
    impactLevel: 'high',
  }));
  report.textScan.regions = Array.from({ length: 30 }, (_, i) => ({
    ...report.textScan.regions[0],
    rank: i + 1,
  }));
  report.remediationActions = Array.from({ length: 15 }, (_, i) => ({
    priority: 'low',
    priorityLabel: 'Low',
    text: `Action ${i}`,
  }));

  const payload = buildShareableAuditPayload(report);
  assert.equal(payload.simulations.length, SHAREABLE_AUDIT_LIMITS.maxSimulations);
  assert.equal(payload.textScan.worst.length, SHAREABLE_AUDIT_LIMITS.maxRegions);
  assert.equal(payload.remediation.length, SHAREABLE_AUDIT_LIMITS.maxActions);

  const encoded = JSON.stringify(payload);
  assert.ok(encoded.length < 8000, `compact payload stays small (got ${encoded.length} chars)`);
});

test('parseShareableAuditPayload round-trips and validates shared payloads', () => {
  const payload = buildShareableAuditPayload(makePdfAuditReport());
  const parsed = parseShareableAuditPayload(JSON.parse(JSON.stringify(payload)));

  assert.equal(parsed.version, SHAREABLE_AUDIT_VERSION);
  assert.equal(parsed.score.score, 76);
  assert.equal(parsed.score.grade, 'C');
  assert.equal(parsed.textScan.regions, 6);
  assert.equal(parsed.textScan.worst.length, 1);
  assert.equal(parsed.collisions.total, 3);
  assert.equal(parsed.contrast.passesAA, false);
  assert.equal(parsed.remediation.length, 1);

  assert.throws(() => parseShareableAuditPayload(null), /must be an object/);
  assert.throws(() => parseShareableAuditPayload('nope'), /must be an object/);
  assert.throws(() => parseShareableAuditPayload({ v: 99 }), /Unsupported shared audit payload version/);
  assert.throws(
    () => parseShareableAuditPayload({ v: SHAREABLE_AUDIT_VERSION, score: { score: 'high' } }),
    /score is malformed/,
  );

  const minimal = parseShareableAuditPayload({ v: SHAREABLE_AUDIT_VERSION });
  assert.equal(minimal.score, null);
  assert.deepEqual(minimal.simulations, []);
  assert.equal(minimal.textScan, null);

  const hostile = parseShareableAuditPayload({
    v: SHAREABLE_AUDIT_VERSION,
    simulations: [null, 'junk', { impactPercent: 12.5, label: 'ok' }],
    remediation: [{ priority: 'high' }, { priority: 'high', text: 'real action' }],
    textScan: { regions: -5, belowAA: 'x', worst: [null, { ratio: 4.2, text: '#000' }] },
  });
  assert.equal(hostile.simulations.length, 1);
  assert.equal(hostile.remediation.length, 1);
  assert.equal(hostile.textScan.regions, 0);
  assert.equal(hostile.textScan.belowAA, 0);
  assert.equal(hostile.textScan.worst.length, 1);
});

function makeCssSheetTextFix(overrides = {}) {
  return {
    region: { x: 40, y: 60, width: 180, height: 22, ratio: 2.31 },
    measured: { text: '#94a3b8', background: '#f1f5f9' },
    suggestion: { text: '#0f172a', background: '#f8fafc', ratio: 7.42 },
    ...overrides,
  };
}

function makeCssSheetComponentFix(overrides = {}) {
  return {
    box: { x: 300, y: 90, width: 220, height: 44 },
    ratio: 1.25,
    surface: '#dae2eb',
    surrounding: '#eef2f7',
    plan: {
      surface: '#1e293b',
      surfaceRatio: 11.42,
      text: '#f1f5f9',
      textRatio: 8.2,
      textApcaLc: 78.4,
      textAdjusted: true,
      paletteSafe: true,
    },
    ...overrides,
  };
}

test('buildCssFixSheet emits paste-ready custom properties and per-fix rules', () => {
  const sheet = buildCssFixSheet({
    sourceName: 'demo-ui.png',
    textFixes: [makeCssSheetTextFix()],
    componentFixes: [makeCssSheetComponentFix()],
    targetFixes: [{ box: { x: 410, y: 72, width: 16, height: 17 }, widthCss: 16, heightCss: 17, minTargetCss: 24 }],
  });

  assert.equal(sheet.fixCount, 3);
  assert.equal(sheet.textFixCount, 1);
  assert.equal(sheet.componentFixCount, 1);
  assert.equal(sheet.targetFixCount, 1);
  assert.match(sheet.css, /Source screenshot: demo-ui\.png/);
  assert.match(sheet.css, /1 text fix \(WCAG 1\.4\.3 contrast minimum\) · 1 component surface fix \(WCAG 1\.4\.11 non-text contrast\)/);
  assert.match(sheet.css, /:root \{/);
  assert.match(sheet.css, /--clearsight-text-1-color: #0F172A; \/\* was #94A3B8 \*\//);
  assert.match(sheet.css, /--clearsight-text-1-surface: #F8FAFC; \/\* was #F1F5F9 \*\//);
  assert.match(sheet.css, /--clearsight-component-1-surface: #1E293B; \/\* was #DAE2EB \*\//);
  assert.match(sheet.css, /--clearsight-component-1-text: #F1F5F9;/);
  assert.match(sheet.css, /measured 2\.31:1 → replacement 7\.42:1 \(AA target 4\.5:1\)/);
  assert.match(sheet.css, /surface vs page 1\.25:1 → 11\.42:1 against #EEF2F7 \(non-text minimum 3:1\)/);
  assert.match(sheet.css, /label recolored to hold 8\.20:1 on the new surface \(APCA Lc 78\)/);
  assert.match(sheet.css, /no new color-blind collisions/);
  assert.match(sheet.css, /\.clearsight-text-fix-1 \{\n {2}color: var\(--clearsight-text-1-color\);\n {2}background-color: var\(--clearsight-text-1-surface\);\n\}/);
  assert.match(sheet.css, /\.clearsight-component-fix-1 \{\n {2}background-color: var\(--clearsight-component-1-surface\);\n {2}color: var\(--clearsight-component-1-text\);\n\}/);
  assert.match(sheet.css, /1 tap-target fix \(WCAG 2\.5\.8 target size\)/);
  assert.match(sheet.css, /measured 16\.0×17\.0 CSS px; needs 24×24 CSS px/);
  assert.match(sheet.css, /\.clearsight-target-fix-1 \{\n {2}min-inline-size: 24px;\n {2}min-block-size: 24px;/);
  assert.match(sheet.css, /Replace this placeholder class with the control’s real selector/);
});

test('buildCssFixSheet is deterministic and honest about best-effort fixes', () => {
  const input = {
    textFixes: [
      makeCssSheetTextFix({ suggestion: { text: '#475569', background: '#e2e8f0', ratio: 3.9 } }),
    ],
    componentFixes: [
      makeCssSheetComponentFix({
        plan: {
          surface: '#c7d2de',
          surfaceRatio: 2.4,
          text: null,
          textRatio: 6.1,
          textApcaLc: 66.2,
          textAdjusted: false,
          paletteSafe: false,
        },
      }),
    ],
  };

  const first = buildCssFixSheet(input);
  const second = buildCssFixSheet(JSON.parse(JSON.stringify(input)));
  assert.equal(first.css, second.css);
  assert.match(first.css, /best effort 3\.90:1 — strongest reachable pair, still below the 4\.5:1 target/);
  assert.match(first.css, /best effort 2\.40:1 against #EEF2F7 — still below the 3:1 minimum/);
  assert.match(first.css, /existing label already holds 6\.10:1 on the new surface \(APCA Lc 66\) — no text change needed/);
  assert.match(first.css, /WARNING: could not verify palette safety under CVD/);
  assert.doesNotMatch(first.css, /--clearsight-component-1-text/);
  assert.doesNotMatch(first.css, /color: var\(--clearsight-component-1-text\)/);
});

test('buildCssFixSheet builds component-only and text-only sheets', () => {
  const componentOnly = buildCssFixSheet({ componentFixes: [makeCssSheetComponentFix()] });
  assert.equal(componentOnly.textFixCount, 0);
  assert.equal(componentOnly.componentFixCount, 1);
  assert.match(componentOnly.css, /1 component surface fix \(WCAG 1\.4\.11 non-text contrast\)/);
  assert.doesNotMatch(componentOnly.css, /WCAG 1\.4\.3/);

  const textOnly = buildCssFixSheet({ textFixes: [makeCssSheetTextFix(), makeCssSheetTextFix({ region: { x: 10, y: 12, width: 90, height: 16, ratio: 3.05 } })] });
  assert.equal(textOnly.textFixCount, 2);
  assert.match(textOnly.css, /2 text fixes \(WCAG 1\.4\.3 contrast minimum\)/);
  assert.match(textOnly.css, /--clearsight-text-2-color/);
  assert.match(textOnly.css, /\.clearsight-text-fix-2/);

  const targetOnly = buildCssFixSheet({
    targetFixes: [{ box: { x: 4, y: 8, width: 14, height: 15 }, widthCss: 14, heightCss: 15 }],
  });
  assert.equal(targetOnly.targetFixCount, 1);
  assert.match(targetOnly.css, /WCAG 2\.5\.8 target size/);
});

test('buildCssFixSheet validates its input instead of emitting broken CSS', () => {
  assert.throws(() => buildCssFixSheet(), /At least one text, component, or target fix/);
  assert.throws(() => buildCssFixSheet({ textFixes: [], componentFixes: [] }), /At least one text, component, or target fix/);
  assert.throws(() => buildCssFixSheet(null), /must be an object/);
  assert.throws(
    () => buildCssFixSheet({ textFixes: [makeCssSheetTextFix({ measured: { text: 'not-a-color', background: '#fff' } })] }),
    /Text fix 1 measured text color must be a valid color/,
  );
  assert.throws(
    () => buildCssFixSheet({ textFixes: [makeCssSheetTextFix({ region: { x: 1, y: 2, width: 0, height: 10, ratio: 2 } })] }),
    /bounding box must have finite coordinates and positive dimensions/,
  );
  assert.throws(
    () => buildCssFixSheet({ textFixes: [makeCssSheetTextFix({ suggestion: { text: '#000', background: '#fff', ratio: 0.5 } })] }),
    /replacement ratio must be a finite contrast ratio/,
  );
  assert.throws(
    () => buildCssFixSheet({ componentFixes: [{ box: { x: 1, y: 1, width: 5, height: 5 }, ratio: 1.2, surface: '#fff', surrounding: '#eee' }] }),
    /Component fix 1 must include a repair plan/,
  );
  assert.throws(
    () => buildCssFixSheet({ textFixes: [makeCssSheetTextFix()], aaThreshold: 0 }),
    /AA threshold/,
  );
});

test('buildCssFixSheet round-trips real scan and plan output', () => {
  const width = 240;
  const height = 160;
  const data = createSolidImage(width, height, [248, 250, 252]);
  paintRect(data, width, 40, 50, 160, 60, [221, 229, 238]);
  paintVerticalStripes(data, width, 64, 68, 96, 24, [71, 85, 105]);

  const { regions } = detectTextLikeRegions(data, width, height);
  assert.ok(regions.length >= 1);
  const scan = scanComponentSurfaceContrast(data, width, height, regions);
  assert.ok(scan.findings.length >= 1);
  const finding = scan.findings[0];
  const region = regions[finding.regionIndex];
  const plan = planComponentSurfaceRepair(finding.surface.rgb, finding.surrounding.rgb, region?.text?.rgb || null, {
    minRatio: 3.3,
    textMinRatio: 5,
    textMinApcaLc: 62,
  });
  assert.ok(plan && plan.surfaceRatio >= 3);

  const sheet = buildCssFixSheet({
    sourceName: 'synthetic.png',
    componentFixes: [
      {
        box: finding.box,
        ratio: finding.ratio,
        surface: finding.surface.hex,
        surrounding: finding.surrounding.hex,
        plan: {
          surface: plan.surface.hex,
          surfaceRatio: plan.surfaceRatio,
          text: plan.textAdjusted ? plan.text?.hex || null : null,
          textRatio: plan.textRatio,
          textApcaLc: plan.textApcaLc,
          textAdjusted: plan.textAdjusted,
          paletteSafe: plan.paletteSafe,
        },
      },
    ],
  });

  assert.equal(sheet.componentFixCount, 1);
  assert.match(sheet.css, new RegExp(`--clearsight-component-1-surface: ${plan.surface.hex.toUpperCase()};`));
  assert.match(sheet.css, /non-text minimum 3:1|still below the 3:1 minimum/);
  assert.equal(CSS_FIX_SHEET_DEFAULTS.componentMinRatio, 3);
});

const FAILING_CONFORMANCE_REPORT = {
  generatedAt: '2026-07-23T00:00:00.000Z',
  source: { fileName: 'checkout.png' },
  accessibilityScore: { score: 61, grade: 'D' },
  textScan: {
    summary: { total: 8, aaa: 3, aa: 3, aaLargeOnly: 1, fail: 1, belowAA: 2, cvdHiddenFailures: 2, apcaFalsePasses: 1 },
    regions: [{ ratio: 3.86, text: '#EEF6FB', background: '#0585C8', x: 40, y: 60 }],
  },
  paletteCollisions: {
    summary: { colorsEvaluated: 6, candidatePairs: 9, collisions: 3, evaluatedModes: 7 },
    pairs: [
      {
        colorA: '#0F766E',
        colorB: '#0284C7',
        baseDeltaE: 46.8,
        worstModeLabel: 'Achromatopsia',
        worstDeltaE: 5.3,
      },
    ],
  },
  componentContrast: {
    summary: { evaluated: 7, failing: 1, minRatio: 3, worstRatio: 1.25 },
    findings: [{ ratio: 1.25, surface: '#DAE2EB', surrounding: '#F8FAFC' }],
  },
  targetSizes: {
    summary: { targets: 10, undersized: 3, spacingExempt: 1, minTargetCss: 24, worst: { widthCss: 15.5, heightCss: 16 } },
  },
  flashScan: {
    label: 'promo.webm',
    riskLevel: 'high',
    peakFlashesPerSecond: 5,
    peakViolatingAreaPercent: 62.5,
    totalRedFlashEvents: 4,
    frameCount: 40,
  },
};

test('buildWcagConformanceSummary maps a fully failing audit to Does Not Support with measured evidence', () => {
  const summary = buildWcagConformanceSummary(FAILING_CONFORMANCE_REPORT);
  const byId = Object.fromEntries(summary.criteria.map((criterion) => [criterion.id, criterion]));

  assert.equal(summary.criteria.length, 6);
  assert.equal(byId['1.4.1'].outcome, 'fails');
  assert.match(byId['1.4.1'].evidence, /#0F766E vs #0284C7/);
  assert.match(byId['1.4.1'].evidence, /Achromatopsia/);
  assert.equal(byId['1.4.3'].outcome, 'fails');
  assert.match(byId['1.4.3'].evidence, /2 of 8 detected text regions/);
  assert.match(byId['1.4.3'].evidence, /3\.86:1 \(#EEF6FB on #0585C8/);
  assert.equal(byId['1.4.6'].outcome, 'fails');
  assert.match(byId['1.4.6'].evidence, /5 of 8/);
  assert.equal(byId['1.4.11'].outcome, 'fails');
  assert.match(byId['1.4.11'].evidence, /1\.25:1 \(#DAE2EB vs #F8FAFC\)/);
  assert.equal(byId['2.3.1'].outcome, 'fails');
  assert.match(byId['2.3.1'].evidence, /5 flashes\/sec across 62\.5%/);
  assert.match(byId['2.3.1'].evidence, /4 saturated-red flash events/);
  assert.equal(byId['2.5.8'].outcome, 'fails');
  assert.match(byId['2.5.8'].evidence, /3 of 10 targets/);
  assert.match(byId['2.5.8'].evidence, /smallest 15\.5x16 px/);

  assert.deepEqual(summary.counts, { supports: 0, partial: 0, fails: 6, notEvaluated: 0 });
  assert.equal(summary.verdict, 'fails');
  assert.deepEqual(summary.score, { score: 61, grade: 'D' });

  const advisoriesById = Object.fromEntries(summary.advisories.map((advisory) => [advisory.id, advisory]));
  assert.equal(advisoriesById['cvd-contrast'].outcome, 'fails');
  assert.match(advisoriesById['cvd-contrast'].evidence, /2 text regions pass WCAG 2 AA/);
  assert.equal(advisoriesById.apca.outcome, 'fails');
  assert.match(advisoriesById.apca.evidence, /1 text region pass/);
});

test('buildWcagConformanceSummary reports Supports on a clean audit and Partially Supports for caution flash', () => {
  const cleanReport = {
    textScan: {
      summary: { total: 5, aaa: 5, aa: 0, aaLargeOnly: 0, fail: 0, belowAA: 0, cvdHiddenFailures: 0, apcaFalsePasses: 0 },
      regions: [{ ratio: 8.2, text: '#0F172A', background: '#FFFFFF', x: 0, y: 0 }],
    },
    paletteCollisions: { summary: { colorsEvaluated: 5, candidatePairs: 6, collisions: 0, evaluatedModes: 7 }, pairs: [] },
    componentContrast: { summary: { evaluated: 4, failing: 0, minRatio: 3, worstRatio: null }, findings: [] },
    targetSizes: { summary: { targets: 6, undersized: 0, spacingExempt: 2, minTargetCss: 24, worst: null } },
    flashScan: { label: 'hero.gif', riskLevel: 'low', peakFlashesPerSecond: 1, peakViolatingAreaPercent: 0, totalRedFlashEvents: 0, frameCount: 24 },
  };
  const summary = buildWcagConformanceSummary(cleanReport);
  assert.deepEqual(summary.counts, { supports: 6, partial: 0, fails: 0, notEvaluated: 0 });
  assert.equal(summary.verdict, 'supports');
  assert.equal(summary.score, null);
  const targetRow = summary.criteria.find((criterion) => criterion.id === '2.5.8');
  assert.match(targetRow.evidence, /2 undersized but spacing-exempt/);
  assert.ok(summary.advisories.every((advisory) => advisory.outcome === 'supports'));

  const cautionSummary = buildWcagConformanceSummary({
    ...cleanReport,
    flashScan: { ...cleanReport.flashScan, riskLevel: 'caution', peakFlashesPerSecond: 3 },
  });
  const flashRow = cautionSummary.criteria.find((criterion) => criterion.id === '2.3.1');
  assert.equal(flashRow.outcome, 'partial');
  assert.equal(cautionSummary.verdict, 'partial');
});

test('buildWcagConformanceSummary marks missing axes Not Evaluated instead of guessing', () => {
  const summary = buildWcagConformanceSummary({});
  assert.equal(summary.criteria.length, 6);
  assert.ok(summary.criteria.every((criterion) => criterion.outcome === 'not-evaluated'));
  assert.deepEqual(summary.counts, { supports: 0, partial: 0, fails: 0, notEvaluated: 6 });
  assert.equal(summary.verdict, 'not-evaluated');
  const flashRow = summary.criteria.find((criterion) => criterion.id === '2.3.1');
  assert.match(flashRow.evidence, /Static screenshot only/);
  assert.ok(summary.advisories.every((advisory) => advisory.outcome === 'not-evaluated'));

  assert.throws(() => buildWcagConformanceSummary(null), /accessibility report object/);
  assert.throws(() => buildWcagConformanceSummary([]), /accessibility report object/);
});

test('buildConformanceStatementMarkdown renders VPAT-style tables with honest scope and manual criteria', () => {
  const markdown = buildConformanceStatementMarkdown(FAILING_CONFORMANCE_REPORT);
  assert.match(markdown, /^# WCAG conformance summary — checkout\.png/);
  assert.match(markdown, /- Generated: 2026-07-23T00:00:00\.000Z/);
  assert.match(markdown, /- ClearSight Score: 61\/100 \(Grade D\)/);
  assert.match(markdown, /0 supports · 0 partially supports · 6 does not support · 0 not evaluated/);
  assert.match(markdown, /## Honest scope/);
  assert.match(markdown, /not a legal conformance claim/);
  assert.match(markdown, /\| Criterion \| Level \| Outcome \| Evidence \|/);
  assert.match(markdown, /\| 1\.4\.3 Contrast \(Minimum\) \| AA \| Does Not Support \|/);
  assert.match(markdown, /\| 2\.5\.8 Target Size \(Minimum\) \| AA \| Does Not Support \|/);
  assert.match(markdown, /## Advisory lenses \(beyond WCAG 2\.2\)/);
  assert.match(markdown, /APCA perceptual contrast \(WCAG 3 draft\)/);
  assert.match(markdown, /## Requires manual testing/);
  for (const manualCriterion of CONFORMANCE_MANUAL_CRITERIA) {
    assert.ok(markdown.includes(`${manualCriterion.id} ${manualCriterion.name}`));
  }
  assert.equal(CONFORMANCE_OUTCOME_LABELS.fails, 'Does Not Support');
});

test('buildConformanceStatementMarkdown escapes pipes and honors source/date overrides', () => {
  const hostileReport = {
    ...FAILING_CONFORMANCE_REPORT,
    flashScan: { ...FAILING_CONFORMANCE_REPORT.flashScan, label: 'promo|clip.webm' },
  };
  const markdown = buildConformanceStatementMarkdown(hostileReport, {
    sourceName: 'renamed.png',
    generatedAt: '2026-07-23T12:00:00.000Z',
  });
  assert.match(markdown, /^# WCAG conformance summary — renamed\.png/);
  assert.match(markdown, /- Generated: 2026-07-23T12:00:00\.000Z/);
  assert.ok(markdown.includes('promo\\|clip.webm'));
  assert.ok(!markdown.includes('promo|clip.webm'));
});

// Structural QR reader used to round-trip encoder output: reads the format info
// back out of the matrix (verifying its BCH code), unmasks, walks the zigzag,
// deinterleaves blocks, recomputes every Reed-Solomon block, and parses byte mode.
function decodeQrStructural(qr) {
  const { size, modules, functionModules } = qr;
  const version = (size - 17) / 4;

  let formatBits = 0;
  for (let i = 0; i < 15; i += 1) {
    let row;
    if (i < 6) {
      row = i;
    } else if (i < 8) {
      row = i + 1;
    } else {
      row = size - 15 + i;
    }
    formatBits |= modules[row * size + 8] << i;
  }
  const format = formatBits ^ 0b101010000010010;
  let bchCheck = format;
  for (let bit = 14; bit >= 10; bit -= 1) {
    if ((bchCheck >> bit) & 1) {
      bchCheck ^= 0b10100110111 << (bit - 10);
    }
  }
  assert.equal(bchCheck, 0, 'format info must be a valid BCH(15,5) codeword');
  const formatData = format >> 10;
  const maskId = formatData & 0b111;
  const ecBits = formatData >> 3;
  const ecLevel = ecBits === 0b01 ? 'L' : ecBits === 0b00 ? 'M' : null;
  assert.ok(ecLevel, 'format info must declare a supported EC level');
  assert.equal(maskId, qr.maskId);
  assert.equal(ecLevel, qr.ecLevel);

  const maskAt = (row, col) => {
    switch (maskId) {
      case 0: return (row + col) % 2 === 0;
      case 1: return row % 2 === 0;
      case 2: return col % 3 === 0;
      case 3: return (row + col) % 3 === 0;
      case 4: return (Math.floor(row / 2) + Math.floor(col / 3)) % 2 === 0;
      case 5: return ((row * col) % 2) + ((row * col) % 3) === 0;
      case 6: return (((row * col) % 2) + ((row * col) % 3)) % 2 === 0;
      default: return (((row * col) % 3) + ((row + col) % 2)) % 2 === 0;
    }
  };

  const bits = [];
  let row = size - 1;
  let direction = -1;
  for (let col = size - 1; col > 0; col -= 2) {
    if (col === 6) {
      col -= 1;
    }
    for (;;) {
      for (let c = 0; c < 2; c += 1) {
        const currentCol = col - c;
        const index = row * size + currentCol;
        if (!functionModules[index]) {
          let bit = modules[index] === 1;
          if (maskAt(row, currentCol)) {
            bit = !bit;
          }
          bits.push(bit ? 1 : 0);
        }
      }
      row += direction;
      if (row < 0 || row >= size) {
        row -= direction;
        direction = -direction;
        break;
      }
    }
  }

  const { ecPerBlock, blocks } = qrBlockStructure(version, ecLevel);
  const totalCodewords = blocks.reduce((sum, len) => sum + len, 0) + ecPerBlock * blocks.length;
  const codewords = [];
  for (let i = 0; i < totalCodewords; i += 1) {
    let byte = 0;
    for (let j = 0; j < 8; j += 1) {
      byte = (byte << 1) | bits[i * 8 + j];
    }
    codewords.push(byte);
  }

  const dataBlocks = blocks.map(() => []);
  const maxDataLength = Math.max(...blocks);
  let cursor = 0;
  for (let i = 0; i < maxDataLength; i += 1) {
    blocks.forEach((length, blockIndex) => {
      if (i < length) {
        dataBlocks[blockIndex].push(codewords[cursor]);
        cursor += 1;
      }
    });
  }
  const ecBlocks = blocks.map(() => []);
  for (let i = 0; i < ecPerBlock; i += 1) {
    blocks.forEach((length, blockIndex) => {
      ecBlocks[blockIndex].push(codewords[cursor]);
      cursor += 1;
    });
  }
  dataBlocks.forEach((block, blockIndex) => {
    assert.deepEqual(ecBlocks[blockIndex], qrReedSolomonEncode(block, ecPerBlock), `EC block ${blockIndex} must match a recomputed Reed-Solomon code`);
  });

  const dataCodewords = [];
  const maxLength = Math.max(...blocks);
  for (let blockIndex = 0; blockIndex < blocks.length; blockIndex += 1) {
    dataBlocks[blockIndex].forEach((byte) => dataCodewords.push(byte));
  }
  const stream = dataCodewords;
  const readBits = (offset, length) => {
    let value = 0;
    for (let i = 0; i < length; i += 1) {
      const bitIndex = offset + i;
      value = (value << 1) | ((stream[Math.floor(bitIndex / 8)] >> (7 - (bitIndex % 8))) & 1);
    }
    return value;
  };
  assert.equal(readBits(0, 4), 0b0100, 'payload must be byte-mode encoded');
  const countBits = version >= 10 ? 16 : 8;
  const byteCount = readBits(4, countBits);
  const payload = new Uint8Array(byteCount);
  for (let i = 0; i < byteCount; i += 1) {
    payload[i] = readBits(4 + countBits + i * 8, 8);
  }
  return { version, ecLevel, maskId, text: new TextDecoder().decode(payload) };
}

test('QR Reed-Solomon codewords match the published byte-mode reference vector', () => {
  // "HELLO WORLD" as a version 1-M byte stream — EC codewords documented in the
  // widely-cited ISO/IEC 18004 worked example.
  const data = [32, 91, 11, 120, 209, 114, 220, 77, 67, 64, 236, 17, 236, 17, 236, 17];
  assert.deepEqual(qrReedSolomonEncode(data, 10), [196, 35, 39, 119, 235, 215, 231, 226, 93, 23]);
  assert.equal(qrReedSolomonEncode([1, 2, 3], 7).length, 7);
  assert.throws(() => qrReedSolomonEncode('nope', 7), /array of codewords/);
  assert.throws(() => qrReedSolomonEncode([1], 0), /between 1 and 68/);
});

test('QR format and version information match ISO/IEC 18004 reference values', () => {
  assert.equal(qrFormatInfoBits('L', 4), 0b110011000101111);
  assert.equal(qrVersionInfoBits(7), 0b000111110010010100);
  const seen = new Set();
  ['L', 'M'].forEach((level) => {
    for (let maskId = 0; maskId < 8; maskId += 1) {
      const bits = qrFormatInfoBits(level, maskId);
      const unmasked = bits ^ 0b101010000010010;
      let check = unmasked;
      for (let bit = 14; bit >= 10; bit -= 1) {
        if ((check >> bit) & 1) {
          check ^= 0b10100110111 << (bit - 10);
        }
      }
      assert.equal(check, 0);
      seen.add(bits);
    }
  });
  assert.equal(seen.size, 16, 'all 16 format codewords must be distinct');
  assert.throws(() => qrFormatInfoBits('Q', 0), /Supported: L, M/);
  assert.throws(() => qrFormatInfoBits('L', 8), /between 0 and 7/);
  assert.throws(() => qrVersionInfoBits(6), /versions 7 through 40/);
});

test('encodeQrMatrix produces spec-shaped matrices with honest version selection', () => {
  const qr = encodeQrMatrix('https://example.com/audit');
  assert.equal(qr.size, 17 + qr.version * 4);
  assert.equal(qr.modules.length, qr.size * qr.size);
  const at = (row, col) => qr.modules[row * qr.size + col];
  // Finder cores are dark in all three corners; separators beside them are light.
  [[3, 3], [3, qr.size - 4], [qr.size - 4, 3]].forEach(([r, c]) => assert.equal(at(r, c), 1));
  [[7, 7], [7, qr.size - 8], [qr.size - 8, 7]].forEach(([r, c]) => assert.equal(at(r, c), 0));
  // Timing pattern alternates between the finders on row/column 6.
  for (let i = 8; i <= qr.size - 9; i += 1) {
    assert.equal(at(6, i), i % 2 === 0 ? 1 : 0);
    assert.equal(at(i, 6), i % 2 === 0 ? 1 : 0);
  }
  assert.equal(at(qr.size - 8, 8), 1, 'the fixed dark module must be present');
  assert.ok(qr.maskId >= 0 && qr.maskId <= 7);
  assert.equal(qr.ecLevel, 'M', 'auto EC prefers level M when the payload fits');

  const nearCapacityM = encodeQrMatrix('a'.repeat(2300));
  assert.equal(nearCapacityM.ecLevel, 'M');
  const beyondM = encodeQrMatrix('a'.repeat(2500));
  assert.equal(beyondM.ecLevel, 'L', 'auto EC falls back to L when M cannot hold the payload');
  assert.equal(beyondM.version, 37);
  assert.ok(encodeQrMatrix('a'.repeat(20)).version < encodeQrMatrix('a'.repeat(500)).version);
});

test('encodeQrMatrix round-trips through a structural decoder at small, medium, and max size', () => {
  const payloads = [
    'https://arjundevensharma.github.io/clearsight/#share=1z.short-token ✓',
    `https://arjundevensharma.github.io/clearsight/#share=1z.${'Ab9_-'.repeat(130)}`,
    'x'.repeat(2953),
  ];
  payloads.forEach((payload) => {
    const qr = encodeQrMatrix(payload);
    const decoded = decodeQrStructural(qr);
    assert.equal(decoded.text, payload);
    assert.equal(decoded.version, qr.version);
  });
  const max = encodeQrMatrix('x'.repeat(2953));
  assert.equal(max.version, 40);
  assert.equal(max.ecLevel, 'L');
});

test('encodeQrMatrix validates payloads, levels, and version bounds', () => {
  assert.throws(() => encodeQrMatrix(''), /non-empty string/);
  assert.throws(() => encodeQrMatrix(42), /non-empty string/);
  assert.throws(() => encodeQrMatrix('x'.repeat(2954)), /2953 bytes/);
  assert.throws(() => encodeQrMatrix('hello', { ecLevel: 'H' }), /Supported: L, M, auto/);
  assert.throws(() => encodeQrMatrix('a'.repeat(2500), { ecLevel: 'M' }), /largest supported code holds/);
  assert.throws(() => encodeQrMatrix('hello', { minVersion: 0 }), /1 <= minVersion/);
  assert.throws(() => encodeQrMatrix('hello', { minVersion: 5, maxVersion: 4 }), /1 <= minVersion/);
  assert.equal(QR_ENCODE_DEFAULTS.quietZone, 4);
});

function buildFocusTestFrames({ ringColor = null, ringThickness = 3 } = {}) {
  const width = 120;
  const height = 80;
  const paintRect = (data, hex, x0, y0, w, h) => {
    const { r, g, b } = parseHexColor(hex);
    for (let y = y0; y < y0 + h; y += 1) {
      for (let x = x0; x < x0 + w; x += 1) {
        const i = (y * width + x) * 4;
        data[i] = r;
        data[i + 1] = g;
        data[i + 2] = b;
        data[i + 3] = 255;
      }
    }
  };
  const buildFrame = (withRing) => {
    const data = new Uint8ClampedArray(width * height * 4);
    paintRect(data, '#F8FAFC', 0, 0, width, height);
    paintRect(data, '#0F766E', 30, 25, 60, 20);
    if (withRing && ringColor) {
      const t = ringThickness;
      paintRect(data, ringColor, 30 - t, 25 - t, 60 + 2 * t, t);
      paintRect(data, ringColor, 30 - t, 45, 60 + 2 * t, t);
      paintRect(data, ringColor, 30 - t, 25, t, 20);
      paintRect(data, ringColor, 90, 25, t, 20);
    }
    return data;
  };
  return { width, height, base: buildFrame(false), focus: buildFrame(true) };
}

test('analyzeFocusIndicator measures a strong focus ring against the WCAG 2.4.13 metrics', () => {
  const { width, height, base, focus } = buildFocusTestFrames({ ringColor: '#1D4ED8', ringThickness: 3 });
  const result = analyzeFocusIndicator(base, focus, width, height);

  // Ring: outer 66x26 box minus inner 60x20 button area = 516 pixels.
  assert.equal(result.changedPixels, 516);
  assert.equal(result.contrastingPixels, 516);
  assert.deepEqual(result.boundingBox, { x: 27, y: 22, width: 66, height: 26 });
  assert.equal(result.requiredIndicatorArea, 2 * 66 + 2 * 26 - 4);
  assert.equal(result.verdict, 'strong');
  assert.equal(result.verdictLabel, FOCUS_APPEARANCE_LABELS.strong);
  assert.equal(result.focusVisibleOutcome, 'supports');
  assert.equal(result.focusAppearanceOutcome, 'supports');
  assert.ok(result.meanChangeRatio > 3, `mean change ratio ${result.meanChangeRatio}`);
  assert.ok(labDeltaE(parseHexColor(result.indicatorColor), parseHexColor('#1D4ED8')) < 10);
  assert.ok(labDeltaE(parseHexColor(result.baseColor), parseHexColor('#F8FAFC')) < 6);
  const boxIndex = (23 * width + 28);
  assert.equal(result.mask[boxIndex], 2);
  assert.equal(result.mask[0], 0);

  // A 2x retina pair halves CSS dimensions: area still clears the perimeter bar.
  const retina = analyzeFocusIndicator(base, focus, width, height, { cssPixelRatio: 2 });
  assert.equal(retina.contrastingAreaCss, 129);
  assert.equal(retina.requiredIndicatorArea, 2 * 33 + 2 * 13 - 4);
  assert.equal(retina.verdict, 'strong');
});

test('analyzeFocusIndicator flags a faint ring as visible but below the 2.4.13 bar', () => {
  const { width, height, base, focus } = buildFocusTestFrames({ ringColor: '#D8E0EA', ringThickness: 2 });
  const result = analyzeFocusIndicator(base, focus, width, height);

  assert.ok(result.changedPixels > 100, `changed ${result.changedPixels}`);
  assert.equal(result.contrastingPixels, 0);
  assert.equal(result.verdict, 'weak');
  assert.equal(result.focusVisibleOutcome, 'partial');
  assert.equal(result.focusAppearanceOutcome, 'fails');
  assert.ok(result.maxChangeRatio < 3);
});

test('analyzeFocusIndicator reports no indicator for identical frames and ignores sub-threshold noise', () => {
  const { width, height, base, focus } = buildFocusTestFrames({ ringColor: null });
  const identical = analyzeFocusIndicator(base, focus, width, height);
  assert.equal(identical.verdict, 'none');
  assert.equal(identical.changedPixels, 0);
  assert.equal(identical.boundingBox, null);
  assert.equal(identical.meanChangeRatio, null);
  assert.equal(identical.indicatorColor, null);
  assert.equal(identical.focusVisibleOutcome, 'fails');

  // +/-2-count compression noise across a whole row stays invisible.
  const noisy = focus.slice();
  for (let x = 0; x < width; x += 1) {
    const i = (10 * width + x) * 4;
    noisy[i] = Math.min(255, noisy[i] + 2);
    noisy[i + 2] = Math.max(0, noisy[i + 2] - 2);
  }
  assert.equal(analyzeFocusIndicator(base, noisy, width, height).verdict, 'none');

  // A visible change smaller than minChangedPixels is honestly "none", not "weak".
  const tiny = focus.slice();
  for (let x = 0; x < 4; x += 1) {
    const i = (5 * width + (5 + x)) * 4;
    tiny[i] = 0;
    tiny[i + 1] = 0;
    tiny[i + 2] = 0;
  }
  assert.equal(analyzeFocusIndicator(base, tiny, width, height).verdict, 'none');

  assert.throws(() => analyzeFocusIndicator(base, focus.slice(0, 40), width, height), /RGBA buffers/);
  assert.throws(() => analyzeFocusIndicator(base, focus, width, 0), /positive integer/);
  assert.throws(() => analyzeFocusIndicator(base, focus, width, height, { cssPixelRatio: 0 }), /cssPixelRatio/);
});

test('buildWcagConformanceSummary folds a measured focus pair into 2.4.7/2.4.13 and trims the manual list', () => {
  const strongFocus = {
    verdict: 'strong',
    changedPixels: 516,
    contrastingPixels: 516,
    contrastingAreaCss: 516,
    requiredIndicatorArea: 180,
    meanChangeRatio: 6.1,
    maxChangeRatio: 6.4,
  };
  const summary = buildWcagConformanceSummary({ ...FAILING_CONFORMANCE_REPORT, focusCheck: strongFocus });
  const byId = Object.fromEntries(summary.criteria.map((criterion) => [criterion.id, criterion]));
  assert.equal(summary.criteria.length, 8);
  assert.equal(byId['2.4.7'].outcome, 'supports');
  assert.match(byId['2.4.7'].evidence, /516 changed pixels, max change contrast 6\.4:1/);
  assert.equal(byId['2.4.13'].outcome, 'supports');
  assert.match(byId['2.4.13'].evidence, /516 CSS px² vs the 180 px²/);
  assert.equal(summary.manualCriteria.length, CONFORMANCE_MANUAL_CRITERIA.length - 1);
  assert.ok(summary.manualCriteria.every((criterion) => criterion.id !== '2.4.7'));

  const weakSummary = buildWcagConformanceSummary({
    ...FAILING_CONFORMANCE_REPORT,
    focusCheck: { ...strongFocus, verdict: 'weak', contrastingPixels: 3, contrastingAreaCss: 3, meanChangeRatio: 1.3 },
  });
  const weakById = Object.fromEntries(weakSummary.criteria.map((criterion) => [criterion.id, criterion]));
  assert.equal(weakById['2.4.7'].outcome, 'partial');
  assert.match(weakById['2.4.7'].evidence, /only 3 reach the 3:1 change contrast/);
  assert.equal(weakById['2.4.13'].outcome, 'fails');
  assert.equal(weakSummary.counts.partial, 1);

  const noneSummary = buildWcagConformanceSummary({ focusCheck: { verdict: 'none', changedPixels: 0 } });
  const noneById = Object.fromEntries(noneSummary.criteria.map((criterion) => [criterion.id, criterion]));
  assert.equal(noneById['2.4.7'].outcome, 'fails');
  assert.match(noneById['2.4.7'].evidence, /keyboard users cannot see where focus is/);
  assert.equal(noneById['2.4.13'].outcome, 'fails');

  // Without a focus pair nothing changes: 6 criteria, 2.4.7 stays manual.
  const plain = buildWcagConformanceSummary(FAILING_CONFORMANCE_REPORT);
  assert.equal(plain.criteria.length, 6);
  assert.ok(plain.manualCriteria.some((criterion) => criterion.id === '2.4.7'));

  const markdown = buildConformanceStatementMarkdown({ ...FAILING_CONFORMANCE_REPORT, focusCheck: strongFocus });
  assert.match(markdown, /\| 2\.4\.7 Focus Visible \| AA \| Supports \|/);
  assert.match(markdown, /\| 2\.4\.13 Focus Appearance \| AAA \| Supports \|/);
  assert.ok(!/- 2\.4\.7 Focus Visible \(Level AA\)/.test(markdown));
  const plainMarkdown = buildConformanceStatementMarkdown(FAILING_CONFORMANCE_REPORT);
  assert.match(plainMarkdown, /- 2\.4\.7 Focus Visible \(Level AA\)/);
});

function buildFocusSequenceTestScene() {
  const width = 200;
  const height = 120;
  const paint = (data, hex, x0, y0, w, h) => {
    const { r, g, b } = parseHexColor(hex);
    for (let y = y0; y < y0 + h; y += 1) {
      for (let x = x0; x < x0 + w; x += 1) {
        const i = (y * width + x) * 4;
        data[i] = r;
        data[i + 1] = g;
        data[i + 2] = b;
        data[i + 3] = 255;
      }
    }
  };
  const paintRing = (data, hex, x0, y0, w, h, t) => {
    paint(data, hex, x0 - t, y0 - t, w + 2 * t, t);
    paint(data, hex, x0 - t, y0 + h, w + 2 * t, t);
    paint(data, hex, x0 - t, y0, t, h);
    paint(data, hex, x0 + w, y0, t, h);
  };
  const buildFrame = (decorate) => {
    const data = new Uint8ClampedArray(width * height * 4);
    paint(data, '#F8FAFC', 0, 0, width, height);
    paint(data, '#0F766E', 30, 25, 60, 20); // button A
    paint(data, '#0284C7', 120, 70, 50, 18); // button B
    if (decorate) {
      decorate(data);
    }
    return data;
  };
  const ringA = (hex, t) => buildFrame((data) => paintRing(data, hex, 30, 25, 60, 20, t));
  const ringB = (hex, t) => buildFrame((data) => paintRing(data, hex, 120, 70, 50, 18, t));
  return { width, height, paint, buildFrame, ringA, ringB };
}

test('analyzeFocusSequence maps ordered focus stops, dedupes repeats, and counts revisits', () => {
  const { width, height, buildFrame, ringA, ringB } = buildFocusSequenceTestScene();
  const frames = [
    buildFrame(null), // baseline (unfocused)
    buildFrame(null), // idle frame before the first Tab press
    ringA('#1D4ED8', 3), // stop 1: bold ring on button A
    ringA('#1D4ED8', 3), // same stop sampled again
    ringB('#D8E0EA', 2), // stop 2: faint ring on button B
    ringA('#1D4ED8', 3), // Tab cycles back to button A
  ];
  const result = analyzeFocusSequence(frames, width, height);

  assert.deepEqual(result.classifications, [
    'baseline',
    'no-indicator',
    'new-stop',
    'same-stop',
    'new-stop',
    'revisit',
  ]);
  assert.equal(result.summary.framesAnalyzed, 5);
  assert.equal(result.summary.stops, 2);
  assert.equal(result.summary.strong, 1);
  assert.equal(result.summary.weak, 1);
  assert.equal(result.summary.noIndicatorFrames, 1);
  assert.equal(result.summary.duplicateFrames, 1);
  assert.equal(result.summary.revisitFrames, 1);
  assert.equal(result.summary.viewChangedFrames, 0);
  assert.equal(result.aggregateVerdict, 'weak');
  assert.equal(result.aggregateLabel, FOCUS_SEQUENCE_LABELS.weak);
  assert.equal(result.worstStopOrder, 2);

  const [stopA, stopB] = result.stops;
  assert.equal(stopA.order, 1);
  assert.equal(stopA.verdict, 'strong');
  // Same ring geometry as the two-frame test: 66x26 outer box minus 60x20 button.
  assert.equal(stopA.changedPixels, 516);
  assert.equal(stopA.contrastingPixels, 516);
  assert.deepEqual(stopA.boundingBox, { x: 27, y: 22, width: 66, height: 26 });
  assert.deepEqual(stopA.center, { x: 60, y: 35 });
  assert.equal(stopA.samples, 2);
  assert.equal(stopB.order, 2);
  assert.equal(stopB.verdict, 'weak');
  assert.equal(stopB.contrastingPixels, 0);
  assert.ok(!('mask' in stopA) && !('mask' in stopB), 'sequence stops must not retain pixel masks');
});

test('trackFocusSequenceFrame rejects view changes, honors maxStops, and keeps the best same-stop capture', () => {
  const { width, height, paint, buildFrame, ringA, ringB } = buildFocusSequenceTestScene();

  // Repainting most of the page is a view change, never a focus stop.
  const viewTracker = createFocusSequenceTracker(width, height);
  trackFocusSequenceFrame(viewTracker, buildFrame(null));
  const changed = buildFrame((data) => paint(data, '#0F172A', 0, 0, width, height - 10));
  assert.equal(trackFocusSequenceFrame(viewTracker, changed).classification, 'view-changed');
  const viewResult = summarizeFocusSequence(viewTracker);
  assert.equal(viewResult.summary.viewChangedFrames, 1);
  assert.equal(viewResult.summary.stops, 0);
  assert.equal(viewResult.aggregateVerdict, 'none');
  assert.equal(viewResult.worstStopOrder, null);

  // A second distinct stop beyond maxStops is counted as overflow, not silently dropped.
  const cappedTracker = createFocusSequenceTracker(width, height, { maxStops: 1 });
  trackFocusSequenceFrame(cappedTracker, buildFrame(null));
  assert.equal(trackFocusSequenceFrame(cappedTracker, ringA('#1D4ED8', 3)).classification, 'new-stop');
  assert.equal(trackFocusSequenceFrame(cappedTracker, ringB('#1D4ED8', 3)).classification, 'overflow');
  assert.equal(summarizeFocusSequence(cappedTracker).summary.overflowFrames, 1);

  // A mid-transition thin ring is upgraded when a fuller sample of the same stop arrives.
  const upgradeTracker = createFocusSequenceTracker(width, height);
  trackFocusSequenceFrame(upgradeTracker, buildFrame(null));
  trackFocusSequenceFrame(upgradeTracker, ringA('#1D4ED8', 1));
  const upgraded = trackFocusSequenceFrame(upgradeTracker, ringA('#1D4ED8', 3));
  assert.equal(upgraded.classification, 'same-stop');
  const upgradeResult = summarizeFocusSequence(upgradeTracker);
  assert.equal(upgradeResult.summary.stops, 1);
  assert.equal(upgradeResult.stops[0].changedPixels, 516);
  assert.equal(upgradeResult.stops[0].samples, 2);
  assert.equal(upgradeResult.aggregateVerdict, 'strong');

  // cssPixelRatio flows through to every stop measurement (2x retina capture).
  const retina = analyzeFocusSequence(
    [buildFrame(null), ringA('#1D4ED8', 3)],
    width,
    height,
    { cssPixelRatio: 2 },
  );
  assert.equal(retina.stops[0].contrastingAreaCss, 129);
  assert.equal(retina.cssPixelRatio, 2);
});

test('buildWcagConformanceSummary folds a focus sequence into 2.4.7/2.4.13 using the worst measured verdict', () => {
  const weakSequence = {
    aggregateVerdict: 'weak',
    worstStopOrder: 2,
    summary: { framesAnalyzed: 6, stops: 3, strong: 2, weak: 1 },
    stops: [
      { order: 1, verdict: 'strong', changedPixels: 516, contrastingPixels: 516, contrastingAreaCss: 516, requiredIndicatorArea: 180 },
      { order: 2, verdict: 'weak', changedPixels: 2000, contrastingPixels: 12, contrastingAreaCss: 12, requiredIndicatorArea: 300 },
      { order: 3, verdict: 'strong', changedPixels: 480, contrastingPixels: 480, contrastingAreaCss: 480, requiredIndicatorArea: 170 },
    ],
  };
  const strongSequence = {
    aggregateVerdict: 'strong',
    worstStopOrder: 3,
    summary: { framesAnalyzed: 5, stops: 3, strong: 3, weak: 0 },
    stops: weakSequence.stops.map((stop) => ({ ...stop, verdict: 'strong' })),
  };
  const strongPair = {
    verdict: 'strong',
    changedPixels: 516,
    contrastingPixels: 516,
    contrastingAreaCss: 516,
    requiredIndicatorArea: 180,
    meanChangeRatio: 6.1,
    maxChangeRatio: 6.4,
  };

  const weakSummary = buildWcagConformanceSummary({ ...FAILING_CONFORMANCE_REPORT, focusSequence: weakSequence });
  const weakById = Object.fromEntries(weakSummary.criteria.map((criterion) => [criterion.id, criterion]));
  assert.equal(weakSummary.criteria.length, 8);
  assert.equal(weakById['2.4.7'].outcome, 'partial');
  assert.match(weakById['2.4.7'].evidence, /1 of 3 focus stops mapped across the tab-through recording/);
  assert.match(weakById['2.4.7'].evidence, /worst stop #2 changes 2000 px but only 12 reach 3:1/);
  assert.equal(weakById['2.4.13'].outcome, 'fails');
  assert.match(weakById['2.4.13'].evidence, /12 CSS px² vs the 300 px²/);
  assert.ok(weakSummary.manualCriteria.every((criterion) => criterion.id !== '2.4.7'));

  // A strong pair check cannot excuse a weak stop elsewhere in the tab order.
  const bothSummary = buildWcagConformanceSummary({
    ...FAILING_CONFORMANCE_REPORT,
    focusCheck: strongPair,
    focusSequence: weakSequence,
  });
  const bothById = Object.fromEntries(bothSummary.criteria.map((criterion) => [criterion.id, criterion]));
  assert.equal(bothById['2.4.7'].outcome, 'partial');
  assert.match(bothById['2.4.7'].evidence, /tab-through recording/);

  // But a failing pair still drives the rows when the sequence looks fine.
  const pairWorse = buildWcagConformanceSummary({
    ...FAILING_CONFORMANCE_REPORT,
    focusCheck: { verdict: 'none', changedPixels: 0 },
    focusSequence: strongSequence,
  });
  const pairWorseById = Object.fromEntries(pairWorse.criteria.map((criterion) => [criterion.id, criterion]));
  assert.equal(pairWorseById['2.4.7'].outcome, 'fails');
  assert.match(pairWorseById['2.4.7'].evidence, /unfocused vs focused frames/);

  const strongSummary = buildWcagConformanceSummary({ ...FAILING_CONFORMANCE_REPORT, focusSequence: strongSequence });
  const strongById = Object.fromEntries(strongSummary.criteria.map((criterion) => [criterion.id, criterion]));
  assert.equal(strongById['2.4.7'].outcome, 'supports');
  assert.match(strongById['2.4.7'].evidence, /All 3 focus stops mapped across the tab-through recording/);
  assert.equal(strongById['2.4.13'].outcome, 'supports');

  // A baseline-only "sequence" (nothing analyzed) is not focus evidence.
  const emptySummary = buildWcagConformanceSummary({
    ...FAILING_CONFORMANCE_REPORT,
    focusSequence: { aggregateVerdict: 'none', summary: { framesAnalyzed: 0, stops: 0, strong: 0, weak: 0 }, stops: [] },
  });
  assert.equal(emptySummary.criteria.length, 6);
  assert.ok(emptySummary.manualCriteria.some((criterion) => criterion.id === '2.4.7'));

  const markdown = buildConformanceStatementMarkdown({ ...FAILING_CONFORMANCE_REPORT, focusSequence: weakSequence });
  assert.match(markdown, /\| 2\.4\.7 Focus Visible \| AA \| Partially Supports \|/);
  assert.match(markdown, /\| 2\.4\.13 Focus Appearance \| AAA \| Does Not Support \|/);
});

test('focus sequence analysis validates frames, dimensions, and tracker options', () => {
  const { width, height, buildFrame } = buildFocusSequenceTestScene();
  const frame = buildFrame(null);

  assert.throws(() => analyzeFocusSequence([frame], width, height), /at least 2 frames/);
  assert.throws(() => analyzeFocusSequence('frames', width, height), /at least 2 frames/);
  assert.throws(() => analyzeFocusSequence([frame, frame], width, 0), /positive integer/);
  assert.throws(() => analyzeFocusSequence([frame, frame.slice(0, 16)], width, height), /RGBA buffer/);
  assert.throws(() => createFocusSequenceTracker(width, height, { sameStopOverlap: 0 }), /sameStopOverlap/);
  assert.throws(() => createFocusSequenceTracker(width, height, { maxStopCoverage: 1.5 }), /maxStopCoverage/);
  assert.throws(() => createFocusSequenceTracker(width, height, { maxStops: 0 }), /maxStops/);
  assert.throws(() => trackFocusSequenceFrame(null, frame), /createFocusSequenceTracker/);
  assert.throws(() => summarizeFocusSequence({}), /createFocusSequenceTracker/);

  assert.equal(FOCUS_SEQUENCE_DEFAULTS.sameStopOverlap, 0.4);
  assert.equal(FOCUS_SEQUENCE_DEFAULTS.maxStopCoverage, 0.5);
  assert.equal(FOCUS_SEQUENCE_DEFAULTS.maxStops, 24);
});
