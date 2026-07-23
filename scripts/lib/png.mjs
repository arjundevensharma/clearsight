// Minimal pure-Node PNG decoder for the ClearSight CI auditor.
// Zero npm dependencies: chunk parsing + node:zlib inflate + scanline
// unfiltering. Supports the formats screenshot tooling actually emits
// (8-bit grayscale/RGB/RGBA/gray+alpha and 1/2/4/8-bit palette PNGs,
// non-interlaced) and fails loudly on anything else.

import { inflateSync } from 'node:zlib';

const PNG_SIGNATURE = Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

const CHANNELS_BY_COLOR_TYPE = {
  0: 1, // grayscale
  2: 3, // RGB
  3: 1, // palette index
  4: 2, // grayscale + alpha
  6: 4, // RGBA
};

function paethPredictor(a, b, c) {
  const p = a + b - c;
  const pa = Math.abs(p - a);
  const pb = Math.abs(p - b);
  const pc = Math.abs(p - c);
  if (pa <= pb && pa <= pc) return a;
  if (pb <= pc) return b;
  return c;
}

function unfilterScanlines(raw, width, height, channels, bitDepth) {
  const scanlineBytes = Math.ceil((width * channels * bitDepth) / 8);
  const bpp = Math.max(1, (channels * bitDepth) >> 3);
  const expected = (scanlineBytes + 1) * height;
  if (raw.length < expected) {
    throw new Error(`PNG image data is truncated (expected ${expected} bytes, got ${raw.length}).`);
  }

  const out = new Uint8Array(scanlineBytes * height);
  for (let y = 0; y < height; y += 1) {
    const filterType = raw[y * (scanlineBytes + 1)];
    const rowStart = y * (scanlineBytes + 1) + 1;
    const outStart = y * scanlineBytes;
    const prevStart = outStart - scanlineBytes;
    if (filterType > 4) {
      throw new Error(`PNG scanline ${y} uses unknown filter type ${filterType}.`);
    }
    for (let i = 0; i < scanlineBytes; i += 1) {
      const x = raw[rowStart + i];
      const left = i >= bpp ? out[outStart + i - bpp] : 0;
      const up = y > 0 ? out[prevStart + i] : 0;
      const upLeft = y > 0 && i >= bpp ? out[prevStart + i - bpp] : 0;
      let value;
      switch (filterType) {
        case 0:
          value = x;
          break;
        case 1:
          value = x + left;
          break;
        case 2:
          value = x + up;
          break;
        case 3:
          value = x + ((left + up) >> 1);
          break;
        default:
          value = x + paethPredictor(left, up, upLeft);
          break;
      }
      out[outStart + i] = value & 0xff;
    }
  }
  return out;
}

function readPaletteIndex(row, x, bitDepth) {
  if (bitDepth === 8) {
    return row[x];
  }
  const pixelsPerByte = 8 / bitDepth;
  const byte = row[Math.floor(x / pixelsPerByte)];
  const shift = 8 - bitDepth * ((x % pixelsPerByte) + 1);
  return (byte >> shift) & ((1 << bitDepth) - 1);
}

/**
 * Decode a PNG buffer into { width, height, data } where data is a
 * Uint8ClampedArray of RGBA bytes — the same layout ImageData uses, so the
 * result feeds auditImageAccessibility() directly.
 */
export function decodePng(buffer) {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  if (bytes.length < PNG_SIGNATURE.length + 12) {
    throw new Error('File is too small to be a PNG.');
  }
  for (let i = 0; i < PNG_SIGNATURE.length; i += 1) {
    if (bytes[i] !== PNG_SIGNATURE[i]) {
      throw new Error('File is not a PNG (bad signature) — the CI auditor reads PNG screenshots only.');
    }
  }

  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let offset = PNG_SIGNATURE.length;
  let header = null;
  let palette = null;
  let transparency = null;
  const idatParts = [];

  while (offset + 8 <= bytes.length) {
    const length = view.getUint32(offset);
    const type = String.fromCharCode(bytes[offset + 4], bytes[offset + 5], bytes[offset + 6], bytes[offset + 7]);
    const dataStart = offset + 8;
    if (dataStart + length + 4 > bytes.length) {
      throw new Error(`PNG chunk ${type} is truncated.`);
    }
    if (type === 'IHDR') {
      header = {
        width: view.getUint32(dataStart),
        height: view.getUint32(dataStart + 4),
        bitDepth: bytes[dataStart + 8],
        colorType: bytes[dataStart + 9],
        compression: bytes[dataStart + 10],
        filter: bytes[dataStart + 11],
        interlace: bytes[dataStart + 12],
      };
    } else if (type === 'PLTE') {
      palette = bytes.subarray(dataStart, dataStart + length);
    } else if (type === 'tRNS') {
      transparency = bytes.subarray(dataStart, dataStart + length);
    } else if (type === 'IDAT') {
      idatParts.push(bytes.subarray(dataStart, dataStart + length));
    } else if (type === 'IEND') {
      break;
    }
    offset = dataStart + length + 4;
  }

  if (!header) {
    throw new Error('PNG is missing its IHDR header chunk.');
  }
  if (!idatParts.length) {
    throw new Error('PNG contains no image data (IDAT) chunks.');
  }
  if (header.width <= 0 || header.height <= 0) {
    throw new Error('PNG reports empty dimensions.');
  }
  if (header.compression !== 0 || header.filter !== 0) {
    throw new Error('PNG uses a non-standard compression or filter method.');
  }
  if (header.interlace !== 0) {
    throw new Error('Adam7-interlaced PNGs are not supported — re-export the screenshot non-interlaced.');
  }
  const channels = CHANNELS_BY_COLOR_TYPE[header.colorType];
  if (!channels) {
    throw new Error(`PNG color type ${header.colorType} is not supported.`);
  }
  if (header.colorType === 3) {
    if (![1, 2, 4, 8].includes(header.bitDepth)) {
      throw new Error(`Palette PNG bit depth ${header.bitDepth} is not supported.`);
    }
    if (!palette) {
      throw new Error('Palette PNG is missing its PLTE chunk.');
    }
  } else if (header.bitDepth !== 8) {
    throw new Error(
      `PNG bit depth ${header.bitDepth} is not supported — re-export the screenshot as a standard 8-bit PNG.`,
    );
  }

  const idat = idatParts.length === 1 ? idatParts[0] : Buffer.concat(idatParts.map((part) => Buffer.from(part)));
  let raw;
  try {
    raw = inflateSync(idat);
  } catch {
    throw new Error('PNG image data failed to decompress — the file appears corrupted.');
  }

  const { width, height, bitDepth, colorType } = header;
  const unfiltered = unfilterScanlines(raw, width, height, channels, bitDepth);
  const scanlineBytes = Math.ceil((width * channels * bitDepth) / 8);
  const out = new Uint8ClampedArray(width * height * 4);

  for (let y = 0; y < height; y += 1) {
    const row = unfiltered.subarray(y * scanlineBytes, (y + 1) * scanlineBytes);
    for (let x = 0; x < width; x += 1) {
      const dst = (y * width + x) * 4;
      if (colorType === 6) {
        const src = x * 4;
        out[dst] = row[src];
        out[dst + 1] = row[src + 1];
        out[dst + 2] = row[src + 2];
        out[dst + 3] = row[src + 3];
      } else if (colorType === 2) {
        const src = x * 3;
        out[dst] = row[src];
        out[dst + 1] = row[src + 1];
        out[dst + 2] = row[src + 2];
        out[dst + 3] = 255;
      } else if (colorType === 0) {
        const gray = row[x];
        out[dst] = gray;
        out[dst + 1] = gray;
        out[dst + 2] = gray;
        out[dst + 3] = 255;
      } else if (colorType === 4) {
        const src = x * 2;
        const gray = row[src];
        out[dst] = gray;
        out[dst + 1] = gray;
        out[dst + 2] = gray;
        out[dst + 3] = row[src + 1];
      } else {
        const index = readPaletteIndex(row, x, bitDepth);
        const paletteOffset = index * 3;
        if (paletteOffset + 2 >= palette.length) {
          throw new Error(`PNG palette index ${index} is out of range.`);
        }
        out[dst] = palette[paletteOffset];
        out[dst + 1] = palette[paletteOffset + 1];
        out[dst + 2] = palette[paletteOffset + 2];
        out[dst + 3] = transparency && index < transparency.length ? transparency[index] : 255;
      }
    }
  }

  return { width, height, data: out };
}

/**
 * Box-average downscale of an RGBA buffer so oversized screenshots audit at
 * the same working resolution the in-app batch panel uses. Returns the input
 * untouched when it already fits.
 */
export function downscaleRgba(data, width, height, maxDimension) {
  const largest = Math.max(width, height);
  if (!Number.isFinite(maxDimension) || maxDimension <= 0 || largest <= maxDimension) {
    return { data, width, height, downscaled: false };
  }

  const scale = maxDimension / largest;
  const targetWidth = Math.max(1, Math.round(width * scale));
  const targetHeight = Math.max(1, Math.round(height * scale));
  const sums = new Float64Array(targetWidth * targetHeight * 5);

  for (let y = 0; y < height; y += 1) {
    const ty = Math.min(targetHeight - 1, Math.floor((y * targetHeight) / height));
    for (let x = 0; x < width; x += 1) {
      const tx = Math.min(targetWidth - 1, Math.floor((x * targetWidth) / width));
      const src = (y * width + x) * 4;
      const dst = (ty * targetWidth + tx) * 5;
      sums[dst] += data[src];
      sums[dst + 1] += data[src + 1];
      sums[dst + 2] += data[src + 2];
      sums[dst + 3] += data[src + 3];
      sums[dst + 4] += 1;
    }
  }

  const out = new Uint8ClampedArray(targetWidth * targetHeight * 4);
  for (let i = 0; i < targetWidth * targetHeight; i += 1) {
    const src = i * 5;
    const count = sums[src + 4] || 1;
    const dst = i * 4;
    out[dst] = Math.round(sums[src] / count);
    out[dst + 1] = Math.round(sums[src + 1] / count);
    out[dst + 2] = Math.round(sums[src + 2] / count);
    out[dst + 3] = Math.round(sums[src + 3] / count);
  }

  return { data: out, width: targetWidth, height: targetHeight, downscaled: true };
}
