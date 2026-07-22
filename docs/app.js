import {
  CVD_MODES,
  evaluateContrast,
  parseHexColor,
  suggestAccessiblePairs,
  transformImageDataWithMatrix,
} from './js/vision-core.js';

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;
const MAX_PREVIEW_WIDTH = 680;

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
};

function setMessage(text, type = 'info') {
  dom.message.textContent = text;
  dom.message.dataset.type = type;
}

function clearMessage() {
  dom.message.textContent = '';
  dom.message.dataset.type = '';
}

function setControlState(enabled) {
  dom.processBtn.disabled = !enabled;
  dom.contrastBtn.disabled = !enabled;
  dom.suggestBtn.disabled = !enabled;
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

function createModeCard(mode) {
  const card = document.createElement('figure');
  card.className = 'sim-card';
  card.dataset.mode = mode.id;

  const title = document.createElement('figcaption');
  title.textContent = mode.label;
  title.className = 'sim-title';

  const canvas = document.createElement('canvas');
  canvas.className = 'sim-canvas';
  canvas.setAttribute('role', 'img');
  canvas.setAttribute('aria-label', `${mode.label} preview`);

  const status = document.createElement('p');
  status.className = 'sim-status';
  status.textContent = 'Pending';

  card.append(title, canvas, status);
  return card;
}

function renderModeCards() {
  dom.simGrid.innerHTML = '';
  allModes.forEach((mode) => {
    const card = createModeCard(mode);
    dom.simGrid.appendChild(card);
  });
}

function withImageFromFile(file) {
  if (!file) {
    throw new Error('No file was selected.');
  }
  if (!file.type.startsWith('image/')) {
    throw new Error('The selected file must be an image.');
  }
  if (file.size > MAX_FILE_SIZE_BYTES) {
    throw new Error('Image is too large. Please use a file smaller than 10 MB.');
  }

  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(url);
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

async function renderMode(mode, sourceSize) {
  const card = dom.simGrid.querySelector(`[data-mode="${mode.id}"]`);
  if (!card) {
    return;
  }
  const canvas = card.querySelector('.sim-canvas');
  const status = card.querySelector('.sim-status');
  const ctx = canvas.getContext('2d', { willReadFrequently: true });

  canvas.width = sourceSize.width;
  canvas.height = sourceSize.height;
  status.textContent = 'Rendering...';
  status.className = 'sim-status loading';

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
    }
    status.textContent = 'Done';
    status.className = 'sim-status done';
  } catch (error) {
    status.textContent = error.message || 'Render failed';
    status.className = 'sim-status error';
  }
}

async function renderAll() {
  if (!state.sourceImage) {
    setMessage('Upload or load a sample image first.', 'error');
    return;
  }
  setControlState(false);
  dom.processBtn.textContent = 'Rendering...';
  clearMessage();
  setMessage('Rendering simulation previews. This may take a second for large images.', 'info');

  const sourceSize = getRenderSize(state.sourceImage);
  state.renderSize = sourceSize;

  const sourceCtx = dom.sourceCanvas.getContext('2d');
  dom.sourceCanvas.width = sourceSize.width;
  dom.sourceCanvas.height = sourceSize.height;
  sourceCtx.clearRect(0, 0, sourceSize.width, sourceSize.height);

  sourceCtx.drawImage(state.sourceImage, 0, 0, sourceSize.width, sourceSize.height);
  showSourceMeta(state.sourceName, sourceSize.width, sourceSize.height);

  for (const mode of allModes) {
    await renderMode(mode, sourceSize);
  }
  dom.processBtn.textContent = 'Render simulations';
  setControlState(true);
  setMessage('All simulations rendered.', 'success');
  dom.exportNote.textContent = 'Tip: take full-page screenshots of each simulation card for submission gallery images.';
}

function syncHexWithPicker(picker, hexInput) {
  picker.addEventListener('input', (event) => {
    hexInput.value = event.target.value.toUpperCase();
  });
  hexInput.addEventListener('input', () => {
    const value = hexInput.value.trim();
    if (/^#?[0-9a-fA-F]{3}$/.test(value)) {
      const normalized = value.startsWith('#')
        ? value
        : `#${value}`;
      picker.value = `#${normalized[1]}${normalized[1]}${normalized[2]}${normalized[2]}${normalized[3]}${normalized[3]}`;
      return;
    }
    if (/^#?[0-9a-fA-F]{6}$/.test(value)) {
      const normalized = value.startsWith('#')
        ? value
        : `#${value}`;
      picker.value = normalized;
    }
  });
}

function renderContrastResult() {
  try {
    const text = parseHexColor(dom.contrastText.value);
    const bg = parseHexColor(dom.contrastBg.value);
    const result = evaluateContrast(text, bg);
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
    setMessage(error.message, 'error');
    return null;
  }
}

function renderSuggestions() {
  const result = renderContrastResult();
  if (!result) {
    return;
  }
  let suggestions;
  try {
    suggestions = suggestAccessiblePairs(dom.contrastText.value, dom.contrastBg.value, 4.5, 6);
  } catch (error) {
    setMessage(error.message, 'error');
    return;
  }

  dom.suggestionWrap.innerHTML = '';
  suggestions.forEach((pair) => {
    const card = document.createElement('button');
    card.type = 'button';
    card.className = 'palette-card';
    card.innerHTML = `<span>Text: ${pair.text.toUpperCase()}</span><span>BG: ${pair.background.toUpperCase()}</span><span>${pair.ratio.toFixed(2)}:1</span>`;

    card.style.setProperty('--text', pair.text);
    card.style.setProperty('--bg', pair.background);
    card.addEventListener('click', () => {
      dom.contrastText.value = pair.text;
      dom.contrastBg.value = pair.background;
      dom.contrastTextHex.value = pair.text.toUpperCase();
      dom.contrastBgHex.value = pair.background.toUpperCase();
      renderContrastResult();
      setMessage('Applied suggested palette.', 'success');
    });

    dom.suggestionWrap.appendChild(card);
  });
}

function readImageAndRender(file) {
  return withImageFromFile(file)
    .then((image) => {
      state.sourceImage = image;
      state.sourceName = file.name || 'uploaded-image';
      return renderAll();
    })
    .catch((error) => {
      setMessage(error.message, 'error');
      setControlState(false);
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
  setControlState(false);

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
  dom.contrastBtn.addEventListener('click', renderContrastResult);
  dom.suggestBtn.addEventListener('click', renderSuggestions);

  syncHexWithPicker(dom.contrastText, dom.contrastTextHex);
  syncHexWithPicker(dom.contrastBg, dom.contrastBgHex);
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
