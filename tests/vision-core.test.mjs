import { strict as assert } from 'node:assert';
import test from 'node:test';
import {
  parseHexColor,
  rgbToHex,
  contrastRatio,
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

test('equal colors return contrast 1', () => {
  const color = parseHexColor('#445566');
  const ratio = contrastRatio(color, color);
  assert.equal(ratio.toFixed(3), '1.000');
});

test('evaluateContrast exposes AA and AAA states', () => {
  const result = evaluateContrast(parseHexColor('#000000'), parseHexColor('#ffffff'));
  assert.equal(result.passesAA, true);
  assert.equal(result.passesAAA, true);
  assert.equal(result.passesLAA, true);
});

test('suggestAccessiblePairs returns usable color combinations', () => {
  const suggestions = suggestAccessiblePairs('#000000', '#ffffff');
  assert.ok(Array.isArray(suggestions));
  assert.ok(suggestions.length > 0);
  assert.ok(suggestions.every((pair) => pair.ratio >= 4.5 - 0.0001));
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
