import {
  CVD_MODES,
  evaluateContrast,
  parseHexColor,
  suggestAccessiblePairs,
  transformImageDataWithMatrix,
} from './js/vision-core.js';

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;
const MAX_PREVIEW_WIDTH = 680;
const MAX_SOURCE_DIMENSION = 5000;
const SUPPORTED_IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.bmp', '.avif'];

const HEX_HEX_RE = /^#?([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

const state = {
  sourceImage: null,
  sourceName: '',
  renderSize: { width: 0, height: 0 },
};

const cvdModes = CVD_MODES.filter((mode) => mode.id !== 'normal');
const extraModes = [
  {
    id: 'low-vision-blur',
    label: 'Low Vision — Blur (3px)',
    kind: 'filter',
    filter: 'blur(3px) contrast(0.9)',
  },
  {
    id: 'low-vision-contrast',
    label: 'Low Vision — Low Contrast',
    kind: 'filter',
    filter: 'contrast(0.55) saturate(0.5)',
  },
];
const allModes = [...cvdModes, ...extraModes];

const dom = {
  imageInput: document.getElementById('imageInput'),
  demoUi: document.getElementById('demoUi'),
  demoDashboard: document.getElementById('demoDashboard'),
  processBtn: document.getElementById('processBtn'),
  exportNote: document.getElementById('exportNote'),
  downloadSourceBtn: document.getElementById('downloadSourceBtn'),
  downloadAllBtn: document.getElementById('downloadAllBtn'),
  message: document.getElementById('message'),
  sourceCanvas: document.getElementById('sourceCanvas'),
  sourceInfo: document.getElementById('sourceInfo'),
  simGrid: document.getElementById('simGrid'),
  contrastText: document.getElementById('contrastText'),
  contrastBg: document.getElementById('contrastBg'),
  contrastTextHex: document.getElementById('contrastTextHex'),
  contrastBgHex: document.getElementById('contrastBgHex'),
  contrastOut: document.getElementById('contrastOut'),
  contrastBtn: document.getElementById('contrastBtn'),
  suggestBtn: document.getElementById('suggestBtn'),
  suggestionWrap: document.getElementById('suggestions'),
  contrastValidation: document.getElementById('contrastValidation'),
};

function setMessage(text, type = 'info') {
  dom.message.textContent = text;
  dom.message.dataset.type = text ? type : '';
}

function clearMessage() {
  dom.message.textContent = '';
  dom.message.dataset.type = '';
}

function setContrastValidation(text) {
  dom.contrastValidation.textContent = text;
}

function clearContrastValidation() {
  setContrastValidation('');
}

function setImageControlsEnabled(enabled) {
  dom.processBtn.disabled = !enabled;
  dom.downloadSourceBtn.disabled = !enabled;
  dom.downloadAllBtn.disabled = !enabled;
}

function setControlState(enabled) {
  dom.contrastBtn.disabled = !enabled;
  dom.suggestBtn.disabled = !enabled;
}

function getSafeFileName(value) {
  const base = value || 'source-image';
  return base
    .replace(/[\\/]/g, '-')
    .replace(/[^a-zA-Z0-9._-]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .replace(/\.{2,}/g, '-')
    .replace(/\.png$/i, '');
}

function getRenderSize(img) {
  const ratio = img.naturalWidth / img.naturalHeight || 1;
  const width = Math.min(img.naturalWidth, MAX_PREVIEW_WIDTH);
  const height = Math.round(width / ratio);
  return { width, height };
}

function showSourceMeta(fileName, width, height) {
  dom.sourceInfo.textContent = `${fileName} • ${width}×${height}px`;
}

function makeExportFileName(mode = 'source') {
  return `${getSafeFileName(state.sourceName || 'clearsight-source')}-${mode}.png`;
}

function downloadCanvasAsImage(canvas, filename) {
  if (!canvas || canvas.width === 0 || canvas.height === 0) {
    throw new Error('Nothing to download for this preview yet.');
  }

  const link = document.createElement('a');
  link.href = canvas.toDataURL('image/png');
  link.download = filename;
  link.rel = 'noopener';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

function createModeCard(mode) {
  const card = document.createElement('figure');
  card.className = 'sim-card';
  card.dataset.mode = mode.id;

  const header = document.createElement('div');
  header.className = 'sim-card-header';

  const title = document.createElement('figcaption');
  title.textContent = mode.label;
  title.className = 'sim-title';

  const downloadBtn = document.createElement('button');
  downloadBtn.type = 'button';
  downloadBtn.className = 'tiny-btn';
  downloadBtn.textContent = 'Download PNG';
  downloadBtn.disabled = true;
  downloadBtn.setAttribute('aria-label', `Download ${mode.label} preview image`);
  downloadBtn.addEventListener('click', () => {
    if (!state.sourceImage) {
      setMessage('Load and render an image before exporting.', 'error');
      return;
    }
    const canvas = card.querySelector('.sim-canvas');
    try {
      downloadCanvasAsImage(canvas, makeExportFileName(mode.id));
      setMessage(`Downloaded ${mode.label}.`, 'success');
    } catch (error) {
      setMessage(error.message, 'error');
    }
  });

  header.append(title, downloadBtn);

  const canvas = document.createElement('canvas');
  canvas.className = 'sim-canvas';
  canvas.setAttribute('role', 'img');
  canvas.setAttribute('aria-label', `${mode.label} preview`);

  const status = document.createElement('p');
  status.className = 'sim-status';
  status.textContent = 'Pending';

  card.append(header, canvas, status);
  return card;
}

function renderModeCards() {
  dom.simGrid.innerHTML = '';
  allModes.forEach((mode) => {
    const card = createModeCard(mode);
    dom.simGrid.appendChild(card);
  });
}

function isSupportedImageFile(file) {
  if (!file || typeof file.type !== 'string') {
    return false;
  }

  if (file.type.startsWith('image/')) {
    return true;
  }

  const fileName = (file.name || '').toLowerCase();
  return SUPPORTED_IMAGE_EXTENSIONS.some((ext) => fileName.endsWith(ext));
}

function withImageFromFile(file) {
  if (!file) {
    throw new Error('No file was selected.');
  }
  if (!isSupportedImageFile(file)) {
    throw new Error('The selected file is not an image. Please upload a PNG, JPG, or WebP file.');
  }
  if (!Number.isFinite(file.size) || file.size <= 0) {
    throw new Error('The selected image is empty or invalid.');
  }
  if (file.size > MAX_FILE_SIZE_BYTES) {
    throw new Error('Image is too large. Please use a file smaller than 10 MB.');
  }

  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();

    image.onload = () => {
      URL.revokeObjectURL(url);
      if (!image.naturalWidth || !image.naturalHeight) {
        reject(new Error('Selected image could not be decoded.'));
        return;
      }
      if (image.naturalWidth > MAX_SOURCE_DIMENSION || image.naturalHeight > MAX_SOURCE_DIMENSION) {
        reject(
          new Error(
            `Image dimensions are too large (${image.naturalWidth}×${image.naturalHeight}). Use a source under ${MAX_SOURCE_DIMENSION}px.`,
          ),
        );
        return;
      }
      resolve(image);
    };

    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to decode selected image file.'));
    };

    image.src = url;
  });
}

function createDemoImage(type) {
  const canvas = document.createElement('canvas');
  canvas.width = 1280;
  canvas.height = 720;

  const c = canvas.getContext('2d');

  if (type === 'ui') {
    c.fillStyle = '#f8fafc';
    c.fillRect(0, 0, 1280, 720);
    c.fillStyle = '#0f172a';
    c.fillRect(60, 55, 1160, 140);
    c.fillStyle = '#ffffff';
    c.font = 'bold 58px "Inter", "Segoe UI", sans-serif';
    c.fillText('Account overview', 90, 140);
    c.fillStyle = '#0f766e';
    c.fillRect(80, 260, 320, 90);
    c.fillStyle = '#ffffff';
    c.font = 'bold 32px "Inter", "Segoe UI", sans-serif';
    c.fillText('Create report', 108, 320);

    c.fillStyle = '#0284c7';
    c.fillRect(440, 260, 320, 90);
    c.fillStyle = '#ffffff';
    c.fillText('Export', 530, 320);

    c.fillStyle = '#7c3aed';
    c.fillRect(810, 260, 360, 90);
    c.fillStyle = '#ffffff';
    c.fillText('Share with team', 845, 320);

    c.fillStyle = '#111827';
    c.fillRect(80, 400, 1140, 260);
    c.fillStyle = '#e0f2fe';
    c.fillRect(120, 440, 220, 130);
    c.fillRect(390, 440, 220, 130);
    c.fillRect(660, 440, 220, 130);
    c.fillRect(930, 440, 220, 130);
    c.fillStyle = '#0f172a';
    c.font = 'bold 30px "Inter", "Segoe UI", sans-serif';
    c.fillText('$3,200', 165, 515);
    c.fillText('18.5%', 435, 515);
    c.fillText('+12.4%', 690, 515);
    c.fillText('3rd', 975, 515);
  } else {
    c.fillStyle = '#fefce8';
    c.fillRect(0, 0, 1280, 720);
    c.fillStyle = '#0f172a';
    c.font = 'bold 64px "Inter", "Segoe UI", sans-serif';
    c.fillText('ClearSight Accessibility Dashboard', 70, 120);

    const blocks = [
      ['#16a34a', '#f0fdf4', 'Sales: +24%', 120],
      ['#2563eb', '#dbeafe', 'Retention: 82%', 360],
      ['#d97706', '#ffedd5', 'Risk: Medium', 600],
      ['#be123c', '#ffe4e6', 'Errors: 14', 840],
      ['#0f766e', '#ccfbf1', 'Latency: 280ms', 980],
    ];

    blocks.forEach(([bg, panel, label, x]) => {
      c.fillStyle = bg;
      c.fillRect(x, 180, 270, 150);
      c.fillStyle = '#ffffff';
      c.font = 'bold 26px "Inter", "Segoe UI", sans-serif';
      c.fillText(label, x + 18, 250);
      c.fillStyle = panel;
      c.fillRect(x + 40, 285, 190, 45);
      c.fillStyle = bg === '#ffedd5' || bg === '#dbeafe' ? '#7c2d12' : '#0f172a';
      c.fillText('Details', x + 85, 316);
    });

    c.fillStyle = '#0f172a';
    c.font = 'bold 36px "Inter", "Segoe UI", sans-serif';
    c.fillText('Quarterly performance', 70, 470);
    c.fillStyle = '#4f46e5';
    c.fillRect(70, 520, 560, 150);
    c.fillStyle = '#ffffff';
    c.font = 'bold 48px "Inter", "Segoe UI", sans-serif';
    c.fillText('4.2x', 270, 620);

    c.fillStyle = '#dc2626';
    c.fillRect(670, 520, 560, 150);
    c.fillStyle = '#ffffff';
    c.fillText('88 ms', 870, 620);
  }

  const img = new Image();
  img.src = canvas.toDataURL('image/png');
  return img;
}

function normalizeHexInput(value) {
  if (typeof value !== 'string') {
    return null;
  }

  const clean = value.trim();
  if (!clean) {
    return null;
  }

  if (!HEX_HEX_RE.test(clean)) {
    return null;
  }

  const normalized = clean.startsWith('#') ? clean.slice(1) : clean;
  if (normalized.length === 3) {
    return `#${normalized
      .split('')
      .map((ch) => ch + ch)
      .join('')}`.toLowerCase();
  }

  return `#${normalized}`.toLowerCase();
}

function syncHexWithPicker(picker, hexInput, label) {
  picker.addEventListener('input', (event) => {
    hexInput.value = event.target.value.toUpperCase();
    clearContrastValidation();
  });

  hexInput.addEventListener('input', () => {
    const raw = hexInput.value.trim();
    if (!raw) {
      clearContrastValidation();
      return;
    }

    const normalized = normalizeHexInput(raw);
    if (normalized) {
      hexInput.value = normalized.toUpperCase();
      picker.value = normalized;
      clearContrastValidation();
      return;
    }

    setContrastValidation(`${label} color must be 3 or 6 hex digits (like #0F172A).`);
  });
}

function resolveContrastInputs() {
  const textHex = normalizeHexInput(dom.contrastTextHex.value);
  const bgHex = normalizeHexInput(dom.contrastBgHex.value);

  if (!textHex || !bgHex) {
    throw new Error('Color inputs must be valid hex values (3 or 6 digits).');
  }

  dom.contrastText.value = textHex;
  dom.contrastBg.value = bgHex;
  dom.contrastTextHex.value = textHex.toUpperCase();
  dom.contrastBgHex.value = bgHex.toUpperCase();

  return {
    text: parseHexColor(textHex),
    background: parseHexColor(bgHex),
  };
}

async function renderMode(mode, sourceSize) {
  const card = dom.simGrid.querySelector(`[data-mode="${mode.id}"]`);
  if (!card) {
    return;
  }

  const canvas = card.querySelector('.sim-canvas');
  const status = card.querySelector('.sim-status');
  const exportBtn = card.querySelector('.tiny-btn');
  const ctx = canvas.getContext('2d', { willReadFrequently: true });

  canvas.width = sourceSize.width;
  canvas.height = sourceSize.height;
  status.textContent = 'Rendering...';
  status.className = 'sim-status loading';
  if (exportBtn) {
    exportBtn.disabled = true;
  }

  try {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (mode.kind === 'matrix') {
      ctx.drawImage(state.sourceImage, 0, 0, sourceSize.width, sourceSize.height);
      const imageData = ctx.getImageData(0, 0, sourceSize.width, sourceSize.height);
      transformImageDataWithMatrix(imageData, mode.matrix);
      ctx.putImageData(imageData, 0, 0);
    } else if (mode.kind === 'filter') {
      ctx.filter = mode.filter;
      ctx.drawImage(state.sourceImage, 0, 0, sourceSize.width, sourceSize.height);
      ctx.filter = 'none';
    } else {
      throw new Error('Unknown simulation mode type.');
    }

    status.textContent = 'Done';
    status.className = 'sim-status done';
    if (exportBtn) {
      exportBtn.disabled = false;
    }
  } catch (error) {
    ctx.filter = 'none';
    status.textContent = error.message || 'Render failed';
    status.className = 'sim-status error';
    if (exportBtn) {
      exportBtn.disabled = true;
    }
  }
}

async function renderAll() {
  if (!state.sourceImage) {
    setMessage('Upload or load a sample image first.', 'error');
    return;
  }

  setControlState(true);
  setImageControlsEnabled(false);
  dom.processBtn.textContent = 'Rendering...';
  clearMessage();
  clearContrastValidation();
  dom.sourceInfo.textContent = 'Rendering source...';
  setMessage('Rendering simulation previews. This may take a second for large images.', 'info');

  try {
    const sourceSize = getRenderSize(state.sourceImage);
    state.renderSize = sourceSize;

    const sourceCtx = dom.sourceCanvas.getContext('2d');
    dom.sourceCanvas.width = sourceSize.width;
    dom.sourceCanvas.height = sourceSize.height;
    sourceCtx.clearRect(0, 0, sourceSize.width, sourceSize.height);
    sourceCtx.drawImage(state.sourceImage, 0, 0, sourceSize.width, sourceSize.height);
    showSourceMeta(state.sourceName, sourceSize.width, sourceSize.height);

    for (const mode of allModes) {
      // eslint-disable-next-line no-await-in-loop
      await renderMode(mode, sourceSize);
    }

    setImageControlsEnabled(true);
    dom.processBtn.textContent = 'Render simulations';
    setMessage('All simulations rendered.', 'success');
    dom.exportNote.textContent = 'Tip: download previews for quick submission screenshots.';
  } catch (error) {
    dom.processBtn.textContent = 'Render simulations';
    setMessage(error.message || 'Failed to complete rendering.', 'error');
  } finally {
    setImageControlsEnabled(Boolean(state.sourceImage));
  }
}

function downloadAllPreviews() {
  const sourceFileName = makeExportFileName('source');

  try {
    downloadCanvasAsImage(dom.sourceCanvas, sourceFileName);

    const cards = dom.simGrid.querySelectorAll('.sim-card');
    let downloaded = 0;

    cards.forEach((card) => {
      const doneState = card.querySelector('.sim-status')?.classList.contains('done');
      if (!doneState) {
        return;
      }
      const id = card.dataset.mode;
      const canvas = card.querySelector('canvas');
      downloadCanvasAsImage(canvas, makeExportFileName(id));
      downloaded += 1;
    });

    if (!cards.length) {
      setMessage('No simulations available yet.', 'info');
      return;
    }

    if (!downloaded) {
      setMessage('Render simulations first, then download the completed previews.', 'error');
      return;
    }

    setMessage(`Exported source and ${downloaded} completed simulation${downloaded === 1 ? '' : 's'}.`, 'success');
  } catch (error) {
    setMessage(error.message, 'error');
  }
}

function renderContrastResult() {
  clearContrastValidation();
  try {
    const { text, background } = resolveContrastInputs();
    const result = evaluateContrast(text, background);
    const ratio = result.ratio.toFixed(2);
    dom.contrastOut.innerHTML = `
      <span>Contrast: <strong>${ratio}:1</strong></span>
      <span>AA: <strong>${result.passesAA ? 'PASS' : 'FAIL'}</strong></span>
      <span>AAA: <strong>${result.passesAAA ? 'PASS' : 'FAIL'}</strong></span>
      <span>Large text AA: <strong>${result.passesLAA ? 'PASS' : 'FAIL'}</strong></span>
    `;
    setMessage('Contrast checked successfully.', 'success');
    return result;
  } catch (error) {
    dom.contrastOut.textContent = error.message;
    setContrastValidation(error.message);
    setMessage(error.message, 'error');
    return null;
  }
}

async function copyPalettePairToClipboard(pair) {
  const payload = `text: ${pair.text.toUpperCase()}\nbackground: ${pair.background.toUpperCase()}`;
  if (typeof navigator === 'undefined') {
    return false;
  }

  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(payload);
    return true;
  }

  const textarea = document.createElement('textarea');
  textarea.value = payload;
  textarea.setAttribute('aria-hidden', 'true');
  textarea.style.position = 'fixed';
  textarea.style.opacity = '0';
  textarea.style.pointerEvents = 'none';
  document.body.appendChild(textarea);
  textarea.focus();
  textarea.select();

  try {
    const copied = document.execCommand('copy');
    return Boolean(copied);
  } finally {
    document.body.removeChild(textarea);
  }
}

function renderSuggestions() {
  const result = renderContrastResult();
  if (!result) {
    return;
  }

  let suggestions;
  try {
    suggestions = suggestAccessiblePairs(dom.contrastTextHex.value, dom.contrastBgHex.value, 4.5, 4);
  } catch (error) {
    setMessage(error.message, 'error');
    return;
  }

  dom.suggestionWrap.innerHTML = '';

  if (!suggestions.length) {
    const empty = document.createElement('p');
    empty.className = 'muted';
    empty.textContent = 'No replacement pairs met the target contrast threshold.';
    dom.suggestionWrap.appendChild(empty);
    return;
  }

  suggestions.forEach((pair) => {
    const card = document.createElement('article');
    card.className = 'palette-card';
    card.style.setProperty('--text', pair.text);
    card.style.setProperty('--bg', pair.background);

    const preview = document.createElement('div');
    preview.className = 'palette-preview';

    const textRow = document.createElement('div');
    textRow.innerHTML = `<strong>Text</strong> ${pair.text.toUpperCase()}`;

    const bgRow = document.createElement('div');
    bgRow.innerHTML = `<strong>Background</strong> ${pair.background.toUpperCase()}`;

    const ratioRow = document.createElement('div');
    ratioRow.textContent = `${pair.ratio.toFixed(2)}:1`;

    const applyBtn = document.createElement('button');
    applyBtn.type = 'button';
    applyBtn.className = 'palette-apply-btn';
    applyBtn.textContent = 'Apply + Copy';

    applyBtn.addEventListener('click', async () => {
      applyBtn.disabled = true;
      try {
        dom.contrastText.value = pair.text;
        dom.contrastBg.value = pair.background;
        dom.contrastTextHex.value = pair.text.toUpperCase();
        dom.contrastBgHex.value = pair.background.toUpperCase();

        let copied = false;
        try {
          copied = await copyPalettePairToClipboard(pair);
        } catch {
          copied = false;
        }

        renderContrastResult();
        if (copied) {
          setMessage('Applied palette and copied it to clipboard.', 'success');
        } else {
          setMessage('Applied palette. Clipboard copy was unavailable.', 'info');
        }
      } finally {
        applyBtn.disabled = false;
      }
    });

    card.append(preview, textRow, bgRow, ratioRow, applyBtn);
    dom.suggestionWrap.appendChild(card);
  });

  setMessage(`Generated ${suggestions.length} accessible palette options.`, 'success');
}

function readImageAndRender(file) {
  return withImageFromFile(file)
    .then((image) => {
      state.sourceImage = image;
      state.sourceName = file.name || 'uploaded-image';
      clearContrastValidation();
      return renderAll();
    })
    .catch((error) => {
      setMessage(error.message, 'error');
      setImageControlsEnabled(Boolean(state.sourceImage));
    });
}

function loadSample(type) {
  try {
    state.sourceImage = createDemoImage(type);
    state.sourceName = `${type}-sample.png`;
    if (state.sourceImage.complete) {
      renderAll();
    } else {
      state.sourceImage.onload = () => renderAll();
      state.sourceImage.onerror = () => setMessage('Failed to generate sample image.', 'error');
    }
  } catch (error) {
    setMessage(error.message, 'error');
  }
}

function init() {
  renderModeCards();
  setImageControlsEnabled(false);
  setControlState(true);

  dom.imageInput.addEventListener('change', (event) => {
    const file = event.target.files?.[0];
    if (!file) {
      setMessage('No file selected.', 'error');
      return;
    }

    setMessage(`Loaded ${file.name}. Rendering...`, 'info');
    readImageAndRender(file);
  });

  dom.demoUi.addEventListener('click', () => loadSample('ui'));
  dom.demoDashboard.addEventListener('click', () => loadSample('dashboard'));
  dom.processBtn.addEventListener('click', renderAll);
  dom.downloadSourceBtn.addEventListener('click', () => {
    try {
      if (!state.sourceImage) {
        setMessage('Upload or load an image before downloading.', 'error');
        return;
      }
      downloadCanvasAsImage(dom.sourceCanvas, makeExportFileName('source'));
      setMessage('Source preview downloaded.', 'success');
    } catch (error) {
      setMessage(error.message, 'error');
    }
  });
  dom.downloadAllBtn.addEventListener('click', downloadAllPreviews);
  dom.contrastBtn.addEventListener('click', renderContrastResult);
  dom.suggestBtn.addEventListener('click', renderSuggestions);

  syncHexWithPicker(dom.contrastText, dom.contrastTextHex, 'Text');
  syncHexWithPicker(dom.contrastBg, dom.contrastBgHex, 'Background');
  dom.contrastText.addEventListener('change', renderContrastResult);
  dom.contrastBg.addEventListener('change', renderContrastResult);

  dom.contrastText.value = '#0f172a';
  dom.contrastBg.value = '#ffffff';
  dom.contrastTextHex.value = '#0F172A';
  dom.contrastBgHex.value = '#FFFFFF';

  renderContrastResult();
  setMessage('Upload an image or use a demo to begin.', 'info');
}

window.addEventListener('DOMContentLoaded', init);
