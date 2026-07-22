import { strict as assert } from 'node:assert';
import test from 'node:test';
import {
  parseHexColor,
  rgbToHex,
  contrastRatio,
  relativeLuminance,
  formatBytes,
  getDemoScriptText,
  getSubmissionChecklistText,
  suggestAccessiblePairs,
  evaluateContrast,
  transformImageDataWithMatrix,
  CVD_MODES,
} from '../docs/js/vision-core.js';

test('parseHexColor accepts short and full hex', () => {
  assert.deepEqual(parseHexColor('#abc'), { r: 170, g: 187, b: 204, hex: '#aabbcc' });
  assert.deepEqual(parseHexColor('112233'), { r: 17, g: 34, b: 51, hex: '#112233' });
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

test('suggestAccessiblePairs returns usable color combinations', () => {
  const suggestions = suggestAccessiblePairs('#000000', '#ffffff');
  assert.ok(Array.isArray(suggestions));
  assert.ok(suggestions.length > 0);
  assert.ok(suggestions.every((pair) => pair.ratio >= 4.5 - 0.0001));
});

test('suggestAccessiblePairs validates parameters', () => {
  assert.throws(() => suggestAccessiblePairs('#000', '#fff', 0.5), /Target contrast ratio/i);
  assert.throws(() => suggestAccessiblePairs('#000', '#fff', 4.5, 0), /Suggestion limit/i);
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
