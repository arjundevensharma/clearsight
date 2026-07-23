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
const BYTE_UNITS = ['B', 'KB', 'MB', 'GB', 'TB'];

const DEMO_SCRIPT_LINES = [
  'ClearSight — 1-3 Minute Demo Script',
  '',
  '0:00-0:15 | Problem framing',
  'Show: teams and users often miss accessibility gaps in contrast and color vision.',
  'Say: ClearSight is a browser-first simulator for seeing UI as users with vision differences see it.',
  '',
  '0:15-0:40 | Privacy and flow',
  'Show: upload/ demo controls and mention "no file leaves your browser."',
  'Walk through: built-in demos and source upload are one-click.',
  '',
  '0:40-1:25 | Live simulator',
  'Show: source preview then simulation strip:',
  'Protanopia, Deuteranopia, Tritanopia, Protanomaly, Deuteranomaly, Tritanomaly, Achromatopsia,',
  'Low Vision: Blur, Low Vision: Low Contrast, Cataracts, Glaucoma (tunnel vision),',
  'and Macular degeneration (central loss).',
  '',
  '1:25-2:05 | Contrast checker',
  'Show supported color formats (hex, rgb/rgba, hsl/hsla, and CSS color names), run check, and point out AA/AAA pass states.',
  '',
  '2:05-2:35 | Accessible alternatives',
  'Open suggestions, apply one pair, and rerun contrast check.',
  '',
  '2:35-3:00 | Close',
  'ClearSight gives fast visual empathy + concrete fixes with offline, client-side workflows.',
];

const CSS_NAMED_COLOR_HEX = {
  aliceblue: '#f0f8ff',
  antiquewhite: '#faebd7',
  aqua: '#00ffff',
  aquamarine: '#7fffd4',
  azure: '#f0ffff',
  beige: '#f5f5dc',
  bisque: '#ffe4c4',
  black: '#000000',
  blanchedalmond: '#ffebcd',
  blue: '#0000ff',
  blueviolet: '#8a2be2',
  brown: '#a52a2a',
  burlywood: '#deb887',
  cadetblue: '#5f9ea0',
  chartreuse: '#7fff00',
  chocolate: '#d2691e',
  coral: '#ff7f50',
  cornflowerblue: '#6495ed',
  cornsilk: '#fff8dc',
  crimson: '#dc143c',
  cyan: '#00ffff',
  darkblue: '#00008b',
  darkcyan: '#008b8b',
  darkgoldenrod: '#b8860b',
  darkgray: '#a9a9a9',
  darkgrey: '#a9a9a9',
  darkgreen: '#006400',
  darkkhaki: '#bdb76b',
  darkmagenta: '#8b008b',
  darkolivegreen: '#556b2f',
  darkorange: '#ff8c00',
  darkorchid: '#9932cc',
  darkred: '#8b0000',
  darksalmon: '#e9967a',
  darkseagreen: '#8fbc8f',
  darkslateblue: '#483d8b',
  darkslategray: '#2f4f4f',
  darkslategrey: '#2f4f4f',
  darkturquoise: '#00ced1',
  darkviolet: '#9400d3',
  deeppink: '#ff1493',
  deepskyblue: '#00bfff',
  dimgray: '#696969',
  dimgrey: '#696969',
  dodgerblue: '#1e90ff',
  firebrick: '#b22222',
  floralwhite: '#fffaf0',
  forestgreen: '#228b22',
  fuchsia: '#ff00ff',
  gainsboro: '#dcdcdc',
  ghostwhite: '#f8f8ff',
  gold: '#ffd700',
  goldenrod: '#daa520',
  gray: '#808080',
  grey: '#808080',
  green: '#008000',
  greenyellow: '#adff2f',
  honeydew: '#f0fff0',
  hotpink: '#ff69b4',
  indianred: '#cd5c5c',
  indigo: '#4b0082',
  ivory: '#fffff0',
  khaki: '#f0e68c',
  lavender: '#e6e6fa',
  lavenderblush: '#fff0f5',
  lawngreen: '#7cfc00',
  lemonchiffon: '#fffacd',
  lightblue: '#add8e6',
  lightcoral: '#f08080',
  lightcyan: '#e0ffff',
  lightgoldenrodyellow: '#fafad2',
  lightgray: '#d3d3d3',
  lightgrey: '#d3d3d3',
  lightgreen: '#90ee90',
  lightpink: '#ffb6c1',
  lightsalmon: '#ffa07a',
  lightseagreen: '#20b2aa',
  lightskyblue: '#87cefa',
  lightslategray: '#778899',
  lightslategrey: '#778899',
  lightsteelblue: '#b0c4de',
  lightyellow: '#ffffe0',
  lime: '#00ff00',
  limegreen: '#32cd32',
  linen: '#faf0e6',
  magenta: '#ff00ff',
  maroon: '#800000',
  mediumaquamarine: '#66cdaa',
  mediumblue: '#0000cd',
  mediumorchid: '#ba55d3',
  mediumpurple: '#9370db',
  mediumseagreen: '#3cb371',
  mediumslateblue: '#7b68ee',
  mediumspringgreen: '#00fa9a',
  mediumturquoise: '#48d1cc',
  mediumvioletred: '#c71585',
  midnightblue: '#191970',
  mintcream: '#f5fffa',
  mistyrose: '#ffe4e1',
  moccasin: '#ffe4b5',
  navajowhite: '#ffdead',
  navy: '#000080',
  oldlace: '#fdf5e6',
  olive: '#808000',
  olivedrab: '#6b8e23',
  orange: '#ffa500',
  orangered: '#ff4500',
  orchid: '#da70d6',
  palegoldenrod: '#eee8aa',
  palegreen: '#98fb98',
  paleturquoise: '#afeeee',
  palevioletred: '#db7093',
  papayawhip: '#ffefd5',
  peachpuff: '#ffdab9',
  peru: '#cd853f',
  pink: '#ffc0cb',
  plum: '#dda0dd',
  powderblue: '#b0e0e6',
  purple: '#800080',
  rebeccapurple: '#663399',
  red: '#ff0000',
  rosybrown: '#bc8f8f',
  royalblue: '#4169e1',
  saddlebrown: '#8b4513',
  salmon: '#fa8072',
  sandybrown: '#f4a460',
  seagreen: '#2e8b57',
  seashell: '#fff5ee',
  sienna: '#a0522d',
  silver: '#c0c0c0',
  skyblue: '#87ceeb',
  slateblue: '#6a5acd',
  slategray: '#708090',
  slategrey: '#708090',
  snow: '#fffafa',
  springgreen: '#00ff7f',
  steelblue: '#4682b4',
  tan: '#d2b48c',
  teal: '#008080',
  thistle: '#d8bfd8',
  tomato: '#ff6347',
  turquoise: '#40e0d0',
  violet: '#ee82ee',
  wheat: '#f5deb3',
  white: '#ffffff',
  whitesmoke: '#f5f5f5',
  yellow: '#ffff00',
  yellowgreen: '#9acd32',
};

const SUBMISSION_CHECKLIST_LINES = [
  'ClearSight submission image gallery checklist',
  '',
  'Capture these screenshots for Devpost Image gallery:',
  '1. source-original.png',
  '2. sim-protanopia.png',
  '3. sim-deuteranopia.png',
  '4. sim-tritanopia.png',
  '5. sim-achromatopsia.png',
  '6. sim-low-vision-blur.png',
  '7. sim-low-vision-contrast.png',
  '8. contrast-checker-initial.png',
  '9. contrast-suggestion-applied.png',
];

export function getDemoScriptText() {
  return DEMO_SCRIPT_LINES.join('\n');
}

export function getSubmissionChecklistText() {
  return SUBMISSION_CHECKLIST_LINES.join('\n');
}

export function formatBytes(bytes, decimals = 2) {
  requireFinitePositiveNumber(bytes, 'Byte count', 0);

  const safeDecimals = Number(decimals);
  if (!Number.isInteger(safeDecimals) || safeDecimals < 0 || safeDecimals > 6) {
    throw new Error('Bytes formatting precision must be a non-negative integer up to 6.');
  }

  const normalized = Math.floor(bytes);
  if (normalized === 0) {
    return '0 B';
  }

  let value = normalized;
  let unitIndex = 0;

  while (value >= 1024 && unitIndex < BYTE_UNITS.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }

  if (unitIndex === 0) {
    return `${value} B`;
  }

  return `${value.toFixed(safeDecimals)} ${BYTE_UNITS[unitIndex]}`;
}

function assertFiniteRgbChannel(value, label) {
  if (!Number.isFinite(value)) {
    throw new Error(`${label} must be a finite number.`);
  }

  if (value < 0 || value > 255) {
    throw new Error(`${label} channel value must be between 0 and 255.`);
  }
}

function assertRgbObject(color, label = 'Color') {
  if (!color || typeof color !== 'object') {
    throw new Error(`${label} must be an object with numeric r, g, b fields.`);
  }

  assertFiniteRgbChannel(color.r, `${label}.r`);
  assertFiniteRgbChannel(color.g, `${label}.g`);
  assertFiniteRgbChannel(color.b, `${label}.b`);
}

function requireFinitePositiveNumber(value, label, min = Number.NEGATIVE_INFINITY) {
  if (!Number.isFinite(value)) {
    throw new Error(`${label} must be a finite number.`);
  }
  if (value < min) {
    throw new Error(`${label} must be at least ${min}.`);
  }
}

export function transformImageDataWithMatrix(imageData, matrix) {
  if (!imageData || !imageData.data || !matrix || !Array.isArray(matrix) || matrix.length !== 3) {
    throw new Error('Invalid image data or matrix provided for color transformation.');
  }
  if (!imageData.width || !imageData.height || imageData.width <= 0 || imageData.height <= 0) {
    throw new Error('Invalid image data dimensions for color transformation.');
  }
  if (!Array.isArray(matrix[0]) || !Array.isArray(matrix[1]) || !Array.isArray(matrix[2])) {
    throw new Error('Invalid image data or matrix provided for color transformation.');
  }
  if (imageData.data.length < imageData.width * imageData.height * 4) {
    throw new Error('Image data length does not match expected dimensions.');
  }
  if (imageData.data.length % 4 !== 0) {
    throw new Error('Invalid image data for color transformation.');
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

/**
 * Builds a source-aware hotspot view: unchanged pixels stay muted while larger
 * simulation deltas move from transparent amber to opaque magenta. Keeping the
 * source luminance in the output makes the highlighted UI regions recognizable.
 */
export function createVisualDifferenceHeatmap(sourceData, candidateData, width, height) {
  if (!sourceData || !candidateData || sourceData.length !== candidateData.length) {
    throw new Error('Heatmap source and candidate buffers must have matching lengths.');
  }
  if (!Number.isInteger(width) || !Number.isInteger(height) || width <= 0 || height <= 0) {
    throw new Error('Heatmap dimensions must be positive integers.');
  }
  if (sourceData.length !== width * height * 4) {
    throw new Error('Heatmap buffer length does not match its dimensions.');
  }

  const output = new Uint8ClampedArray(sourceData.length);
  for (let i = 0; i < sourceData.length; i += 4) {
    const delta = Math.min(
      1,
      (Math.abs(sourceData[i] - candidateData[i]) +
        Math.abs(sourceData[i + 1] - candidateData[i + 1]) +
        Math.abs(sourceData[i + 2] - candidateData[i + 2])) /
        (255 * 1.35),
    );
    const luminance = Math.round(
      sourceData[i] * 0.2126 + sourceData[i + 1] * 0.7152 + sourceData[i + 2] * 0.0722,
    );
    const base = Math.round(28 + luminance * 0.42);
    const strength = Math.max(0, (delta - 0.035) / 0.965);
    const eased = Math.pow(strength, 0.72);
    const hotR = 255;
    const hotG = Math.round(188 * (1 - eased));
    const hotB = Math.round(24 + 118 * eased);

    output[i] = Math.round(base * (1 - eased) + hotR * eased);
    output[i + 1] = Math.round(base * (1 - eased) + hotG * eased);
    output[i + 2] = Math.round(base * (1 - eased) + hotB * eased);
    output[i + 3] = sourceData[i + 3];
  }
  return { data: output, width, height };
}

function parseNumericAlpha(value, originalValue) {
  if (!value) {
    return null;
  }

  const normalizedValue = value.trim();
  if (!normalizedValue) {
    return null;
  }

  if (normalizedValue.endsWith('%')) {
    const percentage = Number(normalizedValue.slice(0, -1));
    if (!Number.isFinite(percentage) || percentage < 0 || percentage > 100) {
      throw new Error(`Invalid hex color: ${originalValue}`);
    }
    return percentage / 100;
  }

  const alphaValue = Number(normalizedValue);
  if (!Number.isFinite(alphaValue) || alphaValue < 0 || alphaValue > 1) {
    throw new Error(`Invalid hex color: ${originalValue}`);
  }

  return alphaValue;
}

function parseHslChannel(rawValue, originalValue) {
  const normalized = rawValue?.trim();
  if (!normalized || !normalized.endsWith('%')) {
    throw new Error(`Invalid hex color: ${originalValue}`);
  }

  const percentage = Number(normalized.slice(0, -1));
  if (!Number.isFinite(percentage) || percentage < 0 || percentage > 100) {
    throw new Error(`Invalid hex color: ${originalValue}`);
  }

  return percentage;
}

function parseHslHue(rawValue, originalValue) {
  const normalized = rawValue?.trim();
  if (!normalized) {
    throw new Error(`Invalid hex color: ${originalValue}`);
  }

  const lower = normalized.toLowerCase();
  const numeric = lower.endsWith('deg')
    ? Number(lower.slice(0, -3))
    : lower.endsWith('turn')
      ? Number(lower.slice(0, -4)) * 360
      : lower.endsWith('rad')
        ? (Number(lower.slice(0, -3)) * 180) / Math.PI
        : Number(normalized);

  if (!Number.isFinite(numeric)) {
    throw new Error(`Invalid hex color: ${originalValue}`);
  }

  return ((numeric % 360) + 360) % 360;
}

function hslToRgb(hueDegrees, saturationPercent, lightnessPercent) {
  const h = hueDegrees / 360;
  const s = saturationPercent / 100;
  const l = lightnessPercent / 100;

  if (s === 0) {
    const channel = Math.round(l * 255);
    return {
      r: channel,
      g: channel,
      b: channel,
    };
  }

  const hueToRgb = (p, q, t) => {
    let nextT = t;
    if (nextT < 0) {
      nextT += 1;
    }
    if (nextT > 1) {
      nextT -= 1;
    }

    if (nextT < 1 / 6) {
      return p + (q - p) * 6 * nextT;
    }

    if (nextT < 1 / 2) {
      return q;
    }

    if (nextT < 2 / 3) {
      return p + (q - p) * (2 / 3 - nextT) * 6;
    }

    return p;
  };

  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;

  return {
    r: Math.round(hueToRgb(p, q, h + 1 / 3) * 255),
    g: Math.round(hueToRgb(p, q, h) * 255),
    b: Math.round(hueToRgb(p, q, h - 1 / 3) * 255),
  };
}

function rgbToHsl({ r, g, b }) {
  const rChannel = r / 255;
  const gChannel = g / 255;
  const bChannel = b / 255;

  const max = Math.max(rChannel, gChannel, bChannel);
  const min = Math.min(rChannel, gChannel, bChannel);
  const delta = max - min;

  let hue = 0;
  let saturation = 0;
  const lightness = (max + min) / 2;

  if (delta !== 0) {
    saturation =
      lightness > 0.5 ? delta / (2 - max - min) : delta / (max + min);

    if (max === rChannel) {
      hue = ((gChannel - bChannel) / delta + (gChannel < bChannel ? 6 : 0)) / 6;
    } else if (max === gChannel) {
      hue = (bChannel - rChannel) / delta + 2;
      hue /= 6;
    } else {
      hue = (rChannel - gChannel) / delta + 4;
      hue /= 6;
    }
  }

  return {
    h: hue * 360,
    s: saturation * 100,
    l: lightness * 100,
  };
}

function parseHslColor(value, originalValue) {
  const hslFunctionMatch = value.match(/^hsla?\(\s*(.*?)\s*\)$/i);
  if (!hslFunctionMatch) {
    return null;
  }

  const isHslaSyntax = value.toLowerCase().startsWith('hsla(');
  const channelString = hslFunctionMatch[1];
  const alphaSplit = channelString.split('/');

  if (alphaSplit.length > 2 || alphaSplit.length === 0) {
    throw new Error(`Invalid hex color: ${originalValue}`);
  }

  const preAlphaChannelString = alphaSplit[0].trim();
  const hasCommaChannels = preAlphaChannelString.includes(',');
  let channels = preAlphaChannelString.includes(',')
    ? preAlphaChannelString.split(',').map((channel) => channel.trim()).filter(Boolean)
    : preAlphaChannelString.split(/\s+/).filter(Boolean);
  const hasInlineAlpha = channels.length === 4;

  if (hasCommaChannels && alphaSplit.length === 2) {
    throw new Error(`Invalid hex color: ${originalValue}`);
  }

  if (isHslaSyntax && !hasInlineAlpha && alphaSplit.length === 1) {
    throw new Error(`Invalid hex color: ${originalValue}`);
  }

  if (!isHslaSyntax && hasInlineAlpha) {
    throw new Error(`Invalid hex color: ${originalValue}`);
  }

  if (hasInlineAlpha) {
    alphaSplit[1] = channels.pop();
  }

  if (channels.length !== 3) {
    throw new Error(`Invalid hex color: ${originalValue}`);
  }

  const hue = parseHslHue(channels[0], originalValue);
  const saturation = parseHslChannel(channels[1], originalValue);
  const lightness = parseHslChannel(channels[2], originalValue);

  if ((hasInlineAlpha || alphaSplit.length === 2) && alphaSplit[1] !== undefined) {
    const alphaValue = parseNumericAlpha(alphaSplit[1], originalValue);
    if (alphaValue === null) {
      throw new Error(`Invalid hex color: ${originalValue}`);
    }
  }

  const rgb = hslToRgb(hue, saturation, lightness);
  return {
    ...rgb,
    hex: rgbToHex(rgb),
  };
}

export function parseHexColor(value) {
  if (typeof value !== 'string') {
    throw new Error('Color input must be a string.');
  }

  const trimmed = value.trim();
  const namedHex = CSS_NAMED_COLOR_HEX[trimmed.toLowerCase()];
  if (namedHex) {
    return parseHexColor(namedHex);
  }

  const hslColor = parseHslColor(trimmed, value);
  if (hslColor) {
    return hslColor;
  }

  const rgbFunctionMatch = trimmed.match(/^rgba?\(\s*(.*?)\s*\)$/i);
  if (rgbFunctionMatch) {
    const isRgbaSyntax = trimmed.toLowerCase().startsWith('rgba(');
    const channelString = rgbFunctionMatch[1];
    const alphaSplit = channelString.split('/');
    if (alphaSplit.length > 2 || alphaSplit.length === 0) {
      throw new Error(`Invalid hex color: ${value}`);
    }

    const preAlphaChannelString = alphaSplit[0].trim();
    const hasCommaChannels = preAlphaChannelString.includes(',');
    let channels = preAlphaChannelString.includes(',')
      ? preAlphaChannelString.split(',').map((channel) => channel.trim()).filter(Boolean)
      : preAlphaChannelString.split(/\s+/).filter(Boolean);
    const hasInlineAlpha = channels.length === 4;

    if (hasCommaChannels && alphaSplit.length === 2) {
      throw new Error(`Invalid hex color: ${value}`);
    }

    if (isRgbaSyntax && !hasInlineAlpha && alphaSplit.length === 1) {
      throw new Error(`Invalid hex color: ${value}`);
    }

    if (!isRgbaSyntax && hasInlineAlpha) {
      throw new Error(`Invalid hex color: ${value}`);
    }

    if (hasInlineAlpha) {
      alphaSplit[1] = channels.pop();
    }

    if (channels.length !== 3) {
      throw new Error(`Invalid hex color: ${value}`);
    }

    const [rawRed, rawGreen, rawBlue] = channels;
    const parseAlpha = (rawAlpha) => {
      return parseNumericAlpha(rawAlpha, value);
    };

    const parseChannel = (rawChannel) => {
      if (!rawChannel) {
        throw new Error(`Invalid hex color: ${value}`);
      }

      const normalized = rawChannel.trim();
      if (normalized.endsWith('%')) {
        const percentage = Number(normalized.slice(0, -1));
        if (!Number.isFinite(percentage) || percentage < 0 || percentage > 100) {
          throw new Error(`Invalid hex color: ${value}`);
        }
        return Math.round((percentage / 100) * 255);
      }

      const channelValue = Number(normalized);
      if (!Number.isFinite(channelValue) || channelValue < 0 || channelValue > 255) {
        throw new Error(`Invalid hex color: ${value}`);
      }
      return clamp(Math.round(channelValue));
    };

    if ((hasInlineAlpha || alphaSplit.length === 2) && alphaSplit[1] !== undefined) {
      const alpha = alphaSplit[1]?.trim();
      const alphaValue = parseAlpha(alpha);
      if (alphaValue === null) {
        throw new Error(`Invalid hex color: ${value}`);
      }
    }

    const red = parseChannel(rawRed);
    const green = parseChannel(rawGreen);
    const blue = parseChannel(rawBlue);

    return {
      r: red,
      g: green,
      b: blue,
      hex: rgbToHex({ r: red, g: green, b: blue }),
    };
  }

  const clean = trimmed.replace(/^#/, '').toLowerCase();

  if (!/^([0-9a-f]{3}|[0-9a-f]{4}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test(clean)) {
    throw new Error(`Invalid hex color: ${value}`);
  }

  const withoutAlpha = clean.length === 4 ? clean.slice(0, 3) : clean.length === 8 ? clean.slice(0, 6) : clean;

  const normalized = withoutAlpha.length === 3
    ? withoutAlpha
        .split('')
        .map((ch) => ch + ch)
        .join('')
    : withoutAlpha;

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
  assertRgbObject({ r, g, b }, 'RGB color');
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
  requireFinitePositiveNumber(aaThreshold, 'AA threshold', 0.1);
  requireFinitePositiveNumber(aaaThreshold, 'AAA threshold', 0.1);

  if (aaaThreshold < aaThreshold) {
    throw new Error('AAA threshold must be greater than or equal to AA threshold.');
  }

  const ratio = contrastRatio(textColor, backgroundColor);
  return {
    ratio,
    passesAA: ratio >= aaThreshold,
    passesAAA: ratio >= aaaThreshold,
    passesLAA: ratio >= 3.0,
  };
}

function applyMatrixToColor(color, matrix) {
  return {
    r: clamp(matrix[0][0] * color.r + matrix[0][1] * color.g + matrix[0][2] * color.b),
    g: clamp(matrix[1][0] * color.r + matrix[1][1] * color.g + matrix[1][2] * color.b),
    b: clamp(matrix[2][0] * color.r + matrix[2][1] * color.g + matrix[2][2] * color.b),
  };
}

/**
 * WCAG contrast math assumes typical trichromatic vision, so a pair can pass AA
 * while collapsing for color-blind users (e.g. pure red on black: 5.25:1 normal,
 * under 2:1 for protanopes). Projecting both colors through each full-severity
 * CVD matrix and re-running the ratio exposes those hidden failures.
 */
export function projectContrastAcrossCvdModes(textColor, backgroundColor, options = {}) {
  const { aaThreshold = 4.5, modes = CVD_MODES } = options;
  requireFinitePositiveNumber(aaThreshold, 'AA threshold', 0.1);

  if (!Array.isArray(modes)) {
    throw new Error('CVD projection modes must be an array.');
  }

  const resolveColor = (value, label) => {
    if (typeof value === 'string') {
      return parseHexColor(value);
    }
    assertRgbObject(value, label);
    return { r: value.r, g: value.g, b: value.b };
  };

  const text = resolveColor(textColor, 'Text color');
  const background = resolveColor(backgroundColor, 'Background color');
  const matrixModes = modes.filter(
    (mode) => mode && mode.kind === 'matrix' && mode.id !== 'normal' && Array.isArray(mode.matrix),
  );
  if (!matrixModes.length) {
    throw new Error('CVD projection requires at least one matrix-based vision mode.');
  }

  const baseRatio = contrastRatio(text, background);
  const projections = matrixModes.map((mode) => {
    const projectedText = applyMatrixToColor(text, mode.matrix);
    const projectedBackground = applyMatrixToColor(background, mode.matrix);
    const ratio = contrastRatio(projectedText, projectedBackground);
    return {
      id: mode.id,
      label: mode.label,
      ratio,
      delta: ratio - baseRatio,
      passesAA: ratio >= aaThreshold,
      text: { hex: rgbToHex(projectedText), rgb: projectedText },
      background: { hex: rgbToHex(projectedBackground), rgb: projectedBackground },
    };
  });

  const worst = projections.reduce((lowest, entry) => (!lowest || entry.ratio < lowest.ratio ? entry : lowest), null);
  const failingModes = projections.filter((entry) => !entry.passesAA).map((entry) => entry.id);
  const basePassesAA = baseRatio >= aaThreshold;

  return {
    aaThreshold,
    baseRatio,
    basePassesAA,
    projections,
    worst,
    failingModes,
    hiddenFailure: basePassesAA && failingModes.length > 0,
  };
}

export function rankSuggestionsByCvdSafety(suggestions, aaThreshold = 4.5) {
  if (!Array.isArray(suggestions)) {
    throw new Error('Contrast suggestions must be an array.');
  }
  requireFinitePositiveNumber(aaThreshold, 'AA threshold', 1);

  return suggestions
    .map((suggestion, sourceRank) => {
      if (!suggestion || typeof suggestion !== 'object') {
        throw new Error('Each contrast suggestion must include text and background colors.');
      }
      const projection = projectContrastAcrossCvdModes(suggestion.text, suggestion.background, {
        aaThreshold,
      });
      return {
        ...suggestion,
        cvdSafe: projection.failingModes.length === 0,
        cvdWorstRatio: projection.worst.ratio,
        cvdWorstMode: projection.worst.id,
        cvdFailingModes: [...projection.failingModes],
        cvdProjection: projection,
        sourceRank,
      };
    })
    .sort((a, b) => {
      if (a.cvdSafe !== b.cvdSafe) {
        return a.cvdSafe ? -1 : 1;
      }
      if (!a.cvdSafe && Math.abs(a.cvdWorstRatio - b.cvdWorstRatio) > 0.0001) {
        return b.cvdWorstRatio - a.cvdWorstRatio;
      }
      return a.sourceRank - b.sourceRank;
    })
    .map(({ sourceRank, ...suggestion }) => suggestion);
}

/**
 * APCA (Accessible Perceptual Contrast Algorithm) — the candidate contrast
 * method for WCAG 3. Constants match apca-w3 v0.0.98G-4g (SAPC-4g). Unlike
 * WCAG 2 ratio math, APCA models perceived lightness on real screens
 * (2.4-gamma luminance, soft black-level clamp) and reading polarity
 * (light-on-dark differs from dark-on-light), so it exposes pairs WCAG 2
 * overrates: #AAAAAA text on #000000 scores 9.04:1 (AAA) under WCAG 2 yet
 * only Lc 56 — below APCA's fluent-text minimum of Lc 60.
 */
const APCA = {
  exponent: 2.4,
  coefficients: { r: 0.2126729, g: 0.7151522, b: 0.072175 },
  blackThreshold: 0.022,
  blackClampExp: 1.414,
  normBg: 0.56,
  normText: 0.57,
  revBg: 0.65,
  revText: 0.62,
  scale: 1.14,
  lowClip: 0.1,
  lowOffset: 0.027,
};

export const APCA_LEVELS = [
  { id: 'preferred-body', minLc: 90, label: 'Preferred body text' },
  { id: 'body', minLc: 75, label: 'Body text minimum' },
  { id: 'fluent', minLc: 60, label: 'Fluent/large text minimum' },
  { id: 'headline', minLc: 45, label: 'Headline / large bold minimum' },
  { id: 'spot', minLc: 30, label: 'Spot text minimum' },
  { id: 'non-text', minLc: 15, label: 'Non-text elements only' },
  { id: 'fail', minLc: 0, label: 'Below usable contrast' },
];

function resolveApcaColor(value, label) {
  if (typeof value === 'string') {
    return parseHexColor(value);
  }
  assertRgbObject(value, label);
  return { r: value.r, g: value.g, b: value.b };
}

function apcaScreenLuminance({ r, g, b }) {
  const channel = (v) => Math.pow(v / 255, APCA.exponent);
  let y =
    APCA.coefficients.r * channel(r) +
    APCA.coefficients.g * channel(g) +
    APCA.coefficients.b * channel(b);
  if (y < APCA.blackThreshold) {
    y += Math.pow(APCA.blackThreshold - y, APCA.blackClampExp);
  }
  return y;
}

export function apcaContrast(textColor, backgroundColor) {
  const text = resolveApcaColor(textColor, 'Text color');
  const background = resolveApcaColor(backgroundColor, 'Background color');
  const yText = apcaScreenLuminance(text);
  const yBg = apcaScreenLuminance(background);

  if (yBg > yText) {
    const sapc = (Math.pow(yBg, APCA.normBg) - Math.pow(yText, APCA.normText)) * APCA.scale;
    return sapc < APCA.lowClip ? 0 : (sapc - APCA.lowOffset) * 100;
  }
  const sapc = (Math.pow(yBg, APCA.revBg) - Math.pow(yText, APCA.revText)) * APCA.scale;
  return sapc > -APCA.lowClip ? 0 : (sapc + APCA.lowOffset) * 100;
}

export function evaluateApcaContrast(textColor, backgroundColor) {
  const lc = apcaContrast(textColor, backgroundColor);
  const absLc = Math.abs(lc);
  const level = APCA_LEVELS.find((entry) => absLc >= entry.minLc) || APCA_LEVELS[APCA_LEVELS.length - 1];
  return {
    lc,
    absLc,
    polarity: lc >= 0 ? 'dark-on-light' : 'light-on-dark',
    level: level.id,
    rating: level.label,
    passesBodyText: absLc >= 75,
    passesFluentText: absLc >= 60,
    passesSpotText: absLc >= 30,
    passesNonText: absLc >= 15,
  };
}

/**
 * Cross-checks WCAG 2 ratio math against APCA for the same pair. A
 * "perceptual false pass" means WCAG 2 AA passes while APCA scores below the
 * fluent-text minimum (Lc 60) — the pair is legally compliant today but
 * perceptually weak, and would fail under the WCAG 3 draft. "Over-strict"
 * is the reverse: WCAG 2 fails a pair APCA rates body-text ready.
 */
export function compareWcagVsApca(textColor, backgroundColor, options = {}) {
  const { aaThreshold = 4.5 } = options;
  requireFinitePositiveNumber(aaThreshold, 'AA threshold', 0.1);

  const text = resolveApcaColor(textColor, 'Text color');
  const background = resolveApcaColor(backgroundColor, 'Background color');
  const wcagRatio = contrastRatio(text, background);
  const wcagPassesAA = wcagRatio >= aaThreshold;
  const apca = evaluateApcaContrast(text, background);
  const falsePass = wcagPassesAA && !apca.passesFluentText;
  const overStrict = !wcagPassesAA && apca.passesBodyText;

  return {
    wcagRatio,
    wcagPassesAA,
    aaThreshold,
    apca,
    falsePass,
    overStrict,
    agreement: !falsePass && !overStrict,
  };
}

export function calculateImpactPercent(baseData, candidateData) {
  if (!baseData || !candidateData || baseData.length !== candidateData.length) {
    return null;
  }

  let diff = 0;
  const len = baseData.length;
  const rgbChannelCount = (len / 4) * 3;

  if (rgbChannelCount <= 0) {
    return 0;
  }

  for (let i = 0; i < len; i += 4) {
    diff += Math.abs(baseData[i] - candidateData[i]);
    diff += Math.abs(baseData[i + 1] - candidateData[i + 1]);
    diff += Math.abs(baseData[i + 2] - candidateData[i + 2]);
  }

  return (diff / (rgbChannelCount * 255)) * 100;
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

function clampColorChannel(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function buildAdaptiveColorCandidates(baseHex, maxCandidates = 64) {
  const baseColor = parseHexColor(baseHex);
  const baseHsl = rgbToHsl(baseColor);
  const seen = new Set();

  const hueOffsets = [-90, -60, -30, -15, 0, 15, 30, 60, 90];
  const saturationOffsets = [-60, -40, -20, 0, 20, 40, 60];
  const lightnessOffsets = [-50, -35, -20, -10, 10, 20, 35, 50];

  for (const hueOffset of hueOffsets) {
    const hue = (baseHsl.h + hueOffset + 360) % 360;
    for (const saturationOffset of saturationOffsets) {
      const saturation = clampColorChannel(baseHsl.s + saturationOffset, 0, 100);
      for (const lightnessOffset of lightnessOffsets) {
        const lightness = clampColorChannel(baseHsl.l + lightnessOffset, 0, 100);
        const candidate = rgbToHex(hslToRgb(hue, saturation, lightness));
        seen.add(candidate);
      }
    }
  }

  return Array.from(seen).slice(0, maxCandidates);
}

function colorDistance(a, b) {
  return Math.sqrt(
    Math.pow(a.r - b.r, 2) +
      Math.pow(a.g - b.g, 2) +
      Math.pow(a.b - b.b, 2),
  );
}

export function suggestAccessiblePairs(
  textHex,
  backgroundHex,
  targetRatio = 4.5,
  limit = 8,
  includeFallback = false,
) {
  requireFinitePositiveNumber(targetRatio, 'Target contrast ratio', 1);

  const safeLimit = Number(limit);
  if (!Number.isFinite(safeLimit) || !Number.isInteger(safeLimit) || safeLimit <= 0) {
    throw new Error('Suggestion limit must be a positive integer.');
  }

  const baseText = parseHexColor(textHex);
  const baseBg = parseHexColor(backgroundHex);

  const meetingTargetCandidates = [];
  const fallbackCandidates = [];
  const seen = new Set();
  const adaptiveTextCandidates = buildAdaptiveColorCandidates(textHex);
  const adaptiveBackgroundCandidates = buildAdaptiveColorCandidates(backgroundHex, 64);
  const textCandidates = Array.from(new Set([...safeTextCandidates, ...adaptiveTextCandidates]));
  const backgroundCandidates = Array.from(
    new Set([...safeBackgroundCandidates, ...adaptiveBackgroundCandidates]),
  );

  for (const bg of backgroundCandidates) {
    const bgRgb = parseHexColor(bg);
    for (const fg of textCandidates) {
      const fgRgb = parseHexColor(fg);

      if (bg.toLowerCase() === fg.toLowerCase()) {
        continue;
      }

    const ratio = contrastRatio(fgRgb, bgRgb);
      const ratioMeetsTarget = ratio >= targetRatio;
      if (!ratioMeetsTarget && !includeFallback) {
        continue;
      }

      const key = `${bg}|${fg}`;
      if (seen.has(key)) {
        continue;
      }

      const keepDistance = colorDistance(baseText, fgRgb) + colorDistance(baseBg, bgRgb);
      const candidate = {
        background: rgbToHex(bgRgb),
        text: rgbToHex(fgRgb),
        ratio,
        score: keepDistance,
        rankScore: keepDistance + Math.max(0, ratio - targetRatio) * 18,
      };
      seen.add(key);
      if (ratioMeetsTarget) {
        meetingTargetCandidates.push(candidate);
      } else {
        fallbackCandidates.push(candidate);
      }
    }
  }

  const candidates = meetingTargetCandidates.length > 0 ? meetingTargetCandidates : includeFallback ? fallbackCandidates : [];
  if (!candidates.length) {
    return [];
  }

  const hasThresholdMatch = meetingTargetCandidates.length > 0;
  candidates.sort((a, b) => {
    if (hasThresholdMatch) {
      if (Math.abs(a.rankScore - b.rankScore) > 0.0001) {
        return a.rankScore - b.rankScore;
      }
      if (Math.abs(a.ratio - b.ratio) < 0.01) {
        return a.score - b.score;
      }
      return b.ratio - a.ratio;
    }

    if (Math.abs(a.ratio - b.ratio) > 0.0001) {
      return b.ratio - a.ratio;
    }
    return a.score - b.score;
  });

  return candidates.slice(0, safeLimit).map(({ rankScore, ...suggestion }) => suggestion);
}

export function extractDominantColors(data, width, height, options = {}) {
  if (!Number.isInteger(width) || !Number.isInteger(height) || width <= 0 || height <= 0) {
    throw new Error('Image dimensions must be positive integers.');
  }

  if (!data || typeof data.length !== 'number' || data.length !== width * height * 4) {
    throw new Error('Image data length must equal width * height * 4.');
  }

  const {
    maxColors = 6,
    minSharePercent = 1,
    mergeDistance = 34,
    sampleStride = 1,
  } = options;
  requireFinitePositiveNumber(maxColors, 'Max colors', 1);
  requireFinitePositiveNumber(minSharePercent, 'Minimum share percent', 0);
  requireFinitePositiveNumber(mergeDistance, 'Merge distance', 0);
  requireFinitePositiveNumber(sampleStride, 'Sample stride', 1);

  const strideStep = Math.max(1, Math.floor(sampleStride));
  const pixelCount = width * height;
  const buckets = new Map();
  let sampledPixels = 0;

  for (let pixel = 0; pixel < pixelCount; pixel += strideStep) {
    const index = pixel * 4;
    if (data[index + 3] < 128) {
      continue;
    }

    const r = data[index];
    const g = data[index + 1];
    const b = data[index + 2];
    const key = ((r >> 4) << 8) | ((g >> 4) << 4) | (b >> 4);
    let bucket = buckets.get(key);
    if (!bucket) {
      bucket = { count: 0, r: 0, g: 0, b: 0 };
      buckets.set(key, bucket);
    }

    bucket.count += 1;
    bucket.r += r;
    bucket.g += g;
    bucket.b += b;
    sampledPixels += 1;
  }

  if (!sampledPixels) {
    return [];
  }

  const ranked = Array.from(buckets.values())
    .map((bucket) => ({
      count: bucket.count,
      rgb: {
        r: Math.round(bucket.r / bucket.count),
        g: Math.round(bucket.g / bucket.count),
        b: Math.round(bucket.b / bucket.count),
      },
    }))
    .sort((a, b) => b.count - a.count);

  const merged = [];
  for (const entry of ranked) {
    const nearby = merged.find((picked) => colorDistance(picked.rgb, entry.rgb) <= mergeDistance);
    if (nearby) {
      nearby.count += entry.count;
      continue;
    }

    merged.push({ count: entry.count, rgb: entry.rgb });
  }

  return merged
    .sort((a, b) => b.count - a.count)
    .map((entry) => ({
      hex: rgbToHex(entry.rgb),
      rgb: entry.rgb,
      sharePercent: (entry.count / sampledPixels) * 100,
    }))
    .filter((entry) => entry.sharePercent >= minSharePercent)
    .slice(0, Math.floor(maxColors));
}

export function buildPaletteContrastMatrix(colors, options = {}) {
  if (!Array.isArray(colors)) {
    throw new Error('Palette colors must be an array.');
  }

  const { aaThreshold = 4.5, aaaThreshold = 7, largeTextThreshold = 3 } = options;
  requireFinitePositiveNumber(aaThreshold, 'AA threshold', 0.1);
  requireFinitePositiveNumber(aaaThreshold, 'AAA threshold', 0.1);
  requireFinitePositiveNumber(largeTextThreshold, 'Large-text threshold', 0.1);

  if (aaaThreshold < aaThreshold) {
    throw new Error('AAA threshold must be greater than or equal to AA threshold.');
  }

  const parsed = colors.map((color) => {
    const hexValue = typeof color === 'string' ? color : color?.hex;
    const rgb = parseHexColor(hexValue);
    return { hex: rgb.hex, rgb, luminance: relativeLuminance(rgb) };
  });

  const pairs = [];
  for (let i = 0; i < parsed.length; i += 1) {
    for (let j = i + 1; j < parsed.length; j += 1) {
      const first = parsed[i];
      const second = parsed[j];
      const [textColor, backgroundColor] =
        first.luminance <= second.luminance ? [first, second] : [second, first];
      const ratio = contrastRatio(textColor.rgb, backgroundColor.rgb);
      let level = 'fail';
      if (ratio >= aaaThreshold) {
        level = 'aaa';
      } else if (ratio >= aaThreshold) {
        level = 'aa';
      } else if (ratio >= largeTextThreshold) {
        level = 'aa-large';
      }

      pairs.push({
        text: textColor.hex,
        background: backgroundColor.hex,
        ratio,
        level,
        passesAA: ratio >= aaThreshold,
      });
    }
  }

  pairs.sort((a, b) => a.ratio - b.ratio);

  const summary = {
    total: pairs.length,
    aaa: pairs.filter((pair) => pair.level === 'aaa').length,
    aa: pairs.filter((pair) => pair.level === 'aa').length,
    aaLargeOnly: pairs.filter((pair) => pair.level === 'aa-large').length,
    fail: pairs.filter((pair) => pair.level === 'fail').length,
  };
  summary.belowAA = summary.aaLargeOnly + summary.fail;

  return { pairs, summary };
}

export function buildAccessibleRecolorPlan(colors, options = {}) {
  if (!Array.isArray(colors) || colors.length < 2) {
    throw new Error('Recolor plan requires an array of at least two palette colors.');
  }

  const { aaThreshold = 4.5, maxAdjustedColors = 4 } = options;
  requireFinitePositiveNumber(aaThreshold, 'AA threshold', 0.1);
  requireFinitePositiveNumber(maxAdjustedColors, 'Max adjusted colors', 1);

  const working = colors.map((color, index) => {
    const hexValue = typeof color === 'string' ? color : color?.hex;
    const rgb = parseHexColor(hexValue);
    const sharePercent =
      color && typeof color === 'object' && Number.isFinite(color.sharePercent)
        ? color.sharePercent
        : 0;
    return { index, originalHex: rgb.hex, currentHex: rgb.hex, currentRgb: rgb, sharePercent, adjusted: false };
  });

  const listBelowAA = () => {
    const failing = [];
    for (let i = 0; i < working.length; i += 1) {
      for (let j = i + 1; j < working.length; j += 1) {
        const ratio = contrastRatio(working[i].currentRgb, working[j].currentRgb);
        if (ratio < aaThreshold) {
          failing.push({ i, j, ratio });
        }
      }
    }
    failing.sort((a, b) => a.ratio - b.ratio);
    return failing;
  };

  const initialBelowAA = listBelowAA().length;
  const skippedPairs = new Set();
  let adjustedCount = 0;

  while (adjustedCount < Math.floor(maxAdjustedColors)) {
    const pending = listBelowAA().filter((pair) => !skippedPairs.has(`${pair.i}-${pair.j}`));
    if (!pending.length) {
      break;
    }

    const targetPair = pending[0];
    const adjustableIndexes = [targetPair.i, targetPair.j]
      .filter((idx) => !working[idx].adjusted)
      .sort((a, b) => working[a].sharePercent - working[b].sharePercent);

    let best = null;
    for (const idx of adjustableIndexes) {
      const partnerIdx = idx === targetPair.i ? targetPair.j : targetPair.i;
      const beforeRatios = working.map((other) =>
        other.index === idx ? null : contrastRatio(working[idx].currentRgb, other.currentRgb),
      );

      for (const candidateHex of buildAdaptiveColorCandidates(working[idx].currentHex, 512)) {
        const candidate = parseHexColor(candidateHex);
        let fixesTargetPair = false;
        let breaksPassingPair = false;
        let fixedPairCount = 0;

        for (const other of working) {
          if (other.index === idx) {
            continue;
          }
          const before = beforeRatios[other.index];
          const after = contrastRatio(candidate, other.currentRgb);
          if (before >= aaThreshold && after < aaThreshold) {
            breaksPassingPair = true;
            break;
          }
          if (before < aaThreshold && after >= aaThreshold) {
            fixedPairCount += 1;
            if (other.index === partnerIdx) {
              fixesTargetPair = true;
            }
          }
        }

        if (breaksPassingPair || !fixesTargetPair) {
          continue;
        }

        const distance = colorDistance(working[idx].currentRgb, candidate);
        const rank = distance - fixedPairCount * 1000;
        if (!best || rank < best.rank) {
          best = { idx, rgb: candidate, rank };
        }
      }
    }

    if (!best) {
      skippedPairs.add(`${targetPair.i}-${targetPair.j}`);
      continue;
    }

    working[best.idx].currentHex = best.rgb.hex;
    working[best.idx].currentRgb = best.rgb;
    working[best.idx].adjusted = true;
    adjustedCount += 1;
  }

  const remainingBelowAA = listBelowAA().length;
  const remaps = working
    .filter((entry) => entry.adjusted && entry.currentHex !== entry.originalHex)
    .map((entry) => ({
      from: parseHexColor(entry.originalHex),
      to: parseHexColor(entry.currentHex),
      sharePercent: entry.sharePercent,
    }));

  return {
    remaps,
    palette: working.map((entry) => ({
      from: entry.originalHex,
      to: entry.currentHex,
      adjusted: entry.adjusted,
      sharePercent: entry.sharePercent,
    })),
    summary: {
      aaThreshold,
      initialBelowAA,
      remainingBelowAA,
      fixedPairs: initialBelowAA - remainingBelowAA,
      adjustedColors: remaps.length,
    },
  };
}

function normalizeRemapColor(value, label) {
  if (typeof value === 'string') {
    return parseHexColor(value);
  }
  assertRgbObject(value, label);
  return { r: value.r, g: value.g, b: value.b };
}

export function applyPaletteRemapToImageData(data, width, height, remaps, options = {}) {
  if (!Number.isInteger(width) || !Number.isInteger(height) || width <= 0 || height <= 0) {
    throw new Error('Image dimensions must be positive integers.');
  }

  if (!data || typeof data.length !== 'number' || data.length !== width * height * 4) {
    throw new Error('Image data length must equal width * height * 4.');
  }

  if (!Array.isArray(remaps)) {
    throw new Error('Remaps must be an array.');
  }

  const { matchDistance = 64 } = options;
  requireFinitePositiveNumber(matchDistance, 'Match distance', 0);
  const matchDistanceSq = matchDistance * matchDistance;

  const anchors = remaps.map((remap, index) => {
    const from = normalizeRemapColor(remap?.from, `Remap ${index} "from" color`);
    const to = normalizeRemapColor(remap?.to, `Remap ${index} "to" color`);
    return {
      from,
      dr: to.r - from.r,
      dg: to.g - from.g,
      db: to.b - from.b,
    };
  });

  const totalPixels = width * height;
  let changedPixels = 0;
  if (!anchors.length) {
    return { changedPixels, totalPixels };
  }

  for (let pixel = 0; pixel < totalPixels; pixel += 1) {
    const offset = pixel * 4;
    if (data[offset + 3] === 0) {
      continue;
    }

    const r = data[offset];
    const g = data[offset + 1];
    const b = data[offset + 2];

    let bestAnchor = null;
    let bestDistanceSq = Infinity;
    for (const anchor of anchors) {
      const dr = r - anchor.from.r;
      const dg = g - anchor.from.g;
      const db = b - anchor.from.b;
      const distanceSq = dr * dr + dg * dg + db * db;
      if (distanceSq <= matchDistanceSq && distanceSq < bestDistanceSq) {
        bestDistanceSq = distanceSq;
        bestAnchor = anchor;
      }
    }

    if (!bestAnchor || (bestAnchor.dr === 0 && bestAnchor.dg === 0 && bestAnchor.db === 0)) {
      continue;
    }

    data[offset] = clampColorChannel(r + bestAnchor.dr, 0, 255);
    data[offset + 1] = clampColorChannel(g + bestAnchor.dg, 0, 255);
    data[offset + 2] = clampColorChannel(b + bestAnchor.db, 0, 255);
    changedPixels += 1;
  }

  return { changedPixels, totalPixels };
}

const FIELD_LOSS_SHAPES = new Set(['peripheral', 'central']);

function normalizeFieldLossFill(value) {
  const channels = Array.isArray(value) ? value : [value?.r, value?.g, value?.b];
  if (channels.length !== 3 || channels.some((channel) => !Number.isFinite(channel) || channel < 0 || channel > 255)) {
    throw new Error('Field loss fill must provide r, g, and b channels between 0 and 255.');
  }
  return channels.map((channel) => Math.round(channel));
}

export function applyFieldLossMask(data, width, height, options = {}) {
  if (!Number.isInteger(width) || !Number.isInteger(height) || width <= 0 || height <= 0) {
    throw new Error('Image dimensions must be positive integers.');
  }

  if (!data || typeof data.length !== 'number' || data.length !== width * height * 4) {
    throw new Error('Image data length must equal width * height * 4.');
  }

  const shape = options.shape ?? 'peripheral';
  if (!FIELD_LOSS_SHAPES.has(shape)) {
    throw new Error('Field loss shape must be "peripheral" or "central".');
  }

  const innerRadius = Number(options.innerRadius ?? (shape === 'peripheral' ? 0.35 : 0.16));
  const outerRadius = Number(options.outerRadius ?? (shape === 'peripheral' ? 0.9 : 0.42));
  if (!Number.isFinite(innerRadius) || innerRadius < 0) {
    throw new Error('Inner radius must be a non-negative number.');
  }
  if (!Number.isFinite(outerRadius) || outerRadius <= innerRadius) {
    throw new Error('Outer radius must be greater than the inner radius.');
  }

  const [fillR, fillG, fillB] = normalizeFieldLossFill(
    options.fill ?? (shape === 'peripheral' ? [18, 16, 15] : [74, 68, 62]),
  );

  const centerX = (width - 1) / 2;
  const centerY = (height - 1) / 2;
  const halfWidth = Math.max(width / 2, 1);
  const halfHeight = Math.max(height / 2, 1);
  const falloff = outerRadius - innerRadius;

  const totalPixels = width * height;
  let occludedPixels = 0;

  for (let y = 0; y < height; y += 1) {
    const dy = (y - centerY) / halfHeight;
    for (let x = 0; x < width; x += 1) {
      const dx = (x - centerX) / halfWidth;
      const distance = Math.sqrt(dx * dx + dy * dy);
      const t = Math.min(1, Math.max(0, (distance - innerRadius) / falloff));
      const smooth = t * t * (3 - 2 * t);
      const occlusion = shape === 'peripheral' ? smooth : 1 - smooth;
      if (occlusion <= 0) {
        continue;
      }

      const offset = (y * width + x) * 4;
      data[offset] = clamp(data[offset] + (fillR - data[offset]) * occlusion);
      data[offset + 1] = clamp(data[offset + 1] + (fillG - data[offset + 1]) * occlusion);
      data[offset + 2] = clamp(data[offset + 2] + (fillB - data[offset + 2]) * occlusion);
      if (occlusion >= 0.5) {
        occludedPixels += 1;
      }
    }
  }

  return {
    occludedPixels,
    totalPixels,
    occludedRatio: totalPixels > 0 ? occludedPixels / totalPixels : 0,
  };
}

export function orderVisionReelSegments(entries) {
  if (!Array.isArray(entries)) {
    throw new Error('Vision reel entries must be an array.');
  }

  const valid = entries.filter((entry) => entry && typeof entry.id === 'string' && entry.id);
  const source = valid.filter((entry) => entry.id === 'source').slice(0, 1);
  const simulations = valid.filter((entry) => entry.id !== 'source');
  const ordered = [...simulations].sort((a, b) => {
    const aHasImpact = Number.isFinite(a.impactPercent);
    const bHasImpact = Number.isFinite(b.impactPercent);
    if (aHasImpact && bHasImpact && a.impactPercent !== b.impactPercent) {
      return b.impactPercent - a.impactPercent;
    }
    if (aHasImpact && !bHasImpact) {
      return -1;
    }
    if (!aHasImpact && bHasImpact) {
      return 1;
    }
    return 0;
  });

  return [...source, ...ordered];
}

export function detectTextLikeRegions(data, width, height, options = {}) {
  if (!Number.isInteger(width) || !Number.isInteger(height) || width <= 0 || height <= 0) {
    throw new Error('Image dimensions must be positive integers.');
  }

  if (!data || typeof data.length !== 'number' || data.length !== width * height * 4) {
    throw new Error('Image data length must equal width * height * 4.');
  }

  const {
    tileSize = 12,
    edgeThreshold = 10,
    rangeThreshold = 48,
    minTiles = 3,
    maxRegions = 8,
    aaThreshold = 4.5,
    aaaThreshold = 7,
    largeTextThreshold = 3,
  } = options;
  requireFinitePositiveNumber(tileSize, 'Tile size', 4);
  requireFinitePositiveNumber(edgeThreshold, 'Edge threshold', 0.1);
  requireFinitePositiveNumber(rangeThreshold, 'Range threshold', 1);
  requireFinitePositiveNumber(minTiles, 'Minimum tiles', 1);
  requireFinitePositiveNumber(maxRegions, 'Max regions', 1);
  requireFinitePositiveNumber(aaThreshold, 'AA threshold', 0.1);
  requireFinitePositiveNumber(aaaThreshold, 'AAA threshold', 0.1);
  requireFinitePositiveNumber(largeTextThreshold, 'Large-text threshold', 0.1);

  const tile = Math.max(4, Math.floor(tileSize));
  const cols = Math.ceil(width / tile);
  const rows = Math.ceil(height / tile);
  const grid = { tileSize: tile, cols, rows };

  const luma = new Float32Array(width * height);
  for (let pixel = 0; pixel < width * height; pixel += 1) {
    const offset = pixel * 4;
    luma[pixel] = 0.2126 * data[offset] + 0.7152 * data[offset + 1] + 0.0722 * data[offset + 2];
  }

  const tileCountTotal = cols * rows;
  const edgeSum = new Float32Array(tileCountTotal);
  const sampleCount = new Uint32Array(tileCountTotal);
  const tileMin = new Float32Array(tileCountTotal).fill(255);
  const tileMax = new Float32Array(tileCountTotal);

  for (let y = 0; y < height - 1; y += 1) {
    const rowBase = y * width;
    const tileRow = Math.floor(y / tile) * cols;
    for (let x = 0; x < width - 1; x += 1) {
      const index = rowBase + x;
      const value = luma[index];
      const gradient = Math.abs(luma[index + 1] - value) + Math.abs(luma[index + width] - value);
      const tileIndex = tileRow + Math.floor(x / tile);
      edgeSum[tileIndex] += gradient;
      sampleCount[tileIndex] += 1;
      if (value < tileMin[tileIndex]) tileMin[tileIndex] = value;
      if (value > tileMax[tileIndex]) tileMax[tileIndex] = value;
    }
  }

  const textLike = new Uint8Array(tileCountTotal);
  for (let index = 0; index < tileCountTotal; index += 1) {
    if (
      sampleCount[index] > 0 &&
      edgeSum[index] / sampleCount[index] >= edgeThreshold &&
      tileMax[index] - tileMin[index] >= rangeThreshold
    ) {
      textLike[index] = 1;
    }
  }

  const visited = new Uint8Array(tileCountTotal);
  const evaluated = [];
  const queue = new Int32Array(tileCountTotal);

  for (let start = 0; start < tileCountTotal; start += 1) {
    if (!textLike[start] || visited[start]) {
      continue;
    }

    let head = 0;
    let tail = 0;
    queue[tail] = start;
    tail += 1;
    visited[start] = 1;
    let tileCount = 0;
    let minCol = cols;
    let maxCol = -1;
    let minRow = rows;
    let maxRow = -1;

    while (head < tail) {
      const current = queue[head];
      head += 1;
      tileCount += 1;
      const col = current % cols;
      const row = Math.floor(current / cols);
      if (col < minCol) minCol = col;
      if (col > maxCol) maxCol = col;
      if (row < minRow) minRow = row;
      if (row > maxRow) maxRow = row;

      const neighbors = [
        col > 0 ? current - 1 : -1,
        col < cols - 1 ? current + 1 : -1,
        row > 0 ? current - cols : -1,
        row < rows - 1 ? current + cols : -1,
      ];
      for (const neighbor of neighbors) {
        if (neighbor >= 0 && textLike[neighbor] && !visited[neighbor]) {
          visited[neighbor] = 1;
          queue[tail] = neighbor;
          tail += 1;
        }
      }
    }

    if (tileCount < minTiles) {
      continue;
    }

    const x0 = minCol * tile;
    const y0 = minRow * tile;
    const x1 = Math.min(width, (maxCol + 1) * tile);
    const y1 = Math.min(height, (maxRow + 1) * tile);

    const split = splitRegionLuminanceClusters(data, luma, width, x0, y0, x1, y1);
    if (!split) {
      continue;
    }

    const textRgb = split.text;
    const backgroundRgb = split.background;
    const ratio = contrastRatio(textRgb, backgroundRgb);
    let level = 'fail';
    if (ratio >= aaaThreshold) {
      level = 'aaa';
    } else if (ratio >= aaThreshold) {
      level = 'aa';
    } else if (ratio >= largeTextThreshold) {
      level = 'aa-large';
    }

    evaluated.push({
      x: x0,
      y: y0,
      width: x1 - x0,
      height: y1 - y0,
      tileCount,
      text: { hex: rgbToHex(textRgb), rgb: textRgb },
      background: { hex: rgbToHex(backgroundRgb), rgb: backgroundRgb },
      ratio,
      level,
      passesAA: ratio >= aaThreshold,
    });
  }

  evaluated.sort((a, b) => a.ratio - b.ratio);

  const summary = {
    total: evaluated.length,
    aaa: evaluated.filter((region) => region.level === 'aaa').length,
    aa: evaluated.filter((region) => region.level === 'aa').length,
    aaLargeOnly: evaluated.filter((region) => region.level === 'aa-large').length,
    fail: evaluated.filter((region) => region.level === 'fail').length,
  };
  summary.belowAA = summary.aaLargeOnly + summary.fail;

  return { regions: evaluated.slice(0, Math.floor(maxRegions)), summary, grid };
}

export const COMPONENT_CONTRAST_DEFAULTS = Object.freeze({
  minRatio: 3,
  bandStep: 3,
  maxExpansion: 60,
  surfaceDeltaE: 5,
  minBandShare: 0.35,
  minBandPixels: 24,
});

function sampleBandModalColor(data, width, height, box, outerPad, thickness) {
  const outerX0 = box.x - outerPad;
  const outerY0 = box.y - outerPad;
  const outerX1 = box.x + box.width + outerPad;
  const outerY1 = box.y + box.height + outerPad;
  const innerX0 = outerX0 + thickness;
  const innerY0 = outerY0 + thickness;
  const innerX1 = outerX1 - thickness;
  const innerY1 = outerY1 - thickness;

  const buckets = new Map();
  let total = 0;
  const addPixel = (x, y) => {
    if (x < 0 || y < 0 || x >= width || y >= height) {
      return;
    }
    const offset = (y * width + x) * 4;
    const r = data[offset];
    const g = data[offset + 1];
    const b = data[offset + 2];
    const key = ((r >> 4) << 8) | ((g >> 4) << 4) | (b >> 4);
    let bucket = buckets.get(key);
    if (!bucket) {
      bucket = { count: 0, r: 0, g: 0, b: 0 };
      buckets.set(key, bucket);
    }
    bucket.count += 1;
    bucket.r += r;
    bucket.g += g;
    bucket.b += b;
    total += 1;
  };

  for (let y = outerY0; y < outerY1; y += 1) {
    if (y >= innerY0 && y < innerY1) {
      for (let x = outerX0; x < innerX0; x += 1) addPixel(x, y);
      for (let x = innerX1; x < outerX1; x += 1) addPixel(x, y);
    } else {
      for (let x = outerX0; x < outerX1; x += 1) addPixel(x, y);
    }
  }

  if (total === 0) {
    return null;
  }

  let best = null;
  for (const bucket of buckets.values()) {
    if (!best || bucket.count > best.count) {
      best = bucket;
    }
  }

  return {
    color: {
      r: Math.round(best.r / best.count),
      g: Math.round(best.g / best.count),
      b: Math.round(best.b / best.count),
    },
    share: best.count / total,
    sampled: total,
  };
}

/**
 * WCAG SC 1.4.11 "Non-text Contrast": the visual boundary of a UI component
 * must hold at least 3:1 against adjacent colors, or the control disappears —
 * the classic pale "ghost" input or button users cannot find. Every other
 * lens here scores text against its own background; none of them notice that
 * the component SURFACE itself may be nearly invisible against the page.
 *
 * For each detected text-like region, this marches a thin ring outward from
 * the region box until the ring's modal color departs from the component's
 * surface color (Lab distance >= surfaceDeltaE). That ring is the adjacent
 * surface — either the page or a drawn border — and the WCAG ratio between
 * surface and surrounding decides 1.4.11. Honest limitation: a surface that
 * is pixel-identical to the page cannot be told apart from plain text sitting
 * directly on the page, so those regions are reported as `page-surface`, not
 * as failures.
 */
export function scanComponentSurfaceContrast(data, width, height, regions, options = {}) {
  if (!Number.isInteger(width) || !Number.isInteger(height) || width <= 0 || height <= 0) {
    throw new Error('Image dimensions must be positive integers.');
  }

  if (!data || typeof data.length !== 'number' || data.length !== width * height * 4) {
    throw new Error('Image data length must equal width * height * 4.');
  }

  if (!Array.isArray(regions)) {
    throw new Error('Regions must be an array of detected text-like regions.');
  }

  const {
    minRatio = COMPONENT_CONTRAST_DEFAULTS.minRatio,
    bandStep = COMPONENT_CONTRAST_DEFAULTS.bandStep,
    maxExpansion = COMPONENT_CONTRAST_DEFAULTS.maxExpansion,
    surfaceDeltaE = COMPONENT_CONTRAST_DEFAULTS.surfaceDeltaE,
    minBandShare = COMPONENT_CONTRAST_DEFAULTS.minBandShare,
    minBandPixels = COMPONENT_CONTRAST_DEFAULTS.minBandPixels,
  } = options;
  requireFinitePositiveNumber(minRatio, 'Minimum ratio', 1);
  requireFinitePositiveNumber(bandStep, 'Band step', 1);
  requireFinitePositiveNumber(maxExpansion, 'Max expansion', 1);
  requireFinitePositiveNumber(surfaceDeltaE, 'Surface delta-E', 0.1);

  const components = [];
  const findings = [];
  let passing = 0;
  let pageSurfaces = 0;
  let inconclusive = 0;

  regions.forEach((region, regionIndex) => {
    const surface = region?.background?.rgb;
    const validBox =
      Number.isFinite(region?.x) &&
      Number.isFinite(region?.y) &&
      Number.isFinite(region?.width) &&
      Number.isFinite(region?.height) &&
      region.width > 0 &&
      region.height > 0;
    if (!surface || !validBox) {
      inconclusive += 1;
      components.push({ regionIndex, outcome: 'inconclusive', reason: 'invalid-region' });
      return;
    }

    const box = { x: region.x, y: region.y, width: region.width, height: region.height };
    let surrounding = null;
    let boundaryDistance = null;
    let clamped = false;
    for (let expansion = bandStep; expansion <= maxExpansion; expansion += bandStep) {
      const band = sampleBandModalColor(data, width, height, box, expansion, bandStep);
      if (!band || band.sampled < minBandPixels) {
        clamped = true;
        break;
      }
      if (band.share < minBandShare) {
        continue;
      }
      if (labDeltaE(band.color, surface) < surfaceDeltaE) {
        continue;
      }
      surrounding = band.color;
      boundaryDistance = expansion;
      break;
    }

    if (!surrounding) {
      if (clamped) {
        inconclusive += 1;
        components.push({ regionIndex, outcome: 'inconclusive', reason: 'image-edge' });
      } else {
        pageSurfaces += 1;
        components.push({ regionIndex, outcome: 'page-surface' });
      }
      return;
    }

    const ratio = contrastRatio(surface, surrounding);
    const passes = ratio >= minRatio;
    const entry = {
      regionIndex,
      outcome: passes ? 'pass' : 'fail',
      surface: { hex: rgbToHex(surface), rgb: { ...surface } },
      surrounding: { hex: rgbToHex(surrounding), rgb: surrounding },
      ratio,
      deltaE: labDeltaE(surface, surrounding),
      boundaryDistance,
      box,
    };
    components.push(entry);
    if (passes) {
      passing += 1;
    } else {
      findings.push(entry);
    }
  });

  findings.sort((a, b) => a.ratio - b.ratio);

  const summary = {
    regionsConsidered: regions.length,
    evaluated: passing + findings.length,
    passing,
    failing: findings.length,
    pageSurfaces,
    inconclusive,
    minRatio,
    worstRatio: findings.length ? findings[0].ratio : null,
  };

  return { components, findings, summary };
}

export const TARGET_SIZE_DEFAULTS = Object.freeze({
  minTargetCss: 24,
  // Must stay below the component scan's boundary-departure delta (5): a
  // ghost surface can sit within dE 6 of the page, and a looser flood mask
  // would leak through it into the page and reject the real control.
  surfaceDeltaE: 4,
  minBlobCss: 8,
  maxBlobCss: 160,
  minSolidity: 0.55,
  windowPad: 12,
  cssPixelRatio: 1,
});

function clampWindow(box, pad, width, height) {
  return {
    x0: Math.max(0, Math.floor(box.x - pad)),
    y0: Math.max(0, Math.floor(box.y - pad)),
    x1: Math.min(width, Math.ceil(box.x + box.width + pad)),
    y1: Math.min(height, Math.ceil(box.y + box.height + pad)),
  };
}

function measureSurfaceTargetExtent(data, width, height, box, surfaceRgb, reach, surfaceDeltaE) {
  const win = clampWindow(box, reach, width, height);
  const winWidth = win.x1 - win.x0;
  const winHeight = win.y1 - win.y0;
  if (winWidth <= 0 || winHeight <= 0) {
    return null;
  }

  const mask = new Uint8Array(winWidth * winHeight);
  for (let y = win.y0; y < win.y1; y += 1) {
    const rowBase = y * width;
    const maskRow = (y - win.y0) * winWidth;
    for (let x = win.x0; x < win.x1; x += 1) {
      const offset = (rowBase + x) * 4;
      const pixel = { r: data[offset], g: data[offset + 1], b: data[offset + 2] };
      if (labDeltaE(pixel, surfaceRgb) <= surfaceDeltaE) {
        mask[maskRow + (x - win.x0)] = 1;
      }
    }
  }

  const visited = new Uint8Array(winWidth * winHeight);
  const queue = new Int32Array(winWidth * winHeight);
  let tail = 0;
  const seedX0 = Math.max(win.x0, Math.floor(box.x)) - win.x0;
  const seedY0 = Math.max(win.y0, Math.floor(box.y)) - win.y0;
  const seedX1 = Math.min(win.x1, Math.ceil(box.x + box.width)) - win.x0;
  const seedY1 = Math.min(win.y1, Math.ceil(box.y + box.height)) - win.y0;
  for (let y = seedY0; y < seedY1; y += 1) {
    for (let x = seedX0; x < seedX1; x += 1) {
      const index = y * winWidth + x;
      if (mask[index] && !visited[index]) {
        visited[index] = 1;
        queue[tail] = index;
        tail += 1;
      }
    }
  }
  if (tail === 0) {
    return null;
  }

  let head = 0;
  let minX = winWidth;
  let maxX = -1;
  let minY = winHeight;
  let maxY = -1;
  let pixelCount = 0;
  while (head < tail) {
    const index = queue[head];
    head += 1;
    pixelCount += 1;
    const x = index % winWidth;
    const y = Math.floor(index / winWidth);
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
    const neighbors = [
      x > 0 ? index - 1 : -1,
      x < winWidth - 1 ? index + 1 : -1,
      y > 0 ? index - winWidth : -1,
      y < winHeight - 1 ? index + winWidth : -1,
    ];
    for (const neighbor of neighbors) {
      if (neighbor >= 0 && mask[neighbor] && !visited[neighbor]) {
        visited[neighbor] = 1;
        queue[tail] = neighbor;
        tail += 1;
      }
    }
  }

  // A flood that stops at the image border found the element's true edge
  // (the screenshot simply ends there); stopping at the sampling window
  // instead means the surface keeps going, so that axis is a lower bound.
  const clippedX =
    (minX === 0 && win.x0 > 0) || (maxX === winWidth - 1 && win.x1 < width);
  const clippedY =
    (minY === 0 && win.y0 > 0) || (maxY === winHeight - 1 && win.y1 < height);

  return {
    box: { x: win.x0 + minX, y: win.y0 + minY, width: maxX - minX + 1, height: maxY - minY + 1 },
    pixelCount,
    clippedX,
    clippedY,
  };
}

function measureInkBlobTargets(data, width, height, box, textRgb, backgroundRgb, opts) {
  const win = clampWindow(box, opts.windowPad, width, height);
  const winWidth = win.x1 - win.x0;
  const winHeight = win.y1 - win.y0;
  if (winWidth <= 0 || winHeight <= 0) {
    return [];
  }

  const textLuma = 0.2126 * textRgb.r + 0.7152 * textRgb.g + 0.0722 * textRgb.b;
  const backgroundLuma =
    0.2126 * backgroundRgb.r + 0.7152 * backgroundRgb.g + 0.0722 * backgroundRgb.b;
  const mask = new Uint8Array(winWidth * winHeight);
  for (let y = win.y0; y < win.y1; y += 1) {
    const rowBase = y * width;
    const maskRow = (y - win.y0) * winWidth;
    for (let x = win.x0; x < win.x1; x += 1) {
      const offset = (rowBase + x) * 4;
      const luma = 0.2126 * data[offset] + 0.7152 * data[offset + 1] + 0.0722 * data[offset + 2];
      if (Math.abs(luma - textLuma) < Math.abs(luma - backgroundLuma)) {
        mask[maskRow + (x - win.x0)] = 1;
      }
    }
  }

  const visited = new Uint8Array(winWidth * winHeight);
  const queue = new Int32Array(winWidth * winHeight);
  const blobs = [];
  for (let start = 0; start < mask.length; start += 1) {
    if (!mask[start] || visited[start]) {
      continue;
    }
    visited[start] = 1;
    queue[0] = start;
    let head = 0;
    let tail = 1;
    let minX = winWidth;
    let maxX = -1;
    let minY = winHeight;
    let maxY = -1;
    let pixelCount = 0;
    let sumR = 0;
    let sumG = 0;
    let sumB = 0;
    while (head < tail) {
      const index = queue[head];
      head += 1;
      pixelCount += 1;
      const x = index % winWidth;
      const y = Math.floor(index / winWidth);
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
      const offset = ((win.y0 + y) * width + (win.x0 + x)) * 4;
      sumR += data[offset];
      sumG += data[offset + 1];
      sumB += data[offset + 2];
      const neighbors = [
        x > 0 ? index - 1 : -1,
        x < winWidth - 1 ? index + 1 : -1,
        y > 0 ? index - winWidth : -1,
        y < winHeight - 1 ? index + winWidth : -1,
      ];
      for (const neighbor of neighbors) {
        if (neighbor >= 0 && mask[neighbor] && !visited[neighbor]) {
          visited[neighbor] = 1;
          queue[tail] = neighbor;
          tail += 1;
        }
      }
    }

    // Blobs cut off by the sampling window are fragments of something larger
    // (a border, a panel edge) — their size cannot be trusted, so skip them.
    const touchesWindowEdge =
      (minX === 0 && win.x0 > 0) ||
      (maxX === winWidth - 1 && win.x1 < width) ||
      (minY === 0 && win.y0 > 0) ||
      (maxY === winHeight - 1 && win.y1 < height);
    if (touchesWindowEdge) {
      continue;
    }

    const blobWidth = maxX - minX + 1;
    const blobHeight = maxY - minY + 1;
    const widthCss = blobWidth / opts.cssPixelRatio;
    const heightCss = blobHeight / opts.cssPixelRatio;
    const solidity = pixelCount / (blobWidth * blobHeight);
    if (
      Math.min(widthCss, heightCss) < opts.minBlobCss ||
      Math.max(widthCss, heightCss) > opts.maxBlobCss ||
      solidity < opts.minSolidity
    ) {
      continue;
    }

    blobs.push({
      box: { x: win.x0 + minX, y: win.y0 + minY, width: blobWidth, height: blobHeight },
      pixelCount,
      solidity,
      color: {
        r: Math.round(sumR / pixelCount),
        g: Math.round(sumG / pixelCount),
        b: Math.round(sumB / pixelCount),
      },
      clippedX: false,
      clippedY: false,
    });
  }
  return blobs;
}

/**
 * WCAG SC 2.5.8 "Target Size (Minimum)": interactive targets must measure at
 * least 24x24 CSS pixels, unless an undersized target has enough clear space
 * that a 24px circle centered on it does not intersect any other target or
 * another undersized target's circle. No contrast lens can see this failure —
 * a row of crisp, high-contrast 16px icon buttons passes every color check
 * while staying nearly impossible to tap.
 *
 * Detected text regions provide the candidates: regions with a resolved
 * component surface (from scanComponentSurfaceContrast) are measured by
 * flood-filling that surface to pixel precision, while regions sitting
 * directly on the page are searched for compact solid-surface blobs (icon
 * buttons, chips) — thin glyph strokes are rejected by a solidity filter so
 * plain words are never treated as tap targets. Sizes are converted to CSS
 * pixels via cssPixelRatio (image px per CSS px); the caller states the
 * screenshot scale assumption.
 */
export function scanTargetSizes(data, width, height, regions, components = [], options = {}) {
  if (!Number.isInteger(width) || !Number.isInteger(height) || width <= 0 || height <= 0) {
    throw new Error('Image dimensions must be positive integers.');
  }
  if (!data || typeof data.length !== 'number' || data.length !== width * height * 4) {
    throw new Error('Image data length must equal width * height * 4.');
  }
  if (!Array.isArray(regions)) {
    throw new Error('Regions must be an array of detected text-like regions.');
  }
  if (!Array.isArray(components)) {
    throw new Error('Components must be an array of component-contrast entries.');
  }

  const {
    minTargetCss = TARGET_SIZE_DEFAULTS.minTargetCss,
    surfaceDeltaE = TARGET_SIZE_DEFAULTS.surfaceDeltaE,
    minBlobCss = TARGET_SIZE_DEFAULTS.minBlobCss,
    maxBlobCss = TARGET_SIZE_DEFAULTS.maxBlobCss,
    minSolidity = TARGET_SIZE_DEFAULTS.minSolidity,
    windowPad = TARGET_SIZE_DEFAULTS.windowPad,
    cssPixelRatio = TARGET_SIZE_DEFAULTS.cssPixelRatio,
  } = options;
  requireFinitePositiveNumber(minTargetCss, 'Minimum target size', 1);
  requireFinitePositiveNumber(surfaceDeltaE, 'Surface delta-E', 0.1);
  requireFinitePositiveNumber(minBlobCss, 'Minimum blob size', 1);
  requireFinitePositiveNumber(maxBlobCss, 'Maximum blob size', minBlobCss);
  requireFinitePositiveNumber(minSolidity, 'Minimum solidity', 0.05);
  requireFinitePositiveNumber(windowPad, 'Window pad', 0);
  requireFinitePositiveNumber(cssPixelRatio, 'CSS pixel ratio', 0.01);

  const componentByRegion = new Map();
  components.forEach((entry) => {
    if (entry && Number.isInteger(entry.regionIndex)) {
      componentByRegion.set(entry.regionIndex, entry);
    }
  });

  const blobOpts = { windowPad, minBlobCss, maxBlobCss, minSolidity, cssPixelRatio };
  const candidates = [];
  regions.forEach((region, regionIndex) => {
    const validBox =
      Number.isFinite(region?.x) &&
      Number.isFinite(region?.y) &&
      Number.isFinite(region?.width) &&
      Number.isFinite(region?.height) &&
      region.width > 0 &&
      region.height > 0;
    if (!validBox) {
      return;
    }
    const box = { x: region.x, y: region.y, width: region.width, height: region.height };
    const component = componentByRegion.get(regionIndex) || null;
    if (component && component.outcome === 'inconclusive') {
      return;
    }
    if (component && (component.outcome === 'pass' || component.outcome === 'fail')) {
      const surface = component.surface?.rgb || region.background?.rgb;
      if (surface) {
        const reach = Math.max(0, Math.round(component.boundaryDistance ?? 0)) + windowPad;
        const extent = measureSurfaceTargetExtent(
          data,
          width,
          height,
          box,
          surface,
          reach,
          surfaceDeltaE,
        );
        // A flood that escapes the window on BOTH axes is the page itself
        // (the march found some other element across whitespace, not this
        // region's own control) — fall through to solid-blob analysis.
        if (extent && !(extent.clippedX && extent.clippedY)) {
          candidates.push({
            ...extent,
            kind: 'component-surface',
            regionIndex,
            color: { ...surface },
          });
          return;
        }
      }
    }
    const textRgb = region.text?.rgb;
    const backgroundRgb = region.background?.rgb;
    if (!textRgb || !backgroundRgb) {
      return;
    }
    measureInkBlobTargets(data, width, height, box, textRgb, backgroundRgb, blobOpts).forEach(
      (blob) => {
        candidates.push({ ...blob, kind: 'solid-block', regionIndex });
      },
    );
  });

  // Overlapping candidates from adjacent regions describe the same element;
  // keep the larger measurement.
  candidates.sort((a, b) => b.box.width * b.box.height - a.box.width * a.box.height);
  const targets = [];
  for (const candidate of candidates) {
    const duplicate = targets.some((kept) => {
      const ix = Math.max(
        0,
        Math.min(kept.box.x + kept.box.width, candidate.box.x + candidate.box.width) -
          Math.max(kept.box.x, candidate.box.x),
      );
      const iy = Math.max(
        0,
        Math.min(kept.box.y + kept.box.height, candidate.box.y + candidate.box.height) -
          Math.max(kept.box.y, candidate.box.y),
      );
      const overlap = ix * iy;
      const smaller = Math.min(
        kept.box.width * kept.box.height,
        candidate.box.width * candidate.box.height,
      );
      return smaller > 0 && overlap / smaller > 0.6;
    });
    if (!duplicate) {
      targets.push(candidate);
    }
  }

  targets.forEach((target) => {
    target.widthCss = Number((target.box.width / cssPixelRatio).toFixed(1));
    target.heightCss = Number((target.box.height / cssPixelRatio).toFixed(1));
    target.centerCss = {
      x: (target.box.x + target.box.width / 2) / cssPixelRatio,
      y: (target.box.y + target.box.height / 2) / cssPixelRatio,
    };
    target.color = target.color ? { hex: rgbToHex(target.color), rgb: target.color } : null;
    const effectiveWidth = target.clippedX ? Number.POSITIVE_INFINITY : target.widthCss;
    const effectiveHeight = target.clippedY ? Number.POSITIVE_INFINITY : target.heightCss;
    target.minCss = Math.min(effectiveWidth, effectiveHeight);
  });

  const radius = minTargetCss / 2;
  targets.forEach((target) => {
    if (target.minCss >= minTargetCss) {
      target.outcome = 'pass';
      return;
    }
    const crowdedBy = targets.find((other) => {
      if (other === target) {
        return false;
      }
      if (other.minCss < minTargetCss) {
        const dx = other.centerCss.x - target.centerCss.x;
        const dy = other.centerCss.y - target.centerCss.y;
        return Math.sqrt(dx * dx + dy * dy) < minTargetCss;
      }
      const otherX0 = other.box.x / cssPixelRatio;
      const otherY0 = other.box.y / cssPixelRatio;
      const otherX1 = (other.box.x + other.box.width) / cssPixelRatio;
      const otherY1 = (other.box.y + other.box.height) / cssPixelRatio;
      const nearestX = Math.max(otherX0, Math.min(target.centerCss.x, otherX1));
      const nearestY = Math.max(otherY0, Math.min(target.centerCss.y, otherY1));
      const dx = nearestX - target.centerCss.x;
      const dy = nearestY - target.centerCss.y;
      return Math.sqrt(dx * dx + dy * dy) < radius;
    });
    target.outcome = crowdedBy ? 'fail' : 'spacing-exempt';
  });

  const outcomeOrder = { fail: 0, 'spacing-exempt': 1, pass: 2 };
  targets.sort((a, b) => {
    if (outcomeOrder[a.outcome] !== outcomeOrder[b.outcome]) {
      return outcomeOrder[a.outcome] - outcomeOrder[b.outcome];
    }
    return a.minCss - b.minCss;
  });

  const undersized = targets.filter((target) => target.outcome === 'fail');
  const summary = {
    regionsConsidered: regions.length,
    targets: targets.length,
    undersized: undersized.length,
    spacingExempt: targets.filter((target) => target.outcome === 'spacing-exempt').length,
    passing: targets.filter((target) => target.outcome === 'pass').length,
    minTargetCss,
    cssPixelRatio,
    worst: undersized.length
      ? { widthCss: undersized[0].widthCss, heightCss: undersized[0].heightCss }
      : null,
  };

  return { targets, findings: undersized, summary };
}

export function applyTextRegionContrastFix(data, width, height, region, replacementTextColor, replacementBackgroundColor = null) {
  if (!Number.isInteger(width) || !Number.isInteger(height) || width <= 0 || height <= 0) {
    throw new Error('Image dimensions must be positive integers.');
  }
  if (!data || typeof data.length !== 'number' || data.length !== width * height * 4) {
    throw new Error('Image data length must equal width * height * 4.');
  }
  if (!region || !region.text?.rgb) {
    throw new Error('A detected text region with a sampled text color is required.');
  }

  const replacement = parseHexColor(replacementTextColor);
  const backgroundReplacement = replacementBackgroundColor ? parseHexColor(replacementBackgroundColor) : null;
  const sampledText = region.text.rgb;
  const sampledBackground = region.background?.rgb;
  assertRgbObject(sampledText, 'Sampled text color');
  assertRgbObject(sampledBackground, 'Sampled background color');
  const x0 = Math.max(0, Math.floor(region.x));
  const y0 = Math.max(0, Math.floor(region.y));
  const x1 = Math.min(width, Math.ceil(region.x + region.width));
  const y1 = Math.min(height, Math.ceil(region.y + region.height));
  if (x1 <= x0 || y1 <= y0) {
    throw new Error('Detected text region must overlap the image.');
  }

  const distanceSquared = (r, g, b, target) =>
    (r - target.r) ** 2 + (g - target.g) ** 2 + (b - target.b) ** 2;
  const delta = {
    r: replacement.r - sampledText.r,
    g: replacement.g - sampledText.g,
    b: replacement.b - sampledText.b,
  };
  const backgroundDelta = backgroundReplacement ? {
    r: backgroundReplacement.r - sampledBackground.r,
    g: backgroundReplacement.g - sampledBackground.g,
    b: backgroundReplacement.b - sampledBackground.b,
  } : null;
  let changedPixels = 0;
  for (let y = y0; y < y1; y += 1) {
    for (let x = x0; x < x1; x += 1) {
      const offset = (y * width + x) * 4;
      if (data[offset + 3] < 16) continue;
      const textDistance = distanceSquared(data[offset], data[offset + 1], data[offset + 2], sampledText);
      const backgroundDistance = distanceSquared(data[offset], data[offset + 1], data[offset + 2], sampledBackground);
      // A conservative cluster gate keeps backgrounds and nearby controls intact while
      // including antialiased glyph edges that remain materially closer to the text sample.
      const selectedDelta = textDistance <= backgroundDistance * 0.8
        ? delta
        : backgroundDelta && backgroundDistance <= textDistance * 0.8
          ? backgroundDelta
          : null;
      if (!selectedDelta) continue;
      data[offset] = Math.max(0, Math.min(255, Math.round(data[offset] + selectedDelta.r)));
      data[offset + 1] = Math.max(0, Math.min(255, Math.round(data[offset + 1] + selectedDelta.g)));
      data[offset + 2] = Math.max(0, Math.min(255, Math.round(data[offset + 2] + selectedDelta.b)));
      changedPixels += 1;
    }
  }

  return {
    changedPixels,
    regionPixels: (x1 - x0) * (y1 - y0),
    replacement: replacement.hex,
    backgroundReplacement: backgroundReplacement?.hex || null,
  };
}

export const COMPONENT_SURFACE_FIX_DEFAULTS = Object.freeze({
  minRatio: 3,
  textMinRatio: 4.5,
  textMinApcaLc: 0,
  blendStep: 0.02,
  collisionDistinctDeltaE: 25,
  collisionCollapseDeltaE: 12,
});

function mixRgbToward(color, target, amount) {
  return {
    r: Math.round(color.r + (target.r - color.r) * amount),
    g: Math.round(color.g + (target.g - color.g) * amount),
    b: Math.round(color.b + (target.b - color.b) * amount),
  };
}

/**
 * Plan a WCAG 1.4.11 surface repair: the smallest perceptual shift of a
 * component surface that reaches `minRatio` against its adjacent color.
 * A qualifying surface may crush the component's own text (a light page
 * forces the surface toward mid-tone, killing dark-on-light text), so when
 * no qualifying surface keeps the text at `textMinRatio` the plan shifts the
 * text as well — one repair never trades a visible control for unreadable
 * text. With `textMinApcaLc > 0` the text constraint also requires that
 * APCA magnitude, which can force a genuinely dark surface with light text:
 * on a near-white page, every 3:1-compliant surface that keeps *dark* text
 * WCAG-legible is an APCA perceptual false pass, and a repair should not
 * fix one audit axis by silently failing another. `avoidCollisionColors`
 * extends the same principle to WCAG 1.4.1: surface candidates that would
 * collapse into a supplied dominant-palette color under any CVD projection
 * (distinct at a glance, near-identical color-blind) are avoided whenever a
 * non-colliding candidate exists, and `paletteSafe` reports the outcome.
 * All achieved ratios are reported honestly; when a target is unreachable
 * on the black/white blend line the best-effort candidate is returned with
 * its real ratio.
 */
export function planComponentSurfaceRepair(surfaceRgb, surroundingRgb, textRgb = null, options = {}) {
  assertRgbObject(surfaceRgb, 'Surface color');
  assertRgbObject(surroundingRgb, 'Surrounding color');
  if (textRgb) {
    assertRgbObject(textRgb, 'Text color');
  }

  const {
    minRatio = COMPONENT_SURFACE_FIX_DEFAULTS.minRatio,
    textMinRatio = COMPONENT_SURFACE_FIX_DEFAULTS.textMinRatio,
    textMinApcaLc = COMPONENT_SURFACE_FIX_DEFAULTS.textMinApcaLc,
    blendStep = COMPONENT_SURFACE_FIX_DEFAULTS.blendStep,
    avoidCollisionColors = [],
    collisionDistinctDeltaE = COMPONENT_SURFACE_FIX_DEFAULTS.collisionDistinctDeltaE,
    collisionCollapseDeltaE = COMPONENT_SURFACE_FIX_DEFAULTS.collisionCollapseDeltaE,
  } = options;
  requireFinitePositiveNumber(minRatio, 'Minimum ratio', 1);
  requireFinitePositiveNumber(textMinRatio, 'Text minimum ratio', 1);
  requireFinitePositiveNumber(textMinApcaLc, 'Text minimum APCA Lc', 0);
  requireFinitePositiveNumber(blendStep, 'Blend step', 0.001);
  if (!Array.isArray(avoidCollisionColors)) {
    throw new Error('Avoid-collision colors must be an array of RGB colors.');
  }
  const avoidColors = avoidCollisionColors.filter(
    (color) => color && Number.isFinite(color.r) && Number.isFinite(color.g) && Number.isFinite(color.b),
  );
  const collisionModes = CVD_MODES.filter(
    (mode) => mode && mode.kind === 'matrix' && mode.id !== 'normal' && Array.isArray(mode.matrix),
  );
  const createsPaletteCollision = (candidate) => {
    for (const color of avoidColors) {
      if (labDeltaE(candidate, color) < collisionDistinctDeltaE) {
        continue; // reads as the same color family at a glance — 1.4.1 out of scope
      }
      for (const mode of collisionModes) {
        const deltaE = labDeltaE(
          applyMatrixToColor(candidate, mode.matrix),
          applyMatrixToColor(color, mode.matrix),
        );
        if (deltaE < collisionCollapseDeltaE) {
          return true;
        }
      }
    }
    return false;
  };

  const anchors = [
    { r: 0, g: 0, b: 0 },
    { r: 255, g: 255, b: 255 },
  ];

  const searchBlendLine = (base, scoreCandidate) => {
    let best = null;
    let bestEffort = null;
    for (const anchor of anchors) {
      for (let t = 0; t <= 1.0000001; t += blendStep) {
        const candidate = mixRgbToward(base, anchor, Math.min(1, t));
        const distance = labDeltaE(candidate, base);
        const { ratio, meets } = scoreCandidate(candidate);
        if (!bestEffort || ratio > bestEffort.ratio) {
          bestEffort = { candidate, ratio, distance };
        }
        if (meets && (!best || distance < best.distance)) {
          best = { candidate, ratio, distance };
        }
      }
    }
    return { best, bestEffort };
  };

  const textMeets = (textCandidate, surfaceCandidate) =>
    contrastRatio(textCandidate, surfaceCandidate) >= textMinRatio &&
    (textMinApcaLc <= 0 || Math.abs(apcaContrast(textCandidate, surfaceCandidate)) >= textMinApcaLc);
  const findTextFor = (surfaceCandidate) =>
    searchBlendLine(textRgb, (candidate) => ({
      ratio: contrastRatio(candidate, surfaceCandidate),
      meets: textMeets(candidate, surfaceCandidate),
    }));

  // Tiered search, most desirable first. Palette-collision-free variants of
  // each tier come before their unconstrained counterparts so one repair
  // never trades WCAG 1.4.11 for a new WCAG 1.4.1 finding when avoidable.
  const surfaceHoldsRatio = (candidate) => contrastRatio(candidate, surroundingRgb) >= minRatio;
  const tiers = [];
  if (textRgb) {
    const untouchedText = (candidate) => surfaceHoldsRatio(candidate) && textMeets(textRgb, candidate);
    const shiftedText = (candidate) => surfaceHoldsRatio(candidate) && Boolean(findTextFor(candidate).best);
    if (avoidColors.length) {
      tiers.push({ meets: (c) => untouchedText(c) && !createsPaletteCollision(c), searchText: false });
      tiers.push({ meets: (c) => shiftedText(c) && !createsPaletteCollision(c), searchText: true });
    }
    tiers.push({ meets: untouchedText, searchText: false });
    tiers.push({ meets: shiftedText, searchText: true });
  } else if (avoidColors.length) {
    tiers.push({ meets: (c) => surfaceHoldsRatio(c) && !createsPaletteCollision(c), searchText: false });
  }

  let chosen = null;
  let textPlan = null;
  for (const tier of tiers) {
    const result = searchBlendLine(surfaceRgb, (candidate) => ({
      ratio: contrastRatio(candidate, surroundingRgb),
      meets: tier.meets(candidate),
    })).best;
    if (result) {
      chosen = result;
      if (tier.searchText) {
        textPlan = findTextFor(result.candidate).best;
      }
      break;
    }
  }
  if (!chosen) {
    // Last resort: satisfy the surface ratio alone (best effort beyond that)
    // and shift the text as far toward its targets as the blend line allows.
    const surfaceOnly = searchBlendLine(surfaceRgb, (candidate) => {
      const ratio = contrastRatio(candidate, surroundingRgb);
      return { ratio, meets: ratio >= minRatio };
    });
    chosen = surfaceOnly.best || surfaceOnly.bestEffort;
    if (!chosen) {
      return null;
    }
    if (textRgb && !textMeets(textRgb, chosen.candidate)) {
      const textSearch = findTextFor(chosen.candidate);
      const textChoice = textSearch.best || textSearch.bestEffort;
      if (textChoice && textChoice.ratio > contrastRatio(textRgb, chosen.candidate)) {
        textPlan = textChoice;
      }
    }
  }

  const effectiveText = textPlan ? textPlan.candidate : textRgb;
  return {
    surface: { hex: rgbToHex(chosen.candidate), rgb: chosen.candidate },
    surfaceRatio: contrastRatio(chosen.candidate, surroundingRgb),
    surfaceDeltaE: chosen.distance,
    originalText: textRgb ? { hex: rgbToHex(textRgb), rgb: { ...textRgb } } : null,
    text: textPlan ? { hex: rgbToHex(textPlan.candidate), rgb: textPlan.candidate } : null,
    textRatio: textRgb ? contrastRatio(effectiveText, chosen.candidate) : null,
    textApcaLc: textRgb ? Math.abs(apcaContrast(effectiveText, chosen.candidate)) : null,
    textAdjusted: Boolean(textPlan),
    paletteSafe: avoidColors.length ? !createsPaletteCollision(chosen.candidate) : null,
  };
}

/**
 * Repaint a failing component surface (and, when the plan requires it, the
 * component's text) inside the finding's sensed extent. Pixels are assigned
 * to the surface or text cluster only when they are decisively closer to
 * that sample than to every other cluster (the same conservative 0.8 gate as
 * the text-region fix), so the adjacent page ring and antialiased boundaries
 * are left untouched. Shifts are delta-preserving to keep gradients intact.
 */
export function applyComponentSurfaceContrastFix(data, width, height, finding, plan) {
  if (!Number.isInteger(width) || !Number.isInteger(height) || width <= 0 || height <= 0) {
    throw new Error('Image dimensions must be positive integers.');
  }
  if (!data || typeof data.length !== 'number' || data.length !== width * height * 4) {
    throw new Error('Image data length must equal width * height * 4.');
  }
  const box = finding?.box;
  const surface = finding?.surface?.rgb;
  const surrounding = finding?.surrounding?.rgb;
  if (
    !box || !Number.isFinite(box.x) || !Number.isFinite(box.y) ||
    !(box.width > 0) || !(box.height > 0) || !surface || !surrounding
  ) {
    throw new Error('A component finding with box, surface, and surrounding colors is required.');
  }
  assertRgbObject(surface, 'Finding surface color');
  assertRgbObject(surrounding, 'Finding surrounding color');
  if (!plan?.surface?.rgb) {
    throw new Error('A surface repair plan is required.');
  }
  assertRgbObject(plan.surface.rgb, 'Planned surface color');

  const reach = Math.max(0, Math.round(finding.boundaryDistance ?? 0));
  const x0 = Math.max(0, Math.floor(box.x - reach));
  const y0 = Math.max(0, Math.floor(box.y - reach));
  const x1 = Math.min(width, Math.ceil(box.x + box.width + reach));
  const y1 = Math.min(height, Math.ceil(box.y + box.height + reach));
  if (x1 <= x0 || y1 <= y0) {
    throw new Error('Component finding must overlap the image.');
  }

  const textSample = plan.originalText?.rgb || null;
  const textReplacement = plan.textAdjusted ? plan.text?.rgb || null : null;
  const surfaceDelta = {
    r: plan.surface.rgb.r - surface.r,
    g: plan.surface.rgb.g - surface.g,
    b: plan.surface.rgb.b - surface.b,
  };
  const textDelta = textSample && textReplacement
    ? {
        r: textReplacement.r - textSample.r,
        g: textReplacement.g - textSample.g,
        b: textReplacement.b - textSample.b,
      }
    : null;

  const distanceSquared = (r, g, b, target) =>
    (r - target.r) ** 2 + (g - target.g) ** 2 + (b - target.b) ** 2;
  let surfacePixels = 0;
  let textPixels = 0;
  for (let y = y0; y < y1; y += 1) {
    for (let x = x0; x < x1; x += 1) {
      const offset = (y * width + x) * 4;
      if (data[offset + 3] < 16) continue;
      const r = data[offset];
      const g = data[offset + 1];
      const b = data[offset + 2];
      const dSurface = distanceSquared(r, g, b, surface);
      const dSurround = distanceSquared(r, g, b, surrounding);
      const dText = textSample ? distanceSquared(r, g, b, textSample) : Number.POSITIVE_INFINITY;
      let delta = null;
      if (textDelta && dText <= dSurface * 0.8 && dText <= dSurround * 0.8) {
        delta = textDelta;
        textPixels += 1;
      } else if (dSurface <= dSurround * 0.8 && dSurface <= dText * 0.8) {
        delta = surfaceDelta;
        surfacePixels += 1;
      }
      if (!delta) continue;
      data[offset] = Math.max(0, Math.min(255, Math.round(r + delta.r)));
      data[offset + 1] = Math.max(0, Math.min(255, Math.round(g + delta.g)));
      data[offset + 2] = Math.max(0, Math.min(255, Math.round(b + delta.b)));
    }
  }

  return {
    changedPixels: surfacePixels + textPixels,
    surfacePixels,
    textPixels,
    windowPixels: (x1 - x0) * (y1 - y0),
    replacementSurface: plan.surface.hex || rgbToHex(plan.surface.rgb),
    replacementText: textReplacement ? plan.text.hex || rgbToHex(textReplacement) : null,
  };
}

function splitRegionLuminanceClusters(data, luma, width, x0, y0, x1, y1) {
  let minLuma = 255;
  let maxLuma = 0;
  for (let y = y0; y < y1; y += 1) {
    const rowBase = y * width;
    for (let x = x0; x < x1; x += 1) {
      const value = luma[rowBase + x];
      if (value < minLuma) minLuma = value;
      if (value > maxLuma) maxLuma = value;
    }
  }

  if (maxLuma - minLuma < 8) {
    return null;
  }

  let threshold = (minLuma + maxLuma) / 2;
  for (let iteration = 0; iteration < 4; iteration += 1) {
    let darkSum = 0;
    let darkCount = 0;
    let lightSum = 0;
    let lightCount = 0;
    for (let y = y0; y < y1; y += 1) {
      const rowBase = y * width;
      for (let x = x0; x < x1; x += 1) {
        const value = luma[rowBase + x];
        if (value < threshold) {
          darkSum += value;
          darkCount += 1;
        } else {
          lightSum += value;
          lightCount += 1;
        }
      }
    }
    if (darkCount === 0 || lightCount === 0) {
      return null;
    }
    const nextThreshold = (darkSum / darkCount + lightSum / lightCount) / 2;
    if (Math.abs(nextThreshold - threshold) < 0.5) {
      threshold = nextThreshold;
      break;
    }
    threshold = nextThreshold;
  }

  const dark = { r: 0, g: 0, b: 0, count: 0 };
  const light = { r: 0, g: 0, b: 0, count: 0 };
  for (let y = y0; y < y1; y += 1) {
    const rowBase = y * width;
    for (let x = x0; x < x1; x += 1) {
      const index = rowBase + x;
      const target = luma[index] < threshold ? dark : light;
      const offset = index * 4;
      target.r += data[offset];
      target.g += data[offset + 1];
      target.b += data[offset + 2];
      target.count += 1;
    }
  }

  const totalCount = dark.count + light.count;
  if (dark.count < totalCount * 0.01 || light.count < totalCount * 0.01) {
    return null;
  }

  const toRgb = (cluster) => ({
    r: Math.round(cluster.r / cluster.count),
    g: Math.round(cluster.g / cluster.count),
    b: Math.round(cluster.b / cluster.count),
  });
  const darkRgb = toRgb(dark);
  const lightRgb = toRgb(light);
  const [text, background] =
    dark.count <= light.count ? [darkRgb, lightRgb] : [lightRgb, darkRgb];
  return { text, background };
}

export const CSS_FIX_SHEET_DEFAULTS = Object.freeze({
  aaThreshold: 4.5,
  componentMinRatio: 3,
});

function normalizeSheetHex(value, label) {
  try {
    return rgbToHex(parseHexColor(typeof value === 'string' ? value : String(value ?? ''))).toUpperCase();
  } catch {
    throw new Error(`${label} must be a valid color.`);
  }
}

function requireSheetBox(box, label) {
  if (!box || typeof box !== 'object') {
    throw new Error(`${label} must include a bounding box.`);
  }
  const { x, y, width, height } = box;
  if (![x, y, width, height].every((n) => Number.isFinite(n)) || width <= 0 || height <= 0) {
    throw new Error(`${label} bounding box must have finite coordinates and positive dimensions.`);
  }
  return { x: Math.round(x), y: Math.round(y), width: Math.round(width), height: Math.round(height) };
}

function sheetRatio(value, label) {
  if (!Number.isFinite(value) || value < 1) {
    throw new Error(`${label} must be a finite contrast ratio of at least 1.`);
  }
  return value;
}

/**
 * Developer handoff: turn detected accessibility failures and their verified
 * replacement colors into one paste-ready CSS fix sheet. Text fixes carry the
 * measured on-page pair plus the suggested accessible pair (WCAG 1.4.3);
 * component fixes carry the failing surface, the adjacent page color, and the
 * repair plan produced by `planComponentSurfaceRepair()` (WCAG 1.4.11);
 * target fixes carry screenshot-localized dimensions and emit a source-selector
 * template for the layout change required by WCAG 2.5.8. The
 * sheet is deliberately honest: best-effort pairs that fall short of a target
 * say so with their real achieved ratio, unchanged labels are documented
 * instead of restyled, and a plan that could not be verified palette-safe is
 * flagged for manual review. Output is deterministic for identical input so
 * exports and tests can pin exact content.
 */
export function buildCssFixSheet(input = {}) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw new Error('CSS fix sheet input must be an object.');
  }
  const {
    sourceName = null,
    aaThreshold = CSS_FIX_SHEET_DEFAULTS.aaThreshold,
    componentMinRatio = CSS_FIX_SHEET_DEFAULTS.componentMinRatio,
    textFixes = [],
    componentFixes = [],
    targetFixes = [],
  } = input;
  requireFinitePositiveNumber(aaThreshold, 'AA threshold', 1.05);
  requireFinitePositiveNumber(componentMinRatio, 'Component minimum ratio', 1.05);
  if (!Array.isArray(textFixes) || !Array.isArray(componentFixes) || !Array.isArray(targetFixes)) {
    throw new Error('Text, component, and target fixes must be arrays.');
  }
  if (!textFixes.length && !componentFixes.length && !targetFixes.length) {
    throw new Error('At least one text, component, or target fix is required to build a CSS fix sheet.');
  }

  const ratioLabel = (value) => `${value.toFixed(2)}:1`;
  const nearLabel = (box) => `near (${box.x}, ${box.y}), ~${box.width}×${box.height}px`;

  const text = textFixes.map((fix, index) => {
    const label = `Text fix ${index + 1}`;
    if (!fix || typeof fix !== 'object') {
      throw new Error(`${label} must be an object.`);
    }
    const box = requireSheetBox(fix.region, label);
    return {
      box,
      measuredRatio: sheetRatio(fix.region?.ratio, `${label} measured ratio`),
      measuredText: normalizeSheetHex(fix.measured?.text, `${label} measured text color`),
      measuredBackground: normalizeSheetHex(fix.measured?.background, `${label} measured background color`),
      newText: normalizeSheetHex(fix.suggestion?.text, `${label} replacement text color`),
      newBackground: normalizeSheetHex(fix.suggestion?.background, `${label} replacement background color`),
      newRatio: sheetRatio(fix.suggestion?.ratio, `${label} replacement ratio`),
    };
  });

  const components = componentFixes.map((fix, index) => {
    const label = `Component fix ${index + 1}`;
    if (!fix || typeof fix !== 'object' || !fix.plan || typeof fix.plan !== 'object') {
      throw new Error(`${label} must include a repair plan.`);
    }
    const box = requireSheetBox(fix.box, label);
    return {
      box,
      beforeRatio: sheetRatio(fix.ratio, `${label} measured ratio`),
      beforeSurface: normalizeSheetHex(fix.surface, `${label} surface color`),
      surrounding: normalizeSheetHex(fix.surrounding, `${label} surrounding color`),
      newSurface: normalizeSheetHex(fix.plan.surface, `${label} replacement surface color`),
      newSurfaceRatio: sheetRatio(fix.plan.surfaceRatio, `${label} replacement surface ratio`),
      newText: fix.plan.textAdjusted && fix.plan.text ? normalizeSheetHex(fix.plan.text, `${label} replacement text color`) : null,
      textRatio: Number.isFinite(fix.plan.textRatio) ? fix.plan.textRatio : null,
      textApcaLc: Number.isFinite(fix.plan.textApcaLc) ? fix.plan.textApcaLc : null,
      paletteSafe: typeof fix.plan.paletteSafe === 'boolean' ? fix.plan.paletteSafe : null,
    };
  });
  const targets = targetFixes.map((fix, index) => {
    const label = `Target fix ${index + 1}`;
    if (!fix || typeof fix !== 'object') {
      throw new Error(`${label} must be an object.`);
    }
    const box = requireSheetBox(fix.box, label);
    const widthCss = Number(fix.widthCss);
    const heightCss = Number(fix.heightCss);
    const minTargetCss = Number(fix.minTargetCss ?? 24);
    if (!Number.isFinite(widthCss) || widthCss <= 0 || !Number.isFinite(heightCss) || heightCss <= 0) {
      throw new Error(`${label} CSS dimensions must be finite positive numbers.`);
    }
    requireFinitePositiveNumber(minTargetCss, `${label} minimum target size`);
    return { box, widthCss, heightCss, minTargetCss };
  });

  const lines = [];
  const counts = [];
  if (text.length) counts.push(`${text.length} text fix${text.length === 1 ? '' : 'es'} (WCAG 1.4.3 contrast minimum)`);
  if (components.length) {
    counts.push(`${components.length} component surface fix${components.length === 1 ? '' : 'es'} (WCAG 1.4.11 non-text contrast)`);
  }
  if (targets.length) counts.push(`${targets.length} tap-target fix${targets.length === 1 ? '' : 'es'} (WCAG 2.5.8 target size)`);
  lines.push('/* ClearSight CSS fix sheet — generated locally in the browser, no uploads.');
  if (sourceName) {
    lines.push(` * Source screenshot: ${String(sourceName)}`);
  }
  lines.push(` * ${counts.join(' · ')}`);
  lines.push(' * Replacement values come from the same verified plans behind ClearSight’s');
  lines.push(' * one-click pixel repairs; target rules are layout templates that require');
  lines.push(' * mapping the screenshot location to the real source selector. */');
  lines.push('');
  lines.push(':root {');
  text.forEach((fix, index) => {
    const id = index + 1;
    lines.push(`  --clearsight-text-${id}-color: ${fix.newText}; /* was ${fix.measuredText} */`);
    lines.push(`  --clearsight-text-${id}-surface: ${fix.newBackground}; /* was ${fix.measuredBackground} */`);
  });
  components.forEach((fix, index) => {
    const id = index + 1;
    lines.push(`  --clearsight-component-${id}-surface: ${fix.newSurface}; /* was ${fix.beforeSurface} */`);
    if (fix.newText) {
      lines.push(`  --clearsight-component-${id}-text: ${fix.newText}; /* label shifted to stay readable */`);
    }
  });
  lines.push('}');

  text.forEach((fix, index) => {
    const id = index + 1;
    const meetsTarget = fix.newRatio >= aaThreshold;
    lines.push('');
    lines.push(`/* Text fix ${id} · region ${nearLabel(fix.box)}`);
    lines.push(
      meetsTarget
        ? ` * measured ${ratioLabel(fix.measuredRatio)} → replacement ${ratioLabel(fix.newRatio)} (AA target ${aaThreshold}:1) */`
        : ` * measured ${ratioLabel(fix.measuredRatio)} → best effort ${ratioLabel(fix.newRatio)} — strongest reachable pair, still below the ${aaThreshold}:1 target */`,
    );
    lines.push(`.clearsight-text-fix-${id} {`);
    lines.push(`  color: var(--clearsight-text-${id}-color);`);
    lines.push(`  background-color: var(--clearsight-text-${id}-surface);`);
    lines.push('}');
  });

  components.forEach((fix, index) => {
    const id = index + 1;
    const meetsTarget = fix.newSurfaceRatio >= componentMinRatio;
    lines.push('');
    lines.push(`/* Component fix ${id} · surface ${nearLabel(fix.box)}`);
    lines.push(
      meetsTarget
        ? ` * surface vs page ${ratioLabel(fix.beforeRatio)} → ${ratioLabel(fix.newSurfaceRatio)} against ${fix.surrounding} (non-text minimum ${componentMinRatio}:1)`
        : ` * surface vs page ${ratioLabel(fix.beforeRatio)} → best effort ${ratioLabel(fix.newSurfaceRatio)} against ${fix.surrounding} — still below the ${componentMinRatio}:1 minimum`,
    );
    if (fix.newText && fix.textRatio !== null) {
      lines.push(
        ` * label recolored to hold ${ratioLabel(fix.textRatio)} on the new surface${fix.textApcaLc !== null ? ` (APCA Lc ${Math.round(fix.textApcaLc)})` : ''}`,
      );
    } else if (fix.textRatio !== null) {
      lines.push(
        ` * existing label already holds ${ratioLabel(fix.textRatio)} on the new surface${fix.textApcaLc !== null ? ` (APCA Lc ${Math.round(fix.textApcaLc)})` : ''} — no text change needed`,
      );
    }
    if (fix.paletteSafe === true) {
      lines.push(' * verified against the screenshot palette: no new color-blind collisions */');
    } else if (fix.paletteSafe === false) {
      lines.push(' * WARNING: could not verify palette safety under CVD — review against your brand colors */');
    } else {
      lines.push(' */');
    }
    lines.push(`.clearsight-component-fix-${id} {`);
    lines.push(`  background-color: var(--clearsight-component-${id}-surface);`);
    if (fix.newText) {
      lines.push(`  color: var(--clearsight-component-${id}-text);`);
    }
    lines.push('}');
  });
  targets.forEach((fix, index) => {
    const id = index + 1;
    lines.push('');
    lines.push(`/* Tap-target fix ${id} · control ${nearLabel(fix.box)}`);
    lines.push(` * measured ${fix.widthCss.toFixed(1)}×${fix.heightCss.toFixed(1)} CSS px; needs ${fix.minTargetCss}×${fix.minTargetCss} CSS px (WCAG 2.5.8)`);
    lines.push(' * Replace this placeholder class with the control’s real selector.');
    lines.push(' * If visual size must stay unchanged, apply these dimensions to a positioned');
    lines.push(' * ::before hit-area pseudo-element; alternatively add enough spacing for the exception. */');
    lines.push(`.clearsight-target-fix-${id} {`);
    lines.push(`  min-inline-size: ${fix.minTargetCss}px;`);
    lines.push(`  min-block-size: ${fix.minTargetCss}px;`);
    lines.push('  padding: max(4px, 0.25em);');
    lines.push('}');
  });

  return {
    css: `${lines.join('\n')}\n`,
    fixCount: text.length + components.length + targets.length,
    textFixCount: text.length,
    componentFixCount: components.length,
    targetFixCount: targets.length,
  };
}

export const XRAY_SAMPLE_DEFAULTS = Object.freeze({
  radius: 24,
  flatRange: 10,
});

/**
 * Contrast X-ray probe: estimate the foreground/background pair inside a small
 * window around one point and score it under all three contrast lenses at once
 * (WCAG 2 ratio, 7-mode CVD projection, APCA Lc). Same 2-means luminance split
 * the automatic text scan uses, scoped small enough to run at pointer speed.
 * Windows without enough luminance spread report `flat: true` with the mean
 * color instead of inventing a contrast pair.
 */
export function sampleRegionContrast(data, width, height, centerX, centerY, options = {}) {
  if (!Number.isInteger(width) || !Number.isInteger(height) || width <= 0 || height <= 0) {
    throw new Error('Image dimensions must be positive integers.');
  }
  if (!data || typeof data.length !== 'number' || data.length !== width * height * 4) {
    throw new Error('Image data length must equal width * height * 4.');
  }
  if (!Number.isFinite(centerX) || !Number.isFinite(centerY)) {
    throw new Error('Sample center must use finite coordinates.');
  }

  const {
    radius = XRAY_SAMPLE_DEFAULTS.radius,
    flatRange = XRAY_SAMPLE_DEFAULTS.flatRange,
    aaThreshold = 4.5,
    aaaThreshold = 7,
    largeTextThreshold = 3,
  } = options;
  requireFinitePositiveNumber(radius, 'Sample radius', 2);
  requireFinitePositiveNumber(flatRange, 'Flat luminance range', 1);
  requireFinitePositiveNumber(aaThreshold, 'AA threshold', 0.1);
  requireFinitePositiveNumber(aaaThreshold, 'AAA threshold', 0.1);
  requireFinitePositiveNumber(largeTextThreshold, 'Large-text threshold', 0.1);

  const cx = Math.min(width - 1, Math.max(0, Math.round(centerX)));
  const cy = Math.min(height - 1, Math.max(0, Math.round(centerY)));
  const span = Math.max(2, Math.round(radius));
  const x0 = Math.max(0, cx - span);
  const y0 = Math.max(0, cy - span);
  const x1 = Math.min(width, cx + span + 1);
  const y1 = Math.min(height, cy + span + 1);
  const windowRect = { x: x0, y: y0, width: x1 - x0, height: y1 - y0 };

  const pixelCount = windowRect.width * windowRect.height;
  const luma = new Float32Array(pixelCount);
  let minLuma = 255;
  let maxLuma = 0;
  let rSum = 0;
  let gSum = 0;
  let bSum = 0;
  let cursor = 0;
  for (let y = y0; y < y1; y += 1) {
    const rowBase = y * width;
    for (let x = x0; x < x1; x += 1) {
      const offset = (rowBase + x) * 4;
      const r = data[offset];
      const g = data[offset + 1];
      const b = data[offset + 2];
      const value = 0.2126 * r + 0.7152 * g + 0.0722 * b;
      luma[cursor] = value;
      cursor += 1;
      if (value < minLuma) minLuma = value;
      if (value > maxLuma) maxLuma = value;
      rSum += r;
      gSum += g;
      bSum += b;
    }
  }

  const meanRgb = {
    r: Math.round(rSum / pixelCount),
    g: Math.round(gSum / pixelCount),
    b: Math.round(bSum / pixelCount),
  };

  const flatResult = () => ({
    flat: true,
    color: { hex: rgbToHex(meanRgb), rgb: meanRgb },
    window: windowRect,
  });

  if (maxLuma - minLuma < flatRange) {
    return flatResult();
  }

  let threshold = (minLuma + maxLuma) / 2;
  for (let iteration = 0; iteration < 4; iteration += 1) {
    let darkSum = 0;
    let darkCount = 0;
    let lightSum = 0;
    let lightCount = 0;
    for (let index = 0; index < pixelCount; index += 1) {
      const value = luma[index];
      if (value < threshold) {
        darkSum += value;
        darkCount += 1;
      } else {
        lightSum += value;
        lightCount += 1;
      }
    }
    if (darkCount === 0 || lightCount === 0) {
      return flatResult();
    }
    const nextThreshold = (darkSum / darkCount + lightSum / lightCount) / 2;
    if (Math.abs(nextThreshold - threshold) < 0.5) {
      threshold = nextThreshold;
      break;
    }
    threshold = nextThreshold;
  }

  const dark = { r: 0, g: 0, b: 0, count: 0 };
  const light = { r: 0, g: 0, b: 0, count: 0 };
  cursor = 0;
  for (let y = y0; y < y1; y += 1) {
    const rowBase = y * width;
    for (let x = x0; x < x1; x += 1) {
      const offset = (rowBase + x) * 4;
      const target = luma[cursor] < threshold ? dark : light;
      cursor += 1;
      target.r += data[offset];
      target.g += data[offset + 1];
      target.b += data[offset + 2];
      target.count += 1;
    }
  }
  if (dark.count === 0 || light.count === 0) {
    return flatResult();
  }

  const toRgb = (cluster) => ({
    r: Math.round(cluster.r / cluster.count),
    g: Math.round(cluster.g / cluster.count),
    b: Math.round(cluster.b / cluster.count),
  });
  const darkRgb = toRgb(dark);
  const lightRgb = toRgb(light);
  const [textRgb, backgroundRgb] =
    dark.count <= light.count ? [darkRgb, lightRgb] : [lightRgb, darkRgb];

  const ratio = contrastRatio(textRgb, backgroundRgb);
  let level = 'fail';
  if (ratio >= aaaThreshold) {
    level = 'aaa';
  } else if (ratio >= aaThreshold) {
    level = 'aa';
  } else if (ratio >= largeTextThreshold) {
    level = 'aa-large';
  }

  const cvd = projectContrastAcrossCvdModes(textRgb, backgroundRgb, { aaThreshold });
  const apcaComparison = compareWcagVsApca(textRgb, backgroundRgb, { aaThreshold });

  return {
    flat: false,
    window: windowRect,
    text: { hex: rgbToHex(textRgb), rgb: textRgb },
    background: { hex: rgbToHex(backgroundRgb), rgb: backgroundRgb },
    ratio,
    level,
    passesAA: ratio >= aaThreshold,
    passesAAA: ratio >= aaaThreshold,
    cvd: {
      worstRatio: cvd.worst.ratio,
      worstMode: cvd.worst.id,
      worstLabel: cvd.worst.label,
      failingModes: [...cvd.failingModes],
      hiddenFailure: cvd.hiddenFailure,
    },
    apca: {
      lc: apcaComparison.apca.lc,
      absLc: apcaComparison.apca.absLc,
      rating: apcaComparison.apca.rating,
      passesFluentText: apcaComparison.apca.passesFluentText,
      falsePass: apcaComparison.falsePass,
    },
  };
}

/**
 * CIE Lab conversion (sRGB, D65 white) and ΔE76 distance. ΔE76 ~2.3 is a
 * just-noticeable difference; pairs under ~12 read as "the same color" at a
 * glance, while UI palettes typically separate meaningful colors by 25+.
 */
function rgbToLab({ r, g, b }) {
  const linearize = (channel) => {
    const c = channel / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };

  const R = linearize(r);
  const G = linearize(g);
  const B = linearize(b);
  const x = (0.4124564 * R + 0.3575761 * G + 0.1804375 * B) / 0.95047;
  const y = 0.2126729 * R + 0.7151522 * G + 0.072175 * B;
  const z = (0.0193339 * R + 0.119192 * G + 0.9503041 * B) / 1.08883;
  const f = (t) => (t > 216 / 24389 ? Math.cbrt(t) : ((24389 / 27) * t + 16) / 116);
  const fx = f(x);
  const fy = f(y);
  const fz = f(z);
  return { L: 116 * fy - 16, a: 500 * (fx - fy), b: 200 * (fy - fz) };
}

export function labDeltaE(colorA, colorB) {
  assertRgbObject(colorA, 'First color');
  assertRgbObject(colorB, 'Second color');
  const labA = rgbToLab(colorA);
  const labB = rgbToLab(colorB);
  return Math.hypot(labA.L - labB.L, labA.a - labB.a, labA.b - labB.b);
}

/**
 * WCAG SC 1.4.1 "Use of Color": meaning must not be carried by color alone.
 * Every contrast lens in ClearSight measures text against its background —
 * none of them catch the canonical color-blindness failure where two colors
 * that ENCODE DIFFERENT MEANINGS (status dots, chart lines, buttons) are
 * clearly distinct for typical vision yet collapse into near-identical
 * shades under a color-vision deficiency. This projects every dominant-color
 * pair through the same full-severity matrices the simulator renders with
 * and flags pairs whose Lab ΔE falls from "clearly different" to
 * "indistinguishable at a glance" in any mode.
 */
export function findCvdColorCollisions(colors, options = {}) {
  if (!Array.isArray(colors)) {
    throw new Error('Palette colors must be an array.');
  }

  const { distinctThreshold = 25, collisionThreshold = 12, modes = CVD_MODES } = options;
  requireFinitePositiveNumber(distinctThreshold, 'Distinct threshold', 0.1);
  requireFinitePositiveNumber(collisionThreshold, 'Collision threshold', 0.1);
  if (collisionThreshold > distinctThreshold) {
    throw new Error('Collision threshold must not exceed the distinct threshold.');
  }
  if (!Array.isArray(modes)) {
    throw new Error('CVD collision modes must be an array.');
  }

  const matrixModes = modes.filter(
    (mode) => mode && mode.kind === 'matrix' && mode.id !== 'normal' && Array.isArray(mode.matrix),
  );
  if (!matrixModes.length) {
    throw new Error('CVD collision scan requires at least one matrix-based vision mode.');
  }

  const parsed = colors.map((color) => {
    const hexValue = typeof color === 'string' ? color : color?.hex;
    const rgb = parseHexColor(hexValue);
    return { hex: rgb.hex.toUpperCase(), rgb };
  });

  const pairs = [];
  let candidatePairs = 0;
  for (let i = 0; i < parsed.length; i += 1) {
    for (let j = i + 1; j < parsed.length; j += 1) {
      const first = parsed[i];
      const second = parsed[j];
      const baseDeltaE = labDeltaE(first.rgb, second.rgb);
      if (baseDeltaE < distinctThreshold) {
        continue;
      }

      candidatePairs += 1;
      const collidingModes = [];
      for (const mode of matrixModes) {
        const projectedA = applyMatrixToColor(first.rgb, mode.matrix);
        const projectedB = applyMatrixToColor(second.rgb, mode.matrix);
        const deltaE = labDeltaE(projectedA, projectedB);
        if (deltaE >= collisionThreshold) {
          continue;
        }

        collidingModes.push({
          id: mode.id,
          label: mode.label,
          deltaE,
          retentionPercent: (deltaE / baseDeltaE) * 100,
          projectedA: { hex: rgbToHex(projectedA).toUpperCase(), rgb: projectedA },
          projectedB: { hex: rgbToHex(projectedB).toUpperCase(), rgb: projectedB },
        });
      }

      if (!collidingModes.length) {
        continue;
      }

      collidingModes.sort((a, b) => a.deltaE - b.deltaE);
      pairs.push({
        colorA: first.hex,
        colorB: second.hex,
        baseDeltaE,
        worst: collidingModes[0],
        collidingModes,
      });
    }
  }

  pairs.sort((a, b) => a.worst.deltaE - b.worst.deltaE);

  return {
    pairs,
    summary: {
      colorsEvaluated: parsed.length,
      candidatePairs,
      collisions: pairs.length,
      evaluatedModes: matrixModes.length,
      worstPair: pairs[0] || null,
    },
  };
}

export const CLEARSIGHT_SCORE_GRADES = [
  { min: 90, grade: 'A', label: 'Excellent' },
  { min: 80, grade: 'B', label: 'Strong' },
  { min: 70, grade: 'C', label: 'Needs attention' },
  { min: 60, grade: 'D', label: 'At risk' },
  { min: 0, grade: 'F', label: 'Critical' },
];

/**
 * ClearSight Score: one deterministic 0–100 accessibility score that
 * condenses six independent analysis axes — WCAG 2 text contrast,
 * hidden color-vision contrast failures, APCA perceptual false passes, and
 * WCAG 1.4.1 color-only collisions plus WCAG 1.4.11 component-surface
 * contrast and WCAG 2.5.8 tap-target sizing — into a single graded verdict.
 *
 * The text axis blends the mean region score with the worst region score
 * 50/50 so one hard failure cannot be averaged away, and failing regions are
 * capped at 60 points so a genuine AA failure always costs meaningfully more
 * than a marginal pass. Axes without data are excluded and the remaining
 * weights renormalized, so partial audits still score honestly instead of
 * being padded with unearned points.
 */
export function computeAccessibilityScore(input = {}) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw new Error('Score input must be an object.');
  }

  const {
    textRegions = null,
    cvdHiddenFailures = 0,
    apcaFalsePasses = 0,
    paletteSummary = null,
    componentSummary = null,
    targetSizeSummary = null,
    aaThreshold = 4.5,
  } = input;

  requireFinitePositiveNumber(aaThreshold, 'AA threshold', 1.05);

  if (textRegions !== null && !Array.isArray(textRegions)) {
    throw new Error('Text regions must be an array or null.');
  }

  const regions = Array.isArray(textRegions) ? textRegions : [];
  regions.forEach((region, index) => {
    if (!region || !Number.isFinite(region.ratio) || region.ratio < 1) {
      throw new Error(`Text region ${index + 1} must include a finite contrast ratio of at least 1.`);
    }
  });

  const requireRegionCount = (value, label) => {
    if (!Number.isInteger(value) || value < 0) {
      throw new Error(`${label} must be a non-negative integer.`);
    }
    if (value > regions.length) {
      throw new Error(`${label} cannot exceed the number of scanned regions.`);
    }
    return value;
  };
  const hiddenCount = requireRegionCount(cvdHiddenFailures, 'Hidden CVD failure count');
  const falsePassCount = requireRegionCount(apcaFalsePasses, 'APCA false-pass count');

  if (paletteSummary !== null) {
    if (typeof paletteSummary !== 'object' || Array.isArray(paletteSummary)) {
      throw new Error('Palette summary must be an object or null.');
    }
    if (!Number.isInteger(paletteSummary.candidatePairs) || paletteSummary.candidatePairs < 0) {
      throw new Error('Candidate pair count must be a non-negative integer.');
    }
    if (
      !Number.isInteger(paletteSummary.collisions) ||
      paletteSummary.collisions < 0 ||
      paletteSummary.collisions > paletteSummary.candidatePairs
    ) {
      throw new Error('Collision count must be between 0 and the candidate pair count.');
    }
  }

  if (componentSummary !== null) {
    if (typeof componentSummary !== 'object' || Array.isArray(componentSummary)) {
      throw new Error('Component summary must be an object or null.');
    }
    if (!Number.isInteger(componentSummary.evaluated) || componentSummary.evaluated < 0) {
      throw new Error('Evaluated component count must be a non-negative integer.');
    }
    if (
      !Number.isInteger(componentSummary.failing) ||
      componentSummary.failing < 0 ||
      componentSummary.failing > componentSummary.evaluated
    ) {
      throw new Error('Failing component count must be between 0 and the evaluated component count.');
    }
  }

  if (targetSizeSummary !== null) {
    if (typeof targetSizeSummary !== 'object' || Array.isArray(targetSizeSummary)) {
      throw new Error('Target-size summary must be an object or null.');
    }
    if (!Number.isInteger(targetSizeSummary.targets) || targetSizeSummary.targets < 0) {
      throw new Error('Measured target count must be a non-negative integer.');
    }
    if (
      !Number.isInteger(targetSizeSummary.undersized) ||
      targetSizeSummary.undersized < 0 ||
      targetSizeSummary.undersized > targetSizeSummary.targets
    ) {
      throw new Error('Undersized target count must be between 0 and the measured target count.');
    }
  }

  let textScore = null;
  let textDetail = 'No text-like regions scanned';
  if (regions.length) {
    const regionScores = regions.map((region) =>
      region.ratio >= aaThreshold ? 100 : Math.max(0, (60 * (region.ratio - 1)) / (aaThreshold - 1)),
    );
    const mean = regionScores.reduce((sum, value) => sum + value, 0) / regionScores.length;
    const worst = Math.min(...regionScores);
    textScore = 0.5 * mean + 0.5 * worst;
    const belowAA = regions.filter((region) => region.ratio < aaThreshold).length;
    textDetail = belowAA
      ? `${belowAA} of ${regions.length} scanned regions below AA`
      : `All ${regions.length} scanned regions hold AA`;
  }

  let cvdScore = null;
  let cvdDetail = 'No text-like regions scanned';
  let apcaScore = null;
  let apcaDetail = 'No text-like regions scanned';
  if (regions.length) {
    cvdScore = 100 * (1 - hiddenCount / regions.length);
    cvdDetail = hiddenCount
      ? `${hiddenCount} of ${regions.length} regions hide a CVD contrast failure`
      : 'No hidden color-vision contrast failures';
    apcaScore = 100 * (1 - falsePassCount / regions.length);
    apcaDetail = falsePassCount
      ? `${falsePassCount} of ${regions.length} regions are APCA perceptual false passes`
      : 'No APCA perceptual false passes';
  }

  let paletteScore = null;
  let paletteDetail = 'No clearly-distinct dominant pairs scanned';
  if (paletteSummary && paletteSummary.candidatePairs > 0) {
    paletteScore = 100 * (1 - paletteSummary.collisions / paletteSummary.candidatePairs);
    paletteDetail = paletteSummary.collisions
      ? `${paletteSummary.collisions} of ${paletteSummary.candidatePairs} distinct pairs collapse under CVD`
      : `All ${paletteSummary.candidatePairs} distinct pairs stay distinguishable under CVD`;
  }

  let componentScore = null;
  let componentDetail = 'No distinct component surfaces resolved';
  if (componentSummary && componentSummary.evaluated > 0) {
    componentScore = 100 * (1 - componentSummary.failing / componentSummary.evaluated);
    componentDetail = componentSummary.failing
      ? `${componentSummary.failing} of ${componentSummary.evaluated} component surfaces fail 3:1`
      : `All ${componentSummary.evaluated} component surfaces hold 3:1`;
  }

  let targetSizeScore = null;
  let targetSizeDetail = 'No measurable tap targets resolved';
  if (targetSizeSummary && targetSizeSummary.targets > 0) {
    targetSizeScore = 100 * (1 - targetSizeSummary.undersized / targetSizeSummary.targets);
    targetSizeDetail = targetSizeSummary.undersized
      ? `${targetSizeSummary.undersized} of ${targetSizeSummary.targets} targets fail 24×24 CSS px or spacing`
      : `All ${targetSizeSummary.targets} targets meet 24×24 CSS px or spacing`;
  }

  const axes = [
    { id: 'textContrast', label: 'Text contrast (WCAG 2)', weight: 40, score: textScore, detail: textDetail },
    { id: 'cvdSafety', label: 'Color-vision safety', weight: 25, score: cvdScore, detail: cvdDetail },
    { id: 'perceptualContrast', label: 'Perceptual contrast (APCA)', weight: 15, score: apcaScore, detail: apcaDetail },
    { id: 'colorIndependence', label: 'Color independence (WCAG 1.4.1)', weight: 20, score: paletteScore, detail: paletteDetail },
    { id: 'componentContrast', label: 'Component contrast (WCAG 1.4.11)', weight: 15, score: componentScore, detail: componentDetail },
    { id: 'targetSize', label: 'Tap target size (WCAG 2.5.8)', weight: 15, score: targetSizeScore, detail: targetSizeDetail },
  ];

  const scoredAxes = axes.filter((axis) => axis.score !== null);
  const roundedAxes = axes.map((axis) => ({
    ...axis,
    score: axis.score === null ? null : Number(axis.score.toFixed(1)),
  }));

  if (!scoredAxes.length) {
    return { score: null, grade: null, verdictLabel: 'Insufficient data', axes: roundedAxes, scoredAxes: 0 };
  }

  const totalWeight = scoredAxes.reduce((sum, axis) => sum + axis.weight, 0);
  const composite = scoredAxes.reduce((sum, axis) => sum + axis.weight * axis.score, 0) / totalWeight;
  const score = Math.round(Math.max(0, Math.min(100, composite)));
  const gradeEntry = CLEARSIGHT_SCORE_GRADES.find((entry) => score >= entry.min);

  return {
    score,
    grade: gradeEntry.grade,
    verdictLabel: gradeEntry.label,
    axes: roundedAxes,
    scoredAxes: scoredAxes.length,
  };
}

/**
 * Headless full-image accessibility audit: runs the complete six-axis
 * ClearSight analysis (text-region contrast, per-region CVD projection and
 * APCA comparison, dominant-palette CVD collision scan, and the composite
 * ClearSight Score) against raw RGBA pixels with no DOM involvement, so whole
 * batches of screenshots can be scored in one pass — in the browser or in
 * Node tests.
 */
export function auditImageAccessibility(data, width, height, options = {}) {
  if (!options || typeof options !== 'object' || Array.isArray(options)) {
    throw new Error('Audit options must be an object.');
  }

  const { maxColors = 6, textScanOptions = {}, targetSizeOptions = {} } = options;
  const textScan = detectTextLikeRegions(data, width, height, textScanOptions);
  textScan.regions.forEach((region) => {
    try {
      const projection = projectContrastAcrossCvdModes(region.text.rgb, region.background.rgb);
      region.cvd = {
        worstRatio: projection.worst.ratio,
        worstMode: projection.worst.label,
        hiddenFailure: projection.hiddenFailure,
      };
    } catch {
      region.cvd = null;
    }
    try {
      const comparison = compareWcagVsApca(region.text.rgb, region.background.rgb);
      region.apca = {
        lc: comparison.apca.lc,
        absLc: comparison.apca.absLc,
        rating: comparison.apca.rating,
        falsePass: comparison.falsePass,
      };
    } catch {
      region.apca = null;
    }
  });
  textScan.summary.cvdHiddenFailures = textScan.regions.filter((region) => region.cvd?.hiddenFailure).length;
  textScan.summary.apcaFalsePasses = textScan.regions.filter((region) => region.apca?.falsePass).length;

  let paletteColors = [];
  let paletteCollisions = null;
  try {
    const sampleStride = Math.max(1, Math.round((width * height) / 150000));
    paletteColors = extractDominantColors(data, width, height, { maxColors, sampleStride });
    paletteCollisions = findCvdColorCollisions(paletteColors);
  } catch {
    paletteColors = [];
    paletteCollisions = null;
  }

  let componentContrast = null;
  try {
    componentContrast = scanComponentSurfaceContrast(data, width, height, textScan.regions);
  } catch {
    componentContrast = null;
  }

  let targetSizes = null;
  try {
    targetSizes = scanTargetSizes(
      data,
      width,
      height,
      textScan.regions,
      componentContrast?.components || [],
      targetSizeOptions,
    );
  } catch {
    targetSizes = null;
  }

  const score = computeAccessibilityScore({
    textRegions: textScan.regions.length
      ? textScan.regions.map((region) => ({ ratio: region.ratio }))
      : null,
    cvdHiddenFailures: textScan.summary.cvdHiddenFailures,
    apcaFalsePasses: textScan.summary.apcaFalsePasses,
    paletteSummary: paletteCollisions
      ? {
          candidatePairs: paletteCollisions.summary.candidatePairs,
          collisions: paletteCollisions.summary.collisions,
        }
      : null,
    componentSummary: componentContrast
      ? {
          evaluated: componentContrast.summary.evaluated,
          failing: componentContrast.summary.failing,
        }
      : null,
    targetSizeSummary: targetSizes
      ? {
          targets: targetSizes.summary.targets,
          undersized: targetSizes.summary.undersized,
        }
      : null,
  });

  return {
    width,
    height,
    textScan,
    palette: { colors: paletteColors, collisions: paletteCollisions },
    componentContrast,
    targetSizes,
    score,
  };
}

function escapeBatchCsvValue(value) {
  const text = String(value ?? '');
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

/**
 * Serialize ranked batch-audit entries ({ name, audit }) into a
 * spreadsheet-ready CSV. Rows are emitted in the order given (callers rank
 * worst-first); screens whose audit produced no score report empty
 * score/grade cells rather than a padded number.
 */
export function buildBatchAuditCsv(entries) {
  if (!Array.isArray(entries)) {
    throw new Error('Batch audit entries must be an array.');
  }

  const header = [
    'rank',
    'screen',
    'width',
    'height',
    'clearsight_score',
    'clearsight_grade',
    'text_regions',
    'below_aa',
    'worst_ratio',
    'cvd_hidden_failures',
    'apca_false_passes',
    'palette_pairs',
    'palette_collisions',
    'component_surfaces',
    'component_failures',
    'tap_targets',
    'undersized_targets',
  ].join(',');

  const rows = entries.map((entry, index) => {
    if (!entry || typeof entry !== 'object' || !entry.audit || typeof entry.audit !== 'object') {
      throw new Error(`Batch entry ${index + 1} must include an audit result.`);
    }
    const { audit } = entry;
    const summary = audit.textScan?.summary || {};
    const worst = audit.textScan?.regions?.[0];
    const collisionSummary = audit.palette?.collisions?.summary || null;
    const componentSummary = audit.componentContrast?.summary || null;
    const targetSizeSummary = audit.targetSizes?.summary || null;
    return [
      index + 1,
      escapeBatchCsvValue(entry.name || `screen-${index + 1}`),
      audit.width ?? '',
      audit.height ?? '',
      Number.isFinite(audit.score?.score) ? audit.score.score : '',
      audit.score?.grade || '',
      summary.total ?? 0,
      summary.belowAA ?? 0,
      worst ? worst.ratio.toFixed(2) : '',
      summary.cvdHiddenFailures ?? 0,
      summary.apcaFalsePasses ?? 0,
      collisionSummary ? collisionSummary.candidatePairs : 0,
      collisionSummary ? collisionSummary.collisions : 0,
      componentSummary ? componentSummary.evaluated : 0,
      componentSummary ? componentSummary.failing : 0,
      targetSizeSummary ? targetSizeSummary.targets : 0,
      targetSizeSummary ? targetSizeSummary.undersized : 0,
    ].join(',');
  });

  return [header, ...rows].join('\n');
}

/**
 * Condense a set of screen audits into a release-level accessibility verdict.
 * The portfolio score is deliberately the mean score with a weakest-screen
 * penalty: broad quality cannot completely hide one badly inaccessible route.
 */
export function summarizeBatchAudit(entries) {
  if (!Array.isArray(entries)) {
    throw new Error('Batch audit entries must be an array.');
  }

  const scored = entries.filter((entry) => Number.isFinite(entry?.audit?.score?.score));
  if (!scored.length) {
    return {
      screenCount: entries.length,
      scoredCount: 0,
      portfolioScore: null,
      averageScore: null,
      lowestScore: null,
      lowestScreen: null,
      gradeCounts: {},
      totals: { belowAA: 0, cvdHiddenFailures: 0, apcaFalsePasses: 0, collisions: 0, componentFailures: 0, undersizedTargets: 0 },
      weakestAxis: null,
      releaseGate: { status: 'insufficient', label: 'Insufficient audit data' },
    };
  }

  const scores = scored.map((entry) => entry.audit.score.score);
  const averageScore = Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length);
  const lowestScore = Math.min(...scores);
  const lowestEntry = scored.find((entry) => entry.audit.score.score === lowestScore);
  const portfolioScore = Math.round(averageScore * 0.75 + lowestScore * 0.25);
  const gradeCounts = {};
  const totals = { belowAA: 0, cvdHiddenFailures: 0, apcaFalsePasses: 0, collisions: 0, componentFailures: 0, undersizedTargets: 0 };
  const axisBuckets = new Map();

  scored.forEach((entry) => {
    const grade = entry.audit.score.grade || '—';
    gradeCounts[grade] = (gradeCounts[grade] || 0) + 1;
    const textSummary = entry.audit.textScan?.summary || {};
    totals.belowAA += textSummary.belowAA || 0;
    totals.cvdHiddenFailures += textSummary.cvdHiddenFailures || 0;
    totals.apcaFalsePasses += textSummary.apcaFalsePasses || 0;
    totals.collisions += entry.audit.palette?.collisions?.summary?.collisions || 0;
    totals.componentFailures += entry.audit.componentContrast?.summary?.failing || 0;
    totals.undersizedTargets += entry.audit.targetSizes?.summary?.undersized || 0;
    (entry.audit.score.axes || []).forEach((axis) => {
      if (!Number.isFinite(axis.score)) return;
      const bucket = axisBuckets.get(axis.id) || { id: axis.id, label: axis.label, total: 0, count: 0 };
      bucket.total += axis.score;
      bucket.count += 1;
      axisBuckets.set(axis.id, bucket);
    });
  });

  const weakestAxis = [...axisBuckets.values()]
    .map((axis) => ({ id: axis.id, label: axis.label, score: Math.round(axis.total / axis.count) }))
    .sort((a, b) => a.score - b.score)[0] || null;
  const criticalFindings =
    totals.belowAA + totals.cvdHiddenFailures + totals.apcaFalsePasses + totals.collisions + totals.componentFailures + totals.undersizedTargets;
  let releaseGate;
  if (lowestScore < 60 || totals.belowAA > 0 || totals.componentFailures > 0 || totals.undersizedTargets > 0) {
    releaseGate = { status: 'blocked', label: 'Release blocked · critical accessibility debt' };
  } else if (portfolioScore < 80 || criticalFindings > 0) {
    releaseGate = { status: 'review', label: 'Needs review · accessibility risks remain' };
  } else {
    releaseGate = { status: 'ready', label: 'Release ready · no critical risks detected' };
  }

  return {
    screenCount: entries.length,
    scoredCount: scored.length,
    portfolioScore,
    averageScore,
    lowestScore,
    lowestScreen: lowestEntry?.name || null,
    gradeCounts,
    totals,
    weakestAxis,
    releaseGate,
  };
}

/**
 * Compare browser batch results with a JSON report emitted by ClearSight CI.
 * Matching is deliberately filename-based so Playwright/Cypress routes retain
 * a stable identity across runs without uploading screenshots.
 */
export function compareBatchAuditToBaseline(entries, baselineReport, maxScoreDrop = 0) {
  if (!Array.isArray(entries)) {
    throw new Error('Batch audit entries must be an array.');
  }
  if (!baselineReport || !Array.isArray(baselineReport.screens)) {
    throw new Error('Baseline must be a ClearSight audit JSON report with a screens array.');
  }
  if (!Number.isFinite(maxScoreDrop) || maxScoreDrop < 0) {
    throw new Error('Maximum score drop must be a non-negative number.');
  }

  const baselineByName = new Map(
    baselineReport.screens
      .filter((screen) => screen && typeof screen.name === 'string')
      .map((screen) => [screen.name, screen]),
  );
  const comparisons = entries.map((entry) => {
    const name = entry?.name || '';
    const baseline = baselineByName.get(name);
    const currentScore = entry?.audit?.score?.score;
    const baselineScore = baseline?.score?.score;
    if (!baseline) {
      return { name, status: 'new', baselineScore: null, currentScore: Number.isFinite(currentScore) ? currentScore : null, delta: null };
    }
    if (!Number.isFinite(baselineScore)) {
      return { name, status: 'baseline-unscored', baselineScore: null, currentScore: Number.isFinite(currentScore) ? currentScore : null, delta: null };
    }
    if (!Number.isFinite(currentScore)) {
      return { name, status: 'regressed', baselineScore, currentScore: null, delta: null };
    }
    const delta = currentScore - baselineScore;
    return {
      name,
      status: delta < -maxScoreDrop ? 'regressed' : delta > 0 ? 'improved' : delta < 0 ? 'within-tolerance' : 'unchanged',
      baselineScore,
      currentScore,
      delta,
    };
  });
  const counts = comparisons.reduce((result, comparison) => {
    result[comparison.status] = (result[comparison.status] || 0) + 1;
    return result;
  }, {});
  const failures = comparisons.filter((comparison) => comparison.status === 'regressed');
  return {
    pass: failures.length === 0,
    maxScoreDrop,
    matched: comparisons.filter((comparison) => comparison.baselineScore !== null).length,
    counts,
    failures,
    comparisons,
  };
}

export const FLASH_RISK_LABELS = {
  high: 'High risk — exceeds the WCAG 2.3.1 flash threshold',
  caution: 'Caution — flashing at or near the three-per-second limit',
  low: 'Low risk — within the three-flashes-per-second threshold',
};

export function analyzeFlashRisk(frames, options = {}) {
  const {
    gridSize = 8,
    luminanceDelta = 0.1,
    darkerLuminanceMax = 0.8,
    areaThresholdPercent = 25,
    flashLimitPerSecond = 3,
    defaultFrameDurationMs = 100,
    saturatedRedRatio = 0.8,
    redChromaticityDelta = 0.2,
  } = options;

  if (!Array.isArray(frames) || frames.length < 2) {
    throw new Error('Flash analysis requires an array of at least two frames.');
  }
  if (!Number.isInteger(gridSize) || gridSize < 1 || gridSize > 64) {
    throw new Error('Flash analysis gridSize must be an integer between 1 and 64.');
  }

  const { width, height } = frames[0];
  if (!Number.isInteger(width) || !Number.isInteger(height) || width < 1 || height < 1) {
    throw new Error('Flash analysis frames need positive integer dimensions.');
  }

  const columns = Math.min(gridSize, width);
  const rows = Math.min(gridSize, height);
  const blockCount = columns * rows;
  const frameStartTimes = [];
  const blockLuminanceByFrame = [];
  const blockRedRatioByFrame = [];
  const blockChromaticityByFrame = [];
  const luminanceTimeline = [];
  let clock = 0;

  frames.forEach((frame, frameIndex) => {
    if (!frame || frame.width !== width || frame.height !== height) {
      throw new Error(`Flash analysis frame ${frameIndex} does not match the first frame's dimensions.`);
    }
    const data = frame.data;
    if (!data || data.length !== width * height * 4) {
      throw new Error(`Flash analysis frame ${frameIndex} has an invalid RGBA buffer.`);
    }
    const durationMs = Number.isFinite(frame.durationMs) && frame.durationMs > 0
      ? frame.durationMs
      : defaultFrameDurationMs;

    frameStartTimes.push(clock);
    clock += durationMs;

    const sums = new Float64Array(blockCount);
    const redSums = new Float64Array(blockCount);
    const greenSums = new Float64Array(blockCount);
    const blueSums = new Float64Array(blockCount);
    const counts = new Float64Array(blockCount);
    for (let y = 0; y < height; y += 1) {
      const blockRow = Math.min(rows - 1, Math.floor((y * rows) / height));
      for (let x = 0; x < width; x += 1) {
        const blockIndex = blockRow * columns + Math.min(columns - 1, Math.floor((x * columns) / width));
        const offset = (y * width + x) * 4;
        sums[blockIndex] += relativeLuminance({ r: data[offset], g: data[offset + 1], b: data[offset + 2] });
        redSums[blockIndex] += data[offset];
        greenSums[blockIndex] += data[offset + 1];
        blueSums[blockIndex] += data[offset + 2];
        counts[blockIndex] += 1;
      }
    }

    const blockLuminance = new Float64Array(blockCount);
    const blockRedRatio = new Float64Array(blockCount);
    const blockChromaticity = new Array(blockCount);
    let frameSum = 0;
    for (let block = 0; block < blockCount; block += 1) {
      blockLuminance[block] = counts[block] > 0 ? sums[block] / counts[block] : 0;
      frameSum += blockLuminance[block] * counts[block];
      const r = redSums[block] / counts[block];
      const g = greenSums[block] / counts[block];
      const b = blueSums[block] / counts[block];
      blockRedRatio[block] = r + g + b > 0 ? r / (r + g + b) : 0;
      const linearR = linearize(r);
      const linearG = linearize(g);
      const linearB = linearize(b);
      const x = 0.4124 * linearR + 0.3576 * linearG + 0.1805 * linearB;
      const y = 0.2126 * linearR + 0.7152 * linearG + 0.0722 * linearB;
      const z = 0.0193 * linearR + 0.1192 * linearG + 0.9505 * linearB;
      const divisor = x + 15 * y + 3 * z;
      blockChromaticity[block] = divisor > 0 ? { u: (4 * x) / divisor, v: (9 * y) / divisor } : { u: 0, v: 0 };
    }
    blockLuminanceByFrame.push(blockLuminance);
    blockRedRatioByFrame.push(blockRedRatio);
    blockChromaticityByFrame.push(blockChromaticity);
    luminanceTimeline.push(Number((frameSum / (width * height)).toFixed(4)));
  });

  const totalDurationMs = clock;

  // A qualifying transition is a >=10%-of-white luminance swing whose darker end sits
  // below 0.80 relative luminance (the WCAG 2.3.1 general flash definition); a flash is
  // a completed pair of opposing transitions, stamped at the second transition's time.
  const flashTimesByBlock = [];
  const redFlashTimesByBlock = [];
  let totalFlashEvents = 0;
  let totalRedFlashEvents = 0;
  for (let block = 0; block < blockCount; block += 1) {
    const flashTimes = [];
    let pendingDirection = 0;
    for (let frameIndex = 1; frameIndex < frames.length; frameIndex += 1) {
      const previous = blockLuminanceByFrame[frameIndex - 1][block];
      const current = blockLuminanceByFrame[frameIndex][block];
      const delta = current - previous;
      if (Math.abs(delta) < luminanceDelta || Math.min(previous, current) >= darkerLuminanceMax) {
        continue;
      }
      const direction = delta > 0 ? 1 : -1;
      if (pendingDirection !== 0 && direction !== pendingDirection) {
        flashTimes.push(frameStartTimes[frameIndex]);
        pendingDirection = 0;
      } else {
        pendingDirection = direction;
      }
    }
    totalFlashEvents += flashTimes.length;
    flashTimesByBlock.push(flashTimes);

    // WCAG's working red-flash definition requires an opposing pair where a
    // transition touches saturated red (R/(R+G+B) >= .8) and the two states
    // differ by more than .2 in CIE 1976 UCS chromaticity.
    const redFlashTimes = [];
    let pendingRedDirection = 0;
    for (let frameIndex = 1; frameIndex < frames.length; frameIndex += 1) {
      const previousRatio = blockRedRatioByFrame[frameIndex - 1][block];
      const currentRatio = blockRedRatioByFrame[frameIndex][block];
      const previousChroma = blockChromaticityByFrame[frameIndex - 1][block];
      const currentChroma = blockChromaticityByFrame[frameIndex][block];
      const chromaDistance = Math.hypot(currentChroma.u - previousChroma.u, currentChroma.v - previousChroma.v);
      if (
        Math.max(previousRatio, currentRatio) < saturatedRedRatio ||
        chromaDistance <= redChromaticityDelta
      ) {
        continue;
      }
      const ratioDelta = currentRatio - previousRatio;
      if (ratioDelta === 0) continue;
      const direction = ratioDelta > 0 ? 1 : -1;
      if (pendingRedDirection !== 0 && direction !== pendingRedDirection) {
        redFlashTimes.push(frameStartTimes[frameIndex]);
        pendingRedDirection = 0;
      } else {
        pendingRedDirection = direction;
      }
    }
    totalRedFlashEvents += redFlashTimes.length;
    redFlashTimesByBlock.push(redFlashTimes);
  }

  // Evaluate every 1s window anchored at a flash: per-block flash counts inside
  // [start, start + 1000) give the peak rate and the violating-block area share.
  const windowStarts = [...new Set([...flashTimesByBlock.flat(), ...redFlashTimesByBlock.flat()])].sort((a, b) => a - b);
  let peakFlashesPerSecond = 0;
  let peakGeneralFlashesPerSecond = 0;
  let peakRedFlashesPerSecond = 0;
  let peakViolatingAreaPercent = 0;
  let worstWindow = null;
  windowStarts.forEach((start) => {
    const end = start + 1000;
    let violatingBlocks = 0;
    let windowPeakFlashes = 0;
    for (let block = 0; block < blockCount; block += 1) {
      let flashesInWindow = 0;
      let redFlashesInWindow = 0;
      for (const time of flashTimesByBlock[block]) {
        if (time >= start && time < end) flashesInWindow += 1;
      }
      for (const time of redFlashTimesByBlock[block]) {
        if (time >= start && time < end) redFlashesInWindow += 1;
      }
      peakGeneralFlashesPerSecond = Math.max(peakGeneralFlashesPerSecond, flashesInWindow);
      peakRedFlashesPerSecond = Math.max(peakRedFlashesPerSecond, redFlashesInWindow);
      const blockPeak = Math.max(flashesInWindow, redFlashesInWindow);
      windowPeakFlashes = Math.max(windowPeakFlashes, blockPeak);
      if (blockPeak > flashLimitPerSecond) violatingBlocks += 1;
    }
    const violatingAreaPercent = Number(((violatingBlocks / blockCount) * 100).toFixed(1));
    peakFlashesPerSecond = Math.max(peakFlashesPerSecond, windowPeakFlashes);
    peakViolatingAreaPercent = Math.max(peakViolatingAreaPercent, violatingAreaPercent);
    if (
      !worstWindow ||
      violatingAreaPercent > worstWindow.violatingAreaPercent ||
      (violatingAreaPercent === worstWindow.violatingAreaPercent && windowPeakFlashes > worstWindow.flashes)
    ) {
      worstWindow = { startMs: start, endMs: end, flashes: windowPeakFlashes, violatingAreaPercent };
    }
  });

  let riskLevel = 'low';
  if (peakViolatingAreaPercent >= areaThresholdPercent) {
    riskLevel = 'high';
  } else if (peakFlashesPerSecond >= flashLimitPerSecond) {
    riskLevel = 'caution';
  }

  return {
    frameCount: frames.length,
    totalDurationMs,
    averageFps: Number((frames.length / (totalDurationMs / 1000)).toFixed(2)),
    grid: { columns, rows },
    totalFlashEvents,
    totalRedFlashEvents,
    peakFlashesPerSecond,
    peakGeneralFlashesPerSecond,
    peakRedFlashesPerSecond,
    peakViolatingAreaPercent,
    worstWindow,
    riskLevel,
    riskLabel: FLASH_RISK_LABELS[riskLevel],
    luminanceTimeline,
  };
}

export function planVideoFrameSampling(durationMs, options = {}) {
  const { sampleFps = 10, maxFrames = 240, minDurationMs = 300 } = options;
  if (!Number.isFinite(durationMs) || durationMs <= 0) {
    throw new Error('planVideoFrameSampling requires a positive, finite video duration in milliseconds.');
  }
  if (!Number.isFinite(sampleFps) || sampleFps <= 0) {
    throw new Error('planVideoFrameSampling requires a positive sampleFps.');
  }
  if (!Number.isInteger(maxFrames) || maxFrames < 2) {
    throw new Error('planVideoFrameSampling requires an integer maxFrames of at least 2.');
  }
  if (durationMs < minDurationMs) {
    throw new Error(
      `The video is too short to flash-scan — at least ${(minDurationMs / 1000).toFixed(1)}s of playback is required.`,
    );
  }

  const frameDurationMs = 1000 / sampleFps;
  const totalFrames = Math.max(2, Math.floor(durationMs / frameDurationMs));
  const frameCount = Math.min(totalFrames, maxFrames);
  const truncated = totalFrames > maxFrames;
  const lastSeekableMs = Math.max(0, durationMs - 1);
  const timesMs = [];
  for (let index = 0; index < frameCount; index += 1) {
    timesMs.push(Math.min(index * frameDurationMs, lastSeekableMs));
  }
  return {
    timesMs,
    frameDurationMs,
    frameCount,
    totalFrames,
    truncated,
    analyzedDurationMs: frameCount * frameDurationMs,
  };
}

export const WALKTHROUGH_KEYFRAME_DEFAULTS = {
  gridSize: 8,
  distinctThreshold: 0.03,
  stabilityThreshold: 0.012,
  maxKeyframes: 12,
};

/**
 * Coarse perceptual signature of one frame: mean R/G/B per cell of a
 * gridSize x gridSize partition, flattened row-major as [r, g, b, r, g, b, …].
 * Signatures are what walkthrough recording compares instead of raw pixels,
 * so "is this the same screen?" stays cheap enough to run every sample tick.
 */
export function computeFrameSignature(data, width, height, gridSize = WALKTHROUGH_KEYFRAME_DEFAULTS.gridSize) {
  if (!Number.isInteger(width) || !Number.isInteger(height) || width <= 0 || height <= 0) {
    throw new Error('Image dimensions must be positive integers.');
  }
  if (!data || typeof data.length !== 'number' || data.length !== width * height * 4) {
    throw new Error('Image data length must equal width * height * 4.');
  }
  if (!Number.isInteger(gridSize) || gridSize < 2 || gridSize > 64) {
    throw new Error('Signature grid size must be an integer between 2 and 64.');
  }

  const cells = gridSize * gridSize;
  const sums = new Float64Array(cells * 3);
  const counts = new Uint32Array(cells);
  for (let y = 0; y < height; y += 1) {
    const row = Math.min(gridSize - 1, Math.floor((y * gridSize) / height));
    for (let x = 0; x < width; x += 1) {
      const col = Math.min(gridSize - 1, Math.floor((x * gridSize) / width));
      const cell = row * gridSize + col;
      const offset = (y * width + x) * 4;
      sums[cell * 3] += data[offset];
      sums[cell * 3 + 1] += data[offset + 1];
      sums[cell * 3 + 2] += data[offset + 2];
      counts[cell] += 1;
    }
  }

  const signature = new Array(cells * 3);
  for (let cell = 0; cell < cells; cell += 1) {
    const count = counts[cell] || 1;
    signature[cell * 3] = sums[cell * 3] / count;
    signature[cell * 3 + 1] = sums[cell * 3 + 1] / count;
    signature[cell * 3 + 2] = sums[cell * 3 + 2] / count;
  }
  return signature;
}

/**
 * Normalized distance between two frame signatures: mean absolute channel
 * difference scaled to 0..1 (identical frames → 0, black vs white → 1).
 */
export function frameSignatureDistance(a, b) {
  if (!a || !b || typeof a.length !== 'number' || typeof b.length !== 'number' || !a.length) {
    throw new Error('Frame signatures must be non-empty arrays.');
  }
  if (a.length !== b.length) {
    throw new Error('Frame signatures must have the same length.');
  }
  let total = 0;
  for (let index = 0; index < a.length; index += 1) {
    total += Math.abs(a[index] - b[index]);
  }
  return total / (a.length * 255);
}

/**
 * Classify one sampled walkthrough frame against the recording so far.
 * A frame must be stable (unchanged since the previous sample) before it can
 * become a keyframe — that skips mid-navigation paints, scroll blurs, and
 * cross-fades. Stable frames are kept only when they differ from every kept
 * screen, so revisiting a screen never duplicates it.
 * Returns { status: 'keep' | 'duplicate' | 'transition' | 'overflow',
 *           nearestKeptIndex, nearestKeptDistance }.
 */
export function evaluateWalkthroughFrame(signature, previousSignature, keptSignatures, options = {}) {
  if (!options || typeof options !== 'object' || Array.isArray(options)) {
    throw new Error('Walkthrough options must be an object.');
  }
  const {
    distinctThreshold = WALKTHROUGH_KEYFRAME_DEFAULTS.distinctThreshold,
    stabilityThreshold = WALKTHROUGH_KEYFRAME_DEFAULTS.stabilityThreshold,
    maxKeyframes = WALKTHROUGH_KEYFRAME_DEFAULTS.maxKeyframes,
  } = options;
  requireFinitePositiveNumber(distinctThreshold, 'Distinct threshold', Number.MIN_VALUE);
  requireFinitePositiveNumber(stabilityThreshold, 'Stability threshold', Number.MIN_VALUE);
  if (!Number.isInteger(maxKeyframes) || maxKeyframes < 1) {
    throw new Error('Maximum keyframe count must be a positive integer.');
  }
  if (!Array.isArray(keptSignatures)) {
    throw new Error('Kept signatures must be an array.');
  }

  if (previousSignature && frameSignatureDistance(signature, previousSignature) > stabilityThreshold) {
    return { status: 'transition', nearestKeptIndex: -1, nearestKeptDistance: null };
  }

  let nearestKeptIndex = -1;
  let nearestKeptDistance = null;
  keptSignatures.forEach((kept, index) => {
    const distance = frameSignatureDistance(signature, kept);
    if (nearestKeptDistance === null || distance < nearestKeptDistance) {
      nearestKeptDistance = distance;
      nearestKeptIndex = index;
    }
  });

  if (nearestKeptDistance !== null && nearestKeptDistance <= distinctThreshold) {
    return { status: 'duplicate', nearestKeptIndex, nearestKeptDistance };
  }
  if (keptSignatures.length >= maxKeyframes) {
    return { status: 'overflow', nearestKeptIndex, nearestKeptDistance };
  }
  return { status: 'keep', nearestKeptIndex, nearestKeptDistance };
}

/**
 * Batch form of the walkthrough keyframe state machine: run every sampled
 * signature through evaluateWalkthroughFrame in order and report which frames
 * would be kept as distinct screens. Used for tests and offline analysis; the
 * app applies the same per-frame decision incrementally while recording.
 */
export function selectWalkthroughKeyframes(signatures, options = {}) {
  if (!Array.isArray(signatures) || !signatures.length) {
    throw new Error('Keyframe selection requires a non-empty array of frame signatures.');
  }

  const decisions = [];
  const keptIndices = [];
  const keptSignatures = [];
  signatures.forEach((signature, index) => {
    const decision = evaluateWalkthroughFrame(
      signature,
      index > 0 ? signatures[index - 1] : null,
      keptSignatures,
      options,
    );
    if (decision.status === 'keep') {
      keptIndices.push(index);
      keptSignatures.push(signature);
    }
    decisions.push({ index, ...decision });
  });

  const countStatus = (status) => decisions.filter((decision) => decision.status === status).length;
  return {
    decisions,
    keptIndices,
    summary: {
      total: signatures.length,
      kept: keptIndices.length,
      duplicates: countStatus('duplicate'),
      transitions: countStatus('transition'),
      overflow: countStatus('overflow'),
    },
  };
}

// ---------------------------------------------------------------------------
// PDF audit report — a from-scratch, zero-dependency PDF 1.4 writer.
// buildPdfReport() turns a small declarative document model into raw PDF
// bytes (Letter pages, Helvetica with WinAnsi encoding, word wrap, tables,
// a score donut drawn with bezier arcs, pagination, and an optional
// DCTDecode JPEG image). buildAuditPdfDoc() maps the accessibility report
// JSON produced by the app into that document model.
// ---------------------------------------------------------------------------

export const PDF_GRADE_COLORS = {
  A: '#2f9e44',
  B: '#66a80f',
  C: '#b28900',
  D: '#e8590c',
  F: '#e03131',
  none: '#64748b',
};

const PDF_PAGE = { width: 612, height: 792, margin: 54 };
const PDF_CONTENT_WIDTH = PDF_PAGE.width - PDF_PAGE.margin * 2;

const PDF_WINANSI_CHARS = new Map([
  ['—', '\x97'],
  ['–', '\x96'],
  ['‘', '\x91'],
  ['’', '\x92'],
  ['“', '\x93'],
  ['”', '\x94'],
  ['•', '\x95'],
  ['…', '\x85'],
  ['×', '\xd7'],
  ['°', '\xb0'],
  ['±', '\xb1'],
]);

function sanitizePdfText(value) {
  const text = String(value ?? '')
    .replace(/ΔE?/g, 'dE')
    .replace(/→/g, '->')
    .replace(/←/g, '<-')
    .replace(/≥/g, '>=')
    .replace(/≤/g, '<=')
    .replace(/[✓✔]/g, 'OK')
    .replace(/[\r\n\t]+/g, ' ');
  let out = '';
  for (const ch of text) {
    const mapped = PDF_WINANSI_CHARS.get(ch);
    if (mapped) {
      out += mapped;
    } else if (ch.charCodeAt(0) <= 0xff) {
      out += ch;
    } else {
      out += '?';
    }
  }
  return out;
}

function escapePdfText(value) {
  return sanitizePdfText(value).replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
}

function pdfCharUnits(ch, bold) {
  if (" iIl.,:;!|'()[]{}jft-".includes(ch)) {
    return bold ? 0.37 : 0.33;
  }
  if ('mwMW@%'.includes(ch)) {
    return bold ? 0.95 : 0.89;
  }
  if (ch >= 'A' && ch <= 'Z') {
    return bold ? 0.76 : 0.7;
  }
  return bold ? 0.61 : 0.56;
}

function measurePdfText(text, size, bold = false) {
  let units = 0;
  for (const ch of String(text)) {
    units += pdfCharUnits(ch, bold);
  }
  return units * size;
}

function wrapPdfText(text, size, maxWidth, bold = false) {
  const words = sanitizePdfText(text).split(' ').filter((word) => word.length > 0);
  if (!words.length) {
    return [''];
  }
  const lines = [];
  let current = '';
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (measurePdfText(candidate, size, bold) <= maxWidth || !current) {
      current = candidate;
    } else {
      lines.push(current);
      current = word;
    }
  }
  lines.push(current);
  return lines;
}

function truncatePdfText(text, size, maxWidth, bold = false) {
  const clean = sanitizePdfText(text);
  if (measurePdfText(clean, size, bold) <= maxWidth) {
    return clean;
  }
  let out = clean;
  while (out.length > 1 && measurePdfText(`${out}\x85`, size, bold) > maxWidth) {
    out = out.slice(0, -1);
  }
  return `${out}\x85`;
}

function pdfColor(hex, stroke = false) {
  const rgb = parseHexColor(hex) || { r: 15, g: 23, b: 42 };
  const fmt = (channel) => Math.round((channel / 255) * 1000) / 1000;
  return `${fmt(rgb.r)} ${fmt(rgb.g)} ${fmt(rgb.b)} ${stroke ? 'RG' : 'rg'}`;
}

function fmtPdfNumber(value) {
  return String(Math.round(value * 100) / 100);
}

function pdfArcOps(cx, cy, radius, startDeg, sweepDeg) {
  const segments = Math.max(1, Math.ceil(Math.abs(sweepDeg) / 90));
  const step = (sweepDeg / segments) * (Math.PI / 180);
  let angle = startDeg * (Math.PI / 180);
  const point = (theta) => [cx + radius * Math.cos(theta), cy + radius * Math.sin(theta)];
  const [startX, startY] = point(angle);
  const ops = [`${fmtPdfNumber(startX)} ${fmtPdfNumber(startY)} m`];
  for (let segment = 0; segment < segments; segment += 1) {
    const next = angle + step;
    const k = (4 / 3) * Math.tan(step / 4) * radius;
    const [x0, y0] = point(angle);
    const [x1, y1] = point(next);
    const c1 = [x0 - k * Math.sin(angle), y0 + k * Math.cos(angle)];
    const c2 = [x1 + k * Math.sin(next), y1 - k * Math.cos(next)];
    ops.push(
      `${fmtPdfNumber(c1[0])} ${fmtPdfNumber(c1[1])} ${fmtPdfNumber(c2[0])} ${fmtPdfNumber(c2[1])} ${fmtPdfNumber(x1)} ${fmtPdfNumber(y1)} c`,
    );
    angle = next;
  }
  return ops;
}

const PDF_BLOCK_TYPES = new Set(['heading', 'text', 'note', 'keyValues', 'table', 'spacer', 'image']);

function validatePdfDocument(doc) {
  if (!doc || typeof doc !== 'object') {
    throw new Error('PDF document must be an object.');
  }
  if (typeof doc.title !== 'string' || !doc.title.trim()) {
    throw new Error('PDF document title is required.');
  }
  if (!Array.isArray(doc.blocks)) {
    throw new Error('PDF blocks must be an array.');
  }
  for (const block of doc.blocks) {
    if (!block || !PDF_BLOCK_TYPES.has(block.type)) {
      throw new Error(`Unknown PDF block type: ${block?.type ?? 'none'}.`);
    }
  }
  if (doc.score !== null && doc.score !== undefined) {
    if (!Number.isFinite(doc.score.value) || doc.score.value < 0 || doc.score.value > 100) {
      throw new Error('PDF score value must be a finite number between 0 and 100.');
    }
  }
  if (doc.image !== null && doc.image !== undefined) {
    const { data, width, height } = doc.image;
    if (
      !(data instanceof Uint8Array) ||
      !data.length ||
      !Number.isInteger(width) ||
      !Number.isInteger(height) ||
      width <= 0 ||
      height <= 0
    ) {
      throw new Error('PDF image data must be a Uint8Array with positive integer dimensions.');
    }
  }
}

export function buildPdfReport(doc) {
  validatePdfDocument(doc);

  const margin = PDF_PAGE.margin;
  const bottomLimit = PDF_PAGE.height - margin - 20;
  const pages = [];
  let ops = null;
  let cursorY = 0;
  let imageUsed = false;

  const newPage = () => {
    ops = [];
    pages.push(ops);
    cursorY = margin;
  };
  const py = (y) => PDF_PAGE.height - y;
  const ensure = (heightNeeded) => {
    if (cursorY + heightNeeded > bottomLimit) {
      newPage();
      return true;
    }
    return false;
  };
  const drawText = (x, baselineY, text, size, { bold = false, color = '#1f2937' } = {}) => {
    ops.push(
      `BT ${pdfColor(color)} /F${bold ? 2 : 1} ${fmtPdfNumber(size)} Tf 1 0 0 1 ${fmtPdfNumber(x)} ${fmtPdfNumber(py(baselineY))} Tm (${escapePdfText(text)}) Tj ET`,
    );
  };
  const drawRule = (y, color = '#e2e8f0', width = 0.8) => {
    ops.push(
      `${pdfColor(color, true)} ${fmtPdfNumber(width)} w ${fmtPdfNumber(margin)} ${fmtPdfNumber(py(y))} m ${fmtPdfNumber(margin + PDF_CONTENT_WIDTH)} ${fmtPdfNumber(py(y))} l S`,
    );
  };
  const writeWrapped = (text, size, { bold = false, color = '#1f2937', x = margin, maxWidth = PDF_CONTENT_WIDTH, lineHeight = size * 1.38 } = {}) => {
    for (const line of wrapPdfText(text, size, maxWidth, bold)) {
      ensure(lineHeight);
      cursorY += lineHeight;
      drawText(x, cursorY, line, size, { bold, color });
    }
  };

  newPage();

  // Title area (first page only).
  cursorY += 22;
  drawText(margin, cursorY, doc.title, 19, { bold: true, color: '#0f172a' });
  if (doc.subtitle) {
    cursorY += 17;
    drawText(margin, cursorY, doc.subtitle, 10.5, { color: '#475569' });
  }
  if (doc.generatedAt) {
    cursorY += 13;
    drawText(margin, cursorY, `Generated ${doc.generatedAt}`, 8.5, { color: '#64748b' });
  }
  cursorY += 10;
  drawRule(cursorY, '#cbd5e1', 1);

  // Score donut panel.
  if (doc.score) {
    const panelTop = cursorY + 10;
    const radius = 26;
    const cx = margin + radius + 4;
    const cyTop = panelTop + radius + 6;
    const gradeColor = PDF_GRADE_COLORS[doc.score.grade] || PDF_GRADE_COLORS.none;
    const centerY = py(cyTop);
    ops.push(`q ${pdfColor('#e2e8f0', true)} 7 w 1 J`);
    ops.push(...pdfArcOps(cx, centerY, radius, 90, 359.9), 'S');
    ops.push('Q');
    const sweep = Math.max(0.01, (doc.score.value / 100) * 359.9);
    ops.push(`q ${pdfColor(gradeColor, true)} 7 w 1 J`);
    ops.push(...pdfArcOps(cx, centerY, radius, 90, -sweep), 'S');
    ops.push('Q');
    const scoreLabel = String(Math.round(doc.score.value));
    const scoreWidth = measurePdfText(scoreLabel, 19, true);
    drawText(cx - scoreWidth / 2, cyTop + 4, scoreLabel, 19, { bold: true, color: '#0f172a' });
    const slashWidth = measurePdfText('/100', 7);
    drawText(cx - slashWidth / 2, cyTop + 13, '/100', 7, { color: '#64748b' });

    const headlineX = cx + radius + 18;
    drawText(headlineX, panelTop + 20, 'ClearSight Score', 9, { bold: true, color: '#64748b' });
    drawText(
      headlineX,
      panelTop + 38,
      `Grade ${doc.score.grade || '-'} - ${doc.score.label || ''}`,
      14,
      { bold: true, color: gradeColor },
    );
    if (doc.score.note) {
      drawText(headlineX, panelTop + 52, doc.score.note, 8.5, { color: '#475569' });
    }
    cursorY = panelTop + radius * 2 + 14;
  }

  const drawTableHeader = (columns, scale) => {
    ensure(18);
    cursorY += 14;
    let x = margin;
    for (const column of columns) {
      drawText(x, cursorY, column.label, 8, { bold: true, color: '#64748b' });
      x += column.width * scale;
    }
    cursorY += 4;
    drawRule(cursorY, '#cbd5e1', 0.8);
  };

  for (const block of doc.blocks) {
    if (block.type === 'spacer') {
      cursorY += Number.isFinite(block.height) ? block.height : 8;
    } else if (block.type === 'heading') {
      ensure(34);
      cursorY += 22;
      drawText(margin, cursorY, block.text, 11.5, { bold: true, color: '#0f172a' });
      cursorY += 5;
      drawRule(cursorY);
    } else if (block.type === 'text') {
      writeWrapped(block.text, 9.5);
    } else if (block.type === 'note') {
      writeWrapped(block.text, 8.5, { color: '#64748b' });
    } else if (block.type === 'keyValues') {
      const labelWidth = Number.isFinite(block.labelWidth) ? block.labelWidth : 168;
      for (const [key, value] of block.rows || []) {
        const valueLines = wrapPdfText(String(value), 9.5, PDF_CONTENT_WIDTH - labelWidth);
        ensure(valueLines.length * 13 + 1);
        cursorY += 13;
        drawText(margin, cursorY, String(key), 9.5, { bold: true, color: '#334155' });
        drawText(margin + labelWidth, cursorY, valueLines[0], 9.5);
        for (const extra of valueLines.slice(1)) {
          ensure(13);
          cursorY += 13;
          drawText(margin + labelWidth, cursorY, extra, 9.5);
        }
      }
    } else if (block.type === 'table') {
      const columns = block.columns || [];
      const totalWidth = columns.reduce((sum, column) => sum + column.width, 0) || 1;
      const scale = PDF_CONTENT_WIDTH / totalWidth;
      drawTableHeader(columns, scale);
      for (const row of block.rows || []) {
        if (ensure(13)) {
          drawTableHeader(columns, scale);
        }
        cursorY += 13;
        let x = margin;
        columns.forEach((column, columnIndex) => {
          const cell = row[columnIndex] === null || row[columnIndex] === undefined ? '' : String(row[columnIndex]);
          drawText(x, cursorY, truncatePdfText(cell, 8.5, column.width * scale - 6), 8.5, {
            color: column.color || '#1f2937',
          });
          x += column.width * scale;
        });
      }
    } else if (block.type === 'image' && doc.image) {
      const maxHeight = 300;
      let drawWidth = PDF_CONTENT_WIDTH;
      let drawHeight = (doc.image.height / doc.image.width) * drawWidth;
      if (drawHeight > maxHeight) {
        drawHeight = maxHeight;
        drawWidth = (doc.image.width / doc.image.height) * drawHeight;
      }
      if (cursorY + drawHeight + 16 > bottomLimit) {
        newPage();
      }
      cursorY += 8;
      const top = cursorY;
      ops.push(
        `q ${fmtPdfNumber(drawWidth)} 0 0 ${fmtPdfNumber(drawHeight)} ${fmtPdfNumber(margin)} ${fmtPdfNumber(py(top + drawHeight))} cm /Im1 Do Q`,
      );
      ops.push(
        `${pdfColor('#cbd5e1', true)} 0.8 w ${fmtPdfNumber(margin)} ${fmtPdfNumber(py(top + drawHeight))} ${fmtPdfNumber(drawWidth)} ${fmtPdfNumber(drawHeight)} re S`,
      );
      cursorY += drawHeight + 4;
      imageUsed = true;
    }
  }

  // Footers (page count known only now).
  const footerNote = doc.footerNote || 'Generated locally by ClearSight - no image or data left this device.';
  pages.forEach((pageOps, index) => {
    pageOps.push(
      `BT ${pdfColor('#94a3b8')} /F1 7.5 Tf 1 0 0 1 ${fmtPdfNumber(margin)} 30 Tm (${escapePdfText(footerNote)}) Tj ET`,
    );
    const pageLabel = `Page ${index + 1} of ${pages.length}`;
    const labelWidth = measurePdfText(pageLabel, 7.5);
    pageOps.push(
      `BT ${pdfColor('#94a3b8')} /F1 7.5 Tf 1 0 0 1 ${fmtPdfNumber(margin + PDF_CONTENT_WIDTH - labelWidth)} 30 Tm (${escapePdfText(pageLabel)}) Tj ET`,
    );
  });

  // Serialize objects: 1 catalog, 2 pages, 3/4 fonts, optional 5 image,
  // then one content + one page object per rendered page.
  const includeImage = Boolean(doc.image) && imageUsed;
  const imageObjectNumber = includeImage ? 5 : null;
  const firstPageObject = includeImage ? 6 : 5;
  const objectCount = firstPageObject - 1 + pages.length * 2;
  const pageObjectNumbers = pages.map((_, index) => firstPageObject + index * 2 + 1);

  const chunks = [];
  let byteOffset = 0;
  const pushBytes = (value) => {
    let bytes;
    if (value instanceof Uint8Array) {
      bytes = value;
    } else {
      bytes = new Uint8Array(value.length);
      for (let index = 0; index < value.length; index += 1) {
        bytes[index] = value.charCodeAt(index) & 0xff;
      }
    }
    chunks.push(bytes);
    byteOffset += bytes.length;
  };

  pushBytes('%PDF-1.4\n%\xe2\xe3\xcf\xd3\n');

  const objectOffsets = new Array(objectCount + 1).fill(0);
  const beginObject = (number) => {
    objectOffsets[number] = byteOffset;
    pushBytes(`${number} 0 obj\n`);
  };

  beginObject(1);
  pushBytes('<< /Type /Catalog /Pages 2 0 R >>\nendobj\n');
  beginObject(2);
  pushBytes(
    `<< /Type /Pages /Kids [${pageObjectNumbers.map((number) => `${number} 0 R`).join(' ')}] /Count ${pages.length} >>\nendobj\n`,
  );
  beginObject(3);
  pushBytes('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>\nendobj\n');
  beginObject(4);
  pushBytes('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>\nendobj\n');
  if (includeImage) {
    beginObject(imageObjectNumber);
    pushBytes(
      `<< /Type /XObject /Subtype /Image /Width ${doc.image.width} /Height ${doc.image.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${doc.image.data.length} >>\nstream\n`,
    );
    pushBytes(doc.image.data);
    pushBytes('\nendstream\nendobj\n');
  }

  const resources = `/Resources << /Font << /F1 3 0 R /F2 4 0 R >>${includeImage ? ' /XObject << /Im1 5 0 R >>' : ''} >>`;
  pages.forEach((pageOps, index) => {
    const contentNumber = firstPageObject + index * 2;
    const content = pageOps.join('\n');
    beginObject(contentNumber);
    pushBytes(`<< /Length ${content.length} >>\nstream\n${content}\nendstream\nendobj\n`);
    beginObject(contentNumber + 1);
    pushBytes(
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PDF_PAGE.width} ${PDF_PAGE.height}] ${resources} /Contents ${contentNumber} 0 R >>\nendobj\n`,
    );
  });

  const xrefOffset = byteOffset;
  let xref = `xref\n0 ${objectCount + 1}\n0000000000 65535 f \n`;
  for (let number = 1; number <= objectCount; number += 1) {
    xref += `${String(objectOffsets[number]).padStart(10, '0')} 00000 n \n`;
  }
  pushBytes(
    `${xref}trailer\n<< /Size ${objectCount + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`,
  );

  const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
  const output = new Uint8Array(totalLength);
  let position = 0;
  for (const chunk of chunks) {
    output.set(chunk, position);
    position += chunk.length;
  }
  return output;
}

export function buildAuditPdfDoc(report, options = {}) {
  if (!report || typeof report !== 'object') {
    throw new Error('Accessibility report is required to build the PDF document.');
  }

  const { maxTextRegions = 8, maxCollisions = 5, maxSimulations = 6, maxRemediation = 8, image = null } = options;
  const blocks = [];
  const formatRatio = (value) => (Number.isFinite(value) ? `${Number(value.toFixed(2))}:1` : '-');

  const score = report.accessibilityScore;
  const textScan = report.textScan;
  const collisions = report.paletteCollisions;
  const flashScan = report.flashScan;
  const contrast = report.contrast?.lastChecked;

  if (score?.axes?.length) {
    blocks.push({
      type: 'keyValues',
      labelWidth: 210,
      rows: score.axes.map((axis) => [axis.label, `${axis.score}/100 (weight ${axis.weight})`]),
    });
  }

  const overviewRows = [
    [
      'Text regions below AA',
      textScan ? `${textScan.summary.belowAA} of ${textScan.summary.total} detected regions` : 'Not scanned',
    ],
    [
      'Hidden color-vision failures',
      textScan ? `${textScan.summary.cvdHiddenFailures || 0} region(s) pass AA but fail under CVD` : 'Not scanned',
    ],
    [
      'APCA perceptual risks',
      textScan ? `${textScan.summary.apcaFalsePasses || 0} region(s) below Lc 60 despite WCAG 2 pass` : 'Not scanned',
    ],
    [
      'Color-only collisions (1.4.1)',
      collisions
        ? `${collisions.summary.collisions} of ${collisions.summary.candidatePairs} distinct pairs collapse under CVD`
        : 'Not scanned',
    ],
  ];
  if (report.topImpactMode && Number.isFinite(report.topImpactMode.impactPercent)) {
    overviewRows.push([
      'Peak simulation shift',
      `${report.topImpactMode.label} - ${report.topImpactMode.impactPercent}% of pixels change`,
    ]);
  }
  overviewRows.push([
    'Flash risk (WCAG 2.3.1)',
    flashScan ? flashScan.riskLabel : 'Not scanned (static image)',
  ]);
  blocks.push({ type: 'heading', text: 'Findings overview' });
  blocks.push({ type: 'keyValues', rows: overviewRows });

  if (textScan?.regions?.length) {
    blocks.push({ type: 'heading', text: 'Automatic text contrast scan (worst first)' });
    blocks.push({
      type: 'table',
      columns: [
        { label: '#', width: 20 },
        { label: 'Position', width: 88 },
        { label: 'Text', width: 58 },
        { label: 'Background', width: 62 },
        { label: 'WCAG', width: 92 },
        { label: 'CVD worst', width: 104 },
        { label: 'APCA', width: 80 },
      ],
      rows: textScan.regions.slice(0, maxTextRegions).map((region) => [
        region.rank,
        `(${region.x}, ${region.y}) ${region.width}x${region.height}`,
        region.text,
        region.background,
        `${formatRatio(region.ratio)} ${region.levelLabel}`,
        region.cvdWorstRatio !== null && region.cvdWorstRatio !== undefined
          ? `${formatRatio(region.cvdWorstRatio)} ${region.cvdWorstMode || ''}${region.cvdHiddenFailure ? ' (hidden)' : ''}`
          : '-',
        region.apcaLc !== null && region.apcaLc !== undefined
          ? `Lc ${Math.round(Math.abs(region.apcaLc))}${region.apcaFalsePass ? ' (risk)' : ''}`
          : '-',
      ]),
    });
    if (textScan.regions.length > maxTextRegions) {
      blocks.push({
        type: 'note',
        text: `Showing the ${maxTextRegions} worst of ${textScan.regions.length} detected regions; the JSON report contains the full list.`,
      });
    }
  }

  if (collisions?.pairs?.length) {
    blocks.push({ type: 'heading', text: 'Color-only distinction risks (WCAG 1.4.1)' });
    blocks.push({
      type: 'table',
      columns: [
        { label: 'Color pair', width: 128 },
        { label: 'dE typical', width: 70 },
        { label: 'dE worst', width: 66 },
        { label: 'Worst mode', width: 130 },
        { label: 'Retention', width: 66 },
      ],
      rows: collisions.pairs.slice(0, maxCollisions).map((pair) => [
        `${pair.colorA} vs ${pair.colorB}`,
        pair.baseDeltaE,
        pair.worstDeltaE,
        pair.worstModeLabel,
        `${pair.retentionPercent}%`,
      ]),
    });
    blocks.push({
      type: 'note',
      text: 'Pairs listed here look clearly different for typical vision but become nearly indistinguishable for color-blind users. Add a second cue (icon, label, pattern) wherever these colors encode meaning.',
    });
  }

  if (contrast) {
    blocks.push({ type: 'heading', text: 'Manual contrast check' });
    const contrastRows = [
      ['Pair checked', `${report.contrast.text} on ${report.contrast.background}`],
      [
        'WCAG 2 ratio',
        `${formatRatio(contrast.ratio)} - AA ${contrast.passesAA ? 'pass' : 'fail'}, AAA ${contrast.passesAAA ? 'pass' : 'fail'}`,
      ],
    ];
    if (contrast.cvdProjection?.worst) {
      contrastRows.push([
        'Color-vision projection',
        `worst ${formatRatio(contrast.cvdProjection.worst.ratio)} under ${contrast.cvdProjection.worst.label}${contrast.cvdProjection.hiddenFailure ? ' - HIDDEN FAILURE (passes AA for typical vision only)' : ''}`,
      ]);
    }
    if (contrast.apca) {
      contrastRows.push([
        'APCA (WCAG 3 draft)',
        `Lc ${Math.round(Math.abs(contrast.apca.lc))} - ${contrast.apca.rating}${contrast.apca.falsePass ? ' - PERCEPTUAL FALSE PASS' : ''}`,
      ]);
    }
    blocks.push({ type: 'keyValues', rows: contrastRows });
  }

  if (report.simulations?.length) {
    const measured = report.simulations.filter((entry) => Number.isFinite(entry.impactPercent));
    if (measured.length) {
      blocks.push({ type: 'heading', text: 'Vision simulation impact (top modes)' });
      blocks.push({
        type: 'table',
        columns: [
          { label: 'Vision mode', width: 300 },
          { label: 'Pixels changed', width: 110 },
          { label: 'Risk', width: 94 },
        ],
        rows: measured
          .slice(0, maxSimulations)
          .map((entry) => [entry.label, `${entry.impactPercent}%`, entry.impactLevel]),
      });
    }
  }

  if (flashScan) {
    blocks.push({ type: 'heading', text: 'Animation & video flash scan (WCAG 2.3.1)' });
    blocks.push({
      type: 'keyValues',
      rows: [
        ['Source', flashScan.label],
        ['Verdict', flashScan.riskLabel],
        [
          'Peak flash rate',
          `${flashScan.peakFlashesPerSecond}/sec (general ${flashScan.peakGeneralFlashesPerSecond}, saturated red ${flashScan.peakRedFlashesPerSecond})`,
        ],
        ['Peak violating area', `${flashScan.peakViolatingAreaPercent}% of the frame`],
        ['Frames analyzed', `${flashScan.frameCount} at ~${flashScan.averageFps} fps${flashScan.truncated ? ' (truncated)' : ''}`],
      ],
    });
  }

  if (report.remediationActions?.length) {
    blocks.push({ type: 'heading', text: 'Prioritized remediation plan' });
    report.remediationActions.slice(0, maxRemediation).forEach((action, index) => {
      blocks.push({
        type: 'text',
        text: `${index + 1}. [${action.priorityLabel || action.priority}] ${action.text}`,
      });
    });
  }

  if (image) {
    blocks.push({ type: 'heading', text: 'Audited screenshot' });
    blocks.push({ type: 'image' });
  }

  const source = report.source || {};
  const original = source.originalSize;
  const sizeText = original?.width
    ? ` - ${original.width}x${original.height}px${source.wasDownscaled ? ' (downscaled for analysis)' : ''}`
    : '';

  return {
    title: 'ClearSight accessibility audit',
    subtitle: `${source.fileName || 'Screenshot'}${sizeText}`,
    generatedAt: typeof report.generatedAt === 'string' ? report.generatedAt.replace('T', ' ').replace(/\.\d+Z$/, ' UTC') : '',
    score: score
      ? {
          value: score.score,
          grade: score.grade,
          label: score.verdictLabel,
          note: 'Weighted across text contrast, color-vision safety, APCA, and color independence.',
        }
      : null,
    blocks,
    image,
  };
}

/**
 * Map a multi-screen audit into the shared zero-dependency PDF document model.
 * This lives in vision-core so browser and CI portfolio reports stay portable.
 */
export function buildPortfolioPdfDoc({
  entries,
  portfolio,
  baselineComparison = null,
  skipped = [],
  generatedAt = '',
}) {
  if (!Array.isArray(entries) || !entries.length || !portfolio || typeof portfolio !== 'object') {
    throw new Error('Portfolio PDF requires audited entries and a portfolio summary.');
  }
  if (!Array.isArray(skipped)) {
    throw new Error('Portfolio PDF skipped findings must be an array.');
  }

  const scored = Number.isFinite(portfolio.portfolioScore);
  const grade = scored
    ? CLEARSIGHT_SCORE_GRADES.find((candidate) => portfolio.portfolioScore >= candidate.min)?.grade || null
    : null;
  const gradeText = Object.entries(portfolio.gradeCounts || {})
    .map(([label, count]) => `${count}x ${label}`)
    .join(', ') || 'n/a';
  const totals = portfolio.totals || {};
  const blocks = [
    { type: 'heading', text: 'Portfolio debt map' },
    {
      type: 'keyValues',
      rows: [
        ['Screens audited', `${portfolio.scoredCount ?? entries.length} scored of ${portfolio.screenCount ?? entries.length} submitted`],
        ['Average score', Number.isFinite(portfolio.averageScore) ? `${portfolio.averageScore}/100` : 'n/a'],
        ['Weakest screen', portfolio.lowestScreen ? `${portfolio.lowestScreen} at ${portfolio.lowestScore}/100` : 'n/a'],
        ['Grade distribution', gradeText],
        ['Weakest system axis', portfolio.weakestAxis ? `${portfolio.weakestAxis.label} (${portfolio.weakestAxis.score}/100 average)` : 'n/a'],
        ['Release gate', portfolio.releaseGate?.label || 'n/a'],
        [
          'Cross-screen findings',
          `${totals.belowAA ?? 0} below-AA text, ${totals.cvdHiddenFailures ?? 0} hidden CVD, ${totals.apcaFalsePasses ?? 0} APCA risks, ${totals.collisions ?? 0} color-only collisions`,
        ],
      ],
    },
  ];

  const baselineByName = baselineComparison
    ? new Map((baselineComparison.comparisons || []).map((item) => [item.name, item]))
    : null;
  const columns = [
    { label: '#', width: 22 },
    { label: 'Screen', width: 170 },
    { label: 'Score', width: 62 },
    { label: 'Below AA', width: 56 },
    { label: 'Hidden CVD', width: 62 },
    { label: 'APCA', width: 44 },
    { label: 'Collisions', width: 56 },
  ];
  if (baselineByName) columns.push({ label: 'vs base', width: 52 });
  blocks.push(
    { type: 'heading', text: 'Screens ranked riskiest-first' },
    {
      type: 'table',
      columns,
      rows: entries.map((entry, index) => {
        const summary = entry.audit?.textScan?.summary || {};
        const score = entry.audit?.score;
        const row = [
          index + 1,
          entry.name,
          Number.isFinite(score?.score) ? `${score.score} (${score.grade})` : 'unscored',
          summary.belowAA ?? 0,
          summary.cvdHiddenFailures ?? 0,
          summary.apcaFalsePasses ?? 0,
          entry.audit?.palette?.collisions?.summary?.collisions ?? 0,
        ];
        if (baselineByName) {
          const comparison = baselineByName.get(entry.name);
          row.push(
            !comparison || comparison.status === 'new'
              ? 'new'
              : Number.isFinite(comparison.delta)
                ? `${comparison.delta > 0 ? '+' : ''}${comparison.delta}`
                : 'n/a',
          );
        }
        return row;
      }),
    },
  );

  if (baselineComparison) {
    blocks.push(
      { type: 'heading', text: 'Baseline regression gate' },
      {
        type: 'text',
        text: baselineComparison.pass
          ? `Passed: no matched screen regressed beyond the configured tolerance.`
          : `FAILED: ${baselineComparison.failures.map((failure) => failure.name).join(', ')} regressed beyond tolerance.`,
      },
    );
  }
  if (skipped.length) {
    blocks.push({
      type: 'note',
      text: `Skipped ${skipped.length} screen${skipped.length === 1 ? '' : 's'} that could not be audited: ${skipped.map((failure) => typeof failure === 'string' ? failure : failure.file || failure.name || 'unknown').join(', ')}.`,
    });
  }

  return {
    title: 'ClearSight portfolio accessibility audit',
    subtitle: `${portfolio.screenCount ?? entries.length} screen${(portfolio.screenCount ?? entries.length) === 1 ? '' : 's'} — ranked riskiest-first across all six analysis axes`,
    generatedAt,
    score: scored
      ? {
          value: portfolio.portfolioScore,
          grade,
          label: portfolio.releaseGate?.label || '',
          note: 'Portfolio score: 75% fleet average + 25% weakest screen.',
        }
      : null,
    blocks,
    image: null,
  };
}

export const SHAREABLE_AUDIT_VERSION = 1;

export const SHAREABLE_AUDIT_LIMITS = {
  maxRegions: 8,
  maxCollisions: 6,
  maxSimulations: 6,
  maxActions: 6,
};

function shareRound(value, digits = 2) {
  if (!Number.isFinite(value)) {
    return null;
  }
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function shareText(value, maxLength = 400) {
  if (typeof value !== 'string') {
    return null;
  }
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }
  return trimmed.length > maxLength ? `${trimmed.slice(0, maxLength - 1)}…` : trimmed;
}

export function buildShareableAuditPayload(report, options = {}) {
  if (!report || typeof report !== 'object' || Array.isArray(report)) {
    throw new Error('buildShareableAuditPayload requires an accessibility report object.');
  }

  const limits = { ...SHAREABLE_AUDIT_LIMITS, ...options };
  const score = report.accessibilityScore || null;
  const textScan = report.textScan || null;
  const collisions = report.paletteCollisions || null;
  const flash = report.flashScan || null;
  const contrastChecked = report.contrast?.lastChecked || null;

  const payload = {
    v: SHAREABLE_AUDIT_VERSION,
    generatedAt: shareText(report.generatedAt, 40),
    source: report.source
      ? {
          name: shareText(report.source.fileName || report.source.name, 120),
          width: Number.isFinite(report.source.originalSize?.width)
            ? Math.round(report.source.originalSize.width)
            : Number.isFinite(report.source.renderedSize?.width)
              ? Math.round(report.source.renderedSize.width)
              : null,
          height: Number.isFinite(report.source.originalSize?.height)
            ? Math.round(report.source.originalSize.height)
            : Number.isFinite(report.source.renderedSize?.height)
              ? Math.round(report.source.renderedSize.height)
              : null,
          downscaled: Boolean(report.source.wasDownscaled || report.source.downscaled),
        }
      : null,
    score: score && Number.isFinite(score.score)
      ? {
          score: Math.round(score.score),
          grade: shareText(score.grade, 2),
          verdictLabel: shareText(score.verdictLabel, 80),
          axes: Array.isArray(score.axes)
            ? score.axes.slice(0, 8).map((axis) => ({
                id: shareText(axis.id, 40),
                label: shareText(axis.label, 60),
                weight: shareRound(axis.weight, 3),
                score: shareRound(axis.score, 1),
              }))
            : [],
        }
      : null,
    simulations: Array.isArray(report.simulations)
      ? report.simulations
          .filter((entry) => Number.isFinite(entry?.impactPercent))
          .slice(0, limits.maxSimulations)
          .map((entry) => ({
            label: shareText(entry.label, 60),
            impactPercent: shareRound(entry.impactPercent, 2),
            impactLevel: shareText(entry.impactLevel, 20),
          }))
      : [],
    textScan: textScan?.summary
      ? {
          regions: Number(textScan.summary.total ?? textScan.regions?.length ?? 0) || 0,
          belowAA: Number(textScan.summary.belowAA) || 0,
          cvdHiddenFailures: Number(textScan.summary.cvdHiddenFailures) || 0,
          apcaFalsePasses: Number(textScan.summary.apcaFalsePasses) || 0,
          worst: Array.isArray(textScan.regions)
            ? textScan.regions.slice(0, limits.maxRegions).map((region) => ({
                text: shareText(region.text, 12),
                background: shareText(region.background, 12),
                ratio: shareRound(region.ratio, 3),
                passesAA: Boolean(region.passesAA),
                levelLabel: shareText(region.levelLabel, 40),
                x: Number.isFinite(region.x) ? Math.round(region.x) : null,
                y: Number.isFinite(region.y) ? Math.round(region.y) : null,
                cvdWorstRatio: shareRound(region.cvdWorstRatio, 3),
                cvdWorstMode: shareText(region.cvdWorstMode, 60),
                cvdHiddenFailure: Boolean(region.cvdHiddenFailure),
                apcaLc: shareRound(region.apcaLc, 1),
                apcaFalsePass: Boolean(region.apcaFalsePass),
              }))
            : [],
        }
      : null,
    collisions: collisions?.summary
      ? {
          total: Number(collisions.summary.collisions) || 0,
          candidatePairs: Number(collisions.summary.candidatePairs) || 0,
          pairs: Array.isArray(collisions.pairs)
            ? collisions.pairs.slice(0, limits.maxCollisions).map((pair) => ({
                colorA: shareText(pair.colorA, 12),
                colorB: shareText(pair.colorB, 12),
                baseDeltaE: shareRound(pair.baseDeltaE, 2),
                worstDeltaE: shareRound(pair.worstDeltaE, 2),
                worstModeLabel: shareText(pair.worstModeLabel, 60),
                projectedA: shareText(pair.projectedA, 12),
                projectedB: shareText(pair.projectedB, 12),
              }))
            : [],
        }
      : null,
    flash: flash
      ? {
          label: shareText(flash.label, 80),
          riskLevel: shareText(flash.riskLevel, 20),
          riskLabel: shareText(flash.riskLabel, 80),
          peakFlashesPerSecond: shareRound(flash.peakFlashesPerSecond, 2),
          peakViolatingAreaPercent: shareRound(flash.peakViolatingAreaPercent, 2),
        }
      : null,
    contrast: contrastChecked
      ? {
          text: shareText(report.contrast?.text, 12),
          background: shareText(report.contrast?.background, 12),
          ratio: shareRound(contrastChecked.ratio, 3),
          passesAA: Boolean(contrastChecked.passesAA),
          passesAAA: Boolean(contrastChecked.passesAAA),
          cvdHiddenFailure: Boolean(contrastChecked.cvdProjection?.hiddenFailure),
          apcaLc: shareRound(contrastChecked.apca?.lc, 2),
          apcaFalsePass: Boolean(contrastChecked.apca?.falsePass),
        }
      : null,
    remediation: Array.isArray(report.remediationActions)
      ? report.remediationActions.slice(0, limits.maxActions).map((action) => ({
          priority: shareText(action.priority, 12) || 'info',
          priorityLabel: shareText(action.priorityLabel, 30),
          text: shareText(action.text, 400),
        }))
      : [],
  };

  return payload;
}

export function parseShareableAuditPayload(payload) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    throw new Error('Shared audit payload must be an object.');
  }
  if (payload.v !== SHAREABLE_AUDIT_VERSION) {
    throw new Error(`Unsupported shared audit payload version: ${payload.v ?? 'missing'}.`);
  }

  const score = payload.score && typeof payload.score === 'object' ? payload.score : null;
  if (score && !Number.isFinite(score.score)) {
    throw new Error('Shared audit payload score is malformed.');
  }

  const clampCount = (value) => (Number.isFinite(value) && value >= 0 ? Math.round(value) : 0);
  const asArray = (value) => (Array.isArray(value) ? value : []);

  const textScan = payload.textScan && typeof payload.textScan === 'object'
    ? {
        regions: clampCount(payload.textScan.regions),
        belowAA: clampCount(payload.textScan.belowAA),
        cvdHiddenFailures: clampCount(payload.textScan.cvdHiddenFailures),
        apcaFalsePasses: clampCount(payload.textScan.apcaFalsePasses),
        worst: asArray(payload.textScan.worst).filter(
          (region) => region && typeof region === 'object' && Number.isFinite(region.ratio),
        ),
      }
    : null;

  const collisions = payload.collisions && typeof payload.collisions === 'object'
    ? {
        total: clampCount(payload.collisions.total),
        candidatePairs: clampCount(payload.collisions.candidatePairs),
        pairs: asArray(payload.collisions.pairs).filter(
          (pair) => pair && typeof pair === 'object' && pair.colorA && pair.colorB,
        ),
      }
    : null;

  return {
    version: SHAREABLE_AUDIT_VERSION,
    generatedAt: typeof payload.generatedAt === 'string' ? payload.generatedAt : null,
    source: payload.source && typeof payload.source === 'object'
      ? {
          name: typeof payload.source.name === 'string' ? payload.source.name : null,
          width: Number.isFinite(payload.source.width) ? payload.source.width : null,
          height: Number.isFinite(payload.source.height) ? payload.source.height : null,
          downscaled: Boolean(payload.source.downscaled),
        }
      : null,
    score: score
      ? {
          score: Math.max(0, Math.min(100, Math.round(score.score))),
          grade: typeof score.grade === 'string' && score.grade ? score.grade : '?',
          verdictLabel: typeof score.verdictLabel === 'string' ? score.verdictLabel : '',
          axes: asArray(score.axes).filter(
            (axis) => axis && typeof axis === 'object' && typeof axis.label === 'string',
          ),
        }
      : null,
    simulations: asArray(payload.simulations).filter(
      (entry) => entry && typeof entry === 'object' && Number.isFinite(entry.impactPercent),
    ),
    textScan,
    collisions,
    flash: payload.flash && typeof payload.flash === 'object' && payload.flash.riskLevel
      ? {
          label: typeof payload.flash.label === 'string' ? payload.flash.label : '',
          riskLevel: payload.flash.riskLevel,
          riskLabel: typeof payload.flash.riskLabel === 'string' ? payload.flash.riskLabel : '',
          peakFlashesPerSecond: Number.isFinite(payload.flash.peakFlashesPerSecond)
            ? payload.flash.peakFlashesPerSecond
            : null,
          peakViolatingAreaPercent: Number.isFinite(payload.flash.peakViolatingAreaPercent)
            ? payload.flash.peakViolatingAreaPercent
            : null,
        }
      : null,
    contrast: payload.contrast && typeof payload.contrast === 'object' && Number.isFinite(payload.contrast.ratio)
      ? {
          text: typeof payload.contrast.text === 'string' ? payload.contrast.text : null,
          background: typeof payload.contrast.background === 'string' ? payload.contrast.background : null,
          ratio: payload.contrast.ratio,
          passesAA: Boolean(payload.contrast.passesAA),
          passesAAA: Boolean(payload.contrast.passesAAA),
          cvdHiddenFailure: Boolean(payload.contrast.cvdHiddenFailure),
          apcaLc: Number.isFinite(payload.contrast.apcaLc) ? payload.contrast.apcaLc : null,
          apcaFalsePass: Boolean(payload.contrast.apcaFalsePass),
        }
      : null,
    remediation: asArray(payload.remediation).filter(
      (action) => action && typeof action === 'object' && typeof action.text === 'string' && action.text,
    ),
  };
}

export const FOCUS_APPEARANCE_DEFAULTS = Object.freeze({
  // Lab dE below which a per-pixel difference is treated as compression /
  // antialiasing noise rather than a deliberate focus indicator change.
  changeDeltaE: 6,
  // Fewer changed pixels than this means "no visible focus indicator".
  minChangedPixels: 8,
  // WCAG 2.4.13: pixels in the focus indication area need >= 3:1 contrast
  // between the focused and unfocused states.
  changeContrastMin: 3,
  // Analyzed px per CSS px (2 for a 2x retina capture pair).
  cssPixelRatio: 1,
});

export const FOCUS_APPEARANCE_LABELS = Object.freeze({
  none: 'No visible focus indicator detected',
  weak: 'Focus indicator detected but below the WCAG 2.4.13 area/contrast minimums',
  strong: 'Focus indicator meets the WCAG 2.4.13 area and change-contrast minimums',
});

/**
 * WCAG 2.4.7 Focus Visible is normally "requires manual testing" for a pixel
 * auditor: a focus indicator only exists while focus is present, so a single
 * screenshot can never show it. Two screenshots can. Given the SAME view
 * captured without and with keyboard focus, the per-pixel diff IS the focus
 * indicator, and WCAG 2.4.13 Focus Appearance defines exactly how to judge
 * it: the indication area must be at least as large as a 1-CSS-px-thick
 * perimeter of the unfocused component, and its pixels need >= 3:1 contrast
 * between the focused and unfocused states — both directly measurable from
 * the diff. The unfocused component's bounds are approximated by the changed
 * region's bounding box (an indicator drawn around a control encloses it), and
 * that approximation is stated in the returned copy rather than hidden.
 */
export function analyzeFocusIndicator(baseData, focusData, width, height, options = {}) {
  if (!Number.isInteger(width) || !Number.isInteger(height) || width < 1 || height < 1) {
    throw new Error('Focus analysis requires positive integer dimensions.');
  }
  const expected = width * height * 4;
  const isPixelBuffer = (value) =>
    (value instanceof Uint8ClampedArray || value instanceof Uint8Array) && value.length === expected;
  if (!isPixelBuffer(baseData) || !isPixelBuffer(focusData)) {
    throw new Error('Focus analysis requires two RGBA buffers matching width*height*4 — capture both frames at the same size.');
  }

  const config = { ...FOCUS_APPEARANCE_DEFAULTS, ...options };
  if (!Number.isFinite(config.cssPixelRatio) || config.cssPixelRatio <= 0) {
    throw new Error('cssPixelRatio must be a positive number.');
  }

  const mask = new Uint8Array(width * height);
  let changedPixels = 0;
  let contrastingPixels = 0;
  let ratioSum = 0;
  let maxChangeRatio = 1;
  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;
  const focusColorCounts = new Map();
  const baseColorCounts = new Map();

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const i = (y * width + x) * 4;
      const dr = Math.abs(baseData[i] - focusData[i]);
      const dg = Math.abs(baseData[i + 1] - focusData[i + 1]);
      const db = Math.abs(baseData[i + 2] - focusData[i + 2]);
      // Cheap channel pre-filter: a Lab dE >= changeDeltaE always moves at
      // least one sRGB channel by a few counts, so skip the Lab conversion
      // for the overwhelmingly-unchanged majority of pixels.
      if (dr + dg + db < 6) {
        continue;
      }
      const basePx = { r: baseData[i], g: baseData[i + 1], b: baseData[i + 2] };
      const focusPx = { r: focusData[i], g: focusData[i + 1], b: focusData[i + 2] };
      if (labDeltaE(basePx, focusPx) < config.changeDeltaE) {
        continue;
      }
      changedPixels += 1;
      mask[y * width + x] = 1;
      const ratio = contrastRatio(basePx, focusPx);
      ratioSum += ratio;
      if (ratio > maxChangeRatio) {
        maxChangeRatio = ratio;
      }
      if (ratio >= config.changeContrastMin) {
        contrastingPixels += 1;
        mask[y * width + x] = 2;
      }
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
      // Quantize to 32-level buckets so a solid ring dominates its own
      // antialiased edge when picking representative swatches.
      const focusKey = ((focusPx.r >> 3) << 10) | ((focusPx.g >> 3) << 5) | (focusPx.b >> 3);
      const baseKey = ((basePx.r >> 3) << 10) | ((basePx.g >> 3) << 5) | (basePx.b >> 3);
      focusColorCounts.set(focusKey, (focusColorCounts.get(focusKey) || 0) + 1);
      baseColorCounts.set(baseKey, (baseColorCounts.get(baseKey) || 0) + 1);
    }
  }

  const dominantHex = (counts) => {
    let bestKey = null;
    let bestCount = 0;
    counts.forEach((count, key) => {
      if (count > bestCount) {
        bestCount = count;
        bestKey = key;
      }
    });
    if (bestKey === null) {
      return null;
    }
    return rgbToHex({
      r: ((bestKey >> 10) & 31) << 3,
      g: ((bestKey >> 5) & 31) << 3,
      b: (bestKey & 31) << 3,
    });
  };

  const hasIndicator = changedPixels >= config.minChangedPixels;
  const boundingBox = hasIndicator
    ? { x: minX, y: minY, width: maxX - minX + 1, height: maxY - minY + 1 }
    : null;
  const ratioScale = config.cssPixelRatio;
  // WCAG 2.4.13 area minimum: a 1-CSS-px-thick perimeter of the (approximated)
  // unfocused component. Perimeter of a w*h rect at 1px thick = 2w + 2h - 4.
  const boxWidthCss = boundingBox ? boundingBox.width / ratioScale : 0;
  const boxHeightCss = boundingBox ? boundingBox.height / ratioScale : 0;
  const requiredIndicatorArea = boundingBox
    ? Math.max(1, Math.round(2 * boxWidthCss + 2 * boxHeightCss - 4))
    : 0;
  const contrastingAreaCss = contrastingPixels / (ratioScale * ratioScale);
  const changedAreaCss = changedPixels / (ratioScale * ratioScale);

  let verdict = 'none';
  if (hasIndicator) {
    verdict = contrastingAreaCss >= requiredIndicatorArea ? 'strong' : 'weak';
  }

  return {
    width,
    height,
    cssPixelRatio: ratioScale,
    changedPixels,
    contrastingPixels,
    changedAreaCss: Number(changedAreaCss.toFixed(1)),
    contrastingAreaCss: Number(contrastingAreaCss.toFixed(1)),
    requiredIndicatorArea,
    boundingBox,
    meanChangeRatio: changedPixels > 0 ? Number((ratioSum / changedPixels).toFixed(2)) : null,
    maxChangeRatio: changedPixels > 0 ? Number(maxChangeRatio.toFixed(2)) : null,
    indicatorColor: dominantHex(focusColorCounts),
    baseColor: dominantHex(baseColorCounts),
    verdict,
    verdictLabel: FOCUS_APPEARANCE_LABELS[verdict],
    // 2.4.7 only requires a visible indicator; 2.4.13 (AAA) adds the
    // area + change-contrast bar. "weak" = visible but unmeasurably faint or
    // undersized, which honest reporting calls partial support.
    focusVisibleOutcome: verdict === 'none' ? 'fails' : verdict === 'weak' ? 'partial' : 'supports',
    focusAppearanceOutcome: verdict === 'strong' ? 'supports' : 'fails',
    changeContrastMin: config.changeContrastMin,
    mask,
  };
}

export const FOCUS_SEQUENCE_DEFAULTS = Object.freeze({
  // A frame's indicator matches an existing stop when the overlap of the two
  // bounding boxes covers at least this fraction of the smaller box.
  sameStopOverlap: 0.4,
  // A changed-region bounding box covering more than this fraction of the
  // frame means the view itself changed (scroll, navigation, dialog) — that
  // frame cannot honestly be read as a focus movement and is set aside.
  maxStopCoverage: 0.5,
  // Hard cap on distinct stops so a pathological recording stays bounded.
  maxStops: 24,
});

export const FOCUS_SEQUENCE_LABELS = Object.freeze({
  none: 'No localizable focus indicator anywhere in the recording',
  weak: 'Focus order mapped, but at least one stop falls below the WCAG 2.4.13 bar',
  strong: 'Every mapped focus stop meets the WCAG 2.4.13 area and change-contrast minimums',
});

function boxOverlapFraction(a, b) {
  const x0 = Math.max(a.x, b.x);
  const y0 = Math.max(a.y, b.y);
  const x1 = Math.min(a.x + a.width, b.x + b.width);
  const y1 = Math.min(a.y + a.height, b.y + b.height);
  if (x1 <= x0 || y1 <= y0) {
    return 0;
  }
  return ((x1 - x0) * (y1 - y0)) / Math.min(a.width * a.height, b.width * b.height);
}

function focusStopFromAnalysis(analysis, order, frameIndex) {
  const box = analysis.boundingBox;
  return {
    order,
    frameIndex,
    verdict: analysis.verdict,
    verdictLabel: analysis.verdictLabel,
    boundingBox: { ...box },
    center: { x: Math.round(box.x + box.width / 2), y: Math.round(box.y + box.height / 2) },
    changedPixels: analysis.changedPixels,
    contrastingPixels: analysis.contrastingPixels,
    changedAreaCss: analysis.changedAreaCss,
    contrastingAreaCss: analysis.contrastingAreaCss,
    requiredIndicatorArea: analysis.requiredIndicatorArea,
    meanChangeRatio: analysis.meanChangeRatio,
    maxChangeRatio: analysis.maxChangeRatio,
    indicatorColor: analysis.indicatorColor,
    baseColor: analysis.baseColor,
    focusVisibleOutcome: analysis.focusVisibleOutcome,
    focusAppearanceOutcome: analysis.focusAppearanceOutcome,
  };
}

/**
 * Focus ORDER mapping: the two-frame check proves one focus state; a short
 * tab-through recording proves the whole keyboard journey. Every sampled frame
 * is diffed against the first (unfocused) frame, so each frame's changed
 * region is exactly the indicator of wherever focus sits at that moment —
 * provided the view itself stays still, which is why oversized diffs are set
 * aside as `view-changed` instead of being misread as focus. Consecutive
 * samples of the same stop keep the best-measured capture (a mid-transition
 * frame under-measures its own ring), and returns to an earlier stop are
 * counted as revisits rather than duplicated. The tracker is a fold: feed it
 * one decoded frame at a time and no more than the baseline stays in memory.
 */
export function createFocusSequenceTracker(width, height, options = {}) {
  if (!Number.isInteger(width) || !Number.isInteger(height) || width < 1 || height < 1) {
    throw new Error('Focus sequence analysis requires positive integer dimensions.');
  }
  const config = { ...FOCUS_APPEARANCE_DEFAULTS, ...FOCUS_SEQUENCE_DEFAULTS, ...options };
  if (!Number.isFinite(config.sameStopOverlap) || config.sameStopOverlap <= 0 || config.sameStopOverlap > 1) {
    throw new Error('sameStopOverlap must be a fraction in (0, 1].');
  }
  if (!Number.isFinite(config.maxStopCoverage) || config.maxStopCoverage <= 0 || config.maxStopCoverage > 1) {
    throw new Error('maxStopCoverage must be a fraction in (0, 1].');
  }
  if (!Number.isInteger(config.maxStops) || config.maxStops < 1) {
    throw new Error('maxStops must be a positive integer.');
  }
  return {
    width,
    height,
    config,
    baseline: null,
    stops: [],
    framesAnalyzed: 0,
    noIndicatorFrames: 0,
    duplicateFrames: 0,
    revisitFrames: 0,
    viewChangedFrames: 0,
    overflowFrames: 0,
  };
}

export function trackFocusSequenceFrame(tracker, frameData) {
  if (!tracker || !Array.isArray(tracker.stops) || !tracker.config) {
    throw new Error('trackFocusSequenceFrame requires a tracker from createFocusSequenceTracker.');
  }
  const { width, height, config } = tracker;
  const expected = width * height * 4;
  if (
    !(frameData instanceof Uint8ClampedArray || frameData instanceof Uint8Array) ||
    frameData.length !== expected
  ) {
    throw new Error('Each focus sequence frame must be an RGBA buffer matching width*height*4.');
  }

  if (!tracker.baseline) {
    // Copy: video decoders routinely reuse the same backing buffer per frame.
    tracker.baseline = new Uint8ClampedArray(frameData);
    return { classification: 'baseline', stopOrder: null };
  }

  tracker.framesAnalyzed += 1;
  const frameIndex = tracker.framesAnalyzed;
  const analysis = analyzeFocusIndicator(tracker.baseline, frameData, width, height, {
    changeDeltaE: config.changeDeltaE,
    minChangedPixels: config.minChangedPixels,
    changeContrastMin: config.changeContrastMin,
    cssPixelRatio: config.cssPixelRatio,
  });

  if (analysis.verdict === 'none') {
    tracker.noIndicatorFrames += 1;
    return { classification: 'no-indicator', stopOrder: null };
  }

  const box = analysis.boundingBox;
  if ((box.width * box.height) / (width * height) > config.maxStopCoverage) {
    tracker.viewChangedFrames += 1;
    return { classification: 'view-changed', stopOrder: null };
  }

  const matchIndex = tracker.stops.findIndex(
    (stop) => boxOverlapFraction(stop.boundingBox, box) >= config.sameStopOverlap,
  );

  if (matchIndex >= 0 && matchIndex === tracker.stops.length - 1) {
    tracker.duplicateFrames += 1;
    const stop = tracker.stops[matchIndex];
    if (
      analysis.contrastingAreaCss > stop.contrastingAreaCss ||
      (analysis.contrastingAreaCss === stop.contrastingAreaCss && analysis.changedPixels > stop.changedPixels)
    ) {
      const samples = stop.samples;
      Object.assign(stop, focusStopFromAnalysis(analysis, stop.order, stop.frameIndex));
      stop.samples = samples;
    }
    stop.samples += 1;
    return { classification: 'same-stop', stopOrder: stop.order };
  }

  if (matchIndex >= 0) {
    tracker.revisitFrames += 1;
    return { classification: 'revisit', stopOrder: tracker.stops[matchIndex].order };
  }

  if (tracker.stops.length >= config.maxStops) {
    tracker.overflowFrames += 1;
    return { classification: 'overflow', stopOrder: null };
  }

  const stop = focusStopFromAnalysis(analysis, tracker.stops.length + 1, frameIndex);
  stop.samples = 1;
  tracker.stops.push(stop);
  return { classification: 'new-stop', stopOrder: stop.order };
}

export function summarizeFocusSequence(tracker) {
  if (!tracker || !Array.isArray(tracker.stops) || !tracker.config) {
    throw new Error('summarizeFocusSequence requires a tracker from createFocusSequenceTracker.');
  }
  const stops = tracker.stops.map((stop) => ({
    ...stop,
    boundingBox: { ...stop.boundingBox },
    center: { ...stop.center },
  }));
  const strong = stops.filter((stop) => stop.verdict === 'strong').length;
  const weak = stops.length - strong;
  const aggregateVerdict = stops.length === 0 ? 'none' : weak > 0 ? 'weak' : 'strong';
  let worstStopOrder = null;
  if (stops.length) {
    const worst = stops.reduce((best, stop) => {
      const margin = stop.contrastingAreaCss / Math.max(1, stop.requiredIndicatorArea);
      return !best || margin < best.margin ? { stop, margin } : best;
    }, null);
    worstStopOrder = worst.stop.order;
  }
  return {
    width: tracker.width,
    height: tracker.height,
    cssPixelRatio: tracker.config.cssPixelRatio,
    stops,
    summary: {
      framesAnalyzed: tracker.framesAnalyzed,
      stops: stops.length,
      strong,
      weak,
      noIndicatorFrames: tracker.noIndicatorFrames,
      duplicateFrames: tracker.duplicateFrames,
      revisitFrames: tracker.revisitFrames,
      viewChangedFrames: tracker.viewChangedFrames,
      overflowFrames: tracker.overflowFrames,
    },
    aggregateVerdict,
    aggregateLabel: FOCUS_SEQUENCE_LABELS[aggregateVerdict],
    worstStopOrder,
  };
}

export function analyzeFocusSequence(frames, width, height, options = {}) {
  if (!Array.isArray(frames) || frames.length < 2) {
    throw new Error('Focus sequence analysis needs at least 2 frames — an unfocused baseline plus one focused sample.');
  }
  const tracker = createFocusSequenceTracker(width, height, options);
  const classifications = frames.map((frame) => trackFocusSequenceFrame(tracker, frame).classification);
  const result = summarizeFocusSequence(tracker);
  result.classifications = classifications;
  return result;
}

export const CONFORMANCE_OUTCOME_LABELS = Object.freeze({
  supports: 'Supports',
  partial: 'Partially Supports',
  fails: 'Does Not Support',
  'not-evaluated': 'Not Evaluated',
});

export const CONFORMANCE_ADVISORY_LABELS = Object.freeze({
  supports: 'No risk detected',
  fails: 'Risk detected',
  'not-evaluated': 'Not Evaluated',
});

export const CONFORMANCE_MANUAL_CRITERIA = Object.freeze([
  Object.freeze({ id: '1.1.1', name: 'Non-text Content', level: 'A', reason: 'Alt text lives in markup, not pixels.' }),
  Object.freeze({ id: '1.3.1', name: 'Info and Relationships', level: 'A', reason: 'Requires semantic structure (headings, lists, tables) in the DOM.' }),
  Object.freeze({ id: '1.4.4', name: 'Resize Text', level: 'AA', reason: 'Requires reflow testing at 200% zoom in a live browser.' }),
  Object.freeze({ id: '2.1.1', name: 'Keyboard', level: 'A', reason: 'Requires interactive keyboard operation of the running app.' }),
  Object.freeze({ id: '2.4.7', name: 'Focus Visible', level: 'AA', reason: 'Focus indicators only exist while focus is present; a static screenshot cannot show them.' }),
  Object.freeze({ id: '4.1.2', name: 'Name, Role, Value', level: 'A', reason: 'Accessible names and roles are exposed via the accessibility tree, not pixels.' }),
]);

function formatRatioValue(ratio) {
  return Number.isFinite(ratio) ? `${Number(ratio.toFixed(2))}:1` : 'unknown';
}

export function buildWcagConformanceSummary(report) {
  if (!report || typeof report !== 'object' || Array.isArray(report)) {
    throw new Error('buildWcagConformanceSummary requires an accessibility report object.');
  }

  const textScan = report.textScan && typeof report.textScan === 'object' ? report.textScan : null;
  const textSummary = textScan?.summary && typeof textScan.summary === 'object' ? textScan.summary : null;
  const textRegions = Array.isArray(textScan?.regions) ? textScan.regions : [];
  const collisions =
    report.paletteCollisions && typeof report.paletteCollisions === 'object' ? report.paletteCollisions : null;
  const componentScan =
    report.componentContrast && typeof report.componentContrast === 'object' ? report.componentContrast : null;
  const componentSummary =
    componentScan?.summary && typeof componentScan.summary === 'object' ? componentScan.summary : null;
  const targetScan = report.targetSizes && typeof report.targetSizes === 'object' ? report.targetSizes : null;
  const targetSummary = targetScan?.summary && typeof targetScan.summary === 'object' ? targetScan.summary : null;
  const flashScan = report.flashScan && typeof report.flashScan === 'object' ? report.flashScan : null;
  const focusCheck =
    report.focusCheck && typeof report.focusCheck === 'object' && typeof report.focusCheck.verdict === 'string'
      ? report.focusCheck
      : null;
  const focusSequence =
    report.focusSequence &&
    typeof report.focusSequence === 'object' &&
    typeof report.focusSequence.aggregateVerdict === 'string' &&
    report.focusSequence.summary &&
    typeof report.focusSequence.summary === 'object' &&
    Number.isFinite(report.focusSequence.summary.framesAnalyzed) &&
    report.focusSequence.summary.framesAnalyzed >= 1
      ? report.focusSequence
      : null;

  const criteria = [];

  const collisionSummary = collisions?.summary && typeof collisions.summary === 'object' ? collisions.summary : null;
  if (!collisionSummary || !Number.isFinite(collisionSummary.candidatePairs)) {
    criteria.push({
      id: '1.4.1',
      name: 'Use of Color',
      level: 'A',
      outcome: 'not-evaluated',
      evidence: 'Palette collision scan has not run — render simulations to project the dominant palette through all color-vision modes.',
    });
  } else if ((collisionSummary.collisions || 0) === 0) {
    criteria.push({
      id: '1.4.1',
      name: 'Use of Color',
      level: 'A',
      outcome: 'supports',
      evidence: `No color-only distinction collapse detected: ${collisionSummary.candidatePairs} clearly distinct palette pairs stayed distinguishable across ${collisionSummary.evaluatedModes || 7} color-vision projections.`,
    });
  } else {
    const worstPair = Array.isArray(collisions.pairs) ? collisions.pairs[0] : null;
    criteria.push({
      id: '1.4.1',
      name: 'Use of Color',
      level: 'A',
      outcome: 'fails',
      evidence: `${collisionSummary.collisions} palette pair${collisionSummary.collisions === 1 ? '' : 's'} that encode different meanings become near-identical under color-vision deficiency${worstPair ? ` — worst: ${worstPair.colorA} vs ${worstPair.colorB} collapses from dE ${worstPair.baseDeltaE} to ${worstPair.worstDeltaE} under ${worstPair.worstModeLabel}` : ''}. Add a second cue (icon, label, or pattern).`,
    });
  }

  if (!textSummary || !Number.isFinite(textSummary.total) || textSummary.total < 1) {
    const noTextEvidence =
      'Automatic text contrast scan found no measurable text-like regions — run the scan on a screenshot containing text.';
    criteria.push({ id: '1.4.3', name: 'Contrast (Minimum)', level: 'AA', outcome: 'not-evaluated', evidence: noTextEvidence });
    criteria.push({ id: '1.4.6', name: 'Contrast (Enhanced)', level: 'AAA', outcome: 'not-evaluated', evidence: noTextEvidence });
  } else {
    const worstRegion = textRegions[0] || null;
    if ((textSummary.belowAA || 0) === 0) {
      criteria.push({
        id: '1.4.3',
        name: 'Contrast (Minimum)',
        level: 'AA',
        outcome: 'supports',
        evidence: `All ${textSummary.total} detected text regions meet the 4.5:1 AA minimum${worstRegion ? ` (worst measured ${formatRatioValue(worstRegion.ratio)})` : ''}.`,
      });
    } else {
      criteria.push({
        id: '1.4.3',
        name: 'Contrast (Minimum)',
        level: 'AA',
        outcome: 'fails',
        evidence: `${textSummary.belowAA} of ${textSummary.total} detected text regions fall below AA${worstRegion ? ` — worst ${formatRatioValue(worstRegion.ratio)} (${worstRegion.text} on ${worstRegion.background} near (${worstRegion.x}, ${worstRegion.y}))` : ''}.`,
      });
    }
    const belowAAA = textSummary.total - (textSummary.aaa || 0);
    if (belowAAA === 0) {
      criteria.push({
        id: '1.4.6',
        name: 'Contrast (Enhanced)',
        level: 'AAA',
        outcome: 'supports',
        evidence: `All ${textSummary.total} detected text regions meet the 7:1 AAA threshold.`,
      });
    } else {
      criteria.push({
        id: '1.4.6',
        name: 'Contrast (Enhanced)',
        level: 'AAA',
        outcome: 'fails',
        evidence: `${belowAAA} of ${textSummary.total} detected text regions fall below the 7:1 AAA threshold. AAA is aspirational — AA (1.4.3) is the usual conformance target.`,
      });
    }
  }

  if (!componentSummary || !Number.isFinite(componentSummary.evaluated) || componentSummary.evaluated < 1) {
    criteria.push({
      id: '1.4.11',
      name: 'Non-text Contrast',
      level: 'AA',
      outcome: 'not-evaluated',
      evidence: 'No UI component surfaces could be resolved against an adjacent page color in this screenshot.',
    });
  } else if ((componentSummary.failing || 0) === 0) {
    criteria.push({
      id: '1.4.11',
      name: 'Non-text Contrast',
      level: 'AA',
      outcome: 'supports',
      evidence: `All ${componentSummary.evaluated} resolved component surfaces meet the 3:1 non-text minimum against their surroundings.`,
    });
  } else {
    const worstComponent = Array.isArray(componentScan.findings) ? componentScan.findings[0] : null;
    criteria.push({
      id: '1.4.11',
      name: 'Non-text Contrast',
      level: 'AA',
      outcome: 'fails',
      evidence: `${componentSummary.failing} of ${componentSummary.evaluated} component surfaces fall below 3:1 against the adjacent page${worstComponent ? ` — worst ${formatRatioValue(worstComponent.ratio)} (${worstComponent.surface} vs ${worstComponent.surrounding})` : ''}. Users may not see where these controls begin.`,
    });
  }

  if (!flashScan || typeof flashScan.riskLevel !== 'string') {
    criteria.push({
      id: '2.3.1',
      name: 'Three Flashes or Below Threshold',
      level: 'A',
      outcome: 'not-evaluated',
      evidence: 'Static screenshot only — run the animation & video flash scan on motion content (GIF/APNG/WebM/MP4 or a recorded walkthrough) to evaluate.',
    });
  } else if (flashScan.riskLevel === 'high') {
    criteria.push({
      id: '2.3.1',
      name: 'Three Flashes or Below Threshold',
      level: 'A',
      outcome: 'fails',
      evidence: `"${flashScan.label}" peaks at ${flashScan.peakFlashesPerSecond} flashes/sec across ${flashScan.peakViolatingAreaPercent}% of the frame (limits: 3/sec over >=25% of the frame)${flashScan.totalRedFlashEvents > 0 ? `, including ${flashScan.totalRedFlashEvents} saturated-red flash events` : ''}.`,
    });
  } else if (flashScan.riskLevel === 'caution') {
    criteria.push({
      id: '2.3.1',
      name: 'Three Flashes or Below Threshold',
      level: 'A',
      outcome: 'partial',
      evidence: `"${flashScan.label}" flashes at or near the 3-per-second limit over a small area (peak ${flashScan.peakFlashesPerSecond}/sec) — below the area threshold, but reduce the cycle or luminance swing before shipping.`,
    });
  } else {
    criteria.push({
      id: '2.3.1',
      name: 'Three Flashes or Below Threshold',
      level: 'A',
      outcome: 'supports',
      evidence: `"${flashScan.label}" stays below the general and saturated-red flash thresholds across ${flashScan.frameCount} analyzed frames.`,
    });
  }

  // 2.4.7 / 2.4.13 only appear when focus was actually measured — from a
  // two-frame pair, a tab-through sequence, or both; without either they
  // honestly stay in the manual-testing list. When both exist, the WORSE
  // verdict drives the rows: passing one focused control does not excuse a
  // faint indicator elsewhere in the tab order.
  const focusVerdictSeverity = { strong: 0, weak: 1, none: 2 };
  const sequenceVerdict = focusSequence ? focusSequence.aggregateVerdict : null;
  const pairVerdict = focusCheck ? focusCheck.verdict : null;
  const sequenceDrivesFocusRows =
    sequenceVerdict !== null &&
    (pairVerdict === null ||
      (focusVerdictSeverity[sequenceVerdict] ?? 0) >= (focusVerdictSeverity[pairVerdict] ?? 0));

  if (sequenceDrivesFocusRows) {
    const seqSummary = focusSequence.summary;
    const stops = Array.isArray(focusSequence.stops) ? focusSequence.stops : [];
    const worstStop =
      stops.find((stop) => stop && stop.order === focusSequence.worstStopOrder) || stops[0] || null;
    if (sequenceVerdict === 'none') {
      criteria.push({
        id: '2.4.7',
        name: 'Focus Visible',
        level: 'AA',
        outcome: 'fails',
        evidence: `A tab-through recording (${seqSummary.framesAnalyzed || 0} analyzed frames) produced no localizable focus indicator against the unfocused baseline — keyboard users cannot see where focus is.`,
      });
      criteria.push({
        id: '2.4.13',
        name: 'Focus Appearance',
        level: 'AAA',
        outcome: 'fails',
        evidence: 'No focus indication area could be measured at any point in the recording.',
      });
    } else if (sequenceVerdict === 'weak') {
      criteria.push({
        id: '2.4.7',
        name: 'Focus Visible',
        level: 'AA',
        outcome: 'partial',
        evidence: `${seqSummary.weak || 0} of ${seqSummary.stops || 0} focus stops mapped across the tab-through recording fall below the 3:1 change-contrast/area bar${worstStop ? ` — worst stop #${worstStop.order} changes ${worstStop.changedPixels} px but only ${worstStop.contrastingPixels} reach 3:1` : ''} — those indicators may be too faint to notice.`,
      });
      criteria.push({
        id: '2.4.13',
        name: 'Focus Appearance',
        level: 'AAA',
        outcome: 'fails',
        evidence: `Focus indication falls short of WCAG 2.4.13 at ${seqSummary.weak || 0} of ${seqSummary.stops || 0} mapped stops${worstStop ? ` — worst stop #${worstStop.order}: contrasting area ${worstStop.contrastingAreaCss} CSS px² vs the ${worstStop.requiredIndicatorArea} px² one-pixel-perimeter minimum` : ''} (component bounds approximated per stop by the indicator's bounding box).`,
      });
    } else {
      criteria.push({
        id: '2.4.7',
        name: 'Focus Visible',
        level: 'AA',
        outcome: 'supports',
        evidence: `All ${seqSummary.stops || 0} focus stops mapped across the tab-through recording show a clearly visible indicator (${seqSummary.framesAnalyzed || 0} frames analyzed).`,
      });
      criteria.push({
        id: '2.4.13',
        name: 'Focus Appearance',
        level: 'AAA',
        outcome: 'supports',
        evidence: `Every mapped focus stop meets the WCAG 2.4.13 area and 3:1 change-contrast minimums (component bounds approximated per stop by the indicator's bounding box).`,
      });
    }
  } else if (focusCheck) {
    const areaEvidence = `contrasting area ${focusCheck.contrastingAreaCss ?? 0} CSS px² vs the ${focusCheck.requiredIndicatorArea ?? 0} px² one-pixel-perimeter minimum (component bounds approximated by the indicator's bounding box)`;
    if (focusCheck.verdict === 'none') {
      const noneEvidence = `Diffing the unfocused vs focused frames changed ${focusCheck.changedPixels ?? 0} pixel${(focusCheck.changedPixels ?? 0) === 1 ? '' : 's'} — no visible focus indicator exists, so keyboard users cannot see where focus is.`;
      criteria.push({ id: '2.4.7', name: 'Focus Visible', level: 'AA', outcome: 'fails', evidence: noneEvidence });
      criteria.push({ id: '2.4.13', name: 'Focus Appearance', level: 'AAA', outcome: 'fails', evidence: 'No focus indication area was detected between the two captured frames.' });
    } else if (focusCheck.verdict === 'weak') {
      criteria.push({
        id: '2.4.7',
        name: 'Focus Visible',
        level: 'AA',
        outcome: 'partial',
        evidence: `A focus indicator changes ${focusCheck.changedPixels} pixels, but only ${focusCheck.contrastingPixels} reach the 3:1 change contrast (mean ${focusCheck.meanChangeRatio ?? '?'}:1) — it may be too faint to notice.`,
      });
      criteria.push({
        id: '2.4.13',
        name: 'Focus Appearance',
        level: 'AAA',
        outcome: 'fails',
        evidence: `Focus indication falls short of WCAG 2.4.13: ${areaEvidence}.`,
      });
    } else {
      criteria.push({
        id: '2.4.7',
        name: 'Focus Visible',
        level: 'AA',
        outcome: 'supports',
        evidence: `A clearly visible focus indicator was measured from the two-frame diff: ${focusCheck.changedPixels} changed pixels, max change contrast ${focusCheck.maxChangeRatio ?? '?'}:1.`,
      });
      criteria.push({
        id: '2.4.13',
        name: 'Focus Appearance',
        level: 'AAA',
        outcome: 'supports',
        evidence: `Focus indication meets the WCAG 2.4.13 metrics: ${areaEvidence}, with ${focusCheck.contrastingPixels} pixels at or above 3:1 change contrast.`,
      });
    }
  }

  if (!targetSummary || !Number.isFinite(targetSummary.targets) || targetSummary.targets < 1) {
    criteria.push({
      id: '2.5.8',
      name: 'Target Size (Minimum)',
      level: 'AA',
      outcome: 'not-evaluated',
      evidence: 'No measurable tap targets could be resolved from this screenshot.',
    });
  } else if ((targetSummary.undersized || 0) === 0) {
    const exemptNote = targetSummary.spacingExempt
      ? ` (${targetSummary.spacingExempt} undersized but spacing-exempt with a clear ${targetSummary.minTargetCss}px circle)`
      : '';
    criteria.push({
      id: '2.5.8',
      name: 'Target Size (Minimum)',
      level: 'AA',
      outcome: 'supports',
      evidence: `All ${targetSummary.targets} measured targets are at least ${targetSummary.minTargetCss}x${targetSummary.minTargetCss} CSS px or covered by the spacing exception${exemptNote}.`,
    });
  } else {
    const worstTarget = targetSummary.worst;
    criteria.push({
      id: '2.5.8',
      name: 'Target Size (Minimum)',
      level: 'AA',
      outcome: 'fails',
      evidence: `${targetSummary.undersized} of ${targetSummary.targets} targets measure below ${targetSummary.minTargetCss}x${targetSummary.minTargetCss} CSS px with a neighboring target inside the clearance circle, so the spacing exception cannot apply${worstTarget ? ` — smallest ${worstTarget.widthCss}x${worstTarget.heightCss} px` : ''}. Requires a layout change, not a recolor.`,
    });
  }

  const advisories = [];
  if (!textSummary) {
    advisories.push({
      id: 'cvd-contrast',
      name: 'Color-vision projected contrast',
      outcome: 'not-evaluated',
      evidence: 'Run the automatic text scan to project every detected pair through all 7 CVD matrices.',
    });
    advisories.push({
      id: 'apca',
      name: 'APCA perceptual contrast (WCAG 3 draft)',
      outcome: 'not-evaluated',
      evidence: 'Run the automatic text scan to score every detected pair with APCA.',
    });
  } else {
    const hidden = textSummary.cvdHiddenFailures || 0;
    advisories.push({
      id: 'cvd-contrast',
      name: 'Color-vision projected contrast',
      outcome: hidden > 0 ? 'fails' : 'supports',
      evidence:
        hidden > 0
          ? `${hidden} text region${hidden === 1 ? '' : 's'} pass WCAG 2 AA for typical vision but drop below 4.5:1 under at least one color-vision deficiency (hidden failures).`
          : `No detected text pair loses AA contrast under any of the 7 color-vision projections.`,
    });
    const falsePasses = textSummary.apcaFalsePasses || 0;
    advisories.push({
      id: 'apca',
      name: 'APCA perceptual contrast (WCAG 3 draft)',
      outcome: falsePasses > 0 ? 'fails' : 'supports',
      evidence:
        falsePasses > 0
          ? `${falsePasses} text region${falsePasses === 1 ? '' : 's'} pass WCAG 2 ratios but score below the APCA Lc 60 fluent-text minimum (perceptual false passes).`
          : 'No detected text pair passes WCAG 2 while scoring below the APCA fluent-text minimum.',
    });
  }

  const counts = { supports: 0, partial: 0, fails: 0, notEvaluated: 0 };
  criteria.forEach((criterion) => {
    if (criterion.outcome === 'supports') counts.supports += 1;
    else if (criterion.outcome === 'partial') counts.partial += 1;
    else if (criterion.outcome === 'fails') counts.fails += 1;
    else counts.notEvaluated += 1;
  });

  let verdict = 'not-evaluated';
  if (counts.fails > 0) verdict = 'fails';
  else if (counts.partial > 0) verdict = 'partial';
  else if (counts.supports > 0) verdict = 'supports';

  const score =
    report.accessibilityScore && Number.isFinite(report.accessibilityScore.score)
      ? { score: report.accessibilityScore.score, grade: report.accessibilityScore.grade || null }
      : null;

  // A measured focus pair or tab-through sequence moves 2.4.7 out of the
  // manual-testing list; every other manual criterion still genuinely needs
  // the DOM or interaction.
  const manualCriteria =
    focusCheck || focusSequence
      ? CONFORMANCE_MANUAL_CRITERIA.filter((criterion) => criterion.id !== '2.4.7')
      : CONFORMANCE_MANUAL_CRITERIA;

  return { criteria, advisories, counts, verdict, score, manualCriteria };
}

function escapeMarkdownTableCell(value) {
  return String(value ?? '').replace(/\|/g, '\\|').replace(/\r?\n/g, ' ');
}

export function buildConformanceStatementMarkdown(report, options = {}) {
  const summary = buildWcagConformanceSummary(report);
  const sourceName =
    typeof options.sourceName === 'string' && options.sourceName
      ? options.sourceName
      : report?.source?.fileName || 'Untitled source image';
  const generatedAt =
    typeof options.generatedAt === 'string' && options.generatedAt ? options.generatedAt : report?.generatedAt || null;

  const lines = [];
  lines.push(`# WCAG conformance summary — ${sourceName}`);
  lines.push('');
  lines.push('Produced by ClearSight, an automated pixel-level accessibility auditor. Everything below was measured locally from the audited screenshot (plus any motion scan) — no server, no upload.');
  lines.push('');
  if (generatedAt) {
    lines.push(`- Generated: ${generatedAt}`);
  }
  if (summary.score) {
    lines.push(`- ClearSight Score: ${summary.score.score}/100${summary.score.grade ? ` (Grade ${summary.score.grade})` : ''}`);
  }
  lines.push(
    `- Machine-checked criteria: ${summary.counts.supports} supports · ${summary.counts.partial} partially supports · ${summary.counts.fails} does not support · ${summary.counts.notEvaluated} not evaluated`,
  );
  lines.push('');
  lines.push('## Honest scope');
  lines.push('');
  lines.push('This summary covers only WCAG success criteria that are machine-checkable from pixels. "Supports" means **no failures were detected by automated analysis of this screenshot** — it is evidence for a conformance review, not a legal conformance claim. Criteria that require the DOM, semantics, or interaction are listed under "Requires manual testing" and MUST be verified separately.');
  lines.push('');
  lines.push('## WCAG 2.2 criteria (machine-checked)');
  lines.push('');
  lines.push('| Criterion | Level | Outcome | Evidence |');
  lines.push('| --- | --- | --- | --- |');
  summary.criteria.forEach((criterion) => {
    lines.push(
      `| ${criterion.id} ${escapeMarkdownTableCell(criterion.name)} | ${criterion.level} | ${CONFORMANCE_OUTCOME_LABELS[criterion.outcome] || criterion.outcome} | ${escapeMarkdownTableCell(criterion.evidence)} |`,
    );
  });
  lines.push('');
  lines.push('## Advisory lenses (beyond WCAG 2.2)');
  lines.push('');
  lines.push('| Lens | Outcome | Evidence |');
  lines.push('| --- | --- | --- |');
  summary.advisories.forEach((advisory) => {
    lines.push(
      `| ${escapeMarkdownTableCell(advisory.name)} | ${CONFORMANCE_ADVISORY_LABELS[advisory.outcome] || advisory.outcome} | ${escapeMarkdownTableCell(advisory.evidence)} |`,
    );
  });
  lines.push('');
  lines.push('## Requires manual testing (out of scope for pixel analysis)');
  lines.push('');
  (summary.manualCriteria || CONFORMANCE_MANUAL_CRITERIA).forEach((criterion) => {
    lines.push(`- ${criterion.id} ${criterion.name} (Level ${criterion.level}) — ${criterion.reason}`);
  });
  lines.push('');
  return lines.join('\n');
}

export const QR_ENCODE_DEFAULTS = Object.freeze({
  ecLevelPreference: Object.freeze(['M', 'L']),
  minVersion: 1,
  maxVersion: 40,
  quietZone: 4,
});

const QR_EC_LEVEL_BITS = { L: 0b01, M: 0b00 };

// Per version 1..40: [ecCodewordsPerBlock, group1Blocks, group1DataCodewords, group2Blocks, group2DataCodewords]
// (ISO/IEC 18004 table 9; only the L and M rows this encoder supports).
const QR_BLOCK_TABLE = {
  L: [
    [7, 1, 19, 0, 0], [10, 1, 34, 0, 0], [15, 1, 55, 0, 0], [20, 1, 80, 0, 0], [26, 1, 108, 0, 0],
    [18, 2, 68, 0, 0], [20, 2, 78, 0, 0], [24, 2, 97, 0, 0], [30, 2, 116, 0, 0], [18, 2, 68, 2, 69],
    [20, 4, 81, 0, 0], [24, 2, 92, 2, 93], [26, 4, 107, 0, 0], [30, 3, 115, 1, 116], [22, 5, 87, 1, 88],
    [24, 5, 98, 1, 99], [28, 1, 107, 5, 108], [30, 5, 120, 1, 121], [28, 3, 113, 4, 114], [28, 3, 107, 5, 108],
    [28, 4, 116, 4, 117], [28, 2, 111, 7, 112], [30, 4, 121, 5, 122], [30, 6, 117, 4, 118], [26, 8, 106, 4, 107],
    [28, 10, 114, 2, 115], [30, 8, 122, 4, 123], [30, 3, 117, 10, 118], [30, 7, 116, 7, 117], [30, 5, 115, 10, 116],
    [30, 13, 115, 3, 116], [30, 17, 115, 0, 0], [30, 17, 115, 1, 116], [30, 13, 115, 6, 116], [30, 12, 121, 7, 122],
    [30, 6, 121, 14, 122], [30, 17, 122, 4, 123], [30, 4, 122, 18, 123], [30, 20, 117, 4, 118], [30, 19, 118, 6, 119],
  ],
  M: [
    [10, 1, 16, 0, 0], [16, 1, 28, 0, 0], [26, 1, 44, 0, 0], [18, 2, 32, 0, 0], [24, 2, 43, 0, 0],
    [16, 4, 27, 0, 0], [18, 4, 31, 0, 0], [22, 2, 38, 2, 39], [22, 3, 36, 2, 37], [26, 4, 43, 1, 44],
    [30, 1, 50, 4, 51], [22, 6, 36, 2, 37], [22, 8, 37, 1, 38], [24, 4, 40, 5, 41], [24, 5, 41, 5, 42],
    [28, 7, 45, 3, 46], [28, 10, 46, 1, 47], [26, 9, 43, 4, 44], [26, 3, 44, 11, 45], [26, 3, 41, 13, 42],
    [26, 17, 42, 0, 0], [28, 17, 46, 0, 0], [28, 4, 47, 14, 48], [28, 6, 45, 14, 46], [28, 8, 47, 13, 48],
    [28, 19, 46, 4, 47], [28, 22, 45, 3, 46], [28, 3, 45, 23, 46], [28, 21, 45, 7, 46], [28, 19, 47, 10, 48],
    [28, 2, 46, 29, 47], [28, 10, 46, 23, 47], [28, 14, 46, 21, 47], [28, 14, 46, 23, 47], [28, 12, 47, 26, 48],
    [28, 6, 47, 34, 48], [28, 29, 46, 14, 47], [28, 13, 46, 32, 47], [28, 40, 47, 7, 48], [28, 18, 47, 31, 48],
  ],
};

// Alignment pattern center coordinates per version 1..40 (ISO/IEC 18004 annex E).
const QR_ALIGNMENT_POSITIONS = [
  [], [6, 18], [6, 22], [6, 26], [6, 30], [6, 34], [6, 22, 38], [6, 24, 42], [6, 26, 46], [6, 28, 50],
  [6, 30, 54], [6, 32, 58], [6, 34, 62], [6, 26, 46, 66], [6, 26, 48, 70], [6, 26, 50, 74], [6, 30, 54, 78],
  [6, 30, 56, 82], [6, 30, 58, 86], [6, 34, 62, 90], [6, 28, 50, 72, 94], [6, 26, 50, 74, 98], [6, 30, 54, 78, 102],
  [6, 28, 54, 80, 106], [6, 32, 58, 84, 110], [6, 30, 58, 86, 114], [6, 34, 62, 90, 118], [6, 26, 50, 74, 98, 122],
  [6, 30, 54, 78, 102, 126], [6, 26, 52, 78, 104, 130], [6, 30, 56, 82, 108, 134], [6, 34, 60, 86, 112, 138],
  [6, 30, 58, 86, 114, 142], [6, 34, 62, 90, 118, 146], [6, 30, 54, 78, 102, 126, 150], [6, 24, 50, 76, 102, 128, 154],
  [6, 28, 54, 80, 106, 132, 158], [6, 32, 58, 84, 110, 136, 162], [6, 26, 54, 82, 110, 138, 166], [6, 30, 58, 86, 114, 142, 170],
];

let QR_GALOIS = null;

function qrGaloisTables() {
  if (QR_GALOIS) {
    return QR_GALOIS;
  }
  const exp = new Uint8Array(512);
  const log = new Uint8Array(256);
  let value = 1;
  for (let i = 0; i < 255; i += 1) {
    exp[i] = value;
    log[value] = i;
    value <<= 1;
    if (value & 0x100) {
      value ^= 0x11d;
    }
  }
  for (let i = 255; i < 512; i += 1) {
    exp[i] = exp[i - 255];
  }
  QR_GALOIS = { exp, log };
  return QR_GALOIS;
}

export function qrReedSolomonEncode(dataCodewords, ecCount) {
  if (!Array.isArray(dataCodewords) && !(dataCodewords instanceof Uint8Array)) {
    throw new Error('Reed-Solomon input must be an array of codewords.');
  }
  if (!Number.isInteger(ecCount) || ecCount < 1 || ecCount > 68) {
    throw new Error('Reed-Solomon EC codeword count must be an integer between 1 and 68.');
  }
  const { exp, log } = qrGaloisTables();
  const mul = (a, b) => (a === 0 || b === 0 ? 0 : exp[log[a] + log[b]]);

  let generator = [1];
  for (let i = 0; i < ecCount; i += 1) {
    const next = [...generator, 0];
    for (let j = 0; j < generator.length; j += 1) {
      next[j + 1] ^= mul(generator[j], exp[i]);
    }
    generator = next;
  }

  const remainder = new Uint8Array(dataCodewords.length + ecCount);
  remainder.set(dataCodewords);
  for (let i = 0; i < dataCodewords.length; i += 1) {
    const factor = remainder[i];
    if (factor !== 0) {
      for (let j = 1; j < generator.length; j += 1) {
        remainder[i + j] ^= mul(generator[j], factor);
      }
    }
  }
  return Array.from(remainder.slice(dataCodewords.length));
}

export function qrFormatInfoBits(ecLevel, maskId) {
  if (!(ecLevel in QR_EC_LEVEL_BITS)) {
    throw new Error(`Unsupported QR error-correction level: ${ecLevel}. Supported: L, M.`);
  }
  if (!Number.isInteger(maskId) || maskId < 0 || maskId > 7) {
    throw new Error('QR mask id must be an integer between 0 and 7.');
  }
  const data = (QR_EC_LEVEL_BITS[ecLevel] << 3) | maskId;
  let remainder = data << 10;
  for (let bit = 14; bit >= 10; bit -= 1) {
    if ((remainder >> bit) & 1) {
      remainder ^= 0b10100110111 << (bit - 10);
    }
  }
  return ((data << 10) | remainder) ^ 0b101010000010010;
}

export function qrVersionInfoBits(version) {
  if (!Number.isInteger(version) || version < 7 || version > 40) {
    throw new Error('QR version info exists only for versions 7 through 40.');
  }
  let remainder = version << 12;
  for (let bit = 17; bit >= 12; bit -= 1) {
    if ((remainder >> bit) & 1) {
      remainder ^= 0b1111100100101 << (bit - 12);
    }
  }
  return (version << 12) | remainder;
}

export function qrBlockStructure(version, ecLevel) {
  if (!Number.isInteger(version) || version < 1 || version > 40) {
    throw new Error('QR version must be an integer between 1 and 40.');
  }
  if (!(ecLevel in QR_BLOCK_TABLE)) {
    throw new Error(`Unsupported QR error-correction level: ${ecLevel}. Supported: L, M.`);
  }
  const [ecPerBlock, g1Count, g1Data, g2Count, g2Data] = QR_BLOCK_TABLE[ecLevel][version - 1];
  const blocks = [];
  for (let i = 0; i < g1Count; i += 1) {
    blocks.push(g1Data);
  }
  for (let i = 0; i < g2Count; i += 1) {
    blocks.push(g2Data);
  }
  const totalData = blocks.reduce((sum, len) => sum + len, 0);
  return { ecPerBlock, blocks, totalData };
}

function qrByteCapacity(version, ecLevel) {
  const { totalData } = qrBlockStructure(version, ecLevel);
  const countBits = version >= 10 ? 16 : 8;
  return Math.floor((totalData * 8 - 4 - countBits) / 8);
}

function qrMaskAt(maskId, row, col) {
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
}

function qrBuildDataCodewords(bytes, version, ecLevel) {
  const { totalData } = qrBlockStructure(version, ecLevel);
  const countBits = version >= 10 ? 16 : 8;
  const bits = [];
  const pushBits = (value, length) => {
    for (let i = length - 1; i >= 0; i -= 1) {
      bits.push((value >> i) & 1);
    }
  };
  pushBits(0b0100, 4);
  pushBits(bytes.length, countBits);
  for (let i = 0; i < bytes.length; i += 1) {
    pushBits(bytes[i], 8);
  }
  const capacityBits = totalData * 8;
  pushBits(0, Math.min(4, capacityBits - bits.length));
  while (bits.length % 8 !== 0) {
    bits.push(0);
  }
  const codewords = [];
  for (let i = 0; i < bits.length; i += 8) {
    let byte = 0;
    for (let j = 0; j < 8; j += 1) {
      byte = (byte << 1) | bits[i + j];
    }
    codewords.push(byte);
  }
  const padBytes = [0xec, 0x11];
  let padIndex = 0;
  while (codewords.length < totalData) {
    codewords.push(padBytes[padIndex % 2]);
    padIndex += 1;
  }
  return codewords;
}

function qrInterleaveCodewords(dataCodewords, version, ecLevel) {
  const { ecPerBlock, blocks } = qrBlockStructure(version, ecLevel);
  const dataBlocks = [];
  const ecBlocks = [];
  let offset = 0;
  blocks.forEach((length) => {
    const block = dataCodewords.slice(offset, offset + length);
    offset += length;
    dataBlocks.push(block);
    ecBlocks.push(qrReedSolomonEncode(block, ecPerBlock));
  });

  const interleaved = [];
  const maxDataLength = Math.max(...blocks);
  for (let i = 0; i < maxDataLength; i += 1) {
    dataBlocks.forEach((block) => {
      if (i < block.length) {
        interleaved.push(block[i]);
      }
    });
  }
  for (let i = 0; i < ecPerBlock; i += 1) {
    ecBlocks.forEach((block) => {
      interleaved.push(block[i]);
    });
  }
  return interleaved;
}

function qrPlaceFunctionPatterns(version, size, modules, isFunction) {
  const setFunction = (row, col, dark) => {
    if (row < 0 || col < 0 || row >= size || col >= size) {
      return;
    }
    const index = row * size + col;
    modules[index] = dark ? 1 : 0;
    isFunction[index] = 1;
  };

  const placeFinder = (top, left) => {
    for (let row = -1; row <= 7; row += 1) {
      for (let col = -1; col <= 7; col += 1) {
        const r = top + row;
        const c = left + col;
        if (r < 0 || c < 0 || r >= size || c >= size) {
          continue;
        }
        const inRing = row >= 0 && row <= 6 && col >= 0 && col <= 6 && (row === 0 || row === 6 || col === 0 || col === 6);
        const inCore = row >= 2 && row <= 4 && col >= 2 && col <= 4;
        setFunction(r, c, inRing || inCore);
      }
    }
  };
  placeFinder(0, 0);
  placeFinder(0, size - 7);
  placeFinder(size - 7, 0);

  for (let i = 8; i <= size - 9; i += 1) {
    setFunction(6, i, i % 2 === 0);
    setFunction(i, 6, i % 2 === 0);
  }

  const positions = QR_ALIGNMENT_POSITIONS[version - 1];
  positions.forEach((row) => {
    positions.forEach((col) => {
      const nearTopLeft = row <= 8 && col <= 8;
      const nearTopRight = row <= 8 && col >= size - 9;
      const nearBottomLeft = row >= size - 9 && col <= 8;
      if (nearTopLeft || nearTopRight || nearBottomLeft) {
        return;
      }
      for (let dr = -2; dr <= 2; dr += 1) {
        for (let dc = -2; dc <= 2; dc += 1) {
          const ring = Math.max(Math.abs(dr), Math.abs(dc));
          setFunction(row + dr, col + dc, ring !== 1);
        }
      }
    });
  });

  // Reserve format-info modules (values written per-mask later) and the fixed dark
  // module; row/column 6 stays with the timing pattern.
  for (let i = 0; i < 9; i += 1) {
    if (i !== 6) {
      setFunction(i, 8, false);
      setFunction(8, i, false);
    }
  }
  for (let i = 0; i < 8; i += 1) {
    setFunction(8, size - 1 - i, false);
    setFunction(size - 1 - i, 8, false);
  }
  setFunction(size - 8, 8, true);

  if (version >= 7) {
    const bits = qrVersionInfoBits(version);
    for (let i = 0; i < 18; i += 1) {
      const bit = (bits >> i) & 1;
      setFunction(Math.floor(i / 3), (i % 3) + size - 11, bit === 1);
      setFunction((i % 3) + size - 11, Math.floor(i / 3), bit === 1);
    }
  }
}

function qrWriteFormatInfo(size, modules, ecLevel, maskId) {
  const bits = qrFormatInfoBits(ecLevel, maskId);
  const set = (row, col, dark) => {
    modules[row * size + col] = dark ? 1 : 0;
  };
  for (let i = 0; i < 15; i += 1) {
    const dark = ((bits >> i) & 1) === 1;
    if (i < 6) {
      set(i, 8, dark);
    } else if (i < 8) {
      set(i + 1, 8, dark);
    } else {
      set(size - 15 + i, 8, dark);
    }
    if (i < 8) {
      set(8, size - 1 - i, dark);
    } else if (i < 9) {
      set(8, 15 - i, dark);
    } else {
      set(8, 14 - i, dark);
    }
  }
}

function qrWriteData(size, modules, isFunction, codewords, maskId) {
  let byteIndex = 0;
  let bitIndex = 7;
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
        if (isFunction[index]) {
          continue;
        }
        let dark = false;
        if (byteIndex < codewords.length) {
          dark = ((codewords[byteIndex] >> bitIndex) & 1) === 1;
        }
        if (qrMaskAt(maskId, row, currentCol)) {
          dark = !dark;
        }
        modules[index] = dark ? 1 : 0;
        bitIndex -= 1;
        if (bitIndex === -1) {
          byteIndex += 1;
          bitIndex = 7;
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
}

function qrPenaltyScore(size, modules) {
  const at = (row, col) => modules[row * size + col];
  let penalty = 0;

  // Rule 1: runs of 5+ same-colored modules in rows and columns.
  for (let pass = 0; pass < 2; pass += 1) {
    for (let i = 0; i < size; i += 1) {
      let runColor = -1;
      let runLength = 0;
      for (let j = 0; j < size; j += 1) {
        const color = pass === 0 ? at(i, j) : at(j, i);
        if (color === runColor) {
          runLength += 1;
        } else {
          if (runLength >= 5) {
            penalty += 3 + (runLength - 5);
          }
          runColor = color;
          runLength = 1;
        }
      }
      if (runLength >= 5) {
        penalty += 3 + (runLength - 5);
      }
    }
  }

  // Rule 2: 2x2 blocks of the same color.
  for (let row = 0; row < size - 1; row += 1) {
    for (let col = 0; col < size - 1; col += 1) {
      const color = at(row, col);
      if (color === at(row, col + 1) && color === at(row + 1, col) && color === at(row + 1, col + 1)) {
        penalty += 3;
      }
    }
  }

  // Rule 3: finder-like 1:1:3:1:1 pattern with 4 light modules on either side.
  const patternA = [1, 0, 1, 1, 1, 0, 1, 0, 0, 0, 0];
  const patternB = [0, 0, 0, 0, 1, 0, 1, 1, 1, 0, 1];
  for (let row = 0; row < size; row += 1) {
    for (let col = 0; col <= size - 11; col += 1) {
      let matchesA = true;
      let matchesB = true;
      let matchesAv = true;
      let matchesBv = true;
      for (let k = 0; k < 11; k += 1) {
        const h = at(row, col + k);
        const v = at(col + k, row);
        if (h !== patternA[k]) matchesA = false;
        if (h !== patternB[k]) matchesB = false;
        if (v !== patternA[k]) matchesAv = false;
        if (v !== patternB[k]) matchesBv = false;
      }
      if (matchesA || matchesB) penalty += 40;
      if (matchesAv || matchesBv) penalty += 40;
    }
  }

  // Rule 4: dark-module proportion deviation from 50%.
  let darkCount = 0;
  for (let i = 0; i < modules.length; i += 1) {
    darkCount += modules[i];
  }
  const percent = (darkCount * 100) / modules.length;
  penalty += Math.floor(Math.abs(percent - 50) / 5) * 10;
  return penalty;
}

export function encodeQrMatrix(text, options = {}) {
  if (typeof text !== 'string' || text.length === 0) {
    throw new Error('QR payload must be a non-empty string.');
  }
  const { minVersion = QR_ENCODE_DEFAULTS.minVersion, maxVersion = QR_ENCODE_DEFAULTS.maxVersion } = options;
  if (!Number.isInteger(minVersion) || !Number.isInteger(maxVersion) || minVersion < 1 || maxVersion > 40 || minVersion > maxVersion) {
    throw new Error('QR version bounds must satisfy 1 <= minVersion <= maxVersion <= 40.');
  }
  const requested = options.ecLevel || 'auto';
  let levels;
  if (requested === 'auto') {
    levels = QR_ENCODE_DEFAULTS.ecLevelPreference;
  } else if (requested in QR_BLOCK_TABLE) {
    levels = [requested];
  } else {
    throw new Error(`Unsupported QR error-correction level: ${requested}. Supported: L, M, auto.`);
  }

  const bytes = new TextEncoder().encode(text);
  let version = 0;
  let ecLevel = '';
  for (const level of levels) {
    for (let candidate = minVersion; candidate <= maxVersion; candidate += 1) {
      if (qrByteCapacity(candidate, level) >= bytes.length) {
        version = candidate;
        ecLevel = level;
        break;
      }
    }
    if (version) {
      break;
    }
  }
  if (!version) {
    const best = qrByteCapacity(maxVersion, levels[levels.length - 1]);
    throw new Error(`QR payload is ${bytes.length} bytes but the largest supported code holds ${best} bytes.`);
  }

  const size = 17 + version * 4;
  const codewords = qrInterleaveCodewords(qrBuildDataCodewords(bytes, version, ecLevel), version, ecLevel);
  const functionModules = new Uint8Array(size * size);
  const baseModules = new Uint8Array(size * size);
  qrPlaceFunctionPatterns(version, size, baseModules, functionModules);

  let bestModules = null;
  let bestMaskId = -1;
  let bestPenalty = Infinity;
  for (let maskId = 0; maskId < 8; maskId += 1) {
    const candidate = baseModules.slice();
    qrWriteData(size, candidate, functionModules, codewords, maskId);
    qrWriteFormatInfo(size, candidate, ecLevel, maskId);
    const penalty = qrPenaltyScore(size, candidate);
    if (penalty < bestPenalty) {
      bestPenalty = penalty;
      bestMaskId = maskId;
      bestModules = candidate;
    }
  }

  return {
    version,
    size,
    ecLevel,
    maskId: bestMaskId,
    penalty: bestPenalty,
    byteLength: bytes.length,
    modules: bestModules,
    functionModules,
  };
}
