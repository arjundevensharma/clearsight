import {
  CVD_MODES,
  formatBytes,
  rgbToHex,
  evaluateContrast,
  calculateImpactPercent,
  parseHexColor,
  getDemoScriptText,
  getSubmissionChecklistText,
  suggestAccessiblePairs,
  transformImageDataWithMatrix,
} from './js/vision-core.js';

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;
const MAX_PREVIEW_WIDTH = 680;
const MAX_SOURCE_DIMENSION = 5000;
const SUPPORTED_IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.bmp', '.avif'];

const HEX_HEX_RE = /^#?([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;
const IMPACT_LEVEL = {
  high: 18,
  medium: 10,
};
const COMPARE_DEFAULT_PERCENT = 50;
const SIMULATION_SEVERITY_DEFAULT_PERCENT = 100;
const TOP_IMPACT_FILTER_LIMIT = 3;
const CONTACT_SHEET_MAX_TILE_WIDTH = 420;
const CONTACT_SHEET_COLUMNS = 3;
const CONTACT_SHEET_GUTTER = 20;
const CONTACT_SHEET_LABEL_HEIGHT = 44;
const AA_THRESHOLD_DEFAULT = 4.5;
const AA_THRESHOLD_LARGE_TEXT = 3;
const AAA_THRESHOLD_DEFAULT = 7;
const COLOR_PICKER_TARGET_TEXT = 'text';
const COLOR_PICKER_TARGET_BACKGROUND = 'background';
const COLOR_PICKER_SOURCE_CLASS = 'is-picking-color';
const SETTINGS_STORAGE_KEY = 'clearsight-settings-v1';
const RENDER_PROGRESS_TIMEOUT_MS = 900;

function yieldToNextAnimationFrame() {
  return new Promise((resolve) => {
    if (typeof requestAnimationFrame !== 'function') {
      resolve();
      return;
    }
    requestAnimationFrame(() => resolve());
  });
}

const state = {
  sourceImage: null,
  sourceName: '',
  renderSize: { width: 0, height: 0 },
  sourceImageData: null,
  isRendering: false,
  hasRenderedSource: false,
  modeImpacts: [],
  lastContrastResult: null,
  lastSuggestionPairs: [],
  simulationSeverityPercent: SIMULATION_SEVERITY_DEFAULT_PERCENT,
  pendingSeverityRerender: false,
  currentContrastAaThreshold: AA_THRESHOLD_DEFAULT,
  activeColorPickerTarget: null,
  showTopImpactOnly: false,
};

let simulationSeverityRerenderTimer = null;
let modalReturnFocusElement = null;
let renderProgressHideTimer = null;

function getStoredSettings() {
  try {
    if (typeof localStorage === 'undefined') {
      return null;
    }

    const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') {
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}

function persistUserSettings() {
  try {
    if (typeof localStorage === 'undefined') {
      return;
    }

    const payload = {
      globalComparePercent: clampComparePercent(dom.globalCompareSlider?.value || COMPARE_DEFAULT_PERCENT),
      simulationSeverityPercent: clampSeverityPercent(
        state.simulationSeverityPercent || dom.simulationSeveritySlider?.value || SIMULATION_SEVERITY_DEFAULT_PERCENT,
      ),
      contrastTextHex: normalizeHexInput(dom.contrastTextHex?.value || dom.contrastText?.value),
      contrastBgHex: normalizeHexInput(dom.contrastBgHex?.value || dom.contrastBg?.value),
      largeTextMode: Boolean(dom.contrastLargeText?.checked),
    };

    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(payload));
  } catch {
    // Ignore storage failures; persistence is optional.
  }
}

function applyPersistedUserSettings() {
  const settings = getStoredSettings();
  if (!settings || typeof settings !== 'object') {
    return;
  }

  if (typeof settings.globalComparePercent === 'number') {
    syncGlobalCompare(settings.globalComparePercent);
  }

  if (typeof settings.simulationSeverityPercent === 'number') {
    syncSimulationSeverity(settings.simulationSeverityPercent);
  }

  const textHex = normalizeHexInput(settings.contrastTextHex);
  if (textHex) {
    dom.contrastText.value = textHex;
    if (dom.contrastTextHex) {
      dom.contrastTextHex.value = textHex.toUpperCase();
    }
  }

  const bgHex = normalizeHexInput(settings.contrastBgHex);
  if (bgHex) {
    dom.contrastBg.value = bgHex;
    if (dom.contrastBgHex) {
      dom.contrastBgHex.value = bgHex.toUpperCase();
    }
  }

  if (dom.contrastLargeText && typeof settings.largeTextMode === 'boolean') {
    dom.contrastLargeText.checked = settings.largeTextMode;
  }
}

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
  clearWorkspaceBtn: document.getElementById('clearWorkspaceBtn'),
  downloadAllBtn: document.getElementById('downloadAllBtn'),
  downloadContactBtn: document.getElementById('downloadContactBtn'),
  downloadReportBtn: document.getElementById('downloadReportBtn'),
  downloadSummaryBtn: document.getElementById('downloadSummaryBtn'),
  downloadReportCsvBtn: document.getElementById('downloadReportCsvBtn'),
  downloadTopImpactBtn: document.getElementById('downloadTopImpactBtn'),
  downloadPackageBtn: document.getElementById('downloadPackageBtn'),
  message: document.getElementById('message'),
  sourceCanvas: document.getElementById('sourceCanvas'),
  sourceInfo: document.getElementById('sourceInfo'),
  simGrid: document.getElementById('simGrid'),
  contrastText: document.getElementById('contrastText'),
  contrastBg: document.getElementById('contrastBg'),
  contrastTextHex: document.getElementById('contrastTextHex'),
  contrastBgHex: document.getElementById('contrastBgHex'),
  contrastLargeText: document.getElementById('contrastLargeText'),
  pickTextColorBtn: document.getElementById('pickTextColorBtn'),
  pickBgColorBtn: document.getElementById('pickBgColorBtn'),
  imageDropzone: document.getElementById('imageDropzone'),
  contrastOut: document.getElementById('contrastOut'),
  contrastBtn: document.getElementById('contrastBtn'),
  suggestBtn: document.getElementById('suggestBtn'),
  suggestionWrap: document.getElementById('suggestions'),
  copySummaryBtn: document.getElementById('copySummaryBtn'),
  copyJudgeSnapshotBtn: document.getElementById('copyJudgeSnapshotBtn'),
  simPlaceholder: document.getElementById('simEmptyState'),
  impactSummary: document.getElementById('impactSummary'),
  contrastValidation: document.getElementById('contrastValidation'),
  accessibilitySummary: document.getElementById('accessibilitySummary'),
  judgeSnapshot: document.getElementById('judgeSnapshot'),
  copyDemoScriptBtn: document.getElementById('copyDemoScriptBtn'),
  copyChecklistBtn: document.getElementById('copyChecklistBtn'),
  demoCopyStatus: document.getElementById('demoCopyStatus'),
  globalCompareSlider: document.getElementById('globalCompareSlider'),
  globalCompareValue: document.getElementById('globalCompareValue'),
  simulationSeveritySlider: document.getElementById('simulationSeveritySlider'),
  simulationSeverityValue: document.getElementById('simulationSeverityValue'),
  topImpactFilterBtn: document.getElementById('topImpactFilterBtn'),
  openTopImpactBtn: document.getElementById('openTopImpactBtn'),
  previewModal: document.getElementById('previewModal'),
  previewModalBackdrop: document.getElementById('previewModalBackdrop'),
  previewModalContent: document.querySelector('.preview-modal-content'),
  previewModalTitle: document.getElementById('previewModalTitle'),
  previewModalMeta: document.getElementById('previewModalMeta'),
  previewModalImage: document.getElementById('previewModalImage'),
  previewModalDownloadBtn: document.getElementById('previewModalDownloadBtn'),
  previewModalCloseBtn: document.getElementById('previewModalCloseBtn'),
  renderProgress: document.getElementById('renderProgress'),
  renderProgressBar: document.getElementById('renderProgressBar'),
  renderProgressFill: document.getElementById('renderProgressFill'),
  renderProgressLabel: document.getElementById('renderProgressLabel'),
  shortcutHelp: document.getElementById('shortcutHelp'),
};

function getImpactLevel(impactPercent) {
  if (impactPercent === null || Number.isNaN(impactPercent)) {
    return 'neutral';
  }
  if (impactPercent >= IMPACT_LEVEL.high) {
    return 'high';
  }
  if (impactPercent >= IMPACT_LEVEL.medium) {
    return 'medium';
  }
  return 'low';
}

function setImpactSummary(stats = []) {
  if (!dom.impactSummary) {
    return;
  }

  if (!stats.length) {
    dom.impactSummary.innerHTML = '<p>Run simulations to reveal visual-impact ranking.</p>';
    return;
  }

  const withImpact = stats.filter((entry) => typeof entry.impactPercent === 'number');
  if (!withImpact.length) {
    dom.impactSummary.innerHTML =
      '<p>Simulations rendered. Impact metrics will appear when source statistics are available.</p>';
    return;
  }

  const ordered = [...withImpact].sort((a, b) => b.impactPercent - a.impactPercent);
  const lead = ordered[0];
  const chips = ordered
    .slice(0, 5)
    .map(
      (entry) =>
        `<span class="impact-pill impact-${entry.impactLevel}">
          <span>${entry.label}</span>
          <strong>${entry.impactPercent.toFixed(1)}%</strong>
        </span>`,
    )
    .join('');

  dom.impactSummary.innerHTML = `
    <p>High-impact order: ${lead.label} leads at ${lead.impactPercent.toFixed(1)}%.</p>
    <div class="impact-pill-row">${chips}</div>
  `;
}

function getTopImpactEntry() {
  const withImpact = state.modeImpacts.filter((entry) => typeof entry.impactPercent === 'number');
  if (!withImpact.length) {
    return null;
  }

  return [...withImpact].sort((a, b) => b.impactPercent - a.impactPercent)[0];
}

function getOverallRiskLevel(impactLevel, contrastResult) {
  if (impactLevel === 'high' || (contrastResult && !contrastResult.passesAA)) {
    return 'high';
  }

  if (impactLevel === 'medium') {
    return 'medium';
  }

  if (impactLevel === 'low' || (contrastResult && contrastResult.passesAA && contrastResult.passesAAA)) {
    return 'low';
  }

  if (impactLevel) {
    return impactLevel;
  }

  if (contrastResult) {
    return contrastResult.passesAA ? 'low' : 'high';
  }

  return 'neutral';
}

function renderAccessibilitySummary() {
  const summary = dom.accessibilitySummary;
  if (!summary) {
    return;
  }

  const topImpact = getTopImpactEntry();
  const topImpactLevel = topImpact?.impactLevel || 'neutral';
  const overallLevel = getOverallRiskLevel(topImpactLevel, state.lastContrastResult);
  const levelLabel = {
    high: 'High',
    medium: 'Moderate',
    low: 'Low',
    neutral: 'Not available',
  };
  const bullets = [];

  if (topImpact) {
    bullets.push(
      `Highest simulated change: <strong>${topImpact.label}</strong> (${topImpact.impactPercent.toFixed(1)}% pixel delta).`,
    );
    if (topImpact.impactPercent >= IMPACT_LEVEL.high) {
      bullets.push('Prioritize this mode first in your accessibility review.');
    }
  } else if (state.hasRenderedSource) {
    bullets.push('Simulations are rendered; run all renderers to compute visual impact ranking.');
  }

  if (state.lastContrastResult) {
    bullets.push(
      `Contrast: <strong>${state.lastContrastResult.ratio.toFixed(1)}:1</strong> (AA ${state.currentContrastAaThreshold === AA_THRESHOLD_LARGE_TEXT ? '3.0' : '4.5'}:1 ${state.lastContrastResult.passesAA ? 'PASS' : 'FAIL'}, AAA 7:1 ${state.lastContrastResult.passesAAA ? 'PASS' : 'FAIL'}).`,
    );
    if (!state.lastContrastResult.passesAA) {
      const requiredAa = state.currentContrastAaThreshold === AA_THRESHOLD_LARGE_TEXT ? 3 : 4.5;
      bullets.push(`Raise contrast to at least ${requiredAa.toFixed(1)}:1 to satisfy AA baseline requirements.`);
    }
  } else {
    bullets.push('Run the contrast checker to add WCAG validation to this snapshot.');
  }

  if (!state.sourceImage) {
    bullets.unshift('Upload or load an image, render simulations, and run a contrast check to activate this summary.');
  }

  summary.classList.remove('risk-high', 'risk-medium', 'risk-low', 'risk-neutral');
  summary.classList.add(`risk-${overallLevel}`);
  summary.innerHTML = `
    <p class="summary-title">Accessibility health: <strong>${levelLabel[overallLevel]}</strong></p>
    <ul class="summary-list">${bullets.map((bullet) => `<li>${bullet}</li>`).join('')}</ul>
  `;
  updateJudgeQuickSnapshot();
}

function buildJudgeQuickSummaryText() {
  if (!state.sourceImage) {
    return 'Load an image and render simulations to generate a judge snapshot.';
  }

  if (!state.hasRenderedSource || !state.modeImpacts.length) {
    return 'Render simulations to populate judge snapshot details.';
  }

  const report = buildAccessibilityReport();
  const lines = [];
  const sourceFile = report.source.fileName || 'Untitled source image';
  lines.push(`Judge snapshot — ${sourceFile}`);
  lines.push(
    `Rendered size: ${report.source.renderedSize.width || 0}×${report.source.renderedSize.height || 0}px`,
  );
  lines.push(`Simulation intensity: ${report.simulationIntensity}%`);

  if (report.topImpactMode) {
    lines.push(
      `Top impact: ${report.topImpactMode.label} (${report.topImpactMode.impactPercent?.toFixed(1)}% pixel change)`,
    );
  } else {
    lines.push('Top impact: not available');
  }

  if (report.contrast.lastChecked) {
    const status = report.contrast.lastChecked.passesAA ? 'PASS' : 'FAIL';
    lines.push(
      `Contrast baseline (${report.contrast.lastChecked.aaThreshold.toFixed(1)}:1): ${status} ${report.contrast.text}/${report.contrast.background} → ${report.contrast.lastChecked.ratio.toFixed(2)}:1`,
    );
  } else {
    lines.push('Contrast check: not run');
  }

  const notableImpacts = report.simulations
    .filter((entry) => entry.impactLevel === 'high' || entry.impactLevel === 'medium')
    .slice(0, 3)
    .map(
      (entry) =>
        `${entry.label}: ${entry.impactPercent === null ? 'N/A' : `${entry.impactPercent.toFixed(1)}% change`} (${entry.impactLevel})`,
    );

  if (notableImpacts.length) {
    lines.push(`High/moderate risks: ${notableImpacts.join(' | ')}`);
  } else {
    lines.push('High/moderate risks: none detected');
  }

  if (report.suggestions.length) {
    const topPair = report.suggestions[0];
    lines.push(
      `Suggested starter pair: text ${topPair.text} on ${topPair.background} (${topPair.ratio.toFixed(2)}:1)`,
    );
  } else {
    lines.push('Suggested starter pair: none generated yet');
  }

  return lines.join('\n');
}

function updateJudgeQuickSnapshot() {
  if (!dom.judgeSnapshot) {
    return;
  }

  dom.judgeSnapshot.textContent = buildJudgeQuickSummaryText();
}

function setMessage(text, type = 'info') {
  dom.message.textContent = text;
  dom.message.dataset.type = text ? type : '';
}

function setRenderProgress(current = 0, total = 0, label = '') {
  if (!dom.renderProgress || !dom.renderProgressBar || !dom.renderProgressFill || !dom.renderProgressLabel) {
    return;
  }

  if (renderProgressHideTimer) {
    clearTimeout(renderProgressHideTimer);
    renderProgressHideTimer = null;
  }

  const safeTotal = Number.isFinite(total) ? Math.floor(total) : 0;
  const safeCurrent = Number.isFinite(current) ? Math.floor(current) : 0;

  if (!safeTotal || safeTotal <= 0) {
    dom.renderProgress.hidden = true;
    dom.renderProgressLabel.textContent = '';
    dom.renderProgressFill.style.width = '0%';
    dom.renderProgressBar.setAttribute('aria-valuemin', '0');
    dom.renderProgressBar.setAttribute('aria-valuemax', '0');
    dom.renderProgressBar.setAttribute('aria-valuenow', '0');
    return;
  }

  const clampedCurrent = Math.max(0, Math.min(safeCurrent, safeTotal));
  const percent = Math.round((clampedCurrent / safeTotal) * 100);

  dom.renderProgress.hidden = false;
  dom.renderProgressLabel.textContent = `${label} (${clampedCurrent}/${safeTotal})`;
  dom.renderProgressFill.style.width = `${percent}%`;
  dom.renderProgressBar.setAttribute('aria-valuemin', '0');
  dom.renderProgressBar.setAttribute('aria-valuemax', String(safeTotal));
  dom.renderProgressBar.setAttribute('aria-valuenow', String(clampedCurrent));

  if (clampedCurrent >= safeTotal) {
    renderProgressHideTimer = setTimeout(() => {
      if (!state.isRendering) {
        setRenderProgress(0, 0);
      }
    }, RENDER_PROGRESS_TIMEOUT_MS);
  }
}

function clearMessage() {
  dom.message.textContent = '';
  dom.message.dataset.type = '';
}

function setDemoCopyStatus(text) {
  dom.demoCopyStatus.textContent = text;
}

function clearDemoCopyStatus() {
  setDemoCopyStatus('');
}

function closePreviewModal() {
  if (!dom.previewModal || !dom.previewModalImage) {
    return;
  }

  dom.previewModal.hidden = true;
  dom.previewModal.setAttribute('aria-hidden', 'true');
  dom.previewModalImage.src = '';
  dom.previewModalImage.removeAttribute('src');
  document.body.style.overflow = '';

  if (modalReturnFocusElement && typeof modalReturnFocusElement.focus === 'function') {
    modalReturnFocusElement.focus();
  }
  modalReturnFocusElement = null;
}

function setShortcutHelp(open) {
  if (!dom.shortcutHelp) {
    return;
  }

  const nextState = Boolean(open);
  if (nextState) {
    dom.shortcutHelp.setAttribute('open', '');
    const summary = dom.shortcutHelp.querySelector('summary');
    if (summary && typeof summary.focus === 'function') {
      summary.focus();
    }
  } else {
    dom.shortcutHelp.removeAttribute('open');
  }
}

function toggleShortcutHelp() {
  if (!dom.shortcutHelp) {
    return;
  }
  setShortcutHelp(!dom.shortcutHelp.open);
}

function getModeImpactById(modeId) {
  return state.modeImpacts.find((entry) => entry.modeId === modeId);
}

function getModalFocusableElements() {
  if (!dom.previewModalContent) {
    return [];
  }

  return Array.from(
    dom.previewModalContent.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
    ),
  ).filter((element) => element instanceof HTMLElement && !element.disabled);
}

function focusFirstModalElement() {
  const focusables = getModalFocusableElements();
  const target = focusables[0] || dom.previewModalCloseBtn;
  if (target) {
    target.focus();
  }
}

function trapPreviewModalFocus(event) {
  if (!event || event.key !== 'Tab' || !dom.previewModal || dom.previewModal.hidden) {
    return;
  }

  const focusables = getModalFocusableElements();
  if (!focusables.length) {
    event.preventDefault();
    if (dom.previewModalCloseBtn) {
      dom.previewModalCloseBtn.focus();
    }
    return;
  }

  const first = focusables[0];
  const last = focusables[focusables.length - 1];
  const current = document.activeElement;

  if (event.shiftKey && current === first) {
    event.preventDefault();
    last.focus();
    return;
  }

  if (!event.shiftKey && current === last) {
    event.preventDefault();
    first.focus();
  }
}

function isTypingTarget(element) {
  return (
    element instanceof HTMLElement &&
    ['INPUT', 'TEXTAREA', 'SELECT'].includes(element.tagName) &&
    !element.disabled
  );
}

function setColorPickerTarget(target) {
  const sourceCanvasClass = dom.sourceCanvas?.classList;
  if (sourceCanvasClass) {
    if (target) {
      sourceCanvasClass.add(COLOR_PICKER_SOURCE_CLASS);
    } else {
      sourceCanvasClass.remove(COLOR_PICKER_SOURCE_CLASS);
    }
  }

  state.activeColorPickerTarget = target;

  if (dom.pickTextColorBtn) {
    dom.pickTextColorBtn.setAttribute('aria-pressed', target === COLOR_PICKER_TARGET_TEXT ? 'true' : 'false');
  }
  if (dom.pickBgColorBtn) {
    dom.pickBgColorBtn.setAttribute('aria-pressed', target === COLOR_PICKER_TARGET_BACKGROUND ? 'true' : 'false');
  }

  if (!target) {
    dom.pickTextColorBtn?.classList?.remove('is-active');
    dom.pickBgColorBtn?.classList?.remove('is-active');
    return;
  }

  const label =
    target === COLOR_PICKER_TARGET_TEXT ? 'text color' : 'background color';
  setMessage(`Color picker enabled: click source image for ${label}.`, 'info');
  if (target === COLOR_PICKER_TARGET_TEXT) {
    dom.pickTextColorBtn?.classList?.add('is-active');
  } else {
    dom.pickBgColorBtn?.classList?.add('is-active');
  }
}

function startColorPicker(target) {
  if (!state.hasRenderedSource) {
    setMessage('Render the source image first before picking colors.', 'error');
    return;
  }

  const nextTarget = state.activeColorPickerTarget === target ? null : target;
  setColorPickerTarget(nextTarget);
}

function clearColorPicker() {
  if (!state.activeColorPickerTarget) {
    return;
  }
  setColorPickerTarget(null);
}

function setContrastColor(target, hexColor) {
  if (!hexColor) {
    return;
  }
  if (target === COLOR_PICKER_TARGET_TEXT) {
    dom.contrastText.value = hexColor;
    dom.contrastTextHex.value = hexColor.toUpperCase();
    persistUserSettings();
    return;
  }

  dom.contrastBg.value = hexColor;
  dom.contrastBgHex.value = hexColor.toUpperCase();
  persistUserSettings();
}

function getSourceCanvasPixelColor(event) {
  if (!state.sourceImageData || !dom.sourceCanvas) {
    return null;
  }

  const rect = dom.sourceCanvas.getBoundingClientRect();
  const scaleX = dom.sourceCanvas.width / rect.width;
  const scaleY = dom.sourceCanvas.height / rect.height;
  const x = Math.floor((event.clientX - rect.left) * scaleX);
  const y = Math.floor((event.clientY - rect.top) * scaleY);

  if (x < 0 || y < 0 || x >= dom.sourceCanvas.width || y >= dom.sourceCanvas.height) {
    return null;
  }

  const index = (y * dom.sourceCanvas.width + x) * 4;
  const data = state.sourceImageData.data;
  if (!data || index + 2 >= data.length) {
    return null;
  }

  return rgbToHex({
    r: data[index],
    g: data[index + 1],
    b: data[index + 2],
  });
}

function runIfAvailable(button, actionName, action) {
  if (!button) {
    setMessage(`${actionName} is unavailable.`, 'error');
    return;
  }
  if (button.disabled) {
    setMessage(`${actionName} is currently unavailable.`, 'info');
    return;
  }

  action();
}

function runKeyboardShortcut(event) {
  if (!event) {
    return;
  }

  const key = event.key.toLowerCase();

  if (key === 'escape') {
    if (dom.shortcutHelp?.open) {
      setShortcutHelp(false);
      setMessage('Keyboard shortcut help closed.', 'info');
      return;
    }
    if (!dom.previewModal?.hidden) {
      closePreviewModal();
      return;
    }
    if (state.activeColorPickerTarget) {
      clearColorPicker();
      setMessage('Color picker canceled.', 'info');
      return;
    }
  }

  if (!dom.previewModal?.hidden && event.key === 'Tab') {
    trapPreviewModalFocus(event);
    return;
  }

  if (!dom.previewModal?.hidden) {
    return;
  }

  if (isTypingTarget(event.target) || event.target?.isContentEditable) {
    return;
  }

  const shortcutActions = {
    r: () => runIfAvailable(dom.processBtn, 'Render simulations', () => renderAll()),
    u: () => runIfAvailable(dom.demoUi, 'Load demo UI', () => dom.demoUi.click()),
    d: () => runIfAvailable(dom.demoDashboard, 'Load demo dashboard', () => dom.demoDashboard.click()),
    c: () => runIfAvailable(dom.contrastBtn, 'Contrast check', () => dom.contrastBtn.click()),
    a: () => runIfAvailable(dom.suggestBtn, 'Palette suggestion', () => dom.suggestBtn.click()),
    s: () => runIfAvailable(dom.copyJudgeSnapshotBtn, 'Judge snapshot copy', () => dom.copyJudgeSnapshotBtn.click()),
    j: () => runIfAvailable(dom.downloadSummaryBtn, 'Judge summary export', () => dom.downloadSummaryBtn.click()),
    p: () => openTopImpactPreview(),
    t: () => startColorPicker(COLOR_PICKER_TARGET_TEXT),
    b: () => startColorPicker(COLOR_PICKER_TARGET_BACKGROUND),
  };

  if (!shortcutActions[key]) {
    if (key === '?' || key === 'h') {
      toggleShortcutHelp();
      setMessage(
        dom.shortcutHelp?.open ? 'Keyboard shortcut help opened.' : 'Keyboard shortcut help closed.',
        'info',
      );
      return;
    }

    return;
  }

  event.preventDefault();
  shortcutActions[key]();
}

function openPreviewModal({ modeId, label, canvas }) {
  if (!dom.previewModal || !dom.previewModalTitle || !dom.previewModalMeta || !dom.previewModalImage) {
    setMessage('Preview modal is unavailable in this browser.', 'error');
    return;
  }

  if (!canvas || !canvas.width || !canvas.height) {
    setMessage('Render this simulation before previewing it.', 'error');
    return;
  }

  const impact = getModeImpactById(modeId);
  const impactText =
    typeof impact?.impactPercent === 'number'
      ? `${impact.impactPercent.toFixed(1)}% pixel delta`
      : 'Impact pending';

  dom.previewModalTitle.textContent = `${label} preview`;
  dom.previewModalMeta.textContent = `${impactText} • ${canvas.width}×${canvas.height}px`;
  dom.previewModalImage.alt = `${label} preview image`;
  dom.previewModalImage.src = canvas.toDataURL('image/png');
  dom.previewModal.hidden = false;
  dom.previewModal.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';
  modalReturnFocusElement = document.activeElement instanceof HTMLElement ? document.activeElement : null;
  focusFirstModalElement();

  if (dom.previewModalDownloadBtn) {
    dom.previewModalDownloadBtn.onclick = () => {
      try {
        downloadCanvasAsImage(canvas, makeExportFileName(modeId));
        setMessage(`Downloaded ${label} preview.`, 'success');
      } catch (error) {
        setMessage(error.message, 'error');
      }
    };
  }

  if (dom.previewModalCloseBtn) {
    dom.previewModalCloseBtn.focus();
  }
}

function setDropzoneActive(active) {
  if (!dom.imageDropzone) {
    return;
  }
  dom.imageDropzone.classList.toggle('drag-over', Boolean(active));
}

async function copyTextToClipboard(text) {
  if (!text) {
    return false;
  }

  if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // fall back to textarea copy below
    }
  }

  if (typeof document === 'undefined') {
    return false;
  }

  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.setAttribute('aria-hidden', 'true');
  textarea.style.position = 'fixed';
  textarea.style.opacity = '0';
  textarea.style.pointerEvents = 'none';
  document.body.appendChild(textarea);
  textarea.focus();
  textarea.select();

  try {
    return Boolean(document.execCommand('copy'));
  } finally {
    document.body.removeChild(textarea);
  }
}

function getImageFromClipboardData(clipboardData) {
  if (!clipboardData || !clipboardData.items) {
    return null;
  }

  const imageItem = Array.from(clipboardData.items).find(
    (item) => item.kind === 'file' && item.type.startsWith('image/'),
  );
  return imageItem ? imageItem.getAsFile() : null;
}

function handleImageInput(file, contextLabel) {
  if (!file) {
    setMessage('No valid image file found. Use PNG, JPG, WebP, or GIF.', 'error');
    return;
  }

  const fileLabel = file.name || 'Image';
  setMessage(
    `${contextLabel ? `${contextLabel}: ` : ''}${fileLabel}. Rendering...`,
    'info',
  );
  readImageAndRender(file);
}

function setDefaultSuggestionsState() {
  dom.suggestionWrap.innerHTML = '';
  const placeholder = document.createElement('p');
  placeholder.className = 'muted';
  placeholder.textContent = 'Run a contrast check to generate accessible replacement pairs.';
  dom.suggestionWrap.appendChild(placeholder);
}

function setContrastValidation(text) {
  dom.contrastValidation.textContent = text;
}

function clearContrastValidation() {
  setContrastValidation('');
}

function setImageControlsEnabled(enabled) {
  dom.processBtn.disabled = !enabled;
  dom.downloadSourceBtn.disabled = !enabled || !state.hasRenderedSource;
  dom.downloadAllBtn.disabled = !enabled || !state.hasRenderedSource;
  if (dom.downloadContactBtn) {
    dom.downloadContactBtn.disabled = !enabled || !state.hasRenderedSource;
  }
  if (dom.downloadTopImpactBtn) {
    dom.downloadTopImpactBtn.disabled = !enabled || !state.hasRenderedSource;
  }
  if (dom.downloadReportBtn) {
    dom.downloadReportBtn.disabled = !enabled || !state.hasRenderedSource;
  }
  if (dom.downloadSummaryBtn) {
    dom.downloadSummaryBtn.disabled = !enabled || !state.hasRenderedSource;
  }
  if (dom.downloadReportCsvBtn) {
    dom.downloadReportCsvBtn.disabled = !enabled || !state.hasRenderedSource;
  }
  if (dom.downloadPackageBtn) {
    dom.downloadPackageBtn.disabled = !enabled || !state.hasRenderedSource;
  }
  if (dom.globalCompareSlider) {
    dom.globalCompareSlider.disabled = !enabled;
  }
  if (dom.simulationSeveritySlider) {
    dom.simulationSeveritySlider.disabled = !enabled;
  }
  if (dom.topImpactFilterBtn) {
    dom.topImpactFilterBtn.disabled = !enabled || !state.sourceImage;
  }
  if (dom.openTopImpactBtn) {
    dom.openTopImpactBtn.disabled = !enabled || !state.hasRenderedSource;
  }
  if (dom.clearWorkspaceBtn) {
    dom.clearWorkspaceBtn.disabled = !enabled || !state.sourceImage;
  }
}

function setSimPlaceholderVisible(visible) {
  if (!dom.simPlaceholder) {
    return;
  }
  dom.simPlaceholder.hidden = !visible;
}

function clearWorkspace({ notify = true } = {}) {
  state.sourceImage = null;
  state.sourceName = '';
  state.renderSize = { width: 0, height: 0 };
  state.sourceImageData = null;
  state.isRendering = false;
  state.hasRenderedSource = false;
  state.modeImpacts = [];
  state.lastContrastResult = null;
  state.lastSuggestionPairs = [];
  state.currentContrastAaThreshold = AA_THRESHOLD_DEFAULT;
  state.showTopImpactOnly = false;
  clearColorPicker();
  state.pendingSeverityRerender = false;
  if (simulationSeverityRerenderTimer) {
    clearTimeout(simulationSeverityRerenderTimer);
    simulationSeverityRerenderTimer = null;
  }

  if (dom.imageInput) {
    dom.imageInput.value = '';
  }

  closePreviewModal();

  const sourceCtx = dom.sourceCanvas.getContext('2d');
  if (sourceCtx) {
    sourceCtx.clearRect(0, 0, dom.sourceCanvas.width, dom.sourceCanvas.height);
  }
  dom.sourceInfo.textContent = 'No image loaded';
  dom.exportNote.textContent = '';
  renderAccessibilitySummary();
  setRenderProgress(0, 0);

  renderModeCards();
  applyTopImpactFilter();
  setSimPlaceholderVisible(true);
  setImpactSummary([]);
  dom.contrastOut.textContent = '';
  setDefaultSuggestionsState();
  clearContrastValidation();
  syncGlobalCompare(COMPARE_DEFAULT_PERCENT);
  setImageControlsEnabled(false);
  updateTopImpactPreviewButton();
  setControlState(true);

  if (notify) {
    setMessage('Workspace reset. Upload or load an image to begin.', 'info');
  }
}

function markSimulationCardsPending() {
  const globalCompareValue = Number(dom.globalCompareSlider?.value) || COMPARE_DEFAULT_PERCENT;
  const cards = dom.simGrid.querySelectorAll('.sim-card');
  cards.forEach((card) => {
    const status = card.querySelector('.sim-status');
    const actionButtons = card.querySelectorAll('.tiny-btn');
    const slider = card.querySelector('.sim-compare-slider');
    const rank = card.querySelector('.sim-rank');
    card.classList.remove('impact-high', 'impact-medium', 'impact-low');
    if (status) {
      status.textContent = 'Waiting for source';
      status.className = 'sim-status';
    }
    actionButtons.forEach((button) => {
      button.disabled = true;
    });
    if (slider) {
      slider.disabled = true;
      slider.value = String(globalCompareValue);
    }
    syncSingleCompareControl(card, globalCompareValue, { updateLabel: true });
    if (rank) {
      rank.hidden = true;
      rank.textContent = '';
    }
  });
}

function clampComparePercent(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return COMPARE_DEFAULT_PERCENT;
  }
  return Math.min(100, Math.max(0, Math.round(numeric)));
}

function clampSeverityPercent(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return SIMULATION_SEVERITY_DEFAULT_PERCENT;
  }
  return Math.min(100, Math.max(0, Math.round(numeric)));
}

function syncSimulationSeverity(percent) {
  const normalized = clampSeverityPercent(percent);
  if (!dom.simulationSeveritySlider || !dom.simulationSeverityValue) {
    state.simulationSeverityPercent = normalized;
    persistUserSettings();
    return normalized;
  }

  dom.simulationSeveritySlider.value = String(normalized);
  dom.simulationSeverityValue.textContent = `${normalized}%`;
  state.simulationSeverityPercent = normalized;
  persistUserSettings();
  return normalized;
}

function getSimulationSeverityPercent() {
  return syncSimulationSeverity(dom.simulationSeveritySlider?.value ?? state.simulationSeverityPercent);
}

function queueSimulationSeverityRerender() {
  if (!state.sourceImage || !state.hasRenderedSource) {
    return;
  }

  if (simulationSeverityRerenderTimer) {
    clearTimeout(simulationSeverityRerenderTimer);
  }

  const severity = getSimulationSeverityPercent();
  setMessage(`Applying ${severity}% simulation intensity...`, 'info');

  simulationSeverityRerenderTimer = setTimeout(() => {
    simulationSeverityRerenderTimer = null;

    if (state.isRendering) {
      state.pendingSeverityRerender = true;
      return;
    }

    state.pendingSeverityRerender = false;
    Promise.resolve(renderAll())
      .catch((error) => {
        setMessage(error.message, 'error');
      })
      .finally(() => {
        if (state.pendingSeverityRerender) {
          state.pendingSeverityRerender = false;
          queueSimulationSeverityRerender();
        }
      });
  }, 250);
}

function clampAndBlendChannel(baseChannel, transformedChannel, intensityPercent) {
  const blended = baseChannel + (transformedChannel - baseChannel) * (intensityPercent / 100);
  return Math.min(255, Math.max(0, Math.round(blended)));
}

function applySimulationIntensity(baseData, candidateData, intensityPercent = SIMULATION_SEVERITY_DEFAULT_PERCENT) {
  const normalized = clampSeverityPercent(intensityPercent);
  if (normalized === 100) {
    return;
  }

  if (!baseData || !candidateData || baseData.length !== candidateData.length) {
    throw new Error('Cannot apply simulation intensity: source and simulation data are not aligned.');
  }

  if (normalized === 0) {
    for (let i = 0; i < baseData.length; i += 1) {
      candidateData[i] = baseData[i];
    }
    return;
  }

  for (let i = 0; i < baseData.length; i += 4) {
    candidateData[i] = clampAndBlendChannel(baseData[i], candidateData[i], normalized);
    candidateData[i + 1] = clampAndBlendChannel(baseData[i + 1], candidateData[i + 1], normalized);
    candidateData[i + 2] = clampAndBlendChannel(baseData[i + 2], candidateData[i + 2], normalized);
    candidateData[i + 3] = baseData[i + 3];
  }
}

function syncSingleCompareControl(card, percent, { updateLabel = false } = {}) {
  const slider = card.querySelector('.sim-compare-slider');
  const overlay = card.querySelector('.sim-overlay');
  const divider = card.querySelector('.sim-compare-divider');
  const compareValue = card.querySelector('.sim-compare-value');
  const normalized = clampComparePercent(percent);

  if (slider) {
    slider.value = String(normalized);
  }
  if (overlay) {
    overlay.style.width = `${normalized}%`;
  }
  if (divider) {
    divider.style.left = `${normalized}%`;
  }
  if (compareValue && updateLabel) {
    compareValue.textContent = `${normalized}%`;
  }

  return normalized;
}

function syncGlobalCompare(percent) {
  if (!dom.globalCompareSlider || !dom.globalCompareValue) {
    return;
  }

  const normalized = clampComparePercent(percent);
  dom.globalCompareSlider.value = String(normalized);
  dom.globalCompareValue.textContent = `${normalized}%`;

  const cards = [...dom.simGrid.querySelectorAll('.sim-card')];
  cards.forEach((card) => syncSingleCompareControl(card, normalized, { updateLabel: true }));
  persistUserSettings();
}

function setSimCardRank(card, rankNumber) {
  const rank = card.querySelector('.sim-rank');
  if (!rank) {
    return;
  }

  if (!Number.isFinite(rankNumber) || rankNumber <= 0) {
    rank.hidden = true;
    rank.textContent = '';
    return;
  }

  rank.textContent = `#${rankNumber}`;
  rank.hidden = false;
}

function reorderSimulationCardsByImpact(results = state.modeImpacts) {
  const cards = [...dom.simGrid.querySelectorAll('.sim-card')];
  const cardByMode = new Map(cards.map((card) => [card.dataset.mode, card]));

  const ordered = results
    .map((entry, index) => {
      const card = cardByMode.get(entry.modeId);
      if (!card) {
        return null;
      }
      return {
        ...entry,
        index,
        card,
      };
    })
    .filter(Boolean);

  ordered.sort((a, b) => {
    const aHasImpact = typeof a.impactPercent === 'number';
    const bHasImpact = typeof b.impactPercent === 'number';
    if (aHasImpact && bHasImpact) {
      if (a.impactPercent !== b.impactPercent) {
        return b.impactPercent - a.impactPercent;
      }
      return a.index - b.index;
    }
    if (aHasImpact) {
      return -1;
    }
    if (bHasImpact) {
      return 1;
    }
    return a.index - b.index;
  });

  let rank = 1;
  ordered.forEach((entry) => {
    const hasImpact = typeof entry.impactPercent === 'number';
    setSimCardRank(entry.card, hasImpact ? rank : null);
    if (hasImpact) {
      rank += 1;
    }
    dom.simGrid.append(entry.card);
  });
}

function getTopImpactModeIds(limit = TOP_IMPACT_FILTER_LIMIT) {
  const candidates = state.modeImpacts.filter((entry) => typeof entry.impactPercent === 'number');
  const safeLimit = Number.isFinite(Number(limit))
    ? Math.max(1, Math.min(candidates.length, Math.floor(Number(limit))))
    : TOP_IMPACT_FILTER_LIMIT;

  if (!candidates.length || !safeLimit) {
    return [];
  }

  return [...candidates]
    .sort((a, b) => b.impactPercent - a.impactPercent)
    .slice(0, safeLimit)
    .map((entry) => entry.modeId);
}

function applyTopImpactFilter({ announce = false } = {}) {
  const cards = [...dom.simGrid.querySelectorAll('.sim-card')];
  if (!dom.topImpactFilterBtn || !cards.length) {
    if (dom.topImpactFilterBtn) {
      dom.topImpactFilterBtn.setAttribute('aria-pressed', 'false');
      dom.topImpactFilterBtn.classList.remove('is-active');
      dom.topImpactFilterBtn.textContent = 'Show top-impact simulations only';
      dom.topImpactFilterBtn.disabled = !state.sourceImage;
    }
    return;
  }

  const topImpactModeIds = new Set(getTopImpactModeIds());
  const hasImpactData = topImpactModeIds.size > 0;

  if (!state.showTopImpactOnly || !hasImpactData) {
    state.showTopImpactOnly = false;
    cards.forEach((card) => {
      card.classList.remove('is-filtered-out');
    });
    dom.topImpactFilterBtn.setAttribute('aria-pressed', 'false');
    dom.topImpactFilterBtn.classList.remove('is-active');
    dom.topImpactFilterBtn.textContent = 'Show top-impact simulations only';
    dom.topImpactFilterBtn.disabled = !state.hasRenderedSource || !state.modeImpacts.length;
    return;
  }

  cards.forEach((card) => {
    card.classList.toggle('is-filtered-out', !topImpactModeIds.has(card.dataset.mode));
  });
  dom.topImpactFilterBtn.setAttribute('aria-pressed', 'true');
  dom.topImpactFilterBtn.classList.add('is-active');
  dom.topImpactFilterBtn.textContent = `Showing top ${topImpactModeIds.size} simulations`;
  dom.topImpactFilterBtn.disabled = false;

  if (announce) {
    setMessage(`Showing top ${topImpactModeIds.size} high-impact simulations.`, 'info');
  }
}

function updateTopImpactPreviewButton() {
  if (!dom.openTopImpactBtn) {
    return;
  }

  const topImpact = getTopImpactEntry();
  if (!topImpact || !state.hasRenderedSource) {
    dom.openTopImpactBtn.disabled = true;
    dom.openTopImpactBtn.textContent = 'Inspect highest-impact simulation';
    dom.openTopImpactBtn.setAttribute('aria-label', 'Inspect highest-impact simulation');
    return;
  }

  dom.openTopImpactBtn.disabled = false;
  dom.openTopImpactBtn.textContent = `Inspect ${topImpact.label}`;
  dom.openTopImpactBtn.setAttribute(
    'aria-label',
    `Inspect highest-impact simulation: ${topImpact.label}`,
  );
}

function toggleTopImpactFilter() {
  if (!state.hasRenderedSource || !state.modeImpacts.length) {
    setMessage('Render simulations first before filtering by impact.', 'info');
    return;
  }

  if (!state.modeImpacts.some((entry) => typeof entry.impactPercent === 'number')) {
    setMessage('Impact values are not available yet. Re-render simulations to recalculate.', 'error');
    return;
  }

  state.showTopImpactOnly = !state.showTopImpactOnly;
  applyTopImpactFilter({ announce: true });
}

function openTopImpactPreview() {
  const topImpact = getTopImpactEntry();
  if (!topImpact) {
    setMessage('Render simulations first to generate a top-impact ranking.', 'info');
    return;
  }

  const card = dom.simGrid.querySelector(`[data-mode="${topImpact.modeId}"]`);
  if (!card) {
    setMessage('Highest-impact simulation card is not available right now.', 'error');
    return;
  }

  const canvas = card.querySelector('.sim-canvas');
  if (!canvas || !canvas.width || !canvas.height) {
    setMessage('Highest-impact simulation is not ready yet. Render simulations first.', 'info');
    return;
  }

  openPreviewModal({
    modeId: topImpact.modeId,
    label: topImpact.label,
    canvas,
  });
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

function makeExportFileName(mode = 'source', extension = 'png') {
  const safeExtension = String(extension || 'png')
    .trim()
    .replace(/^\./, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');

  return `${getSafeFileName(state.sourceName || 'clearsight-source')}-${mode}.${safeExtension || 'png'}`;
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

function downloadTextFile(content, filename, mimeType = 'text/plain;charset=utf-8;') {
  const blob = new Blob([content], { type: mimeType });
  const fileUrl = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = fileUrl;
  link.download = filename;
  link.rel = 'noopener';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(fileUrl);
}

function createModeCard(mode) {
  const card = document.createElement('figure');
  card.className = 'sim-card';
  card.dataset.mode = mode.id;

  const header = document.createElement('div');
  header.className = 'sim-card-header';

  const titleWrap = document.createElement('div');
  titleWrap.className = 'sim-title-wrap';

  const title = document.createElement('figcaption');
  title.textContent = mode.label;
  title.className = 'sim-title';

  const rank = document.createElement('span');
  rank.className = 'sim-rank';
  rank.hidden = true;

  titleWrap.append(title, rank);

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

  const inspectBtn = document.createElement('button');
  inspectBtn.type = 'button';
  inspectBtn.className = 'tiny-btn sim-inspect-btn';
  inspectBtn.textContent = 'Inspect';
  inspectBtn.disabled = true;
  inspectBtn.setAttribute('aria-label', `Open ${mode.label} full-size preview`);
  inspectBtn.addEventListener('click', () => {
    const canvas = card.querySelector('.sim-canvas');
    openPreviewModal({
      modeId: mode.id,
      label: mode.label,
      canvas,
    });
  });

  const actions = document.createElement('div');
  actions.className = 'sim-card-actions';
  actions.append(downloadBtn, inspectBtn);

  header.append(titleWrap, actions);

  const compareWrap = document.createElement('div');
  compareWrap.className = 'sim-compare';

  const sourceCanvas = document.createElement('canvas');
  sourceCanvas.className = 'sim-source-canvas';
  sourceCanvas.setAttribute('aria-hidden', 'true');

  const overlay = document.createElement('div');
  overlay.className = 'sim-overlay';
  overlay.style.width = `${COMPARE_DEFAULT_PERCENT}%`;

  const divider = document.createElement('span');
  divider.className = 'sim-compare-divider';
  divider.style.left = `${COMPARE_DEFAULT_PERCENT}%`;

  const canvas = document.createElement('canvas');
  canvas.className = 'sim-canvas';
  canvas.setAttribute('role', 'img');
  canvas.setAttribute('aria-label', `${mode.label} preview`);
  overlay.append(canvas);

  const compareValue = document.createElement('span');
  compareValue.className = 'sim-compare-value';
  compareValue.textContent = `${COMPARE_DEFAULT_PERCENT}%`;

  const slider = document.createElement('input');
  slider.type = 'range';
  slider.min = '0';
  slider.max = '100';
  slider.value = String(COMPARE_DEFAULT_PERCENT);
  slider.className = 'sim-compare-slider';
  slider.disabled = true;
  slider.setAttribute('aria-label', `${mode.label} source-to-sim overlay comparison`);
  slider.addEventListener('input', () => {
    syncSingleCompareControl(card, slider.value, { updateLabel: true });
  });

  const compareRow = document.createElement('div');
  compareRow.className = 'sim-compare-row';
  compareRow.append(slider, compareValue);

  compareWrap.append(sourceCanvas, overlay, divider);

  const status = document.createElement('p');
  status.className = 'sim-status';
  status.textContent = 'Pending';

  card.append(header, compareWrap, compareRow, status);
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
    throw new Error(
      `Image is too large (${formatBytes(file.size)}). Maximum supported size is ${formatBytes(MAX_FILE_SIZE_BYTES)}.`,
    );
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
    persistUserSettings();
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
      persistUserSettings();
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
    return null;
  }

  const canvas = card.querySelector('.sim-canvas');
  const status = card.querySelector('.sim-status');
  const actionButtons = card.querySelectorAll('.tiny-btn');
  const sourceCanvas = card.querySelector('.sim-source-canvas');
  const slider = card.querySelector('.sim-compare-slider');
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  const sourceCtx = sourceCanvas?.getContext('2d', { willReadFrequently: true });
  let impactPercent = null;
  let impactLevel = 'neutral';
  const simulationSeverity = getSimulationSeverityPercent();

  canvas.width = sourceSize.width;
  canvas.height = sourceSize.height;
  if (sourceCanvas) {
    sourceCanvas.width = sourceSize.width;
    sourceCanvas.height = sourceSize.height;
  }
  card.classList.remove('is-done', 'is-error');
  card.classList.remove('impact-high', 'impact-medium', 'impact-low');
  status.textContent = 'Rendering...';
  status.className = 'sim-status loading';
  actionButtons.forEach((button) => {
    button.disabled = true;
  });
  if (slider) {
    slider.disabled = true;
  }
  const globalComparePercent = Number(dom.globalCompareSlider?.value);
  syncSingleCompareControl(card, Number.isFinite(globalComparePercent) ? globalComparePercent : slider?.value, {
    updateLabel: true,
  });

  try {
    if (!sourceCanvas || !sourceCtx) {
      throw new Error('Missing source canvas for comparison preview.');
    }
    sourceCtx.clearRect(0, 0, sourceCanvas.width, sourceCanvas.height);
    sourceCtx.drawImage(state.sourceImage, 0, 0, sourceSize.width, sourceSize.height);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (mode.kind === 'matrix') {
      const sourceData = state.sourceImageData?.data;
      const transformedData = sourceData
        ? new ImageData(new Uint8ClampedArray(sourceData), sourceSize.width, sourceSize.height)
        : null;

      if (!transformedData) {
        throw new Error('Missing source image data for matrix simulation.');
      }

      transformImageDataWithMatrix(transformedData, mode.matrix);
      applySimulationIntensity(state.sourceImageData?.data, transformedData.data, simulationSeverity);
      ctx.putImageData(transformedData, 0, 0);
      impactPercent = calculateImpactPercent(sourceData, transformedData.data);
    } else if (mode.kind === 'filter') {
      ctx.filter = mode.filter;
      ctx.drawImage(state.sourceImage, 0, 0, sourceSize.width, sourceSize.height);
      const filteredData = ctx.getImageData(0, 0, sourceSize.width, sourceSize.height);
      applySimulationIntensity(state.sourceImageData?.data, filteredData.data, simulationSeverity);
      impactPercent = calculateImpactPercent(state.sourceImageData?.data, filteredData.data);
      ctx.filter = 'none';
    } else {
      throw new Error('Unknown simulation mode type.');
    }

    impactLevel = getImpactLevel(impactPercent);
    if (impactLevel !== 'neutral') {
      card.classList.add(`impact-${impactLevel}`);
    }
    status.textContent =
      impactPercent === null ? 'Done' : `Done · ${impactPercent.toFixed(1)}% pixel change`;
    status.className = 'sim-status done';
    card.classList.add('is-done');
    actionButtons.forEach((button) => {
      button.disabled = false;
    });
    if (slider) {
      slider.disabled = false;
    }

    return {
      modeId: mode.id,
      label: mode.label,
      impactPercent,
      impactLevel,
    };
  } catch (error) {
    ctx.filter = 'none';
    status.textContent = error.message || 'Render failed';
    status.className = 'sim-status error';
    card.classList.add('is-error');
    actionButtons.forEach((button) => {
      button.disabled = true;
    });
    return {
      modeId: mode.id,
      label: mode.label,
      impactPercent: null,
      impactLevel: 'neutral',
    };
  }
}

async function renderAll() {
  if (!state.sourceImage) {
    setMessage('Upload or load a sample image first.', 'error');
    return;
  }
  if (state.isRendering) {
    setMessage('Rendering is already in progress.', 'info');
    return;
  }

  state.isRendering = true;
  state.hasRenderedSource = false;
  state.modeImpacts = [];
  state.showTopImpactOnly = false;
  const totalModes = allModes.length;
  clearColorPicker();
  markSimulationCardsPending();
  applyTopImpactFilter();
  setSimPlaceholderVisible(false);
  setRenderProgress(0, totalModes, 'Starting simulation render');

  setControlState(true);
  setImageControlsEnabled(false);
  dom.processBtn.textContent = 'Rendering...';
  clearMessage();
  clearContrastValidation();
  const simulationSeverity = syncSimulationSeverity(dom.simulationSeveritySlider?.value || SIMULATION_SEVERITY_DEFAULT_PERCENT);
  dom.sourceInfo.textContent = 'Rendering source...';
  setMessage(`Rendering simulation previews at ${simulationSeverity}% intensity.`, 'info');

  try {
    const sourceSize = getRenderSize(state.sourceImage);
    state.renderSize = sourceSize;

    const sourceCtx = dom.sourceCanvas.getContext('2d');
    dom.sourceCanvas.width = sourceSize.width;
    dom.sourceCanvas.height = sourceSize.height;
    sourceCtx.clearRect(0, 0, sourceSize.width, sourceSize.height);
    sourceCtx.drawImage(state.sourceImage, 0, 0, sourceSize.width, sourceSize.height);
    state.sourceImageData = sourceCtx.getImageData(0, 0, sourceSize.width, sourceSize.height);
    state.hasRenderedSource = true;
    showSourceMeta(state.sourceName, sourceSize.width, sourceSize.height);
    for (let modeIndex = 0; modeIndex < allModes.length; modeIndex += 1) {
      const mode = allModes[modeIndex];
      setRenderProgress(modeIndex + 1, totalModes, `Rendering ${mode.label}`);
      await yieldToNextAnimationFrame();
      // eslint-disable-next-line no-await-in-loop
      const result = await renderMode(mode, sourceSize);
      if (result) {
        state.modeImpacts.push(result);
      }
    }
    setRenderProgress(totalModes, totalModes, 'Render complete');

    setImageControlsEnabled(true);
    dom.processBtn.textContent = 'Render simulations';
    const sortedByImpact = [...state.modeImpacts]
      .filter((entry) => typeof entry.impactPercent === 'number')
      .sort((a, b) => b.impactPercent - a.impactPercent);
    reorderSimulationCardsByImpact(state.modeImpacts);
    setImpactSummary(sortedByImpact);
    applyTopImpactFilter();
    updateTopImpactPreviewButton();

  const topImpact = sortedByImpact[0];
    if (topImpact) {
      setMessage(
        `All simulations rendered. Highest impact: ${topImpact.label} (${topImpact.impactPercent.toFixed(1)}%).`,
        'success',
      );
    } else {
      setMessage('All simulations rendered.', 'success');
    }
    dom.exportNote.textContent = 'Tip: download previews for quick submission screenshots.';
    renderAccessibilitySummary();
  } catch (error) {
    dom.processBtn.textContent = 'Render simulations';
    setRenderProgress(0, 0);
    setMessage(error.message || 'Failed to complete rendering.', 'error');
  } finally {
    state.isRendering = false;
    const shouldRerenderSeverity = state.pendingSeverityRerender;
    state.pendingSeverityRerender = false;
    setImageControlsEnabled(Boolean(state.sourceImage));
    applyTopImpactFilter();
    syncGlobalCompare(dom.globalCompareSlider?.value || COMPARE_DEFAULT_PERCENT);
    if (!state.modeImpacts.length) {
      setImpactSummary([]);
    }
    updateTopImpactPreviewButton();
    setSimPlaceholderVisible(!state.hasRenderedSource);
    if (shouldRerenderSeverity) {
      queueSimulationSeverityRerender();
    }
    if (!state.hasRenderedSource) {
      setRenderProgress(0, 0);
    }
  }
}

function downloadAllPreviews() {
  if (state.isRendering) {
    setMessage('Please wait for rendering to finish before downloading.', 'info');
    return;
  }
  if (!state.hasRenderedSource) {
    setMessage('Render the source first before exporting.', 'error');
    return;
  }

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
      const canvas = card.querySelector('.sim-canvas');
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

function collectCompletedExportCards({ limitByImpact = null } = {}) {
  const source = {
    id: 'source',
    label: 'Source',
    canvas: dom.sourceCanvas,
    impactPercent: null,
    impactLevel: 'neutral',
  };

  const simulations = [...dom.simGrid.querySelectorAll('.sim-card')]
    .map((card) => {
      const status = card.querySelector('.sim-status');
      const canvas = card.querySelector('.sim-canvas');
      const modeId = card.dataset.mode;
      if (!card.classList.contains('is-done') || !status || !canvas) {
        return null;
      }
      if (!canvas.width || !canvas.height) {
        return null;
      }
      const impact = state.modeImpacts.find((entry) => entry.modeId === modeId);

      return {
        id: modeId,
        label: card.querySelector('.sim-title')?.textContent || modeId,
        canvas,
        impactPercent: impact?.impactPercent ?? null,
        impactLevel: impact?.impactLevel ?? 'neutral',
      };
    })
    .filter(Boolean);
  const hasLimit =
    Number.isFinite(Number(limitByImpact)) && Number(limitByImpact) > 0;
  const safeLimit = hasLimit ? Math.floor(Number(limitByImpact)) : 0;
  const orderedSimulations = hasLimit
    ? [...simulations].sort((a, b) => {
        const aHasImpact = typeof a.impactPercent === 'number';
        const bHasImpact = typeof b.impactPercent === 'number';
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
      }).slice(0, safeLimit)
    : simulations;

  return [source, ...orderedSimulations].filter((entry) => entry.canvas?.width && entry.canvas?.height);
}

function makeTopImpactExportFileName(mode = 'source') {
  return `${getSafeFileName(state.sourceName || 'clearsight-source')}-top-impact-${mode}.png`;
}

function buildContactSheet(entries) {
  const sourceWidth = state.renderSize.width || dom.sourceCanvas.width || 1;
  const sourceHeight = state.renderSize.height || dom.sourceCanvas.height || 1;
  const targetTileWidth = Math.min(CONTACT_SHEET_MAX_TILE_WIDTH, sourceWidth);
  const scale = targetTileWidth / sourceWidth;
  const targetTileHeight = Math.max(1, Math.round(sourceHeight * scale));

  const sourceEntry = entries.find((entry) => entry.id === 'source');
  const simulationEntries = entries
    .filter((entry) => entry.id !== 'source')
    .sort((a, b) => {
      const aHasImpact = typeof a.impactPercent === 'number';
      const bHasImpact = typeof b.impactPercent === 'number';
      if (aHasImpact && bHasImpact) {
        if (a.impactPercent !== b.impactPercent) {
          return b.impactPercent - a.impactPercent;
        }
      }
      if (aHasImpact) {
        return -1;
      }
      if (bHasImpact) {
        return 1;
      }
      return 0;
    });

  const orderedEntries = [sourceEntry || entries[0], ...simulationEntries].filter(Boolean);
  const columns = Math.min(CONTACT_SHEET_COLUMNS, orderedEntries.length);
  const rows = Math.ceil(orderedEntries.length / columns);
  const totalWidth =
    columns * targetTileWidth + (columns + 1) * CONTACT_SHEET_GUTTER;
  const headerHeight = 88;
  const totalHeight =
    headerHeight +
    rows * (targetTileHeight + CONTACT_SHEET_LABEL_HEIGHT + CONTACT_SHEET_GUTTER) +
    rows * CONTACT_SHEET_GUTTER;

  const contactSheet = document.createElement('canvas');
  contactSheet.width = totalWidth;
  contactSheet.height = totalHeight;
  const sheetCtx = contactSheet.getContext('2d', { willReadFrequently: true });
  sheetCtx.fillStyle = '#ffffff';
  sheetCtx.fillRect(0, 0, totalWidth, totalHeight);

  sheetCtx.fillStyle = '#0f172a';
  sheetCtx.font = '600 18px Poppins, "Segoe UI", system-ui, -apple-system, sans-serif';
  sheetCtx.fillText('ClearSight Accessibility Simulations', CONTACT_SHEET_GUTTER, 34);
  const sourceLabel =
    state.sourceName && state.sourceName.trim() ? state.sourceName : 'source-image';
  sheetCtx.font = '500 14px Poppins, "Segoe UI", system-ui, -apple-system, sans-serif';
  sheetCtx.fillStyle = '#475569';
  sheetCtx.fillText(`Source: ${sourceLabel} • ${sourceWidth}x${sourceHeight}`, CONTACT_SHEET_GUTTER, 58);

  sheetCtx.font = '500 11px Poppins, "Segoe UI", system-ui, -apple-system, sans-serif';
  sheetCtx.fillStyle = '#64748b';
  sheetCtx.fillText(
    'Simulations are ranked by visual impact for quick prioritization.',
    CONTACT_SHEET_GUTTER,
    72,
  );

  orderedEntries.forEach((entry, idx) => {
    const col = idx % columns;
    const row = Math.floor(idx / columns);
    const x = CONTACT_SHEET_GUTTER + col * (targetTileWidth + CONTACT_SHEET_GUTTER);
    const y =
      headerHeight +
      row * (targetTileHeight + CONTACT_SHEET_LABEL_HEIGHT + CONTACT_SHEET_GUTTER) +
      CONTACT_SHEET_GUTTER;

    sheetCtx.fillStyle = '#f8fafc';
    sheetCtx.strokeStyle = '#cbd5e1';
    sheetCtx.lineWidth = 1;
    sheetCtx.fillRect(
      x,
      y,
      targetTileWidth,
      targetTileHeight + CONTACT_SHEET_LABEL_HEIGHT,
    );
    sheetCtx.strokeRect(
      x,
      y,
      targetTileWidth,
      targetTileHeight + CONTACT_SHEET_LABEL_HEIGHT,
    );

    sheetCtx.drawImage(entry.canvas, x, y, targetTileWidth, targetTileHeight);

    const labelY = y + targetTileHeight + 18;
    sheetCtx.fillStyle = '#334155';
    sheetCtx.font = '600 12px Poppins, "Segoe UI", system-ui, -apple-system, sans-serif';
    const rankText = idx === 0 ? 'Source' : `#${idx}`;
    const impactText =
      typeof entry.impactPercent === 'number'
        ? `${entry.impactPercent.toFixed(1)}% pixel delta`
        : 'Impact unavailable';

    sheetCtx.fillText(`${rankText}. ${entry.label}`, x + 8, labelY, targetTileWidth - 12);

    sheetCtx.font = '500 10px Poppins, "Segoe UI", system-ui, -apple-system, sans-serif';
    sheetCtx.fillStyle = '#475569';
    sheetCtx.fillText(impactText, x + 8, labelY + 15, targetTileWidth - 12);
  });

  return contactSheet;
}

function downloadContactSheet() {
  if (state.isRendering) {
    setMessage('Please wait for rendering to finish before generating contact sheet.', 'info');
    return;
  }
  if (!state.hasRenderedSource) {
    setMessage('Render the source and simulations first before exporting.', 'error');
    return;
  }

  const entries = collectCompletedExportCards();
  if (entries.length < 2) {
    setMessage('Render at least one simulation before creating a contact sheet.', 'error');
    return;
  }

  try {
    const contactSheet = buildContactSheet(entries);
    downloadCanvasAsImage(contactSheet, makeExportFileName('contact-sheet'));
    setMessage(`Exported contact sheet (${entries.length} tiles).`, 'success');
  } catch (error) {
    setMessage(error.message, 'error');
  }
}

function downloadTopImpactPack() {
  if (state.isRendering) {
    setMessage('Please wait for rendering to finish before generating the top-impact pack.', 'info');
    return;
  }
  if (!state.hasRenderedSource) {
    setMessage('Render the source and simulations first before exporting top-impact previews.', 'error');
    return;
  }

  const entries = collectCompletedExportCards({ limitByImpact: 3 });
  const simulationEntries = entries.filter((entry) => entry.id !== 'source');

  if (!simulationEntries.length) {
    setMessage('Render at least one simulation before creating a top-impact pack.', 'error');
    return;
  }

  try {
    downloadCanvasAsImage(dom.sourceCanvas, makeTopImpactExportFileName('source'));
    simulationEntries.forEach((entry) => {
      downloadCanvasAsImage(entry.canvas, makeTopImpactExportFileName(entry.id));
    });

    const contactSheet = buildContactSheet(entries);
    downloadCanvasAsImage(contactSheet, makeTopImpactExportFileName('contact-sheet'));
    setMessage(
      `Exported top-impact pack: source plus ${simulationEntries.length} high-priority simulation${simulationEntries.length === 1 ? '' : 's'}.`,
      'success',
    );
  } catch (error) {
    setMessage(error.message, 'error');
  }
}

function downloadSubmissionPackage() {
  if (state.isRendering) {
    setMessage('Please wait for rendering to finish before generating the submission package.', 'info');
    return;
  }
  if (!state.hasRenderedSource) {
    setMessage('Render the source and simulations first before downloading a package.', 'error');
    return;
  }

  const entries = collectCompletedExportCards();
  const simulationEntries = entries.filter((entry) => entry.id !== 'source');

  if (simulationEntries.length < 1) {
    setMessage('Render at least one simulation before creating a submission package.', 'error');
    return;
  }

  try {
    entries.forEach((entry) => {
      downloadCanvasAsImage(entry.canvas, `${getSafeFileName(state.sourceName || 'clearsight-source')}-${entry.id}.png`);
    });

    const contactSheet = buildContactSheet(entries);
    downloadCanvasAsImage(contactSheet, makeExportFileName('submission-contact-sheet'));

    const report = buildAccessibilityReport();
    downloadTextFile(
      JSON.stringify(report, null, 2),
      makeExportFileName('submission-report', 'json'),
      'application/json;charset=utf-8',
    );
    const markdown = buildJudgeSummaryMarkdown();
    downloadTextFile(
      markdown,
      makeExportFileName('judge-summary', 'md'),
      'text/markdown;charset=utf-8',
    );

    setMessage(
      `Submission package exported: ${entries.length} visuals, contact sheet, JSON report, and judge summary.`,
      'success',
    );
  } catch (error) {
    setMessage(error.message, 'error');
  }
}

function buildAccessibilityReport() {
  const simulationImpacts = [...state.modeImpacts]
    .map((entry) => ({
      id: entry.modeId,
      label: entry.label,
      impactPercent:
        typeof entry.impactPercent === 'number' ? Number(entry.impactPercent.toFixed(2)) : null,
      impactLevel: entry.impactLevel || 'neutral',
    }))
    .sort((a, b) => {
      const aHasImpact = typeof a.impactPercent === 'number';
      const bHasImpact = typeof b.impactPercent === 'number';
      if (aHasImpact && bHasImpact) {
        if (a.impactPercent !== b.impactPercent) {
          return b.impactPercent - a.impactPercent;
        }
      }
      if (aHasImpact) {
        return -1;
      }
      if (bHasImpact) {
        return 1;
      }
      return 0;
    });

  const topImpact = simulationImpacts.find((entry) => typeof entry.impactPercent === 'number') || null;
  const contrastText = (dom.contrastTextHex?.value || dom.contrastText?.value || '#0F172A').toUpperCase();
  const contrastBg = (dom.contrastBgHex?.value || dom.contrastBg?.value || '#FFFFFF').toUpperCase();

  return {
    generatedAt: new Date().toISOString(),
    source: {
      fileName: state.sourceName,
      renderedSize: {
        width: state.renderSize.width,
        height: state.renderSize.height,
      },
      hasRenderedSource: Boolean(state.hasRenderedSource),
    },
    simulationIntensity: state.simulationSeverityPercent || SIMULATION_SEVERITY_DEFAULT_PERCENT,
    simulations: simulationImpacts,
    topImpactMode: topImpact,
    contrast: {
      text: contrastText,
      background: contrastBg,
      lastChecked: state.lastContrastResult
        ? {
            ratio: Number(state.lastContrastResult.ratio.toFixed(3)),
            passesAA: state.lastContrastResult.passesAA,
            passesAAA: state.lastContrastResult.passesAAA,
            passesLAA: state.lastContrastResult.passesLAA,
            aaThreshold: state.lastContrastResult.aaThreshold ?? AA_THRESHOLD_DEFAULT,
            aaaThreshold: state.lastContrastResult.aaaThreshold ?? AAA_THRESHOLD_DEFAULT,
            largeTextMode: Boolean(dom.contrastLargeText?.checked),
          }
        : null,
    },
    suggestions: Array.isArray(state.lastSuggestionPairs)
      ? state.lastSuggestionPairs.slice(0, 8).map((pair) => ({
          text: pair.text.toUpperCase(),
          background: pair.background.toUpperCase(),
          ratio: Number(pair.ratio.toFixed(3)),
        }))
      : [],
  };
}

function toCsvCell(value) {
  const cell = value === null || value === undefined ? '' : String(value);
  if (/[",\r\n]/.test(cell)) {
    return `"${cell.replace(/"/g, '""')}"`;
  }
  return cell;
}

function buildAccessibilityReportCsv() {
  const report = buildAccessibilityReport();
  const headers = [
    'mode_id',
    'mode_label',
    'impact_percent',
    'impact_risk',
    'source_file',
    'rendered_width',
    'rendered_height',
    'simulation_intensity',
    'contrast_text',
    'contrast_background',
    'contrast_ratio',
    'passes_aa',
    'passes_aaa',
    'passes_large_text_aa',
    'aa_threshold',
    'aaa_threshold',
    'generated_at',
  ];

  const rows = report.simulations.map((entry) => [
    entry.id,
    entry.label,
    entry.impactPercent ?? '',
    entry.impactLevel,
    report.source.fileName || 'Untitled source image',
    report.source.renderedSize.width || '',
    report.source.renderedSize.height || '',
    report.simulationIntensity,
    report.contrast.text,
    report.contrast.background,
    report.contrast.lastChecked ? report.contrast.lastChecked.ratio : '',
    report.contrast.lastChecked ? (report.contrast.lastChecked.passesAA ? 'pass' : 'fail') : '',
    report.contrast.lastChecked ? (report.contrast.lastChecked.passesAAA ? 'pass' : 'fail') : '',
    report.contrast.lastChecked ? (report.contrast.lastChecked.passesLAA ? 'pass' : 'fail') : '',
    report.contrast.lastChecked ? report.contrast.lastChecked.aaThreshold : '',
    report.contrast.lastChecked ? report.contrast.lastChecked.aaaThreshold : '',
    report.generatedAt,
  ]);

  return `${headers.map(toCsvCell).join(',')}\n${rows.map((row) => row.map(toCsvCell).join(',')).join('\n')}\n`;
}

function buildJudgeSummaryMarkdown() {
  const report = buildAccessibilityReport();
  const lines = [];
  const sourceFile = report.source.fileName || 'Untitled source image';
  const topImpactLine = report.topImpactMode
    ? `- **Top impact mode:** ${report.topImpactMode.label} (${report.topImpactMode.impactPercent?.toFixed(1)}% pixel change)`
    : '- **Top impact mode:** not available';
  const contrastLine = report.contrast.lastChecked
    ? `- **Contrast check:** ${report.contrast.text} / ${report.contrast.background} → ${report.contrast.lastChecked.ratio.toFixed(2)}:1 (AA ${report.contrast.lastChecked.aaThreshold.toFixed(1)} ${report.contrast.lastChecked.passesAA ? 'PASS' : 'FAIL'} · AAA ${report.contrast.lastChecked.aaaThreshold.toFixed(1)} ${report.contrast.lastChecked.passesAAA ? 'PASS' : 'FAIL'} · Large-text AA ${report.contrast.lastChecked.passesLAA ? 'PASS' : 'FAIL'})`
    : '- **Contrast check:** not run';

  lines.push('# ClearSight Judge Summary');
  lines.push('');
  lines.push(`Generated: ${report.generatedAt}`);
  lines.push(`Source image: ${sourceFile}`);
  lines.push(
    `Rendered size: ${report.source.renderedSize.width || 0}×${report.source.renderedSize.height || 0}px`,
  );
  lines.push(`Simulation intensity: ${report.simulationIntensity}%`);
  lines.push('');
  lines.push('## Snapshot');
  lines.push('');
  lines.push(topImpactLine);
  lines.push(contrastLine);
  lines.push('');
  lines.push('## Simulation ranking by visual delta');
  lines.push('');
  lines.push('| # | Mode | Pixel change | Risk |');
  lines.push('| --- | --- | --- | --- |');

  report.simulations.forEach((entry, index) => {
    const impact = typeof entry.impactPercent === 'number' ? `${entry.impactPercent.toFixed(1)}%` : 'N/A';
    lines.push(`| ${index + 1} | ${entry.label} | ${impact} | ${entry.impactLevel} |`);
  });

  lines.push('');
  lines.push('## Suggested palette pairs');
  if (report.suggestions.length > 0) {
    report.suggestions.forEach((pair, idx) => {
      lines.push(
        `${idx + 1}. Text ${pair.text} / Background ${pair.background} (${pair.ratio.toFixed(2)}:1)`,
      );
    });
  } else {
    lines.push('No suggestions have been generated yet.');
  }

  return `${lines.join('\n')}\n`;
}

function downloadAccessibilityReport() {
  if (state.isRendering) {
    setMessage('Please wait for rendering to finish before exporting the report.', 'info');
    return;
  }
  if (!state.hasRenderedSource) {
    setMessage('Render the source first before generating an accessibility report.', 'error');
    return;
  }
  if (!state.modeImpacts.length) {
    setMessage('Render simulations first before generating an accessibility report.', 'error');
    return;
  }

  const report = buildAccessibilityReport();
  const filename = makeExportFileName('accessibility-report', 'json');
  downloadTextFile(
    JSON.stringify(report, null, 2),
    filename,
    'application/json;charset=utf-8',
  );
  setMessage(`Downloaded accessibility report (${report.simulations.length} simulations) as ${filename}.`, 'success');
}

function downloadJudgeSummary() {
  if (state.isRendering) {
    setMessage('Please wait for rendering to finish before generating the judge summary.', 'info');
    return;
  }
  if (!state.hasRenderedSource) {
    setMessage('Render the source and simulations first before generating the judge summary.', 'error');
    return;
  }
  if (!state.modeImpacts.length) {
    setMessage('Render simulations first before generating the judge summary.', 'error');
    return;
  }

  try {
    const markdown = buildJudgeSummaryMarkdown();
    const filename = makeExportFileName('judge-summary', 'md');
    downloadTextFile(markdown, filename, 'text/markdown;charset=utf-8');
    setMessage(`Downloaded judge summary as ${filename}.`, 'success');
  } catch (error) {
    setMessage(error.message, 'error');
  }
}

function downloadAccessibilityReportCsv() {
  if (state.isRendering) {
    setMessage('Please wait for rendering to finish before exporting the CSV.', 'info');
    return;
  }
  if (!state.hasRenderedSource) {
    setMessage('Render the source first before generating the CSV report.', 'error');
    return;
  }
  if (!state.modeImpacts.length) {
    setMessage('Render simulations first before generating the CSV report.', 'error');
    return;
  }

  try {
    const csv = buildAccessibilityReportCsv();
    const filename = makeExportFileName('accessibility-report', 'csv');
    downloadTextFile(csv, filename, 'text/csv;charset=utf-8');
    setMessage(`Downloaded accessibility report CSV as ${filename}.`, 'success');
  } catch (error) {
    setMessage(error.message, 'error');
  }
}

function renderContrastResult() {
  clearContrastValidation();
  try {
    const { text, background } = resolveContrastInputs();
    const aaThreshold = (dom.contrastLargeText?.checked ? AA_THRESHOLD_LARGE_TEXT : AA_THRESHOLD_DEFAULT);
    const result = evaluateContrast(text, background, aaThreshold, AAA_THRESHOLD_DEFAULT);
    const ratio = result.ratio.toFixed(2);
    state.currentContrastAaThreshold = aaThreshold;
    state.lastContrastResult = {
      ...result,
      aaThreshold,
      aaaThreshold: AAA_THRESHOLD_DEFAULT,
    };
    renderAccessibilitySummary();
    dom.contrastOut.innerHTML = `
      <span>Contrast: <strong>${ratio}:1</strong></span>
      <span>AA (${state.currentContrastAaThreshold.toFixed(1)}): <strong>${result.passesAA ? 'PASS' : 'FAIL'}</strong></span>
      <span>AAA (${state.lastContrastResult.aaaThreshold.toFixed(1)}): <strong>${result.passesAAA ? 'PASS' : 'FAIL'}</strong></span>
      <span>Large text AA: <strong>${result.passesLAA ? 'PASS' : 'FAIL'}</strong></span>
    `;
    setMessage('Contrast checked successfully.', 'success');
    return result;
  } catch (error) {
    dom.contrastOut.textContent = error.message;
    setContrastValidation(error.message);
    state.lastContrastResult = null;
    state.currentContrastAaThreshold = AA_THRESHOLD_DEFAULT;
    renderAccessibilitySummary();
    setMessage(error.message, 'error');
    return null;
  }
}

async function copyPalettePairToClipboard(pair) {
  const payload = `text: ${pair.text.toUpperCase()}\nbackground: ${pair.background.toUpperCase()}`;
  return copyTextToClipboard(payload);
}

function renderSuggestions() {
  const result = renderContrastResult();
  if (!result) {
    setDefaultSuggestionsState();
    return;
  }

  let suggestions;
  try {
    const target = state.currentContrastAaThreshold ?? AA_THRESHOLD_DEFAULT;
    suggestions = suggestAccessiblePairs(dom.contrastTextHex.value, dom.contrastBgHex.value, target, 4);
  } catch (error) {
    state.lastSuggestionPairs = [];
    setMessage(error.message, 'error');
    return;
  }

  dom.suggestionWrap.innerHTML = '';

  if (!suggestions.length) {
    const empty = document.createElement('p');
    empty.className = 'muted';
    empty.textContent = 'No replacement pairs met the target contrast threshold.';
    dom.suggestionWrap.appendChild(empty);
    state.lastSuggestionPairs = [];
    return;
  }

  state.lastSuggestionPairs = suggestions;

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
        persistUserSettings();

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

async function copyDemoText(kind) {
  const payload =
    kind === 'checklist'
      ? getSubmissionChecklistText()
      : getDemoScriptText();

  const copied = await copyTextToClipboard(payload);
  if (!copied) {
    setDemoCopyStatus('Clipboard copy is not supported in this browser. Highlight text manually if needed.');
    return;
  }
  setDemoCopyStatus(
    kind === 'checklist'
      ? 'Devpost screenshot checklist copied.'
      : 'Demo script outline copied.',
  );
}

async function copyJudgeSummary() {
  if (state.isRendering) {
    setDemoCopyStatus('Finish rendering before copying the judge summary.');
    return;
  }

  if (!state.hasRenderedSource || !state.modeImpacts.length) {
    setDemoCopyStatus(
      'Render an image and simulations before copying the judge summary.',
    );
    return;
  }

  const markdown = buildJudgeSummaryMarkdown();
  const copied = await copyTextToClipboard(markdown);
  if (!copied) {
    setDemoCopyStatus('Clipboard copy is not supported in this browser. Highlight text manually if needed.');
    return;
  }

  setDemoCopyStatus('Judge summary copied to clipboard.');
}

async function copyJudgeSnapshot() {
  if (state.isRendering) {
    setDemoCopyStatus('Finish rendering before copying the judge snapshot.');
    return;
  }

  if (!state.sourceImage || !state.hasRenderedSource || !state.modeImpacts.length) {
    setDemoCopyStatus('Render an image and simulations before copying the judge snapshot.');
    return;
  }

  const snapshot = buildJudgeQuickSummaryText();
  const copied = await copyTextToClipboard(snapshot);
  if (!copied) {
    setDemoCopyStatus('Clipboard copy is not supported in this browser. Highlight text manually if needed.');
    return;
  }

  setDemoCopyStatus('Judge snapshot copied.');
}

function readImageAndRender(file) {
  clearWorkspace({ notify: false });
  return withImageFromFile(file)
    .then((image) => {
      state.sourceImage = image;
      state.sourceName = file.name || 'uploaded-image';
      state.renderSize = { width: 0, height: 0 };
      state.sourceImageData = null;
      state.modeImpacts = [];
      state.hasRenderedSource = false;
      state.lastContrastResult = null;
      state.lastSuggestionPairs = [];
      markSimulationCardsPending();
      setSimPlaceholderVisible(true);
      dom.exportNote.textContent = '';
      clearContrastValidation();
      return renderAll();
    })
    .catch((error) => {
      setMessage(error.message, 'error');
      setImageControlsEnabled(Boolean(state.sourceImage));
      setSimPlaceholderVisible(true);
    });
}

function loadSample(type) {
  try {
    clearWorkspace({ notify: false });
    state.hasRenderedSource = false;
    state.modeImpacts = [];
    state.lastContrastResult = null;
    state.lastSuggestionPairs = [];
    state.sourceImageData = null;
    state.sourceImage = createDemoImage(type);
    state.sourceName = `${type}-sample.png`;
    setSimPlaceholderVisible(true);
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
  clearWorkspace({ notify: false });
  setControlState(true);
  clearDemoCopyStatus();

  dom.imageInput.addEventListener('change', (event) => {
    const file = event.target.files?.[0];
    if (!file) {
      setMessage('No file selected.', 'error');
      return;
    }
    if (!isSupportedImageFile(file)) {
      setMessage('The selected file is not a supported image.', 'error');
      return;
    }
    handleImageInput(file, 'Loaded image');
  });

  if (dom.imageDropzone) {
    const preventDefaults = (event) => {
      event.preventDefault();
      event.stopPropagation();
    };

    const handleDragOver = (event) => {
      preventDefaults(event);
      setDropzoneActive(true);
    };

    const handleDragLeave = (event) => {
      preventDefaults(event);
      setDropzoneActive(false);
    };

    const handleDrop = (event) => {
      preventDefaults(event);
      setDropzoneActive(false);
      const file = Array.from(event.dataTransfer?.files || []).find(isSupportedImageFile);
      if (!file) {
        setMessage('Drop failed: no supported image file found.', 'error');
        return;
      }
      handleImageInput(file, 'Dropped image');
    };

    ['dragenter', 'dragover'].forEach((type) => {
      dom.imageDropzone.addEventListener(type, handleDragOver);
    });
    dom.imageDropzone.addEventListener('dragleave', handleDragLeave);
    dom.imageDropzone.addEventListener('drop', handleDrop);
  }

  window.addEventListener('paste', (event) => {
    const file = getImageFromClipboardData(event.clipboardData);
    if (!file) {
      return;
    }
    event.preventDefault();
    handleImageInput(file, 'Pasted image');
  });

  dom.demoUi.addEventListener('click', () => loadSample('ui'));
  dom.demoDashboard.addEventListener('click', () => loadSample('dashboard'));
  dom.processBtn.addEventListener('click', renderAll);
  dom.clearWorkspaceBtn?.addEventListener('click', () => {
    clearWorkspace();
  });
  dom.downloadSourceBtn.addEventListener('click', () => {
    try {
      if (!state.sourceImage) {
        setMessage('Upload or load an image before downloading.', 'error');
        return;
      }
      if (!state.hasRenderedSource) {
        setMessage('Render the source preview before downloading.', 'error');
        return;
      }
      downloadCanvasAsImage(dom.sourceCanvas, makeExportFileName('source'));
      setMessage('Source preview downloaded.', 'success');
    } catch (error) {
      setMessage(error.message, 'error');
    }
  });
  dom.downloadAllBtn.addEventListener('click', downloadAllPreviews);
  dom.downloadContactBtn?.addEventListener('click', downloadContactSheet);
  dom.downloadTopImpactBtn?.addEventListener('click', downloadTopImpactPack);
  dom.downloadReportBtn?.addEventListener('click', downloadAccessibilityReport);
  dom.downloadReportCsvBtn?.addEventListener('click', downloadAccessibilityReportCsv);
  dom.downloadSummaryBtn?.addEventListener('click', downloadJudgeSummary);
  dom.downloadPackageBtn?.addEventListener('click', downloadSubmissionPackage);
  dom.openTopImpactBtn?.addEventListener('click', openTopImpactPreview);
  if (dom.globalCompareSlider) {
    syncGlobalCompare(dom.globalCompareSlider.value || COMPARE_DEFAULT_PERCENT);
    dom.globalCompareSlider.addEventListener('input', (event) => {
      syncGlobalCompare(event.target.value);
    });
  }
  if (dom.simulationSeveritySlider) {
    syncSimulationSeverity(dom.simulationSeveritySlider.value || SIMULATION_SEVERITY_DEFAULT_PERCENT);
    dom.simulationSeveritySlider.addEventListener('input', () => {
      const severity = syncSimulationSeverity(dom.simulationSeveritySlider.value || SIMULATION_SEVERITY_DEFAULT_PERCENT);
      if (state.sourceImage && state.hasRenderedSource) {
        queueSimulationSeverityRerender();
        return;
      }

      setMessage(`Simulation intensity set to ${severity}%.`, 'info');
    });
  }
  dom.topImpactFilterBtn?.addEventListener('click', toggleTopImpactFilter);
  dom.contrastBtn.addEventListener('click', renderContrastResult);
  dom.suggestBtn.addEventListener('click', renderSuggestions);
  dom.copyDemoScriptBtn?.addEventListener('click', () => {
    clearDemoCopyStatus();
    copyDemoText('script').catch(() => setDemoCopyStatus('Clipboard copy was interrupted.'));
  });
  dom.copyChecklistBtn?.addEventListener('click', () => {
    clearDemoCopyStatus();
    copyDemoText('checklist').catch(() => setDemoCopyStatus('Clipboard copy was interrupted.'));
  });
  dom.copySummaryBtn?.addEventListener('click', () => {
    clearDemoCopyStatus();
    copyJudgeSummary().catch(() => setDemoCopyStatus('Clipboard copy was interrupted.'));
  });
  dom.copyJudgeSnapshotBtn?.addEventListener('click', () => {
    clearDemoCopyStatus();
    copyJudgeSnapshot().catch(() => setDemoCopyStatus('Clipboard copy was interrupted.'));
  });

  if (dom.previewModalCloseBtn) {
    dom.previewModalCloseBtn.addEventListener('click', closePreviewModal);
  }
  if (dom.previewModalBackdrop) {
    dom.previewModalBackdrop.addEventListener('click', closePreviewModal);
  }
  if (dom.previewModal) {
    dom.previewModal.addEventListener('click', (event) => {
      if (!dom.previewModal || event.target === dom.previewModalContent) {
        return;
      }
      if (
        event.target === dom.previewModal ||
        event.target === dom.previewModalBackdrop ||
        event.target.getAttribute?.('data-action') === 'close'
      ) {
        closePreviewModal();
      }
    });
  }

  syncHexWithPicker(dom.contrastText, dom.contrastTextHex, 'Text');
  syncHexWithPicker(dom.contrastBg, dom.contrastBgHex, 'Background');
  dom.contrastText.addEventListener('change', () => {
    persistUserSettings();
    renderContrastResult();
  });
  dom.contrastBg.addEventListener('change', () => {
    persistUserSettings();
    renderContrastResult();
  });
  if (dom.contrastLargeText) {
    dom.contrastLargeText.addEventListener('change', () => {
      persistUserSettings();
      if (state.lastContrastResult) {
        renderContrastResult();
      }
    });
  }

  dom.pickTextColorBtn?.addEventListener('click', () => startColorPicker(COLOR_PICKER_TARGET_TEXT));
  dom.pickBgColorBtn?.addEventListener('click', () =>
    startColorPicker(COLOR_PICKER_TARGET_BACKGROUND),
  );

  dom.sourceCanvas.addEventListener('click', (event) => {
    if (!state.activeColorPickerTarget) {
      return;
    }
    event.preventDefault();
    const pickedColor = getSourceCanvasPixelColor(event);
    if (!pickedColor) {
      return;
    }

    const normalized = normalizeHexInput(pickedColor);
    if (!normalized) {
      setMessage('Picked color could not be parsed.', 'error');
      return;
    }

    setContrastColor(state.activeColorPickerTarget, normalized);
    clearContrastValidation();
    renderContrastResult();
    setMessage(
      `Picked ${state.activeColorPickerTarget === COLOR_PICKER_TARGET_TEXT ? 'text' : 'background'} color: ${normalized.toUpperCase()}.`,
      'success',
    );
    clearColorPicker();
  });

  window.addEventListener('keydown', (event) => {
    runKeyboardShortcut(event);
  });

  renderAccessibilitySummary();

  dom.contrastText.value = '#0f172a';
  dom.contrastBg.value = '#ffffff';
  dom.contrastTextHex.value = '#0F172A';
  dom.contrastBgHex.value = '#FFFFFF';
  if (dom.contrastLargeText) {
    dom.contrastLargeText.checked = false;
  }

  applyPersistedUserSettings();

  renderContrastResult();
  setMessage('Upload an image or use a demo to begin.', 'info');
}

window.addEventListener('DOMContentLoaded', init);
