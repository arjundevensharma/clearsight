// Tests for the zero-dependency CI auditor: the pure-Node PNG decoder,
// box-average downscaler, and CLI gate/parse/report helpers. A miniature
// in-test PNG encoder (chunk CRCs + zlib deflate + forward scanline filters)
// provides real byte-level round trips without any fixture files.

import { strict as assert } from 'node:assert';
import test from 'node:test';
import { deflateSync } from 'node:zlib';
import { decodePng, downscaleRgba } from '../scripts/lib/png.mjs';
import {
  auditDecodedImage,
  compareAgainstBaseline,
  evaluateAuditGate,
  formatAuditTable,
  formatBaselineSummary,
  formatPortfolioSummary,
  minScoreForGrade,
  parseCliArgs,
  rankEntriesWorstFirst,
} from '../scripts/audit-cli.mjs';
import {
  buildMarkdownReport,
  buildPortfolioPdfDoc,
  buildSarifReport,
  buildScoreBadgeSvg,
  gradeForScore,
  GRADE_COLORS,
} from '../scripts/lib/report.mjs';
import { buildPdfReport, summarizeBatchAudit } from '../docs/js/vision-core.js';

function crc32(bytes) {
  let crc = 0xffffffff;
  for (let i = 0; i < bytes.length; i += 1) {
    crc ^= bytes[i];
    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const payload = Buffer.from(data);
  const out = Buffer.alloc(12 + payload.length);
  out.writeUInt32BE(payload.length, 0);
  out.write(type, 4, 'ascii');
  payload.copy(out, 8);
  out.writeUInt32BE(crc32(out.subarray(4, 8 + payload.length)), 8 + payload.length);
  return out;
}

function paethPredictor(a, b, c) {
  const p = a + b - c;
  const pa = Math.abs(p - a);
  const pb = Math.abs(p - b);
  const pc = Math.abs(p - c);
  if (pa <= pb && pa <= pc) return a;
  if (pb <= pc) return b;
  return c;
}

// PNG forward filtering (encoder side) so decode tests exercise filters 1-4.
function filterScanline(current, previous, filterType, bpp) {
  const out = Buffer.alloc(current.length);
  for (let i = 0; i < current.length; i += 1) {
    const left = i >= bpp ? current[i - bpp] : 0;
    const up = previous ? previous[i] : 0;
    const upLeft = previous && i >= bpp ? previous[i - bpp] : 0;
    let predictor;
    if (filterType === 1) predictor = left;
    else if (filterType === 2) predictor = up;
    else if (filterType === 3) predictor = (left + up) >> 1;
    else if (filterType === 4) predictor = paethPredictor(left, up, upLeft);
    else predictor = 0;
    out[i] = (current[i] - predictor) & 0xff;
  }
  return out;
}

function encodePng({
  width,
  height,
  bitDepth,
  colorType,
  rows,
  palette = null,
  transparency = null,
  filters = null,
  interlace = 0,
}) {
  const channels = { 0: 1, 2: 3, 3: 1, 4: 2, 6: 4 }[colorType];
  const bpp = Math.max(1, (channels * bitDepth) >> 3);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = bitDepth;
  ihdr[9] = colorType;
  ihdr[12] = interlace;

  const filtered = [];
  rows.forEach((row, y) => {
    const filterType = filters ? filters[y] : 0;
    filtered.push(Buffer.from([filterType]));
    filtered.push(filterScanline(Buffer.from(row), y > 0 ? Buffer.from(rows[y - 1]) : null, filterType, bpp));
  });

  const parts = [
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
  ];
  if (palette) parts.push(chunk('PLTE', Buffer.from(palette.flat())));
  if (transparency) parts.push(chunk('tRNS', Buffer.from(transparency)));
  parts.push(chunk('IDAT', deflateSync(Buffer.concat(filtered))));
  parts.push(chunk('IEND', Buffer.alloc(0)));
  return Buffer.concat(parts);
}

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

function rgbaRows(data, width, height) {
  const rows = [];
  for (let y = 0; y < height; y += 1) {
    rows.push(Buffer.from(data.subarray(y * width * 4, (y + 1) * width * 4)));
  }
  return rows;
}

test('decodePng round-trips 8-bit RGBA across all five scanline filter types', () => {
  const width = 4;
  const height = 5;
  const rows = [];
  for (let y = 0; y < height; y += 1) {
    const row = Buffer.alloc(width * 4);
    for (let i = 0; i < row.length; i += 1) {
      row[i] = (i * 37 + y * 111 + 13) % 256;
    }
    rows.push(row);
  }

  const png = encodePng({ width, height, bitDepth: 8, colorType: 6, rows, filters: [0, 1, 2, 3, 4] });
  const decoded = decodePng(png);
  assert.equal(decoded.width, width);
  assert.equal(decoded.height, height);
  assert.deepEqual(Array.from(decoded.data), rows.flatMap((row) => Array.from(row)));
});

test('decodePng expands RGB, grayscale, and gray+alpha to RGBA', () => {
  const rgb = decodePng(
    encodePng({ width: 2, height: 1, bitDepth: 8, colorType: 2, rows: [Buffer.from([10, 20, 30, 200, 100, 50])] }),
  );
  assert.deepEqual(Array.from(rgb.data), [10, 20, 30, 255, 200, 100, 50, 255]);

  const gray = decodePng(
    encodePng({ width: 2, height: 1, bitDepth: 8, colorType: 0, rows: [Buffer.from([0, 180])] }),
  );
  assert.deepEqual(Array.from(gray.data), [0, 0, 0, 255, 180, 180, 180, 255]);

  const grayAlpha = decodePng(
    encodePng({ width: 2, height: 1, bitDepth: 8, colorType: 4, rows: [Buffer.from([90, 128, 200, 0])] }),
  );
  assert.deepEqual(Array.from(grayAlpha.data), [90, 90, 90, 128, 200, 200, 200, 0]);
});

test('decodePng resolves palette PNGs including 4-bit indices and tRNS alpha', () => {
  const palette = [
    [255, 0, 0],
    [0, 255, 0],
    [0, 0, 255],
    [255, 255, 0],
  ];

  const eightBit = decodePng(
    encodePng({
      width: 3,
      height: 1,
      bitDepth: 8,
      colorType: 3,
      palette,
      transparency: [255, 128],
      rows: [Buffer.from([0, 1, 3])],
    }),
  );
  assert.deepEqual(Array.from(eightBit.data), [255, 0, 0, 255, 0, 255, 0, 128, 255, 255, 0, 255]);

  // 4-bit: indices 0,1,2 pack into two bytes (0x01, 0x20).
  const fourBit = decodePng(
    encodePng({
      width: 3,
      height: 1,
      bitDepth: 4,
      colorType: 3,
      palette,
      rows: [Buffer.from([0x01, 0x20])],
    }),
  );
  assert.deepEqual(Array.from(fourBit.data), [255, 0, 0, 255, 0, 255, 0, 255, 0, 0, 255, 255]);
});

test('decodePng rejects non-PNG bytes and unsupported PNG variants with clear messages', () => {
  assert.throws(() => decodePng(Buffer.from('definitely not a png, but long enough')), /not a PNG/i);
  assert.throws(() => decodePng(Buffer.from([0x89, 0x50])), /too small/i);

  const rows = [Buffer.from([0, 0, 0, 255, 255, 255])];
  const sixteenBit = encodePng({ width: 1, height: 1, bitDepth: 16, colorType: 2, rows: [Buffer.from([0, 0, 0, 0, 0, 0])] });
  assert.throws(() => decodePng(sixteenBit), /bit depth 16/i);

  const interlaced = encodePng({ width: 2, height: 1, bitDepth: 8, colorType: 2, rows, interlace: 1 });
  assert.throws(() => decodePng(interlaced), /interlaced/i);

  const badColorType = encodePng({ width: 2, height: 1, bitDepth: 8, colorType: 2, rows });
  badColorType[8 + 8 + 9] = 7; // corrupt IHDR color type in place
  assert.throws(() => decodePng(badColorType), /color type 7/i);
});

test('downscaleRgba box-averages oversized buffers and passes small ones through', () => {
  const small = createSolidImage(4, 4, [10, 20, 30]);
  const untouched = downscaleRgba(small, 4, 4, 1600);
  assert.equal(untouched.downscaled, false);
  assert.equal(untouched.data, small);

  // 4x2 image, left half black and right half white, halved to 2x1.
  const data = new Uint8ClampedArray(4 * 2 * 4);
  for (let pixel = 0; pixel < 8; pixel += 1) {
    const value = pixel % 4 < 2 ? 0 : 255;
    data.set([value, value, value, 255], pixel * 4);
  }
  const halved = downscaleRgba(data, 4, 2, 2);
  assert.equal(halved.downscaled, true);
  assert.equal(halved.width, 2);
  assert.equal(halved.height, 1);
  assert.deepEqual(Array.from(halved.data), [0, 0, 0, 255, 255, 255, 255, 255]);
});

test('parseCliArgs parses files, gates, baselines, and outputs, and rejects invalid input', () => {
  const options = parseCliArgs(['a.png', '--min-grade', 'b', 'b.png', '--csv', 'out.csv', '--json', 'out.json', '--baseline', 'main.json', '--max-score-drop', '2', '--markdown', 'comment.md', '--badge', 'badge.svg', '--sarif', 'results.sarif']);
  assert.deepEqual(options.files, ['a.png', 'b.png']);
  assert.equal(options.minScore, 80);
  assert.equal(options.csvPath, 'out.csv');
  assert.equal(options.jsonPath, 'out.json');
  assert.equal(options.markdownPath, 'comment.md');
  assert.equal(options.badgePath, 'badge.svg');
  assert.equal(options.sarifPath, 'results.sarif');
  assert.throws(() => parseCliArgs(['--markdown']), /requires a value/i);
  assert.throws(() => parseCliArgs(['--badge']), /requires a value/i);
  assert.throws(() => parseCliArgs(['--sarif']), /requires a value/i);
  assert.equal(options.baselinePath, 'main.json');
  assert.equal(options.maxScoreDrop, 2);
  assert.equal(options.maxDimension, 1600);

  // The stricter of --min-score and --min-grade wins, in either order.
  assert.equal(parseCliArgs(['--min-score', '95', '--min-grade', 'B']).minScore, 95);
  assert.equal(parseCliArgs(['--min-grade', 'A', '--min-score', '50']).minScore, 90);
  assert.equal(parseCliArgs(['--max-dim', '800']).maxDimension, 800);
  assert.equal(parseCliArgs(['-h']).help, true);

  assert.equal(minScoreForGrade('f'), 0);
  assert.throws(() => minScoreForGrade('Z'), /unknown grade/i);
  assert.throws(() => parseCliArgs(['--min-score', '101']), /between 0 and 100/i);
  assert.throws(() => parseCliArgs(['--min-score']), /requires a value/i);
  assert.throws(() => parseCliArgs(['--max-dim', '10']), /at least 64/i);
  assert.throws(() => parseCliArgs(['--max-score-drop', '-1']), /between 0 and 100/i);
  assert.throws(() => parseCliArgs(['--wat']), /unknown option/i);
});

test('evaluateAuditGate fails screens below threshold and screens that could not be scored', () => {
  const entries = [
    { name: 'checkout.png', audit: { score: { score: 62, grade: 'D' } } },
    { name: 'home.png', audit: { score: { score: 91, grade: 'A' } } },
    { name: 'blank.png', audit: { score: { score: null, grade: null } } },
  ];

  const reportOnly = evaluateAuditGate(entries, null);
  assert.equal(reportOnly.enabled, false);
  assert.equal(reportOnly.pass, true);

  const gate = evaluateAuditGate(entries, 80);
  assert.equal(gate.enabled, true);
  assert.equal(gate.pass, false);
  assert.deepEqual(
    gate.failures.map((failure) => failure.name),
    ['checkout.png', 'blank.png'],
  );

  const lenient = evaluateAuditGate(entries.slice(0, 2), 60);
  assert.equal(lenient.pass, true);
});

test('compareAgainstBaseline catches score regressions while tolerating new and improved screens', () => {
  const current = [
    { name: 'home.png', audit: { score: { score: 88, grade: 'B' } } },
    { name: 'checkout.png', audit: { score: { score: 75, grade: 'C' } } },
    { name: 'new-route.png', audit: { score: { score: 42, grade: 'F' } } },
    { name: 'lost-coverage.png', audit: { score: { score: null, grade: null } } },
  ];
  const baseline = {
    tool: 'clearsight-audit',
    screens: [
      { name: 'home.png', score: { score: 84, grade: 'B' } },
      { name: 'checkout.png', score: { score: 80, grade: 'B' } },
      { name: 'lost-coverage.png', score: { score: 70, grade: 'C' } },
    ],
  };

  const strict = compareAgainstBaseline(current, baseline);
  assert.equal(strict.pass, false);
  assert.deepEqual(strict.failures.map((item) => item.name), ['checkout.png', 'lost-coverage.png']);
  assert.equal(strict.comparisons.find((item) => item.name === 'home.png').status, 'improved');
  assert.equal(strict.comparisons.find((item) => item.name === 'new-route.png').status, 'new');
  assert.match(formatBaselineSummary(strict), /2 regressed/);

  const tolerant = compareAgainstBaseline(current.slice(0, 3), baseline, 5);
  assert.equal(tolerant.pass, true);
  assert.equal(tolerant.comparisons.find((item) => item.name === 'checkout.png').status, 'within-tolerance');
  assert.throws(() => compareAgainstBaseline(current, {}), /screens array/i);
});

test('auditDecodedImage runs the production six-axis audit on decoded PNG bytes end-to-end', () => {
  // Same synthetic screen the vision-core audit tests use: a below-AA gray
  // "text" band plus a compliant black band on white — but round-tripped
  // through real PNG bytes first.
  const width = 144;
  const height = 96;
  const image = createSolidImage(width, height, [255, 255, 255]);
  paintVerticalStripes(image, width, 12, 12, 72, 24, [153, 153, 153]);
  paintVerticalStripes(image, width, 12, 60, 72, 24, [0, 0, 0]);
  const png = encodePng({ width, height, bitDepth: 8, colorType: 6, rows: rgbaRows(image, width, height) });

  const decoded = decodePng(png);
  const risky = auditDecodedImage('risky-screen.png', decoded);
  assert.equal(risky.name, 'risky-screen.png');
  assert.equal(risky.audit.textScan.summary.belowAA, 1);
  assert.ok(Number.isFinite(risky.audit.score.score));
  assert.equal(risky.audit.downscaledForAudit, false);
  assert.equal(risky.audit.sourceWidth, width);

  const flatData = createSolidImage(60, 48, [240, 240, 240]);
  const flat = auditDecodedImage('flat.png', { data: flatData, width: 60, height: 48 });
  assert.equal(flat.audit.score.score, null);

  // Unscored screens rank last; scored risky screens rank first.
  const ranked = rankEntriesWorstFirst([flat, risky]);
  assert.deepEqual(
    ranked.map((entry) => entry.name),
    ['risky-screen.png', 'flat.png'],
  );

  const table = formatAuditTable(ranked);
  assert.match(table, /risky-screen\.png/);
  assert.match(table, /Below AA/);
  assert.match(table, new RegExp(`\\b${risky.audit.score.score}\\b`));

  const summary = formatPortfolioSummary(summarizeBatchAudit(ranked));
  assert.match(summary, /Release gate:/);
  assert.match(summary, /1 below-AA text/);
});

function fakeEntry(name, score, grade, { belowAA = 0, cvdHiddenFailures = 0, apcaFalsePasses = 0, collisions = 0, componentFailures = 0, undersizedTargets = 0, worstRatio = null } = {}) {
  return {
    name,
    audit: {
      score: {
        score,
        grade,
        axes: [{ id: 'textContrast', label: 'Text contrast', score }],
      },
      textScan: {
        summary: { belowAA, cvdHiddenFailures, apcaFalsePasses },
        regions: worstRatio === null ? [] : [{ ratio: worstRatio }],
      },
      palette: { collisions: { summary: { collisions } } },
      componentContrast: { summary: { evaluated: componentFailures ? componentFailures + 1 : 0, failing: componentFailures } },
      targetSizes: { summary: { targets: undersizedTargets ? undersizedTargets + 1 : 0, undersized: undersizedTargets } },
    },
  };
}

test('buildMarkdownReport renders a PR-comment report with ranked table, gates, deltas, and skipped files', () => {
  const entries = [
    fakeEntry('checkout|page.png', 58, 'F', { belowAA: 3, cvdHiddenFailures: 1, apcaFalsePasses: 2, collisions: 1, worstRatio: 2.746 }),
    fakeEntry('home.png', 88, 'B'),
  ];
  const portfolio = summarizeBatchAudit(entries);
  const gate = evaluateAuditGate(entries, 80);
  const baselineComparison = compareAgainstBaseline(entries, {
    tool: 'clearsight-audit',
    screens: [
      { name: 'checkout|page.png', score: { score: 64, grade: 'D' } },
      { name: 'home.png', score: { score: 84, grade: 'B' } },
    ],
  });

  const markdown = buildMarkdownReport({
    entries,
    portfolio,
    gate,
    baselineComparison,
    skipped: [{ file: 'photo.jpg', message: 'not a PNG' }],
  });

  assert.match(markdown, /^## ClearSight accessibility audit/);
  assert.match(markdown, new RegExp(`\\*\\*Portfolio score: ${portfolio.portfolioScore}/100`));
  // Pipes in filenames must be escaped so they cannot break table cells.
  assert.match(markdown, /`checkout\\\|page\.png`/);
  assert.match(markdown, /\| 1 \| `checkout\\\|page\.png` \| 58 \| 🔴 F \| 🔻 -6 \| 3 \| 1 \| 2 \| 1 \| 0 \| 0 \| 2\.75:1 \|/);
  assert.match(markdown, /\| 🔺 \+4 \|/);
  assert.match(markdown, /\*\*Score gate \(≥ 80\):\*\* ❌ FAILED — `checkout\\\|page\.png` \(58, Grade F\)/);
  assert.match(markdown, /\*\*Regression gate \(allowed drop 0\):\*\* ❌ FAILED/);
  assert.match(markdown, /Skipped files/);
  assert.match(markdown, /`photo\.jpg` — not a PNG/);
  assert.match(markdown, /Generated by \[ClearSight\]/);

  // Report-only run: no gate lines, no delta column, explicit report-only note.
  const reportOnly = buildMarkdownReport({
    entries,
    portfolio,
    gate: evaluateAuditGate(entries, null),
  });
  assert.match(reportOnly, /_Report-only run/);
  assert.doesNotMatch(reportOnly, /Δ score/);
  assert.doesNotMatch(reportOnly, /Score gate/);

  assert.throws(() => buildMarkdownReport({ entries: [], portfolio, gate }), /at least one audited screen/i);
});

test('buildScoreBadgeSvg colors by grade band and degrades gracefully when unscored', () => {
  assert.equal(gradeForScore(91), 'A');
  assert.equal(gradeForScore(62), 'D');
  assert.equal(gradeForScore(null), null);

  const entries = [fakeEntry('home.png', 62, 'D')];
  const badge = buildScoreBadgeSvg(summarizeBatchAudit(entries));
  assert.match(badge, /^<svg xmlns="http:\/\/www\.w3\.org\/2000\/svg"/);
  assert.match(badge, /aria-label="ClearSight: 62\/100 D"/);
  assert.ok(badge.includes(`fill="${GRADE_COLORS.D}"`));
  assert.match(badge, />62\/100 D<\/text>/);

  const unscored = buildScoreBadgeSvg(summarizeBatchAudit([]));
  assert.match(unscored, /unscored/);
  assert.doesNotMatch(unscored, /\/100/);
  for (const color of Object.values(GRADE_COLORS)) {
    assert.ok(!unscored.includes(color), `unscored badge must not use grade color ${color}`);
  }
});

test('buildSarifReport emits GitHub-compatible results for every failing audit axis and regression', () => {
  const entries = [
    fakeEntry('checkout.png', 58, 'F', {
      belowAA: 3,
      cvdHiddenFailures: 1,
      apcaFalsePasses: 2,
      collisions: 1,
      worstRatio: 2.746,
    }),
    fakeEntry('home.png', 88, 'B'),
  ];
  const gate = evaluateAuditGate(entries, 80);
  const baselineComparison = compareAgainstBaseline(entries, {
    screens: [
      { name: 'checkout.png', score: { score: 64 } },
      { name: 'home.png', score: { score: 84 } },
    ],
  });
  const sarif = buildSarifReport({ entries, gate, baselineComparison });

  assert.equal(sarif.version, '2.1.0');
  assert.equal(sarif.runs[0].tool.driver.name, 'ClearSight CI');
  assert.deepEqual(
    sarif.runs[0].results.map((result) => result.ruleId),
    [
      'clearsight/score',
      'clearsight/regression',
      'clearsight/text-contrast',
      'clearsight/cvd-contrast',
      'clearsight/apca-risk',
      'clearsight/color-collision',
    ],
  );
  assert.equal(sarif.runs[0].results[0].locations[0].physicalLocation.artifactLocation.uri, 'checkout.png');
  assert.equal(sarif.runs[0].results[2].properties.worstRatio, 2.746);
  assert.deepEqual(
    sarif.runs[0].tool.driver.rules.map((rule) => rule.id),
    [...new Set(sarif.runs[0].results.map((result) => result.ruleId))],
  );

  const clean = buildSarifReport({
    entries: [fakeEntry('home.png', 95, 'A')],
    gate: evaluateAuditGate([fakeEntry('home.png', 95, 'A')], 80),
  });
  assert.deepEqual(clean.runs[0].results, []);
  assert.deepEqual(clean.runs[0].tool.driver.rules, []);
  assert.throws(() => buildSarifReport({ entries: [] }), /at least one audited screen/i);
});

test('buildPortfolioPdfDoc builds a renderable portfolio PDF with gates and baseline deltas', () => {
  const entries = [
    fakeEntry('checkout.png', 58, 'F', { belowAA: 3, cvdHiddenFailures: 1, apcaFalsePasses: 2, collisions: 1 }),
    fakeEntry('home.png', 88, 'B'),
  ];
  const portfolio = summarizeBatchAudit(entries);
  const gate = evaluateAuditGate(entries, 80);
  const baselineComparison = compareAgainstBaseline(entries, {
    tool: 'clearsight-audit',
    screens: [
      { name: 'checkout.png', score: { score: 64, grade: 'D' } },
      { name: 'home.png', score: { score: 84, grade: 'B' } },
    ],
  });

  const doc = buildPortfolioPdfDoc({
    entries,
    portfolio,
    gate,
    baselineComparison,
    skipped: [{ file: 'photo.jpg', message: 'not a PNG' }],
    generatedAt: '2026-07-23 10:00 UTC',
  });

  assert.equal(doc.title, 'ClearSight portfolio accessibility audit');
  assert.equal(doc.score.value, portfolio.portfolioScore);
  assert.equal(doc.score.grade, gradeForScore(portfolio.portfolioScore));
  const table = doc.blocks.find((block) => block.type === 'table');
  assert.equal(table.rows.length, 2);
  assert.equal(table.rows[0][1], 'checkout.png');
  assert.equal(table.rows[0][7], '-6');
  assert.equal(table.rows[1][7], '+4');

  const rendered = Buffer.from(buildPdfReport(doc)).toString('latin1');
  assert.ok(rendered.startsWith('%PDF-1.4'));
  assert.match(rendered, /Portfolio debt map/);
  assert.match(rendered, /checkout\.png/);
  assert.match(rendered, /Score gate FAILED/);
  assert.match(rendered, /Skipped 1 file/);

  // Without gates or baseline the CI gates section disappears entirely.
  const reportOnly = buildPortfolioPdfDoc({
    entries,
    portfolio,
    gate: evaluateAuditGate(entries, null),
    generatedAt: '2026-07-23 10:00 UTC',
  });
  assert.ok(!reportOnly.blocks.some((block) => block.type === 'heading' && block.text === 'CI gates'));
  assert.throws(() => buildPortfolioPdfDoc({ entries: null, portfolio }), /entries/);
});
