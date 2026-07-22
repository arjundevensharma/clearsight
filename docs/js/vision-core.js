export const CVD_MODES = [
  {
    id: 'normal',
    label: 'Normal',
    kind: 'matrix',
    matrix: [
      [1, 0, 0],
      [0, 1, 0],
      [0, 0, 1],
    ],
  },
  {
    id: 'protanopia',
    label: 'Protanopia (red-blind)',
    kind: 'matrix',
    matrix: [
      [0.56667, 0.43333, 0],
      [0.55833, 0.44167, 0],
      [0.008, 0.140, 0.852],
    ],
  },
  {
    id: 'deuteranopia',
    label: 'Deuteranopia (green-blind)',
    kind: 'matrix',
    matrix: [
      [0.625, 0.375, 0],
      [0.7, 0.3, 0],
      [0, 0.3, 0.7],
    ],
  },
  {
    id: 'tritanopia',
    label: 'Tritanopia (blue-blind)',
    kind: 'matrix',
    matrix: [
      [0.95, 0.05, 0],
      [0, 0.43333, 0.56667],
      [0, 0.475, 0.525],
    ],
  },
  {
    id: 'protanomaly',
    label: 'Protanomaly',
    kind: 'matrix',
    matrix: [
      [0.7833, 0.2167, 0],
      [0.27915, 0.72085, 0],
      [0.008, 0.140, 0.852],
    ],
  },
  {
    id: 'deuteranomaly',
    label: 'Deuteranomaly',
    kind: 'matrix',
    matrix: [
      [0.8125, 0.1875, 0],
      [0.35, 0.65, 0],
      [0, 0.3, 0.7],
    ],
  },
  {
    id: 'tritanomaly',
    label: 'Tritanomaly',
    kind: 'matrix',
    matrix: [
      [0.97, 0.03, 0],
      [0, 0.7167, 0.2833],
      [0, 0.1417, 0.8583],
    ],
  },
  {
    id: 'achromatopsia',
    label: 'Achromatopsia (grayscale)',
    kind: 'matrix',
    matrix: [
      [0.2126, 0.7152, 0.0722],
      [0.2126, 0.7152, 0.0722],
      [0.2126, 0.7152, 0.0722],
    ],
  },
];

const clamp = (value) => Math.max(0, Math.min(255, Math.round(value)));

export function transformImageDataWithMatrix(imageData, matrix) {
  if (!imageData || !imageData.data || !matrix || !Array.isArray(matrix) || matrix.length !== 3) {
    throw new Error('Invalid image data or matrix provided for color transformation.');
  }
  if (!Array.isArray(matrix[0]) || !Array.isArray(matrix[1]) || !Array.isArray(matrix[2])) {
    throw new Error('Invalid image data or matrix provided for color transformation.');
  }
  if (matrix.some((row) => row.length !== 3 || row.some((value) => typeof value !== 'number' || !Number.isFinite(value)))) {
    throw new Error('Invalid image data or matrix provided for color transformation.');
  }

  const data = imageData.data;

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i] / 255;
    const g = data[i + 1] / 255;
    const b = data[i + 2] / 255;

    const r2 = matrix[0][0] * r + matrix[0][1] * g + matrix[0][2] * b;
    const g2 = matrix[1][0] * r + matrix[1][1] * g + matrix[1][2] * b;
    const b2 = matrix[2][0] * r + matrix[2][1] * g + matrix[2][2] * b;

    data[i] = clamp(r2 * 255);
    data[i + 1] = clamp(g2 * 255);
    data[i + 2] = clamp(b2 * 255);
  }

  return imageData;
}

export function parseHexColor(value) {
  if (typeof value !== 'string') {
    throw new Error('Color input must be a string.');
  }

  const clean = value.trim().replace(/^#/, '').toLowerCase();

  if (!/^([0-9a-f]{3}|[0-9a-f]{6})$/i.test(clean)) {
    throw new Error(`Invalid hex color: ${value}`);
  }

  const normalized = clean.length === 3
    ? clean
        .split('')
        .map((ch) => ch + ch)
        .join('')
    : clean;

  const asNumber = parseInt(normalized, 16);

  return {
    r: (asNumber >> 16) & 255,
    g: (asNumber >> 8) & 255,
    b: asNumber & 255,
    hex: `#${normalized}`,
  };
}

export function rgbToHex({ r, g, b }) {
  const toHex = (n) => clamp(n).toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`.toLowerCase();
}

function linearize(channel) {
  const normalized = channel / 255;
  return normalized <= 0.03928
    ? normalized / 12.92
    : Math.pow((normalized + 0.055) / 1.055, 2.4);
}

export function relativeLuminance({ r, g, b }) {
  return 0.2126 * linearize(r) + 0.7152 * linearize(g) + 0.0722 * linearize(b);
}

export function contrastRatio(rgbA, rgbB) {
  if (!rgbA || !rgbB) {
    throw new Error('Contrast requires two RGB objects.');
  }

  const l1 = relativeLuminance(rgbA);
  const l2 = relativeLuminance(rgbB);
  const light = Math.max(l1, l2);
  const dark = Math.min(l1, l2);
  return (light + 0.05) / (dark + 0.05);
}

export function evaluateContrast(textColor, backgroundColor, aaThreshold = 4.5, aaaThreshold = 7) {
  const ratio = contrastRatio(textColor, backgroundColor);
  return {
    ratio,
    passesAA: ratio >= aaThreshold,
    passesAAA: ratio >= aaaThreshold,
    passesLAA: ratio >= 3.0,
  };
}

const safeTextCandidates = [
  '#0f172a',
  '#0f766e',
  '#1d4ed8',
  '#0891b2',
  '#16a34a',
  '#ca8a04',
  '#9333ea',
  '#db2777',
  '#dc2626',
  '#000000',
];

const safeBackgroundCandidates = [
  '#f8fafc',
  '#f1f5f9',
  '#e2e8f0',
  '#ffffff',
  '#0f172a',
  '#1e293b',
  '#111827',
  '#052e16',
  '#1f2937',
  '#0c4a6e',
];

function colorDistance(a, b) {
  return Math.sqrt(
    Math.pow(a.r - b.r, 2) +
      Math.pow(a.g - b.g, 2) +
      Math.pow(a.b - b.b, 2),
  );
}

export function suggestAccessiblePairs(textHex, backgroundHex, targetRatio = 4.5, limit = 8) {
  const baseText = parseHexColor(textHex);
  const baseBg = parseHexColor(backgroundHex);

  const candidates = [];
  const seen = new Set();

  for (const bg of safeBackgroundCandidates) {
    const bgRgb = parseHexColor(bg);
    for (const fg of safeTextCandidates) {
      const fgRgb = parseHexColor(fg);

      if (bg.toLowerCase() === fg.toLowerCase()) {
        continue;
      }

      const ratio = contrastRatio(fgRgb, bgRgb);
      if (ratio < targetRatio) {
        continue;
      }

      const key = `${bg}|${fg}`;
      if (seen.has(key)) {
        continue;
      }

      const keepDistance = colorDistance(baseText, fgRgb) + colorDistance(baseBg, bgRgb);
      candidates.push({
        background: rgbToHex(bgRgb),
        text: rgbToHex(fgRgb),
        ratio,
        score: keepDistance,
      });
      seen.add(key);
    }
  }

  candidates.sort((a, b) => {
    if (Math.abs(a.ratio - b.ratio) < 0.01) {
      return a.score - b.score;
    }
    return b.ratio - a.ratio;
  });

  return candidates.slice(0, limit);
}
