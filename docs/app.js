import {
  CVD_MODES,
  formatBytes,
  rgbToHex,
  evaluateContrast,
  calculateImpactPercent,
  createVisualDifferenceHeatmap,
  parseHexColor,
  getDemoScriptText,
  getSubmissionChecklistText,
  suggestAccessiblePairs,
  transformImageDataWithMatrix,
  extractDominantColors,
  buildPaletteContrastMatrix,
  findCvdColorCollisions,
  buildAccessibleRecolorPlan,
  applyPaletteRemapToImageData,
  detectTextLikeRegions,
  scanComponentSurfaceContrast,
  scanTargetSizes,
  planComponentSurfaceRepair,
  applyComponentSurfaceContrastFix,
  buildCssFixSheet,
  applyTextRegionContrastFix,
  sampleRegionContrast,
  orderVisionReelSegments,
  applyFieldLossMask,
  projectContrastAcrossCvdModes,
  rankSuggestionsByCvdSafety,
  compareWcagVsApca,
  computeAccessibilityScore,
  auditImageAccessibility,
  buildBatchAuditCsv,
  summarizeBatchAudit,
  compareBatchAuditToBaseline,
  analyzeFlashRisk,
  analyzeFocusIndicator,
  analyzeFocusSequence,
  createFocusSequenceTracker,
  trackFocusSequenceFrame,
  summarizeFocusSequence,
  planVideoFrameSampling,
  computeFrameSignature,
  evaluateWalkthroughFrame,
  WALKTHROUGH_KEYFRAME_DEFAULTS,
  buildPdfReport,
  buildAuditPdfDoc,
  buildPortfolioPdfDoc,
  buildShareableAuditPayload,
  parseShareableAuditPayload,
  buildConformanceStatementMarkdown,
  encodeQrMatrix,
  QR_ENCODE_DEFAULTS,
} from './js/vision-core.js';

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;
const MAX_PREVIEW_WIDTH = 680;
const MAX_SOURCE_DIMENSION = 5000;
const MAX_UPLOADED_IMAGE_DIMENSION = 12000;
const BATCH_AUDIT_MAX_FILES = 12;
const BATCH_AUDIT_MAX_DIMENSION = 1600;
const BATCH_AUDIT_IDLE_STATUS =
  'No batch yet — pick up to 12 screenshots, score the two built-in demo screens instantly, or record a walkthrough of your live app.';
const WALKTHROUGH_SAMPLE_INTERVAL_MS = 600;
const WALKTHROUGH_MAX_DURATION_MS = 120000;
const WALKTHROUGH_SIGNATURE_WIDTH = 96;
const WALKTHROUGH_FRAME_MAX_DIMENSION = 2400;
const WALKTHROUGH_FLASH_SAMPLE_INTERVAL_MS = 100;
const WALKTHROUGH_FLASH_MAX_FRAMES = 240;
const WALKTHROUGH_FLASH_MAX_DIMENSION = 320;
const FLASH_SCAN_MAX_FRAMES = 240;
const FLASH_SCAN_MAX_DIMENSION = 320;
const FLASH_SCAN_VIDEO_SAMPLE_FPS = 10;
const FLASH_SCAN_IDLE_STATUS =
  'No animation or video scanned yet. Danger zone: more than 3 flashes per second covering 25% or more of the frame.';
const SUPPORTED_IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.bmp', '.avif', '.svg'];
const SUPPORTED_IMAGE_FORMATS_LABEL = [...new Set(SUPPORTED_IMAGE_EXTENSIONS.map((extension) => extension.slice(1).toUpperCase()))].join(
  ', ',
);

const HEX_HEX_RE = /^#?([0-9a-fA-F]{3}|[0-9a-fA-F]{4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/;
const IMPACT_LEVEL = {
  high: 18,
  medium: 10,
};
const ACCESSIBILITY_RISK_LABELS = {
  high: 'High',
  medium: 'Moderate',
  low: 'Low',
  neutral: 'Not available',
};
const REMEDIATION_PRIORITY = {
  high: 'High',
  medium: 'Moderate',
  low: 'Low',
  info: 'Info',
};
const REMEDIATION_SORT_ORDER = {
  high: 0,
  medium: 1,
  low: 2,
  info: 3,
};
const COMPARE_DEFAULT_PERCENT = 50;
const SIMULATION_SEVERITY_DEFAULT_PERCENT = 100;
const TOP_IMPACT_FILTER_LIMIT = 3;
const CONTACT_SHEET_MAX_TILE_WIDTH = 420;
const CONTACT_SHEET_COLUMNS = 3;
const CONTACT_SHEET_GUTTER = 20;
const CONTACT_SHEET_LABEL_HEIGHT = 44;
const MAX_IMAGE_URL_LENGTH = 3000;
const URL_IMAGE_LOAD_TIMEOUT_MS = 15000;
const AA_THRESHOLD_DEFAULT = 4.5;
const AA_THRESHOLD_LARGE_TEXT = 3;
const AAA_THRESHOLD_DEFAULT = 7;
const CONTRAST_SUGGESTION_QUALITY_AA = 'aa-ready';
const CONTRAST_SUGGESTION_QUALITY_AAA = 'aaa-ready';
const CONTRAST_SUGGESTION_QUALITY_BELOW = 'below-target';
const JUDGE_TIMER_DURATION_SECONDS = 90;
const SUBMISSION_PACKAGE_ZIP_NAME = 'submission-package.zip';
const JUDGE_TIMER_PHASES = [
  {
    start: 0,
    end: 10,
    label: 'Load source image',
    cue: 'Load image → upload / demo / URL / paste',
  },
  {
    start: 10,
    end: 30,
    label: 'Render simulations',
    cue: 'Run simulations and inspect impact',
  },
  {
    start: 30,
    end: 70,
    label: 'Contrast check + fixes',
    cue: 'Run check, suggest, and re-check',
  },
  {
    start: 70,
    end: 90,
    label: 'Package handoff',
    cue: 'Export package and copy one artifact',
  },
];
const JUDGE_WORKFLOW_TIMELINE_STEP_KEYS = ['load', 'render', 'contrast', 'export'];
const SUBMISSION_READINESS_SCORE = {
  source: 35,
  simulations: 40,
  contrast: 25,
};
const CONTRAST_AUTO_RECHECK_MS = 280;
const COLOR_PICKER_TARGET_TEXT = 'text';
const COLOR_PICKER_TARGET_BACKGROUND = 'background';
const COLOR_PICKER_SOURCE_CLASS = 'is-picking-color';
const SETTINGS_STORAGE_KEY = 'clearsight-settings-v1';
const RENDER_PROGRESS_TIMEOUT_MS = 900;
const PREVIEW_MODAL_SLIDESHOW_INTERVAL_MS = 1800;
const QUICK_DEMO_SAMPLE_TYPES = ['ui', 'dashboard'];
const SCREENSHOT_CHECKLIST_SIMULATIONS = [
  { id: 'protanopia', filename: 'sim-protanopia.png' },
  { id: 'deuteranopia', filename: 'sim-deuteranopia.png' },
  { id: 'tritanopia', filename: 'sim-tritanopia.png' },
  { id: 'achromatopsia', filename: 'sim-achromatopsia.png' },
  { id: 'low-vision-blur', filename: 'sim-low-vision-blur.png' },
  { id: 'low-vision-contrast', filename: 'sim-low-vision-contrast.png' },
];
const SCREENSHOT_CHECKLIST_SOURCE_FILE = 'source-original.png';
const VISION_REEL_SEGMENT_MS = 1300;
const VISION_REEL_MIN_SEGMENT_MS = 120;
const VISION_REEL_FPS = 30;
const VISION_REEL_MAX_WIDTH = 960;
const VISION_REEL_LABEL_HEIGHT = 84;
const VISION_REEL_MIME_CANDIDATES = [
  'video/webm;codecs=vp9',
  'video/webm;codecs=vp8',
  'video/webm',
  'video/mp4',
];
const SCREENSHOT_CHECKLIST_CONTRAST_INITIAL_FILE = 'contrast-checker-initial.png';
const SCREENSHOT_CHECKLIST_CONTRAST_SUGGESTION_FILE = 'contrast-suggestion-applied.png';

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
  sourceOriginalDimensions: null,
  sourceWasDownscaled: false,
  sourceResizeInfo: null,
  renderSize: { width: 0, height: 0 },
  sourceImageData: null,
  isRendering: false,
  hasRenderedSource: false,
  modeImpacts: [],
  lastContrastResult: null,
  lastCvdProjection: null,
  lastApcaComparison: null,
  lastSuggestionPairs: [],
  simulationSeverityPercent: SIMULATION_SEVERITY_DEFAULT_PERCENT,
  pendingSeverityRerender: false,
  currentContrastAaThreshold: AA_THRESHOLD_DEFAULT,
  activeColorPickerTarget: null,
  xrayActive: false,
  xrayPoint: null,
  lastXraySample: null,
  showTopImpactOnly: false,
  lastAppliedContrastSuggestion: null,
  lastContrastUndoPair: null,
  paletteAuditColors: null,
  lastRecolorPlan: null,
  paletteAuditSummary: null,
  paletteCollisions: null,
  batchAudit: null,
  batchBaseline: null,
  flashScan: null,
  focusCheck: null,
  focusSequence: null,
  textScan: null,
  componentScan: null,
  targetSizeScan: null,
  targetedTextRepair: null,
  componentSurfaceRepair: null,
  completeAuditRepair: null,
  imageRepairUndo: null,
  remediationBaseline: null,
  scoreRepairBaseline: null,
  lastReelExport: null,
  judgeTimer: {
    isRunning: false,
    started: false,
    startAt: null,
    remainingSeconds: 0,
    intervalId: null,
  },
};

let simulationSeverityRerenderTimer = null;
let modalReturnFocusElement = null;
let renderProgressHideTimer = null;
let activeRenderSession = 0;
let activePreviewModalCompareCleanup = null;
let quickDemoCursor = 0;
let activePreviewModalModes = [];
let activePreviewModalModeIndex = -1;
let contrastAutoRecheckTimer = null;
let previewModalSlideshowTimer = null;
let isRecordingVisionReel = false;
let isBatchAuditRunning = false;

function startRenderSession() {
  activeRenderSession += 1;
  return activeRenderSession;
}

function isRenderSessionActive(sessionId) {
  return sessionId === activeRenderSession && state.isRendering;
}

function cancelRenderSession() {
  if (!state.isRendering) {
    return false;
  }

  activeRenderSession += 1;
  state.isRendering = false;
  return true;
}

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
  {
    id: 'low-vision-cataracts',
    label: 'Low Vision — Cataracts (haze + glare)',
    kind: 'filter',
    filter: 'blur(1.6px) sepia(0.42) saturate(0.72) brightness(1.08) contrast(0.78)',
  },
  {
    id: 'low-vision-glaucoma',
    label: 'Low Vision — Glaucoma (tunnel vision)',
    kind: 'fieldloss',
    filter: 'blur(0.6px) saturate(0.85)',
    fieldLoss: { shape: 'peripheral', innerRadius: 0.34, outerRadius: 0.88, fill: [18, 16, 15] },
  },
  {
    id: 'low-vision-macular',
    label: 'Low Vision — Macular degeneration (central loss)',
    kind: 'fieldloss',
    filter: 'blur(0.8px) saturate(0.8)',
    fieldLoss: { shape: 'central', innerRadius: 0.15, outerRadius: 0.44, fill: [74, 68, 62] },
  },
];
const allModes = [...cvdModes, ...extraModes];

const dom = {
  offlineStatus: document.getElementById('offlineStatus'),
  installAppBtn: document.getElementById('installAppBtn'),
  imageInput: document.getElementById('imageInput'),
  captureScreenBtn: document.getElementById('captureScreenBtn'),
  imageUrlInput: document.getElementById('imageUrlInput'),
  loadImageUrlBtn: document.getElementById('loadImageUrlBtn'),
  demoUi: document.getElementById('demoUi'),
  demoDashboard: document.getElementById('demoDashboard'),
  processBtn: document.getElementById('processBtn'),
  exportNote: document.getElementById('exportNote'),
  downloadSourceBtn: document.getElementById('downloadSourceBtn'),
  clearWorkspaceBtn: document.getElementById('clearWorkspaceBtn'),
  batchAuditInput: document.getElementById('batchAuditInput'),
  batchBaselineInput: document.getElementById('batchBaselineInput'),
  batchAuditFilesBtn: document.getElementById('batchAuditFilesBtn'),
  batchAuditSampleBtn: document.getElementById('batchAuditSampleBtn'),
  recordWalkthroughBtn: document.getElementById('recordWalkthroughBtn'),
  batchBaselineBtn: document.getElementById('batchBaselineBtn'),
  batchAuditCsvBtn: document.getElementById('batchAuditCsvBtn'),
  batchAuditPdfBtn: document.getElementById('batchAuditPdfBtn'),
  batchAuditStatus: document.getElementById('batchAuditStatus'),
  batchAuditSummary: document.getElementById('batchAuditSummary'),
  batchRegressionSummary: document.getElementById('batchRegressionSummary'),
  batchAuditList: document.getElementById('batchAuditList'),
  batchAuditPortfolio: document.getElementById('batchAuditPortfolio'),
  flashScanInput: document.getElementById('flashScanInput'),
  flashScanFileBtn: document.getElementById('flashScanFileBtn'),
  flashScanDemoBtn: document.getElementById('flashScanDemoBtn'),
  flashScanStatus: document.getElementById('flashScanStatus'),
  flashScanResult: document.getElementById('flashScanResult'),
  flashScanVerdict: document.getElementById('flashScanVerdict'),
  flashScanStats: document.getElementById('flashScanStats'),
  flashScanTimeline: document.getElementById('flashScanTimeline'),
  flashScanGuidance: document.getElementById('flashScanGuidance'),
  focusBaseInput: document.getElementById('focusBaseInput'),
  focusFocusInput: document.getElementById('focusFocusInput'),
  focusBaseBtn: document.getElementById('focusBaseBtn'),
  focusFocusBtn: document.getElementById('focusFocusBtn'),
  focusDemoWeakBtn: document.getElementById('focusDemoWeakBtn'),
  focusDemoStrongBtn: document.getElementById('focusDemoStrongBtn'),
  focusCheckStatus: document.getElementById('focusCheckStatus'),
  focusCheckResult: document.getElementById('focusCheckResult'),
  focusCheckVerdict: document.getElementById('focusCheckVerdict'),
  focusCheckStats: document.getElementById('focusCheckStats'),
  focusCheckOverlay: document.getElementById('focusCheckOverlay'),
  focusCheckGuidance: document.getElementById('focusCheckGuidance'),
  focusSequenceVideoInput: document.getElementById('focusSequenceVideoInput'),
  focusSequenceVideoBtn: document.getElementById('focusSequenceVideoBtn'),
  focusSequenceDemoBtn: document.getElementById('focusSequenceDemoBtn'),
  downloadFocusSequenceBtn: document.getElementById('downloadFocusSequenceBtn'),
  focusSequenceStatus: document.getElementById('focusSequenceStatus'),
  focusSequenceResult: document.getElementById('focusSequenceResult'),
  focusSequenceVerdict: document.getElementById('focusSequenceVerdict'),
  focusSequenceStats: document.getElementById('focusSequenceStats'),
  focusSequenceOverlay: document.getElementById('focusSequenceOverlay'),
  focusSequenceStops: document.getElementById('focusSequenceStops'),
  focusSequenceGuidance: document.getElementById('focusSequenceGuidance'),
  downloadAllBtn: document.getElementById('downloadAllBtn'),
  downloadChecklistShotsBtn: document.getElementById('downloadChecklistShotsBtn'),
  downloadContactBtn: document.getElementById('downloadContactBtn'),
  downloadReelBtn: document.getElementById('downloadReelBtn'),
  downloadReportBtn: document.getElementById('downloadReportBtn'),
  downloadSummaryBtn: document.getElementById('downloadSummaryBtn'),
  downloadConformanceBtn: document.getElementById('downloadConformanceBtn'),
  downloadReportCsvBtn: document.getElementById('downloadReportCsvBtn'),
  downloadTopImpactBtn: document.getElementById('downloadTopImpactBtn'),
  downloadPackageBtn: document.getElementById('downloadPackageBtn'),
  downloadReviewerPacketBtn: document.getElementById('downloadReviewerPacketBtn'),
  downloadAuditPdfBtn: document.getElementById('downloadAuditPdfBtn'),
  downloadVerdictCardBtn: document.getElementById('downloadVerdictCardBtn'),
  downloadRepairProofBtn: document.getElementById('downloadRepairProofBtn'),
  copyShareLinkBtn: document.getElementById('copyShareLinkBtn'),
  showShareQrBtn: document.getElementById('showShareQrBtn'),
  shareQrCard: document.getElementById('shareQrCard'),
  shareQrCanvas: document.getElementById('shareQrCanvas'),
  shareQrMeta: document.getElementById('shareQrMeta'),
  downloadShareQrBtn: document.getElementById('downloadShareQrBtn'),
  hideShareQrBtn: document.getElementById('hideShareQrBtn'),
  sharedAuditPanel: document.getElementById('sharedAuditPanel'),
  sharedAuditMeta: document.getElementById('sharedAuditMeta'),
  sharedAuditBody: document.getElementById('sharedAuditBody'),
  sharedAuditError: document.getElementById('sharedAuditError'),
  sharedAuditCopyBtn: document.getElementById('sharedAuditCopyBtn'),
  sharedAuditPlanBtn: document.getElementById('sharedAuditPlanBtn'),
  sharedAuditDismissBtn: document.getElementById('sharedAuditDismissBtn'),
  message: document.getElementById('message'),
  sourceCanvas: document.getElementById('sourceCanvas'),
  xrayToggleBtn: document.getElementById('xrayToggleBtn'),
  xrayLoupe: document.getElementById('xrayLoupe'),
  xrayLoupeCanvas: document.getElementById('xrayLoupeCanvas'),
  xrayReadout: document.getElementById('xrayReadout'),
  xraySrStatus: document.getElementById('xraySrStatus'),
  sourceInfo: document.getElementById('sourceInfo'),
  riskBadge: document.getElementById('riskBadge'),
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
  copyContrastBtn: document.getElementById('copyContrastBtn'),
  copyContrastCssBtn: document.getElementById('copyContrastCssBtn'),
  autoFixContrastBtn: document.getElementById('autoFixContrastBtn'),
  undoContrastBtn: document.getElementById('undoContrastBtn'),
  suggestBtn: document.getElementById('suggestBtn'),
  swapContrastBtn: document.getElementById('swapContrastBtn'),
  suggestionWrap: document.getElementById('suggestions'),
  copySummaryBtn: document.getElementById('copySummaryBtn'),
  copyReportJsonBtn: document.getElementById('copyReportJsonBtn'),
  copyReportCsvBtn: document.getElementById('copyReportCsvBtn'),
  copySuggestionsCsvBtn: document.getElementById('copySuggestionsCsvBtn'),
  copySuggestionsJsonBtn: document.getElementById('copySuggestionsJsonBtn'),
  downloadSuggestionsCsvBtn: document.getElementById('downloadSuggestionsCsvBtn'),
  downloadSuggestionsJsonBtn: document.getElementById('downloadSuggestionsJsonBtn'),
  copyJudgeSnapshotBtn: document.getElementById('copyJudgeSnapshotBtn'),
  copyWorkflowSnapshotBtn: document.getElementById('copyWorkflowSnapshotBtn'),
  downloadManifestBtn: document.getElementById('downloadManifestBtn'),
  copyManifestBtn: document.getElementById('copyManifestBtn'),
  copyHandoffPacketBtn: document.getElementById('copyHandoffPacketBtn'),
  copyHandoffPacketJsonBtn: document.getElementById('copyHandoffPacketJsonBtn'),
  copyHandoffBundleBtn: document.getElementById('copyHandoffBundleBtn'),
  finalizeHandoffBtn: document.getElementById('finalizeHandoffBtn'),
  judgeTimerStartBtn: document.getElementById('startJudgeTimerBtn'),
  judgeTimerResetBtn: document.getElementById('resetJudgeTimerBtn'),
  judgeTimerText: document.getElementById('judgeTimerText'),
  judgeTimerBar: document.getElementById('judgeTimerProgressBar'),
  judgeTimerFill: document.getElementById('judgeTimerProgressFill'),
  quickDemoBtn: document.getElementById('quickDemoBtn'),
  heroDemoBtn: document.getElementById('heroDemoBtn'),
  findingsCommandCenter: document.getElementById('findingsCommandCenter'),
  findingsVerdictBadge: document.getElementById('findingsVerdictBadge'),
  findingsCommandTitle: document.getElementById('findings-command-title'),
  findingsCommandSummary: document.getElementById('findingsCommandSummary'),
  findingTextIssueCount: document.getElementById('findingTextIssueCount'),
  findingCvdIssueCount: document.getElementById('findingCvdIssueCount'),
  findingApcaIssueCount: document.getElementById('findingApcaIssueCount'),
  findingCollisionCount: document.getElementById('findingCollisionCount'),
  findingComponentIssueCount: document.getElementById('findingComponentIssueCount'),
  findingTargetIssueCount: document.getElementById('findingTargetIssueCount'),
  findingTopImpactValue: document.getElementById('findingTopImpactValue'),
  clearsightScoreCard: document.getElementById('clearsightScoreCard'),
  clearsightScoreRing: document.getElementById('clearsightScoreRing'),
  clearsightScoreValue: document.getElementById('clearsightScoreValue'),
  clearsightScoreVerdict: document.getElementById('clearsightScoreVerdict'),
  clearsightScoreAxes: document.getElementById('clearsightScoreAxes'),
  clearsightScoreProof: document.getElementById('clearsightScoreProof'),
  riskFingerprintChart: document.getElementById('riskFingerprintChart'),
  riskFingerprintShape: document.getElementById('riskFingerprintShape'),
  riskFingerprintPoints: document.getElementById('riskFingerprintPoints'),
  riskFingerprintDesc: document.getElementById('risk-fingerprint-desc'),
  findingsNextAction: document.getElementById('findingsNextAction'),
  findingsActionBtn: document.getElementById('findingsActionBtn'),
  simPlaceholder: document.getElementById('simEmptyState'),
  impactSummary: document.getElementById('impactSummary'),
  contrastValidation: document.getElementById('contrastValidation'),
  textScanStatus: document.getElementById('textScanStatus'),
  textScanResult: document.getElementById('textScanResult'),
  textScanCanvas: document.getElementById('textScanCanvas'),
  textScanList: document.getElementById('textScanList'),
  reviewWorstTextBtn: document.getElementById('reviewWorstTextBtn'),
  repairAllTextBtn: document.getElementById('repairAllTextBtn'),
  textScanLens: document.getElementById('textScanLens'),
  textScanLensCanvas: document.getElementById('textScanLensCanvas'),
  textScanLensDetail: document.getElementById('textScanLensDetail'),
  textScanLensPair: document.getElementById('textScanLensPair'),
  textScanLensFixBtn: document.getElementById('textScanLensFixBtn'),
  textScanLensRepairBtn: document.getElementById('textScanLensRepairBtn'),
  textScanRepairProof: document.getElementById('textScanRepairProof'),
  downloadTextScanBtn: document.getElementById('downloadTextScanBtn'),
  componentScanResult: document.getElementById('componentScanResult'),
  componentScanStatus: document.getElementById('componentScanStatus'),
  componentScanList: document.getElementById('componentScanList'),
  componentScanRepairProof: document.getElementById('componentScanRepairProof'),
  targetSizeResult: document.getElementById('targetSizeResult'),
  targetSizeStatus: document.getElementById('targetSizeStatus'),
  targetSizeList: document.getElementById('targetSizeList'),
  repairAllAuditBtn: document.getElementById('repairAllAuditBtn'),
  undoImageRepairBtn: document.getElementById('undoImageRepairBtn'),
  completeRepairProof: document.getElementById('completeRepairProof'),
  copyCssFixesBtn: document.getElementById('copyCssFixesBtn'),
  downloadCssFixesBtn: document.getElementById('downloadCssFixesBtn'),
  paletteStatus: document.getElementById('paletteStatus'),
  paletteSwatches: document.getElementById('paletteSwatches'),
  palettePairs: document.getElementById('palettePairs'),
  paletteRecolor: document.getElementById('paletteRecolor'),
  collisionPanel: document.getElementById('collisionPanel'),
  collisionStatus: document.getElementById('collisionStatus'),
  collisionList: document.getElementById('collisionList'),
  recolorPreviewBtn: document.getElementById('recolorPreviewBtn'),
  recolorDownloadBtn: document.getElementById('recolorDownloadBtn'),
  recolorApplyBtn: document.getElementById('recolorApplyBtn'),
  remediationProof: document.getElementById('remediationProof'),
  recolorStatus: document.getElementById('recolorStatus'),
  recolorMap: document.getElementById('recolorMap'),
  recolorCompare: document.getElementById('recolorCompare'),
  recolorWipeStage: document.getElementById('recolorWipeStage'),
  recolorRevealRange: document.getElementById('recolorRevealRange'),
  recolorBeforeCanvas: document.getElementById('recolorBeforeCanvas'),
  recolorAfterCanvas: document.getElementById('recolorAfterCanvas'),
  accessibilitySummary: document.getElementById('accessibilitySummary'),
  judgeSnapshot: document.getElementById('judgeSnapshot'),
  copyDemoScriptBtn: document.getElementById('copyDemoScriptBtn'),
  copyChecklistBtn: document.getElementById('copyChecklistBtn'),
  demoCopyStatus: document.getElementById('demoCopyStatus'),
  workflowStepSource: document.getElementById('workflowStepSource'),
  workflowStepRender: document.getElementById('workflowStepRender'),
  workflowStepContrast: document.getElementById('workflowStepContrast'),
  workflowStepSubmission: document.getElementById('workflowStepSubmission'),
  timelineStepLoad: document.getElementById('timelineStepLoad'),
  timelineStepRender: document.getElementById('timelineStepRender'),
  timelineStepContrast: document.getElementById('timelineStepContrast'),
  timelineStepExport: document.getElementById('timelineStepExport'),
  submissionReadinessText: document.getElementById('submissionReadinessText'),
  submissionReadinessScore: document.getElementById('submissionReadinessScore'),
  submissionReadinessMeterFill: document.getElementById('submissionReadinessMeterFill'),
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
  previewModalCanvas: document.getElementById('previewModalCanvas'),
  previewModalCompareSlider: document.getElementById('previewModalCompareSlider'),
  previewModalCompareValue: document.getElementById('previewModalCompareValue'),
  previewModalDownloadBtn: document.getElementById('previewModalDownloadBtn'),
  previewModalCloseBtn: document.getElementById('previewModalCloseBtn'),
  previewModalPrevBtn: document.getElementById('previewModalPrevBtn'),
  previewModalNextBtn: document.getElementById('previewModalNextBtn'),
  previewModalPlayBtn: document.getElementById('previewModalPlayBtn'),
  previewModalIndexLabel: document.getElementById('previewModalIndexLabel'),
  downloadContrastSnapshotBtn: document.getElementById('downloadContrastSnapshotBtn'),
  renderProgress: document.getElementById('renderProgress'),
  renderProgressBar: document.getElementById('renderProgressBar'),
  renderProgressFill: document.getElementById('renderProgressFill'),
  renderProgressLabel: document.getElementById('renderProgressLabel'),
  shortcutHelp: document.getElementById('shortcutHelp'),
  shortcutHelpSearchInput: document.getElementById('shortcutHelpSearchInput'),
  shortcutHelpNoResults: document.getElementById('shortcutHelpNoResults'),
};

let deferredInstallPrompt = null;

function updateOfflineStatus({ ready = false } = {}) {
  if (!dom.offlineStatus) return;
  const offline = !navigator.onLine;
  dom.offlineStatus.classList.toggle('is-ready', ready && !offline);
  dom.offlineStatus.classList.toggle('is-offline', offline);
  dom.offlineStatus.classList.toggle('is-checking', !ready && !offline);
  dom.offlineStatus.lastChild.textContent = offline
    ? ' Offline — every audit tool still works'
    : ready
      ? ' Offline-ready — disconnect safely'
      : ' Preparing offline mode…';
}

async function initializeOfflineApp() {
  updateOfflineStatus();
  window.addEventListener('online', () => updateOfflineStatus({ ready: Boolean(navigator.serviceWorker?.controller) }));
  window.addEventListener('offline', () => updateOfflineStatus({ ready: true }));

  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault();
    deferredInstallPrompt = event;
    if (dom.installAppBtn) dom.installAppBtn.hidden = false;
  });
  window.addEventListener('appinstalled', () => {
    deferredInstallPrompt = null;
    if (dom.installAppBtn) dom.installAppBtn.hidden = true;
    updateOfflineStatus({ ready: true });
  });

  dom.installAppBtn?.addEventListener('click', async () => {
    if (!deferredInstallPrompt) return;
    deferredInstallPrompt.prompt();
    await deferredInstallPrompt.userChoice;
    deferredInstallPrompt = null;
    dom.installAppBtn.hidden = true;
  });

  if (!('serviceWorker' in navigator)) {
    if (dom.offlineStatus) dom.offlineStatus.lastChild.textContent = ' Local processing enabled';
    return;
  }

  try {
    const registration = await navigator.serviceWorker.register('./service-worker.js');
    await navigator.serviceWorker.ready;
    updateOfflineStatus({ ready: true });
    registration.update().catch(() => {});
  } catch {
    if (dom.offlineStatus) dom.offlineStatus.lastChild.textContent = ' Local processing enabled';
  }
}

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
  const title = document.createElement('p');
  title.textContent = `High-impact order: ${lead.label} leads at ${lead.impactPercent.toFixed(1)}%. Click a chip to inspect.`;

  const chips = document.createElement('div');
  chips.className = 'impact-pill-row';

  ordered.slice(0, 5).forEach((entry) => {
    const chip = document.createElement('button');
    chip.type = 'button';
    chip.className = `impact-pill impact-${entry.impactLevel}`;
    chip.setAttribute('aria-label', `Open ${entry.label} preview`);
    chip.dataset.mode = entry.modeId;
    chip.innerHTML = `<span>${entry.label}</span><strong>${entry.impactPercent.toFixed(1)}%</strong>`;
    chip.addEventListener('click', () => {
      openSimulationPreviewByModeId(entry.modeId);
    });
    chips.appendChild(chip);
  });

  dom.impactSummary.innerHTML = '';
  dom.impactSummary.append(title, chips);
}

function openSimulationPreviewByModeId(modeId) {
  const mode = allModes.find(({ id }) => id === modeId);
  if (!mode) {
    setMessage('Open simulation render first, then inspect the selected mode.', 'info');
    return false;
  }

  const card = dom.simGrid.querySelector(`[data-mode="${modeId}"]`);
  if (!card) {
    setMessage('Open simulation render first, then inspect the selected mode.', 'info');
    return false;
  }

  const canvas = card.querySelector('.sim-canvas');
  const sourceCanvas = card.querySelector('.sim-source-canvas');
  if (!canvas || !canvas.width || !canvas.height) {
    setMessage('Simulation is not ready yet. Render simulations first.', 'info');
    return false;
  }

  openPreviewModal({
    modeId: mode.id,
    label: mode.label,
    canvas,
    sourceCanvas,
  });
  return true;
}

function setWorkflowStep(itemEl, complete) {
  if (!itemEl) {
    return;
  }

  const marker = itemEl.querySelector('.flow-step-indicator');
  itemEl.classList.toggle('is-complete', complete);
  if (marker) {
    marker.textContent = complete ? '✓' : '◯';
  }
}

function getCompletedSimulationCount() {
  const cards = dom.simGrid?.querySelectorAll('.sim-card.is-done');
  return cards ? cards.length : 0;
}

function hasFullyRenderedSimulations() {
  return getCompletedSimulationCount() >= allModes.length;
}

function getSubmissionReadiness() {
  const completedSimulationCount = getCompletedSimulationCount();
  const hasSource = Boolean(state.sourceImage);
  const hasSimulations = Boolean(state.hasRenderedSource && hasFullyRenderedSimulations());
  const hasContrastCheck = Boolean(state.lastContrastResult);
  const simulationReadinessScore =
    state.hasRenderedSource && completedSimulationCount > 0
      ? Math.round((completedSimulationCount / allModes.length) * SUBMISSION_READINESS_SCORE.simulations)
      : 0;
  const readinessScore =
    (hasSource ? SUBMISSION_READINESS_SCORE.source : 0) +
    (hasSimulations ? SUBMISSION_READINESS_SCORE.simulations : 0) +
    (hasContrastCheck ? SUBMISSION_READINESS_SCORE.contrast : 0);

  if (!hasSource) {
    return {
      isReady: false,
      text: 'Load a source image to begin the judge workflow.',
      readinessScore: 0,
      nextAction: 'Upload a source image, load a demo, or paste a valid image URL.',
    };
  }

  if (!hasSimulations) {
    const remaining = Math.max(0, allModes.length - completedSimulationCount);
    const nextTarget = `Run all simulations (${completedSimulationCount}/${allModes.length}).`;
    return {
      isReady: false,
      text: remaining ? 'Run all simulations before exporting judge-ready artifacts.' : 'Render is in progress.',
      readinessScore: SUBMISSION_READINESS_SCORE.source + simulationReadinessScore,
      nextAction:
        remaining > 0
          ? `Complete rendering before handoff. ${nextTarget}`
          : 'Finish any pending render work before proceeding.',
    };
  }

  if (!hasContrastCheck) {
    return {
      isReady: false,
      text: 'Run contrast check next to complete export-ready metadata.',
      readinessScore: SUBMISSION_READINESS_SCORE.source + SUBMISSION_READINESS_SCORE.simulations,
      nextAction: 'Run a contrast check to capture AA/AAA status and generate suggestions.',
    };
  }

  return {
    isReady: true,
    text: 'Submission package is ready — export package, manifest, report, and judge summary when ready.',
    readinessScore,
    nextAction: 'Export package artifacts and share them for judge submission.',
  };
}

function getJudgeTimerPhaseIndex(remainingSeconds) {
  const safeRemaining = Math.max(0, Math.floor(Number(remainingSeconds) || 0));
  const elapsed = JUDGE_TIMER_DURATION_SECONDS - safeRemaining;

  for (let index = 0; index < JUDGE_TIMER_PHASES.length; index += 1) {
    if (elapsed < JUDGE_TIMER_PHASES[index].end) {
      return index;
    }
  }

  return JUDGE_TIMER_PHASES.length - 1;
}

function setTimelineStep(itemEl, state = 'pending') {
  if (!itemEl) {
    return;
  }

  const safeState = state === 'active' || state === 'complete' ? state : 'pending';
  itemEl.classList.toggle('is-active', safeState === 'active');
  itemEl.classList.toggle('is-complete', safeState === 'complete');
  itemEl.classList.toggle('is-pending', safeState === 'pending');
  itemEl.setAttribute('aria-current', safeState === 'active' ? 'step' : 'false');
}

function updateWorkflowTimeline({
  hasSource = Boolean(state.sourceImage),
  hasSimulations = Boolean(state.hasRenderedSource && hasFullyRenderedSimulations()),
  hasContrastCheck = Boolean(state.lastContrastResult),
  readiness = getSubmissionReadiness(),
} = {}) {
  if (!dom.timelineStepLoad || !dom.timelineStepRender || !dom.timelineStepContrast || !dom.timelineStepExport) {
    return;
  }

  const timelineState = {
    load: 'pending',
    render: 'pending',
    contrast: 'pending',
    export: 'pending',
  };

  if (hasSource) {
    timelineState.load = 'complete';
  }
  if (hasSimulations) {
    timelineState.render = 'complete';
  }
  if (hasContrastCheck) {
    timelineState.contrast = 'complete';
  }
  if (readiness.isReady) {
    timelineState.export = 'complete';
  }

  const orderedSteps = ['load', 'render', 'contrast', 'export'];
  const timelineElements = {
    load: dom.timelineStepLoad,
    render: dom.timelineStepRender,
    contrast: dom.timelineStepContrast,
    export: dom.timelineStepExport,
  };

  if (state.judgeTimer?.started) {
    const timerPhaseIndex = getJudgeTimerPhaseIndex(state.judgeTimer.remainingSeconds);
    const timerStepKey = JUDGE_WORKFLOW_TIMELINE_STEP_KEYS[timerPhaseIndex];

    if (timerStepKey && timelineState[timerStepKey] === 'pending') {
      timelineState[timerStepKey] = 'active';
    } else {
      const nextPendingStep = orderedSteps.find((stepKey) => timelineState[stepKey] === 'pending');
      if (nextPendingStep) {
        timelineState[nextPendingStep] = 'active';
      }
    }
  } else if (!hasSource) {
    timelineState.load = 'active';
  } else if (!hasSimulations) {
    timelineState.render = 'active';
  } else if (!hasContrastCheck) {
    timelineState.contrast = 'active';
  } else if (!readiness.isReady) {
    timelineState.export = 'active';
  }

  const orderedList = orderedSteps.map((key) => timelineState[key]);
  const hasAnyActive = orderedList.includes('active');
  if (!hasAnyActive && readiness.isReady) {
    timelineState.export = 'complete';
  }

  setTimelineStep(timelineElements.load, timelineState.load);
  setTimelineStep(timelineElements.render, timelineState.render);
  setTimelineStep(timelineElements.contrast, timelineState.contrast);
  setTimelineStep(timelineElements.export, timelineState.export);
}

function syncJudgeReadinessControls() {
  const readiness = getSubmissionReadiness();
  const isReady = Boolean(readiness.isReady);
  const judgeControls = [
    dom.downloadSummaryBtn,
    dom.downloadConformanceBtn,
    dom.downloadPackageBtn,
    dom.downloadReviewerPacketBtn,
    dom.downloadAuditPdfBtn,
    dom.downloadVerdictCardBtn,
    dom.copySummaryBtn,
    dom.finalizeHandoffBtn,
    dom.downloadManifestBtn,
    dom.copyManifestBtn,
    dom.copyReportJsonBtn,
    dom.copyReportCsvBtn,
    dom.copyJudgeSnapshotBtn,
    dom.copyHandoffPacketBtn,
    dom.copyHandoffPacketJsonBtn,
    dom.copyHandoffBundleBtn,
    dom.copyShareLinkBtn,
    dom.showShareQrBtn,
  ];
  const disabledLabel = readiness.nextAction ? `Locked: ${readiness.text} Next: ${readiness.nextAction}` : 'Locked until the full judge workflow is complete.';

  judgeControls.forEach((button) => {
    if (!button) {
      return;
    }

    button.disabled = !isReady;
    if (isReady) {
      button.removeAttribute('title');
      button.dataset.unavailableMessage = '';
    } else {
      button.title = disabledLabel;
      button.dataset.unavailableMessage = disabledLabel;
    }
  });
}

function updateWorkflowChecklist() {
  const hasSource = Boolean(state.sourceImage);
  const hasSimulations = Boolean(state.hasRenderedSource && hasFullyRenderedSimulations());
  const hasContrastCheck = Boolean(state.lastContrastResult);
  const readiness = getSubmissionReadiness();

  if (readiness.isReady && state.judgeTimer?.isRunning) {
    stopJudgeTimer();
    if (dom.judgeTimerText) {
      const remainingSeconds = Math.max(0, Math.floor(state.judgeTimer.remainingSeconds || 0));
      dom.judgeTimerText.textContent = `Workflow unlocked ${formatJudgeTimer(remainingSeconds)} remaining on timer. Export now and share.`;
    }
    if (dom.judgeTimerStartBtn) {
      dom.judgeTimerStartBtn.textContent = 'Start 90s judge timer';
    }
  }

  setWorkflowStep(dom.workflowStepSource, hasSource);
  setWorkflowStep(dom.workflowStepRender, hasSimulations);
  setWorkflowStep(dom.workflowStepContrast, hasContrastCheck);
  setWorkflowStep(dom.workflowStepSubmission, readiness.isReady);
  updateWorkflowTimeline({
    hasSource,
    hasSimulations,
    hasContrastCheck,
    readiness,
  });

  if (dom.submissionReadinessText) {
    dom.submissionReadinessText.textContent = `${readiness.text} Next: ${readiness.nextAction}`;
  }

  if (dom.submissionReadinessScore) {
    dom.submissionReadinessScore.textContent = `${readiness.isReady ? 'Judge-ready' : 'Judge readiness'}: ${readiness.readinessScore}%`;
  }

  if (dom.submissionReadinessMeterFill) {
    const clampedScore = Number.isFinite(readiness.readinessScore)
      ? Math.max(0, Math.min(100, readiness.readinessScore))
      : 0;
    dom.submissionReadinessMeterFill.style.width = `${clampedScore}%`;
    dom.submissionReadinessMeterFill.classList.remove('readiness-low', 'readiness-mid', 'readiness-ready');

    if (readiness.isReady) {
      dom.submissionReadinessMeterFill.classList.add('readiness-ready');
    } else if (clampedScore >= 70) {
      dom.submissionReadinessMeterFill.classList.add('readiness-mid');
    } else {
      dom.submissionReadinessMeterFill.classList.add('readiness-low');
    }
  }

  syncJudgeReadinessControls();
  updateFindingsCommandCenter();
}

function computeCurrentAccessibilityScore() {
  if (!state.textScan?.regions?.length) {
    return null;
  }

  try {
    return computeAccessibilityScore({
      textRegions: state.textScan.regions.map((region) => ({ ratio: region.ratio })),
      cvdHiddenFailures: state.textScan.summary?.cvdHiddenFailures || 0,
      apcaFalsePasses: state.textScan.summary?.apcaFalsePasses || 0,
      paletteSummary: state.paletteCollisions?.summary
        ? {
            candidatePairs: state.paletteCollisions.summary.candidatePairs,
            collisions: state.paletteCollisions.summary.collisions,
          }
        : null,
      componentSummary: state.componentScan?.summary
        ? {
            evaluated: state.componentScan.summary.evaluated,
            failing: state.componentScan.summary.failing,
          }
        : null,
      targetSizeSummary: state.targetSizeScan?.summary
        ? {
            targets: state.targetSizeScan.summary.targets,
            undersized: state.targetSizeScan.summary.undersized,
          }
        : null,
    });
  } catch {
    return null;
  }
}

function renderClearsightScore(scoreResult) {
  if (!dom.clearsightScoreCard) {
    return;
  }

  if (!scoreResult || !Number.isFinite(scoreResult.score)) {
    dom.clearsightScoreCard.hidden = true;
    delete dom.clearsightScoreCard.dataset.score;
    delete dom.clearsightScoreCard.dataset.grade;
    if (dom.clearsightScoreProof) dom.clearsightScoreProof.hidden = true;
    return;
  }

  const { score, grade, verdictLabel, axes } = scoreResult;
  dom.clearsightScoreCard.hidden = false;
  dom.clearsightScoreCard.dataset.score = String(score);
  dom.clearsightScoreCard.dataset.grade = grade;
  dom.clearsightScoreRing.dataset.grade = grade;
  dom.clearsightScoreRing.style.setProperty('--score-angle', `${Math.max(0, Math.min(100, score)) * 3.6}deg`);
  dom.clearsightScoreRing.setAttribute(
    'aria-label',
    `ClearSight accessibility score ${score} out of 100, grade ${grade} (${verdictLabel}).`,
  );
  dom.clearsightScoreValue.textContent = String(score);
  dom.clearsightScoreVerdict.textContent = `Grade ${grade} · ${verdictLabel}`;
  dom.clearsightScoreAxes.textContent = axes
    .map((axis) => `${axis.label} ${axis.score === null ? 'n/a' : Math.round(axis.score)}`)
    .join(' · ');
  renderRiskFingerprint(axes);

  if (dom.clearsightScoreProof) {
    const baseline = state.scoreRepairBaseline;
    const delta = baseline ? score - baseline.score : 0;
    if (baseline) {
      const direction = delta > 0 ? 'improved' : delta < 0 ? 'regressed' : 'unchanged';
      const sign = delta > 0 ? '+' : '';
      const outcome = delta > 0 ? 'Verified improvement' : delta < 0 ? 'Regression caught' : 'Verified · score unchanged';
      dom.clearsightScoreProof.textContent = `${outcome} · ${baseline.score} → ${score} (${sign}${delta} points) · Grade ${baseline.grade} → ${grade}`;
      dom.clearsightScoreProof.classList.toggle('is-improved', delta > 0);
      dom.clearsightScoreProof.classList.toggle('is-regressed', delta < 0);
      dom.clearsightScoreProof.dataset.direction = direction;
      dom.clearsightScoreProof.hidden = false;
    } else {
      dom.clearsightScoreProof.hidden = true;
      dom.clearsightScoreProof.classList.remove('is-improved', 'is-regressed');
    }
  }
  if (dom.downloadRepairProofBtn) {
    dom.downloadRepairProofBtn.disabled = !state.scoreRepairBaseline || !state.imageRepairUndo;
  }
}

function renderRiskFingerprint(axes) {
  if (!dom.riskFingerprintShape || !dom.riskFingerprintPoints) return;

  const orderedIds = [
    'textContrast',
    'cvdSafety',
    'perceptualContrast',
    'colorIndependence',
    'componentContrast',
    'targetSize',
  ];
  const axisById = new Map(axes.map((axis) => [axis.id, axis]));
  const center = { x: 160, y: 138 };
  const radius = 104;
  const points = orderedIds.map((id, index) => {
    const axis = axisById.get(id);
    const value = Number.isFinite(axis?.score) ? Math.max(0, Math.min(100, axis.score)) : 0;
    const angle = -Math.PI / 2 + (index * Math.PI) / 3;
    return {
      x: center.x + Math.cos(angle) * radius * (value / 100),
      y: center.y + Math.sin(angle) * radius * (value / 100),
      value,
      axis,
    };
  });

  dom.riskFingerprintShape.setAttribute(
    'points',
    points.map((point) => `${point.x.toFixed(1)},${point.y.toFixed(1)}`).join(' '),
  );
  dom.riskFingerprintPoints.replaceChildren(
    ...points.map((point) => {
      const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      circle.setAttribute('cx', point.x.toFixed(1));
      circle.setAttribute('cy', point.y.toFixed(1));
      circle.setAttribute('r', '3.5');
      return circle;
    }),
  );

  const spokenSummary = points
    .map(({ axis, value }) => `${axis?.label || 'Unscored axis'}: ${axis?.score === null ? 'not evaluated' : `${Math.round(value)} out of 100`}`)
    .join('; ');
  dom.riskFingerprintDesc.textContent = `${spokenSummary}. Higher values indicate stronger measured accessibility.`;
  dom.riskFingerprintChart.dataset.axes = String(points.filter(({ axis }) => axis?.score !== null).length);
}

function captureScoreRepairBaseline(kind) {
  const current = computeCurrentAccessibilityScore();
  state.scoreRepairBaseline = current
    ? {
        score: current.score,
        grade: current.grade,
        kind,
        findings: {
          text: state.textScan?.summary?.belowAA ?? 0,
          components: state.componentScan?.summary?.failing ?? 0,
          targets: state.targetSizeScan?.summary?.undersized ?? 0,
          cvd: state.textScan?.summary?.cvdHiddenFailures ?? 0,
        },
      }
    : null;
}

function captureImageRepairUndo(kind) {
  if (!state.sourceImageData) return;
  state.imageRepairUndo = {
    kind,
    imageData: new ImageData(
      new Uint8ClampedArray(state.sourceImageData.data),
      state.sourceImageData.width,
      state.sourceImageData.height,
    ),
    sourceName: state.sourceName,
    sourceOriginalDimensions: state.sourceOriginalDimensions
      ? { ...state.sourceOriginalDimensions }
      : null,
    sourceWasDownscaled: state.sourceWasDownscaled,
    sourceResizeInfo: state.sourceResizeInfo,
  };
  if (dom.undoImageRepairBtn) dom.undoImageRepairBtn.disabled = false;
}

async function undoLastImageRepair() {
  const undo = state.imageRepairUndo;
  if (!undo || state.isRendering) {
    setMessage('No screenshot repair is available to undo.', 'info');
    return;
  }

  const canvas = document.createElement('canvas');
  canvas.width = undo.imageData.width;
  canvas.height = undo.imageData.height;
  canvas.getContext('2d').putImageData(undo.imageData, 0, 0);
  const image = new Image();
  const loaded = new Promise((resolve, reject) => {
    image.onload = resolve;
    image.onerror = () => reject(new Error('Could not restore the pre-repair screenshot.'));
  });
  image.src = canvas.toDataURL('image/png');

  try {
    await loaded;
    state.sourceImage = image;
    state.sourceName = undo.sourceName;
    state.sourceOriginalDimensions = undo.sourceOriginalDimensions;
    state.sourceWasDownscaled = undo.sourceWasDownscaled;
    state.sourceResizeInfo = undo.sourceResizeInfo;
    state.imageRepairUndo = null;
    state.targetedTextRepair = null;
    state.componentSurfaceRepair = null;
    state.completeAuditRepair = null;
    state.scoreRepairBaseline = null;
    if (dom.undoImageRepairBtn) dom.undoImageRepairBtn.disabled = true;
    if (dom.textScanRepairProof) dom.textScanRepairProof.hidden = true;
    if (dom.componentScanRepairProof) dom.componentScanRepairProof.hidden = true;
    if (dom.completeRepairProof) dom.completeRepairProof.hidden = true;
    setMessage(`Restored the exact screenshot from before the ${undo.kind}. Re-running all six audit axes…`, 'info');
    await renderAll();
    setMessage(`Undid the ${undo.kind}; the original pixels and audit are restored.`, 'success');
  } catch (error) {
    setMessage(error.message || 'Could not undo the screenshot repair.', 'error');
  }
}

function updateFindingsCommandCenter() {
  if (!dom.findingsCommandCenter) return;

  const scan = state.textScan;
  const topImpact = getTopImpactEntry();
  const hasSource = Boolean(state.sourceImage);
  const hasAudit = Boolean(scan && state.hasRenderedSource && hasFullyRenderedSimulations());
  const belowAA = scan?.summary?.belowAA || 0;
  const cvdRisks = scan?.summary?.cvdHiddenFailures || 0;
  const apcaRisks = scan?.summary?.apcaFalsePasses || 0;
  const collisionRisks = state.paletteCollisions?.summary?.collisions || 0;
  const componentRisks = state.componentScan?.summary?.failing || 0;
  const targetRisks = state.targetSizeScan?.summary?.undersized || 0;
  const totalRisks = belowAA + cvdRisks + apcaRisks + collisionRisks + componentRisks + targetRisks;

  dom.findingTextIssueCount.textContent = hasAudit ? String(belowAA) : '—';
  dom.findingCvdIssueCount.textContent = hasAudit ? String(cvdRisks) : '—';
  dom.findingApcaIssueCount.textContent = hasAudit ? String(apcaRisks) : '—';
  dom.findingCollisionCount.textContent = hasAudit ? String(collisionRisks) : '—';
  dom.findingComponentIssueCount.textContent = hasAudit ? String(componentRisks) : '—';
  dom.findingTargetIssueCount.textContent = hasAudit ? String(targetRisks) : '—';
  dom.findingTopImpactValue.textContent = topImpact ? `${topImpact.impactPercent.toFixed(1)}%` : '—';
  renderClearsightScore(hasAudit ? computeCurrentAccessibilityScore() : null);
  dom.findingsVerdictBadge.className = 'findings-verdict-badge';

  if (!hasSource) {
    dom.findingsVerdictBadge.classList.add('is-waiting');
    dom.findingsVerdictBadge.textContent = 'Awaiting audit';
    dom.findingsCommandTitle.textContent = 'Your highest-priority findings will appear here.';
    dom.findingsCommandSummary.textContent = 'Run the guided demo or render your screenshot to turn twelve simulations and all six screenshot-audit axes into one clear decision.';
    dom.findingsNextAction.textContent = 'Load a source image to begin.';
    dom.findingsActionBtn.textContent = 'Start guided audit';
    dom.findingsActionBtn.disabled = false;
    dom.findingsActionBtn.onclick = () => dom.quickDemoBtn?.click();
    return;
  }

  if (!hasAudit) {
    dom.findingsVerdictBadge.classList.add('is-analyzing');
    dom.findingsVerdictBadge.textContent = state.isRendering ? 'Analyzing…' : 'Ready to analyze';
    dom.findingsCommandTitle.textContent = state.isRendering ? 'Building your accessibility verdict…' : 'Source ready. Run the full vision audit.';
    dom.findingsCommandSummary.textContent = 'ClearSight will rank visual shifts, scan text contrast, test WCAG 2, CVD, and APCA, then catch color-only distinctions that disappear.';
    dom.findingsNextAction.textContent = state.isRendering ? 'Keep this tab open while the local audit completes.' : 'Render all twelve simulations and scan the screenshot.';
    dom.findingsActionBtn.textContent = state.isRendering ? 'Audit in progress' : 'Run full audit';
    dom.findingsActionBtn.disabled = state.isRendering;
    dom.findingsActionBtn.onclick = () => dom.processBtn?.click();
    return;
  }

  const worst = scan.regions?.[0];
  const clean = totalRisks === 0;
  dom.findingsVerdictBadge.classList.add(clean ? 'is-clear' : 'is-action');
  dom.findingsVerdictBadge.textContent = clean ? 'No critical findings' : `${totalRisks} risk signal${totalRisks === 1 ? '' : 's'}`;
  dom.findingsCommandTitle.textContent = clean
    ? 'No critical visual-accessibility risks detected across all six axes.'
    : `${belowAA} text · ${cvdRisks + apcaRisks} perceptual · ${collisionRisks} color-cue · ${componentRisks} surface · ${targetRisks} target risk${totalRisks === 1 ? '' : 's'}.`;
  dom.findingsCommandSummary.textContent = `${scan.summary.total} text-like regions, ${state.paletteCollisions?.summary?.candidatePairs || 0} palette pairs, ${state.componentScan?.summary?.evaluated || 0} component surfaces, and ${state.targetSizeScan?.summary?.targets || 0} tap targets measured. ${topImpact ? `${topImpact.label} creates the largest visual shift at ${topImpact.impactPercent.toFixed(1)}%.` : ''}`;

  if (belowAA && worst) {
    dom.findingsNextAction.textContent = `Repair finding #1: ${worst.text.hex.toUpperCase()} on ${worst.background.hex.toUpperCase()} at ${worst.ratio.toFixed(2)}:1, then verify again.`;
    dom.findingsActionBtn.textContent = 'Inspect & repair worst';
    dom.findingsActionBtn.onclick = () => loadTextScanRegion(worst, 0, { guideToFix: true });
  } else if ((cvdRisks || apcaRisks) && worst) {
    const hidden = scan.regions.find((region) => region.cvd?.hiddenFailure || region.apca?.falsePass) || worst;
    const hiddenIndex = scan.regions.indexOf(hidden);
    dom.findingsNextAction.textContent = 'Inspect the first hidden-risk pair and choose a CVD-safe perceptual alternative.';
    dom.findingsActionBtn.textContent = 'Inspect hidden risk';
    dom.findingsActionBtn.onclick = () => loadTextScanRegion(hidden, hiddenIndex, { guideToFix: true });
  } else if (collisionRisks) {
    const collision = state.paletteCollisions.pairs?.[0];
    dom.findingsNextAction.textContent = collision
      ? `Review ${collision.colorA} vs ${collision.colorB}: the distinction collapses under ${getCvdModeShortLabel(collision.worst?.label || collision.worst?.id)}. Add a label, icon, or pattern.`
      : 'Review color-only distinctions and add a second visual cue.';
    dom.findingsActionBtn.textContent = 'Inspect color collision';
    dom.findingsActionBtn.onclick = () => {
      dom.collisionPanel?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      dom.collisionPanel?.focus({ preventScroll: true });
    };
  } else if (componentRisks) {
    const component = state.componentScan?.findings?.[0];
    dom.findingsNextAction.textContent = component
      ? `Repair the weakest component surface: ${component.surface} against ${component.surrounding} at ${component.ratio.toFixed(2)}:1, then verify all six axes.`
      : 'Repair the first component surface below the 3:1 non-text contrast minimum.';
    dom.findingsActionBtn.textContent = 'Inspect surface repair';
    dom.findingsActionBtn.onclick = () => {
      dom.componentScanResult?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      dom.componentScanList?.querySelector('button')?.focus({ preventScroll: true });
    };
  } else if (targetRisks) {
    const target = state.targetSizeScan?.findings?.[0];
    dom.findingsNextAction.textContent = target
      ? `Enlarge the ${target.widthCss}×${target.heightCss}px target to 24×24px or increase its clearance; this requires a layout change.`
      : 'Enlarge undersized controls to 24×24 CSS px or add enough spacing for the WCAG exception.';
    dom.findingsActionBtn.textContent = 'Inspect small targets';
    dom.findingsActionBtn.onclick = () => {
      dom.targetSizeResult?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      dom.targetSizeResult?.focus?.({ preventScroll: true });
    };
  } else {
    dom.findingsNextAction.textContent = 'Inspect the highest-impact simulation, then export the judge-ready evidence package.';
    dom.findingsActionBtn.textContent = 'Inspect peak simulation';
    dom.findingsActionBtn.onclick = () => topImpact && openSimulationPreviewByModeId(topImpact.modeId);
  }
  dom.findingsActionBtn.disabled = false;
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

function getAccessibilityRiskSummary() {
  const topImpact = getTopImpactEntry();
  const overallLevel = getOverallRiskLevel(topImpact?.impactLevel || 'neutral', state.lastContrastResult);
  const topImpactLabel = topImpact
    ? `${topImpact.label} (${topImpact.impactPercent === null ? 'N/A' : `${topImpact.impactPercent.toFixed(1)}%`})`
    : 'Not available';
  const contrastStatus = state.lastContrastResult
    ? `${state.lastContrastResult.passesAA ? 'PASS' : 'FAIL'} (${state.lastContrastResult.ratio.toFixed(1)}:1)`
    : 'Not run';

  return {
    level: overallLevel,
    label: ACCESSIBILITY_RISK_LABELS[overallLevel] || ACCESSIBILITY_RISK_LABELS.neutral,
    topImpactLabel,
    contrastStatus,
    hasImpactData: Boolean(topImpact),
  };
}

function updateRiskBadge() {
  if (!dom.riskBadge) {
    return;
  }

  if (!state.sourceImage) {
    dom.riskBadge.textContent = 'Accessibility risk: Not available';
    dom.riskBadge.className = 'risk-badge risk-neutral';
    return;
  }

  const riskSummary = getAccessibilityRiskSummary();

  const riskLines = [`Accessibility risk: ${riskSummary.label}`];
  if (!state.hasRenderedSource || !state.modeImpacts.length) {
    riskLines.push('Render simulations to assess visual and contrast risk');
  } else {
    riskLines.push(`Top impact: ${riskSummary.topImpactLabel}`);
    riskLines.push(`Contrast: ${riskSummary.contrastStatus}`);
  }

  dom.riskBadge.textContent = riskLines.join(' • ');
  dom.riskBadge.className = `risk-badge risk-${riskSummary.level}`;
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
    const requiresAaaUpgrade = state.lastContrastResult.passesAA && !state.lastContrastResult.passesAAA;
    bullets.push(
      `Contrast: <strong>${state.lastContrastResult.ratio.toFixed(1)}:1</strong> (AA ${state.currentContrastAaThreshold === AA_THRESHOLD_LARGE_TEXT ? '3.0' : '4.5'}:1 ${state.lastContrastResult.passesAA ? 'PASS' : 'FAIL'}, AAA 7:1 ${state.lastContrastResult.passesAAA ? 'PASS' : 'FAIL'}).`,
    );
    if (!state.lastContrastResult.passesAA) {
      const requiredAa = state.currentContrastAaThreshold === AA_THRESHOLD_LARGE_TEXT ? 3 : 4.5;
      bullets.push(`Raise contrast to at least ${requiredAa.toFixed(1)}:1 to satisfy AA baseline requirements.`);
    } else if (requiresAaaUpgrade) {
      bullets.push('AA passes, but this pair is below AAA (7.0:1). Consider the suggested upgrade if you want premium contrast quality.');
    }
  } else {
    bullets.push('Run the contrast checker to add WCAG validation to this snapshot.');
  }

  const remediationActions = buildRemediationActions({
    topImpactMode: topImpact,
    contrastState: state.lastContrastResult
      ? { ...state.lastContrastResult, cvdProjection: state.lastCvdProjection }
      : null,
    suggestionCount: Array.isArray(state.lastSuggestionPairs) ? state.lastSuggestionPairs.length : 0,
    paletteCollisions: buildPaletteCollisionReportSection(),
  });
  if (remediationActions.length) {
    bullets.push(`Remediation focus: ${remediationActions[0].text}`);
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
  updateRiskBadge();
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
  const readiness = getSubmissionReadiness();
  const riskLabel = report.accessibilityHealth?.label || ACCESSIBILITY_RISK_LABELS.neutral;
  lines.push(`Judge snapshot — ${sourceFile}`);
  lines.push(`Accessibility risk: ${riskLabel}`);
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
      `Contrast baseline (${report.contrast.lastChecked.aaThreshold.toFixed(1)}:1): ${status} ${report.contrast.text}/${report.contrast.background} → ${report.contrast.lastChecked.ratio.toFixed(2)}:1 (${formatContrastMargin(report.contrast.lastChecked.aaMargin)})`,
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

  if (report.remediationActions?.[0]?.text) {
    const topAction = report.remediationActions[0];
    const priority = topAction.priorityLabel || REMEDIATION_PRIORITY[topAction.priority] || REMEDIATION_PRIORITY.info;
    lines.push(`Top action (${priority}): ${topAction.text}`);
  }

  lines.push('');
  lines.push(`Submission readiness: ${readinessText(readiness)} (${readiness.readinessScore}%).`);
  lines.push(`Readiness next step: ${readiness.nextAction}`);
  lines.push(
    `Artifacts exported: Source ${readiness.isReady || Boolean(state.sourceImage) ? 'available' : 'pending'}, ` +
      `${getCompletedSimulationCount()}/${allModes.length} simulations complete, contrast check ${Boolean(state.lastContrastResult) ? 'run' : 'pending'}.`,
  );

  if (readiness.isReady && state.sourceImage) {
    const artifacts = buildSubmissionPackageArtifacts();
    if (artifacts) {
      lines.push('Expected package outputs:');
      lines.push(`- ${artifacts.packageZipFileName || 'submission-package.zip'}`);
      lines.push(`- ${artifacts.reportFileName || 'submission-report.json'}`);
      lines.push(`- ${artifacts.summaryFileName || 'judge-summary.md'}`);
      lines.push(`- ${artifacts.manifestFileName || 'submission-manifest.txt'}`);
      lines.push(`- ${artifacts.handoffPacketFileName || 'accessibility-handoff-packet.md'}`);
      lines.push(`- ${artifacts.handoffPacketJsonFileName || 'accessibility-handoff-packet.json'}`);
      lines.push(`- ${artifacts.auditPdfFileName || 'clearsight-audit-report.pdf'}`);
      lines.push(`- ${artifacts.conformanceFileName || 'clearsight-conformance-summary.md'}`);
      lines.push(`- ${artifacts.contactSheetFileName || 'submission-contact-sheet.png'}`);
    }
  }

  return lines.join('\n');
}

function readinessText(readiness) {
  return readiness && readiness.isReady ? 'judge-ready' : 'incomplete';
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

function formatJudgeTimer(seconds) {
  const safeSeconds = Math.max(0, Math.floor(Number(seconds) || 0));
  const minutes = Math.floor(safeSeconds / 60);
  const remaining = safeSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(remaining).padStart(2, '0')}`;
}

function getJudgeTimerPhase(remainingSeconds) {
  const safeRemaining = Math.max(0, Math.floor(Number(remainingSeconds) || 0));
  const elapsed = JUDGE_TIMER_DURATION_SECONDS - safeRemaining;

  for (const phase of JUDGE_TIMER_PHASES) {
    if (elapsed < phase.end) {
      return phase;
    }
  }

  return JUDGE_TIMER_PHASES[JUDGE_TIMER_PHASES.length - 1];
}

function renderJudgeTimer() {
  if (!dom.judgeTimerText || !dom.judgeTimerFill || !dom.judgeTimerBar) {
    return;
  }

  if (!state.judgeTimer.started) {
    dom.judgeTimerText.textContent = 'Start the 90-second judge flow timer when you begin your live walkthrough.';
    dom.judgeTimerFill.style.width = '0%';
    dom.judgeTimerBar.setAttribute('aria-valuemin', '0');
    dom.judgeTimerBar.setAttribute('aria-valuemax', String(JUDGE_TIMER_DURATION_SECONDS));
    dom.judgeTimerBar.setAttribute('aria-valuenow', '0');
    updateWorkflowTimeline();
    return;
  }

  const remaining = Math.max(0, Math.floor(Number(state.judgeTimer.remainingSeconds) || 0));
  const elapsed = Math.max(0, JUDGE_TIMER_DURATION_SECONDS - remaining);
  const phase = getJudgeTimerPhase(remaining);
  const progressPercent = Math.max(0, Math.min(100, Math.round((elapsed / JUDGE_TIMER_DURATION_SECONDS) * 100)));

  dom.judgeTimerFill.style.width = `${progressPercent}%`;
  dom.judgeTimerBar.setAttribute('aria-valuemin', '0');
  dom.judgeTimerBar.setAttribute('aria-valuemax', String(JUDGE_TIMER_DURATION_SECONDS));
  dom.judgeTimerBar.setAttribute('aria-valuenow', String(elapsed));

  const phaseLabel = `${phase.label}: ${phase.cue}`;
  if (remaining <= 0) {
    dom.judgeTimerText.textContent = `Judge timer complete. ${phaseLabel}.`;
    updateWorkflowTimeline();
    return;
  }

  const stateLabel = state.judgeTimer.isRunning
    ? `${formatJudgeTimer(remaining)} remaining`
    : `${formatJudgeTimer(remaining)} paused`;
  dom.judgeTimerText.textContent = `${stateLabel} · ${phaseLabel}`;
  updateWorkflowTimeline();
}

function stopJudgeTimer() {
  if (state.judgeTimer.intervalId) {
    clearInterval(state.judgeTimer.intervalId);
    state.judgeTimer.intervalId = null;
  }
  state.judgeTimer.isRunning = false;
  renderJudgeTimer();
}

function resetJudgeTimer() {
  stopJudgeTimer();
  state.judgeTimer.started = false;
  state.judgeTimer.startAt = null;
  state.judgeTimer.remainingSeconds = JUDGE_TIMER_DURATION_SECONDS;
  if (dom.judgeTimerStartBtn) {
    dom.judgeTimerStartBtn.textContent = 'Start 90s judge timer';
  }
  renderJudgeTimer();
}

function startJudgeTimer({ forceRestart = false } = {}) {
  if (state.judgeTimer.isRunning && !forceRestart) {
    setMessage('Judge timer is already running.', 'info');
    return;
  }

  if (!dom.judgeTimerStartBtn) {
    return;
  }

  stopJudgeTimer();
  state.judgeTimer.started = true;
  state.judgeTimer.isRunning = true;
  state.judgeTimer.startAt = Date.now();
  state.judgeTimer.remainingSeconds = JUDGE_TIMER_DURATION_SECONDS;
  dom.judgeTimerStartBtn.textContent = 'Restart 90s judge timer';
  renderJudgeTimer();
  setMessage('90-second judge timer started.', 'info');

  state.judgeTimer.intervalId = setInterval(() => {
    if (!state.judgeTimer.isRunning) {
      return;
    }

    const elapsed = Math.floor((Date.now() - state.judgeTimer.startAt) / 1000);
    state.judgeTimer.remainingSeconds = Math.max(0, JUDGE_TIMER_DURATION_SECONDS - elapsed);
    renderJudgeTimer();

    if (state.judgeTimer.remainingSeconds <= 0) {
      stopJudgeTimer();
      if (dom.judgeTimerStartBtn) {
        dom.judgeTimerStartBtn.textContent = 'Start 90s judge timer';
      }
      setMessage('Judge timer finished. Finish exports and artifact handoff now.', 'info');
    }
  }, 300);
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
  if (!dom.previewModal || !dom.previewModalCanvas) {
    return;
  }

  stopPreviewModalSlideshow();
  dom.previewModal.hidden = true;
  dom.previewModal.setAttribute('aria-hidden', 'true');
  dom.previewModalCanvas.width = 0;
  dom.previewModalCanvas.height = 0;
  dom.previewModalCanvas.removeAttribute('aria-label');
  document.body.style.overflow = '';

  if (activePreviewModalCompareCleanup) {
    activePreviewModalCompareCleanup();
    activePreviewModalCompareCleanup = null;
  }

  activePreviewModalModes = [];
  activePreviewModalModeIndex = -1;
  if (dom.previewModalPrevBtn) {
    dom.previewModalPrevBtn.disabled = true;
  }
  if (dom.previewModalNextBtn) {
    dom.previewModalNextBtn.disabled = true;
  }
  if (dom.previewModalIndexLabel) {
    dom.previewModalIndexLabel.textContent = '0 / 0';
  }

  if (dom.previewModalCompareSlider) {
    dom.previewModalCompareSlider.value = String(COMPARE_DEFAULT_PERCENT);
    dom.previewModalCompareSlider.disabled = true;
  }

  if (dom.previewModalCompareValue) {
    dom.previewModalCompareValue.textContent = `${COMPARE_DEFAULT_PERCENT}%`;
  }

  if (dom.previewModalPlayBtn) {
    dom.previewModalPlayBtn.disabled = true;
    dom.previewModalPlayBtn.textContent = 'Play slideshow';
    dom.previewModalPlayBtn.setAttribute('aria-pressed', 'false');
    dom.previewModalPlayBtn.setAttribute('aria-label', 'Start preview slideshow');
  }

  if (modalReturnFocusElement && typeof modalReturnFocusElement.focus === 'function') {
    modalReturnFocusElement.focus();
  }
  modalReturnFocusElement = null;
}

function stopPreviewModalSlideshow() {
  if (!previewModalSlideshowTimer) {
    return;
  }

  clearInterval(previewModalSlideshowTimer);
  previewModalSlideshowTimer = null;

  if (dom.previewModalPlayBtn) {
    dom.previewModalPlayBtn.textContent = 'Play slideshow';
    dom.previewModalPlayBtn.setAttribute('aria-pressed', 'false');
    dom.previewModalPlayBtn.setAttribute('aria-label', 'Start preview slideshow');
  }
}

function startPreviewModalSlideshow() {
  const canRun =
    !dom.previewModal?.hidden &&
    activePreviewModalModes.length > 1 &&
    activePreviewModalModeIndex >= 0;
  if (!canRun) {
    stopPreviewModalSlideshow();
    return;
  }

  if (previewModalSlideshowTimer) {
    return;
  }

  previewModalSlideshowTimer = window.setInterval(() => {
    if (dom.previewModal?.hidden || activePreviewModalModes.length <= 1 || activePreviewModalModeIndex < 0) {
      stopPreviewModalSlideshow();
      return;
    }

    navigatePreviewModal(1);
  }, PREVIEW_MODAL_SLIDESHOW_INTERVAL_MS);

  if (dom.previewModalPlayBtn) {
    dom.previewModalPlayBtn.textContent = 'Pause slideshow';
    dom.previewModalPlayBtn.setAttribute('aria-pressed', 'true');
    dom.previewModalPlayBtn.setAttribute('aria-label', 'Pause preview slideshow');
  }
}

function togglePreviewModalSlideshow() {
  if (!dom.previewModalPlayBtn || dom.previewModalPlayBtn.disabled) {
    return;
  }

  if (previewModalSlideshowTimer) {
    stopPreviewModalSlideshow();
    return;
  }

  startPreviewModalSlideshow();
}

function refreshPreviewModalPlayButtonState() {
  if (!dom.previewModalPlayBtn) {
    return;
  }

  const canRun = activePreviewModalModes.length > 1 && activePreviewModalModeIndex >= 0;
  dom.previewModalPlayBtn.disabled = !canRun;

  if (!canRun) {
    stopPreviewModalSlideshow();
    return;
  }

  if (!previewModalSlideshowTimer) {
    dom.previewModalPlayBtn.textContent = 'Play slideshow';
    dom.previewModalPlayBtn.setAttribute('aria-pressed', 'false');
    dom.previewModalPlayBtn.setAttribute('aria-label', 'Start preview slideshow');
    return;
  }

  dom.previewModalPlayBtn.textContent = 'Pause slideshow';
  dom.previewModalPlayBtn.setAttribute('aria-pressed', 'true');
  dom.previewModalPlayBtn.setAttribute('aria-label', 'Pause preview slideshow');
}

function updatePreviewModalNavigation() {
  if (!dom.previewModalPrevBtn || !dom.previewModalNextBtn || !dom.previewModalIndexLabel) {
    return;
  }

  const canNavigate = activePreviewModalModes.length > 1 && activePreviewModalModeIndex >= 0;
  dom.previewModalPrevBtn.disabled = !canNavigate;
  dom.previewModalNextBtn.disabled = !canNavigate;

  if (activePreviewModalModes.length === 0 || activePreviewModalModeIndex < 0) {
    dom.previewModalIndexLabel.textContent = '0 / 0';
    return;
  }

  dom.previewModalIndexLabel.textContent = `${activePreviewModalModeIndex + 1} / ${activePreviewModalModes.length}`;
  refreshPreviewModalPlayButtonState();
}

function getPreviewModalSequence() {
  return [...dom.simGrid.querySelectorAll('.sim-card')]
    .filter((card) => !card.classList.contains('is-filtered-out'))
    .map((card) => ({
      modeId: card.dataset.mode,
      label: card.querySelector('.sim-title')?.textContent || card.dataset.mode,
      canvas: card.querySelector('.sim-canvas'),
      sourceCanvas: card.querySelector('.sim-source-canvas'),
      card,
    }))
    .filter((entry) => {
      if (!entry.modeId) {
        return false;
      }
      if (!entry.card?.classList.contains('is-done')) {
        return false;
      }
      if (!entry.canvas || !entry.canvas.width || !entry.canvas.height) {
        return false;
      }
      return true;
    });
}

function navigatePreviewModal(direction = 0) {
  if (!dom.previewModal || dom.previewModal.hidden) {
    return;
  }

  if (!activePreviewModalModes.length || activePreviewModalModeIndex < 0) {
    return;
  }

  if (activePreviewModalModes.length <= 1) {
    return;
  }

  const nextIndex = (activePreviewModalModeIndex + direction + activePreviewModalModes.length) % activePreviewModalModes.length;
  if (nextIndex === activePreviewModalModeIndex) {
    return;
  }

  const next = activePreviewModalModes[nextIndex];
  if (!next) {
    return;
  }

  openPreviewModal(next);
}

function setShortcutHelp(open) {
  if (!dom.shortcutHelp) {
    return;
  }

  const nextState = Boolean(open);
  if (nextState) {
    dom.shortcutHelp.setAttribute('open', '');
    const currentQuery = dom.shortcutHelpSearchInput?.value || '';
    filterShortcutHelpList(currentQuery);
    const summary = dom.shortcutHelp.querySelector('summary');
    const focusTarget = dom.shortcutHelpSearchInput || summary;
    if (focusTarget && typeof focusTarget.focus === 'function') {
      requestAnimationFrame(() => {
        focusTarget.focus();
      });
    }
  } else {
    dom.shortcutHelp.removeAttribute('open');
  }
}

function filterShortcutHelpList(query = '') {
  if (!dom.shortcutHelp) {
    return;
  }

  const list = dom.shortcutHelp.querySelector('.shortcut-help-list');
  if (!list) {
    return;
  }

  const normalized = String(query || '').trim().toLowerCase();
  const items = list.querySelectorAll('li');
  let visible = 0;

  for (const item of items) {
    const text = (item.textContent || '').toLowerCase();
    const show = normalized.length === 0 || text.includes(normalized);
    item.classList.toggle('is-hidden-shortcut', !show);
    if (show) {
      visible += 1;
    }
  }

  if (dom.shortcutHelpNoResults) {
    dom.shortcutHelpNoResults.hidden = !(normalized.length > 0 && visible === 0);
  }
}

function toggleShortcutHelp() {
  if (!dom.shortcutHelp) {
    return;
  }
  setShortcutHelp(!dom.shortcutHelp.open);
}

function getSimulationCardsForNavigation() {
  if (!dom.simGrid) {
    return [];
  }
  return [...dom.simGrid.querySelectorAll('.sim-card:not(.is-filtered-out)')];
}

function syncSimulationCardTabOrder() {
  const cards = getSimulationCardsForNavigation();
  if (!cards.length) {
    return;
  }

  cards.forEach((card, index) => {
    card.tabIndex = index === 0 ? 0 : -1;
  });
}

function initializeSimulationGridKeyboardNav() {
  if (!dom.simGrid) {
    return;
  }

  const getColumns = (cards) => {
    if (!cards.length || !cards[0]) {
      return 1;
    }

    const firstTop = cards[0].offsetTop;
    let columns = 0;
    for (const card of cards) {
      if (Math.abs(card.offsetTop - firstTop) > 2) {
        break;
      }
      columns += 1;
    }

    return Math.max(1, Math.min(columns, cards.length));
  };

  const focusCard = (card) => {
    const cards = getSimulationCardsForNavigation();
    const targetIndex = cards.indexOf(card);
    if (targetIndex < 0) {
      return;
    }

    cards.forEach((entry, index) => {
      entry.tabIndex = index === targetIndex ? 0 : -1;
    });
    card.focus();
  };

  const getIndexInRow = (row, col, columns, total) => {
    const rowStart = row * columns;
    const rowEnd = Math.min(rowStart + columns - 1, total - 1);

    if (rowStart > rowEnd) {
      return Math.max(0, total - 1);
    }

    return Math.min(rowStart + Math.max(0, Math.min(col, columns - 1)), rowEnd);
  };

  const onSimulationGridKeydown = (event) => {
    const key = event.key;
    if (
      key !== 'ArrowLeft' &&
      key !== 'ArrowRight' &&
      key !== 'ArrowUp' &&
      key !== 'ArrowDown' &&
      key !== 'Home' &&
      key !== 'End'
    ) {
      return;
    }

    const cards = getSimulationCardsForNavigation();
    if (!cards.length) {
      return;
    }

    const activeCard = event.target instanceof Element ? event.target.closest('.sim-card') : null;
    if (!activeCard) {
      return;
    }

    const activeIndex = cards.indexOf(activeCard);
    if (activeIndex < 0) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();

    if (key === 'Home') {
      focusCard(cards[0]);
      return;
    }

    if (key === 'End') {
      focusCard(cards[cards.length - 1]);
      return;
    }

    const columns = getColumns(cards);
    const total = cards.length;
    const rows = Math.max(1, Math.ceil(total / columns));
    const currentRow = Math.floor(activeIndex / columns);
    const currentCol = activeIndex % columns;
    let nextRow = currentRow;
    let nextCol = currentCol;

    if (key === 'ArrowLeft') {
      nextCol = (currentCol - 1 + columns) % columns;
    } else if (key === 'ArrowRight') {
      nextCol = (currentCol + 1) % columns;
    } else if (key === 'ArrowUp') {
      nextRow = (currentRow - 1 + rows) % rows;
    } else if (key === 'ArrowDown') {
      nextRow = (currentRow + 1) % rows;
    }

    const nextIndex = getIndexInRow(nextRow, nextCol, columns, total);
    focusCard(cards[nextIndex]);
  };

  dom.simGrid.addEventListener('keydown', onSimulationGridKeydown);
  syncSimulationCardTabOrder();
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

function syncPreviewModalCompareControls(value = COMPARE_DEFAULT_PERCENT) {
  const normalized = clampComparePercent(value);

  if (dom.previewModalCompareSlider) {
    dom.previewModalCompareSlider.value = String(normalized);
  }

  if (dom.previewModalCompareValue) {
    dom.previewModalCompareValue.textContent = `${normalized}%`;
  }

  return normalized;
}

function renderPreviewModalBlend(simCanvas, sourceCanvas, comparePercent = COMPARE_DEFAULT_PERCENT) {
  const compare = syncPreviewModalCompareControls(comparePercent);
  const normalized = compare / 100;

  if (!dom.previewModalCanvas || !dom.previewModalCanvas.getContext) {
    throw new Error('Unable to render the modal preview in this browser.');
  }

  if (!simCanvas || !sourceCanvas) {
    throw new Error('Missing source and simulation preview canvases for modal compare.');
  }

  const targetWidth = Math.max(1, simCanvas.width || sourceCanvas.width || 1);
  const targetHeight = Math.max(1, simCanvas.height || sourceCanvas.height || 1);
  const splitWidth = Math.max(0, Math.round(targetWidth * normalized));

  const ctx = dom.previewModalCanvas.getContext('2d');
  dom.previewModalCanvas.width = targetWidth;
  dom.previewModalCanvas.height = targetHeight;
  dom.previewModalCanvas.setAttribute('aria-label', 'Comparison of source image and simulation preview.');

  if (!ctx) {
    throw new Error('Unable to render the modal preview in this browser.');
  }

  ctx.imageSmoothingEnabled = true;
  ctx.drawImage(sourceCanvas, 0, 0, targetWidth, targetHeight);

  if (splitWidth > 0 && splitWidth <= targetWidth) {
    const sourceSimWidth = Math.max(1, Math.round((simCanvas.width || targetWidth) * normalized));
    ctx.drawImage(
      simCanvas,
      0,
      0,
      sourceSimWidth,
      simCanvas.height || targetHeight,
      0,
      0,
      splitWidth,
      targetHeight,
    );
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

const XRAY_LOUPE_SOURCE_SPAN = 48;
const XRAY_KEY_STEP = 8;
let xrayPointerRafId = null;
let xrayPointerPending = null;

function xrayLevelLabel(level) {
  if (level === 'aaa') return 'AAA pass';
  if (level === 'aa') return 'AA pass';
  if (level === 'aa-large') return 'AA large-text only';
  return 'Below AA';
}

function hideXrayLoupe() {
  if (xrayPointerRafId !== null) {
    cancelAnimationFrame(xrayPointerRafId);
    xrayPointerRafId = null;
  }
  xrayPointerPending = null;
  if (dom.xrayLoupe) {
    dom.xrayLoupe.hidden = true;
  }
}

function setXrayActive(active, { notify = true } = {}) {
  const next = Boolean(active);
  if (next && !state.hasRenderedSource) {
    if (notify) {
      setMessage('Render the source image before using the contrast X-ray.', 'error');
    }
    return;
  }
  if (state.xrayActive === next) {
    return;
  }
  state.xrayActive = next;
  dom.xrayToggleBtn?.setAttribute('aria-pressed', next ? 'true' : 'false');
  dom.xrayToggleBtn?.classList?.toggle('is-active', next);
  dom.sourceCanvas?.classList?.toggle('is-xray', next);
  if (next) {
    dom.sourceCanvas?.setAttribute('tabindex', '0');
    const width = state.sourceImageData?.width || dom.sourceCanvas?.width || 0;
    const height = state.sourceImageData?.height || dom.sourceCanvas?.height || 0;
    state.xrayPoint = { x: Math.floor(width / 2), y: Math.floor(height / 2) };
    if (notify) {
      setMessage(
        'Contrast X-ray on: hover the source preview to probe any spot; click (or focus the preview and press Enter) to send the sampled pair to the checker. Esc exits.',
        'info',
      );
    }
  } else {
    dom.sourceCanvas?.removeAttribute('tabindex');
    hideXrayLoupe();
    state.xrayPoint = null;
    state.lastXraySample = null;
    if (dom.xraySrStatus) {
      dom.xraySrStatus.textContent = '';
    }
    if (notify) {
      setMessage('Contrast X-ray off.', 'info');
    }
  }
}

function positionXrayLoupe(canvasPoint) {
  if (!dom.xrayLoupe || !dom.sourceCanvas) {
    return;
  }
  const rect = dom.sourceCanvas.getBoundingClientRect();
  if (!rect.width || !rect.height) {
    return;
  }
  const cssX = (canvasPoint.x / dom.sourceCanvas.width) * rect.width;
  const cssY = (canvasPoint.y / dom.sourceCanvas.height) * rect.height;
  const loupeWidth = dom.xrayLoupe.offsetWidth || 150;
  const loupeHeight = dom.xrayLoupe.offsetHeight || 230;
  let left = cssX + 18;
  if (left + loupeWidth > rect.width && cssX - 18 - loupeWidth >= 0) {
    left = cssX - 18 - loupeWidth;
  }
  left = Math.max(0, Math.min(left, Math.max(0, rect.width - loupeWidth)));
  let top = cssY + 18;
  if (top + loupeHeight > rect.height) {
    top = Math.max(0, cssY - 18 - loupeHeight);
  }
  top = Math.max(0, Math.min(top, Math.max(0, rect.height - loupeHeight)));
  dom.xrayLoupe.style.left = `${Math.round(left)}px`;
  dom.xrayLoupe.style.top = `${Math.round(top)}px`;
}

function appendXraySwatch(parent, hexColor) {
  const swatch = document.createElement('span');
  swatch.className = 'xray-swatch';
  swatch.style.background = hexColor;
  swatch.setAttribute('aria-hidden', 'true');
  parent.append(swatch);
}

function appendXrayLine(readout, text, tone = null) {
  const line = document.createElement('p');
  line.className = 'xray-line';
  if (tone) {
    line.dataset.tone = tone;
  }
  line.textContent = text;
  readout.append(line);
  return line;
}

function renderXrayReadout(sample) {
  const readout = dom.xrayReadout;
  if (!readout) {
    return;
  }
  readout.textContent = '';
  if (!sample) {
    return;
  }

  if (sample.flat) {
    const flatLine = document.createElement('p');
    flatLine.className = 'xray-line xray-pair';
    appendXraySwatch(flatLine, sample.color.hex);
    const label = document.createElement('span');
    label.textContent = `${sample.color.hex.toUpperCase()} · uniform area`;
    flatLine.append(label);
    readout.append(flatLine);
    appendXrayLine(readout, 'Move toward text or an edge to probe a pair.');
    return;
  }

  const pairLine = document.createElement('p');
  pairLine.className = 'xray-line xray-pair';
  appendXraySwatch(pairLine, sample.text.hex);
  const textLabel = document.createElement('span');
  textLabel.textContent = sample.text.hex.toUpperCase();
  const joiner = document.createElement('span');
  joiner.className = 'xray-joiner';
  joiner.textContent = 'on';
  const bgLabel = document.createElement('span');
  bgLabel.textContent = sample.background.hex.toUpperCase();
  pairLine.append(textLabel, joiner);
  appendXraySwatch(pairLine, sample.background.hex);
  pairLine.append(bgLabel);
  readout.append(pairLine);

  const wcagTone = sample.passesAA ? 'pass' : sample.level === 'aa-large' ? 'warn' : 'fail';
  appendXrayLine(readout, `${sample.ratio.toFixed(2)}:1 · ${xrayLevelLabel(sample.level)}`, wcagTone);

  const cvdTone =
    sample.cvd.failingModes.length === 0 ? 'pass' : sample.cvd.hiddenFailure ? 'fail' : 'warn';
  appendXrayLine(
    readout,
    `CVD worst ${sample.cvd.worstRatio.toFixed(2)}:1 · ${sample.cvd.worstLabel}${sample.cvd.hiddenFailure ? ' · hidden failure' : ''}`,
    cvdTone,
  );

  const apcaTone = sample.apca.falsePass
    ? 'warn'
    : sample.apca.passesFluentText
      ? 'pass'
      : sample.passesAA
        ? 'warn'
        : 'fail';
  appendXrayLine(
    readout,
    `APCA Lc ${Math.round(sample.apca.absLc)} · ${sample.apca.rating}${sample.apca.falsePass ? ' · perceptual risk' : ''}`,
    apcaTone,
  );
}

function renderXrayLoupe(sample, canvasPoint) {
  if (!dom.xrayLoupe || !dom.xrayLoupeCanvas || !dom.sourceCanvas) {
    return;
  }
  const loupeCanvas = dom.xrayLoupeCanvas;
  const ctx = loupeCanvas.getContext('2d');
  if (ctx) {
    const source = dom.sourceCanvas;
    const span = Math.max(8, Math.min(XRAY_LOUPE_SOURCE_SPAN, source.width, source.height));
    const sx = Math.min(Math.max(0, canvasPoint.x - span / 2), Math.max(0, source.width - span));
    const sy = Math.min(Math.max(0, canvasPoint.y - span / 2), Math.max(0, source.height - span));
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, loupeCanvas.width, loupeCanvas.height);
    ctx.drawImage(source, sx, sy, span, span, 0, 0, loupeCanvas.width, loupeCanvas.height);
    const crossX = ((canvasPoint.x - sx) / span) * loupeCanvas.width;
    const crossY = ((canvasPoint.y - sy) / span) * loupeCanvas.height;
    ctx.strokeStyle = 'rgba(15, 23, 42, 0.85)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(crossX + 0.5, 0);
    ctx.lineTo(crossX + 0.5, loupeCanvas.height);
    ctx.moveTo(0, crossY + 0.5);
    ctx.lineTo(loupeCanvas.width, crossY + 0.5);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.strokeRect(crossX - 3.5, crossY - 3.5, 7, 7);
  }
  renderXrayReadout(sample);
  dom.xrayLoupe.hidden = false;
  positionXrayLoupe(canvasPoint);
}

function describeXraySample(sample, x, y) {
  if (!sample) {
    return '';
  }
  if (sample.flat) {
    return `Probe at ${x}, ${y}: uniform ${sample.color.hex.toUpperCase()} area, no contrast pair.`;
  }
  return [
    `Probe at ${x}, ${y}: ${sample.text.hex.toUpperCase()} on ${sample.background.hex.toUpperCase()}, ${sample.ratio.toFixed(2)} to 1, ${xrayLevelLabel(sample.level)}.`,
    `Color-vision worst ${sample.cvd.worstRatio.toFixed(2)} to 1 under ${sample.cvd.worstLabel}${sample.cvd.hiddenFailure ? ', hidden failure' : ''}.`,
    `APCA Lc ${Math.round(sample.apca.absLc)}${sample.apca.falsePass ? ', perceptual risk' : ''}.`,
  ].join(' ');
}

function sampleXrayAtCanvasPoint(x, y, { announce = false } = {}) {
  if (!state.xrayActive || !state.sourceImageData) {
    return null;
  }
  const { width, height } = state.sourceImageData;
  const px = Math.min(width - 1, Math.max(0, Math.round(x)));
  const py = Math.min(height - 1, Math.max(0, Math.round(y)));
  let sample = null;
  try {
    sample = sampleRegionContrast(state.sourceImageData.data, width, height, px, py, {
      aaThreshold: state.currentContrastAaThreshold,
    });
  } catch {
    return null;
  }
  state.xrayPoint = { x: px, y: py };
  state.lastXraySample = sample;
  renderXrayLoupe(sample, { x: px, y: py });
  if (announce && dom.xraySrStatus) {
    dom.xraySrStatus.textContent = describeXraySample(sample, px, py);
  }
  return sample;
}

function handleXrayPointerMove(event) {
  if (!state.xrayActive || !state.sourceImageData || !dom.sourceCanvas) {
    return;
  }
  const rect = dom.sourceCanvas.getBoundingClientRect();
  if (!rect.width || !rect.height) {
    return;
  }
  xrayPointerPending = {
    x: ((event.clientX - rect.left) / rect.width) * dom.sourceCanvas.width,
    y: ((event.clientY - rect.top) / rect.height) * dom.sourceCanvas.height,
  };
  if (xrayPointerRafId !== null) {
    return;
  }
  xrayPointerRafId = requestAnimationFrame(() => {
    xrayPointerRafId = null;
    if (!xrayPointerPending) {
      return;
    }
    const point = xrayPointerPending;
    xrayPointerPending = null;
    sampleXrayAtCanvasPoint(point.x, point.y);
  });
}

function applyXraySampleToChecker() {
  const sample = state.lastXraySample;
  if (!sample || sample.flat) {
    setMessage('No contrast pair under the X-ray probe yet — hover text or an edge first.', 'info');
    return;
  }
  const textHex = normalizeHexInput(sample.text.hex);
  const bgHex = normalizeHexInput(sample.background.hex);
  if (!textHex || !bgHex) {
    setMessage('X-ray sample could not be parsed into checker colors.', 'error');
    return;
  }
  clearContrastUndoState();
  state.lastAppliedContrastSuggestion = null;
  setContrastPair(textHex, bgHex);
  clearContrastValidation();
  renderContrastResult();
  setMessage(
    `X-ray pair sent to checker: ${textHex.toUpperCase()} on ${bgHex.toUpperCase()} (${sample.ratio.toFixed(2)}:1).`,
    'success',
  );
}

function moveXrayProbe(dx, dy) {
  if (!state.xrayActive || !state.sourceImageData) {
    return;
  }
  const current = state.xrayPoint || {
    x: Math.floor(state.sourceImageData.width / 2),
    y: Math.floor(state.sourceImageData.height / 2),
  };
  sampleXrayAtCanvasPoint(current.x + dx, current.y + dy, { announce: true });
}

function swapContrastColors() {
  const textHex = normalizeHexInput(dom.contrastTextHex.value || dom.contrastText?.value);
  const bgHex = normalizeHexInput(dom.contrastBgHex.value || dom.contrastBg?.value);

  if (!textHex || !bgHex) {
    setMessage('Set both text and background colors before swapping.', 'error');
    return;
  }

  setContrastPair(bgHex, textHex, { trackUndo: false });
  clearContrastUndoState();
  state.lastAppliedContrastSuggestion = null;
  renderContrastResult();
  setMessage('Contrast text/background colors swapped.', 'success');
}

function setContrastColor(target, hexColor) {
  if (!hexColor) {
    return;
  }
  clearContrastUndoState();
  if (target === COLOR_PICKER_TARGET_TEXT) {
    setContrastPair(hexColor, dom.contrastBgHex?.value || dom.contrastBg?.value);
    return;
  }

  setContrastPair(dom.contrastTextHex?.value || dom.contrastText?.value, hexColor);
}

function undoLastContrastChange() {
  const undoPair = state.lastContrastUndoPair;
  if (!undoPair || !undoPair.text || !undoPair.background) {
    setMessage('No contrast change to undo.', 'info');
    return;
  }

  if (!setContrastPair(undoPair.text, undoPair.background)) {
    setMessage('Unable to restore the previous contrast pair.', 'error');
    return;
  }

  state.lastContrastUndoPair = null;
  state.lastAppliedContrastSuggestion = null;
  updateContrastUndoButtonState();
  renderContrastResult();
  setMessage('Undid last contrast change.', 'success');
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
    const reason = button.dataset?.unavailableMessage;
    setMessage(
      reason ? `${actionName} is currently unavailable. ${reason}` : `${actionName} is currently unavailable.`,
      'info',
    );
    return;
  }

  action();
}

function runKeyboardShortcut(event) {
  if (!event) {
    return;
  }

  if (event.defaultPrevented || event.isComposing || event.ctrlKey || event.metaKey || event.altKey) {
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
    if (state.xrayActive) {
      setXrayActive(false);
      return;
    }
    if (cancelRenderSession()) {
      setMessage('Render canceled.', 'info');
      return;
    }
  }

  if (!dom.previewModal?.hidden && event.key === 'Tab') {
    trapPreviewModalFocus(event);
    return;
  }

  if (!dom.previewModal?.hidden) {
    if (event.key === ' ' && event.target !== dom.previewModalCompareSlider) {
      event.preventDefault();
      stopPreviewModalSlideshow();
      togglePreviewModalSlideshow();
      return;
    }

    if (event.key === 'l' && event.target !== dom.previewModalCompareSlider) {
      event.preventDefault();
      togglePreviewModalSlideshow();
      return;
    }

    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      if (event.target === dom.previewModalCompareSlider) {
        return;
      }

      event.preventDefault();
      stopPreviewModalSlideshow();
      navigatePreviewModal(event.key === 'ArrowLeft' ? -1 : 1);
      return;
    }

    if (event.key === 'Home') {
      event.preventDefault();
      stopPreviewModalSlideshow();
      if (activePreviewModalModes.length > 0) {
        openPreviewModal(activePreviewModalModes[0]);
      }
      return;
    }

    if (event.key === 'End') {
      event.preventDefault();
      stopPreviewModalSlideshow();
      if (activePreviewModalModes.length > 0) {
        openPreviewModal(activePreviewModalModes[activePreviewModalModes.length - 1]);
      }
      return;
    }

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
    l: () => runIfAvailable(dom.previewModalPlayBtn, 'Toggle preview slideshow', () => togglePreviewModalSlideshow()),
    v: () => runIfAvailable(dom.copyContrastBtn, 'Copy contrast result', () => dom.copyContrastBtn.click()),
    k: () => runIfAvailable(dom.copyContrastCssBtn, 'Copy contrast CSS snippet', () => dom.copyContrastCssBtn.click()),
    w: () => runIfAvailable(dom.swapContrastBtn, 'Swap contrast colors', () => dom.swapContrastBtn.click()),
    f: () => runIfAvailable(dom.autoFixContrastBtn, 'Auto-fix contrast', () => dom.autoFixContrastBtn.click()),
    a: () => runIfAvailable(dom.suggestBtn, 'Palette suggestion', () => dom.suggestBtn.click()),
    o: () => runIfAvailable(dom.undoContrastBtn, 'Undo last contrast change', () => dom.undoContrastBtn.click()),
    m: () => runIfAvailable(dom.copyManifestBtn, 'Submission manifest copy', () => dom.copyManifestBtn.click()),
    s: () => runIfAvailable(dom.copyJudgeSnapshotBtn, 'Judge snapshot copy', () => dom.copyJudgeSnapshotBtn.click()),
    e: () =>
      runIfAvailable(
        dom.copyWorkflowSnapshotBtn,
        'Judge workflow snapshot copy',
        () => dom.copyWorkflowSnapshotBtn.click(),
      ),
    j: () => runIfAvailable(dom.downloadSummaryBtn, 'Judge summary export', () => dom.downloadSummaryBtn.click()),
    z: () =>
      runIfAvailable(
        dom.downloadPackageBtn,
        'Download submission package',
        () => dom.downloadPackageBtn.click(),
      ),
    n: () =>
      runIfAvailable(
        dom.copyHandoffPacketJsonBtn,
        'Accessibility handoff JSON copy',
        () => dom.copyHandoffPacketJsonBtn.click(),
      ),
    q: () =>
      runIfAvailable(
        dom.quickDemoBtn,
        'Quick judge workflow',
        () => {
          void runQuickJudgeWorkflow();
        },
      ),
    x: () => runIfAvailable(dom.copyReportJsonBtn, 'Accessibility report copy', () => dom.copyReportJsonBtn.click()),
    y: () => runIfAvailable(dom.copyReportCsvBtn, 'Accessibility report CSV copy', () => dom.copyReportCsvBtn.click()),
    p: () => openTopImpactPreview(),
    i: () =>
      runIfAvailable(
        dom.downloadContrastSnapshotBtn,
        'Download contrast snapshot',
        () => dom.downloadContrastSnapshotBtn.click(),
      ),
    g: () =>
      runIfAvailable(
        dom.finalizeHandoffBtn,
        'Finalize judge handoff',
        () => {
          void runJudgeHandoffFlow();
        },
      ),
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

function openPreviewModal({ modeId, label, canvas, sourceCanvas }) {
  if (
    !dom.previewModal ||
    !dom.previewModalTitle ||
    !dom.previewModalMeta ||
    !dom.previewModalCanvas
  ) {
    setMessage('Preview modal is unavailable in this browser.', 'error');
    return;
  }

  if (!canvas || !canvas.width || !canvas.height) {
    setMessage('Render this simulation before previewing it.', 'error');
    return;
  }

  const sequence = getPreviewModalSequence();
  const sequenceIndex = sequence.findIndex((entry) => entry.modeId === modeId);
  activePreviewModalModes = sequence;
  activePreviewModalModeIndex = sequenceIndex;
  if (activePreviewModalModeIndex < 0 && sequence.length) {
    activePreviewModalModeIndex = 0;
  }

  const sourceLayer = sourceCanvas || dom.sourceCanvas;

  if (!sourceLayer || !sourceLayer.width || !sourceLayer.height) {
    setMessage('Source preview is not available for this modal inspection.', 'error');
    return;
  }

  const impact = getModeImpactById(modeId);
  const impactText =
    typeof impact?.impactPercent === 'number'
      ? `${impact.impactPercent.toFixed(1)}% pixel delta`
      : 'Impact pending';

  dom.previewModalTitle.textContent = `${label} preview`;
  dom.previewModalMeta.textContent = `${impactText} • ${canvas.width}×${canvas.height}px`;
  const startComparePercent = Number(dom.globalCompareSlider?.value) || COMPARE_DEFAULT_PERCENT;

  try {
    renderPreviewModalBlend(canvas, sourceLayer, startComparePercent);
  } catch (error) {
    setMessage(error.message, 'error');
    return;
  }

  const compareHandler = () => {
    try {
      renderPreviewModalBlend(canvas, sourceLayer, dom.previewModalCompareSlider?.value || startComparePercent);
    } catch (error) {
      setMessage(error.message, 'error');
    }
  };

  if (dom.previewModalCompareSlider) {
    dom.previewModalCompareSlider.disabled = false;
    dom.previewModalCompareSlider.addEventListener('input', compareHandler);
    dom.previewModalCompareSlider.value = String(startComparePercent);
  }

  syncPreviewModalCompareControls(startComparePercent);

  updatePreviewModalNavigation();

  activePreviewModalCompareCleanup = () => {
    if (dom.previewModalCompareSlider) {
      dom.previewModalCompareSlider.removeEventListener('input', compareHandler);
    }
  };

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

function downloadBlob(blob, filename) {
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

async function copyTextWithFallback({
  payload,
  filename,
  mimeType = 'text/plain;charset=utf-8',
  copiedMessage = 'Copied to clipboard.',
  downloadMessage = 'Clipboard unavailable. Downloaded content for manual copy.',
  unavailableMessage = 'Clipboard copy is not supported in this browser. Highlight text manually if needed.',
  statusReporter = setMessage,
}) {
  if (!payload) {
    statusReporter('No content available to copy.');
    return false;
  }

  const copied = await copyTextToClipboard(payload);
  if (copied) {
    statusReporter(copiedMessage, 'success');
    return true;
  }

  if (!filename) {
    statusReporter(unavailableMessage, 'error');
    return false;
  }

  try {
    downloadTextFile(payload, filename, mimeType);
    statusReporter(downloadMessage, 'success');
    return false;
  } catch {
    statusReporter(unavailableMessage, 'error');
    return false;
  }
}

const ZIP_CRC32_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i += 1) {
    let crc = i;
    for (let bit = 0; bit < 8; bit += 1) {
      if (crc & 1) {
        crc = (crc >>> 1) ^ 0xEDB88320;
      } else {
        crc >>>= 1;
      }
    }
    table[i] = crc >>> 0;
  }
  return table;
})();

const ZIP_TEXT_ENCODER = new TextEncoder();

function calculateZipCrc32(bytes) {
  const input = bytes instanceof Uint8Array ? bytes : ZIP_TEXT_ENCODER.encode(String(bytes || ''));
  let crc = 0xFFFFFFFF;
  for (let i = 0; i < input.length; i += 1) {
    crc = ZIP_CRC32_TABLE[(crc ^ input[i]) & 0xFF] ^ (crc >>> 8);
  }
  return (crc ^ 0xFFFFFFFF) >>> 0;
}

function encodeToBytes(value) {
  return ZIP_TEXT_ENCODER.encode(String(value || ''));
}

function toDosDate(date) {
  const safeDate = date instanceof Date && !Number.isNaN(date.getTime()) ? date : new Date();
  const year = Math.max(1980, Math.min(2107, safeDate.getFullYear()));
  return ((year - 1980) << 9) | ((safeDate.getMonth() + 1) << 5) | safeDate.getDate();
}

function toDosTime(date) {
  const safeDate = date instanceof Date && !Number.isNaN(date.getTime()) ? date : new Date();
  return (safeDate.getHours() << 11) | (safeDate.getMinutes() << 5) | Math.floor(safeDate.getSeconds() / 2);
}

function normalizeZipFilename(filename, fallback = 'file') {
  return String(filename || fallback)
    .trim()
    .replace(/^\.+$/, '')
    .replace(/[\\/]/g, '_')
    .replace(/[<>:"|?*\x00-\x1F]/g, '')
    .trim() || fallback;
}

function dataUrlToBytes(dataUrl, fileLabel = 'image') {
  if (typeof dataUrl !== 'string') {
    return null;
  }

  const commaIndex = dataUrl.indexOf(',');
  if (commaIndex === -1) {
    return null;
  }

  try {
    const base64Payload = dataUrl.slice(commaIndex + 1);
    const decoded = atob(base64Payload);
    const bytes = new Uint8Array(decoded.length);
    for (let index = 0; index < decoded.length; index += 1) {
      bytes[index] = decoded.charCodeAt(index);
    }
    return bytes;
  } catch {
    throw new Error(`Unable to encode ${fileLabel} content for package export.`);
  }
}

function buildZipLocalHeader({
  filenameBytes,
  crc32,
  fileSize,
  dosTimeValue,
  dosDateValue,
}) {
  const header = new Uint8Array(30 + filenameBytes.length);
  const view = new DataView(header.buffer);
  let offset = 0;
  view.setUint32(offset, 0x04034b50, true);
  offset += 4;
  view.setUint16(offset, 0x0014, true);
  offset += 2;
  view.setUint16(offset, 0x0000, true);
  offset += 2;
  view.setUint16(offset, 0x0000, true);
  offset += 2;
  view.setUint16(offset, dosTimeValue, true);
  offset += 2;
  view.setUint16(offset, dosDateValue, true);
  offset += 2;
  view.setUint32(offset, crc32, true);
  offset += 4;
  view.setUint32(offset, fileSize, true);
  offset += 4;
  view.setUint32(offset, fileSize, true);
  offset += 4;
  view.setUint16(offset, filenameBytes.length, true);
  offset += 2;
  view.setUint16(offset, 0x0000, true);
  offset += 2;
  header.set(filenameBytes, offset);
  return header;
}

function buildZipCentralHeader({
  filenameBytes,
  crc32,
  fileSize,
  dosTimeValue,
  dosDateValue,
  localOffset,
}) {
  const header = new Uint8Array(46 + filenameBytes.length);
  const view = new DataView(header.buffer);
  let offset = 0;
  view.setUint32(offset, 0x02014b50, true);
  offset += 4;
  view.setUint16(offset, 0x0014, true);
  offset += 2;
  view.setUint16(offset, 0x0014, true);
  offset += 2;
  view.setUint16(offset, 0x0000, true);
  offset += 2;
  view.setUint16(offset, 0x0000, true);
  offset += 2;
  view.setUint16(offset, dosTimeValue, true);
  offset += 2;
  view.setUint16(offset, dosDateValue, true);
  offset += 2;
  view.setUint32(offset, crc32, true);
  offset += 4;
  view.setUint32(offset, fileSize, true);
  offset += 4;
  view.setUint32(offset, fileSize, true);
  offset += 4;
  view.setUint16(offset, filenameBytes.length, true);
  offset += 2;
  view.setUint16(offset, 0x0000, true);
  offset += 2;
  view.setUint16(offset, 0x0000, true);
  offset += 2;
  view.setUint16(offset, 0x0000, true);
  offset += 2;
  view.setUint32(offset, 0x00000000, true);
  offset += 4;
  view.setUint32(offset, 0x00000000, true);
  offset += 4;
  view.setUint32(offset, localOffset, true);
  offset += 4;
  header.set(filenameBytes, offset + 0);
  return header;
}

function buildZipEndOfCentralDirectory({ entryCount, centralSize, centralOffset }) {
  const footer = new Uint8Array(22);
  const view = new DataView(footer.buffer);
  view.setUint32(0, 0x06054b50, true);
  view.setUint16(4, 0x0000, true);
  view.setUint16(6, 0x0000, true);
  view.setUint16(8, entryCount, true);
  view.setUint16(10, entryCount, true);
  view.setUint32(12, centralSize, true);
  view.setUint32(16, centralOffset, true);
  view.setUint16(20, 0x0000, true);
  return footer;
}

function buildSubmissionPackageZip(files = []) {
  if (!Array.isArray(files) || !files.length) {
    throw new Error('No package files available to export.');
  }

  const dosDateValue = toDosDate(new Date());
  const dosTimeValue = toDosTime(new Date());
  const fileChunks = [];
  const centralChunks = [];

  let cursorOffset = 0;
  for (const file of files) {
    const filename = normalizeZipFilename(file?.filename, `file-${cursorOffset}`);
    const bytes = file?.bytes instanceof Uint8Array ? file.bytes : encodeToBytes(file?.content || '');
    const filenameBytes = encodeToBytes(filename);
    const crc32 = calculateZipCrc32(bytes);
    const size = bytes.length;

    const localHeader = buildZipLocalHeader({
      filenameBytes,
      crc32,
      fileSize: size,
      dosTimeValue,
      dosDateValue,
    });
    const centralHeader = buildZipCentralHeader({
      filenameBytes,
      crc32,
      fileSize: size,
      dosTimeValue,
      dosDateValue,
      localOffset: cursorOffset,
    });

    fileChunks.push(localHeader, bytes);
    centralChunks.push(centralHeader);
    cursorOffset += localHeader.length + size;
  }

  const centralDirectorySize = centralChunks.reduce((total, chunk) => total + chunk.length, 0);
  const centralDirectoryOffset = cursorOffset;
  const centralDirectory = new Blob(centralChunks);
  const footer = buildZipEndOfCentralDirectory({
    entryCount: files.length,
    centralSize: centralDirectorySize,
    centralOffset: centralDirectoryOffset,
  });

  return new Blob([...fileChunks, centralDirectory, footer], { type: 'application/zip' });
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

function sanitizeClipboardUrl(rawText) {
  if (typeof rawText !== 'string') {
    return '';
  }

  return rawText
    .trim()
    .replace(/^[\s"'`({[\<]+/, '')
    .replace(/[)\]}"'`.,;:!?]+$/g, '')
    .trim();
}

function extractImageUrlFromClipboardText(rawText) {
  if (typeof rawText !== 'string') {
    return null;
  }

  const text = rawText.trim();
  if (!text) {
    return null;
  }

  const candidates = new Set();
  const tokens = text.split(/\s+/);

  for (const token of tokens) {
    const sanitizedToken = sanitizeClipboardUrl(token);
    if (sanitizedToken) {
      candidates.add(sanitizedToken);
    }

    const markdownMatch = token.match(/\((https?:\/\/[^\s)]+)\)/);
    if (markdownMatch?.[1]) {
      const sanitizedMarkdownUrl = sanitizeClipboardUrl(markdownMatch[1]);
      if (sanitizedMarkdownUrl) {
        candidates.add(sanitizedMarkdownUrl);
      }
    }
  }

  const inlineUrls = text.match(/https?:\/\/[^\s"'<>]+/g);
  if (inlineUrls?.length) {
    inlineUrls.forEach((entry) => {
      const sanitized = sanitizeClipboardUrl(entry);
      if (sanitized) {
        candidates.add(sanitized);
      }
    });
  }

  for (const candidate of candidates) {
    const normalized = normalizeImageUrl(candidate);
    if (normalized) {
      return normalized;
    }
  }

  return null;
}

function normalizeImageUrl(rawUrl) {
  if (typeof rawUrl !== 'string') {
    return null;
  }

  const trimmed = rawUrl.trim();
  if (!trimmed || trimmed.length > MAX_IMAGE_URL_LENGTH) {
    return null;
  }

  try {
    const parsed = new URL(trimmed, window.location.origin);
    if (!['http:', 'https:', 'data:'].includes(parsed.protocol)) {
      return null;
    }

    if (parsed.protocol === 'data:') {
      return null;
    }

    return parsed.href;
  } catch {
    return null;
  }
}

function getImageExtensionFromMimeType(mimeType = '') {
  const normalized = String(mimeType).toLowerCase().trim();
  if (!normalized) {
    return 'png';
  }

  if (normalized.startsWith('image/png')) {
    return 'png';
  }
  if (normalized.startsWith('image/jpeg') || normalized.startsWith('image/jpg')) {
    return 'jpg';
  }
  if (normalized.startsWith('image/webp')) {
    return 'webp';
  }
  if (normalized.startsWith('image/gif')) {
    return 'gif';
  }
  if (normalized.startsWith('image/bmp')) {
    return 'bmp';
  }
  if (normalized.startsWith('image/avif')) {
    return 'avif';
  }
  if (normalized.startsWith('image/svg+xml')) {
    return 'svg';
  }

  return 'png';
}

function getSafeFileNameFromUrl(url, mimeType) {
  try {
    const parsed = new URL(url);
    const pathSegments = parsed.pathname.split('/').filter(Boolean);
    let filename = pathSegments.at(-1) || '';
    const hasImageExtension = /\.(png|jpe?g|gif|bmp|webp|avif|svg)$/i.test(filename);

    if (!filename || !hasImageExtension) {
      const extension = getImageExtensionFromMimeType(mimeType);
      filename = `url-image-${Date.now()}.${extension}`;
    }

    if (filename.toLowerCase() === 'favicon.ico') {
      const extension = getImageExtensionFromMimeType(mimeType);
      filename = `url-image-${Date.now()}.${extension}`;
    }

    return filename.replace(/[^a-zA-Z0-9._-]/g, '_');
  } catch {
    return `url-image-${Date.now()}.png`;
  }
}

function handleImageInput(file, contextLabel) {
  if (!file) {
    setMessage(
      `No valid image file found. Use one of: ${SUPPORTED_IMAGE_FORMATS_LABEL}.`,
      'error',
    );
    return;
  }

  const fileLabel = file.name || 'Image';
  setMessage(
    `${contextLabel ? `${contextLabel}: ` : ''}${fileLabel}. Rendering...`,
    'info',
  );
  return readImageAndRender(file);
}

async function isDecodableImageBlob(blob) {
  if (!blob || !blob.size) {
    return false;
  }

  if (typeof createImageBitmap === 'function') {
    try {
      const bitmap = await createImageBitmap(blob);
      const isValid = bitmap.width > 0 && bitmap.height > 0;
      bitmap.close?.();
      return isValid;
    } catch {
      // fall through to legacy image-tag validation
    }
  }

  return new Promise((resolve) => {
    const objectUrl = URL.createObjectURL(blob);
    const image = new Image();
    image.addEventListener(
      'load',
      () => {
        URL.revokeObjectURL(objectUrl);
        resolve(image.naturalWidth > 0 && image.naturalHeight > 0);
      },
      { once: true },
    );
    image.addEventListener(
      'error',
      () => {
        URL.revokeObjectURL(objectUrl);
        resolve(false);
      },
      { once: true },
    );
    image.src = objectUrl;
  });
}

async function loadImageFromUrl(rawUrl) {
  const resolvedUrl = normalizeImageUrl(rawUrl);
  if (!resolvedUrl) {
    setMessage('Please enter a valid http(s) image URL.', 'error');
    return;
  }

  if (state.isRendering) {
    setMessage('Please wait for the active render to finish before loading another image.', 'info');
    return;
  }

  if (dom.loadImageUrlBtn) {
    dom.loadImageUrlBtn.disabled = true;
  }
  if (dom.imageUrlInput) {
    dom.imageUrlInput.disabled = true;
  }

  const loadTimeoutMs = Number.isFinite(URL_IMAGE_LOAD_TIMEOUT_MS) ? URL_IMAGE_LOAD_TIMEOUT_MS : 15000;
  let timeoutId;

  try {
    const loadAbortController = new AbortController();
    timeoutId = setTimeout(() => {
      loadAbortController.abort(new DOMException('Image URL load timed out.', 'AbortError'));
    }, loadTimeoutMs);

    setMessage(`Loading image from URL...`, 'info');
    const response = await fetch(resolvedUrl, {
      method: 'GET',
      mode: 'cors',
      redirect: 'follow',
      signal: loadAbortController.signal,
    });
    if (!response.ok) {
      clearTimeout(timeoutId);
      throw new Error(
        `Image URL request failed (${response.status} ${response.statusText || 'network error'}).`,
      );
    }

    const contentType = response.headers.get('content-type') || '';
    const responseLikelyImage = /\.(png|jpe?g|gif|bmp|webp|avif|svg)$/i.test(new URL(resolvedUrl).pathname);

    const blob = await response.blob();
    clearTimeout(timeoutId);
    if (!blob || blob.size === 0) {
      throw new Error('The image URL did not provide image data.');
    }
    if (blob.size > MAX_FILE_SIZE_BYTES) {
      throw new Error(
        `Image is too large (${formatBytes(blob.size)}). Maximum supported size is ${formatBytes(MAX_FILE_SIZE_BYTES)}.`,
      );
    }

    if (!responseLikelyImage || !contentType.startsWith('image/') || !blob.type.startsWith('image/')) {
      const isImageBlob = await isDecodableImageBlob(blob);
      if (!isImageBlob) {
        const normalizedContentType = contentType || 'unknown content type';
        throw new Error(`The URL does not return a decodable image response (${normalizedContentType}).`);
      }
    }

    const blobType = blob.type && blob.type.startsWith('image/') ? blob.type : contentType || 'image/png';
    const fileName = getSafeFileNameFromUrl(resolvedUrl, blobType);
    const file = new File([blob], fileName, {
      type: blobType,
    });

    handleImageInput(file, 'Image URL');
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      setMessage(`Image URL load timed out after ${Math.max(1, Math.floor(loadTimeoutMs / 1000))}s.`, 'error');
      return;
    }
    if (error instanceof TypeError) {
      setMessage(
        'This image URL cannot be loaded directly in-browser. Use an image URL that supports CORS access.',
        'error',
      );
      return;
    }

    setMessage(error.message || 'Unable to load image from URL.', 'error');
  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    if (dom.loadImageUrlBtn) {
      dom.loadImageUrlBtn.disabled = false;
    }
    if (dom.imageUrlInput) {
      dom.imageUrlInput.disabled = false;
    }
  }
}

const LIVE_CAPTURE_FRAME_TIMEOUT_MS = 4000;

function isLiveCaptureSupported() {
  return typeof navigator !== 'undefined' && Boolean(navigator.mediaDevices?.getDisplayMedia);
}

function waitForLiveCaptureFrame(video) {
  return new Promise((resolve) => {
    let settled = false;
    const finish = () => {
      if (!settled) {
        settled = true;
        resolve();
      }
    };
    if (typeof video.requestVideoFrameCallback === 'function') {
      video.requestVideoFrameCallback(() => finish());
    } else {
      setTimeout(finish, 350);
    }
    setTimeout(finish, LIVE_CAPTURE_FRAME_TIMEOUT_MS);
  });
}

async function captureLiveAppFrame() {
  if (state.isRendering) {
    setMessage('Please wait for the active render to finish before capturing a live app.', 'info');
    return;
  }
  if (!isLiveCaptureSupported()) {
    setMessage(
      'Live capture is not supported in this browser. Upload, paste, or drag a screenshot instead.',
      'error',
    );
    return;
  }

  if (dom.captureScreenBtn) {
    dom.captureScreenBtn.disabled = true;
  }

  let stream = null;
  let video = null;
  try {
    setMessage('Choose the app window, tab, or screen to audit — capture stops after one frame.', 'info');
    stream = await navigator.mediaDevices.getDisplayMedia({
      video: { frameRate: { ideal: 5, max: 15 } },
      audio: false,
      selfBrowserSurface: 'exclude',
      surfaceSwitching: 'exclude',
    });

    const [track] = stream.getVideoTracks();
    if (!track) {
      throw new Error('The selected capture source did not provide any video.');
    }

    video = document.createElement('video');
    video.muted = true;
    video.playsInline = true;
    video.srcObject = stream;
    await video.play();
    await waitForLiveCaptureFrame(video);

    const width = video.videoWidth;
    const height = video.videoHeight;
    if (!width || !height) {
      throw new Error('Could not read a frame from the selected capture source. Try sharing it again.');
    }

    const frameCanvas = document.createElement('canvas');
    frameCanvas.width = width;
    frameCanvas.height = height;
    const frameContext = frameCanvas.getContext('2d');
    if (!frameContext) {
      throw new Error('Could not prepare a canvas for the captured frame.');
    }
    frameContext.drawImage(video, 0, 0, width, height);

    const displaySurface = track.getSettings?.().displaySurface || '';
    stream.getTracks().forEach((mediaTrack) => mediaTrack.stop());
    stream = null;

    const blob = await new Promise((resolve) => frameCanvas.toBlob(resolve, 'image/png'));
    if (!blob || !blob.size) {
      throw new Error('Could not encode the captured frame as an image.');
    }

    const surfaceSlug = /^(monitor|window|browser)$/.test(displaySurface) ? `${displaySurface}-` : '';
    const file = new File([blob], `live-capture-${surfaceSlug}${width}x${height}.png`, {
      type: 'image/png',
    });
    await handleImageInput(file, 'Live capture');
  } catch (error) {
    if (error instanceof DOMException && (error.name === 'NotAllowedError' || error.name === 'AbortError')) {
      setMessage('Live capture cancelled — nothing was shared or audited.', 'info');
    } else if (error instanceof DOMException && error.name === 'NotFoundError') {
      setMessage('No shareable screen source was found on this device.', 'error');
    } else {
      setMessage(error?.message || 'Unable to capture the selected screen.', 'error');
    }
  } finally {
    if (stream) {
      stream.getTracks().forEach((mediaTrack) => mediaTrack.stop());
    }
    if (video) {
      video.srcObject = null;
    }
    if (dom.captureScreenBtn) {
      dom.captureScreenBtn.disabled = !isLiveCaptureSupported() || state.isRendering;
    }
  }
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

function queueContrastAutoRecheck(delayMs = CONTRAST_AUTO_RECHECK_MS) {
  if (contrastAutoRecheckTimer) {
    clearTimeout(contrastAutoRecheckTimer);
    contrastAutoRecheckTimer = null;
  }

  const normalizedText = normalizeHexInput(dom.contrastTextHex.value || dom.contrastText?.value || '');
  const normalizedBg = normalizeHexInput(dom.contrastBgHex.value || dom.contrastBg?.value || '');

  if (!normalizedText || !normalizedBg) {
    return;
  }

  const nextDelay = Number.isFinite(delayMs) && delayMs >= 0 ? delayMs : 0;
  contrastAutoRecheckTimer = setTimeout(() => {
    contrastAutoRecheckTimer = null;
    renderContrastResult();
  }, nextDelay);
}

function setImageControlsEnabled(enabled) {
  dom.processBtn.disabled = !enabled;
  if (dom.captureScreenBtn) {
    dom.captureScreenBtn.disabled = !enabled || !isLiveCaptureSupported();
  }
  dom.downloadSourceBtn.disabled = !enabled || !state.hasRenderedSource;
  dom.downloadAllBtn.disabled = !enabled || !state.hasRenderedSource;
  if (dom.xrayToggleBtn) {
    const xrayAvailable = enabled && state.hasRenderedSource;
    dom.xrayToggleBtn.disabled = !xrayAvailable;
    if (!xrayAvailable && state.xrayActive) {
      setXrayActive(false, { notify: false });
    }
  }
  if (dom.downloadChecklistShotsBtn) {
    dom.downloadChecklistShotsBtn.disabled = !enabled || !state.hasRenderedSource;
  }
  if (dom.downloadContactBtn) {
    dom.downloadContactBtn.disabled = !enabled || !state.hasRenderedSource;
  }
  if (dom.downloadTopImpactBtn) {
    dom.downloadTopImpactBtn.disabled = !enabled || !state.hasRenderedSource;
  }
  if (dom.downloadReelBtn) {
    dom.downloadReelBtn.disabled = !enabled || !state.hasRenderedSource || isRecordingVisionReel;
  }
  if (dom.downloadReportBtn) {
    dom.downloadReportBtn.disabled = !enabled || !state.hasRenderedSource;
  }
  if (dom.downloadSummaryBtn) {
    dom.downloadSummaryBtn.disabled = !enabled || !state.hasRenderedSource;
  }
  if (dom.downloadConformanceBtn) {
    dom.downloadConformanceBtn.disabled = !enabled || !state.hasRenderedSource;
  }
  if (dom.downloadReportCsvBtn) {
    dom.downloadReportCsvBtn.disabled = !enabled || !state.hasRenderedSource;
  }
  if (dom.downloadPackageBtn) {
    dom.downloadPackageBtn.disabled = !enabled || !state.hasRenderedSource;
  }
  if (dom.downloadReviewerPacketBtn) {
    dom.downloadReviewerPacketBtn.disabled = !enabled || !state.hasRenderedSource;
  }
  if (dom.copyContrastBtn) {
    dom.copyContrastBtn.disabled = !enabled;
  }
  if (dom.copyReportCsvBtn) {
    dom.copyReportCsvBtn.disabled = !enabled || !state.hasRenderedSource;
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
  if (dom.undoContrastBtn) {
    dom.undoContrastBtn.disabled = !enabled || !state.lastContrastUndoPair;
  }
  if (dom.openTopImpactBtn) {
    dom.openTopImpactBtn.disabled = !enabled || !state.hasRenderedSource;
  }
  if (dom.clearWorkspaceBtn) {
    dom.clearWorkspaceBtn.disabled = !enabled || !state.sourceImage;
  }

  syncJudgeReadinessControls();
  syncCssFixActions();
}

function setSimPlaceholderVisible(visible) {
  if (!dom.simPlaceholder) {
    return;
  }
  dom.simPlaceholder.hidden = !visible;
}

const PALETTE_LEVEL_PRESENTATION = {
  aaa: { label: 'AAA', className: 'palette-pair-badge--aaa' },
  aa: { label: 'AA', className: 'palette-pair-badge--aa' },
  'aa-large': { label: 'Large text only', className: 'palette-pair-badge--large' },
  fail: { label: 'Fails WCAG', className: 'palette-pair-badge--fail' },
};

function setPaletteAuditStatus(message) {
  if (dom.paletteStatus) {
    dom.paletteStatus.textContent = message;
  }
}

function loadPaletteAuditPair(pair) {
  if (!setContrastPair(pair.text, pair.background, { trackUndo: true })) {
    setMessage('Could not load the palette pair into the checker.', 'error');
    return;
  }

  queueContrastAutoRecheck(0);
  setMessage(
    `Palette pair loaded into checker: ${pair.text.toUpperCase()} on ${pair.background.toUpperCase()} (${pair.ratio.toFixed(2)}:1).`,
    'info',
  );
  dom.contrastTextHex?.focus();
}

const TEXT_SCAN_STROKES = {
  fail: '#dc2626',
  'aa-large': '#d97706',
  aa: '#16a34a',
  aaa: '#16a34a',
};

function setTextScanStatus(message) {
  if (dom.textScanStatus) {
    dom.textScanStatus.textContent = message;
  }
}

function renderTextScanIssueLens(region, index) {
  if (!state.sourceImageData || !dom.textScanLens || !dom.textScanLensCanvas) {
    return;
  }
  const { width, height } = state.sourceImageData;
  const paddingX = Math.max(24, region.width * 1.1);
  const paddingY = Math.max(18, region.height * 1.8);
  const cropX = Math.max(0, Math.floor(region.x - paddingX));
  const cropY = Math.max(0, Math.floor(region.y - paddingY));
  const cropRight = Math.min(width, Math.ceil(region.x + region.width + paddingX));
  const cropBottom = Math.min(height, Math.ceil(region.y + region.height + paddingY));
  const cropWidth = Math.max(1, cropRight - cropX);
  const cropHeight = Math.max(1, cropBottom - cropY);
  const outputWidth = 640;
  const outputHeight = Math.max(180, Math.min(320, Math.round(outputWidth * cropHeight / cropWidth)));
  const staging = document.createElement('canvas');
  staging.width = width;
  staging.height = height;
  staging.getContext('2d').putImageData(state.sourceImageData, 0, 0);
  const canvas = dom.textScanLensCanvas;
  canvas.width = outputWidth;
  canvas.height = outputHeight;
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(staging, cropX, cropY, cropWidth, cropHeight, 0, 0, outputWidth, outputHeight);
  const scaleX = outputWidth / cropWidth;
  const scaleY = outputHeight / cropHeight;
  const stroke = TEXT_SCAN_STROKES[region.level] || TEXT_SCAN_STROKES.fail;
  ctx.strokeStyle = stroke;
  ctx.lineWidth = 4;
  ctx.strokeRect(
    (region.x - cropX) * scaleX + 2,
    (region.y - cropY) * scaleY + 2,
    Math.max(4, region.width * scaleX - 4),
    Math.max(4, region.height * scaleY - 4),
  );

  const presentation = PALETTE_LEVEL_PRESENTATION[region.level] || PALETTE_LEVEL_PRESENTATION.fail;
  dom.textScanLensDetail.textContent = `Finding #${index + 1} · ${region.ratio.toFixed(2)}:1 · ${presentation.label} · approximately ${region.width}×${region.height}px`;
  dom.textScanLensPair.innerHTML = '';
  [
    ['Text', region.text.hex],
    ['Background', region.background.hex],
  ].forEach(([label, color]) => {
    const chip = document.createElement('span');
    chip.className = 'text-scan-lens-chip';
    const swatch = document.createElement('i');
    swatch.style.background = color;
    const value = document.createElement('span');
    value.textContent = `${label} ${color.toUpperCase()}`;
    chip.append(swatch, value);
    dom.textScanLensPair.appendChild(chip);
  });
  dom.textScanLensFixBtn.onclick = () => loadTextScanRegion(region, index, { guideToFix: true });
  if (dom.textScanLensRepairBtn) {
    dom.textScanLensRepairBtn.disabled = region.passesAA;
    dom.textScanLensRepairBtn.textContent = region.passesAA ? 'Already meets AA' : 'Repair region & verify';
    dom.textScanLensRepairBtn.onclick = () => repairTextScanRegion(region, index);
  }
  dom.textScanLens.hidden = false;
}

function renderTargetedTextRepairProof() {
  if (!dom.textScanRepairProof || !state.targetedTextRepair) return;
  const repair = state.targetedTextRepair;
  if (repair.kind === 'bulk') {
    const remaining = state.textScan?.summary?.belowAA ?? 0;
    const fixed = Math.max(0, repair.beforeFailures - remaining);
    const verdict = remaining === 0
      ? 'every detected failure now meets AA'
      : `${fixed} verified · ${remaining} still need review`;
    dom.textScanRepairProof.textContent = `Autofix proof: ${repair.beforeFailures} → ${remaining} below-AA findings · ${verdict} · ${repair.changedPixels.toLocaleString()} pixels changed across ${repair.appliedRepairs} region${repair.appliedRepairs === 1 ? '' : 's'}.`;
    dom.textScanRepairProof.hidden = false;
    return;
  }
  const centerX = repair.region.x + repair.region.width / 2;
  const centerY = repair.region.y + repair.region.height / 2;
  const rescanned = state.textScan?.regions?.find((candidate) =>
    centerX >= candidate.x && centerX <= candidate.x + candidate.width &&
    centerY >= candidate.y && centerY <= candidate.y + candidate.height,
  );
  const afterLabel = rescanned ? `${rescanned.ratio.toFixed(2)}:1` : 'no longer flagged';
  const verdict = !rescanned || rescanned.passesAA ? 'AA verified' : 'improved; review recommended';
  dom.textScanRepairProof.textContent = `Local repair proof: ${repair.beforeRatio.toFixed(2)}:1 → ${afterLabel} · ${verdict} · ${repair.changedPixels.toLocaleString()} foreground pixels changed.`;
  dom.textScanRepairProof.hidden = false;
}

async function repairAllTextScanRegions() {
  if (!state.sourceImageData || state.isRendering || !state.textScan?.regions?.length) return;
  const failingRegions = state.textScan.regions.filter((region) => !region.passesAA);
  if (!failingRegions.length) {
    setMessage('Every detected text region already meets WCAG AA.', 'success');
    return;
  }

  const { width, height, data } = state.sourceImageData;
  const repairedData = new Uint8ClampedArray(data);
  let changedPixels = 0;
  let appliedRepairs = 0;
  for (const region of failingRegions) {
    const [suggestion] = suggestAccessiblePairs(region.text.hex, region.background.hex, 4.5, 1, true);
    if (!suggestion || suggestion.ratio < 4.5) continue;
    try {
      const summary = applyTextRegionContrastFix(
        repairedData,
        width,
        height,
        region,
        suggestion.text,
        suggestion.background,
      );
      if (summary.changedPixels > 0) {
        changedPixels += summary.changedPixels;
        appliedRepairs += 1;
      }
    } catch {
      // A malformed/overlapping finding must not prevent other safe repairs.
    }
  }
  if (!appliedRepairs) {
    setMessage('ClearSight could not isolate any safe text pixels to repair automatically.', 'error');
    return;
  }

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  canvas.getContext('2d').putImageData(new ImageData(repairedData, width, height), 0, 0);
  const image = new Image();
  const loaded = new Promise((resolve, reject) => {
    image.onload = resolve;
    image.onerror = () => reject(new Error('Could not prepare the repaired screenshot for verification.'));
  });
  image.src = canvas.toDataURL('image/png');

  try {
    await loaded;
    captureImageRepairUndo('automatic text repair');
    captureScoreRepairBaseline('automatic text repair');
    state.targetedTextRepair = {
      kind: 'bulk',
      beforeFailures: failingRegions.length,
      appliedRepairs,
      changedPixels,
    };
    state.completeAuditRepair = null;
    state.sourceImage = image;
    state.sourceName = `${getSafeFileName(state.sourceName || 'screenshot')}-text-autofixed.png`;
    state.sourceOriginalDimensions = { width, height };
    state.sourceWasDownscaled = false;
    state.sourceResizeInfo = `generated locally by ClearSight automatic text repair (${changedPixels} pixels changed across ${appliedRepairs} regions)`;
    setMessage(`Applied ${appliedRepairs} local text repair${appliedRepairs === 1 ? '' : 's'}. Re-running the complete audit to prove the result…`, 'info');
    await renderAll();
    renderTargetedTextRepairProof();
    dom.textScanResult?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  } catch (error) {
    setMessage(error.message || 'Could not verify the automatic text repairs.', 'error');
  }
}

async function repairTextScanRegion(region, index) {
  if (!state.sourceImageData || state.isRendering || region.passesAA) return;
  const [suggestion] = suggestAccessiblePairs(region.text.hex, region.background.hex, 4.5, 1, true);
  if (!suggestion || suggestion.ratio < 4.5) {
    setMessage('ClearSight could not find a safe AA repair for this detected region.', 'error');
    return;
  }

  const { width, height, data } = state.sourceImageData;
  const repairedData = new Uint8ClampedArray(data);
  let repairSummary;
  try {
    repairSummary = applyTextRegionContrastFix(
      repairedData,
      width,
      height,
      region,
      suggestion.text,
      suggestion.background,
    );
  } catch (error) {
    setMessage(error.message || 'Could not repair the detected text region.', 'error');
    return;
  }
  if (!repairSummary.changedPixels) {
    setMessage('No foreground pixels could be isolated safely in this region.', 'error');
    return;
  }

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  canvas.getContext('2d').putImageData(new ImageData(repairedData, width, height), 0, 0);
  const image = new Image();
  const loaded = new Promise((resolve, reject) => {
    image.onload = resolve;
    image.onerror = () => reject(new Error('Could not prepare the repaired screenshot for verification.'));
  });
  image.src = canvas.toDataURL('image/png');

  try {
    await loaded;
    captureImageRepairUndo('targeted text repair');
    captureScoreRepairBaseline('targeted text repair');
    state.targetedTextRepair = {
      region: { x: region.x, y: region.y, width: region.width, height: region.height },
      beforeRatio: region.ratio,
      replacement: suggestion.text,
      changedPixels: repairSummary.changedPixels,
    };
    state.completeAuditRepair = null;
    state.sourceImage = image;
    state.sourceName = `${getSafeFileName(state.sourceName || 'screenshot')}-region-${index + 1}-fixed.png`;
    state.sourceOriginalDimensions = { width, height };
    state.sourceWasDownscaled = false;
    state.sourceResizeInfo = `generated locally by ClearSight targeted text repair (${repairSummary.changedPixels} pixels changed)`;
    setMessage(`Region ${index + 1} repaired locally with ${suggestion.text.toUpperCase()} on ${suggestion.background.toUpperCase()}. Re-running all checks to verify…`, 'info');
    await renderAll();
    renderTargetedTextRepairProof();
    dom.textScanLens?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  } catch (error) {
    setMessage(error.message || 'Could not verify the targeted repair.', 'error');
  }
}

function loadTextScanRegion(region, index, { guideToFix = false } = {}) {
  renderTextScanIssueLens(region, index);
  if (!setContrastPair(region.text.hex, region.background.hex, { trackUndo: true })) {
    setMessage('Could not load the detected region colors into the checker.', 'error');
    return;
  }

  queueContrastAutoRecheck(0);
  if (guideToFix) {
    renderContrastResult();
    renderSuggestions();
    dom.contrastOut?.scrollIntoView({ behavior: 'auto', block: 'center' });
  }
  setMessage(
    `Text region ${index + 1} loaded: ${region.text.hex.toUpperCase()} on ${region.background.hex.toUpperCase()} (${region.ratio.toFixed(2)}:1).${guideToFix ? ' Accessible fixes are ready below.' : ''}`,
    'info',
  );
  if (!guideToFix) {
    dom.contrastTextHex?.focus();
  }
}

function getTextScanCanvasRegion(event) {
  if (!state.textScan?.regions?.length || !dom.textScanCanvas) {
    return null;
  }
  const bounds = dom.textScanCanvas.getBoundingClientRect();
  if (!bounds.width || !bounds.height) {
    return null;
  }
  const sourceWidth = state.sourceImageData?.width || dom.textScanCanvas.width;
  const sourceHeight = state.sourceImageData?.height || dom.textScanCanvas.height;
  const x = (event.clientX - bounds.left) * (sourceWidth / bounds.width);
  const y = (event.clientY - bounds.top) * (sourceHeight / bounds.height);
  const matches = state.textScan.regions
    .map((region, index) => ({ region, index }))
    .filter(({ region }) =>
      x >= region.x && x <= region.x + region.width && y >= region.y && y <= region.y + region.height,
    )
    .sort((a, b) => a.region.width * a.region.height - b.region.width * b.region.height);
  return matches[0] || null;
}

function inspectTextScanCanvasRegion(event) {
  const match = getTextScanCanvasRegion(event);
  if (!match) {
    setMessage('Select one of the numbered scan regions to inspect its contrast.', 'info');
    return;
  }
  loadTextScanRegion(match.region, match.index, { guideToFix: true });
}

function resetComponentScanPanel(message) {
  state.componentScan = null;
  if (dom.componentScanList) {
    dom.componentScanList.innerHTML = '';
  }
  if (dom.componentScanResult) {
    dom.componentScanResult.hidden = true;
  }
  if (dom.componentScanStatus) {
    dom.componentScanStatus.textContent =
      message || 'Runs automatically with the text scan — no component surfaces resolved yet.';
    delete dom.componentScanStatus.dataset.failing;
  }
  if (dom.componentScanRepairProof && !state.componentSurfaceRepair) {
    dom.componentScanRepairProof.hidden = true;
  }
  resetTargetSizePanel();
  syncCssFixActions();
}

function resetTargetSizePanel(message) {
  state.targetSizeScan = null;
  if (dom.targetSizeList) {
    dom.targetSizeList.innerHTML = '';
  }
  if (dom.targetSizeResult) {
    dom.targetSizeResult.hidden = true;
  }
  if (dom.targetSizeStatus) {
    dom.targetSizeStatus.textContent =
      message || 'Runs automatically with the text scan — no tap targets measured yet.';
    delete dom.targetSizeStatus.dataset.undersized;
  }
}

function renderTargetSizeScan() {
  if (!dom.targetSizeStatus || !dom.targetSizeList || !dom.targetSizeResult) {
    return;
  }

  if (!state.sourceImageData || !state.textScan?.regions?.length) {
    resetTargetSizePanel();
    return;
  }

  let scan = null;
  try {
    const { data, width, height } = state.sourceImageData;
    const originalWidth = state.sourceOriginalDimensions?.width || width;
    const cssPixelRatio = originalWidth > 0 ? width / originalWidth : 1;
    scan = scanTargetSizes(data, width, height, state.textScan.regions, state.componentScan?.components || [], {
      cssPixelRatio,
    });
  } catch (error) {
    resetTargetSizePanel('Tap target measurement unavailable for this image.');
    return;
  }

  state.targetSizeScan = scan;
  dom.targetSizeList.innerHTML = '';
  dom.targetSizeStatus.dataset.undersized = String(scan.summary.undersized);

  const { summary } = scan;
  if (!summary.targets) {
    dom.targetSizeResult.hidden = true;
    dom.targetSizeStatus.textContent =
      'No measurable tap targets resolved in this screenshot — only surfaces and compact solid blocks are measured, never plain text glyphs.';
    return;
  }

  const scaleNote = 'sizes assume a 1× (96 dpi) screenshot';
  if (!summary.undersized) {
    dom.targetSizeResult.hidden = true;
    dom.targetSizeStatus.textContent = summary.spacingExempt
      ? `All ${summary.targets} measured tap target${summary.targets === 1 ? '' : 's'} satisfy WCAG 2.5.8 — ${summary.spacingExempt} ${summary.spacingExempt === 1 ? 'is' : 'are'} under ${summary.minTargetCss}×${summary.minTargetCss}px but ${summary.spacingExempt === 1 ? 'has' : 'have'} enough clear space for the spacing exception (${scaleNote}).`
      : `All ${summary.targets} measured tap target${summary.targets === 1 ? '' : 's'} meet the ${summary.minTargetCss}×${summary.minTargetCss} CSS px minimum (WCAG 2.5.8; ${scaleNote}).`;
    return;
  }

  dom.targetSizeStatus.textContent =
    `${summary.undersized} of ${summary.targets} measured tap target${summary.targets === 1 ? '' : 's'} ${summary.undersized === 1 ? 'is' : 'are'} below the ${summary.minTargetCss}×${summary.minTargetCss} CSS px minimum with a neighbor inside ${summary.minTargetCss}px clearance, so the WCAG 2.5.8 spacing exception cannot apply — smallest measures ${summary.worst.widthCss}×${summary.worst.heightCss}px. Fixing this needs a layout change (larger hit area or more gap), which no pixel repaint can honestly claim (${scaleNote}).`;

  scan.findings.forEach((finding) => {
    const item = document.createElement('li');
    item.className = 'collision-pair';

    const duo = document.createElement('span');
    duo.className = 'collision-duo';
    const chip = document.createElement('span');
    chip.className = 'collision-chip';
    chip.style.background = finding.color?.hex || '#94a3b8';
    chip.setAttribute('aria-hidden', 'true');
    duo.appendChild(chip);
    const duoLabel = document.createElement('span');
    duoLabel.className = 'collision-duo-label';
    duoLabel.textContent = finding.kind === 'component-surface' ? 'Control surface' : 'Icon-sized control';
    duo.appendChild(duoLabel);

    const detail = document.createElement('span');
    detail.className = 'collision-detail';
    detail.textContent =
      `Region #${finding.regionIndex + 1} · measures ${finding.widthCss}×${finding.heightCss} CSS px (needs ${summary.minTargetCss}×${summary.minTargetCss}) · ` +
      `a ${summary.minTargetCss}px circle centered here overlaps a neighboring target near (${Math.round(finding.centerCss.x)},${Math.round(finding.centerCss.y)})`;

    const badge = document.createElement('span');
    badge.className = 'palette-pair-badge palette-pair-badge--fail';
    badge.textContent = '2.5.8 risk';

    item.append(duo, detail, badge);
    dom.targetSizeList.appendChild(item);
  });

  dom.targetSizeResult.hidden = false;
}

function renderComponentSurfaceScan() {
  if (!dom.componentScanStatus || !dom.componentScanList || !dom.componentScanResult) {
    return;
  }

  if (!state.sourceImageData || !state.textScan?.regions?.length) {
    resetComponentScanPanel();
    return;
  }

  let scan = null;
  try {
    const { data, width, height } = state.sourceImageData;
    scan = scanComponentSurfaceContrast(data, width, height, state.textScan.regions);
  } catch (error) {
    resetComponentScanPanel('Component surface scan unavailable for this image.');
    return;
  }

  state.componentScan = scan;
  dom.componentScanList.innerHTML = '';
  dom.componentScanStatus.dataset.failing = String(scan.summary.failing);

  const { summary } = scan;
  if (!summary.evaluated) {
    dom.componentScanResult.hidden = true;
    dom.componentScanStatus.textContent = `No distinct component surfaces resolved — ${summary.pageSurfaces} scanned region${summary.pageSurfaces === 1 ? ' sits' : 's sit'} directly on the page surface, where WCAG 1.4.11 does not apply.`;
    syncCssFixActions();
    return;
  }

  if (!summary.failing) {
    dom.componentScanResult.hidden = true;
    dom.componentScanStatus.textContent = `All ${summary.evaluated} distinct component surface${summary.evaluated === 1 ? '' : 's'} hold at least ${summary.minRatio}:1 against their adjacent color (WCAG 1.4.11).`;
    return;
  }

  dom.componentScanStatus.textContent =
    `${summary.failing} of ${summary.evaluated} component surface${summary.evaluated === 1 ? '' : 's'} ${summary.failing === 1 ? 'falls' : 'fall'} below ${summary.minRatio}:1 against the adjacent page — ` +
    'users may not see where these controls begin or end (WCAG 1.4.11 Non-text Contrast). Add a stronger border or a darker fill.';

  scan.findings.forEach((finding) => {
    const item = document.createElement('li');
    item.className = 'collision-pair';

    const duo = document.createElement('span');
    duo.className = 'collision-duo';
    [finding.surface.hex, finding.surrounding.hex].forEach((hex) => {
      const chip = document.createElement('span');
      chip.className = 'collision-chip';
      chip.style.background = hex;
      chip.setAttribute('aria-hidden', 'true');
      duo.appendChild(chip);
    });
    const duoLabel = document.createElement('span');
    duoLabel.className = 'collision-duo-label';
    duoLabel.textContent = 'Surface vs adjacent';
    duo.appendChild(duoLabel);

    const detail = document.createElement('span');
    detail.className = 'collision-detail';
    detail.textContent =
      `Region #${finding.regionIndex + 1} · surface ${finding.surface.hex.toUpperCase()} vs adjacent ${finding.surrounding.hex.toUpperCase()} · ` +
      `${finding.ratio.toFixed(2)}:1 (needs ${summary.minRatio}:1) · boundary sensed ${finding.boundaryDistance}px out`;

    const badge = document.createElement('span');
    badge.className = 'palette-pair-badge palette-pair-badge--fail';
    badge.textContent = '1.4.11 risk';

    const repairBtn = document.createElement('button');
    repairBtn.type = 'button';
    repairBtn.className = 'tiny-btn component-repair-btn';
    repairBtn.textContent = 'Repair surface & verify';
    repairBtn.title = 'Repaint this component surface to hold 3:1 against the page, then rerun the complete audit';
    repairBtn.addEventListener('click', () => repairComponentSurfaceFinding(finding));

    item.append(duo, detail, badge, repairBtn);
    dom.componentScanList.appendChild(item);
  });

  dom.componentScanResult.hidden = false;
  syncCssFixActions();
}

function renderComponentSurfaceRepairProof() {
  if (!dom.componentScanRepairProof || !state.componentSurfaceRepair) return;
  const repair = state.componentSurfaceRepair;
  const centerX = repair.box.x + repair.box.width / 2;
  const centerY = repair.box.y + repair.box.height / 2;
  const rescanned = state.componentScan?.components?.find((entry) =>
    entry.box &&
    centerX >= entry.box.x && centerX <= entry.box.x + entry.box.width &&
    centerY >= entry.box.y && centerY <= entry.box.y + entry.box.height,
  );
  const afterLabel = Number.isFinite(rescanned?.ratio) ? `${rescanned.ratio.toFixed(2)}:1` : 'no longer flagged';
  const verdict = !rescanned || rescanned.outcome === 'pass'
    ? '3:1 verified (WCAG 1.4.11)'
    : 'improved; review recommended';
  dom.componentScanRepairProof.textContent =
    `Surface repair proof: ${repair.beforeRatio.toFixed(2)}:1 → ${afterLabel} · ${verdict} · ` +
    `${repair.changedPixels.toLocaleString()} pixels repainted to ${repair.replacementSurface.toUpperCase()}` +
    `${repair.replacementText ? ` (text shifted to ${repair.replacementText.toUpperCase()} to hold AA)` : ''}.`;
  dom.componentScanRepairProof.hidden = false;
}

function renderCompleteAuditRepairProof() {
  if (!dom.completeRepairProof || !state.completeAuditRepair) return;
  const repair = state.completeAuditRepair;
  const remainingText = state.textScan?.summary?.belowAA ?? 0;
  const remainingComponents = state.componentScan?.summary?.failing ?? 0;
  const remaining = remainingText + remainingComponents;
  const before = repair.beforeText + repair.beforeComponents;
  const verdict = remaining === 0
    ? 'Verified: every detected text and component failure is cleared.'
    : `${remaining} finding${remaining === 1 ? '' : 's'} still need human review.`;
  dom.completeRepairProof.textContent =
    `Complete repair proof: ${before} → ${remaining} detected failures · ` +
    `${repair.textRepairs} text + ${repair.componentRepairs} component repair${repair.textRepairs + repair.componentRepairs === 1 ? '' : 's'} applied · ` +
    `${repair.changedPixels.toLocaleString()} pixels changed. ${verdict}`;
  dom.completeRepairProof.dataset.verified = String(remaining === 0);
  dom.completeRepairProof.hidden = false;
}

function hasCssFixCandidates() {
  if (!state.sourceImageData) return false;
  const failingText = (state.textScan?.regions || []).some((region) => !region.passesAA);
  const failingComponents = (state.componentScan?.findings || []).length > 0;
  const failingTargets = (state.targetSizeScan?.findings || []).length > 0;
  return failingText || failingComponents || failingTargets;
}

function syncCssFixActions() {
  const available = !state.isRendering && hasCssFixCandidates();
  if (dom.copyCssFixesBtn) dom.copyCssFixesBtn.disabled = !available;
  if (dom.downloadCssFixesBtn) dom.downloadCssFixesBtn.disabled = !available;
}

// Developer handoff: verified color replacements plus screenshot-localized
// layout templates for every undersized tap target.
function buildCssFixSheetPayload() {
  if (!hasCssFixCandidates()) return null;

  const textFixes = [];
  for (const region of (state.textScan?.regions || []).filter((entry) => !entry.passesAA)) {
    let suggestion = null;
    try {
      [suggestion] = suggestAccessiblePairs(region.text.hex, region.background.hex, 4.5, 1, true);
    } catch {
      suggestion = null;
    }
    if (!suggestion) continue;
    textFixes.push({
      region: { x: region.x, y: region.y, width: region.width, height: region.height, ratio: region.ratio },
      measured: { text: region.text.hex, background: region.background.hex },
      suggestion: { text: suggestion.text, background: suggestion.background, ratio: suggestion.ratio },
    });
  }

  const componentFixes = [];
  for (const finding of state.componentScan?.findings || []) {
    const plan = planComponentRepairForFinding(finding);
    if (!plan) continue;
    componentFixes.push({
      box: { ...finding.box },
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
    });
  }

  const targetFixes = (state.targetSizeScan?.findings || []).map((finding) => ({
    box: { ...finding.box },
    widthCss: finding.widthCss,
    heightCss: finding.heightCss,
    minTargetCss: state.targetSizeScan.summary.minTargetCss,
  }));

  if (!textFixes.length && !componentFixes.length && !targetFixes.length) return null;

  let sheet = null;
  try {
    sheet = buildCssFixSheet({ sourceName: state.sourceName || null, textFixes, componentFixes, targetFixes });
  } catch {
    return null;
  }
  return {
    ...sheet,
    filename: `${getSafeFileName(state.sourceName || 'clearsight-source')}-fixes.css`,
  };
}

function describeCssFixSheet(payload) {
  const parts = [];
  if (payload.textFixCount) parts.push(`${payload.textFixCount} text fix${payload.textFixCount === 1 ? '' : 'es'}`);
  if (payload.componentFixCount) {
    parts.push(`${payload.componentFixCount} component surface fix${payload.componentFixCount === 1 ? '' : 'es'}`);
  }
  if (payload.targetFixCount) {
    parts.push(`${payload.targetFixCount} tap-target fix${payload.targetFixCount === 1 ? '' : 'es'}`);
  }
  return parts.join(' and ');
}

async function copyCssFixSheet() {
  const payload = buildCssFixSheetPayload();
  if (!payload) {
    setMessage('No repairable contrast failures detected — the CSS fix sheet is only generated when fixes exist.', 'info');
    return;
  }
  await copyTextWithFallback({
    payload: payload.css,
    filename: payload.filename,
    mimeType: 'text/css;charset=utf-8',
    copiedMessage: `CSS fix sheet copied: ${describeCssFixSheet(payload)} as paste-ready custom properties.`,
    downloadMessage: `Clipboard unavailable — CSS fix sheet downloaded as ${payload.filename} instead.`,
  });
}

function downloadCssFixSheet() {
  const payload = buildCssFixSheetPayload();
  if (!payload) {
    setMessage('No repairable contrast failures detected — the CSS fix sheet is only generated when fixes exist.', 'info');
    return;
  }
  downloadTextFile(payload.css, payload.filename, 'text/css;charset=utf-8;');
  setMessage(`CSS fix sheet exported as ${payload.filename}: ${describeCssFixSheet(payload)} with verified before/after ratios.`, 'success');
}

async function repairAllAuditFailures() {
  if (!state.sourceImageData || state.isRendering) return;
  const failingText = (state.textScan?.regions || []).filter((region) => !region.passesAA);
  const failingComponents = state.componentScan?.findings || [];
  if (!failingText.length && !failingComponents.length) {
    setMessage('The complete scan already passes every detected text and component contrast check.', 'success');
    return;
  }

  const { width, height, data } = state.sourceImageData;
  const repairedData = new Uint8ClampedArray(data);
  let textRepairs = 0;
  let componentRepairs = 0;
  let changedPixels = 0;

  for (const region of failingText) {
    const [suggestion] = suggestAccessiblePairs(region.text.hex, region.background.hex, 4.5, 1, true);
    if (!suggestion || suggestion.ratio < 4.5) continue;
    try {
      const summary = applyTextRegionContrastFix(
        repairedData, width, height, region, suggestion.text, suggestion.background,
      );
      if (summary.changedPixels > 0) {
        textRepairs += 1;
        changedPixels += summary.changedPixels;
      }
    } catch {
      // Keep processing independent findings when one region cannot be isolated.
    }
  }

  for (const finding of failingComponents) {
    const plan = planComponentRepairForFinding(finding);
    try {
      if (!plan || plan.surfaceRatio < 3) continue;
      const summary = applyComponentSurfaceContrastFix(repairedData, width, height, finding, plan);
      if (summary.changedPixels > 0) {
        componentRepairs += 1;
        changedPixels += summary.changedPixels;
      }
    } catch {
      // A difficult component must not prevent safe repairs elsewhere.
    }
  }

  if (!textRepairs && !componentRepairs) {
    setMessage('ClearSight could not safely isolate pixels for the detected failures.', 'error');
    return;
  }

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  canvas.getContext('2d').putImageData(new ImageData(repairedData, width, height), 0, 0);
  const image = new Image();
  const loaded = new Promise((resolve, reject) => {
    image.onload = resolve;
    image.onerror = () => reject(new Error('Could not prepare the fully repaired screenshot for verification.'));
  });
  image.src = canvas.toDataURL('image/png');

  try {
    await loaded;
    captureImageRepairUndo('complete accessibility repair');
    captureScoreRepairBaseline('complete accessibility repair');
    state.completeAuditRepair = {
      beforeText: failingText.length,
      beforeComponents: failingComponents.length,
      textRepairs,
      componentRepairs,
      changedPixels,
    };
    state.targetedTextRepair = null;
    state.componentSurfaceRepair = null;
    state.sourceImage = image;
    state.sourceName = `${getSafeFileName(state.sourceName || 'screenshot')}-fully-repaired.png`;
    state.sourceOriginalDimensions = { width, height };
    state.sourceWasDownscaled = false;
    state.sourceResizeInfo =
      `generated locally by ClearSight complete repair (${changedPixels} pixels changed across ${textRepairs + componentRepairs} findings)`;
    setMessage(
      `Applied ${textRepairs} text and ${componentRepairs} component repair${textRepairs + componentRepairs === 1 ? '' : 's'}. Re-running all 12 simulations and six audit axes to verify…`,
      'info',
    );
    await renderAll();
    renderCompleteAuditRepairProof();
    dom.completeRepairProof?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  } catch (error) {
    setMessage(error.message || 'Could not verify the complete accessibility repair.', 'error');
  }
}

// Padded targets leave headroom so the re-scan's resampled colors still
// verify cleanly against the real 3:1 / 4.5:1 / Lc 60 bars. The text
// target also chases the region's ORIGINAL ratio, and the APCA floor
// keeps the repair honest across every lens: fixing the surface must not
// walk the text-contrast axis backwards or create a new perceptual false
// pass (best-effort when the new surface makes a target unreachable).
// Shared by the one-click repairs and the exported CSS fix sheet so the
// colors a developer pastes are the same colors the pixel repair verified.
function planComponentRepairForFinding(finding) {
  const region = state.textScan?.regions?.[finding.regionIndex] || null;
  try {
    return planComponentSurfaceRepair(finding.surface.rgb, finding.surrounding.rgb, region?.text?.rgb || null, {
      minRatio: 3.3,
      textMinRatio: Math.max(5, Number.isFinite(region?.ratio) ? region.ratio : 0),
      textMinApcaLc: 62,
      // Steer the new surface away from colors that would collapse into the
      // screenshot's existing dominant palette for color-blind users, so the
      // repair cannot mint a fresh WCAG 1.4.1 collision while fixing 1.4.11.
      avoidCollisionColors: (state.paletteAuditColors || []).map((color) => color.rgb).filter(Boolean),
    });
  } catch {
    return null;
  }
}

async function repairComponentSurfaceFinding(finding) {
  if (!state.sourceImageData || state.isRendering || finding?.outcome !== 'fail') return;
  const plan = planComponentRepairForFinding(finding);
  if (!plan || plan.surfaceRatio < 3) {
    setMessage('ClearSight could not find a safe surface repair for this component.', 'error');
    return;
  }

  const { width, height, data } = state.sourceImageData;
  const repairedData = new Uint8ClampedArray(data);
  let repairSummary;
  try {
    repairSummary = applyComponentSurfaceContrastFix(repairedData, width, height, finding, plan);
  } catch (error) {
    setMessage(error.message || 'Could not repair the component surface.', 'error');
    return;
  }
  if (!repairSummary.changedPixels) {
    setMessage('No surface pixels could be isolated safely for this component.', 'error');
    return;
  }

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  canvas.getContext('2d').putImageData(new ImageData(repairedData, width, height), 0, 0);
  const image = new Image();
  const loaded = new Promise((resolve, reject) => {
    image.onload = resolve;
    image.onerror = () => reject(new Error('Could not prepare the repaired screenshot for verification.'));
  });
  image.src = canvas.toDataURL('image/png');

  try {
    await loaded;
    captureImageRepairUndo('component surface repair');
    captureScoreRepairBaseline('component surface repair');
    state.componentSurfaceRepair = {
      box: { ...finding.box },
      beforeRatio: finding.ratio,
      replacementSurface: plan.surface.hex,
      replacementText: plan.textAdjusted ? plan.text?.hex || null : null,
      changedPixels: repairSummary.changedPixels,
    };
    state.targetedTextRepair = null;
    state.completeAuditRepair = null;
    state.sourceImage = image;
    state.sourceName = `${getSafeFileName(state.sourceName || 'screenshot')}-surface-fixed.png`;
    state.sourceOriginalDimensions = { width, height };
    state.sourceWasDownscaled = false;
    state.sourceResizeInfo = `generated locally by ClearSight component surface repair (${repairSummary.changedPixels} pixels changed)`;
    setMessage(
      `Component surface repainted to ${plan.surface.hex.toUpperCase()}${plan.textAdjusted && plan.text ? ` with text ${plan.text.hex.toUpperCase()} to hold AA` : ''}. Re-running the complete audit to verify…`,
      'info',
    );
    await renderAll();
    renderComponentSurfaceRepairProof();
    dom.componentScanStatus?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  } catch (error) {
    setMessage(error.message || 'Could not verify the component surface repair.', 'error');
  }
}

function renderTextScan() {
  if (!dom.textScanStatus || !dom.textScanResult || !dom.textScanCanvas || !dom.textScanList) {
    return;
  }

  dom.textScanList.innerHTML = '';
  dom.textScanResult.hidden = true;
  if (dom.textScanLens) dom.textScanLens.hidden = true;
  state.textScan = null;
  resetComponentScanPanel();

  if (!state.sourceImageData) {
    setTextScanStatus('Render simulations to scan text regions automatically.');
    updateFindingsCommandCenter();
    return;
  }

  let scan = null;
  try {
    const { data, width, height } = state.sourceImageData;
    scan = detectTextLikeRegions(data, width, height);
  } catch (error) {
    setTextScanStatus('Text scan unavailable for this image.');
    updateFindingsCommandCenter();
    return;
  }

  if (!scan.regions.length) {
    setTextScanStatus('No text-like regions detected in this screenshot.');
    updateFindingsCommandCenter();
    return;
  }

  scan.regions.forEach((region) => {
    try {
      const projection = projectContrastAcrossCvdModes(region.text.rgb, region.background.rgb);
      region.cvd = {
        worstRatio: projection.worst.ratio,
        worstMode: getCvdModeShortLabel(projection.worst.label),
        hiddenFailure: projection.hiddenFailure,
      };
    } catch {
      region.cvd = null;
    }
    try {
      const apcaComparison = compareWcagVsApca(region.text.rgb, region.background.rgb);
      region.apca = {
        lc: apcaComparison.apca.lc,
        absLc: apcaComparison.apca.absLc,
        rating: apcaComparison.apca.rating,
        falsePass: apcaComparison.falsePass,
      };
    } catch {
      region.apca = null;
    }
  });
  scan.summary.cvdHiddenFailures = scan.regions.filter((region) => region.cvd?.hiddenFailure).length;
  scan.summary.apcaFalsePasses = scan.regions.filter((region) => region.apca?.falsePass).length;
  state.textScan = scan;

  const statusParts = [
    `${scan.summary.total} text-like region${scan.summary.total === 1 ? '' : 's'} detected`,
    scan.summary.belowAA > 0
      ? `${scan.summary.belowAA} below AA for normal text`
      : 'all estimated pairs meet AA',
  ];
  if (scan.summary.cvdHiddenFailures > 0) {
    statusParts.push(
      `${scan.summary.cvdHiddenFailures} pass AA but fail under color-blindness`,
    );
  }
  if (scan.summary.apcaFalsePasses > 0) {
    statusParts.push(
      `${scan.summary.apcaFalsePasses} pass WCAG 2 but score below APCA fluent-text minimum`,
    );
  }
  if (scan.summary.total > scan.regions.length) {
    statusParts.push(`showing worst ${scan.regions.length}`);
  }
  setTextScanStatus(statusParts.join(' · '));

  const { width, height } = state.sourceImageData;
  const displayWidth = Math.min(width, MAX_PREVIEW_WIDTH);
  const scale = displayWidth / width;
  const displayHeight = Math.max(1, Math.round(height * scale));
  const staging = document.createElement('canvas');
  staging.width = width;
  staging.height = height;
  staging.getContext('2d').putImageData(state.sourceImageData, 0, 0);

  dom.textScanCanvas.width = displayWidth;
  dom.textScanCanvas.height = displayHeight;
  const ctx = dom.textScanCanvas.getContext('2d');
  ctx.drawImage(staging, 0, 0, displayWidth, displayHeight);

  const badgeSize = 18;
  scan.regions.forEach((region, index) => {
    const stroke = TEXT_SCAN_STROKES[region.level] || TEXT_SCAN_STROKES.fail;
    const x = region.x * scale;
    const y = region.y * scale;
    const w = Math.max(2, region.width * scale - 2);
    const h = Math.max(2, region.height * scale - 2);
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = stroke;
    ctx.strokeRect(x + 1, y + 1, w, h);
    const badgeY = Math.max(0, y - badgeSize);
    ctx.fillStyle = stroke;
    ctx.fillRect(x, badgeY, badgeSize, badgeSize);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 12px "Inter", "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(String(index + 1), x + badgeSize / 2, badgeY + badgeSize / 2 + 1);
  });

  scan.regions.forEach((region, index) => {
    const item = document.createElement('li');
    item.className = 'palette-pair';

    const sample = document.createElement('span');
    sample.className = 'palette-pair-sample';
    sample.textContent = 'Aa';
    sample.style.color = region.text.hex;
    sample.style.background = region.background.hex;
    sample.setAttribute('aria-hidden', 'true');

    const detail = document.createElement('span');
    detail.className = 'palette-pair-detail';
    const cvdDetail = region.cvd
      ? ` · CVD worst ${region.cvd.worstRatio.toFixed(2)}:1 (${region.cvd.worstMode})`
      : '';
    const apcaDetail = region.apca ? ` · APCA Lc ${Math.round(region.apca.absLc)}` : '';
    detail.textContent = `#${index + 1} · ${region.text.hex.toUpperCase()} on ${region.background.hex.toUpperCase()} · ${region.ratio.toFixed(2)}:1${cvdDetail}${apcaDetail} · ~${region.width}×${region.height}px`;

    const presentation = PALETTE_LEVEL_PRESENTATION[region.level] || PALETTE_LEVEL_PRESENTATION.fail;
    const badge = document.createElement('span');
    badge.className = `palette-pair-badge ${presentation.className}`;
    badge.textContent = presentation.label;

    const cvdBadge = region.cvd?.hiddenFailure
      ? (() => {
          const risk = document.createElement('span');
          risk.className = 'palette-pair-badge cvd-risk-badge';
          risk.textContent = 'CVD risk';
          risk.title = `Passes AA for typical vision but drops to ${region.cvd.worstRatio.toFixed(2)}:1 under ${region.cvd.worstMode}.`;
          return risk;
        })()
      : null;

    const loadBtn = document.createElement('button');
    loadBtn.type = 'button';
    loadBtn.className = 'tiny-btn';
    loadBtn.textContent = 'Inspect';
    loadBtn.setAttribute(
      'aria-label',
      `Load detected text region ${index + 1} colors into the contrast checker`,
    );
    loadBtn.addEventListener('click', () => loadTextScanRegion(region, index));

    const apcaBadge = region.apca?.falsePass
      ? (() => {
          const risk = document.createElement('span');
          risk.className = 'palette-pair-badge cvd-risk-badge';
          risk.textContent = 'APCA risk';
          risk.title = `Passes WCAG 2 at ${region.ratio.toFixed(2)}:1 but scores only Lc ${Math.round(region.apca.absLc)} under APCA (WCAG 3 draft) — below the fluent-text minimum of 60.`;
          return risk;
        })()
      : null;

    item.append(sample, detail, badge);
    if (cvdBadge) {
      item.append(cvdBadge);
    }
    if (apcaBadge) {
      item.append(apcaBadge);
    }
    item.append(loadBtn);
    dom.textScanList.appendChild(item);
  });

  dom.textScanResult.hidden = false;
  renderComponentSurfaceScan();
  renderTargetSizeScan();
  renderTextScanIssueLens(scan.regions[0], 0);
  renderTargetedTextRepairProof();
  renderComponentSurfaceRepairProof();
  renderCompleteAuditRepairProof();
  dom.textScanCanvas.title = 'Click a numbered region to check its sampled colors and generate fixes';
  if (dom.reviewWorstTextBtn) {
    const worstRegion = scan.regions[0];
    dom.reviewWorstTextBtn.onclick = () => loadTextScanRegion(worstRegion, 0, { guideToFix: true });
  }
  if (dom.repairAllTextBtn) {
    const failureCount = scan.summary.belowAA;
    dom.repairAllTextBtn.disabled = failureCount === 0;
    dom.repairAllTextBtn.textContent = failureCount > 0
      ? `Fix all ${failureCount} detected failure${failureCount === 1 ? '' : 's'}`
      : 'All detected text passes AA';
    dom.repairAllTextBtn.setAttribute(
      'aria-label',
      failureCount > 0
        ? `Automatically repair and verify all ${failureCount} detected text contrast failures`
        : 'All detected text regions pass WCAG AA',
    );
  }
  if (dom.repairAllAuditBtn) {
    const completeFailureCount = scan.summary.belowAA + (state.componentScan?.summary?.failing || 0);
    dom.repairAllAuditBtn.disabled = completeFailureCount === 0;
    dom.repairAllAuditBtn.textContent = completeFailureCount > 0
      ? `Fix all ${completeFailureCount} text + component failure${completeFailureCount === 1 ? '' : 's'}`
      : 'Complete scan passes';
  }
  updateFindingsCommandCenter();
}

function buildAnnotatedTextScanCanvas() {
  if (!state.sourceImageData || !state.textScan?.regions?.length) {
    throw new Error('Render a screenshot with detected text regions before exporting the scan.');
  }

  const { width, height } = state.sourceImageData;
  const regions = state.textScan.regions;
  const rowHeight = 36;
  const headerHeight = 76;
  const footerHeight = 58 + regions.length * rowHeight;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height + headerHeight + footerHeight;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#f8fafc';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#0f172a';
  ctx.font = '700 26px "Inter", "Segoe UI", sans-serif';
  ctx.fillText('ClearSight · Automatic text contrast scan', 24, 34);
  ctx.fillStyle = '#475569';
  ctx.font = '16px "Inter", "Segoe UI", sans-serif';
  ctx.fillText(`${state.textScan.summary.belowAA} below AA · ${state.textScan.summary.total} detected · worst contrast first`, 24, 60);

  const staging = document.createElement('canvas');
  staging.width = width;
  staging.height = height;
  staging.getContext('2d').putImageData(state.sourceImageData, 0, 0);
  ctx.drawImage(staging, 0, headerHeight);

  const badgeSize = Math.max(22, Math.min(34, Math.round(width / 24)));
  regions.forEach((region, index) => {
    const stroke = TEXT_SCAN_STROKES[region.level] || TEXT_SCAN_STROKES.fail;
    const x = region.x;
    const y = headerHeight + region.y;
    ctx.lineWidth = Math.max(3, Math.round(width / 300));
    ctx.strokeStyle = stroke;
    ctx.strokeRect(x, y, region.width, region.height);
    ctx.fillStyle = stroke;
    ctx.fillRect(x, Math.max(headerHeight, y - badgeSize), badgeSize, badgeSize);
    ctx.fillStyle = '#ffffff';
    ctx.font = `700 ${Math.round(badgeSize * 0.55)}px "Inter", "Segoe UI", sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(String(index + 1), x + badgeSize / 2, Math.max(headerHeight, y - badgeSize) + badgeSize / 2);
  });

  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = '#0f172a';
  ctx.font = '700 18px "Inter", "Segoe UI", sans-serif';
  ctx.fillText('Detected regions', 24, headerHeight + height + 34);
  regions.forEach((region, index) => {
    const y = headerHeight + height + 62 + index * rowHeight;
    const presentation = PALETTE_LEVEL_PRESENTATION[region.level] || PALETTE_LEVEL_PRESENTATION.fail;
    ctx.fillStyle = TEXT_SCAN_STROKES[region.level] || TEXT_SCAN_STROKES.fail;
    ctx.fillRect(24, y - 17, 24, 24);
    ctx.fillStyle = '#ffffff';
    ctx.font = '700 13px "Inter", "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(String(index + 1), 36, y);
    ctx.textAlign = 'left';
    ctx.fillStyle = '#0f172a';
    ctx.font = '600 15px "Inter", "Segoe UI", sans-serif';
    ctx.fillText(`${region.ratio.toFixed(2)}:1 · ${presentation.label} · ${region.text.hex.toUpperCase()} on ${region.background.hex.toUpperCase()} · ~${region.width}×${region.height}px`, 60, y);
  });
  return canvas;
}

function downloadAnnotatedTextScan() {
  try {
    const canvas = buildAnnotatedTextScanCanvas();
    const safeBase = getSafeFileName(state.sourceName || 'clearsight-source');
    downloadCanvasAsImage(canvas, `${safeBase}-text-contrast-scan.png`);
    setMessage('Annotated text contrast scan downloaded with numbered WCAG findings.', 'success');
  } catch (error) {
    setMessage(error.message, 'error');
  }
}

function renderPaletteAudit() {
  if (!dom.paletteStatus || !dom.paletteSwatches || !dom.palettePairs) {
    return;
  }

  dom.paletteSwatches.innerHTML = '';
  dom.palettePairs.innerHTML = '';
  state.paletteAuditColors = null;
  state.paletteAuditSummary = null;
  state.textScan = null;
  resetCollisionPanel('Render simulations to scan dominant color pairs for color-vision collisions.');
  resetRecolorPreview();

  if (!state.sourceImageData) {
    setPaletteAuditStatus('Render simulations to audit the source palette automatically.');
    return;
  }

  let colors = [];
  try {
    const { data, width, height } = state.sourceImageData;
    const sampleStride = Math.max(1, Math.round((width * height) / 150000));
    colors = extractDominantColors(data, width, height, { maxColors: 6, sampleStride });
  } catch (error) {
    setPaletteAuditStatus('Palette audit unavailable for this image.');
    return;
  }

  if (colors.length < 2) {
    setPaletteAuditStatus('Not enough distinct colors detected for a palette audit.');
    return;
  }

  colors.forEach((color) => {
    const swatch = document.createElement('span');
    swatch.className = 'palette-swatch';
    swatch.setAttribute('role', 'listitem');

    const chip = document.createElement('span');
    chip.className = 'palette-swatch-chip';
    chip.style.background = color.hex;
    chip.setAttribute('aria-hidden', 'true');

    const label = document.createElement('span');
    label.className = 'palette-swatch-label';
    label.textContent = `${color.hex.toUpperCase()} · ${color.sharePercent.toFixed(1)}%`;

    swatch.append(chip, label);
    dom.paletteSwatches.appendChild(swatch);
  });

  const { pairs, summary } = buildPaletteContrastMatrix(colors);
  state.paletteAuditSummary = summary;
  const statusParts = [
    `${colors.length} dominant colors`,
    `${summary.total} pairings checked`,
  ];
  if (summary.belowAA > 0) {
    statusParts.push(`${summary.belowAA} below AA for normal text`);
  } else {
    statusParts.push('all pairings meet AA');
  }
  setPaletteAuditStatus(statusParts.join(' · '));

  pairs.forEach((pair) => {
    const item = document.createElement('li');
    item.className = 'palette-pair';

    const sample = document.createElement('span');
    sample.className = 'palette-pair-sample';
    sample.textContent = 'Aa';
    sample.style.color = pair.text;
    sample.style.background = pair.background;
    sample.setAttribute('aria-hidden', 'true');

    const detail = document.createElement('span');
    detail.className = 'palette-pair-detail';
    detail.textContent = `${pair.text.toUpperCase()} on ${pair.background.toUpperCase()} · ${pair.ratio.toFixed(2)}:1`;

    const presentation = PALETTE_LEVEL_PRESENTATION[pair.level] || PALETTE_LEVEL_PRESENTATION.fail;
    const badge = document.createElement('span');
    badge.className = `palette-pair-badge ${presentation.className}`;
    badge.textContent = presentation.label;

    const loadBtn = document.createElement('button');
    loadBtn.type = 'button';
    loadBtn.className = 'tiny-btn';
    loadBtn.textContent = 'Load pair';
    loadBtn.setAttribute(
      'aria-label',
      `Load ${pair.text.toUpperCase()} on ${pair.background.toUpperCase()} into the contrast checker`,
    );
    loadBtn.addEventListener('click', () => loadPaletteAuditPair(pair));

    item.append(sample, detail, badge, loadBtn);
    dom.palettePairs.appendChild(item);
  });

  state.paletteAuditColors = colors;
  renderPaletteCollisionPanel(colors);
  if (summary.belowAA > 0 && dom.paletteRecolor) {
    dom.paletteRecolor.hidden = false;
    setRecolorStatus(
      `${summary.belowAA} pairing${summary.belowAA === 1 ? '' : 's'} below AA — preview how your screenshot looks with the closest accessible replacement colors.`,
    );
  }
  renderRemediationProof();
}

function resetCollisionPanel(message) {
  state.paletteCollisions = null;
  if (dom.collisionList) {
    dom.collisionList.innerHTML = '';
  }
  if (dom.collisionStatus) {
    dom.collisionStatus.textContent = message || '';
    delete dom.collisionStatus.dataset.collisions;
  }
}

function renderPaletteCollisionPanel(colors) {
  if (!dom.collisionStatus || !dom.collisionList) {
    return;
  }

  let result = null;
  try {
    result = findCvdColorCollisions(colors);
  } catch (error) {
    dom.collisionStatus.textContent = 'Color-collision scan unavailable for this palette.';
    return;
  }

  state.paletteCollisions = result;
  dom.collisionStatus.dataset.collisions = String(result.summary.collisions);
  updateFindingsCommandCenter();

  if (!result.summary.collisions) {
    dom.collisionStatus.textContent = `No color-only distinction risks: all ${result.summary.candidatePairs} clearly-distinct dominant pairs stay tellable-apart across the ${result.summary.evaluatedModes} color-vision projections.`;
    return;
  }

  const worst = result.summary.worstPair;
  dom.collisionStatus.textContent =
    `${result.summary.collisions} of ${result.summary.candidatePairs} distinct dominant color pair${result.summary.collisions === 1 ? '' : 's'} collapse under color-vision deficiency — ` +
    `worst: ${worst.colorA} vs ${worst.colorB} become nearly identical under ${getCvdModeShortLabel(worst.worst.label)}. ` +
    'If these colors encode meaning, add a second cue (icon, label, pattern) per WCAG 1.4.1.';

  result.pairs.forEach((pair) => {
    const item = document.createElement('li');
    item.className = 'collision-pair';

    const buildDuo = (hexA, hexB, caption) => {
      const duo = document.createElement('span');
      duo.className = 'collision-duo';
      [hexA, hexB].forEach((hex) => {
        const chip = document.createElement('span');
        chip.className = 'collision-chip';
        chip.style.background = hex;
        chip.setAttribute('aria-hidden', 'true');
        duo.appendChild(chip);
      });
      const label = document.createElement('span');
      label.className = 'collision-duo-label';
      label.textContent = caption;
      duo.appendChild(label);
      return duo;
    };

    const arrow = document.createElement('span');
    arrow.className = 'collision-arrow';
    arrow.textContent = '→';
    arrow.setAttribute('aria-hidden', 'true');

    const detail = document.createElement('span');
    detail.className = 'collision-detail';
    const lostPercent = Math.max(0, Math.min(100, 100 - pair.worst.retentionPercent));
    detail.textContent =
      `${pair.colorA} vs ${pair.colorB} · ΔE ${pair.baseDeltaE.toFixed(0)} → ${pair.worst.deltaE.toFixed(1)} ` +
      `(${lostPercent.toFixed(0)}% of the difference disappears) · ` +
      `${pair.collidingModes.length} of ${result.summary.evaluatedModes} modes affected`;

    const badge = document.createElement('span');
    badge.className = 'palette-pair-badge palette-pair-badge--fail';
    badge.textContent = '1.4.1 risk';

    item.append(
      buildDuo(pair.colorA, pair.colorB, 'Typical vision'),
      arrow,
      buildDuo(pair.worst.projectedA.hex, pair.worst.projectedB.hex, `Seen with ${getCvdModeShortLabel(pair.worst.label || pair.worst.id)}`),
      detail,
      badge,
    );
    dom.collisionList.appendChild(item);
  });
}

function getHighestColorShiftPercent() {
  // Field-loss occlusion modes are recolor-invariant, so the fix proof compares
  // only color-vision (matrix) simulations where palette changes can move the needle.
  const matrixModeIds = new Set(allModes.filter((mode) => mode.kind === 'matrix').map((mode) => mode.id));
  const values = state.modeImpacts
    .filter((entry) => matrixModeIds.has(entry.modeId))
    .map((entry) => entry.impactPercent)
    .filter((value) => Number.isFinite(value));
  return values.length ? Math.max(...values) : null;
}

function renderRemediationProof() {
  if (!dom.remediationProof) return;
  const baseline = state.remediationBaseline;
  const current = state.paletteAuditSummary;
  if (!baseline || !current || !state.hasRenderedSource) {
    dom.remediationProof.hidden = true;
    dom.remediationProof.textContent = '';
    return;
  }

  const currentImpact = getHighestColorShiftPercent();
  const pairDelta = baseline.belowAA - current.belowAA;
  const scoreNow = computeCurrentAccessibilityScore();
  const scoreRegressed = state.scoreRepairBaseline && scoreNow && scoreNow.score < state.scoreRepairBaseline.score;
  const impactText = Number.isFinite(baseline.highestImpact) && Number.isFinite(currentImpact)
    ? ` Peak color-vision shift: ${baseline.highestImpact.toFixed(1)}% → ${currentImpact.toFixed(1)}%.`
    : '';
  const proofTitle = scoreRegressed ? 'Re-audit caught a broader regression' : 'Fix verified on the repainted screenshot';
  const scoreWarning = scoreRegressed
    ? ` Overall ClearSight Score fell ${state.scoreRepairBaseline.score} → ${scoreNow.score}; review before adopting this recolor.`
    : '';
  dom.remediationProof.innerHTML = `<strong>${proofTitle}</strong>${baseline.belowAA} → ${current.belowAA} dominant-palette pairs below AA (${Math.max(0, pairDelta)} resolved).${impactText}${scoreWarning}`;
  dom.remediationProof.hidden = false;
}

function setRecolorStatus(message) {
  if (dom.recolorStatus) {
    dom.recolorStatus.textContent = message;
  }
}

function setRecolorReveal(value) {
  const reveal = Math.max(0, Math.min(100, Number(value) || 0));
  dom.recolorWipeStage?.style.setProperty('--recolor-reveal', `${reveal}%`);
  if (dom.recolorRevealRange) {
    dom.recolorRevealRange.value = String(reveal);
    dom.recolorRevealRange.setAttribute(
      'aria-valuetext',
      `${Math.round(reveal)}% accessible fix visible`,
    );
  }
}

function resetRecolorPreview() {
  state.lastRecolorPlan = null;
  if (dom.paletteRecolor) {
    dom.paletteRecolor.hidden = true;
  }
  if (dom.recolorDownloadBtn) {
    dom.recolorDownloadBtn.hidden = true;
  }
  if (dom.recolorApplyBtn) {
    dom.recolorApplyBtn.hidden = true;
  }
  if (dom.recolorMap) {
    dom.recolorMap.hidden = true;
    dom.recolorMap.innerHTML = '';
  }
  if (dom.recolorCompare) {
    dom.recolorCompare.hidden = true;
  }
  setRecolorReveal(50);
  setRecolorStatus('');
}

function buildRecolorMapItem(entry) {
  const item = document.createElement('span');
  item.className = 'recolor-map-item';
  item.setAttribute('role', 'listitem');

  const fromChip = document.createElement('span');
  fromChip.className = 'recolor-chip';
  fromChip.style.background = entry.from;
  fromChip.setAttribute('aria-hidden', 'true');

  const arrow = document.createElement('span');
  arrow.className = 'recolor-arrow';
  arrow.textContent = '→';
  arrow.setAttribute('aria-hidden', 'true');

  const toChip = document.createElement('span');
  toChip.className = 'recolor-chip';
  toChip.style.background = entry.to;
  toChip.setAttribute('aria-hidden', 'true');

  const label = document.createElement('span');
  label.className = 'recolor-map-label';
  label.textContent = `${entry.from.toUpperCase()} to ${entry.to.toUpperCase()}`;

  item.append(fromChip, arrow, toChip, label);
  return item;
}

function paintImageDataToCanvas(canvas, pixels, width, height) {
  if (!canvas) {
    return false;
  }
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  if (!context) {
    return false;
  }
  context.putImageData(new ImageData(new Uint8ClampedArray(pixels), width, height), 0, 0);
  return true;
}

function runRecolorPreview() {
  if (!state.sourceImageData || !Array.isArray(state.paletteAuditColors) || state.paletteAuditColors.length < 2) {
    setMessage('Render simulations first to unlock the accessible recolor preview.', 'error');
    return;
  }

  let plan;
  try {
    plan = buildAccessibleRecolorPlan(state.paletteAuditColors);
  } catch (error) {
    setRecolorStatus('Accessible recolor is unavailable for this palette.');
    return;
  }

  if (!plan.remaps.length) {
    setRecolorStatus(
      'No safe substitution found: fixing these pairings would break combinations that already pass AA. Use the contrast checker suggestions instead.',
    );
    return;
  }

  const { data, width, height } = state.sourceImageData;
  const workingPixels = new Uint8ClampedArray(data);
  const anchorRemaps = plan.palette.map((entry) => ({ from: entry.from, to: entry.to }));
  const { changedPixels, totalPixels } = applyPaletteRemapToImageData(
    workingPixels,
    width,
    height,
    anchorRemaps,
  );

  const beforePainted = paintImageDataToCanvas(dom.recolorBeforeCanvas, data, width, height);
  const afterPainted = paintImageDataToCanvas(dom.recolorAfterCanvas, workingPixels, width, height);
  if (!beforePainted || !afterPainted) {
    setRecolorStatus('Could not paint the recolor preview canvases in this browser.');
    return;
  }

  if (dom.recolorMap) {
    dom.recolorMap.innerHTML = '';
    plan.palette
      .filter((entry) => entry.adjusted && entry.from !== entry.to)
      .forEach((entry) => dom.recolorMap.appendChild(buildRecolorMapItem(entry)));
    dom.recolorMap.hidden = false;
  }
  if (dom.recolorCompare) {
    dom.recolorCompare.hidden = false;
  }
  setRecolorReveal(50);
  if (dom.recolorDownloadBtn) {
    dom.recolorDownloadBtn.hidden = false;
  }
  if (dom.recolorApplyBtn) {
    dom.recolorApplyBtn.hidden = false;
  }

  state.lastRecolorPlan = plan;
  const { summary } = plan;
  const repaintedPercent = totalPixels > 0 ? (changedPixels / totalPixels) * 100 : 0;
  const statusParts = [
    `Fixed ${summary.fixedPairs} of ${summary.initialBelowAA} below-AA pairing${summary.initialBelowAA === 1 ? '' : 's'}`,
    `adjusted ${summary.adjustedColors} color${summary.adjustedColors === 1 ? '' : 's'}`,
    `repainted ${repaintedPercent.toFixed(1)}% of pixels`,
  ];
  if (summary.remainingBelowAA > 0) {
    statusParts.push(
      `${summary.remainingBelowAA} pairing${summary.remainingBelowAA === 1 ? '' : 's'} could not be fixed without breaking passing combinations`,
    );
  }
  setRecolorStatus(`${statusParts.join(' · ')}.`);
  setMessage('Accessible recolor preview is ready — compare the original and repainted screenshots below.', 'info');
}

function downloadRecolorPng() {
  if (!state.lastRecolorPlan || !dom.recolorAfterCanvas || !dom.recolorAfterCanvas.width) {
    setMessage('Run the accessible recolor preview before downloading.', 'error');
    return;
  }
  downloadCanvasAsImage(dom.recolorAfterCanvas, 'clearsight-accessible-recolor.png');
  setMessage('Accessible recolor PNG download started.', 'info');
}

async function applyRecolorAndVerify() {
  if (!state.lastRecolorPlan || !dom.recolorAfterCanvas?.width) {
    setMessage('Preview the accessible recolor before applying it.', 'error');
    return;
  }

  const baseline = {
    belowAA: state.paletteAuditSummary?.belowAA || 0,
    highestImpact: getHighestColorShiftPercent(),
  };
  const image = new Image();
  const loaded = new Promise((resolve, reject) => {
    image.onload = resolve;
    image.onerror = () => reject(new Error('Could not prepare the recolored screenshot for verification.'));
  });
  image.src = dom.recolorAfterCanvas.toDataURL('image/png');

  try {
    await loaded;
    captureScoreRepairBaseline('accessible recolor');
    state.remediationBaseline = baseline;
    state.sourceImage = image;
    state.targetedTextRepair = null;
    state.componentSurfaceRepair = null;
    state.completeAuditRepair = null;
    state.sourceName = `${getSafeFileName(state.sourceName || 'screenshot')}-accessible.png`;
    state.sourceOriginalDimensions = { width: image.naturalWidth, height: image.naturalHeight };
    state.sourceWasDownscaled = false;
    state.sourceResizeInfo = 'generated locally by ClearSight accessible recolor';
    setMessage('Accessible fix applied. Re-running every simulation to verify the result…', 'info');
    await renderAll();
    renderRemediationProof();
    dom.remediationProof?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  } catch (error) {
    setMessage(error.message || 'Could not verify the accessible recolor.', 'error');
  }
}

function clearWorkspace({ notify = true, clearBatch = false } = {}) {
  if (state.isRendering) {
    cancelRenderSession();
  }

  if (walkthroughSession && clearBatch) {
    void stopWalkthroughRecording(null, { audit: false });
  }

  // Batch results survive single-screen loads (opening a batch screen resets
  // the workspace); only an explicit workspace clear discards them.
  if (clearBatch) {
    state.batchAudit = null;
    renderBatchAuditResults();
    state.flashScan = null;
    renderFlashScanResult();
    state.focusCheck = null;
    focusPairSlots.base = null;
    focusPairSlots.focus = null;
    renderFocusCheckResult();
    setFocusSlotButtonLabels();
    state.focusSequence = null;
    renderFocusSequenceResult();
  }

  state.sourceImage = null;
  state.sourceName = '';
  state.sourceOriginalDimensions = null;
  state.sourceWasDownscaled = false;
  state.sourceResizeInfo = null;
  state.renderSize = { width: 0, height: 0 };
  state.sourceImageData = null;
  state.targetedTextRepair = null;
  state.componentSurfaceRepair = null;
  state.completeAuditRepair = null;
  state.imageRepairUndo = null;
  if (dom.undoImageRepairBtn) {
    dom.undoImageRepairBtn.disabled = true;
  }
  if (dom.completeRepairProof) {
    dom.completeRepairProof.hidden = true;
  }
  if (dom.componentScanRepairProof) {
    dom.componentScanRepairProof.hidden = true;
  }
  state.isRendering = false;
  state.hasRenderedSource = false;
  state.modeImpacts = [];
  state.lastContrastResult = null;
  state.lastCvdProjection = null;
  state.lastApcaComparison = null;
  state.lastSuggestionPairs = [];
  state.currentContrastAaThreshold = AA_THRESHOLD_DEFAULT;
  state.lastAppliedContrastSuggestion = null;
  state.lastContrastUndoPair = null;
  state.paletteAuditColors = null;
  state.lastRecolorPlan = null;
  state.paletteAuditSummary = null;
  state.remediationBaseline = null;
  state.scoreRepairBaseline = null;
  state.lastReelExport = null;
  state.showTopImpactOnly = false;
  hideShareQrCard();
  clearColorPicker();
  setXrayActive(false, { notify: false });
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
  renderPaletteAudit();
  renderTextScan();
  setRenderProgress(0, 0);

  renderModeCards();
  applyTopImpactFilter();
  setSimPlaceholderVisible(true);
  setImpactSummary([]);
  dom.contrastOut.textContent = '';
  setDefaultSuggestionsState();
  updateSuggestionExportButtonState();
  clearContrastValidation();
  syncGlobalCompare(COMPARE_DEFAULT_PERCENT);
  setImageControlsEnabled(false);
  resetJudgeTimer();
  updateTopImpactPreviewButton();
  setControlState(true);
  updateWorkflowChecklist();

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
    syncSimulationCardTabOrder();
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
    syncSimulationCardTabOrder();
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

  syncSimulationCardTabOrder();
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
  openSimulationPreviewByModeId(topImpact.modeId);
}

function setControlState(enabled) {
  dom.contrastBtn.disabled = !enabled;
  dom.suggestBtn.disabled = !enabled;
  if (dom.copyContrastBtn) {
    dom.copyContrastBtn.disabled = !enabled;
  }
  if (dom.copyContrastCssBtn) {
    dom.copyContrastCssBtn.disabled = !enabled;
  }
  if (dom.swapContrastBtn) {
    dom.swapContrastBtn.disabled = !enabled;
  }
  if (dom.autoFixContrastBtn) {
    dom.autoFixContrastBtn.disabled = !enabled;
  }
  if (dom.undoContrastBtn) {
    dom.undoContrastBtn.disabled = !enabled;
  }
  if (dom.downloadContrastSnapshotBtn) {
    dom.downloadContrastSnapshotBtn.disabled = !enabled;
  }
}

function updateSuggestionExportButtonState() {
  if (dom.copySuggestionsCsvBtn) {
    const hasSuggestions = Array.isArray(state.lastSuggestionPairs) && state.lastSuggestionPairs.length > 0;
    dom.copySuggestionsCsvBtn.disabled = !hasSuggestions;
    dom.copySuggestionsJsonBtn.disabled = !hasSuggestions;
    if (dom.downloadSuggestionsCsvBtn) {
      dom.downloadSuggestionsCsvBtn.disabled = !hasSuggestions;
    }
    if (dom.downloadSuggestionsJsonBtn) {
      dom.downloadSuggestionsJsonBtn.disabled = !hasSuggestions;
    }
  }
  updateContrastUndoButtonState();
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
  const resizeInfo = state.sourceResizeInfo ? ` (${state.sourceResizeInfo})` : '';
  dom.sourceInfo.textContent = `${fileName} • ${width}×${height}px${resizeInfo}`;
}

function getSourceMetadata() {
  return {
    fileName: state.sourceName || 'Untitled source image',
    renderedSize: {
      width: state.renderSize.width,
      height: state.renderSize.height,
    },
    originalSize: state.sourceOriginalDimensions,
    wasDownscaled: Boolean(state.sourceWasDownscaled),
  };
}

function makeExportFileName(mode = 'source', extension = 'png') {
  const safeExtension = String(extension || 'png')
    .trim()
    .replace(/^\./, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');

  return `${getSafeFileName(state.sourceName || 'clearsight-source')}-${mode}.${safeExtension || 'png'}`;
}

function estimateCanvasBytes(canvas) {
  const width = Number(canvas?.width);
  const height = Number(canvas?.height);
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
    return 0;
  }
  return width * height * 4;
}

function estimateTextBytes(content = '') {
  const normalized = typeof content === 'string' ? content : '';
  if (!normalized) {
    return 0;
  }

  return new Blob([normalized]).size;
}

function textToBytes(content = '') {
  const normalized = typeof content === 'string' ? content : '';
  if (typeof TextEncoder === 'undefined') {
    const codePoints = normalized.split('').map((char) => char.charCodeAt(0));
    return new Uint8Array(codePoints);
  }

  return new TextEncoder().encode(normalized);
}

function downloadCanvasAsImage(canvas, filename) {
  if (!canvas || canvas.width === 0 || canvas.height === 0) {
    throw new Error('Nothing to download for this preview yet.');
  }

  const triggerDownload = (href) => {
    const link = document.createElement('a');
    link.href = href;
    link.download = filename;
    link.rel = 'noopener';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    if (href.startsWith('blob:')) {
      window.setTimeout(() => {
        URL.revokeObjectURL(href);
      }, 1000);
    }
  };

  if (typeof canvas.toBlob === 'function') {
    try {
      canvas.toBlob((blob) => {
        if (blob && blob.size > 0) {
          triggerDownload(URL.createObjectURL(blob));
          return;
        }

        const fallbackDataUrl = imageDataUrlFromCanvas(canvas);
        if (fallbackDataUrl) {
          triggerDownload(fallbackDataUrl);
          return;
        }
        triggerDownload(canvas.toDataURL('image/png'));
      }, 'image/png');
      return;
    } catch {
      // Fall back to data URL download below.
    }
  }

  triggerDownload(canvas.toDataURL('image/png'));
}

function downloadTextFile(content, filename, mimeType = 'text/plain;charset=utf-8;') {
  const blob = new Blob([content], { type: mimeType });
  downloadBlob(blob, filename);
}

function escapeHtmlText(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function imageDataUrlFromCanvas(canvas) {
  if (!canvas || !canvas.width || !canvas.height) {
    return '';
  }

  try {
    return canvas.toDataURL('image/png');
  } catch {
    return '';
  }
}

async function canvasToBytes(canvas, fileLabel = 'image') {
  if (!canvas || !canvas.width || !canvas.height) {
    throw new Error(`No image data for export in ${fileLabel}.`);
  }
  if (typeof canvas.toBlob === 'function') {
    const blob = await new Promise((resolve) => {
      try {
        canvas.toBlob((value) => resolve(value), 'image/png');
      } catch {
        resolve(null);
      }
    });
    if (blob && blob.size > 0) {
      const byteBuffer = await blob.arrayBuffer();
      return new Uint8Array(byteBuffer);
    }
  }

  const dataUrl = imageDataUrlFromCanvas(canvas);
  const bytes = dataUrlToBytes(dataUrl, fileLabel);
  if (!bytes || !bytes.length) {
    throw new Error(`Unable to convert ${fileLabel} canvas to bytes.`);
  }
  return bytes;
}

function createModeCard(mode) {
  const card = document.createElement('figure');
  card.className = 'sim-card';
  card.tabIndex = 0;
  card.setAttribute('role', 'button');
  card.setAttribute('aria-label', `Open ${mode.label} full-size preview`);
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

  const openPreviewFromCard = () => {
    if (inspectBtn.disabled) {
      setMessage('Render this simulation first to open full preview.', 'info');
      return;
    }

    const canvas = card.querySelector('.sim-canvas');
    const sourceCanvas = card.querySelector('.sim-source-canvas');
    openPreviewModal({
      modeId: mode.id,
      label: mode.label,
      canvas,
      sourceCanvas,
    });
  };

  card.addEventListener('click', (event) => {
    if (event.target instanceof HTMLElement && event.target.closest('button, input')) {
      return;
    }
    openPreviewFromCard();
  });

  card.addEventListener('keydown', (event) => {
    if (event.key !== 'Enter' && event.key !== ' ') {
      return;
    }
    event.preventDefault();
    openPreviewFromCard();
  });

  inspectBtn.addEventListener('click', () => {
    openPreviewFromCard();
  });

  const hotspotBtn = document.createElement('button');
  hotspotBtn.type = 'button';
  hotspotBtn.className = 'tiny-btn sim-hotspot-btn';
  hotspotBtn.textContent = 'Show hotspots';
  hotspotBtn.disabled = true;
  hotspotBtn.setAttribute('aria-pressed', 'false');
  hotspotBtn.setAttribute('aria-label', `Show visual change hotspots for ${mode.label}`);
  hotspotBtn.addEventListener('click', () => {
    const heatmap = card.querySelector('.sim-heatmap');
    const simulated = card.querySelector('.sim-canvas');
    const showing = hotspotBtn.getAttribute('aria-pressed') === 'true';
    hotspotBtn.setAttribute('aria-pressed', String(!showing));
    hotspotBtn.textContent = showing ? 'Show hotspots' : 'Show simulation';
    hotspotBtn.setAttribute(
      'aria-label',
      `${showing ? 'Show visual change hotspots' : 'Show simulation'} for ${mode.label}`,
    );
    heatmap.hidden = showing;
    simulated.hidden = !showing;
  });

  const actions = document.createElement('div');
  actions.className = 'sim-card-actions';
  actions.append(hotspotBtn, downloadBtn, inspectBtn);

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
  const heatmapCanvas = document.createElement('canvas');
  heatmapCanvas.className = 'sim-canvas sim-heatmap';
  heatmapCanvas.hidden = true;
  heatmapCanvas.setAttribute('role', 'img');
  heatmapCanvas.setAttribute('aria-label', `${mode.label} visual change hotspot map`);
  overlay.append(canvas, heatmapCanvas);

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
  syncSimulationCardTabOrder();
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
    throw new Error(
      `The selected file is not an image. Please upload one of: ${SUPPORTED_IMAGE_FORMATS_LABEL}.`,
    );
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
      if (image.naturalWidth > MAX_UPLOADED_IMAGE_DIMENSION || image.naturalHeight > MAX_UPLOADED_IMAGE_DIMENSION) {
        reject(
          new Error(
            `Image dimensions are too large (${image.naturalWidth}×${image.naturalHeight}). ` +
              `Maximum supported upload dimensions are ${MAX_UPLOADED_IMAGE_DIMENSION}px.`,
          ),
        );
        return;
      }

      downscaleImageForRender(image, MAX_SOURCE_DIMENSION)
        .then((result) => {
          resolve({
            image: result.image,
            wasResized: result.wasResized,
            originalWidth: result.originalWidth,
            originalHeight: result.originalHeight,
          });
        })
        .catch((error) => {
          reject(error);
        });
    };

    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to decode selected image file.'));
    };

    image.src = url;
  });
}

function downscaleImageForRender(image, maxDimension) {
  const sourceWidth = image.naturalWidth;
  const sourceHeight = image.naturalHeight;

  if (!Number.isFinite(sourceWidth) || !Number.isFinite(sourceHeight) || sourceWidth <= 0 || sourceHeight <= 0) {
    return Promise.resolve({ image, wasResized: false, originalWidth: sourceWidth, originalHeight: sourceHeight });
  }

  if (sourceWidth <= maxDimension && sourceHeight <= maxDimension) {
    return Promise.resolve({
      image,
      wasResized: false,
      originalWidth: sourceWidth,
      originalHeight: sourceHeight,
    });
  }

  const scale = Math.min(maxDimension / sourceWidth, maxDimension / sourceHeight);
  const targetWidth = Math.max(1, Math.round(sourceWidth * scale));
  const targetHeight = Math.max(1, Math.round(sourceHeight * scale));

  const scaleCanvas = document.createElement('canvas');
  scaleCanvas.width = targetWidth;
  scaleCanvas.height = targetHeight;

  const scaleContext = scaleCanvas.getContext('2d', { willReadFrequently: true });
  if (!scaleContext) {
    return Promise.reject(new Error('Unable to downscale image for rendering in this browser.'));
  }

  scaleContext.imageSmoothingEnabled = true;
  scaleContext.imageSmoothingQuality = 'high';
  scaleContext.drawImage(image, 0, 0, targetWidth, targetHeight);

  const scaledDataUrl = scaleCanvas.toDataURL('image/png');
  return new Promise((resolve, reject) => {
    const scaledImage = new Image();
    scaledImage.onload = () => {
      resolve({
        image: scaledImage,
        wasResized: true,
        originalWidth: sourceWidth,
        originalHeight: sourceHeight,
      });
    };
    scaledImage.onerror = () => {
      reject(new Error('Failed to process oversized image for faster rendering.'));
    };
    scaledImage.src = scaledDataUrl;
  });
}

function paintDemoScene(c, type) {
  if (type === 'ui') {
    c.fillStyle = '#f8fafc';
    c.fillRect(0, 0, 1280, 720);
    c.fillStyle = '#0f172a';
    c.fillRect(60, 55, 560, 140);
    c.fillStyle = '#ffffff';
    c.font = 'bold 58px "Inter", "Segoe UI", sans-serif';
    c.fillText('Account overview', 90, 140);

    // Ghost search input: AA-passing placeholder text on a surface that fails
    // the WCAG 1.4.11 non-text contrast minimum against the page (~1.2:1).
    // Floated top-right on open page so its detected glyph tiles stay clear of
    // the header/button edge tiles at the 0.5x working scale (tile = 24px here).
    c.fillStyle = '#dde5ee';
    c.fillRect(720, 90, 460, 70);
    c.fillStyle = '#334155';
    c.font = 'bold 34px "Inter", "Segoe UI", sans-serif';
    c.fillText('Search reports…', 748, 136);

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
    c.fillRect(80, 400, 1140, 230);
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

    // Crowded 16px icon toolbar: every color lens passes (slate on white,
    // ~6:1 even after downscale blending) yet each tap target is below the
    // WCAG 2.5.8 24px minimum and sits too close to its neighbor for the
    // spacing exception. Placed two clean tile rows below the panel so the
    // detector sees it as its own region at the 0.53x working scale.
    c.fillStyle = '#475569';
    c.fillRect(1120, 658, 16, 16);
    c.fillRect(1142, 658, 16, 16);
    c.fillRect(1164, 658, 16, 16);
    c.fillStyle = '#ffffff';
    c.fillRect(1123, 665, 10, 2);
    c.fillRect(1149, 661, 2, 10);
    c.fillRect(1145, 665, 10, 2);
    c.fillRect(1167, 665, 10, 2);
    c.fillRect(1171, 661, 2, 10);
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
}

function createDemoImage(type) {
  const canvas = document.createElement('canvas');
  canvas.width = 1280;
  canvas.height = 720;
  paintDemoScene(canvas.getContext('2d'), type);
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

  try {
    const parsedColor = parseHexColor(clean);
    if (parsedColor && parsedColor.hex) {
      return parsedColor.hex.toLowerCase();
    }
  } catch {
    // Fall through to strict hex parsing below.
  }

  if (!HEX_HEX_RE.test(clean)) {
    return null;
  }

  const normalized = clean.startsWith('#') ? clean.slice(1) : clean;
  const rgbOnlyHex =
    normalized.length === 4
      ? normalized
          .split('')
          .slice(0, 3)
          .map((ch) => ch + ch)
          .join('')
      : normalized.length === 8
        ? normalized.slice(0, 6)
        : normalized;

  if (rgbOnlyHex.length === 3) {
    return `#${rgbOnlyHex
      .split('')
      .map((ch) => ch + ch)
      .join('')}`.toLowerCase();
  }

  return `#${rgbOnlyHex}`.toLowerCase();
}

function getCurrentContrastPair() {
  const textHex = normalizeHexInput(dom.contrastTextHex?.value || dom.contrastText?.value);
  const backgroundHex = normalizeHexInput(dom.contrastBgHex?.value || dom.contrastBg?.value);
  if (!textHex || !backgroundHex) {
    return null;
  }

  return { text: textHex.toUpperCase(), background: backgroundHex.toUpperCase() };
}

function updateContrastUndoButtonState() {
  if (!dom.undoContrastBtn) {
    return;
  }

  dom.undoContrastBtn.disabled =
    !state.lastContrastUndoPair ||
    !state.lastContrastUndoPair.text ||
    !state.lastContrastUndoPair.background;
}

function clearContrastUndoState() {
  state.lastContrastUndoPair = null;
  updateContrastUndoButtonState();
}

function setContrastPair(textHex, backgroundHex, options = {}) {
  const { trackUndo = false } = options;
  const normalizedText = normalizeHexInput(textHex);
  const normalizedBackground = normalizeHexInput(backgroundHex);

  if (!normalizedText || !normalizedBackground) {
    return false;
  }

  if (trackUndo) {
    state.lastContrastUndoPair = getCurrentContrastPair();
  }

  dom.contrastText.value = normalizedText;
  dom.contrastTextHex.value = normalizedText.toUpperCase();
  dom.contrastBg.value = normalizedBackground;
  dom.contrastBgHex.value = normalizedBackground.toUpperCase();
  state.lastAppliedContrastSuggestion = null;
  clearContrastValidation();
  persistUserSettings();
  updateContrastUndoButtonState();

  return true;
}

function syncHexWithPicker(picker, hexInput, label) {
  picker.addEventListener('input', (event) => {
    hexInput.value = event.target.value.toUpperCase();
    state.lastAppliedContrastSuggestion = null;
    clearContrastUndoState();
    persistUserSettings();
    clearContrastValidation();
    queueContrastAutoRecheck();
  });

  hexInput.addEventListener('input', () => {
    const raw = hexInput.value.trim();
    if (!raw) {
      state.lastAppliedContrastSuggestion = null;
      clearContrastUndoState();
      clearContrastValidation();
      return;
    }

    const normalized = normalizeHexInput(raw);
    if (normalized) {
      hexInput.value = normalized.toUpperCase();
      picker.value = normalized;
      state.lastAppliedContrastSuggestion = null;
      clearContrastUndoState();
      clearContrastValidation();
      persistUserSettings();
      queueContrastAutoRecheck();
      return;
    }

    clearContrastUndoState();
    setContrastValidation(
      `${label} color must be a valid hex, rgb/rgba, hsl/hsla, or CSS color name.`,
    );
  });
}

function resolveContrastInputs() {
  const textHex = normalizeHexInput(dom.contrastTextHex.value);
  const bgHex = normalizeHexInput(dom.contrastBgHex.value);

  if (!textHex || !bgHex) {
    throw new Error('Color inputs must be valid hex, rgb/rgba, hsl/hsla, or CSS color name values.');
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

async function renderMode(mode, sourceSize, renderSession) {
  if (!isRenderSessionActive(renderSession)) {
    return null;
  }

  const card = dom.simGrid.querySelector(`[data-mode="${mode.id}"]`);
  if (!card) {
    return null;
  }

  const canvas = card.querySelector('.sim-canvas');
  const heatmapCanvas = card.querySelector('.sim-heatmap');
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
  heatmapCanvas.width = sourceSize.width;
  heatmapCanvas.height = sourceSize.height;
  heatmapCanvas.hidden = true;
  canvas.hidden = false;
  const hotspotBtn = card.querySelector('.sim-hotspot-btn');
  hotspotBtn.setAttribute('aria-pressed', 'false');
  hotspotBtn.textContent = 'Show hotspots';
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
    if (!isRenderSessionActive(renderSession)) {
      throw new Error('Render canceled.');
    }

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
      ctx.putImageData(filteredData, 0, 0);
      impactPercent = calculateImpactPercent(state.sourceImageData?.data, filteredData.data);
      ctx.filter = 'none';
    } else if (mode.kind === 'fieldloss') {
      ctx.filter = mode.filter || 'none';
      ctx.drawImage(state.sourceImage, 0, 0, sourceSize.width, sourceSize.height);
      ctx.filter = 'none';
      const fieldData = ctx.getImageData(0, 0, sourceSize.width, sourceSize.height);
      applyFieldLossMask(fieldData.data, sourceSize.width, sourceSize.height, mode.fieldLoss);
      applySimulationIntensity(state.sourceImageData?.data, fieldData.data, simulationSeverity);
      ctx.putImageData(fieldData, 0, 0);
      impactPercent = calculateImpactPercent(state.sourceImageData?.data, fieldData.data);
    } else {
      throw new Error('Unknown simulation mode type.');
    }

    impactLevel = getImpactLevel(impactPercent);
    const renderedData = ctx.getImageData(0, 0, sourceSize.width, sourceSize.height);
    const heatmap = createVisualDifferenceHeatmap(
      state.sourceImageData.data,
      renderedData.data,
      sourceSize.width,
      sourceSize.height,
    );
    heatmapCanvas.getContext('2d').putImageData(new ImageData(heatmap.data, heatmap.width, heatmap.height), 0, 0);
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
    if (!isRenderSessionActive(renderSession) && error.message === 'Render canceled.') {
      status.textContent = 'Canceled';
      status.className = 'sim-status';
    } else {
      status.textContent = error.message || 'Render failed';
      status.className = 'sim-status error';
      card.classList.add('is-error');
    }
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
  const renderSession = startRenderSession();
  if (!state.sourceImage) {
    setMessage('Upload or load a sample image first.', 'error');
    return;
  }
  if (state.isRendering) {
    if (cancelRenderSession()) {
      setMessage('Render canceled.', 'info');
    }
    return;
  }

  state.isRendering = true;
  state.hasRenderedSource = false;
  state.modeImpacts = [];
  state.lastReelExport = null;
  state.showTopImpactOnly = false;
  hideShareQrCard();
  const totalModes = allModes.length;
  clearColorPicker();
  markSimulationCardsPending();
  applyTopImpactFilter();
  setSimPlaceholderVisible(false);
  setRenderProgress(0, totalModes, 'Starting simulation render');

  setControlState(true);
  setImageControlsEnabled(false);
  dom.processBtn.textContent = 'Cancel render';
  dom.processBtn.setAttribute('aria-label', 'Cancel simulation render');
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
      if (!isRenderSessionActive(renderSession)) {
        throw new Error('Render canceled.');
      }
      const mode = allModes[modeIndex];
      setRenderProgress(modeIndex + 1, totalModes, `Rendering ${mode.label}`);
      await yieldToNextAnimationFrame();
      // eslint-disable-next-line no-await-in-loop
      const result = await renderMode(mode, sourceSize, renderSession);
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
    renderPaletteAudit();
    renderTextScan();
    queueContrastAutoRecheck(0);
    updateWorkflowChecklist();
  } catch (error) {
    setRenderProgress(0, 0);
    if (error.message === 'Render canceled.') {
      setMessage('Render canceled.', 'info');
    } else {
      setMessage(error.message || 'Failed to complete rendering.', 'error');
    }
  } finally {
    const wasCanceled = renderSession !== activeRenderSession;
    dom.processBtn.textContent = 'Render simulations';
    dom.processBtn.setAttribute('aria-label', 'Render simulations');
    state.isRendering = false;
    const shouldRerenderSeverity = state.pendingSeverityRerender;
    state.pendingSeverityRerender = false;
    setImageControlsEnabled(Boolean(state.sourceImage));
    applyTopImpactFilter();
    syncGlobalCompare(dom.globalCompareSlider?.value || COMPARE_DEFAULT_PERCENT);
    updateWorkflowChecklist();
    if (!state.modeImpacts.length) {
      setImpactSummary([]);
    }
    if (wasCanceled) {
      state.modeImpacts.forEach((entry) => {
        const status = dom.simGrid.querySelector(`[data-mode="${entry.modeId}"] .sim-status`);
        if (status) {
          status.textContent = 'Canceled';
          status.className = 'sim-status';
        }
      });
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
    estimatedBytes: estimateCanvasBytes(dom.sourceCanvas),
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
        estimatedBytes: estimateCanvasBytes(canvas),
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

function splitLinesToWidth(ctx, text, maxWidth) {
  const words = String(text || '').split(' ');
  const lines = [];
  let current = '';

  words.forEach((word) => {
    if (!word) {
      return;
    }

    const candidate = current ? `${current} ${word}` : word;
    const width = ctx.measureText(candidate).width;

    if (width <= maxWidth || !current) {
      current = candidate;
      return;
    }

    lines.push(current);
    current = word;
  });

  if (current) {
    lines.push(current);
  }

  return lines;
}

function buildContrastSnapshotCanvas({ title, lines = [] }) {
  const canvas = document.createElement('canvas');
  const outputWidth = 1500;
  const outputHeight = 760;
  const margin = 42;
  const maxLineWidth = outputWidth - margin * 2;
  const titleFont = '700 40px Poppins, "Segoe UI", system-ui, -apple-system, sans-serif';
  const bodyFont = '500 31px Poppins, "Segoe UI", system-ui, -apple-system, sans-serif';

  canvas.width = outputWidth;
  canvas.height = outputHeight;

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Unable to generate contrast snapshot image in this browser.');
  }

  const sourceLines = (Array.isArray(lines) ? lines : []).map((line) => String(line || '').trim()).filter(Boolean);
  const wrappedLines = [];

  ctx.fillStyle = '#f8fafc';
  ctx.fillRect(0, 0, outputWidth, outputHeight);

  ctx.font = titleFont;
  ctx.fillStyle = '#0f172a';
  ctx.fillText(title || 'ClearSight snapshot', margin, 78);

  ctx.font = bodyFont;
  const lineHeight = 44;
  let y = 140;

  sourceLines.forEach((line) => {
    const wrapped = splitLinesToWidth(ctx, line, maxLineWidth);
    wrapped.forEach((wrappedLine) => {
      if (y + 30 > outputHeight) {
        return;
      }
      wrappedLines.push(wrappedLine);
      ctx.fillText(wrappedLine, margin, y);
      y += lineHeight;
    });
  });

  if (!wrappedLines.length) {
    ctx.fillText('No contrast data recorded yet.', margin, y);
  }

  const footer = new Date().toISOString();
  ctx.font = '500 20px Poppins, "Segoe UI", system-ui, -apple-system, sans-serif';
  ctx.fillStyle = '#64748b';
  ctx.fillText(`Generated: ${footer}`, margin, outputHeight - 28);

  return canvas;
}

function buildChecklistScreenshotEntries() {
  const entries = [];
  const missing = [];
  const cards = new Map(
    [...dom.simGrid.querySelectorAll('.sim-card')]
      .map((card) => [card.dataset.mode, card])
      .filter(([modeId, card]) => Boolean(modeId) && Boolean(card)),
  );

  if (dom.sourceCanvas && dom.sourceCanvas.width && dom.sourceCanvas.height) {
    entries.push({ filename: SCREENSHOT_CHECKLIST_SOURCE_FILE, canvas: dom.sourceCanvas, label: 'Source' });
  }

  SCREENSHOT_CHECKLIST_SIMULATIONS.forEach((target) => {
    const card = cards.get(target.id);
    const canvas = card?.querySelector('.sim-canvas');
    const isDone = card?.classList.contains('is-done');
    if (!card || !isDone || !canvas || !canvas.width || !canvas.height) {
      missing.push(target.id);
      return;
    }

    entries.push({
      filename: target.filename,
      canvas,
      label: target.id,
    });
  });

  let hasContrastInitial = false;
  let hasContrastSuggestion = false;

  const resultText = buildContrastResultText(state.lastContrastResult);
  if (resultText) {
    const lines = resultText.split('\n');
    entries.push({
      filename: SCREENSHOT_CHECKLIST_CONTRAST_INITIAL_FILE,
      label: 'contrast-checker-initial',
      canvas: buildContrastSnapshotCanvas({
        title: 'Contrast Checker Initial Snapshot',
        lines,
      }),
    });
    hasContrastInitial = true;
  }

  if (state.lastAppliedContrastSuggestion) {
    const suggestion = state.lastAppliedContrastSuggestion;
    const suggestionLines = [
      `Applied pair: text ${suggestion.text?.toUpperCase()} on ${suggestion.background?.toUpperCase()}`,
      `Pair ratio: ${Number(suggestion.ratio).toFixed(2)}:1`,
      `Source size: ${state.renderSize.width || 0}×${state.renderSize.height || 0}px`,
    ];
    entries.push({
      filename: SCREENSHOT_CHECKLIST_CONTRAST_SUGGESTION_FILE,
      label: 'contrast-suggestion-applied',
      canvas: buildContrastSnapshotCanvas({
        title: 'Contrast Suggestion Applied',
        lines: suggestionLines,
      }),
    });
    hasContrastSuggestion = true;
  }

  return {
    entries,
    missing,
    hasContrastInitial,
    hasContrastSuggestion,
  };
}

function buildSubmissionChecklistScreenshotEntries() {
  const checklist = buildChecklistScreenshotEntries();
  if (!checklist.entries.length) {
    return {
      entries: [],
      missing: checklist.missing || [],
      hasContrastInitial: Boolean(checklist.hasContrastInitial),
      hasContrastSuggestion: Boolean(checklist.hasContrastSuggestion),
    };
  }

  return {
    entries: checklist.entries.map((entry) => ({
      ...entry,
      id: `checklist-${entry.filename.replace(/\.[^/.]+$/, '')}`,
      impactPercent: null,
      impactLevel: 'neutral',
      kind: 'Checklist screenshot',
      useCanonicalFilename: true,
      estimatedBytes: estimateCanvasBytes(entry.canvas),
    })),
    missing: checklist.missing || [],
    hasContrastInitial: Boolean(checklist.hasContrastInitial),
    hasContrastSuggestion: Boolean(checklist.hasContrastSuggestion),
  };
}

function downloadChecklistScreenshots() {
  if (state.isRendering) {
    setMessage('Please wait for rendering to finish before generating checklist screenshots.', 'info');
    return;
  }

  if (!state.hasRenderedSource) {
    setMessage('Render the source and simulations first before exporting checklist screenshots.', 'error');
    return;
  }

  const {
    entries,
    missing,
    hasContrastInitial,
    hasContrastSuggestion,
  } = buildChecklistScreenshotEntries();

  if (!entries.length) {
    setMessage('Run contrast checks and render simulations before exporting checklist screenshots.', 'error');
    return;
  }

  try {
    entries.forEach((entry) => {
      downloadCanvasAsImage(entry.canvas, entry.filename);
    });

    const notes = [];
    if (missing.length) {
      notes.push(`Missing completed simulation snapshots: ${missing.join(', ')}`);
    }
    if (!hasContrastInitial) {
      notes.push('contrast-checker-initial.png requires running contrast check first.');
    }
    if (!hasContrastSuggestion) {
      notes.push('contrast-suggestion-applied.png requires applying a suggestion pair.');
    }

    if (notes.length) {
      setMessage(`Exported ${entries.length} checklist screenshot(s). ${notes.join(' ')}`, 'info');
      return;
    }

    setMessage(
      `Exported full Devpost checklist screenshot set (${entries.length} files).`,
      'success',
    );
  } catch (error) {
    setMessage(error.message, 'error');
  }
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

function pickVisionReelMimeType() {
  if (typeof MediaRecorder === 'undefined' || typeof MediaRecorder.isTypeSupported !== 'function') {
    return null;
  }
  return VISION_REEL_MIME_CANDIDATES.find((type) => MediaRecorder.isTypeSupported(type)) || null;
}

function buildVisionReelFrames(entries) {
  const base = entries[0]?.canvas;
  const baseWidth = Number(base?.width) || 0;
  const baseHeight = Number(base?.height) || 0;
  if (!baseWidth || !baseHeight) {
    throw new Error('Render simulations before recording a vision reel.');
  }

  const scale = Math.min(1, VISION_REEL_MAX_WIDTH / baseWidth);
  // Video encoders expect even dimensions.
  const frameWidth = Math.max(2, Math.round((baseWidth * scale) / 2) * 2);
  const imageHeight = Math.max(2, Math.round((baseHeight * scale) / 2) * 2);
  const frameHeight = imageHeight + VISION_REEL_LABEL_HEIGHT;

  return entries.map((entry, index) => {
    const frame = document.createElement('canvas');
    frame.width = frameWidth;
    frame.height = frameHeight;
    const ctx = frame.getContext('2d');
    if (!ctx) {
      throw new Error('Unable to compose vision reel frames in this browser.');
    }

    ctx.fillStyle = '#0b1220';
    ctx.fillRect(0, 0, frameWidth, frameHeight);
    const fit = Math.min(frameWidth / entry.canvas.width, imageHeight / entry.canvas.height);
    const drawWidth = Math.round(entry.canvas.width * fit);
    const drawHeight = Math.round(entry.canvas.height * fit);
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(
      entry.canvas,
      Math.round((frameWidth - drawWidth) / 2),
      Math.round((imageHeight - drawHeight) / 2),
      drawWidth,
      drawHeight,
    );

    const labelTop = imageHeight;
    ctx.fillStyle = '#111c33';
    ctx.fillRect(0, labelTop, frameWidth, VISION_REEL_LABEL_HEIGHT);
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'left';
    ctx.fillStyle = '#f8fafc';
    ctx.font = '600 26px Poppins, "Segoe UI", system-ui, -apple-system, sans-serif';
    const title = entry.id === 'source' ? 'Original vision' : entry.label;
    ctx.fillText(title, 24, labelTop + VISION_REEL_LABEL_HEIGHT / 2 - 14, frameWidth * 0.62);
    ctx.fillStyle = '#93a4c3';
    ctx.font = '500 19px Poppins, "Segoe UI", system-ui, -apple-system, sans-serif';
    const impactText = Number.isFinite(entry.impactPercent)
      ? `${entry.impactPercent.toFixed(1)}% of pixels shift in this mode`
      : 'Reference view — no simulation applied';
    ctx.fillText(impactText, 24, labelTop + VISION_REEL_LABEL_HEIGHT / 2 + 16, frameWidth * 0.62);
    ctx.textAlign = 'right';
    ctx.fillStyle = '#dbe5f5';
    ctx.font = '600 20px Poppins, "Segoe UI", system-ui, -apple-system, sans-serif';
    ctx.fillText(
      `${index + 1} / ${entries.length} · ClearSight`,
      frameWidth - 24,
      labelTop + VISION_REEL_LABEL_HEIGHT / 2,
      frameWidth * 0.34,
    );
    ctx.textAlign = 'left';
    return frame;
  });
}

async function exportVisionReel({ segmentMs = VISION_REEL_SEGMENT_MS, download = true } = {}) {
  if (isRecordingVisionReel) {
    setMessage('Vision reel recording is already in progress.', 'info');
    return null;
  }
  if (state.isRendering) {
    setMessage('Please wait for rendering to finish before recording the vision reel.', 'info');
    return null;
  }
  if (!state.hasRenderedSource) {
    setMessage('Render the source and simulations first before recording a vision reel.', 'error');
    return null;
  }

  const entries = orderVisionReelSegments(collectCompletedExportCards());
  if (entries.length < 2) {
    setMessage('Render at least one simulation before recording a vision reel.', 'error');
    return null;
  }

  const mimeType = pickVisionReelMimeType();
  const canCaptureCanvas =
    typeof HTMLCanvasElement !== 'undefined' &&
    typeof HTMLCanvasElement.prototype.captureStream === 'function';
  if (!mimeType || !canCaptureCanvas) {
    setMessage(
      'This browser cannot record canvas video — use the contact sheet or checklist screenshots instead.',
      'error',
    );
    return null;
  }

  let frames;
  try {
    frames = buildVisionReelFrames(entries);
  } catch (error) {
    setMessage(error.message, 'error');
    return null;
  }

  const holdMs = Math.max(VISION_REEL_MIN_SEGMENT_MS, Number(segmentMs) || VISION_REEL_SEGMENT_MS);
  const totalMs = holdMs * frames.length;
  const reelButton = dom.downloadReelBtn;
  const originalLabel = reelButton?.textContent || '';

  isRecordingVisionReel = true;
  if (reelButton) {
    reelButton.disabled = true;
  }

  const stage = document.createElement('canvas');
  stage.width = frames[0].width;
  stage.height = frames[0].height;
  const stageCtx = stage.getContext('2d');
  const stream = stage.captureStream(VISION_REEL_FPS);
  const recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 6_000_000 });
  const chunks = [];
  recorder.ondataavailable = (event) => {
    if (event.data && event.data.size) {
      chunks.push(event.data);
    }
  };

  try {
    const blob = await new Promise((resolvePromise, rejectPromise) => {
      // If the tab is hidden and animation frames stall, force completion.
      const failSafe = setTimeout(() => {
        if (recorder.state !== 'inactive') {
          recorder.stop();
        }
      }, totalMs + 3000);
      recorder.onerror = (event) => {
        clearTimeout(failSafe);
        rejectPromise(event.error || new Error('Vision reel recording failed.'));
      };
      recorder.onstop = () => {
        clearTimeout(failSafe);
        resolvePromise(new Blob(chunks, { type: mimeType.split(';')[0] }));
      };
      recorder.start(Math.max(250, holdMs));

      const startedAt = performance.now();
      let lastSegment = -1;
      const paint = () => {
        if (recorder.state === 'inactive') {
          return;
        }
        const elapsed = performance.now() - startedAt;
        if (elapsed >= totalMs) {
          recorder.stop();
          return;
        }
        const segmentIndex = Math.min(frames.length - 1, Math.floor(elapsed / holdMs));
        stageCtx.drawImage(frames[segmentIndex], 0, 0);
        // Animated progress strip keeps every captured frame unique.
        stageCtx.fillStyle = '#38bdf8';
        stageCtx.fillRect(0, stage.height - 6, Math.round((elapsed / totalMs) * stage.width), 6);
        if (segmentIndex !== lastSegment) {
          lastSegment = segmentIndex;
          if (reelButton) {
            reelButton.textContent = `Recording reel ${segmentIndex + 1}/${frames.length}…`;
          }
        }
        requestAnimationFrame(paint);
      };
      requestAnimationFrame(paint);
    });

    if (!blob.size) {
      throw new Error('Vision reel recording produced no video data in this browser.');
    }

    const extension = /mp4/.test(mimeType) ? 'mp4' : 'webm';
    const filename = makeExportFileName('vision-reel', extension);
    const bytes = new Uint8Array(await blob.arrayBuffer());
    state.lastReelExport = {
      filename,
      mimeType: blob.type || mimeType,
      bytes,
      segments: frames.length,
      durationMs: totalMs,
    };
    if (download) {
      downloadBlob(blob, filename);
    }
    setMessage(
      `${download ? 'Exported' : 'Recorded'} vision reel: ${frames.length} views over ${(totalMs / 1000).toFixed(1)}s (${formatBytes(blob.size)}). The reel is now bundled into the submission package.`,
      'success',
    );
    return {
      filename,
      size: blob.size,
      mimeType: state.lastReelExport.mimeType,
      segments: frames.length,
      durationMs: totalMs,
    };
  } catch (error) {
    setMessage(error.message || 'Vision reel recording failed.', 'error');
    return null;
  } finally {
    stream.getTracks().forEach((track) => track.stop());
    isRecordingVisionReel = false;
    if (reelButton) {
      reelButton.textContent = originalLabel;
      reelButton.disabled = !state.hasRenderedSource;
    }
  }
}

async function buildSubmissionPackageZipEntries(packageArtifacts) {
  if (!packageArtifacts) {
    return null;
  }

  const {
    entries,
    packageFiles,
    contactSheetFileName,
    reportFileName,
    summaryFileName,
    manifestFileName,
    handoffPacketFileName,
    handoffPacketJsonFileName,
    report,
  } = packageArtifacts;

  if (!entries?.length) {
    return null;
  }

  const builtContactSheet = buildContactSheet(entries);
  const reportText = JSON.stringify(report || buildAccessibilityReport(), null, 2);
  const summaryText = buildJudgeSummaryMarkdown();
  const csvText = buildAccessibilityReportCsv();
  const cssFixSheet = buildCssFixSheetPayload();
  const conformanceSummary = buildConformanceSummaryPayload();
  const verdictCardBytes = await canvasToBytes(buildAuditVerdictCardCanvas(), 'audit-verdict-card');
  const repairProofBytes = state.scoreRepairBaseline && state.imageRepairUndo
    ? await canvasToBytes(buildRepairProofCardCanvas(), 'repair-proof-card')
    : null;
  const manifest = buildSubmissionPackageManifest({
    report: report || buildAccessibilityReport(),
    packageFiles,
    manifestFileName,
    contactSheetFileName,
    reportFileName,
    summaryFileName,
    handoffPacketFileName,
    handoffPacketJsonFileName,
    auditPdfFileName: packageArtifacts.auditPdfFileName,
    verdictCardFileName: packageArtifacts.verdictCardFileName,
    repairProofFileName: repairProofBytes ? packageArtifacts.repairProofFileName : null,
    cssFixFileName: cssFixSheet ? packageArtifacts.cssFixFileName : null,
    conformanceFileName: conformanceSummary ? packageArtifacts.conformanceFileName : null,
  });
  const handoffPacket = buildHandoffPacketText(report || buildAccessibilityReport(), manifest, csvText);
  const handoffJsonPayload = buildHandoffPacketJsonPayload();

  if (!handoffJsonPayload) {
    throw new Error('Unable to generate accessibility handoff packet JSON payload.');
  }

  const zipEntries = [];

  for (const entry of packageFiles) {
    let bytes;
    if (entry.content) {
      bytes = textToBytes(entry.content);
    } else if (entry.bytes instanceof Uint8Array) {
      bytes = entry.bytes;
    } else if (entry.canvas) {
      bytes = await canvasToBytes(entry.canvas, entry.label || entry.id || 'image');
    } else {
      continue;
    }

    zipEntries.push({
      filename: entry.filename,
      bytes,
    });
  }
  const contactSheetBytes = await canvasToBytes(builtContactSheet, 'submission-contact-sheet');
  const payloadEntries = {
    packageFiles: [
      ...zipEntries,
      {
        filename:
          contactSheetFileName ||
          `${getSafeFileName(state.sourceName || 'clearsight-source')}-submission-contact-sheet.png`,
        bytes: contactSheetBytes,
      },
      { filename: reportFileName || 'submission-report.json', content: reportText },
      { filename: summaryFileName || 'judge-summary.md', content: summaryText },
      { filename: manifestFileName || 'submission-manifest.txt', content: manifest },
      {
        filename: handoffPacketFileName || 'accessibility-handoff-packet.md',
        content: handoffPacket,
      },
      {
        filename: handoffJsonPayload
          ? handoffPacketJsonFileName || 'accessibility-handoff-packet.json'
          : 'accessibility-handoff-packet.json',
        content: `${JSON.stringify(handoffJsonPayload, null, 2)}\n`,
      },
      {
        filename: packageArtifacts.auditPdfFileName || 'clearsight-audit-report.pdf',
        bytes: buildAuditPdfBytes(),
      },
      {
        filename: packageArtifacts.verdictCardFileName || 'clearsight-audit-verdict-card.png',
        bytes: verdictCardBytes,
      },
      ...(repairProofBytes
        ? [{ filename: packageArtifacts.repairProofFileName || 'clearsight-repair-proof-card.png', bytes: repairProofBytes }]
        : []),
      ...(cssFixSheet
        ? [{ filename: packageArtifacts.cssFixFileName || 'clearsight-fixes.css', content: cssFixSheet.css }]
        : []),
      ...(conformanceSummary
        ? [{
            filename: packageArtifacts.conformanceFileName || 'clearsight-conformance-summary.md',
            content: conformanceSummary.markdown,
          }]
        : []),
    ],
  };

  const totalExportBytes = payloadEntries.packageFiles.reduce((sum, fileEntry) => {
    if (fileEntry.content && typeof fileEntry.content === 'string') {
      return sum + estimateTextBytes(fileEntry.content);
    }
    return sum + (fileEntry.bytes?.length || 0);
  }, 0);

  const withSize = [...payloadEntries.packageFiles].map((entry) => {
    if (entry.bytes instanceof Uint8Array) {
      return { ...entry, estimatedBytes: entry.bytes.length };
    }
    return entry;
  });
  return {
    packageFiles: withSize,
    estimatedPackageBytes: totalExportBytes,
  };
}

async function downloadSubmissionPackage() {
  if (state.isRendering) {
    setMessage('Please wait for rendering to finish before generating the submission package.', 'info');
    return;
  }
  if (!state.hasRenderedSource) {
    setMessage('Render the source and simulations first before downloading a package.', 'error');
    return;
  }

  const packageArtifacts = buildSubmissionPackageArtifacts();

  if (!packageArtifacts) {
    setMessage('Render the source and simulations first before downloading a package.', 'error');
    return;
  }

  const {
    entries,
    simulationEntries,
    checklistArtifacts,
  } = packageArtifacts;

  if (simulationEntries.length < 1) {
    setMessage('Render at least one simulation before creating a submission package.', 'error');
    return;
  }

  try {
    const missingChecklistWarnings = [];
    if ((checklistArtifacts.missing || []).length) {
      missingChecklistWarnings.push(`Missing checklist simulations: ${checklistArtifacts.missing.join(', ')}`);
    }
    if (!checklistArtifacts.hasContrastInitial) {
      missingChecklistWarnings.push('Contrast snapshot image requires a contrast check first.');
    }
    if (!checklistArtifacts.hasContrastSuggestion) {
      missingChecklistWarnings.push('Contrast-suggestion snapshot requires applying at least one suggestion pair first.');
    }

    const zipPayload = await buildSubmissionPackageZipEntries(packageArtifacts);
    if (!zipPayload) {
      throw new Error('Submission package artifacts are incomplete.');
    }
    const packageZipBlob = buildSubmissionPackageZip(zipPayload.packageFiles);
    const packageZipFileName = packageArtifacts.packageZipFileName || SUBMISSION_PACKAGE_ZIP_NAME;
    const estimatedSize =
      zipPayload.estimatedPackageBytes > 0
        ? ` Estimated image payload: ${formatBytes(zipPayload.estimatedPackageBytes)}.`
        : '';
    downloadBlob(packageZipBlob, packageZipFileName);

    setMessage(
      `Submission package exported as ${packageArtifacts.packageZipFileName || SUBMISSION_PACKAGE_ZIP_NAME}: ${entries.length} core visuals, ${checklistArtifacts.entries.length} checklist screenshots, contact sheet, reports, manifest, and handoff packets.${estimatedSize}`,
      'success',
    );
    if (missingChecklistWarnings.length) {
      setMessage(`Note: ${missingChecklistWarnings.join(' ')}`, 'info');
    }
  } catch (error) {
    setMessage(error.message, 'error');
  }
}

function buildSubmissionPackageArtifacts() {
  if (!state.hasRenderedSource) {
    return null;
  }

  const entries = collectCompletedExportCards();
  if (!entries.length) {
    return {
      entries,
      simulationEntries: [],
      packageFiles: [],
      report: buildAccessibilityReport(),
      checklistArtifacts: {
        entries: [],
        missing: ['source', 'simulations'],
        hasContrastInitial: false,
        hasContrastSuggestion: false,
      },
      safeBase: getSafeFileName(state.sourceName || 'clearsight-source'),
      contactSheetFileName: null,
      reportFileName: null,
      summaryFileName: null,
      handoffPacketFileName: null,
      handoffPacketJsonFileName: null,
      auditPdfFileName: null,
      verdictCardFileName: null,
      repairProofFileName: null,
      conformanceFileName: null,
      packageZipFileName: null,
      manifestFileName: null,
    };
  }

  const simulationEntries = entries.filter((entry) => entry.id !== 'source');
  const safeBase = getSafeFileName(state.sourceName || 'clearsight-source');
  const checklistArtifacts = buildSubmissionChecklistScreenshotEntries();
  const suggestionEntries = buildContrastSuggestionPackageEntries();
  const textScanEntries = state.textScan?.regions?.length
    ? [{
        id: 'text-contrast-scan',
        label: 'Annotated text contrast scan',
        canvas: buildAnnotatedTextScanCanvas(),
        filename: `${safeBase}-text-contrast-scan.png`,
      }]
    : [];
  const focusSequenceEntries = state.focusSequence?.result?.stops?.length && dom.focusSequenceOverlay?.width
    ? [{
        id: 'focus-order-map',
        label: 'Annotated keyboard focus order map',
        kind: 'WCAG 2.4.7 / 2.4.13 focus-order evidence',
        canvas: dom.focusSequenceOverlay,
        filename: `${safeBase}-focus-order-map.png`,
      }]
    : [];
  const reelEntries = state.lastReelExport?.bytes?.length
    ? [{
        id: 'vision-reel',
        label: 'Vision reel video (all rendered views)',
        kind: 'Vision reel video',
        bytes: state.lastReelExport.bytes,
        filename: state.lastReelExport.filename || `${safeBase}-vision-reel.webm`,
        estimatedBytes: state.lastReelExport.bytes.length,
      }]
    : [];
  const packageEntries = entries
    .concat(checklistArtifacts.entries)
    .concat(suggestionEntries)
    .concat(textScanEntries)
    .concat(focusSequenceEntries)
    .concat(reelEntries);

  return {
    entries,
    simulationEntries,
    safeBase,
    checklistArtifacts,
    packageFiles: packageEntries.map((entry) => ({
      ...entry,
      filename: entry.filename || `${safeBase}-${entry.id}.png`,
      estimatedBytes: Number(entry.estimatedBytes) || 0,
    })),
    report: buildAccessibilityReport(),
    contactSheetFileName: `${safeBase}-submission-contact-sheet.png`,
    reportFileName: `${safeBase}-submission-report.json`,
    summaryFileName: `${safeBase}-judge-summary.md`,
    handoffPacketFileName: `${safeBase}-handoff-packet.md`,
    handoffPacketJsonFileName: `${safeBase}-handoff-packet.json`,
    auditPdfFileName: `${safeBase}-audit-report.pdf`,
    verdictCardFileName: `${safeBase}-audit-verdict-card.png`,
    repairProofFileName: `${safeBase}-repair-proof-card.png`,
    cssFixFileName: `${safeBase}-fixes.css`,
    conformanceFileName: `${safeBase}-conformance-summary.md`,
    manifestFileName: `${safeBase}-submission-manifest.txt`,
    packageZipFileName: `${safeBase}-submission-package.zip`,
  };
}

function getSubmissionManifestPayload() {
  const packageArtifacts = buildSubmissionPackageArtifacts();
  if (!packageArtifacts || !packageArtifacts.entries.length || !packageArtifacts.simulationEntries.length) {
    return null;
  }

  const payload = buildSubmissionPackageManifest({
    report: packageArtifacts.report,
    packageFiles: packageArtifacts.packageFiles,
    manifestFileName: packageArtifacts.manifestFileName,
    contactSheetFileName: packageArtifacts.contactSheetFileName,
    reportFileName: packageArtifacts.reportFileName,
    summaryFileName: packageArtifacts.summaryFileName,
    handoffPacketFileName: packageArtifacts.handoffPacketFileName,
    handoffPacketJsonFileName: packageArtifacts.handoffPacketJsonFileName,
    auditPdfFileName: packageArtifacts.auditPdfFileName,
    verdictCardFileName: packageArtifacts.verdictCardFileName,
    repairProofFileName: state.scoreRepairBaseline && state.imageRepairUndo
      ? packageArtifacts.repairProofFileName
      : null,
    cssFixFileName: hasCssFixCandidates() ? packageArtifacts.cssFixFileName : null,
    conformanceFileName: packageArtifacts.conformanceFileName,
  });

  return {
    payload,
    filename: packageArtifacts.manifestFileName || 'submission-manifest.txt',
  };
}

async function copySubmissionManifest() {
  if (state.isRendering) {
    setDemoCopyStatus('Finish rendering before copying the submission manifest.');
    return;
  }

  const manifestPayload = getSubmissionManifestPayload();
  if (!manifestPayload) {
    setDemoCopyStatus('Render an image and simulations before copying the manifest.');
    return;
  }

  await copyTextWithFallback({
    payload: manifestPayload.payload,
    filename: manifestPayload.filename,
    mimeType: 'text/plain;charset=utf-8',
    copiedMessage: 'Submission manifest copied to clipboard.',
    downloadMessage: 'Clipboard unavailable, submission manifest downloaded for manual copy.',
    statusReporter: (message, type) => setDemoCopyStatus(message),
  });
}

function downloadSubmissionManifest() {
  if (state.isRendering) {
    setDemoCopyStatus('Finish rendering before downloading the submission manifest.');
    return;
  }

  const manifestPayload = getSubmissionManifestPayload();
  if (!manifestPayload) {
    setDemoCopyStatus('Render an image and simulations before downloading the manifest.');
    return;
  }

  downloadTextFile(manifestPayload.payload, manifestPayload.filename, 'text/plain;charset=utf-8');
  setDemoCopyStatus(`Submission manifest downloaded as ${manifestPayload.filename}.`);
}

function buildSubmissionPackageManifest({
  report,
  packageFiles = [],
  manifestFileName,
  contactSheetFileName,
  reportFileName,
  summaryFileName,
  handoffPacketFileName,
  handoffPacketJsonFileName,
  auditPdfFileName,
  verdictCardFileName,
  repairProofFileName = null,
  cssFixFileName = null,
  conformanceFileName = null,
}) {
  const rows = [];
  const resolvedReport = report || buildAccessibilityReport();
  const sourceFileName = resolvedReport.source.fileName || 'Untitled source image';
  const renderedWidth = resolvedReport.source.renderedSize.width || 0;
  const renderedHeight = resolvedReport.source.renderedSize.height || 0;
  const sourceOriginalWidth = resolvedReport.source.originalSize?.width;
  const sourceOriginalHeight = resolvedReport.source.originalSize?.height;
  const downscaleRatio =
    sourceOriginalWidth && resolvedReport.source.wasDownscaled
      ? `${Math.round((renderedWidth / sourceOriginalWidth) * 100)}%`
      : 'not downsized';
  let totalEstimatedBytes = 0;

  rows.push('# ClearSight Submission Package Manifest');
  rows.push(`Generated: ${resolvedReport.generatedAt}`);
  rows.push(`Source image: ${sourceFileName}`);
  rows.push(`Rendered size: ${renderedWidth}×${renderedHeight}px`);
  rows.push(
    `Original size: ${sourceOriginalWidth ? `${sourceOriginalWidth}×${sourceOriginalHeight}px` : 'Not recorded'}`,
  );
  rows.push(`Downscaled for render: ${resolvedReport.source.wasDownscaled ? 'yes' : 'no'} (${downscaleRatio})`);
  rows.push(`Simulation intensity: ${resolvedReport.simulationIntensity}%`);
  rows.push(`Overall accessibility risk: ${resolvedReport.accessibilityHealth?.label || ACCESSIBILITY_RISK_LABELS.neutral}`);
  const resolvedRemediationActions =
    resolvedReport.remediationActions ||
    buildRemediationActions({
      topImpactMode: resolvedReport.topImpactMode || null,
      contrastState: resolvedReport.contrast?.lastChecked || null,
      suggestionCount: resolvedReport.suggestions?.length || 0,
      textScan: resolvedReport.textScan || null,
      paletteCollisions: resolvedReport.paletteCollisions || null,
      flashScan: resolvedReport.flashScan || null,
    });
  if (resolvedRemediationActions.length) {
    rows.push('Top remediation actions:');
    resolvedRemediationActions.forEach((action, index) => {
      rows.push(
        `- ${index + 1}. [${action.priorityLabel || REMEDIATION_PRIORITY[action.priority] || REMEDIATION_PRIORITY.info}] ${action.text}`,
      );
    });
  }
  rows.push('');

  rows.push('Files included:');
  packageFiles
    .filter((entry) => entry?.filename)
    .forEach((entry, index) => {
      const kind = entry.kind
        ? entry.kind
        : entry.id === 'source'
          ? 'Source preview'
          : `Mode simulation ${index}`;
      const label = entry.label || entry.id;
      const impact =
        typeof entry.impactPercent === 'number'
          ? `${entry.impactPercent.toFixed(1)}% pixel change`
          : 'Impact unavailable';
      const estimatedBytes = Number(entry.estimatedBytes) || 0;
      if (estimatedBytes > 0) {
        totalEstimatedBytes += estimatedBytes;
      }
      const sizeLabel = estimatedBytes > 0 ? ` [est. raw bytes: ${formatBytes(estimatedBytes)}]` : '';
      rows.push(`- ${entry.filename} | ${kind}: ${label} (${impact})${sizeLabel}`);
    });

  rows.push(`- ${manifestFileName || 'submission-manifest.txt'} | Export manifest`);
  rows.push(`- ${contactSheetFileName || 'submission-contact-sheet.png'} | Ranked contact sheet`);
  rows.push(`- ${reportFileName || 'submission-report.json'} | Accessibility report JSON`);
  rows.push(`- ${summaryFileName || 'judge-summary.md'} | Judge summary markdown`);
  rows.push(
    `- ${handoffPacketFileName || 'accessibility-handoff-packet.md'} | Accessibility handoff packet markdown`,
  );
  rows.push(
    `- ${handoffPacketJsonFileName || 'accessibility-handoff-packet.json'} | Accessibility handoff packet JSON`,
  );
  rows.push(
    `- ${auditPdfFileName || 'clearsight-audit-report.pdf'} | Audit report PDF (score, findings, remediation plan)`,
  );
  rows.push(
    `- ${verdictCardFileName || 'clearsight-audit-verdict-card.png'} | Presentation-ready audit verdict card (1200×630 PNG)`,
  );
  if (repairProofFileName) {
    rows.push(`- ${repairProofFileName} | Verified accessibility repair proof (before/after pixels, score delta, and finding reductions)`);
  }
  if (cssFixFileName) {
    rows.push(`- ${cssFixFileName} | Developer CSS fix sheet (verified WCAG 1.4.3 + 1.4.11 replacement colors)`);
  }
  if (conformanceFileName) {
    rows.push(
      `- ${conformanceFileName} | WCAG conformance summary markdown (criterion-by-criterion outcomes with measured evidence)`,
    );
  }
  if (totalEstimatedBytes > 0) {
    rows.push(
      `- Estimated total raw payload: ${formatBytes(totalEstimatedBytes)} (visual + text artifacts)`,
    );
  }
  rows.push('');

  rows.push('Simulation ranking (high to low visual delta):');
  resolvedReport.simulations.forEach((entry, index) => {
    const impactText =
      typeof entry.impactPercent === 'number' ? `${entry.impactPercent.toFixed(1)}%` : 'N/A';
    rows.push(`${index + 1}. ${entry.label} — ${impactText} (${entry.impactLevel})`);
  });

  rows.push('');
  rows.push('Contrast state:');
  if (resolvedReport.contrast.lastChecked) {
    rows.push(
      `Text ${resolvedReport.contrast.text} on ${resolvedReport.contrast.background}: ${resolvedReport.contrast.lastChecked.ratio.toFixed(2)}:1`,
    );
    rows.push(`AA threshold: ${resolvedReport.contrast.lastChecked.aaThreshold}`);
    rows.push(`AAA threshold: ${resolvedReport.contrast.lastChecked.aaaThreshold}`);
    rows.push(`AA margin: ${formatContrastMargin(resolvedReport.contrast.lastChecked.aaMargin)}`);
    rows.push(`AAA margin: ${formatContrastMargin(resolvedReport.contrast.lastChecked.aaaMargin)}`);
    rows.push(`Large-text AA margin: ${formatContrastMargin(resolvedReport.contrast.lastChecked.largeTextMargin)}`);
    rows.push(
      `Result: AA ${resolvedReport.contrast.lastChecked.passesAA ? 'PASS' : 'FAIL'} | AAA ${resolvedReport.contrast.lastChecked.passesAAA ? 'PASS' : 'FAIL'} | Large-text AA ${resolvedReport.contrast.lastChecked.passesLAA ? 'PASS' : 'FAIL'}`,
    );
  } else {
    rows.push('Not run before package export.');
  }

  rows.push('');
  rows.push('Automatic text contrast scan:');
  if (resolvedReport.textScan) {
    rows.push(
      `${resolvedReport.textScan.summary.total} text-like region(s) detected | ${resolvedReport.textScan.summary.belowAA} below AA for normal text (worst contrast first)`,
    );
    resolvedReport.textScan.regions.forEach((region) => {
      rows.push(
        `${region.rank}. (${region.x},${region.y}) ${region.width}×${region.height}px — ${region.text} on ${region.background} → ${region.ratio.toFixed(2)}:1 (${region.levelLabel})`,
      );
    });
  } else {
    rows.push('No text-like regions detected before package export.');
  }

  return `${rows.join('\n')}\n`;
}

function buildRemediationActions({
  topImpactMode = null,
  contrastState = null,
  suggestionCount = 0,
  textScan = null,
  componentContrast = null,
  targetSizes = null,
  paletteCollisions = null,
  flashScan = null,
  focusCheck = null,
  focusSequence = null,
}) {
  const actions = [];
  const addAction = (priority, text) => {
    const validPriority = REMEDIATION_SORT_ORDER[priority] !== undefined ? priority : 'info';
    if (text) {
      actions.push({
        priority: validPriority,
        priorityLabel: REMEDIATION_PRIORITY[validPriority],
        text,
      });
    }
  };

  if (topImpactMode && typeof topImpactMode.impactPercent === 'number') {
    if (topImpactMode.impactPercent >= IMPACT_LEVEL.high) {
      addAction(
        'high',
        `${topImpactMode.label} is the highest-impact simulation (${topImpactMode.impactPercent.toFixed(1)}% pixel delta); review this mode first before handoff.`,
      );
    } else if (topImpactMode.impactPercent >= IMPACT_LEVEL.medium) {
      addAction(
        'medium',
        `${topImpactMode.label} has a moderate visual delta (${topImpactMode.impactPercent.toFixed(1)}%); verify key controls remain legible there first.`,
      );
    }
  }

  if (flashScan?.riskLevel === 'high') {
    addAction(
      'high',
      `Animation "${flashScan.label}" exceeds the WCAG 2.3.1 flash threshold — peak ${flashScan.peakFlashesPerSecond} flashes/sec across ${flashScan.peakViolatingAreaPercent}% of the frame (limits: 3/sec, 25%). Slow the cycle, shrink the flashing region, or reduce the luminance swing, and honor prefers-reduced-motion.`,
    );
  } else if (flashScan?.riskLevel === 'caution') {
    addAction(
      'medium',
      `Animation "${flashScan.label}" flashes at or near the WCAG 2.3.1 limit (peak ${flashScan.peakFlashesPerSecond}/sec over a small area) — slow the cycle or soften the luminance swing before shipping.`,
    );
  }

  if (focusCheck?.verdict === 'none') {
    addAction(
      'high',
      `No visible keyboard focus indicator between "${focusCheck.baseLabel}" and "${focusCheck.focusLabel}" (WCAG 2.4.7) — add a :focus-visible outline of at least 2px with ≥3:1 contrast so keyboard users can see where they are.`,
    );
  } else if (focusCheck?.verdict === 'weak') {
    addAction(
      'medium',
      `The focus indicator is visible but below the WCAG 2.4.13 bar — only ${focusCheck.contrastingPixels} of ${focusCheck.changedPixels} changed pixels reach 3:1 change contrast (contrasting area ${focusCheck.contrastingAreaCss} vs required ${focusCheck.requiredIndicatorArea} CSS px²). Thicken the outline or pick a higher-contrast focus color.`,
    );
  }

  if (focusSequence?.aggregateVerdict === 'none' && focusSequence.summary?.framesAnalyzed > 0) {
    addAction(
      'high',
      `A tab-through recording ("${focusSequence.sourceLabel || 'recording'}", ${focusSequence.summary.framesAnalyzed} analyzed frames) shows no localizable keyboard focus indicator (WCAG 2.4.7) — add a :focus-visible outline of at least 2px with ≥3:1 contrast so the whole tab order stays visible.`,
    );
  } else if (focusSequence?.aggregateVerdict === 'weak') {
    addAction(
      'medium',
      `${focusSequence.summary.weak} of ${focusSequence.summary.stops} focus stops mapped from the tab-through recording fall below the WCAG 2.4.13 bar${focusSequence.worstStopOrder ? ` (worst: stop ${focusSequence.worstStopOrder})` : ''} — keyboard users lose track of focus mid-journey. Thicken those outlines or raise their change contrast to ≥3:1.`,
    );
  }

  if (contrastState?.cvdProjection?.hiddenFailure) {
    const worst = contrastState.cvdProjection.worst;
    addAction(
      'high',
      `Checked pair passes AA for typical vision but drops to ${worst.ratio.toFixed(2)}:1 under ${getCvdModeShortLabel(worst.label)} — pick a replacement that also holds contrast in the color-vision projection strip.`,
    );
  }

  if (contrastState?.apca?.falsePass) {
    addAction(
      'high',
      `Checked pair passes WCAG 2 AA but scores only APCA Lc ${Math.round(Math.abs(contrastState.apca.lc))} (below the Lc 60 fluent-text minimum in the WCAG 3 draft) — increase the lightness difference so the pair holds up perceptually, not just numerically.`,
    );
  }

  if (paletteCollisions?.summary?.collisions > 0) {
    const worstCollision = paletteCollisions.pairs?.[0];
    addAction(
      'high',
      `${paletteCollisions.summary.collisions} dominant color pair${paletteCollisions.summary.collisions === 1 ? '' : 's'} that look clearly different for typical vision become nearly indistinguishable under color-vision deficiency${worstCollision ? ` — worst: ${worstCollision.colorA} vs ${worstCollision.colorB} (ΔE ${worstCollision.baseDeltaE} → ${worstCollision.worstDeltaE} under ${getCvdModeShortLabel(worstCollision.worstModeLabel)})` : ''}. Where these colors encode meaning (status, categories, charts), add a second cue such as an icon, label, or pattern (WCAG 1.4.1 Use of Color).`,
    );
  }

  if (componentContrast?.summary?.failing > 0) {
    const worstSurface = componentContrast.findings?.[0];
    addAction(
      'high',
      `${componentContrast.summary.failing} UI component surface${componentContrast.summary.failing === 1 ? '' : 's'} fall below the 3:1 non-text contrast minimum against the adjacent page (WCAG 1.4.11)${worstSurface ? ` — worst: ${worstSurface.surface} vs ${worstSurface.surrounding} at ${worstSurface.ratio.toFixed(2)}:1 near (${worstSurface.x},${worstSurface.y})` : ''}. Users may not see where these controls begin — add a ≥3:1 border or darker fill.`,
    );
  }

  if (targetSizes?.summary?.undersized > 0) {
    const worstTarget = targetSizes.findings?.[0];
    addAction(
      'high',
      `${targetSizes.summary.undersized} tap target${targetSizes.summary.undersized === 1 ? '' : 's'} measure below the ${targetSizes.summary.minTargetCss}×${targetSizes.summary.minTargetCss} CSS px minimum with a neighboring target inside ${targetSizes.summary.minTargetCss}px clearance, so the spacing exception cannot apply (WCAG 2.5.8 Target Size)${worstTarget ? ` — smallest: ${worstTarget.widthCss}×${worstTarget.heightCss}px near (${worstTarget.x},${worstTarget.y})` : ''}. Enlarge the hit area to 24×24px or add spacing between the controls; this needs a layout change, not a recolor.`,
    );
  }

  if (textScan?.summary?.apcaFalsePasses > 0) {
    addAction(
      'medium',
      `${textScan.summary.apcaFalsePasses} scanned text region${textScan.summary.apcaFalsePasses === 1 ? '' : 's'} pass WCAG 2 but fall below the APCA fluent-text minimum (Lc 60); prioritize darker/lighter variants of these pairs for body copy.`,
    );
  }

  if (textScan?.summary?.cvdHiddenFailures > 0) {
    const worstHidden = textScan.regions.find((region) => region.cvdHiddenFailure);
    addAction(
      'medium',
      `${textScan.summary.cvdHiddenFailures} scanned text region${textScan.summary.cvdHiddenFailures === 1 ? '' : 's'} pass AA but fail under color-blindness${worstHidden ? ` — e.g. ${worstHidden.text} on ${worstHidden.background} falls to ${worstHidden.cvdWorstRatio?.toFixed(2)}:1 under ${worstHidden.cvdWorstMode}` : ''}; verify these against the CVD simulations before shipping.`,
    );
  }

  if (textScan?.summary?.belowAA > 0) {
    const worstFlagged = textScan.regions.find((region) => !region.passesAA) || textScan.regions[0];
    addAction(
      'high',
      `Automatic text scan flagged ${textScan.summary.belowAA} region${textScan.summary.belowAA === 1 ? '' : 's'} below AA — worst is ${worstFlagged.text} on ${worstFlagged.background} at ${worstFlagged.ratio.toFixed(2)}:1 near (${worstFlagged.x},${worstFlagged.y}); load the flagged pair into the checker and apply an accessible fix.`,
    );
  }

  if (!contrastState) {
    addAction('medium', 'Run the contrast check after choosing sample text/background colors.');
  } else if (!contrastState.passesAA) {
    const required = Number((contrastState.aaThreshold || AA_THRESHOLD_DEFAULT).toFixed(1));
    const current = Number(contrastState.ratio.toFixed(1));
    const priority = current <= required - 1.5 ? 'high' : 'medium';
    addAction(
      priority,
      `Contrast fails AA at ${current}:1 vs ${required}:1 target; apply a suggested pair or reduce text opacity/background noise.`,
    );
    if (!Number.isFinite(suggestionCount) || suggestionCount <= 0) {
      addAction(
        'low',
        'No accessible replacements were generated for current colors; try sampling a different nearby text/background pair.',
      );
    }
  } else if (!contrastState.passesAAA) {
    addAction(
      'low',
      'AA passes; consider moving toward AAA (7:1) for premium contrast quality on top-priority content.',
    );
  } else if (topImpactMode && topImpactMode.impactPercent >= IMPACT_LEVEL.medium) {
    addAction(
      'low',
      'Contrast checks pass, but capture high-impact simulation cards for design review before finalizing.',
    );
  }

  if (!actions.length) {
    addAction('low', 'No critical remediation items are currently flagged for this snapshot.');
  }

  return actions.sort((a, b) => REMEDIATION_SORT_ORDER[a.priority] - REMEDIATION_SORT_ORDER[b.priority]);
}

function buildFocusCheckReportSection() {
  if (!state.focusCheck) {
    return null;
  }
  const { analysis, baseLabel, focusLabel } = state.focusCheck;
  return {
    baseLabel,
    focusLabel,
    verdict: analysis.verdict,
    verdictLabel: analysis.verdictLabel,
    focusVisibleOutcome: analysis.focusVisibleOutcome,
    focusAppearanceOutcome: analysis.focusAppearanceOutcome,
    changedPixels: analysis.changedPixels,
    contrastingPixels: analysis.contrastingPixels,
    changedAreaCss: analysis.changedAreaCss,
    contrastingAreaCss: analysis.contrastingAreaCss,
    requiredIndicatorArea: analysis.requiredIndicatorArea,
    meanChangeRatio: analysis.meanChangeRatio,
    maxChangeRatio: analysis.maxChangeRatio,
    indicatorColor: analysis.indicatorColor,
    baseColor: analysis.baseColor,
    boundingBox: analysis.boundingBox ? { ...analysis.boundingBox } : null,
  };
}

function buildFocusSequenceReportSection() {
  if (!state.focusSequence) {
    return null;
  }
  const { result, sourceLabel, truncated } = state.focusSequence;
  return {
    sourceLabel,
    truncated: Boolean(truncated),
    width: result.width,
    height: result.height,
    cssPixelRatio: result.cssPixelRatio,
    aggregateVerdict: result.aggregateVerdict,
    aggregateLabel: result.aggregateLabel,
    worstStopOrder: result.worstStopOrder,
    summary: { ...result.summary },
    stops: result.stops.map((stop) => ({
      ...stop,
      boundingBox: { ...stop.boundingBox },
      center: { ...stop.center },
    })),
  };
}

function buildFlashScanReportSection() {
  if (!state.flashScan) {
    return null;
  }
  const { label, analysis, truncated, totalFrames } = state.flashScan;
  return {
    label,
    riskLevel: analysis.riskLevel,
    riskLabel: analysis.riskLabel,
    frameCount: analysis.frameCount,
    totalFrames,
    truncated: Boolean(truncated),
    totalDurationMs: analysis.totalDurationMs,
    averageFps: analysis.averageFps,
    totalFlashEvents: analysis.totalFlashEvents,
    totalRedFlashEvents: analysis.totalRedFlashEvents,
    peakFlashesPerSecond: analysis.peakFlashesPerSecond,
    peakGeneralFlashesPerSecond: analysis.peakGeneralFlashesPerSecond,
    peakRedFlashesPerSecond: analysis.peakRedFlashesPerSecond,
    peakViolatingAreaPercent: analysis.peakViolatingAreaPercent,
    worstWindow: analysis.worstWindow ? { ...analysis.worstWindow } : null,
  };
}

function getTextScanLevelLabel(level) {
  return (PALETTE_LEVEL_PRESENTATION[level] || PALETTE_LEVEL_PRESENTATION.fail).label;
}

function buildTextScanReportSection() {
  if (!state.textScan?.regions?.length) {
    return null;
  }

  return {
    summary: { ...state.textScan.summary },
    regions: state.textScan.regions.map((region, index) => ({
      rank: index + 1,
      x: region.x,
      y: region.y,
      width: region.width,
      height: region.height,
      text: region.text.hex.toUpperCase(),
      background: region.background.hex.toUpperCase(),
      ratio: Number(region.ratio.toFixed(3)),
      level: region.level,
      levelLabel: getTextScanLevelLabel(region.level),
      passesAA: region.passesAA,
      cvdWorstRatio: region.cvd ? Number(region.cvd.worstRatio.toFixed(3)) : null,
      cvdWorstMode: region.cvd?.worstMode || null,
      cvdHiddenFailure: Boolean(region.cvd?.hiddenFailure),
      apcaLc: region.apca ? Number(region.apca.lc.toFixed(2)) : null,
      apcaRating: region.apca?.rating || null,
      apcaFalsePass: Boolean(region.apca?.falsePass),
    })),
  };
}

function buildComponentScanReportSection() {
  if (!state.componentScan?.summary) {
    return null;
  }

  const { summary, findings } = state.componentScan;
  return {
    summary: { ...summary, worstRatio: Number.isFinite(summary.worstRatio) ? Number(summary.worstRatio.toFixed(3)) : null },
    findings: findings.map((finding) => ({
      region: finding.regionIndex + 1,
      surface: finding.surface.hex.toUpperCase(),
      surrounding: finding.surrounding.hex.toUpperCase(),
      ratio: Number(finding.ratio.toFixed(3)),
      minRatio: summary.minRatio,
      boundaryDistance: finding.boundaryDistance,
      x: finding.box.x,
      y: finding.box.y,
      width: finding.box.width,
      height: finding.box.height,
    })),
  };
}

function buildTargetSizeReportSection() {
  if (!state.targetSizeScan?.summary) {
    return null;
  }

  const { summary, findings } = state.targetSizeScan;
  return {
    summary: { ...summary },
    findings: findings.map((finding) => ({
      region: finding.regionIndex + 1,
      kind: finding.kind,
      widthCss: finding.widthCss,
      heightCss: finding.heightCss,
      minTargetCss: summary.minTargetCss,
      color: finding.color?.hex?.toUpperCase() || null,
      x: finding.box.x,
      y: finding.box.y,
      width: finding.box.width,
      height: finding.box.height,
    })),
  };
}

function buildPaletteCollisionReportSection() {
  if (!state.paletteCollisions?.summary) {
    return null;
  }

  const { summary, pairs } = state.paletteCollisions;
  return {
    summary: {
      colorsEvaluated: summary.colorsEvaluated,
      candidatePairs: summary.candidatePairs,
      collisions: summary.collisions,
      evaluatedModes: summary.evaluatedModes,
    },
    pairs: pairs.map((pair) => ({
      colorA: pair.colorA,
      colorB: pair.colorB,
      baseDeltaE: Number(pair.baseDeltaE.toFixed(2)),
      worstMode: pair.worst.id,
      worstModeLabel: pair.worst.label,
      worstDeltaE: Number(pair.worst.deltaE.toFixed(2)),
      retentionPercent: Number(pair.worst.retentionPercent.toFixed(1)),
      projectedA: pair.worst.projectedA.hex,
      projectedB: pair.worst.projectedB.hex,
      collidingModes: pair.collidingModes.map((mode) => mode.id),
    })),
  };
}

function buildAccessibilityScoreReportSection() {
  const scoreResult = computeCurrentAccessibilityScore();
  if (!scoreResult || !Number.isFinite(scoreResult.score)) {
    return null;
  }

  return {
    score: scoreResult.score,
    grade: scoreResult.grade,
    verdictLabel: scoreResult.verdictLabel,
    axes: scoreResult.axes.map((axis) => ({
      id: axis.id,
      label: axis.label,
      weight: axis.weight,
      score: axis.score,
      detail: axis.detail,
    })),
  };
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
  const accessibilityHealth = getAccessibilityRiskSummary();
  const contrastState = state.lastContrastResult
    ? {
        ratio: Number(state.lastContrastResult.ratio.toFixed(3)),
        passesAA: state.lastContrastResult.passesAA,
        passesAAA: state.lastContrastResult.passesAAA,
        passesLAA: state.lastContrastResult.passesLAA,
        aaThreshold: state.lastContrastResult.aaThreshold ?? AA_THRESHOLD_DEFAULT,
        aaaThreshold: state.lastContrastResult.aaaThreshold ?? AAA_THRESHOLD_DEFAULT,
        aaMargin: Number.isFinite(state.lastContrastResult.aaMargin)
          ? Number(state.lastContrastResult.aaMargin.toFixed(3))
          : null,
        aaaMargin: Number.isFinite(state.lastContrastResult.aaaMargin)
          ? Number(state.lastContrastResult.aaaMargin.toFixed(3))
          : null,
        largeTextMargin: Number.isFinite(state.lastContrastResult.largeTextMargin)
          ? Number(state.lastContrastResult.largeTextMargin.toFixed(3))
          : null,
        largeTextMode: Boolean(dom.contrastLargeText?.checked),
        cvdProjection: state.lastCvdProjection
          ? {
              aaThreshold: state.lastCvdProjection.aaThreshold,
              hiddenFailure: state.lastCvdProjection.hiddenFailure,
              failingModes: [...state.lastCvdProjection.failingModes],
              worst: {
                id: state.lastCvdProjection.worst.id,
                label: state.lastCvdProjection.worst.label,
                ratio: Number(state.lastCvdProjection.worst.ratio.toFixed(3)),
              },
              projections: state.lastCvdProjection.projections.map((entry) => ({
                id: entry.id,
                label: entry.label,
                ratio: Number(entry.ratio.toFixed(3)),
                passesAA: entry.passesAA,
              })),
            }
          : null,
        apca: state.lastApcaComparison
          ? {
              lc: Number(state.lastApcaComparison.apca.lc.toFixed(2)),
              polarity: state.lastApcaComparison.apca.polarity,
              rating: state.lastApcaComparison.apca.rating,
              level: state.lastApcaComparison.apca.level,
              passesBodyText: state.lastApcaComparison.apca.passesBodyText,
              passesFluentText: state.lastApcaComparison.apca.passesFluentText,
              falsePass: state.lastApcaComparison.falsePass,
              overStrict: state.lastApcaComparison.overStrict,
            }
          : null,
      }
    : null;
  const textScan = buildTextScanReportSection();
  const componentContrast = buildComponentScanReportSection();
  const targetSizes = buildTargetSizeReportSection();
  const paletteCollisions = buildPaletteCollisionReportSection();
  const flashScan = buildFlashScanReportSection();
  const focusCheck = buildFocusCheckReportSection();
  const focusSequence = buildFocusSequenceReportSection();
  const remediationActions = buildRemediationActions({
    topImpactMode: topImpact,
    contrastState,
    suggestionCount: Array.isArray(state.lastSuggestionPairs) ? state.lastSuggestionPairs.length : 0,
    textScan,
    componentContrast,
    targetSizes,
    paletteCollisions,
    flashScan,
    focusCheck,
    focusSequence,
  });

  return {
    generatedAt: new Date().toISOString(),
    source: {
      ...getSourceMetadata(),
      hasRenderedSource: Boolean(state.hasRenderedSource),
    },
    simulationIntensity: state.simulationSeverityPercent || SIMULATION_SEVERITY_DEFAULT_PERCENT,
    simulations: simulationImpacts,
    topImpactMode: topImpact,
    contrast: {
      text: contrastText,
      background: contrastBg,
      lastChecked: contrastState,
    },
    accessibilityHealth: {
      level: accessibilityHealth.level,
      label: accessibilityHealth.label,
      topImpactLabel: accessibilityHealth.topImpactLabel,
      contrastStatus: accessibilityHealth.contrastStatus,
      hasImpactData: accessibilityHealth.hasImpactData,
    },
    accessibilityScore: buildAccessibilityScoreReportSection(),
    textScan,
    componentContrast,
    targetSizes,
    paletteCollisions,
    flashScan,
    focusCheck,
    focusSequence,
    suggestions: Array.isArray(state.lastSuggestionPairs)
      ? state.lastSuggestionPairs.slice(0, 8).map((pair) => {
          const qualityMeta = getContrastSuggestionQualityMeta(
            pair.ratio,
            contrastState?.aaThreshold,
            contrastState?.aaaThreshold,
          );
          return {
            text: pair.text.toUpperCase(),
            background: pair.background.toUpperCase(),
            ratio: Number(pair.ratio.toFixed(3)),
            quality: pair.quality || qualityMeta.quality,
            qualityLabel: pair.qualityLabel || qualityMeta.qualityLabel,
            aaDelta: Number.isFinite(pair.aaDelta)
              ? pair.aaDelta
              : qualityMeta.aaDelta,
            aaaDelta: Number.isFinite(pair.aaaDelta)
              ? pair.aaaDelta
              : qualityMeta.aaaDelta,
            meetsAA: pair.meetsAA ?? qualityMeta.meetsAA,
            meetsAAA: pair.meetsAAA ?? qualityMeta.meetsAAA,
          };
        })
      : [],
    remediationActions,
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
    'overall_risk_level',
    'overall_risk_label',
    'overall_top_impact',
    'contrast_status',
    'mode_id',
    'mode_label',
    'impact_percent',
    'impact_risk',
    'source_file',
    'rendered_width',
    'rendered_height',
    'source_original_width',
    'source_original_height',
    'source_was_downscaled',
    'source_render_scale',
    'simulation_intensity',
    'contrast_text',
    'contrast_background',
    'contrast_ratio',
    'passes_aa',
    'passes_aaa',
    'passes_large_text_aa',
    'aa_threshold',
    'aaa_threshold',
    'aa_margin',
    'aaa_margin',
    'large_text_margin',
    'apca_lc',
    'apca_rating',
    'apca_false_pass',
    'text_scan_regions',
    'text_scan_below_aa',
    'text_scan_worst_ratio',
    'text_scan_worst_pair',
    'component_surfaces_evaluated',
    'component_surfaces_below_3_1',
    'component_worst_ratio',
    'target_size_targets',
    'target_size_undersized_2_5_8',
    'target_size_worst',
    'palette_collision_pairs',
    'palette_collision_worst_pair',
    'palette_collision_worst_mode',
    'clearsight_score',
    'clearsight_grade',
    'generated_at',
  ];

  const rows = report.simulations.map((entry) => [
    report.accessibilityHealth?.level || ACCESSIBILITY_RISK_LABELS.neutral,
    report.accessibilityHealth?.label || ACCESSIBILITY_RISK_LABELS.neutral,
    report.accessibilityHealth?.topImpactLabel || '',
    report.accessibilityHealth?.contrastStatus || 'Not run',
    entry.id,
    entry.label,
    entry.impactPercent ?? '',
    entry.impactLevel,
    report.source.fileName || 'Untitled source image',
    report.source.renderedSize.width || '',
    report.source.renderedSize.height || '',
    report.source.originalSize?.width || '',
    report.source.originalSize?.height || '',
    report.source.wasDownscaled ? 'yes' : 'no',
    report.source.wasDownscaled && report.source.originalSize?.width
      ? (report.source.renderedSize.width / report.source.originalSize.width).toFixed(3)
      : '',
    report.simulationIntensity,
    report.contrast.text,
    report.contrast.background,
    report.contrast.lastChecked ? report.contrast.lastChecked.ratio : '',
    report.contrast.lastChecked ? (report.contrast.lastChecked.passesAA ? 'pass' : 'fail') : '',
    report.contrast.lastChecked ? (report.contrast.lastChecked.passesAAA ? 'pass' : 'fail') : '',
    report.contrast.lastChecked ? (report.contrast.lastChecked.passesLAA ? 'pass' : 'fail') : '',
    report.contrast.lastChecked ? report.contrast.lastChecked.aaThreshold : '',
    report.contrast.lastChecked ? report.contrast.lastChecked.aaaThreshold : '',
    report.contrast.lastChecked ? report.contrast.lastChecked.aaMargin : '',
    report.contrast.lastChecked ? report.contrast.lastChecked.aaaMargin : '',
    report.contrast.lastChecked ? report.contrast.lastChecked.largeTextMargin : '',
    report.contrast.lastChecked?.apca ? report.contrast.lastChecked.apca.lc : '',
    report.contrast.lastChecked?.apca ? report.contrast.lastChecked.apca.rating : '',
    report.contrast.lastChecked?.apca ? (report.contrast.lastChecked.apca.falsePass ? 'yes' : 'no') : '',
    report.textScan ? report.textScan.summary.total : '',
    report.textScan ? report.textScan.summary.belowAA : '',
    report.textScan?.regions?.length ? report.textScan.regions[0].ratio : '',
    report.textScan?.regions?.length
      ? `${report.textScan.regions[0].text} on ${report.textScan.regions[0].background}`
      : '',
    report.componentContrast ? report.componentContrast.summary.evaluated : '',
    report.componentContrast ? report.componentContrast.summary.failing : '',
    report.componentContrast?.summary?.worstRatio ?? '',
    report.targetSizes ? report.targetSizes.summary.targets : '',
    report.targetSizes ? report.targetSizes.summary.undersized : '',
    report.targetSizes?.findings?.length
      ? `${report.targetSizes.findings[0].widthCss}x${report.targetSizes.findings[0].heightCss}`
      : '',
    report.paletteCollisions ? report.paletteCollisions.summary.collisions : '',
    report.paletteCollisions?.pairs?.length
      ? `${report.paletteCollisions.pairs[0].colorA} vs ${report.paletteCollisions.pairs[0].colorB}`
      : '',
    report.paletteCollisions?.pairs?.length ? report.paletteCollisions.pairs[0].worstMode : '',
    report.accessibilityScore ? report.accessibilityScore.score : '',
    report.accessibilityScore ? report.accessibilityScore.grade : '',
    report.generatedAt,
  ]);

  return `${headers.map(toCsvCell).join(',')}\n${rows.map((row) => row.map(toCsvCell).join(',')).join('\n')}\n`;
}

function buildContrastSuggestionsCsv() {
  if (!state.lastSuggestionPairs?.length) {
    return 'index,text_hex,background_hex,contrast_ratio,target_aa_ratio,passes_target_aa,quality_tier,meets_aaa,delta_to_aa_target,delta_to_aaa_target\n';
  }

  if (!isRenderingContrastResult && !renderContrastResult()) {
    return '';
  }
  if (!state.lastContrastResult) {
    return '';
  }

  const targetRatio = Number(state.currentContrastAaThreshold || AA_THRESHOLD_DEFAULT);
  const header = [
    'index',
    'text_hex',
    'background_hex',
    'contrast_ratio',
    'target_aa_ratio',
    'passes_target_aa',
    'quality_tier',
    'meets_aaa',
    'delta_to_aa_target',
    'delta_to_aaa_target',
  ];

  const rows = state.lastSuggestionPairs.map((pair, index) => {
    const qualityMeta = getContrastSuggestionQualityMeta(pair.ratio, targetRatio, AAA_THRESHOLD_DEFAULT);
    const aaDelta = Number.isFinite(pair.aaDelta)
      ? Number(pair.aaDelta)
      : qualityMeta.aaDelta;
    const aaaDelta = Number.isFinite(pair.aaaDelta)
      ? Number(pair.aaaDelta)
      : qualityMeta.aaaDelta;

    return [
      index + 1,
      pair.text.toUpperCase(),
      pair.background.toUpperCase(),
      Number(pair.ratio).toFixed(2),
      targetRatio.toFixed(1),
      pair.ratio >= targetRatio ? 'pass' : 'fail',
      pair.qualityLabel || qualityMeta.qualityLabel,
      (pair.meetsAAA ?? qualityMeta.meetsAAA) ? 'yes' : 'no',
      Number.isFinite(aaDelta) ? aaDelta.toFixed(3) : '',
      Number.isFinite(aaaDelta) ? aaaDelta.toFixed(3) : '',
    ];
  });

  return `${header.map(toCsvCell).join(',')}\n${rows.map((row) => row.map(toCsvCell).join(',')).join('\n')}\n`;
}

function buildContrastSuggestionsJson() {
  if (!state.lastSuggestionPairs?.length) {
    return '';
  }

  if (!isRenderingContrastResult && !renderContrastResult()) {
    return '';
  }
  const result = state.lastContrastResult;
  if (!result) {
    return '';
  }

  const report = buildAccessibilityReport();
  const targetRatio = Number(state.currentContrastAaThreshold || AA_THRESHOLD_DEFAULT);
  const sourceText = normalizeHexInput(dom.contrastTextHex?.value || dom.contrastText?.value);
  const sourceBackground = normalizeHexInput(dom.contrastBgHex?.value || dom.contrastBg?.value);
  const generatedAt = report.generatedAt || new Date().toISOString();

  return JSON.stringify(
    {
      generatedAt,
      sourceName: state.sourceName || 'clearsight-source',
      sourceRenderedSize: {
        width: state.renderSize.width || 0,
        height: state.renderSize.height || 0,
      },
      contrast: {
        text: sourceText?.toUpperCase() || report.contrast.text,
        background: sourceBackground?.toUpperCase() || report.contrast.background,
        ratio: Number(result.ratio.toFixed(3)),
        passesAa: result.passesAA,
        passesAaa: result.passesAAA,
        passesLargeTextAa: result.passesLAA,
        targetAaRatio: Number.isFinite(targetRatio) ? targetRatio : AA_THRESHOLD_DEFAULT,
        aaThreshold: result.aaThreshold,
        aaaThreshold: result.aaaThreshold,
        aaMargin: Number.isFinite(result.aaMargin) ? Number(result.aaMargin.toFixed(3)) : null,
        aaaMargin: Number.isFinite(result.aaaMargin) ? Number(result.aaaMargin.toFixed(3)) : null,
        largeTextMargin: Number.isFinite(result.largeTextMargin) ? Number(result.largeTextMargin.toFixed(3)) : null,
      },
      simulationIntensity: state.simulationSeverityPercent || SIMULATION_SEVERITY_DEFAULT_PERCENT,
      suggestions: state.lastSuggestionPairs.map((pair, index) => {
        const qualityMeta = getContrastSuggestionQualityMeta(pair.ratio, targetRatio, AAA_THRESHOLD_DEFAULT);
        const aaDelta = Number.isFinite(pair.aaDelta) ? Number(pair.aaDelta) : qualityMeta.aaDelta;
        const aaaDelta = Number.isFinite(pair.aaaDelta) ? Number(pair.aaaDelta) : qualityMeta.aaaDelta;

        return {
          index: index + 1,
          text: pair.text?.toUpperCase(),
          background: pair.background?.toUpperCase(),
          ratio: Number(pair.ratio.toFixed(3)),
          quality: pair.quality || qualityMeta.quality,
          qualityLabel: pair.qualityLabel || qualityMeta.qualityLabel,
          aaDelta: Number.isFinite(aaDelta) ? Number(aaDelta.toFixed(3)) : null,
          aaaDelta: Number.isFinite(aaaDelta) ? Number(aaaDelta.toFixed(3)) : null,
          meetsAA: pair.meetsAA ?? qualityMeta.meetsAA,
          meetsAAA: pair.meetsAAA ?? qualityMeta.meetsAAA,
        };
      }),
    },
    null,
    2,
  );
}

function resolveContrastSuggestionExportPayloads() {
  if (!state.lastSuggestionPairs?.length) {
    if (isRenderingContrastResult) {
      return null;
    }
    const result = renderContrastResult();
    if (!result || !state.lastSuggestionPairs.length) {
      return null;
    }
  }

  const csv = buildContrastSuggestionsCsv();
  const json = buildContrastSuggestionsJson();
  if (!csv || !json) {
    return null;
  }

  return {
    csv,
    json,
    safeBase: getSafeFileName(state.sourceName || 'clearsight-source'),
  };
}

function buildContrastSuggestionPackageEntries() {
  const payloads = resolveContrastSuggestionExportPayloads();
  if (!payloads) {
    return [];
  }

  return [
    {
      id: 'contrast-suggestions-csv',
      filename: `${payloads.safeBase}-contrast-suggestions.csv`,
      label: 'Contrast suggestion list CSV',
      kind: 'Contrast suggestion list CSV',
      useCanonicalFilename: true,
      content: payloads.csv,
      estimatedBytes: estimateTextBytes(payloads.csv),
    },
    {
      id: 'contrast-suggestions-json',
      filename: `${payloads.safeBase}-contrast-suggestions.json`,
      label: 'Contrast suggestion list JSON',
      kind: 'Contrast suggestion list JSON',
      useCanonicalFilename: true,
      content: payloads.json,
      estimatedBytes: estimateTextBytes(payloads.json),
    },
  ];
}

function buildJudgeSummaryMarkdown() {
  const report = buildAccessibilityReport();
  const lines = [];
  const sourceFile = report.source.fileName || 'Untitled source image';
  const riskLabel = report.accessibilityHealth?.label || ACCESSIBILITY_RISK_LABELS.neutral;
  const topImpactLine = report.topImpactMode
    ? `- **Top impact mode:** ${report.topImpactMode.label} (${report.topImpactMode.impactPercent?.toFixed(1)}% pixel change)`
    : '- **Top impact mode:** not available';
  const contrastLine = report.contrast.lastChecked
    ? `- **Contrast check:** ${report.contrast.text} / ${report.contrast.background} → ${report.contrast.lastChecked.ratio.toFixed(2)}:1 (AA ${report.contrast.lastChecked.aaThreshold.toFixed(1)} ${report.contrast.lastChecked.passesAA ? 'PASS' : 'FAIL'} ${formatContrastMargin(report.contrast.lastChecked.aaMargin)}, AAA ${report.contrast.lastChecked.aaaThreshold.toFixed(1)} ${report.contrast.lastChecked.passesAAA ? 'PASS' : 'FAIL'} ${formatContrastMargin(report.contrast.lastChecked.aaaMargin)}, Large-text AA ${report.contrast.lastChecked.passesLAA ? 'PASS' : 'FAIL'} ${formatContrastMargin(report.contrast.lastChecked.largeTextMargin)})`
    : '- **Contrast check:** not run';
  const cvdProjection = report.contrast.lastChecked?.cvdProjection;
  const cvdLine = cvdProjection
    ? cvdProjection.hiddenFailure
      ? `- **Color-vision projection:** HIDDEN FAILURE — passes AA for typical vision but fails ${cvdProjection.failingModes.length} CVD mode${cvdProjection.failingModes.length === 1 ? '' : 's'} (worst: ${getCvdModeShortLabel(cvdProjection.worst.label)} at ${cvdProjection.worst.ratio.toFixed(2)}:1)`
      : `- **Color-vision projection:** worst of ${cvdProjection.projections.length} CVD modes is ${getCvdModeShortLabel(cvdProjection.worst.label)} at ${cvdProjection.worst.ratio.toFixed(2)}:1 (${cvdProjection.failingModes.length ? `${cvdProjection.failingModes.length} below AA` : 'all hold AA'})`
    : '- **Color-vision projection:** not run';
  const apca = report.contrast.lastChecked?.apca;
  const apcaLine = apca
    ? apca.falsePass
      ? `- **APCA (WCAG 3 draft):** PERCEPTUAL FALSE PASS — WCAG 2 AA passes but APCA scores only Lc ${Math.round(Math.abs(apca.lc))} (${apca.polarity}), below the Lc 60 fluent-text minimum`
      : `- **APCA (WCAG 3 draft):** Lc ${Math.round(Math.abs(apca.lc))} (${apca.polarity}) — ${apca.rating}${apca.overStrict ? ' (WCAG 2 is stricter than APCA here)' : ''}`
    : '- **APCA (WCAG 3 draft):** not run';
  const textScanLine = report.textScan
    ? `- **Automatic text scan:** ${report.textScan.summary.total} text-like region${report.textScan.summary.total === 1 ? '' : 's'} detected · ${report.textScan.summary.belowAA} below AA for normal text${report.textScan.summary.cvdHiddenFailures ? ` · ${report.textScan.summary.cvdHiddenFailures} hidden CVD failure${report.textScan.summary.cvdHiddenFailures === 1 ? '' : 's'}` : ''}`
    : '- **Automatic text scan:** no text-like regions detected';
  const componentLine = report.componentContrast
    ? report.componentContrast.summary.failing > 0
      ? `- **UI component contrast (WCAG 1.4.11):** ${report.componentContrast.summary.failing} of ${report.componentContrast.summary.evaluated} component surface${report.componentContrast.summary.failing === 1 ? '' : 's'} below 3:1 against the adjacent page (worst: ${report.componentContrast.findings[0].surface} vs ${report.componentContrast.findings[0].surrounding} at ${report.componentContrast.findings[0].ratio.toFixed(2)}:1)`
      : report.componentContrast.summary.evaluated > 0
        ? `- **UI component contrast (WCAG 1.4.11):** all ${report.componentContrast.summary.evaluated} distinct component surface${report.componentContrast.summary.evaluated === 1 ? '' : 's'} hold ≥3:1 against their adjacent color`
        : '- **UI component contrast (WCAG 1.4.11):** no distinct component surfaces resolved (text sits directly on the page surface)'
    : '- **UI component contrast (WCAG 1.4.11):** not scanned';
  const targetSizeLine = report.targetSizes
    ? report.targetSizes.summary.undersized > 0
      ? `- **Tap target size (WCAG 2.5.8):** ${report.targetSizes.summary.undersized} of ${report.targetSizes.summary.targets} measured target${report.targetSizes.summary.targets === 1 ? '' : 's'} below 24×24 CSS px with no spacing exception (smallest: ${report.targetSizes.findings[0].widthCss}×${report.targetSizes.findings[0].heightCss}px)`
      : report.targetSizes.summary.targets > 0
        ? `- **Tap target size (WCAG 2.5.8):** all ${report.targetSizes.summary.targets} measured target${report.targetSizes.summary.targets === 1 ? '' : 's'} meet 24×24 CSS px or qualify for the spacing exception`
        : '- **Tap target size (WCAG 2.5.8):** no measurable tap targets resolved'
    : '- **Tap target size (WCAG 2.5.8):** not scanned';
  const collisionLine = report.paletteCollisions
    ? report.paletteCollisions.summary.collisions > 0
      ? `- **Color-only distinction (WCAG 1.4.1):** ${report.paletteCollisions.summary.collisions} dominant color pair${report.paletteCollisions.summary.collisions === 1 ? '' : 's'} collapse under color-vision deficiency (worst: ${report.paletteCollisions.pairs[0].colorA} vs ${report.paletteCollisions.pairs[0].colorB}, ΔE ${report.paletteCollisions.pairs[0].baseDeltaE} → ${report.paletteCollisions.pairs[0].worstDeltaE} under ${getCvdModeShortLabel(report.paletteCollisions.pairs[0].worstModeLabel)})`
      : `- **Color-only distinction (WCAG 1.4.1):** no collisions — ${report.paletteCollisions.summary.candidatePairs} clearly-distinct dominant pairs stay distinguishable across all ${report.paletteCollisions.summary.evaluatedModes} CVD projections`
    : '- **Color-only distinction (WCAG 1.4.1):** not scanned';
  const flashLine = report.flashScan
    ? report.flashScan.riskLevel === 'low'
      ? `- **Animation flash scan (WCAG 2.3.1):** ${report.flashScan.label} is within the flash threshold (peak ${report.flashScan.peakFlashesPerSecond}/sec)`
      : `- **Animation flash scan (WCAG 2.3.1):** ${report.flashScan.riskLevel === 'high' ? 'FAILS the general flash threshold' : 'CAUTION near the flash threshold'} — ${report.flashScan.label} peaks at ${report.flashScan.peakFlashesPerSecond} flashes/sec over ${report.flashScan.peakViolatingAreaPercent}% of the frame (limits: 3/sec, 25%)`
    : null;
  const focusLine = report.focusCheck
    ? report.focusCheck.verdict === 'strong'
      ? `- **Focus appearance (WCAG 2.4.7/2.4.13):** visible focus indicator meets the area + 3:1 change-contrast minimums (${report.focusCheck.contrastingAreaCss} CSS px² contrasting vs ${report.focusCheck.requiredIndicatorArea} required, max ${report.focusCheck.maxChangeRatio}:1)`
      : report.focusCheck.verdict === 'weak'
        ? `- **Focus appearance (WCAG 2.4.7/2.4.13):** indicator detected but BELOW the 2.4.13 bar — ${report.focusCheck.contrastingPixels} of ${report.focusCheck.changedPixels} changed px reach 3:1 change contrast`
        : `- **Focus appearance (WCAG 2.4.7):** NO visible focus indicator between the captured frames — keyboard users cannot see where focus is`
    : null;
  const focusOrderLine = report.focusSequence
    ? report.focusSequence.summary.stops > 0
      ? `- **Focus order map (WCAG 2.4.7/2.4.13):** ${report.focusSequence.summary.stops} focus stop${report.focusSequence.summary.stops === 1 ? '' : 's'} mapped from ${report.focusSequence.summary.framesAnalyzed} sampled frames of "${report.focusSequence.sourceLabel}" — ${report.focusSequence.summary.strong} meet the 2.4.13 bar${report.focusSequence.summary.weak > 0 ? `, ${report.focusSequence.summary.weak} BELOW it${report.focusSequence.worstStopOrder ? ` (worst: stop ${report.focusSequence.worstStopOrder})` : ''}` : ''}`
      : `- **Focus order map (WCAG 2.4.7):** NO localizable focus indicator across ${report.focusSequence.summary.framesAnalyzed} sampled frames of "${report.focusSequence.sourceLabel}"`
    : null;
  const scoreLine = report.accessibilityScore
    ? `- **ClearSight Score:** ${report.accessibilityScore.score}/100 (Grade ${report.accessibilityScore.grade} — ${report.accessibilityScore.verdictLabel}; ${report.accessibilityScore.axes
        .filter((axis) => axis.score !== null)
        .map((axis) => `${axis.label} ${Math.round(axis.score)}`)
        .join(', ')})`
    : '- **ClearSight Score:** not yet computed (render and scan the source first)';

  lines.push('# ClearSight Judge Summary');
  lines.push('');
  lines.push(`Generated: ${report.generatedAt}`);
  lines.push(`Source image: ${sourceFile}`);
  lines.push(
    `Rendered size: ${report.source.renderedSize.width || 0}×${report.source.renderedSize.height || 0}px`,
  );
  if (report.source.wasDownscaled && report.source.originalSize?.width && report.source.originalSize?.height) {
    lines.push(
      `Original size: ${report.source.originalSize.width}×${report.source.originalSize.height}px (downscaled to ${report.source.renderedSize.width}×${report.source.renderedSize.height}px)`,
    );
  } else if (report.source.originalSize?.width && report.source.originalSize?.height) {
    lines.push(`Original size: ${report.source.originalSize.width}×${report.source.originalSize.height}px`);
  }
  lines.push(`Overall accessibility risk: ${riskLabel}`);
  lines.push(`Simulation intensity: ${report.simulationIntensity}%`);
  lines.push('');
  lines.push('## Snapshot');
  lines.push('');
  lines.push(scoreLine);
  lines.push(topImpactLine);
  lines.push(contrastLine);
  lines.push(cvdLine);
  lines.push(apcaLine);
  lines.push(textScanLine);
  lines.push(componentLine);
  lines.push(targetSizeLine);
  lines.push(collisionLine);
  if (flashLine) {
    lines.push(flashLine);
  }
  if (focusLine) {
    lines.push(focusLine);
  }
  if (focusOrderLine) {
    lines.push(focusOrderLine);
  }
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
  lines.push('## Automatic text contrast scan');
  lines.push('');
  if (report.textScan) {
    lines.push(
      `${report.textScan.summary.total} text-like region${report.textScan.summary.total === 1 ? '' : 's'} detected · ${report.textScan.summary.belowAA} below AA for normal text (worst contrast first).`,
    );
    lines.push('');
    lines.push('| # | Region | Text | Background | Ratio | WCAG level | CVD worst |');
    lines.push('| --- | --- | --- | --- | --- | --- | --- |');
    report.textScan.regions.forEach((region) => {
      const cvdCell = Number.isFinite(region.cvdWorstRatio)
        ? `${region.cvdWorstRatio.toFixed(2)}:1 (${region.cvdWorstMode})${region.cvdHiddenFailure ? ' ⚠ hidden' : ''}`
        : 'N/A';
      lines.push(
        `| ${region.rank} | (${region.x},${region.y}) ${region.width}×${region.height}px | ${region.text} | ${region.background} | ${region.ratio.toFixed(2)}:1 | ${region.levelLabel} | ${cvdCell} |`,
      );
    });
  } else {
    lines.push('No text-like regions were detected in the current source scan.');
  }

  lines.push('');
  lines.push('## Suggested palette pairs');
  if (report.suggestions.length > 0) {
    report.suggestions.forEach((pair, idx) => {
      const qualityLabel = pair.qualityLabel || 'Contrast quality unknown';
      const targetTag = pair.meetsAAA ? 'AAA-ready' : pair.meetsAA ? 'AA-ready' : 'Below AA';
      lines.push(
        `${idx + 1}. [${qualityLabel} / ${targetTag}] Text ${pair.text} / Background ${pair.background} (${pair.ratio.toFixed(2)}:1)`,
      );
    });
  } else {
    lines.push('No suggestions have been generated yet.');
  }

  if (report.remediationActions?.length) {
    lines.push('');
    lines.push('## Remediation plan');
    report.remediationActions.forEach((action, index) => {
      const priority = action.priorityLabel || REMEDIATION_PRIORITY[action.priority] || REMEDIATION_PRIORITY.info;
      lines.push(`${index + 1}. **${priority}:** ${action.text}`);
    });
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

function buildReviewerPacketHtml() {
  const report = buildAccessibilityReport();
  const entries = collectCompletedExportCards();
  const generatedAt = report.generatedAt;
  const sourceFile = report.source.fileName || 'Untitled source image';
  const renderedWidth = report.source.renderedSize.width || 0;
  const renderedHeight = report.source.renderedSize.height || 0;
  const sourceDimensionSummary = report.source.originalSize?.width && report.source.originalSize?.height
    ? `${report.source.originalSize.width}×${report.source.originalSize.height}px`
    : 'Not recorded';
  const downscaledRatio = report.source.wasDownscaled && report.source.originalSize?.width
    ? `${Math.round((renderedWidth / report.source.originalSize.width) * 100)}%`
    : '';
  const topImpact = report.topImpactMode
    ? `${report.topImpactMode.label} (${report.topImpactMode.impactPercent?.toFixed(1) || 'N/A'}% pixel change)`
    : 'Not available';
  const contrastLine = report.contrast.lastChecked
    ? `AA ${report.contrast.lastChecked.aaThreshold.toFixed(1)} ${report.contrast.lastChecked.passesAA ? 'PASS' : 'FAIL'} (${formatContrastMargin(report.contrast.lastChecked.aaMargin)}); AAA ${report.contrast.lastChecked.aaaThreshold.toFixed(1)} ${report.contrast.lastChecked.passesAAA ? 'PASS' : 'FAIL'} (${formatContrastMargin(report.contrast.lastChecked.aaaMargin)}); Large-text AA ${report.contrast.lastChecked.passesLAA ? 'PASS' : 'FAIL'} (${formatContrastMargin(report.contrast.lastChecked.largeTextMargin)})`
    : 'Not run';
  const contrastRatio = report.contrast.lastChecked ? `${report.contrast.lastChecked.ratio.toFixed(2)}:1` : 'N/A';
  const overallRisk = report.accessibilityHealth?.label || ACCESSIBILITY_RISK_LABELS.neutral;
  const scoreSummaryLine = report.accessibilityScore
    ? `${report.accessibilityScore.score}/100 — Grade ${report.accessibilityScore.grade} (${report.accessibilityScore.verdictLabel})`
    : 'Not yet computed';

  const simulationRows = report.simulations
    .map(
      (entry) =>
        `<tr><td>${escapeHtmlText(entry.label)}</td><td>${typeof entry.impactPercent === 'number' ? entry.impactPercent.toFixed(1) : 'N/A'}</td><td>${entry.impactLevel}</td></tr>`,
    )
    .join('');

  const suggestionRows = report.suggestions
    .map((pair, index) => {
      const qualityLabel = pair.qualityLabel || 'Contrast quality unknown';
      const aaDelta = Number.isFinite(pair.aaDelta) ? pair.aaDelta.toFixed(3) : 'n/a';
      const aaaDelta = Number.isFinite(pair.aaaDelta) ? pair.aaaDelta.toFixed(3) : 'n/a';
      const status = pair.meetsAAA ? 'AAA-ready' : pair.meetsAA ? 'AA-ready' : 'Below AA';
      return `<li>${index + 1}. <strong>${escapeHtmlText(qualityLabel)}</strong> (${escapeHtmlText(status)}) — Text ${pair.text.toUpperCase()} / Background ${pair.background.toUpperCase()} (${pair.ratio.toFixed(2)}:1), ΔAA ${aaDelta}, ΔAAA ${aaaDelta}</li>`;
    })
    .join('');
  const remediationRows = report.remediationActions
    .map(
      (action, index) =>
        `<li>${index + 1}. <strong>${action.priorityLabel || REMEDIATION_PRIORITY[action.priority] || REMEDIATION_PRIORITY.info}</strong>: ${escapeHtmlText(action.text)}</li>`,
    )
    .join('');
  const textScanSummaryLine = report.textScan
    ? `${report.textScan.summary.total} text-like region${report.textScan.summary.total === 1 ? '' : 's'} detected · ${report.textScan.summary.belowAA} below AA for normal text`
    : 'No text-like regions detected';
  const collisionSummaryLine = report.paletteCollisions
    ? report.paletteCollisions.summary.collisions > 0
      ? `${report.paletteCollisions.summary.collisions} dominant color pair${report.paletteCollisions.summary.collisions === 1 ? '' : 's'} collapse under color-vision deficiency (worst: ${report.paletteCollisions.pairs[0].colorA} vs ${report.paletteCollisions.pairs[0].colorB} under ${getCvdModeShortLabel(report.paletteCollisions.pairs[0].worstModeLabel)})`
      : 'No color-only distinction risks across the dominant palette'
    : 'Not scanned';
  const textScanRows = (report.textScan?.regions || [])
    .map(
      (region) =>
        `<tr><td>${region.rank}</td><td>(${region.x},${region.y}) ${region.width}×${region.height}px</td><td>${escapeHtmlText(region.text)}</td><td>${escapeHtmlText(region.background)}</td><td>${region.ratio.toFixed(2)}:1</td><td>${escapeHtmlText(region.levelLabel)}</td></tr>`,
    )
    .join('');

  const imageCards = entries
    .map((entry, index) => {
      const dataUrl = imageDataUrlFromCanvas(entry.canvas);
      if (!dataUrl) {
        return '';
      }
      const rankLabel = index === 0 ? 'Source' : entry.id;
      const impactText =
        typeof entry.impactPercent === 'number' ? `${entry.impactPercent.toFixed(1)}% pixel change` : 'Impact unavailable';
      return `
        <figure class="packet-card">
          <img src="${dataUrl}" alt="${escapeHtmlText(entry.label)} preview" />
          <figcaption>${escapeHtmlText(rankLabel)}: ${escapeHtmlText(entry.label)} — ${escapeHtmlText(impactText)}</figcaption>
        </figure>
      `;
    })
    .join('');

  const packetHtml = `<!doctype html>
    <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>ClearSight Reviewer Packet — ${escapeHtmlText(sourceFile)}</title>
        <style>
          :root { font-family: Inter, "Segoe UI", system-ui, -apple-system, sans-serif; color: #0f172a; background: #f8fafc; }
          body { margin: 1.25rem; display: grid; gap: 1rem; }
          .packet-grid { display: grid; gap: 0.8rem; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); }
          .packet-card { margin: 0; background: #fff; border: 1px solid #cbd5e1; border-radius: 10px; padding: 0.5rem; }
          img { max-width: 100%; height: auto; display: block; border-radius: 6px; border: 1px solid #e2e8f0; }
          figcaption { font-size: 0.84rem; margin-top: 0.3rem; color: #334155; }
          table { border-collapse: collapse; width: 100%; background: #fff; }
          th, td { border: 1px solid #cbd5e1; padding: 0.35rem; text-align: left; }
          th { background: #f1f5f9; font-size: 0.9rem; }
          section { background: #fff; border: 1px solid #cbd5e1; border-radius: 10px; padding: 0.8rem; }
          h1, h2, h3 { margin: 0.2rem 0 0.6rem; }
        </style>
      </head>
      <body>
        <section>
          <h1>ClearSight Reviewer Packet</h1>
          <p>Generated ${escapeHtmlText(generatedAt)} · ${escapeHtmlText(sourceFile)} · ${renderedWidth}×${renderedHeight}px</p>
          <ul>
            <li>Source: ${escapeHtmlText(sourceFile)}</li>
            <li>Source size: ${escapeHtmlText(sourceDimensionSummary)}</li>
            <li>Downscaled for render: ${report.source.wasDownscaled ? `Yes (${downscaledRatio})` : 'No'}</li>
            <li>Simulation intensity: ${escapeHtmlText(report.simulationIntensity)}%</li>
            <li>Top impact: ${escapeHtmlText(topImpact)}</li>
            <li>Accessibility risk: ${escapeHtmlText(overallRisk)}</li>
            <li>ClearSight Score: ${escapeHtmlText(scoreSummaryLine)}</li>
            <li>Contrast (${escapeHtmlText(report.contrast.text)} on ${escapeHtmlText(report.contrast.background)}): ${escapeHtmlText(contrastRatio)} (${escapeHtmlText(contrastLine)})</li>
            <li>Automatic text scan: ${escapeHtmlText(textScanSummaryLine)}</li>
            <li>Color-only distinction (WCAG 1.4.1): ${escapeHtmlText(collisionSummaryLine)}</li>
          </ul>
        </section>

        <section>
          <h2>Remediation plan</h2>
          <ol>
            ${remediationRows || '<li>No critical remediation items currently identified.</li>'}
          </ol>
        </section>

        <section>
          <h2>Simulation impact ranking</h2>
          <table>
            <thead>
              <tr><th>Mode</th><th>Pixel change</th><th>Risk</th></tr>
            </thead>
            <tbody>
              ${simulationRows || '<tr><td colspan="3">No ranked simulations available.</td></tr>'}
            </tbody>
          </table>
        </section>

        <section>
          <h2>Automatic text contrast scan (worst contrast first)</h2>
          <p>${escapeHtmlText(textScanSummaryLine)}</p>
          <table>
            <thead>
              <tr><th>#</th><th>Region</th><th>Text</th><th>Background</th><th>Ratio</th><th>WCAG level</th></tr>
            </thead>
            <tbody>
              ${textScanRows || '<tr><td colspan="6">No text-like regions detected in the current source scan.</td></tr>'}
            </tbody>
          </table>
        </section>

        <section>
          <h2>Suggested accessible pairs</h2>
          <ol>
            ${suggestionRows || '<li>No suggestions generated yet.</li>'}
          </ol>
        </section>

        <section>
          <h2>Visual pack</h2>
          <div class="packet-grid">
            ${imageCards || '<p>No renders available yet.</p>'}
          </div>
        </section>
      </body>
    </html>`;

  return packetHtml;
}

function downloadReviewerPacket() {
  if (state.isRendering) {
    setMessage('Please wait for rendering to finish before generating the reviewer packet.', 'info');
    return;
  }
  if (!state.hasRenderedSource) {
    setMessage('Render the source and simulations first before downloading a reviewer packet.', 'error');
    return;
  }
  if (!state.modeImpacts.length) {
    setMessage('Render simulations first before downloading a reviewer packet.', 'error');
    return;
  }

  try {
    const packet = buildReviewerPacketHtml();
    const filename = makeExportFileName('reviewer-packet', 'html');
    downloadTextFile(packet, filename, 'text/html;charset=utf-8');
    setMessage(`Downloaded reviewer packet as ${filename}.`, 'success');
  } catch (error) {
    setMessage(error.message, 'error');
  }
}

function drawVerdictCardText(ctx, text, x, y, maxWidth, lineHeight, maxLines = 2) {
  const words = String(text || '').split(/\s+/).filter(Boolean);
  const lines = [];
  let line = '';
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (ctx.measureText(candidate).width <= maxWidth || !line) line = candidate;
    else {
      lines.push(line);
      line = word;
      if (lines.length === maxLines - 1) break;
    }
  }
  if (line && lines.length < maxLines) lines.push(line);
  if (lines.join(' ').split(/\s+/).length < words.length && lines.length) {
    let last = lines.at(-1);
    while (last.length > 1 && ctx.measureText(`${last}…`).width > maxWidth) last = last.slice(0, -1);
    lines[lines.length - 1] = `${last}…`;
  }
  lines.forEach((value, index) => ctx.fillText(value, x, y + index * lineHeight));
}

function buildAuditVerdictCardCanvas() {
  if (!state.hasRenderedSource || !dom.sourceCanvas?.width) throw new Error('Render a source image before building the audit verdict card.');
  const report = buildAccessibilityReport();
  const score = report.accessibilityScore;
  if (!score) throw new Error('Complete the accessibility audit before building the verdict card.');
  const canvas = document.createElement('canvas');
  canvas.width = 1200;
  canvas.height = 630;
  const ctx = canvas.getContext('2d');
  const accent = ({ A: '#2DD4BF', B: '#5EEAD4', C: '#FBBF24', D: '#FB923C', F: '#FB7185' })[score.grade] || '#7DD3FC';
  const panel = '#111C30';
  const muted = '#A9B8D0';
  const bg = ctx.createLinearGradient(0, 0, 1200, 630);
  bg.addColorStop(0, '#07101F'); bg.addColorStop(0.58, '#0B1730'); bg.addColorStop(1, '#102544');
  ctx.fillStyle = bg; ctx.fillRect(0, 0, 1200, 630);
  ctx.fillStyle = 'rgba(45,212,191,.08)'; ctx.beginPath(); ctx.arc(1080, 40, 290, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#EAF8FF'; ctx.font = '700 29px system-ui,sans-serif'; ctx.fillText('ClearSight', 54, 58);
  ctx.fillStyle = accent; ctx.fillRect(54, 75, 62, 5);
  ctx.fillStyle = muted; ctx.font = '600 14px system-ui,sans-serif'; ctx.fillText('PRIVATE · ON-DEVICE ACCESSIBILITY AUDIT', 132, 80);
  ctx.fillStyle = '#FFF'; ctx.font = '700 42px system-ui,sans-serif';
  drawVerdictCardText(ctx, report.source.fileName || 'Screenshot audit', 54, 138, 610, 48, 2);
  ctx.fillStyle = muted; ctx.font = '400 18px system-ui,sans-serif'; ctx.fillText('Measured from the pixels — no upload, no guesswork.', 54, 202);

  ctx.fillStyle = panel; ctx.beginPath(); ctx.roundRect(54, 232, 246, 174, 22); ctx.fill();
  ctx.lineWidth = 12; ctx.strokeStyle = '#263754'; ctx.beginPath(); ctx.arc(126, 311, 49, -Math.PI / 2, Math.PI * 1.5); ctx.stroke();
  ctx.strokeStyle = accent; ctx.beginPath(); ctx.arc(126, 311, 49, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * score.score / 100); ctx.stroke();
  ctx.textAlign = 'center'; ctx.fillStyle = '#FFF'; ctx.font = '800 40px system-ui,sans-serif'; ctx.fillText(String(score.score), 126, 325);
  ctx.textAlign = 'left'; ctx.fillStyle = '#FFF'; ctx.font = '800 26px system-ui,sans-serif'; ctx.fillText(`Grade ${score.grade}`, 193, 298);
  ctx.fillStyle = accent; ctx.font = '700 15px system-ui,sans-serif'; drawVerdictCardText(ctx, score.verdictLabel, 193, 325, 84, 19, 3);
  ctx.fillStyle = muted; ctx.font = '500 13px system-ui,sans-serif'; ctx.fillText('ClearSight Score', 78, 388);

  ctx.fillStyle = panel; ctx.beginPath(); ctx.roundRect(318, 232, 346, 174, 22); ctx.fill();
  ctx.fillStyle = '#FFF'; ctx.font = '700 17px system-ui,sans-serif'; ctx.fillText('Six-axis fingerprint', 340, 263);
  score.axes.forEach((axis, index) => {
    const y = 288 + index * 19;
    const value = Number.isFinite(axis.score) ? Math.round(axis.score) : 0;
    ctx.fillStyle = muted; ctx.font = '500 11px system-ui,sans-serif'; ctx.fillText(axis.label, 340, y);
    ctx.fillStyle = '#263754'; ctx.fillRect(494, y - 8, 125, 8);
    ctx.fillStyle = value >= 90 ? '#2DD4BF' : value >= 70 ? '#FBBF24' : '#FB7185'; ctx.fillRect(494, y - 8, 125 * value / 100, 8);
    ctx.fillStyle = '#EAF8FF'; ctx.textAlign = 'right'; ctx.fillText(Number.isFinite(axis.score) ? String(value) : 'n/a', 642, y); ctx.textAlign = 'left';
  });

  const [thumbX, thumbY, thumbW, thumbH] = [696, 102, 450, 304];
  ctx.fillStyle = panel; ctx.beginPath(); ctx.roundRect(thumbX - 8, thumbY - 8, thumbW + 16, thumbH + 16, 20); ctx.fill();
  const scale = Math.min(thumbW / dom.sourceCanvas.width, thumbH / dom.sourceCanvas.height);
  const [drawW, drawH] = [dom.sourceCanvas.width * scale, dom.sourceCanvas.height * scale];
  ctx.save(); ctx.beginPath(); ctx.roundRect(thumbX, thumbY, thumbW, thumbH, 13); ctx.clip();
  ctx.fillStyle = '#07101F'; ctx.fillRect(thumbX, thumbY, thumbW, thumbH);
  ctx.drawImage(dom.sourceCanvas, thumbX + (thumbW - drawW) / 2, thumbY + (thumbH - drawH) / 2, drawW, drawH); ctx.restore();
  ctx.fillStyle = 'rgba(7,16,31,.88)'; ctx.fillRect(thumbX, thumbY + thumbH - 38, thumbW, 38);
  ctx.fillStyle = '#FFF'; ctx.font = '600 13px system-ui,sans-serif';
  ctx.fillText(`${report.source.renderedSize.width}×${report.source.renderedSize.height}px audited locally`, thumbX + 16, thumbY + thumbH - 14);

  const findings = [
    ['Below AA text', report.textScan?.summary?.belowAA || 0],
    ['CVD hidden', report.textScan?.summary?.cvdHiddenFailures || 0],
    ['Invisible surfaces', report.componentContrast?.summary?.failing || 0],
    ['Small targets', report.targetSizes?.summary?.undersized || 0],
  ];
  findings.forEach(([label, value], index) => {
    const x = 54 + index * 273;
    ctx.fillStyle = panel; ctx.beginPath(); ctx.roundRect(x, 434, 252, 92, 18); ctx.fill();
    ctx.fillStyle = Number(value) > 0 ? '#FB7185' : '#2DD4BF'; ctx.font = '800 31px system-ui,sans-serif'; ctx.fillText(String(value), x + 18, 472);
    ctx.fillStyle = '#FFF'; ctx.font = '650 15px system-ui,sans-serif'; ctx.fillText(label, x + 18, 501);
  });
  ctx.fillStyle = accent; ctx.font = '700 13px system-ui,sans-serif'; ctx.fillText('NEXT BEST ACTION', 54, 563);
  ctx.fillStyle = '#EAF8FF'; ctx.font = '600 17px system-ui,sans-serif';
  drawVerdictCardText(ctx, report.remediationActions?.[0]?.title || 'Review the measured findings and verify fixes.', 54, 590, 790, 22, 1);
  ctx.textAlign = 'right'; ctx.fillStyle = muted; ctx.font = '500 13px system-ui,sans-serif';
  ctx.fillText('clearsight · screenshot accessibility, made visible', 1146, 588); ctx.textAlign = 'left';
  return canvas;
}

function downloadAuditVerdictCard() {
  if (state.isRendering) return setMessage('Please wait for rendering to finish before generating the verdict card.', 'info');
  try {
    const filename = makeExportFileName('audit-verdict-card', 'png');
    downloadCanvasAsImage(buildAuditVerdictCardCanvas(), filename);
    setMessage(`Downloaded presentation-ready audit verdict card as ${filename}.`, 'success');
  } catch (error) { setMessage(error.message, 'error'); }
}

function getRepairChangedPixelCount() {
  return state.completeAuditRepair?.changedPixels ??
    state.componentSurfaceRepair?.changedPixels ??
    state.targetedTextRepair?.changedPixels ??
    null;
}

function drawRepairProofImage(ctx, imageSource, x, y, width, height) {
  const sourceWidth = imageSource.width;
  const sourceHeight = imageSource.height;
  const scale = Math.min(width / sourceWidth, height / sourceHeight);
  const drawWidth = sourceWidth * scale;
  const drawHeight = sourceHeight * scale;
  ctx.fillStyle = '#091221';
  ctx.fillRect(x, y, width, height);
  ctx.drawImage(imageSource, x + (width - drawWidth) / 2, y + (height - drawHeight) / 2, drawWidth, drawHeight);
}

function buildRepairProofCardCanvas() {
  const baseline = state.scoreRepairBaseline;
  const undo = state.imageRepairUndo;
  const current = computeCurrentAccessibilityScore();
  if (!baseline || !undo || !current || !dom.sourceCanvas?.width) {
    throw new Error('Apply and verify a screenshot repair before building the repair proof card.');
  }

  const beforeCanvas = document.createElement('canvas');
  beforeCanvas.width = undo.imageData.width;
  beforeCanvas.height = undo.imageData.height;
  beforeCanvas.getContext('2d').putImageData(undo.imageData, 0, 0);

  const canvas = document.createElement('canvas');
  canvas.width = 1200;
  canvas.height = 630;
  const ctx = canvas.getContext('2d');
  const delta = current.score - baseline.score;
  const improved = delta > 0;
  const accent = improved ? '#2DD4BF' : delta < 0 ? '#FB7185' : '#FBBF24';
  const afterFindings = {
    text: state.textScan?.summary?.belowAA ?? 0,
    components: state.componentScan?.summary?.failing ?? 0,
    targets: state.targetSizeScan?.summary?.undersized ?? 0,
    cvd: state.textScan?.summary?.cvdHiddenFailures ?? 0,
  };

  ctx.fillStyle = '#07111F';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = accent;
  ctx.fillRect(0, 0, 12, canvas.height);
  ctx.fillStyle = '#7DD3FC';
  ctx.font = '800 15px system-ui,sans-serif';
  ctx.fillText('CLEARSIGHT · VERIFIED REPAIR EVIDENCE', 48, 46);
  ctx.fillStyle = '#F8FAFC';
  ctx.font = '800 38px system-ui,sans-serif';
  ctx.fillText(improved ? 'Accessibility improved — proven in pixels.' : 'Repair re-audit complete.', 48, 92);
  ctx.fillStyle = '#94A3B8';
  ctx.font = '500 16px system-ui,sans-serif';
  ctx.fillText('Exact pre-repair pixels compared with the locally repaired screenshot · no upload', 48, 121);

  const imageY = 162;
  drawRepairProofImage(ctx, beforeCanvas, 48, imageY, 430, 270);
  drawRepairProofImage(ctx, dom.sourceCanvas, 722, imageY, 430, 270);
  ctx.strokeStyle = '#26364D';
  ctx.lineWidth = 2;
  ctx.strokeRect(48, imageY, 430, 270);
  ctx.strokeRect(722, imageY, 430, 270);
  ctx.fillStyle = '#E2E8F0';
  ctx.font = '750 15px system-ui,sans-serif';
  ctx.fillText('BEFORE', 48, 153);
  ctx.fillText('AFTER · RE-AUDITED', 722, 153);

  ctx.fillStyle = '#111C30';
  ctx.beginPath();
  ctx.roundRect(500, 185, 200, 220, 22);
  ctx.fill();
  ctx.textAlign = 'center';
  ctx.fillStyle = '#94A3B8';
  ctx.font = '700 13px system-ui,sans-serif';
  ctx.fillText('CLEARSIGHT SCORE', 600, 219);
  ctx.fillStyle = '#F8FAFC';
  ctx.font = '850 32px system-ui,sans-serif';
  ctx.fillText(`${baseline.score}  →  ${current.score}`, 600, 266);
  ctx.fillStyle = accent;
  ctx.font = '850 46px system-ui,sans-serif';
  ctx.fillText(`${delta > 0 ? '+' : ''}${delta}`, 600, 325);
  ctx.font = '750 16px system-ui,sans-serif';
  ctx.fillText('POINTS', 600, 350);
  ctx.fillStyle = '#CBD5E1';
  ctx.font = '650 16px system-ui,sans-serif';
  ctx.fillText(`Grade ${baseline.grade}  →  ${current.grade}`, 600, 383);
  ctx.textAlign = 'left';

  const metrics = [
    ['Below-AA text', baseline.findings?.text ?? 0, afterFindings.text],
    ['Invisible surfaces', baseline.findings?.components ?? 0, afterFindings.components],
    ['Small targets', baseline.findings?.targets ?? 0, afterFindings.targets],
    ['Hidden CVD risks', baseline.findings?.cvd ?? 0, afterFindings.cvd],
  ];
  metrics.forEach(([label, before, after], index) => {
    const x = 48 + index * 276;
    ctx.fillStyle = '#111C30';
    ctx.beginPath();
    ctx.roundRect(x, 460, 254, 91, 16);
    ctx.fill();
    ctx.fillStyle = after < before ? '#2DD4BF' : after > before ? '#FB7185' : '#E2E8F0';
    ctx.font = '800 27px system-ui,sans-serif';
    ctx.fillText(`${before} → ${after}`, x + 17, 498);
    ctx.fillStyle = '#CBD5E1';
    ctx.font = '650 14px system-ui,sans-serif';
    ctx.fillText(label, x + 17, 526);
  });

  const changedPixels = getRepairChangedPixelCount();
  ctx.fillStyle = accent;
  ctx.font = '700 13px system-ui,sans-serif';
  ctx.fillText('VERIFICATION', 48, 589);
  ctx.fillStyle = '#EAF8FF';
  ctx.font = '600 16px system-ui,sans-serif';
  const pixelProof = Number.isFinite(changedPixels) ? `${changedPixels.toLocaleString()} pixels changed` : 'exact pixel snapshot preserved';
  ctx.fillText(`${baseline.kind || 'Screenshot repair'} · ${pixelProof} · all six axes re-audited`, 155, 589);
  ctx.textAlign = 'right';
  ctx.fillStyle = '#64748B';
  ctx.font = '500 13px system-ui,sans-serif';
  ctx.fillText('clearsight · repair claims backed by measured evidence', 1152, 614);
  ctx.textAlign = 'left';
  return canvas;
}

function downloadRepairProofCard() {
  if (state.isRendering) return setMessage('Please wait for the repair re-audit to finish.', 'info');
  try {
    const filename = makeExportFileName('repair-proof-card', 'png');
    downloadCanvasAsImage(buildRepairProofCardCanvas(), filename);
    setMessage(`Downloaded verified before/after repair proof as ${filename}.`, 'success');
  } catch (error) {
    setMessage(error.message, 'error');
  }
}

function getSourceJpegForPdf() {
  const canvas = dom.sourceCanvas;
  if (!canvas?.width || !canvas?.height) {
    return null;
  }
  try {
    const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
    const base64 = dataUrl.split(',')[1] || '';
    if (!base64) {
      return null;
    }
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index += 1) {
      bytes[index] = binary.charCodeAt(index);
    }
    return { data: bytes, width: canvas.width, height: canvas.height };
  } catch {
    return null;
  }
}

function buildAuditPdfBytes() {
  const report = buildAccessibilityReport();
  const doc = buildAuditPdfDoc(report, { image: getSourceJpegForPdf() });
  return buildPdfReport(doc);
}

function downloadAuditPdf() {
  if (state.isRendering) {
    setMessage('Please wait for rendering to finish before generating the PDF report.', 'info');
    return;
  }
  if (!state.hasRenderedSource) {
    setMessage('Render the source and simulations first before downloading the PDF report.', 'error');
    return;
  }
  if (!state.modeImpacts.length) {
    setMessage('Render simulations first before downloading the PDF report.', 'error');
    return;
  }

  try {
    const bytes = buildAuditPdfBytes();
    const filename = makeExportFileName('audit-report', 'pdf');
    downloadBlob(new Blob([bytes], { type: 'application/pdf' }), filename);
    setMessage(`Downloaded PDF audit report as ${filename}.`, 'success');
  } catch (error) {
    setMessage(error.message, 'error');
  }
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

function buildConformanceSummaryPayload() {
  let markdown = null;
  try {
    markdown = buildConformanceStatementMarkdown(buildAccessibilityReport(), {
      sourceName: state.sourceName || null,
    });
  } catch {
    return null;
  }
  return {
    markdown,
    filename: `${getSafeFileName(state.sourceName || 'clearsight-source')}-conformance-summary.md`,
  };
}

function downloadConformanceSummary() {
  if (state.isRendering) {
    setMessage('Please wait for rendering to finish before generating the conformance summary.', 'info');
    return;
  }
  if (!state.hasRenderedSource) {
    setMessage('Render the source and simulations first before generating the conformance summary.', 'error');
    return;
  }

  const payload = buildConformanceSummaryPayload();
  if (!payload) {
    setMessage('Unable to build the conformance summary from the current audit state.', 'error');
    return;
  }
  downloadTextFile(payload.markdown, payload.filename, 'text/markdown;charset=utf-8');
  setMessage(
    `Downloaded WCAG conformance summary as ${payload.filename} — criterion-by-criterion outcomes with measured evidence and an honest manual-testing scope.`,
    'success',
  );
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

function getContrastSuggestionTarget(contrastResult) {
  const currentTarget = Number(state.currentContrastAaThreshold || AA_THRESHOLD_DEFAULT);
  if (!contrastResult) {
    return currentTarget;
  }

  if (!contrastResult.passesAA) {
    return currentTarget;
  }

  if (!contrastResult.passesAAA) {
    return AAA_THRESHOLD_DEFAULT;
  }

  return currentTarget;
}

function getContrastSuggestionQualityMeta(ratio, aaTarget = AA_THRESHOLD_DEFAULT, aaaTarget = AAA_THRESHOLD_DEFAULT) {
  const safeRatio = Number(ratio);
  const safeAaTarget = Number.isFinite(aaTarget) ? aaTarget : AA_THRESHOLD_DEFAULT;
  const safeAaaTarget = Number.isFinite(aaaTarget) ? aaaTarget : AAA_THRESHOLD_DEFAULT;

  if (!Number.isFinite(safeRatio)) {
    return {
      quality: CONTRAST_SUGGESTION_QUALITY_BELOW,
      qualityLabel: 'Below AA target',
      aaDelta: null,
      aaaDelta: null,
      meetsAA: false,
      meetsAAA: false,
    };
  }

  const aaDelta = safeRatio - safeAaTarget;
  const aaaDelta = safeRatio - safeAaaTarget;

  if (safeRatio >= safeAaaTarget) {
    return {
      quality: CONTRAST_SUGGESTION_QUALITY_AAA,
      qualityLabel: 'AAA-ready',
      aaDelta,
      aaaDelta,
      meetsAA: true,
      meetsAAA: true,
    };
  }

  return {
    quality: safeRatio >= safeAaTarget ? CONTRAST_SUGGESTION_QUALITY_AA : CONTRAST_SUGGESTION_QUALITY_BELOW,
    qualityLabel: safeRatio >= safeAaTarget ? 'AA-ready' : 'Below AA target',
    aaDelta,
    aaaDelta,
    meetsAA: safeRatio >= safeAaTarget,
    meetsAAA: safeRatio >= safeAaaTarget,
  };
}

function decorateSuggestionPairs(pairs, aaTarget = AA_THRESHOLD_DEFAULT, aaaTarget = AAA_THRESHOLD_DEFAULT) {
  if (!Array.isArray(pairs)) {
    return [];
  }

  const decorated = pairs.map((pair) => {
    const quality = getContrastSuggestionQualityMeta(pair?.ratio, aaTarget, aaaTarget);
    return {
      ...pair,
      ...quality,
    };
  });
  return rankSuggestionsByCvdSafety(decorated, aaTarget).slice(0, 4);
}

function getCvdModeShortLabel(label) {
  return String(label || '').split(' (')[0];
}

function buildCvdProjectionHtml(projection) {
  if (!projection?.projections?.length) {
    return '';
  }

  const worst = projection.worst;
  const failingCount = projection.failingModes.length;
  let headline;
  let headlineClass = 'cvd-projection-note--ok';
  if (projection.hiddenFailure) {
    headlineClass = 'cvd-projection-note--hidden';
    headline = `Hidden failure: passes AA for typical vision, but drops below ${projection.aaThreshold.toFixed(1)}:1 for ${failingCount} color-vision mode${failingCount === 1 ? '' : 's'} — worst is ${getCvdModeShortLabel(worst.label)} at ${worst.ratio.toFixed(2)}:1.`;
  } else if (!projection.basePassesAA) {
    headlineClass = 'cvd-projection-note--fail';
    headline = `Below AA for typical vision; worst color-vision projection is ${getCvdModeShortLabel(worst.label)} at ${worst.ratio.toFixed(2)}:1.`;
  } else {
    headline = `Holds AA across all ${projection.projections.length} color-vision projections (worst: ${getCvdModeShortLabel(worst.label)} at ${worst.ratio.toFixed(2)}:1).`;
  }

  const chips = projection.projections
    .map((entry) => {
      const shortLabel = getCvdModeShortLabel(entry.label);
      const stateClass = entry.passesAA ? 'cvd-chip--pass' : 'cvd-chip--fail';
      return `<span class="cvd-chip ${stateClass}" title="${shortLabel}: projected ${entry.ratio.toFixed(2)}:1 (${entry.passesAA ? 'passes' : 'fails'} AA ${projection.aaThreshold.toFixed(1)})">${shortLabel} ${entry.ratio.toFixed(2)}:1</span>`;
    })
    .join('');

  return `
    <div class="cvd-projection" id="cvdProjection" data-hidden-failure="${projection.hiddenFailure}">
      <span class="cvd-projection-title">Color-vision projected contrast</span>
      <span class="cvd-projection-note ${headlineClass}">${headline}</span>
      <div class="cvd-projection-chips" role="list" aria-label="Projected contrast ratio for each color-vision deficiency mode">${chips}</div>
    </div>
  `;
}

function buildApcaReadoutHtml(comparison) {
  if (!comparison?.apca) {
    return '';
  }

  const { apca, falsePass, overStrict, wcagRatio } = comparison;
  const lcLabel = `Lc ${Math.round(apca.absLc)}`;
  const polarityLabel = apca.polarity === 'light-on-dark' ? 'light text on dark' : 'dark text on light';
  let headline;
  let headlineClass = 'cvd-projection-note--ok';
  if (falsePass) {
    headlineClass = 'cvd-projection-note--hidden';
    headline = `Perceptual false pass: WCAG 2 reports ${wcagRatio.toFixed(2)}:1 (AA pass), but APCA scores only ${lcLabel} — below the Lc 60 fluent-text minimum. Treat this pair as failing for body text.`;
  } else if (overStrict) {
    headline = `WCAG 2 fails this pair at ${wcagRatio.toFixed(2)}:1, yet APCA rates it ${lcLabel} (${apca.rating.toLowerCase()}) — perceptually stronger than the ratio suggests. Still fix it for WCAG 2 compliance.`;
  } else if (!apca.passesFluentText) {
    headlineClass = 'cvd-projection-note--fail';
    headline = `${lcLabel} (${polarityLabel}) — ${apca.rating.toLowerCase()}; agrees with WCAG 2 that this pair needs work.`;
  } else {
    headline = `${lcLabel} (${polarityLabel}) — ${apca.rating.toLowerCase()}; agrees with WCAG 2.`;
  }

  const tiers = [
    { label: 'Body text · Lc 75+', pass: apca.passesBodyText },
    { label: 'Fluent/large · Lc 60+', pass: apca.passesFluentText },
    { label: 'Spot text · Lc 30+', pass: apca.passesSpotText },
    { label: 'Non-text · Lc 15+', pass: apca.passesNonText },
  ];
  const chips = tiers
    .map(
      (tier) =>
        `<span class="cvd-chip ${tier.pass ? 'cvd-chip--pass' : 'cvd-chip--fail'}" title="${tier.label}: ${tier.pass ? 'meets' : 'below'} this APCA usage tier at Lc ${apca.absLc.toFixed(1)}">${tier.label} ${tier.pass ? '✓' : '✗'}</span>`,
    )
    .join('');

  return `
    <div class="cvd-projection apca-readout" id="apcaReadout" data-false-pass="${falsePass}">
      <span class="cvd-projection-title">APCA perceptual contrast (WCAG 3 draft)</span>
      <span class="apca-lc-value" aria-label="APCA lightness contrast ${apca.absLc.toFixed(1)}">${lcLabel}<small>${apca.lc >= 0 ? '' : ' (negative: light-on-dark)'}</small></span>
      <span class="cvd-projection-note ${headlineClass}">${headline}</span>
      <div class="cvd-projection-chips" role="list" aria-label="APCA usage tiers for this pair">${chips}</div>
    </div>
  `;
}

// Guards against re-entry: renderContrastResult refreshes the accessibility
// summary and judge snapshot, whose report builders must never trigger
// another contrast render (that recursion overflows the stack).
let isRenderingContrastResult = false;

function renderContrastResult() {
  clearContrastValidation();
  isRenderingContrastResult = true;
  try {
    const { text, background } = resolveContrastInputs();
    const aaThreshold = (dom.contrastLargeText?.checked ? AA_THRESHOLD_LARGE_TEXT : AA_THRESHOLD_DEFAULT);
    const result = evaluateContrast(text, background, aaThreshold, AAA_THRESHOLD_DEFAULT);
    const aaMargin = result.ratio - aaThreshold;
    const aaaMargin = result.ratio - AAA_THRESHOLD_DEFAULT;
    const largeTextMargin = result.ratio - AA_THRESHOLD_LARGE_TEXT;
    const ratio = result.ratio.toFixed(2);
    state.currentContrastAaThreshold = aaThreshold;
    state.lastContrastResult = {
      ...result,
      aaThreshold,
      aaaThreshold: AAA_THRESHOLD_DEFAULT,
      aaMargin,
      aaaMargin,
      largeTextMargin,
    };
    try {
      state.lastCvdProjection = projectContrastAcrossCvdModes(text, background, { aaThreshold });
    } catch {
      state.lastCvdProjection = null;
    }
    try {
      state.lastApcaComparison = compareWcagVsApca(text, background, { aaThreshold });
    } catch {
      state.lastApcaComparison = null;
    }
    const suggestionTarget = getContrastSuggestionTarget(result);
    try {
      const suggestionPairs = result.passesAA && result.passesAAA
        ? []
        : suggestAccessiblePairs(text.hex, background.hex, suggestionTarget, 24, true);
      state.lastSuggestionPairs = decorateSuggestionPairs(suggestionPairs, aaThreshold, AAA_THRESHOLD_DEFAULT);
    } catch {
      state.lastSuggestionPairs = [];
    }
    renderAccessibilitySummary();
    const topSuggestion = state.lastSuggestionPairs?.[0];
    const isAaaUpgradeSuggestion = result.passesAA && !result.passesAAA;
    const suggestionQuality = topSuggestion?.qualityLabel
      ? topSuggestion.qualityLabel
      : getContrastSuggestionQualityMeta(topSuggestion?.ratio, aaThreshold, AAA_THRESHOLD_DEFAULT).qualityLabel;
    const suggestionPrefix = isAaaUpgradeSuggestion
      ? 'Suggested AAA-upgrade pair:'
      : 'Suggested starter pair:';
    const suggestionQualityClass = topSuggestion?.quality === CONTRAST_SUGGESTION_QUALITY_AA
      ? 'suggestion-tier--aa-ready'
      : topSuggestion?.quality === CONTRAST_SUGGESTION_QUALITY_AAA
        ? 'suggestion-tier--aaa-ready'
        : 'suggestion-tier--below';
    const quickSuggestion = topSuggestion
      ? `
          <div class="contrast-suggestion-row">
            <span>
              ${suggestionPrefix}
              <strong>${topSuggestion.text.toUpperCase()}</strong> on
              <strong>${topSuggestion.background.toUpperCase()}</strong> (${topSuggestion.ratio.toFixed(2)}:1)
            </span>
            <span class="suggestion-tier ${suggestionQualityClass}">${suggestionQuality}</span>
            <span class="suggestion-tier ${topSuggestion.cvdSafe ? 'suggestion-tier--cvd-safe' : 'suggestion-tier--cvd-risk'}">${topSuggestion.cvdSafe ? 'CVD-safe · 7/7 modes' : `CVD risk · ${topSuggestion.cvdFailingModes.length} mode${topSuggestion.cvdFailingModes.length === 1 ? '' : 's'}`}</span>
            <button type="button" class="tiny-btn contrast-suggestion-btn">Apply best suggestion</button>
          </div>
        `
      : '';

      dom.contrastOut.innerHTML = `
      <span>Contrast: <strong>${ratio}:1</strong></span>
      <span>AA (${state.currentContrastAaThreshold.toFixed(1)}): <strong>${result.passesAA ? 'PASS' : 'FAIL'}</strong> (${formatContrastMargin(aaMargin)})</span>
      <span>AAA (${state.lastContrastResult.aaaThreshold.toFixed(1)}): <strong>${result.passesAAA ? 'PASS' : 'FAIL'}</strong> (${formatContrastMargin(aaaMargin)})</span>
      <span>Large text AA: <strong>${result.passesLAA ? 'PASS' : 'FAIL'}</strong> (${formatContrastMargin(largeTextMargin)})</span>
      ${buildApcaReadoutHtml(state.lastApcaComparison)}
      ${buildCvdProjectionHtml(state.lastCvdProjection)}
      ${quickSuggestion}
    `;
    updateWorkflowChecklist();
    setMessage('Contrast checked successfully.', 'success');

    if (topSuggestion) {
      const quickApplyBtn = dom.contrastOut.querySelector('.contrast-suggestion-btn');
      if (quickApplyBtn) {
        quickApplyBtn.addEventListener('click', () => {
          quickApplyBtn.disabled = true;
          try {
            const applied = setContrastPair(topSuggestion.text, topSuggestion.background, { trackUndo: true });
            if (!applied) {
              setMessage('Unable to apply this suggestion.', 'error');
              return;
            }
            state.lastAppliedContrastSuggestion = {
              text: topSuggestion.text.toUpperCase(),
              background: topSuggestion.background.toUpperCase(),
              ratio: topSuggestion.ratio,
              source: 'contrast-toolbar',
            };
            const updated = renderContrastResult();
            renderSuggestions();
            if (updated?.passesAA) {
              setMessage(`Applied suggestion: ${topSuggestion.text.toUpperCase()} on ${topSuggestion.background.toUpperCase()}.`, 'success');
            } else {
              setMessage(
                `Applied best suggestion. Updated ratio ${updated?.ratio?.toFixed?.(2) || 'N/A'}:1 (still needs improvement).`,
                'info',
              );
            }
          } finally {
            quickApplyBtn.disabled = false;
          }
        });
      }
    }

    updateSuggestionExportButtonState();
    return result;
  } catch (error) {
    dom.contrastOut.textContent = error.message;
    setContrastValidation(error.message);
    state.lastContrastResult = null;
    state.lastCvdProjection = null;
    state.lastApcaComparison = null;
    state.currentContrastAaThreshold = AA_THRESHOLD_DEFAULT;
    state.lastSuggestionPairs = [];
    renderAccessibilitySummary();
    updateWorkflowChecklist();
    updateSuggestionExportButtonState();
    setMessage(error.message, 'error');
    return null;
  } finally {
    isRenderingContrastResult = false;
  }
}

function buildContrastResultText(result) {
  if (!result) {
    return null;
  }

  const text = normalizeHexInput(dom.contrastTextHex?.value || dom.contrastText?.value || '');
  const background = normalizeHexInput(dom.contrastBgHex?.value || dom.contrastBg?.value || '');

  if (!text || !background) {
    return null;
  }

  const aaThreshold = state.currentContrastAaThreshold || AA_THRESHOLD_DEFAULT;
  const aaaThreshold = state.lastContrastResult?.aaaThreshold ?? AAA_THRESHOLD_DEFAULT;

  return [
    '# ClearSight Contrast Check',
    `Text color: ${text.toUpperCase()}`,
    `Background color: ${background.toUpperCase()}`,
    `Contrast ratio: ${result.ratio.toFixed(2)}:1`,
    `AA (${aaThreshold.toFixed(1)}): ${result.passesAA ? 'PASS' : 'FAIL'} (${formatContrastMargin(result.aaMargin ?? result.ratio - aaThreshold)})`,
    `AAA (${aaaThreshold.toFixed(1)}): ${result.passesAAA ? 'PASS' : 'FAIL'} (${formatContrastMargin(result.aaaMargin ?? result.ratio - aaaThreshold)})`,
    `Large-text AA: ${result.passesLAA ? 'PASS' : 'FAIL'} (${formatContrastMargin(result.largeTextMargin ?? result.ratio - AA_THRESHOLD_LARGE_TEXT)})`,
    ...(state.lastCvdProjection
      ? [
          `Color-vision projection: worst ${getCvdModeShortLabel(state.lastCvdProjection.worst.label)} at ${state.lastCvdProjection.worst.ratio.toFixed(2)}:1${state.lastCvdProjection.hiddenFailure ? ' (HIDDEN FAILURE: passes AA only for typical vision)' : ''}`,
        ]
      : []),
    ...(state.lastApcaComparison
      ? [
          `APCA (WCAG 3 draft): Lc ${Math.round(state.lastApcaComparison.apca.absLc)} (${state.lastApcaComparison.apca.polarity}) — ${state.lastApcaComparison.apca.rating}${state.lastApcaComparison.falsePass ? ' (PERCEPTUAL FALSE PASS: WCAG 2 passes but APCA scores below the Lc 60 fluent-text minimum)' : ''}`,
        ]
      : []),
  ].join('\n');
}

function formatContrastMargin(value, decimals = 2) {
  if (!Number.isFinite(value)) {
    return 'Δ N/A';
  }

  const safeValue = Math.abs(value) < Number.EPSILON ? 0 : value;
  return `Δ ${safeValue >= 0 ? '+' : ''}${safeValue.toFixed(decimals)}`;
}

function buildContrastColorPairCssSnippet({ text, background, ratio }) {
  const normalizedText = normalizeHexInput(text);
  const normalizedBg = normalizeHexInput(background);
  if (!normalizedText || !normalizedBg) {
    return '';
  }

  const ratioValue = Number.isFinite(ratio) ? `${ratio.toFixed(2)}:1` : 'N/A';

  return [
    '/* ClearSight contrast pair */',
    ':root {',
    `  --cs-text: ${normalizedText.toUpperCase()};`,
    `  --cs-background: ${normalizedBg.toUpperCase()};`,
    `  --cs-contrast-ratio: ${ratioValue};`,
    '}',
    '',
    '.accessible-text {',
    '  color: var(--cs-text);',
    '}',
    '',
    '.accessible-surface {',
    '  color: var(--cs-text);',
    '  background-color: var(--cs-background);',
    '}',
  ].join('\n');
}

async function copyContrastResult() {
  const result = renderContrastResult();
  if (!result) {
    return;
  }

  const payload = buildContrastResultText(result);
  if (!payload) {
    setMessage('Contrast result is incomplete and cannot be copied.', 'error');
    return;
  }

  await copyTextWithFallback({
    payload,
    filename: 'clearsight-contrast-result.txt',
    mimeType: 'text/plain;charset=utf-8',
    copiedMessage: 'Contrast result copied to clipboard.',
    downloadMessage: 'Clipboard unavailable, contrast result downloaded for manual copy.',
    statusReporter: (message, type) => setMessage(message, type),
  });
}

async function copyCurrentContrastCssSnippet() {
  const result = renderContrastResult();
  if (!result) {
    return;
  }

  const text = normalizeHexInput(dom.contrastTextHex?.value || dom.contrastText?.value || '');
  const background = normalizeHexInput(dom.contrastBgHex?.value || dom.contrastBg?.value || '');

  const payload = buildContrastColorPairCssSnippet({
    text,
    background,
    ratio: result.ratio,
  });

  if (!payload) {
    setMessage('Contrast color values are not available for CSS export.', 'error');
    return;
  }

  await copyTextWithFallback({
    payload,
    filename: 'clearsight-contrast-pair.css',
    mimeType: 'text/css;charset=utf-8',
    copiedMessage: 'Contrast CSS snippet copied.',
    downloadMessage: 'Clipboard unavailable, contrast CSS snippet downloaded.',
    statusReporter: (message, type) => setMessage(message, type),
  });
}

async function copyContrastSuggestionsCsv() {
  if (!state.sourceImage) {
    setMessage('Load and check a source image before exporting suggestions.', 'error');
    return;
  }

  if (state.isRendering) {
    setDemoCopyStatus('Finish rendering before copying suggestions.');
    return;
  }

  if (!state.lastSuggestionPairs?.length) {
    const result = renderContrastResult();
    if (!result || !state.lastSuggestionPairs.length) {
      setDemoCopyStatus('Run contrast check and suggestion generation first.');
      return;
    }
  }

  const payload = buildContrastSuggestionsCsv();
  if (!payload) {
    setDemoCopyStatus('No suggestion data is available to export.');
    return;
  }

  const safeBase = getSafeFileName(state.sourceName || 'clearsight-source');
  await copyTextWithFallback({
    payload,
    filename: `${safeBase}-contrast-suggestions.csv`,
    mimeType: 'text/csv;charset=utf-8',
    copiedMessage: 'Contrast suggestion list copied.',
    downloadMessage: 'Clipboard unavailable, contrast suggestion CSV downloaded for manual copy.',
    statusReporter: (message, type) => setDemoCopyStatus(message),
  });
}

async function copyContrastSuggestionsJson() {
  if (!state.sourceImage) {
    setDemoCopyStatus('Load and check a source image before exporting suggestions.');
    return;
  }

  if (state.isRendering) {
    setDemoCopyStatus('Finish rendering before copying suggestions.');
    return;
  }

  if (!state.lastSuggestionPairs?.length) {
    const result = renderContrastResult();
    if (!result || !state.lastSuggestionPairs.length) {
      setDemoCopyStatus('Run contrast check and suggestion generation first.');
      return;
    }
  }

  const payload = buildContrastSuggestionsJson();
  if (!payload) {
    setDemoCopyStatus('No suggestion data is available to copy.');
    return;
  }

  const safeBase = getSafeFileName(state.sourceName || 'clearsight-source');
  await copyTextWithFallback({
    payload,
    filename: `${safeBase}-contrast-suggestions.json`,
    mimeType: 'application/json;charset=utf-8',
    copiedMessage: 'Contrast suggestion list copied as JSON.',
    downloadMessage: 'Clipboard unavailable, contrast suggestion JSON downloaded for manual copy.',
    statusReporter: (message, type) => setDemoCopyStatus(message),
  });
}

async function downloadContrastSuggestionsCsv() {
  if (!state.sourceImage) {
    setMessage('Load and check a source image before downloading suggestions.', 'error');
    return;
  }

  if (state.isRendering) {
    setMessage('Please wait for rendering to finish before downloading suggestion artifacts.', 'info');
    return;
  }

  const payloads = resolveContrastSuggestionExportPayloads();
  if (!payloads) {
    setMessage('Run contrast check and suggestion generation first.', 'error');
    return;
  }

  if (!payloads.csv) {
    setMessage('No suggestion CSV data is available to download.', 'error');
    return;
  }

  try {
    downloadTextFile(payloads.csv, `${payloads.safeBase}-contrast-suggestions.csv`, 'text/csv;charset=utf-8');
    setMessage('Downloaded contrast suggestion list as CSV.', 'success');
  } catch (error) {
    setMessage(error.message, 'error');
  }
}

async function downloadContrastSuggestionsJson() {
  if (!state.sourceImage) {
    setMessage('Load and check a source image before downloading suggestions.', 'error');
    return;
  }

  if (state.isRendering) {
    setMessage('Please wait for rendering to finish before downloading suggestion artifacts.', 'info');
    return;
  }

  const payloads = resolveContrastSuggestionExportPayloads();
  if (!payloads) {
    setMessage('Run contrast check and suggestion generation first.', 'error');
    return;
  }

  if (!payloads.json) {
    setMessage('No suggestion JSON data is available to download.', 'error');
    return;
  }

  try {
    downloadTextFile(
      payloads.json,
      `${payloads.safeBase}-contrast-suggestions.json`,
      'application/json;charset=utf-8',
    );
    setMessage('Downloaded contrast suggestion list as JSON.', 'success');
  } catch (error) {
    setMessage(error.message, 'error');
  }
}

function downloadContrastSnapshot() {
  if (state.isRendering) {
    setMessage('Please wait for rendering to finish before downloading a contrast snapshot.', 'info');
    return;
  }

  const result = renderContrastResult();
  if (!result) {
    return;
  }

  const snapshotText = buildContrastResultText(result);
  if (!snapshotText) {
    setMessage('Contrast result is incomplete and cannot be snapshotted.', 'error');
    return;
  }

  const lines = [
    ...snapshotText.split('\n'),
    '',
    `Source: ${state.sourceName || 'No image loaded'}`,
    `Rendered size: ${state.renderSize.width || 0}×${state.renderSize.height || 0}px`,
    `Simulation intensity: ${state.simulationSeverityPercent || SIMULATION_SEVERITY_DEFAULT_PERCENT}%`,
  ];

  if (state.lastAppliedContrastSuggestion) {
    lines.push(
      `Last applied suggestion: text ${state.lastAppliedContrastSuggestion.text} on ${state.lastAppliedContrastSuggestion.background} (${state.lastAppliedContrastSuggestion.ratio?.toFixed?.(2) || 'N/A'}:1)`,
    );
  }

  try {
    const snapshotCanvas = buildContrastSnapshotCanvas({
      title: 'ClearSight Contrast Snapshot',
      lines,
    });
    const filename = makeExportFileName('contrast-snapshot', 'png');
    downloadCanvasAsImage(snapshotCanvas, filename);
    setMessage(`Downloaded contrast snapshot as ${filename}.`, 'success');
  } catch (error) {
    setMessage(error.message, 'error');
  }
}

function autoFixContrastPair() {
  const result = renderContrastResult();
  if (!result) {
    return;
  }

  if (result.passesAA) {
    setMessage('Current contrast already passes the current AA target. No auto-fix needed.', 'info');
    return;
  }

  const textHex = normalizeHexInput(dom.contrastTextHex?.value || dom.contrastText?.value);
  const backgroundHex = normalizeHexInput(dom.contrastBgHex?.value || dom.contrastBg?.value);
  const targetRatio = state.currentContrastAaThreshold || AA_THRESHOLD_DEFAULT;

  if (!textHex || !backgroundHex) {
    setMessage('Set valid color values first before auto-fixing contrast.', 'error');
    return;
  }

  let suggestions;
  try {
    suggestions = suggestAccessiblePairs(textHex, backgroundHex, targetRatio, 1, true);
  } catch (error) {
    setMessage(error.message, 'error');
    return;
  }

  if (!suggestions.length) {
    setMessage('Unable to generate a contrast-fix pair for the current colors.', 'error');
    return;
  }

  const bestSuggestion = suggestions[0];
  const isFallback = bestSuggestion.ratio < targetRatio;
  const quality = getContrastSuggestionQualityMeta(bestSuggestion.ratio, targetRatio, AAA_THRESHOLD_DEFAULT);

  state.lastAppliedContrastSuggestion = {
    text: bestSuggestion.text.toUpperCase(),
    background: bestSuggestion.background.toUpperCase(),
    ratio: bestSuggestion.ratio,
    source: 'auto-fix',
  };
  if (!setContrastPair(bestSuggestion.text, bestSuggestion.background, { trackUndo: true })) {
    setMessage('Unable to apply the auto-fix contrast pair.', 'error');
    return;
  }
  const updated = renderContrastResult();
  renderSuggestions();

  if (updated?.passesAA) {
    if (isFallback) {
      setMessage(
        `Auto-fix applied closest fallback: ${bestSuggestion.text.toUpperCase()} on ${bestSuggestion.background.toUpperCase()} (${bestSuggestion.ratio.toFixed(2)}:1).`,
        'info',
      );
      return;
    }
    setMessage(
      `Auto-fix applied: ${bestSuggestion.text.toUpperCase()} on ${bestSuggestion.background.toUpperCase()} (${bestSuggestion.ratio.toFixed(2)}:1).`,
      'success',
    );
  } else {
    const ratioInfo =
      typeof quality?.qualityLabel === 'string' ? quality.qualityLabel.toLowerCase() : `Δ${(bestSuggestion.ratio - targetRatio).toFixed(2)}`;
    setMessage(
      `Applied ${ratioInfo} fallback pair ${bestSuggestion.text.toUpperCase()} on ${bestSuggestion.background.toUpperCase()} (${bestSuggestion.ratio.toFixed(2)}:1).`,
      'info',
    );
  }
}

async function copyPalettePairToClipboard(pair) {
  if (!pair || typeof pair.text !== 'string' || typeof pair.background !== 'string') {
    return false;
  }

  const normalizedText = pair.text.toUpperCase();
  const normalizedBackground = pair.background.toUpperCase();
  const payload = `text: ${normalizedText}\nbackground: ${normalizedBackground}`;

  return copyTextWithFallback({
    payload,
    filename: `${getSafeFileName(normalizedText)}-${getSafeFileName(normalizedBackground)}-contrast-pair.txt`,
    mimeType: 'text/plain;charset=utf-8',
    copiedMessage: 'Contrast pair values copied to clipboard.',
    downloadMessage: 'Clipboard unavailable, contrast pair values downloaded for manual copy.',
    statusReporter: () => {},
  });
}

async function copyContrastPairCss(pair) {
  const snippet = buildContrastColorPairCssSnippet({
    text: pair.text,
    background: pair.background,
    ratio: pair.ratio,
  });

  if (!snippet) {
    return false;
  }

  return copyTextWithFallback({
    payload: snippet,
    filename: `${getSafeFileName(pair.text)}-${getSafeFileName(pair.background)}-cs-colors.css`,
    mimeType: 'text/css;charset=utf-8',
    copiedMessage: 'Contrast pair CSS copied to clipboard.',
    downloadMessage: 'Clipboard unavailable, contrast CSS snippet downloaded for manual copy.',
    statusReporter: (message, type) => setMessage(message, type),
  });
}

function renderSuggestions() {
  const result = renderContrastResult();
  if (!result) {
    setDefaultSuggestionsState();
    updateSuggestionExportButtonState();
    return;
  }

  if (result.passesAA && result.passesAAA) {
    dom.suggestionWrap.innerHTML = '';
    const upToDate = document.createElement('p');
    upToDate.className = 'muted';
    upToDate.textContent = 'Current pair already passes AA and AAA targets.';
    dom.suggestionWrap.appendChild(upToDate);
    state.lastSuggestionPairs = [];
    updateSuggestionExportButtonState();
    return;
  }

  const suggestionTarget = getContrastSuggestionTarget(result);
  const targetLabel = suggestionTarget === AAA_THRESHOLD_DEFAULT
    ? 'AAA'
    : `${suggestionTarget.toFixed(1)}:1`;
  let suggestions;
  try {
    const rawSuggestions = suggestAccessiblePairs(
      dom.contrastTextHex.value,
      dom.contrastBgHex.value,
      suggestionTarget,
      24,
      true,
    );
    suggestions = decorateSuggestionPairs(
      rawSuggestions,
      state.currentContrastAaThreshold,
      AAA_THRESHOLD_DEFAULT,
    );
  } catch (error) {
    state.lastSuggestionPairs = [];
    setMessage(error.message, 'error');
    return;
  }

  dom.suggestionWrap.innerHTML = '';

  const hasExactMatch = suggestions.some((pair) => pair.ratio >= suggestionTarget);
  if (!suggestions.length) {
    const empty = document.createElement('p');
    empty.className = 'muted';
    empty.textContent = `No replacement pairs met the ${targetLabel} contrast threshold.`;
    dom.suggestionWrap.appendChild(empty);
    state.lastSuggestionPairs = [];
    updateSuggestionExportButtonState();
    return;
  }

  state.lastSuggestionPairs = suggestions;
  if (!hasExactMatch) {
    const fallbackNotice = document.createElement('p');
    fallbackNotice.className = 'muted';
    fallbackNotice.textContent = `No pair met ${targetLabel}. Showing closest available alternatives for this color pair.`;
    dom.suggestionWrap.appendChild(fallbackNotice);
  }
  updateSuggestionExportButtonState();

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

    const tierRow = document.createElement('div');
    const tier = pair.quality || getContrastSuggestionQualityMeta(pair.ratio, state.currentContrastAaThreshold, AAA_THRESHOLD_DEFAULT);
    const tierLabel = tier.qualityLabel || 'Contrast quality unknown';
    const tierClass = tier.quality === CONTRAST_SUGGESTION_QUALITY_AA
      ? 'suggestion-tier--aa-ready'
      : tier.quality === CONTRAST_SUGGESTION_QUALITY_AAA
        ? 'suggestion-tier--aaa-ready'
        : 'suggestion-tier--below';

    const tierBadge = document.createElement('span');
    tierBadge.className = `suggestion-tier ${tierClass}`;
    tierBadge.textContent = tierLabel;
    tierRow.appendChild(tierBadge);

    const cvdBadge = document.createElement('span');
    cvdBadge.className = `suggestion-tier ${pair.cvdSafe ? 'suggestion-tier--cvd-safe' : 'suggestion-tier--cvd-risk'}`;
    const worstMode = getCvdModeShortLabel(pair.cvdProjection?.worst?.label || pair.cvdWorstMode);
    cvdBadge.textContent = pair.cvdSafe
      ? `CVD-safe · worst ${pair.cvdWorstRatio.toFixed(2)}:1`
      : `CVD risk · ${worstMode} ${pair.cvdWorstRatio.toFixed(2)}:1`;
    cvdBadge.title = pair.cvdSafe
      ? 'Verified at the AA threshold across all seven simulated color-vision modes.'
      : `Falls below AA in ${pair.cvdFailingModes.length} simulated color-vision mode${pair.cvdFailingModes.length === 1 ? '' : 's'}.`;
    tierRow.appendChild(cvdBadge);

    const applyBtn = document.createElement('button');
    applyBtn.type = 'button';
    applyBtn.className = 'palette-apply-btn';
    applyBtn.textContent = 'Apply';

    applyBtn.addEventListener('click', async () => {
      applyBtn.disabled = true;
      try {
        const applied = setContrastPair(pair.text, pair.background, { trackUndo: true });
        if (!applied) {
          setMessage('Unable to apply this contrast pair.', 'error');
          return;
        }
        state.lastAppliedContrastSuggestion = {
          text: pair.text.toUpperCase(),
          background: pair.background.toUpperCase(),
          ratio: pair.ratio,
          source: 'palette-card',
        };

        let copied = false;
        try {
          copied = await copyPalettePairToClipboard(pair);
        } catch {
          copied = false;
        }

        renderContrastResult();
        if (copied) {
          setMessage('Applied palette and copied raw pair values.', 'success');
        } else {
          setMessage('Applied palette.', 'info');
        }
      } finally {
        applyBtn.disabled = false;
      }
    });

    const copyPairBtn = document.createElement('button');
    copyPairBtn.type = 'button';
    copyPairBtn.className = 'palette-apply-btn';
    copyPairBtn.textContent = 'Copy values';

    copyPairBtn.addEventListener('click', async () => {
      copyPairBtn.disabled = true;
      const pairText = pair.text.toUpperCase();
      const pairBackground = pair.background.toUpperCase();
      try {
        const copied = await copyPalettePairToClipboard(pair);
        if (copied) {
          setMessage(`Copied values (${pairText}/${pairBackground}).`, 'success');
        } else {
          setMessage(
            `Clipboard unavailable, saved pair values for manual copy (${pairText}/${pairBackground}).`,
            'info',
          );
        }
      } finally {
        copyPairBtn.disabled = false;
      }
    });

    const copyCssBtn = document.createElement('button');
    copyCssBtn.type = 'button';
    copyCssBtn.className = 'palette-apply-btn';
    copyCssBtn.textContent = 'Copy CSS';

    copyCssBtn.addEventListener('click', async () => {
      copyCssBtn.disabled = true;
      try {
        const copied = await copyContrastPairCss(pair);
        if (!copied) {
          setMessage('Contrast pair CSS was downloaded for manual copy.', 'info');
        }
      } finally {
        copyCssBtn.disabled = false;
      }
    });

    card.append(preview, textRow, bgRow, ratioRow, tierRow, applyBtn, copyPairBtn, copyCssBtn);
    dom.suggestionWrap.appendChild(card);
  });

  setMessage(`Generated ${suggestions.length} accessible palette options.`, 'success');
}

async function copyDemoText(kind) {
  const payload =
    kind === 'checklist'
      ? getSubmissionChecklistText()
      : getDemoScriptText();

  const isChecklist = kind === 'checklist';
  await copyTextWithFallback({
    payload,
    filename: isChecklist ? 'clearsight-screenshot-checklist.md' : 'clearsight-demo-script.md',
    mimeType: 'text/markdown;charset=utf-8',
    copiedMessage: isChecklist ? 'Devpost screenshot checklist copied.' : 'Demo script outline copied.',
    downloadMessage: isChecklist
      ? 'Clipboard unavailable, checklist downloaded for manual copy.'
      : 'Clipboard unavailable, demo script downloaded for manual copy.',
    statusReporter: (message, type) => setDemoCopyStatus(message),
  });
}

function buildWorkflowSnapshotText() {
  const sourceLoaded = Boolean(state.sourceImage);
  const sourceName = state.sourceName || 'No source image';
  const safeBase = getSafeFileName(sourceName || 'clearsight-source');
  const readiness = getSubmissionReadiness();
  const topImpact = getTopImpactEntry();
  const lines = [];

  lines.push('# ClearSight judge workflow snapshot');
  lines.push(`Generated: ${new Date().toISOString()}`);
  lines.push(`Source: ${sourceName}`);
  lines.push(`Readiness score: ${readiness.readinessScore}%`);
  lines.push(`Readiness: ${readiness.isReady ? 'READY' : 'NOT READY'}`);
  lines.push(`Current status: ${readiness.text}`);
  lines.push(`Next action: ${readiness.nextAction}`);
  lines.push(
    `Contrast check: ${state.lastContrastResult ? `${state.lastContrastResult.passesAA ? 'PASS' : 'FAIL'} (${state.lastContrastResult.ratio.toFixed(2)}:1)` : 'Not run'}`,
  );
  lines.push(
    `Top impact simulation: ${
      topImpact
        ? `${topImpact.label} (${topImpact.impactPercent === null ? 'N/A' : `${topImpact.impactPercent.toFixed(1)}% pixel change`})`
        : 'Pending'
    }`,
  );
  lines.push(
    `Source render: ${state.hasRenderedSource ? 'ready' : sourceLoaded ? 'loaded, not rendered' : 'not loaded'}`,
  );
  lines.push(`Simulations rendered: ${getCompletedSimulationCount()}/${allModes.length}`);
  lines.push('');

  lines.push('Simulation artifact readiness:');
  lines.push(`- [${state.hasRenderedSource ? 'x' : ' '}] ${makeExportFileName('source')} (source preview)`);
  allModes.forEach((mode) => {
    const card = dom.simGrid?.querySelector(`[data-mode="${mode.id}"]`);
    const completed = Boolean(card?.classList.contains('is-done'));
    lines.push(`- [${completed ? 'x' : ' '}] ${makeExportFileName(mode.id)} (${mode.label})`);
  });

  lines.push('');
  lines.push('Checklist screenshot readiness:');
  const hasContrastCheck = Boolean(state.lastContrastResult);
  const hasSuggestionApplied = Boolean(state.lastAppliedContrastSuggestion);
  lines.push(`- [${state.hasRenderedSource ? 'x' : ' '}] ${SCREENSHOT_CHECKLIST_SOURCE_FILE}`);
  SCREENSHOT_CHECKLIST_SIMULATIONS.forEach((entry) => {
    const card = dom.simGrid?.querySelector(`[data-mode="${entry.id}"]`);
    const completed = Boolean(card?.classList.contains('is-done'));
    lines.push(`- [${completed ? 'x' : ' '}] ${entry.filename}`);
  });
  lines.push(`- [${hasContrastCheck ? 'x' : ' '}] ${SCREENSHOT_CHECKLIST_CONTRAST_INITIAL_FILE}`);
  lines.push(`- [${hasSuggestionApplied ? 'x' : ' '}] ${SCREENSHOT_CHECKLIST_CONTRAST_SUGGESTION_FILE}`);

  lines.push('');
  lines.push('Submission package file targets:');
  lines.push(`- ${safeBase}-submission-package.zip`);
  lines.push(`- ${safeBase}-submission-manifest.txt`);
  lines.push(`- ${safeBase}-submission-report.json`);
  lines.push(`- ${safeBase}-judge-summary.md`);
  lines.push(`- ${safeBase}-accessibility-handoff-packet.md`);
  lines.push(`- ${safeBase}-accessibility-handoff-packet.json`);
  lines.push(`- ${safeBase}-submission-contact-sheet.png`);
  lines.push(`- ${safeBase}-contrast-suggestions.csv`);
  lines.push(`- ${safeBase}-contrast-suggestions.json`);

  return lines.join('\n');
}

async function copyWorkflowSnapshot() {
  if (!state.sourceImage && !state.hasRenderedSource && !state.modeImpacts.length) {
    setDemoCopyStatus('Load a source and start rendering to generate a workflow snapshot.');
    return;
  }

  const payload = buildWorkflowSnapshotText();
  const safeBase = getSafeFileName(state.sourceName || 'clearsight-source');
  await copyTextWithFallback({
    payload,
    filename: `${safeBase}-judge-workflow-snapshot.md`,
    mimeType: 'text/markdown;charset=utf-8',
    copiedMessage: 'Judge workflow snapshot copied.',
    downloadMessage: 'Clipboard unavailable, workflow snapshot downloaded for manual copy.',
    statusReporter: (message, type) => setDemoCopyStatus(message),
  });
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
  const safeBase = getSafeFileName(state.sourceName || 'clearsight-source');
  await copyTextWithFallback({
    payload: markdown,
    filename: `${safeBase}-judge-summary.md`,
    mimeType: 'text/markdown;charset=utf-8',
    copiedMessage: 'Judge summary copied to clipboard.',
    downloadMessage: 'Clipboard unavailable, judge summary downloaded for manual copy.',
    statusReporter: (message, type) => setDemoCopyStatus(message),
  });
}

async function copyAccessibilityReportJson() {
  if (state.isRendering) {
    setDemoCopyStatus('Finish rendering before copying the accessibility report.');
    return;
  }

  if (!state.hasRenderedSource || !state.modeImpacts.length) {
    setDemoCopyStatus('Render an image and simulations before copying the report.');
    return;
  }

  const safeBase = getSafeFileName(state.sourceName || 'clearsight-source');
  const payload = `${JSON.stringify(buildAccessibilityReport(), null, 2)}\n`;
  await copyTextWithFallback({
    payload,
    filename: `${safeBase}-accessibility-report.json`,
    mimeType: 'application/json;charset=utf-8',
    copiedMessage: 'Accessibility report JSON copied.',
    downloadMessage: 'Clipboard unavailable, accessibility report JSON downloaded.',
    statusReporter: (message, type) => setDemoCopyStatus(message),
  });
}

async function copyAccessibilityReportCsv() {
  if (state.isRendering) {
    setDemoCopyStatus('Finish rendering before copying the accessibility report.');
    return;
  }

  if (!state.hasRenderedSource || !state.modeImpacts.length) {
    setDemoCopyStatus('Render an image and simulations before copying the report.');
    return;
  }

  const safeBase = getSafeFileName(state.sourceName || 'clearsight-source');
  const payload = `${buildAccessibilityReportCsv()}\n`;
  await copyTextWithFallback({
    payload,
    filename: `${safeBase}-accessibility-report.csv`,
    mimeType: 'text/csv;charset=utf-8',
    copiedMessage: 'Accessibility report CSV copied.',
    downloadMessage: 'Clipboard unavailable, accessibility report CSV downloaded.',
    statusReporter: (message, type) => setDemoCopyStatus(message),
  });
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
  const safeBase = getSafeFileName(state.sourceName || 'clearsight-source');
  await copyTextWithFallback({
    payload: snapshot,
    filename: `${safeBase}-judge-snapshot.txt`,
    mimeType: 'text/plain;charset=utf-8',
    copiedMessage: 'Judge snapshot copied.',
    downloadMessage: 'Clipboard unavailable, judge snapshot downloaded for manual copy.',
    statusReporter: (message, type) => setDemoCopyStatus(message),
  });
}

function buildHandoffPacketText(report, manifest, csv) {
  const lines = [];
  lines.push('# ClearSight Accessibility Handoff Packet');
  lines.push(`Generated: ${report.generatedAt || new Date().toISOString()}`);
  lines.push('');
  lines.push('## Judge Summary');
  lines.push(buildJudgeSummaryMarkdown());
  lines.push('');
  lines.push('## Submission Manifest');
  lines.push('```');
  lines.push(manifest || 'Manifest unavailable.');
  lines.push('```');
  lines.push('');
  lines.push('## Accessibility Report (JSON)');
  lines.push('```json');
  lines.push(JSON.stringify(report, null, 2));
  lines.push('```');
  lines.push('');
  lines.push('## Accessibility Report (CSV)');
  lines.push('```csv');
  lines.push(csv || '');
  lines.push('```');

  return `${lines.join('\n')}\n`;
}

async function buildHandoffBundleText() {
  if (state.isRendering) {
    return null;
  }

  const packageArtifacts = buildSubmissionPackageArtifacts();
  if (!packageArtifacts) {
    return null;
  }

  const report = packageArtifacts.report || buildAccessibilityReport();
  const manifest = buildSubmissionPackageManifest({
    report,
    packageFiles: packageArtifacts.packageFiles || [],
    manifestFileName: packageArtifacts.manifestFileName,
    contactSheetFileName: packageArtifacts.contactSheetFileName,
    reportFileName: packageArtifacts.reportFileName,
    summaryFileName: packageArtifacts.summaryFileName,
    handoffPacketFileName: packageArtifacts.handoffPacketFileName,
    handoffPacketJsonFileName: packageArtifacts.handoffPacketJsonFileName,
  });
  const csv = buildAccessibilityReportCsv();
  const handoffPacketText = buildHandoffPacketText(report, manifest, csv);
  const handoffJsonPayload = buildHandoffPacketJsonPayload();

  const lines = [];
  lines.push('# ClearSight Handoff Bundle');
  lines.push(`Generated: ${report.generatedAt || new Date().toISOString()}`);
  lines.push('');
  lines.push('## Human-readable handoff packet');
  lines.push('```markdown');
  lines.push(handoffPacketText.trim());
  lines.push('```');
  lines.push('');
  lines.push('## Accessibility report (JSON)');
  lines.push('```json');
  lines.push(`${JSON.stringify(report, null, 2)}`);
  lines.push('```');
  lines.push('');
  lines.push('## Accessibility report (CSV)');
  lines.push('```csv');
  lines.push(csv || '');
  lines.push('```');
  lines.push('');
  lines.push('## Submission manifest');
  lines.push('```text');
  lines.push(manifest.trim());
  lines.push('```');

  if (handoffJsonPayload) {
    lines.push('');
    lines.push('## Handoff packet payload (JSON)');
    lines.push('```json');
    lines.push(`${JSON.stringify(handoffJsonPayload, null, 2)}`);
    lines.push('```');
  }

  return `${lines.join('\n')}\n`;
}

function copyHandoffPacket() {
  if (state.isRendering) {
    setDemoCopyStatus('Finish rendering before copying the handoff packet.');
    return;
  }

  if (!state.hasRenderedSource || !state.modeImpacts.length) {
    setDemoCopyStatus('Render an image and simulations before copying the handoff packet.');
    return;
  }

  const packageArtifacts = buildSubmissionPackageArtifacts();
  if (!packageArtifacts) {
    setDemoCopyStatus('Run simulations before generating the handoff packet.');
    return;
  }

  const report = packageArtifacts.report || buildAccessibilityReport();
  const manifest = buildSubmissionPackageManifest({
    report,
    packageFiles: packageArtifacts.packageFiles || [],
    manifestFileName: packageArtifacts.manifestFileName,
    contactSheetFileName: packageArtifacts.contactSheetFileName,
    reportFileName: packageArtifacts.reportFileName,
    summaryFileName: packageArtifacts.summaryFileName,
    handoffPacketFileName: packageArtifacts.handoffPacketFileName,
    handoffPacketJsonFileName: packageArtifacts.handoffPacketJsonFileName,
  });
  const csv = buildAccessibilityReportCsv();
  const safeBase = getSafeFileName(state.sourceName || 'clearsight-source');
  return copyTextWithFallback({
    payload: buildHandoffPacketText(report, manifest, csv),
    filename: `${safeBase}-handoff-packet.md`,
    mimeType: 'text/markdown;charset=utf-8',
    copiedMessage: 'Accessibility handoff packet copied to clipboard.',
    downloadMessage: 'Clipboard unavailable, handoff packet downloaded for manual copy.',
    statusReporter: (message, type) => setDemoCopyStatus(message),
  });
}

async function copyHandoffBundle() {
  if (state.isRendering) {
    setDemoCopyStatus('Finish rendering before copying the handoff bundle.');
    return;
  }

  if (!state.hasRenderedSource || !state.modeImpacts.length) {
    setDemoCopyStatus('Render an image and simulations before copying the handoff bundle.');
    return;
  }

  const payload = buildHandoffBundleText();
  if (!payload) {
    setDemoCopyStatus('Run simulations and generate a report before copying the handoff bundle.');
    return;
  }

  const safeBase = getSafeFileName(state.sourceName || 'clearsight-source');
  await copyTextWithFallback({
    payload,
    filename: `${safeBase}-handoff-bundle.md`,
    mimeType: 'text/markdown;charset=utf-8',
    copiedMessage: 'ClearSight handoff bundle copied.',
    downloadMessage: 'Clipboard unavailable, handoff bundle downloaded for manual copy.',
    statusReporter: (message, type) => setDemoCopyStatus(message),
  });
}

async function runJudgeHandoffFlow() {
  if (state.isRendering) {
    setMessage('Please wait for rendering to finish before finalizing judge handoff.', 'info');
    return;
  }

  const readiness = getSubmissionReadiness();
  if (!readiness.isReady) {
    setMessage(
      `${readiness.text} Next: ${readiness.nextAction || 'Render simulations and run contrast check.'}`,
      'info',
    );
    return;
  }

  setMessage('Finalizing judge handoff: downloading package and handoff packet.', 'info');
  try {
    await downloadSubmissionPackage();
  } catch (error) {
    setMessage(error.message || 'Unable to build the submission package.', 'error');
    return;
  }

  const copied = await copyHandoffPacket();
  if (copied) {
    setMessage('Judge handoff finalized: submission package downloaded and handoff packet copied.', 'success');
    return;
  }

  setMessage(
    'Judge handoff finalized: submission package downloaded. If clipboard is blocked, handoff packet is still available as a downloaded file.',
    'info',
  );
}

function buildHandoffPacketJsonPayload() {
  const packageArtifacts = buildSubmissionPackageArtifacts();
  if (!packageArtifacts || !packageArtifacts.entries.length) {
    return null;
  }

  const report = packageArtifacts.report || buildAccessibilityReport();
  const manifest = buildSubmissionPackageManifest({
    report,
    packageFiles: packageArtifacts.packageFiles || [],
    manifestFileName: packageArtifacts.manifestFileName,
    contactSheetFileName: packageArtifacts.contactSheetFileName,
    reportFileName: packageArtifacts.reportFileName,
    summaryFileName: packageArtifacts.summaryFileName,
    handoffPacketFileName: packageArtifacts.handoffPacketFileName,
    handoffPacketJsonFileName: packageArtifacts.handoffPacketJsonFileName,
  });

  return {
    schema: 'clearsight-handoff-packet-v1',
    generatedAt: report.generatedAt,
    source: report.source,
    accessibilityHealth: report.accessibilityHealth,
    contrast: report.contrast,
    simulationIntensity: report.simulationIntensity,
    simulations: report.simulations,
    topImpactMode: report.topImpactMode,
    suggestions: report.suggestions,
    remediationActions: report.remediationActions,
    submissionArtifacts: {
      manifestFileName: packageArtifacts.manifestFileName || 'submission-manifest.txt',
      reportFileName: packageArtifacts.reportFileName || 'submission-report.json',
      summaryFileName: packageArtifacts.summaryFileName || 'judge-summary.md',
      contactSheetFileName: packageArtifacts.contactSheetFileName || 'submission-contact-sheet.png',
      handoffPacketFileName:
        packageArtifacts.handoffPacketFileName || 'accessibility-handoff-packet.md',
      handoffPacketJsonFileName:
        packageArtifacts.handoffPacketJsonFileName || 'accessibility-handoff-packet.json',
      files: (packageArtifacts.packageFiles || []).map((entry) => ({
        filename: entry.filename || `${entry.id}.png`,
        id: entry.id,
        label: entry.label || entry.id,
        impactPercent: entry.impactPercent,
        impactLevel: entry.impactLevel,
      })),
      manifestText: manifest,
    },
  };
}

async function copyHandoffPacketJson() {
  if (state.isRendering) {
    setDemoCopyStatus('Finish rendering before copying the handoff JSON packet.');
    return;
  }

  if (!state.hasRenderedSource || !state.modeImpacts.length) {
    setDemoCopyStatus('Render an image and simulations before copying the handoff packet JSON.');
    return;
  }

  const payload = buildHandoffPacketJsonPayload();
  if (!payload) {
    setDemoCopyStatus('Run simulations and generate a report before copying handoff JSON.');
    return;
  }

  const safeBase = getSafeFileName(state.sourceName || 'clearsight-source');
  await copyTextWithFallback({
    payload: `${JSON.stringify(payload, null, 2)}\n`,
    filename: `${safeBase}-handoff-packet.json`,
    mimeType: 'application/json;charset=utf-8',
    copiedMessage: 'Accessibility handoff JSON copied.',
    downloadMessage: 'Clipboard unavailable, handoff JSON downloaded for manual copy.',
    statusReporter: (message, type) => setDemoCopyStatus(message),
  });
}

function readImageAndRender(file) {
  clearWorkspace({ notify: false });
  return withImageFromFile(file)
    .then(({ image, wasResized, originalWidth, originalHeight }) => {
      state.sourceImage = image;
      state.targetedTextRepair = null;
      state.componentSurfaceRepair = null;
  state.sourceOriginalDimensions = {
        width: Number.isFinite(originalWidth) ? originalWidth : 0,
        height: Number.isFinite(originalHeight) ? originalHeight : 0,
      };
      state.sourceWasDownscaled = Boolean(wasResized);
      state.sourceResizeInfo = wasResized
        ? `downscaled from ${originalWidth}×${originalHeight}px`
        : null;
      state.sourceName = file.name || 'uploaded-image';
      state.renderSize = { width: 0, height: 0 };
      state.sourceImageData = null;
      state.modeImpacts = [];
      state.hasRenderedSource = false;
      state.lastContrastResult = null;
      state.lastCvdProjection = null;
      state.lastApcaComparison = null;
      state.lastSuggestionPairs = [];
      state.lastAppliedContrastSuggestion = null;
      updateWorkflowChecklist();
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
    state.lastCvdProjection = null;
    state.lastApcaComparison = null;
    state.lastSuggestionPairs = [];
    state.lastAppliedContrastSuggestion = null;
    state.lastContrastUndoPair = null;
    state.sourceImageData = null;
    state.sourceImage = createDemoImage(type);
    state.targetedTextRepair = null;
    state.componentSurfaceRepair = null;
    state.sourceName = `${type}-sample.png`;
    state.sourceOriginalDimensions = { width: 1280, height: 720 };
    state.sourceWasDownscaled = false;
    state.sourceResizeInfo = null;
    updateWorkflowChecklist();
    setSimPlaceholderVisible(true);
    if (state.sourceImage.complete) {
      return renderAll();
    }

    return new Promise((resolve, reject) => {
      state.sourceImage.onload = () => {
        Promise.resolve(renderAll())
          .then(resolve)
          .catch(reject);
      };
      state.sourceImage.onerror = () => {
        reject(new Error('Failed to generate sample image.'));
      };
      if (state.sourceImage.complete) {
        // If loading completes after assignment in a tightly-coupled sequence.
        resolve(renderAll());
      }
    });
  } catch (error) {
    setMessage(error.message, 'error');
    return Promise.reject(error);
  }
}

async function runQuickJudgeWorkflow() {
  if (state.isRendering) {
    setMessage('Please wait for the active render to finish before starting a quick demo.', 'info');
    return;
  }

  startJudgeTimer({ forceRestart: true });
  const sampleType = QUICK_DEMO_SAMPLE_TYPES[quickDemoCursor % QUICK_DEMO_SAMPLE_TYPES.length];
  quickDemoCursor += 1;
  if (dom.quickDemoBtn) {
    dom.quickDemoBtn.disabled = true;
  }

  try {
    setMessage(`Running quick judge workflow with ${sampleType === 'ui' ? 'UI' : 'dashboard'} sample...`, 'info');
    await loadSample(sampleType);

    const contrastResult = renderContrastResult();
    if (contrastResult) {
      renderSuggestions();
      if (contrastResult.passesAA) {
        setMessage('Quick workflow: contrast already passes AA. Suggestions refreshed.', 'success');
      } else {
        setMessage(
          `Quick workflow: contrast fails AA at ${contrastResult.ratio.toFixed(1)}:1. Generated ${Math.min(
            8,
            state.lastSuggestionPairs.length || 0,
          )} improvement suggestion(s).`,
          'info',
        );
      }
    } else {
      setMessage('Quick workflow loaded. Run contrast check manually after updating colors.', 'info');
    }

    const topImpact = getTopImpactEntry();
    if (topImpact) {
      openTopImpactPreview();
    }
    updateWorkflowChecklist();
  } catch (error) {
    setMessage(error.message || 'Quick judge workflow could not complete.', 'error');
  } finally {
    if (dom.quickDemoBtn) {
      dom.quickDemoBtn.disabled = false;
    }
  }
}

function setBatchAuditStatus(text) {
  if (dom.batchAuditStatus) {
    dom.batchAuditStatus.textContent = text;
  }
}

function setBatchAuditControlsEnabled(enabled) {
  if (dom.batchAuditFilesBtn) dom.batchAuditFilesBtn.disabled = !enabled;
  if (dom.batchAuditSampleBtn) dom.batchAuditSampleBtn.disabled = !enabled;
  if (dom.recordWalkthroughBtn && !walkthroughSession) {
    dom.recordWalkthroughBtn.disabled = !enabled || !isLiveCaptureSupported();
  }
  if (dom.batchBaselineBtn) dom.batchBaselineBtn.disabled = !enabled;
  if (dom.batchAuditCsvBtn) dom.batchAuditCsvBtn.disabled = !enabled || !state.batchAudit?.entries?.length;
  if (dom.batchAuditPdfBtn) dom.batchAuditPdfBtn.disabled = !enabled || !state.batchAudit?.entries?.length;
}

function decodeImageFileForBatch(file) {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('could not be decoded as an image'));
    };
    image.src = objectUrl;
  });
}

function awaitImageElement(image) {
  if (image.complete && image.naturalWidth) {
    return Promise.resolve(image);
  }
  return new Promise((resolve, reject) => {
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('could not be decoded as an image'));
  });
}

function auditImageElementForBatch(image) {
  const naturalWidth = image.naturalWidth || image.width;
  const naturalHeight = image.naturalHeight || image.height;
  if (!naturalWidth || !naturalHeight) {
    throw new Error('has no measurable pixels to audit');
  }

  const scale = Math.min(1, BATCH_AUDIT_MAX_DIMENSION / Math.max(naturalWidth, naturalHeight));
  const width = Math.max(1, Math.round(naturalWidth * scale));
  const height = Math.max(1, Math.round(naturalHeight * scale));
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(image, 0, 0, width, height);
  const { data } = ctx.getImageData(0, 0, width, height);
  const audit = auditImageAccessibility(data, width, height);

  const thumbHeight = 56;
  const thumbWidth = Math.max(1, Math.round((width / height) * thumbHeight));
  const thumb = document.createElement('canvas');
  thumb.width = thumbWidth;
  thumb.height = thumbHeight;
  thumb.getContext('2d').drawImage(canvas, 0, 0, thumbWidth, thumbHeight);
  return { audit, thumbnailUrl: thumb.toDataURL('image/png') };
}

async function runBatchAudit(sources) {
  if (isBatchAuditRunning) {
    setMessage('A batch audit is already running — wait for it to finish first.', 'info');
    return null;
  }
  if (!sources.length) {
    return null;
  }

  isBatchAuditRunning = true;
  setBatchAuditControlsEnabled(false);
  state.batchAudit = null;
  renderBatchAuditResults();

  const entries = [];
  const failures = [];
  try {
    for (let index = 0; index < sources.length; index += 1) {
      const source = sources[index];
      setBatchAuditStatus(`Auditing screen ${index + 1} of ${sources.length} — ${source.name}…`);
      await new Promise((resolve) => setTimeout(resolve, 0));
      try {
        const image = await source.load();
        const { audit, thumbnailUrl } = auditImageElementForBatch(image);
        entries.push({ name: source.name, audit, thumbnailUrl, open: source.open });
      } catch (error) {
        failures.push(`${source.name} ${error?.message || 'failed to audit'}`);
      }
    }
  } finally {
    isBatchAuditRunning = false;
  }

  if (!entries.length) {
    setBatchAuditControlsEnabled(true);
    setBatchAuditStatus(`Batch audit could not score any screens — ${failures.join(' · ')}.`);
    return null;
  }

  const rankValue = (entry) =>
    Number.isFinite(entry.audit.score?.score) ? entry.audit.score.score : Number.POSITIVE_INFINITY;
  entries.sort((a, b) => rankValue(a) - rankValue(b));
  state.batchAudit = { entries, failures };
  renderBatchAuditResults();
  setBatchAuditControlsEnabled(true);
  return entries;
}

function renderBatchAuditResults() {
  if (!dom.batchAuditList) {
    return;
  }

  dom.batchAuditList.innerHTML = '';
  const batch = state.batchAudit;
  let regression = null;
  if (batch?.entries?.length && state.batchBaseline) {
    regression = compareBatchAuditToBaseline(batch.entries, state.batchBaseline.report);
  }
  if (dom.batchAuditCsvBtn) {
    dom.batchAuditCsvBtn.disabled = isBatchAuditRunning || !batch?.entries?.length;
  }
  if (dom.batchAuditPdfBtn) {
    dom.batchAuditPdfBtn.disabled = isBatchAuditRunning || !batch?.entries?.length;
  }

  if (!batch?.entries?.length) {
    if (dom.batchAuditSummary) dom.batchAuditSummary.hidden = true;
    if (dom.batchAuditPortfolio) {
      dom.batchAuditPortfolio.hidden = true;
      dom.batchAuditPortfolio.innerHTML = '';
      delete dom.batchAuditPortfolio.dataset.gate;
    }
    if (dom.batchRegressionSummary) dom.batchRegressionSummary.hidden = true;
    if (!isBatchAuditRunning) {
      setBatchAuditStatus(BATCH_AUDIT_IDLE_STATUS);
    }
    return;
  }

  const scored = batch.entries.filter((entry) => Number.isFinite(entry.audit.score?.score));
  const portfolio = summarizeBatchAudit(batch.entries);
  const worst = scored[0] || null;
  const average = scored.length
    ? Math.round(scored.reduce((sum, entry) => sum + entry.audit.score.score, 0) / scored.length)
    : null;
  if (dom.batchAuditSummary) {
    const parts = [
      `${batch.entries.length} screen${batch.entries.length === 1 ? '' : 's'} audited`,
      average === null ? 'no scorable screens' : `average ClearSight Score ${average}/100`,
    ];
    if (worst) {
      parts.push(`riskiest: ${worst.name} (${worst.audit.score.score}/100 · Grade ${worst.audit.score.grade})`);
    }
    dom.batchAuditSummary.textContent = parts.join(' · ');
    dom.batchAuditSummary.hidden = false;
  }
  if (dom.batchRegressionSummary) {
    if (regression) {
      const improved = regression.counts.improved || 0;
      const regressed = regression.counts.regressed || 0;
      const unchanged = (regression.counts.unchanged || 0) + (regression.counts['within-tolerance'] || 0);
      const fresh = regression.counts.new || 0;
      dom.batchRegressionSummary.dataset.gate = regression.pass ? 'passed' : 'failed';
      dom.batchRegressionSummary.textContent =
        `${regression.pass ? 'Regression gate passed' : 'Regression gate failed'} · ` +
        `${state.batchBaseline.name} · ${regression.matched} matched · ` +
        `${improved} improved · ${regressed} regressed · ${unchanged} unchanged` +
        (fresh ? ` · ${fresh} new` : '');
      dom.batchRegressionSummary.hidden = false;
    } else {
      dom.batchRegressionSummary.hidden = true;
      delete dom.batchRegressionSummary.dataset.gate;
    }
  }
  if (dom.batchAuditPortfolio) {
    const gradeOrder = ['A', 'B', 'C', 'D', 'F'];
    const gradeText = gradeOrder
      .filter((grade) => portfolio.gradeCounts[grade])
      .map((grade) => `${portfolio.gradeCounts[grade]}×${grade}`)
      .join(' · ') || 'No grades';
    const totalRisks = Object.values(portfolio.totals).reduce((sum, value) => sum + value, 0);
    dom.batchAuditPortfolio.dataset.gate = portfolio.releaseGate.status;
    dom.batchAuditPortfolio.innerHTML = `
      <div class="portfolio-score" aria-label="Portfolio ClearSight Score ${portfolio.portfolioScore} out of 100">
        <strong>${portfolio.portfolioScore}</strong><span>/100</span>
        <small>Portfolio score</small>
      </div>
      <div class="portfolio-metric"><span>Release gate</span><strong>${portfolio.releaseGate.label}</strong></div>
      <div class="portfolio-metric"><span>Grade distribution</span><strong>${gradeText}</strong></div>
      <div class="portfolio-metric"><span>Accessibility debt</span><strong>${totalRisks} finding${totalRisks === 1 ? '' : 's'} across ${portfolio.scoredCount} screen${portfolio.scoredCount === 1 ? '' : 's'}</strong></div>
      <div class="portfolio-metric"><span>Weakest system axis</span><strong>${portfolio.weakestAxis ? `${portfolio.weakestAxis.label} · ${portfolio.weakestAxis.score}/100` : 'Not enough data'}</strong></div>
    `;
    dom.batchAuditPortfolio.hidden = false;
  }
  const failureNote = batch.failures.length
    ? ` ${batch.failures.length} skipped: ${batch.failures.join(' · ')}.`
    : '';
  setBatchAuditStatus(`Batch audit complete — riskiest screens listed first.${failureNote}`);

  batch.entries.forEach((entry, index) => {
    const { audit } = entry;
    const summary = audit.textScan?.summary || {};
    const collisions = audit.palette?.collisions?.summary?.collisions || 0;
    const componentFailures = audit.componentContrast?.summary?.failing || 0;
    const hasScore = Number.isFinite(audit.score?.score);

    const item = document.createElement('li');
    item.className = 'batch-audit-row';

    const rank = document.createElement('span');
    rank.className = 'batch-audit-rank';
    rank.textContent = `#${index + 1}`;

    const thumb = document.createElement('img');
    thumb.className = 'batch-audit-thumb';
    thumb.src = entry.thumbnailUrl;
    thumb.alt = '';
    thumb.setAttribute('aria-hidden', 'true');

    const info = document.createElement('span');
    info.className = 'batch-audit-info';
    const title = document.createElement('strong');
    title.textContent = entry.name;
    const detail = document.createElement('span');
    detail.className = 'muted';
    const detailParts = [
      `${audit.width}×${audit.height}px`,
      `${summary.total || 0} text region${(summary.total || 0) === 1 ? '' : 's'}`,
      `${summary.belowAA || 0} below AA`,
    ];
    if (summary.cvdHiddenFailures) detailParts.push(`${summary.cvdHiddenFailures} hidden CVD`);
    if (summary.apcaFalsePasses) detailParts.push(`${summary.apcaFalsePasses} APCA risk`);
    detailParts.push(`${collisions} color-only collision${collisions === 1 ? '' : 's'}`);
    detailParts.push(`${componentFailures} component contrast failure${componentFailures === 1 ? '' : 's'}`);
    detail.textContent = detailParts.join(' · ');
    info.append(title, detail);

    const ring = document.createElement('span');
    ring.className = 'batch-audit-ring';
    if (hasScore) {
      ring.dataset.grade = audit.score.grade;
      ring.style.setProperty('--score-angle', `${Math.max(0, Math.min(100, audit.score.score)) * 3.6}deg`);
      ring.setAttribute('role', 'img');
      ring.setAttribute(
        'aria-label',
        `ClearSight Score ${audit.score.score} out of 100, grade ${audit.score.grade}.`,
      );
    } else {
      ring.dataset.grade = 'none';
      ring.style.setProperty('--score-angle', '0deg');
      ring.setAttribute('role', 'img');
      ring.setAttribute('aria-label', 'Insufficient data to score this screen.');
    }
    const ringInner = document.createElement('span');
    ringInner.className = 'batch-audit-ring-inner';
    ringInner.textContent = hasScore ? String(audit.score.score) : '—';
    ring.appendChild(ringInner);

    const comparison = regression?.comparisons.find((candidate) => candidate.name === entry.name);
    const deltaBadge = document.createElement('span');
    deltaBadge.className = 'batch-delta';
    if (comparison) {
      deltaBadge.dataset.status = comparison.status;
      if (Number.isFinite(comparison.delta)) {
        deltaBadge.textContent = `${comparison.delta > 0 ? '+' : ''}${comparison.delta} pts`;
        deltaBadge.title = `Baseline ${comparison.baselineScore}, current ${comparison.currentScore}: ${comparison.status.replace('-', ' ')}`;
      } else {
        deltaBadge.textContent = comparison.status === 'new' ? 'New' : 'Unscored';
        deltaBadge.title = comparison.status === 'new' ? 'No matching screen in the baseline' : 'This screen could not be compared';
      }
    } else {
      deltaBadge.hidden = true;
    }

    const openBtn = document.createElement('button');
    openBtn.type = 'button';
    openBtn.className = 'batch-audit-open';
    openBtn.textContent = 'Open full audit';
    openBtn.addEventListener('click', () => {
      if (state.isRendering) {
        setMessage('Wait for the current render to finish before opening another screen.', 'info');
        return;
      }
      entry.open();
      dom.sourceCanvas?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });

    item.append(rank, thumb, info, deltaBadge, ring, openBtn);
    dom.batchAuditList.appendChild(item);
  });
}

async function loadBatchBaselineFile(file) {
  if (!file) return;
  try {
    const report = JSON.parse(await file.text());
    if (!report || !Array.isArray(report.screens)) {
      throw new Error('the report does not contain a screens array');
    }
    state.batchBaseline = { name: file.name || 'baseline.json', report };
    renderBatchAuditResults();
    setMessage(
      state.batchAudit?.entries?.length
        ? `Baseline loaded — compared ${file.name || 'baseline.json'} with the current batch.`
        : `Baseline loaded — run a batch with matching filenames to reveal score regressions.`,
      'info',
    );
  } catch (error) {
    setMessage(`Could not load baseline JSON: ${error.message}. Export it with ClearSight CI using --json.`, 'error');
  }
}

function runBatchAuditFromFiles(files) {
  if (!files.length) {
    return;
  }

  const supported = files.filter((file) => isSupportedImageFile(file) && file.size <= MAX_FILE_SIZE_BYTES);
  const skipped = files.length - supported.length;
  const usable = supported.slice(0, BATCH_AUDIT_MAX_FILES);
  if (!usable.length) {
    setMessage(
      `No batch-auditable images found. Use ${SUPPORTED_IMAGE_FORMATS_LABEL} files up to ${formatBytes(MAX_FILE_SIZE_BYTES, 0)}.`,
      'error',
    );
    return;
  }

  const truncated = supported.length - usable.length;
  const notes = [];
  if (skipped > 0) notes.push(`${skipped} unsupported/oversized file${skipped === 1 ? '' : 's'} skipped`);
  if (truncated > 0) notes.push(`first ${BATCH_AUDIT_MAX_FILES} screens kept`);
  if (notes.length) {
    setMessage(`Batch audit starting — ${notes.join(', ')}.`, 'info');
  }

  void runBatchAudit(
    usable.map((file) => ({
      name: file.name || 'screenshot',
      load: () => decodeImageFileForBatch(file),
      open: () => {
        void handleImageInput(file, 'Loaded from batch audit');
      },
    })),
  );
}

function runBatchSampleAudit() {
  const samples = [
    { type: 'ui', name: 'demo-ui-sample.png' },
    { type: 'dashboard', name: 'demo-dashboard-sample.png' },
  ];
  return runBatchAudit(
    samples.map(({ type, name }) => ({
      name,
      load: () => awaitImageElement(createDemoImage(type)),
      open: () => {
        void loadSample(type).catch((error) => setMessage(error.message, 'error'));
      },
    })),
  );
}

let walkthroughSession = null;

function updateWalkthroughButton() {
  if (!dom.recordWalkthroughBtn) {
    return;
  }
  if (walkthroughSession) {
    const kept = walkthroughSession.frames.length;
    dom.recordWalkthroughBtn.textContent = `Stop & audit ${kept} screen${kept === 1 ? '' : 's'}`;
    dom.recordWalkthroughBtn.dataset.recording = 'true';
    dom.recordWalkthroughBtn.disabled = false;
  } else {
    dom.recordWalkthroughBtn.textContent = 'Record + motion-audit walkthrough';
    delete dom.recordWalkthroughBtn.dataset.recording;
    dom.recordWalkthroughBtn.disabled = isBatchAuditRunning || !isLiveCaptureSupported();
  }
}

function setWalkthroughRecordingStatus(session) {
  const kept = session.frames.length;
  const duplicates = session.duplicates;
  const motionFrames = session.flashFrames.length;
  setBatchAuditStatus(
    `Recording walkthrough — ${kept} distinct screen${kept === 1 ? '' : 's'} captured` +
      `${duplicates ? `, ${duplicates} repeat frame${duplicates === 1 ? '' : 's'} skipped` : ''}; ` +
      `${motionFrames} motion frame${motionFrames === 1 ? '' : 's'} checked for flashing. ` +
      'Click through your app, then press “Stop & audit”.',
  );
}

function sampleWalkthroughFlashFrame(session) {
  if (
    walkthroughSession !== session ||
    session.flashFrames.length >= WALKTHROUGH_FLASH_MAX_FRAMES
  ) {
    if (session.flashTimer && session.flashFrames.length >= WALKTHROUGH_FLASH_MAX_FRAMES) {
      clearInterval(session.flashTimer);
      session.flashTimer = null;
      session.flashTruncated = true;
    }
    return;
  }
  const { video } = session;
  const width = video.videoWidth;
  const height = video.videoHeight;
  if (!width || !height) {
    return;
  }
  const scale = Math.min(1, WALKTHROUGH_FLASH_MAX_DIMENSION / Math.max(width, height));
  const frameWidth = Math.max(8, Math.round(width * scale));
  const frameHeight = Math.max(8, Math.round(height * scale));
  if (!session.flashCanvas) {
    session.flashCanvas = document.createElement('canvas');
    session.flashContext = session.flashCanvas.getContext('2d', { willReadFrequently: true });
  }
  if (!session.flashContext) {
    return;
  }
  session.flashCanvas.width = frameWidth;
  session.flashCanvas.height = frameHeight;
  session.flashContext.drawImage(video, 0, 0, frameWidth, frameHeight);
  try {
    const now = performance.now();
    const imageData = session.flashContext.getImageData(0, 0, frameWidth, frameHeight);
    session.flashFrames.push({
      data: new Uint8ClampedArray(imageData.data),
      width: frameWidth,
      height: frameHeight,
      durationMs: session.lastFlashSampleAt
        ? Math.max(1, now - session.lastFlashSampleAt)
        : WALKTHROUGH_FLASH_SAMPLE_INTERVAL_MS,
    });
    session.lastFlashSampleAt = now;
  } catch {
    // A transient capture-frame read failure should not cancel the static walkthrough audit.
  }
}

function sampleWalkthroughFrame(session) {
  if (walkthroughSession !== session) {
    return;
  }
  const { video } = session;
  const width = video.videoWidth;
  const height = video.videoHeight;
  if (!width || !height) {
    return;
  }
  if (performance.now() - session.startedAt >= WALKTHROUGH_MAX_DURATION_MS) {
    void stopWalkthroughRecording('Reached the 2-minute recording limit');
    return;
  }

  const sampleScale = Math.min(1, WALKTHROUGH_SIGNATURE_WIDTH / width);
  const sampleWidth = Math.max(8, Math.round(width * sampleScale));
  const sampleHeight = Math.max(8, Math.round(height * sampleScale));
  if (!session.sampleCanvas) {
    session.sampleCanvas = document.createElement('canvas');
    session.sampleContext = session.sampleCanvas.getContext('2d', { willReadFrequently: true });
  }
  if (!session.sampleContext) {
    return;
  }
  session.sampleCanvas.width = sampleWidth;
  session.sampleCanvas.height = sampleHeight;
  session.sampleContext.drawImage(video, 0, 0, sampleWidth, sampleHeight);

  let signature;
  try {
    const { data } = session.sampleContext.getImageData(0, 0, sampleWidth, sampleHeight);
    signature = computeFrameSignature(data, sampleWidth, sampleHeight);
  } catch {
    return;
  }
  session.sampled += 1;

  const decision = evaluateWalkthroughFrame(signature, session.previousSignature, session.keptSignatures);
  session.previousSignature = signature;

  if (decision.status === 'transition') {
    session.transitions += 1;
    return;
  }
  if (decision.status === 'duplicate' || decision.status === 'overflow') {
    session.duplicates += 1;
    setWalkthroughRecordingStatus(session);
    return;
  }

  const frameScale = Math.min(1, WALKTHROUGH_FRAME_MAX_DIMENSION / Math.max(width, height));
  const frameWidth = Math.max(1, Math.round(width * frameScale));
  const frameHeight = Math.max(1, Math.round(height * frameScale));
  const frameCanvas = document.createElement('canvas');
  frameCanvas.width = frameWidth;
  frameCanvas.height = frameHeight;
  frameCanvas.getContext('2d')?.drawImage(video, 0, 0, frameWidth, frameHeight);
  session.keptSignatures.push(signature);
  session.frames.push({ canvas: frameCanvas, width: frameWidth, height: frameHeight });
  updateWalkthroughButton();
  setWalkthroughRecordingStatus(session);

  if (session.frames.length >= WALKTHROUGH_KEYFRAME_DEFAULTS.maxKeyframes) {
    void stopWalkthroughRecording(
      `Captured the maximum of ${WALKTHROUGH_KEYFRAME_DEFAULTS.maxKeyframes} distinct screens`,
    );
  }
}

async function startWalkthroughRecording() {
  if (walkthroughSession) {
    return;
  }
  if (isBatchAuditRunning) {
    setMessage('A batch audit is already running — wait for it to finish first.', 'info');
    return;
  }
  if (!isLiveCaptureSupported()) {
    setMessage(
      'Walkthrough recording is not supported in this browser. Batch-audit screenshots instead.',
      'error',
    );
    return;
  }

  let stream = null;
  try {
    setMessage(
      'Choose the app window, tab, or screen to walk through — every distinct screen you visit is scored when you stop.',
      'info',
    );
    stream = await navigator.mediaDevices.getDisplayMedia({
      video: { frameRate: { ideal: 5, max: 15 } },
      audio: false,
      selfBrowserSurface: 'exclude',
      surfaceSwitching: 'exclude',
    });
    const [track] = stream.getVideoTracks();
    if (!track) {
      throw new Error('The selected capture source did not provide any video.');
    }

    const video = document.createElement('video');
    video.muted = true;
    video.playsInline = true;
    video.srcObject = stream;
    await video.play();
    await waitForLiveCaptureFrame(video);
    if (!video.videoWidth || !video.videoHeight) {
      throw new Error('Could not read frames from the selected capture source. Try sharing it again.');
    }

    const session = {
      stream,
      video,
      startedAt: performance.now(),
      previousSignature: null,
      keptSignatures: [],
      frames: [],
      sampled: 0,
      duplicates: 0,
      transitions: 0,
      sampleCanvas: null,
      sampleContext: null,
      timer: null,
      flashFrames: [],
      flashCanvas: null,
      flashContext: null,
      flashTimer: null,
      flashTruncated: false,
      lastFlashSampleAt: null,
    };
    walkthroughSession = session;
    track.addEventListener('ended', () => {
      void stopWalkthroughRecording('Screen sharing ended');
    });
    session.timer = setInterval(() => sampleWalkthroughFrame(session), WALKTHROUGH_SAMPLE_INTERVAL_MS);
    session.flashTimer = setInterval(
      () => sampleWalkthroughFlashFrame(session),
      WALKTHROUGH_FLASH_SAMPLE_INTERVAL_MS,
    );
    updateWalkthroughButton();
    setWalkthroughRecordingStatus(session);
    sampleWalkthroughFlashFrame(session);
    sampleWalkthroughFrame(session);
  } catch (error) {
    if (stream) {
      stream.getTracks().forEach((mediaTrack) => mediaTrack.stop());
    }
    walkthroughSession = null;
    updateWalkthroughButton();
    if (error instanceof DOMException && (error.name === 'NotAllowedError' || error.name === 'AbortError')) {
      setMessage('Walkthrough recording cancelled — nothing was shared or audited.', 'info');
    } else if (error instanceof DOMException && error.name === 'NotFoundError') {
      setMessage('No shareable screen source was found on this device.', 'error');
    } else {
      setMessage(error?.message || 'Unable to record the selected screen.', 'error');
    }
  }
}

async function stopWalkthroughRecording(reason = null, { audit = true } = {}) {
  const session = walkthroughSession;
  if (!session) {
    return;
  }
  walkthroughSession = null;
  clearInterval(session.timer);
  clearInterval(session.flashTimer);
  session.stream.getTracks().forEach((mediaTrack) => mediaTrack.stop());
  session.video.srcObject = null;
  updateWalkthroughButton();

  if (!audit) {
    setBatchAuditStatus(BATCH_AUDIT_IDLE_STATUS);
    return;
  }

  const kept = session.frames;
  const seconds = Math.max(1, Math.round((performance.now() - session.startedAt) / 1000));
  if (session.flashFrames.length >= 2) {
    try {
      runFlashScanOnFrames(session.flashFrames, 'Live app walkthrough', {
        truncated: session.flashTruncated,
        totalFrames: session.flashTruncated
          ? Math.max(
              session.flashFrames.length,
              Math.floor((performance.now() - session.startedAt) / WALKTHROUGH_FLASH_SAMPLE_INTERVAL_MS),
            )
          : session.flashFrames.length,
      });
    } catch {
      // Motion analysis is additive: a capture irregularity must not discard valid screen keyframes.
      state.flashScan = null;
      renderFlashScanResult();
    }
  }
  if (!kept.length) {
    setBatchAuditStatus(BATCH_AUDIT_IDLE_STATUS);
    setMessage(
      `${reason || 'Walkthrough stopped'} — no stable screen frame was captured, so there is nothing to audit.`,
      'error',
    );
    return;
  }

  setMessage(
    `${reason ? `${reason} — walkthrough` : 'Walkthrough'} captured ${kept.length} distinct ` +
      `screen${kept.length === 1 ? '' : 's'} in ${seconds}s` +
      `${session.duplicates ? ` (${session.duplicates} repeat frames skipped)` : ''} and flash-scanned ` +
      `${session.flashFrames.length} motion frames. Scoring each screen…`,
    'info',
  );
  await runBatchAudit(
    kept.map((frame, index) => {
      const name = `walkthrough-screen-${String(index + 1).padStart(2, '0')}.png`;
      return {
        name,
        load: () => Promise.resolve(frame.canvas),
        open: () => {
          frame.canvas.toBlob((blob) => {
            if (!blob || !blob.size) {
              setMessage('Could not encode this walkthrough screen as an image.', 'error');
              return;
            }
            void handleImageInput(new File([blob], name, { type: 'image/png' }), 'Loaded from walkthrough');
          }, 'image/png');
        },
      };
    }),
  );
}

function getBatchAuditCsvText() {
  const entries = state.batchAudit?.entries;
  if (!entries?.length) {
    return '';
  }
  return buildBatchAuditCsv(entries.map(({ name, audit }) => ({ name, audit })));
}

function downloadBatchAuditCsvFile() {
  const csv = getBatchAuditCsvText();
  if (!csv) {
    setMessage('Run a batch audit before downloading the batch CSV.', 'error');
    return;
  }
  downloadTextFile(csv, 'clearsight-batch-audit.csv', 'text/csv;charset=utf-8;');
  setMessage('Batch audit CSV downloaded (clearsight-batch-audit.csv).', 'info');
}

function buildBatchAuditPdfBytes() {
  const entries = state.batchAudit?.entries;
  if (!entries?.length) {
    throw new Error('Run a batch audit before building the portfolio PDF.');
  }
  const baselineComparison = state.batchBaseline
    ? compareBatchAuditToBaseline(entries, state.batchBaseline.report)
    : null;
  const doc = buildPortfolioPdfDoc({
    entries,
    portfolio: summarizeBatchAudit(entries),
    baselineComparison,
    skipped: state.batchAudit.failures,
    generatedAt: new Date().toISOString().replace('T', ' ').replace(/\.\d+Z$/, ' UTC'),
  });
  return buildPdfReport(doc);
}

function downloadBatchAuditPdf() {
  try {
    const bytes = buildBatchAuditPdfBytes();
    downloadBlob(new Blob([bytes], { type: 'application/pdf' }), 'clearsight-portfolio-audit.pdf');
    setMessage('Portfolio PDF downloaded (clearsight-portfolio-audit.pdf).', 'info');
  } catch (error) {
    setMessage(error.message, 'error');
  }
}

function isFlashScanDecodeSupported() {
  return typeof window.ImageDecoder === 'function';
}

function guessAnimationMimeType(file) {
  if (file.type) {
    return file.type;
  }
  const name = (file.name || '').toLowerCase();
  if (name.endsWith('.gif')) return 'image/gif';
  if (name.endsWith('.webp')) return 'image/webp';
  if (name.endsWith('.png') || name.endsWith('.apng')) return 'image/png';
  return '';
}

function isVideoFlashFile(file) {
  if ((file.type || '').toLowerCase().startsWith('video/')) {
    return true;
  }
  return /\.(mp4|m4v|webm|mov|ogv)$/i.test(file.name || '');
}

function waitForVideoEvent(video, eventNames, { timeoutMs, timeoutMessage, isDone }) {
  return new Promise((resolve, reject) => {
    let settled = false;
    const listeners = [];
    const finish = (error) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      clearInterval(readyPoll);
      listeners.forEach(([name, handler]) => video.removeEventListener(name, handler));
      if (error) {
        reject(error);
      } else {
        resolve();
      }
    };
    const timer = setTimeout(() => finish(new Error(timeoutMessage)), timeoutMs);
    // Some browsers skip seek/duration events for no-op transitions, so poll the
    // completion condition as a fallback to guarantee forward progress.
    const readyPoll = setInterval(() => {
      if (isDone()) finish();
    }, 100);
    eventNames.forEach((name) => {
      const handler = () => {
        if (name === 'error') {
          finish(new Error('The browser could not decode this video.'));
        } else if (isDone()) {
          finish();
        }
      };
      listeners.push([name, handler]);
      video.addEventListener(name, handler);
    });
  });
}

async function resolveVideoDurationMs(video) {
  if (Number.isFinite(video.duration) && video.duration > 0) {
    return video.duration * 1000;
  }
  // WebM produced by MediaRecorder (e.g. in-browser screen recordings) reports
  // Infinity until the element is forced to seek to the end of the stream.
  video.currentTime = 1e7;
  await waitForVideoEvent(video, ['durationchange', 'seeked', 'error'], {
    timeoutMs: 15000,
    timeoutMessage: 'Timed out while measuring the video duration.',
    isDone: () => Number.isFinite(video.duration) && video.duration > 0,
  });
  return video.duration * 1000;
}

async function seekVideoTo(video, timeSeconds) {
  video.currentTime = timeSeconds;
  await waitForVideoEvent(video, ['seeked', 'error'], {
    timeoutMs: 10000,
    timeoutMessage: 'Timed out while seeking through the video.',
    isDone: () =>
      !video.seeking && video.readyState >= 2 && Math.abs(video.currentTime - timeSeconds) < 0.25,
  });
}

async function decodeVideoFrames(file) {
  const objectUrl = URL.createObjectURL(file);
  const video = document.createElement('video');
  video.muted = true;
  video.playsInline = true;
  video.preload = 'auto';
  try {
    video.src = objectUrl;
    await waitForVideoEvent(video, ['loadedmetadata', 'error'], {
      timeoutMs: 15000,
      timeoutMessage: 'Timed out while reading the video metadata.',
      isDone: () => video.readyState >= 1,
    });

    const durationMs = await resolveVideoDurationMs(video);
    if (!video.videoWidth || !video.videoHeight) {
      throw new Error('The selected video has no visible video track.');
    }

    const plan = planVideoFrameSampling(durationMs, {
      sampleFps: FLASH_SCAN_VIDEO_SAMPLE_FPS,
      maxFrames: FLASH_SCAN_MAX_FRAMES,
    });
    const scale = Math.min(1, FLASH_SCAN_MAX_DIMENSION / Math.max(video.videoWidth, video.videoHeight));
    const width = Math.max(1, Math.round(video.videoWidth * scale));
    const height = Math.max(1, Math.round(video.videoHeight * scale));
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d', { willReadFrequently: true });

    const frames = [];
    for (let index = 0; index < plan.timesMs.length; index += 1) {
      if (dom.flashScanStatus && index % 20 === 0) {
        dom.flashScanStatus.textContent = `Sampling ${file.name || 'video'} at ${FLASH_SCAN_VIDEO_SAMPLE_FPS} fps — frame ${index + 1}/${plan.frameCount}…`;
      }
      // Register before seeking: `seeked` alone can fire before the new frame is
      // actually presented, which makes drawImage() grab the stale pre-seek frame.
      const framePresented =
        typeof video.requestVideoFrameCallback === 'function'
          ? new Promise((resolve) => {
              const fallback = setTimeout(resolve, 300);
              video.requestVideoFrameCallback(() => {
                clearTimeout(fallback);
                resolve();
              });
            })
          : null;
      await seekVideoTo(video, plan.timesMs[index] / 1000);
      if (framePresented) {
        await framePresented;
      }
      context.drawImage(video, 0, 0, width, height);
      frames.push({
        data: context.getImageData(0, 0, width, height).data,
        width,
        height,
        durationMs: plan.frameDurationMs,
      });
    }
    return { frames, truncated: plan.truncated, totalFrames: plan.totalFrames };
  } finally {
    video.removeAttribute('src');
    video.load();
    URL.revokeObjectURL(objectUrl);
  }
}

async function decodeAnimationFrames(file) {
  if (!isFlashScanDecodeSupported()) {
    throw new Error(
      'Animated-image scanning requires the WebCodecs ImageDecoder API (Chrome or Edge) — MP4/WebM/MOV video scanning still works in this browser.',
    );
  }
  const mimeType = guessAnimationMimeType(file);
  if (!mimeType || !(await window.ImageDecoder.isTypeSupported(mimeType))) {
    throw new Error(`This browser cannot decode "${file.name || 'the selected file'}" (${mimeType || 'unknown type'}) for animation scanning.`);
  }

  const buffer = await file.arrayBuffer();
  const decoder = new window.ImageDecoder({ data: buffer, type: mimeType });
  try {
    await decoder.tracks.ready;
    const track = decoder.tracks.selectedTrack;
    if (!track) {
      throw new Error('No image track found in the selected file.');
    }
    if (typeof decoder.completed?.then === 'function') {
      await decoder.completed;
    }
    const frameCount = Math.min(track.frameCount || 1, FLASH_SCAN_MAX_FRAMES);
    if (frameCount < 2) {
      throw new Error('The selected file has a single frame — flash scanning needs an animated GIF, APNG, or WebP.');
    }

    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d', { willReadFrequently: true });
    const frames = [];
    for (let frameIndex = 0; frameIndex < frameCount; frameIndex += 1) {
      const { image } = await decoder.decode({ frameIndex, completeFramesOnly: true });
      const sourceWidth = image.displayWidth || image.codedWidth;
      const sourceHeight = image.displayHeight || image.codedHeight;
      const scale = Math.min(1, FLASH_SCAN_MAX_DIMENSION / Math.max(sourceWidth, sourceHeight));
      const width = Math.max(1, Math.round(sourceWidth * scale));
      const height = Math.max(1, Math.round(sourceHeight * scale));
      if (!frames.length) {
        canvas.width = width;
        canvas.height = height;
      }
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      const durationMs = Number.isFinite(image.duration) && image.duration > 0 ? image.duration / 1000 : 100;
      image.close();
      frames.push({
        data: context.getImageData(0, 0, canvas.width, canvas.height).data,
        width: canvas.width,
        height: canvas.height,
        durationMs,
      });
    }
    return { frames, truncated: (track.frameCount || 1) > frameCount, totalFrames: track.frameCount || 1 };
  } finally {
    decoder.close();
  }
}

function buildFlashDemoFrames() {
  const width = 320;
  const height = 180;
  const frameCount = 14;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d', { willReadFrequently: true });
  const frames = [];

  for (let frameIndex = 0; frameIndex < frameCount; frameIndex += 1) {
    context.fillStyle = '#1e293b';
    context.fillRect(0, 0, width, height);
    context.fillStyle = '#0f172a';
    context.fillRect(0, 0, width, 34);
    context.fillStyle = '#94a3b8';
    context.fillRect(14, 13, 90, 8);
    context.fillRect(200, 13, 50, 8);
    context.fillRect(264, 13, 42, 8);

    const flashOn = frameIndex % 2 === 0;
    // Red↔green keeps the luminance swing below the general-flash threshold,
    // but crosses the independent WCAG saturated-red chromaticity threshold.
    context.fillStyle = flashOn ? '#ff0000' : '#008000';
    context.fillRect(14, 48, width - 28, 96);
    context.fillStyle = '#ffffff';
    context.font = 'bold 26px system-ui, sans-serif';
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillText('MEGA FLASH SALE', width / 2, 96);

    context.fillStyle = '#475569';
    context.fillRect(14, 156, 128, 10);
    context.fillRect(154, 156, 86, 10);

    frames.push({
      data: context.getImageData(0, 0, width, height).data,
      width,
      height,
      durationMs: 100,
    });
  }
  return frames;
}

function renderFlashScanResult() {
  if (!dom.flashScanResult) {
    return;
  }
  const scan = state.flashScan;
  if (!scan) {
    dom.flashScanResult.hidden = true;
    if (dom.flashScanStatus) {
      dom.flashScanStatus.textContent = FLASH_SCAN_IDLE_STATUS;
    }
    return;
  }

  const { analysis, label } = scan;
  dom.flashScanResult.hidden = false;
  dom.flashScanVerdict.dataset.risk = analysis.riskLevel;
  dom.flashScanVerdict.textContent = `${analysis.riskLabel} — ${label}`;

  const worstWindowText = analysis.worstWindow
    ? `${analysis.worstWindow.flashes} flash${analysis.worstWindow.flashes === 1 ? '' : 'es'} in ${(analysis.worstWindow.startMs / 1000).toFixed(1)}–${(analysis.worstWindow.endMs / 1000).toFixed(1)}s`
    : 'No qualifying flashes';
  const statEntries = [
    ['Frames analyzed', `${analysis.frameCount} (${(analysis.totalDurationMs / 1000).toFixed(1)}s @ ~${analysis.averageFps} fps)`],
    ['General flash rate', `${analysis.peakGeneralFlashesPerSecond}/sec (limit: 3/sec)`],
    ['Saturated-red rate', `${analysis.peakRedFlashesPerSecond}/sec (limit: 3/sec)`],
    ['Peak flashing area', `${analysis.peakViolatingAreaPercent}% of frame (limit: 25%)`],
    ['Worst 1s window', worstWindowText],
  ];
  dom.flashScanStats.innerHTML = '';
  statEntries.forEach(([term, value]) => {
    const wrap = document.createElement('div');
    const dt = document.createElement('dt');
    dt.textContent = term;
    const dd = document.createElement('dd');
    dd.textContent = value;
    wrap.append(dt, dd);
    dom.flashScanStats.append(wrap);
  });

  drawFlashScanTimeline(analysis);

  const guidanceByRisk = {
    high: 'Fix before shipping: slow the animation below four bright/dark or saturated-red cycles per second, shrink the flashing region below 25% of the viewport, or reduce its luminance/chromaticity swing. Provide a reduced-motion variant via prefers-reduced-motion.',
    caution: 'Close to the limit: general or saturated-red flashing reaches the rate threshold over a small area. Slow the cycle or soften the luminance/chromaticity swing, and honor prefers-reduced-motion.',
    low: 'Within the WCAG 2.3.1 general and saturated-red flash thresholds. Still consider a prefers-reduced-motion variant for vestibular and attention-sensitive users.',
  };
  dom.flashScanGuidance.textContent = guidanceByRisk[analysis.riskLevel] || guidanceByRisk.low;

  if (dom.flashScanStatus) {
    const truncatedNote = scan.truncated ? ` First ${analysis.frameCount} of ${scan.totalFrames} frames analyzed.` : '';
    dom.flashScanStatus.textContent = `Scanned ${label}: ${analysis.totalFlashEvents} general + ${analysis.totalRedFlashEvents} saturated-red flash events across an ${analysis.grid.columns}×${analysis.grid.rows} region grid.${truncatedNote}`;
  }
}

function drawFlashScanTimeline(analysis) {
  const canvas = dom.flashScanTimeline;
  const context = canvas?.getContext('2d');
  if (!context) {
    return;
  }
  const { width, height } = canvas;
  context.clearRect(0, 0, width, height);
  context.fillStyle = '#f8fafc';
  context.fillRect(0, 0, width, height);

  const timeline = analysis.luminanceTimeline;
  if (!timeline?.length) {
    return;
  }

  const padding = 8;
  const plotWidth = width - padding * 2;
  const plotHeight = height - padding * 2;
  const xFor = (index) => padding + (timeline.length === 1 ? 0 : (index / (timeline.length - 1)) * plotWidth);
  const yFor = (luminance) => padding + (1 - Math.max(0, Math.min(1, luminance))) * plotHeight;

  context.strokeStyle = '#cbd5e1';
  context.lineWidth = 1;
  context.setLineDash([4, 4]);
  context.beginPath();
  context.moveTo(padding, yFor(0.8));
  context.lineTo(width - padding, yFor(0.8));
  context.stroke();
  context.setLineDash([]);

  const strokeByRisk = { high: '#b91c1c', caution: '#c2410c', low: '#15803d' };
  context.strokeStyle = strokeByRisk[analysis.riskLevel] || strokeByRisk.low;
  context.lineWidth = 2;
  context.beginPath();
  timeline.forEach((luminance, index) => {
    const x = xFor(index);
    const y = yFor(luminance);
    if (index === 0) {
      context.moveTo(x, y);
    } else {
      context.lineTo(x, y);
    }
  });
  context.stroke();
}

function runFlashScanOnFrames(frames, label, { truncated = false, totalFrames = frames.length } = {}) {
  const analysis = analyzeFlashRisk(frames);
  state.flashScan = { label, analysis, truncated, totalFrames };
  renderFlashScanResult();
  return analysis;
}

async function runFlashScanFromFile(file) {
  if (!file) {
    return;
  }
  const isVideo = isVideoFlashFile(file);
  const fallbackLabel = isVideo ? 'video' : 'animation';
  if (dom.flashScanStatus) {
    dom.flashScanStatus.textContent = `Decoding ${file.name || fallbackLabel}…`;
  }
  try {
    const { frames, truncated, totalFrames } = isVideo
      ? await decodeVideoFrames(file)
      : await decodeAnimationFrames(file);
    runFlashScanOnFrames(frames, file.name || fallbackLabel, { truncated, totalFrames });
    setMessage(`Flash scan complete for ${file.name || fallbackLabel}.`, 'info');
  } catch (error) {
    state.flashScan = null;
    renderFlashScanResult();
    if (dom.flashScanStatus) {
      dom.flashScanStatus.textContent = `Flash scan failed: ${error.message}`;
    }
    setMessage(`Flash scan failed: ${error.message}`, 'error');
  }
}

function runFlashScanDemo() {
  const analysis = runFlashScanOnFrames(buildFlashDemoFrames(), 'built-in flashing promo banner (demo)');
  setMessage('Built-in flashing demo analyzed — this banner exceeds the WCAG 2.3.1 flash threshold.', 'info');
  return analysis;
}

const FOCUS_FRAME_MAX_DIMENSION = 2400;
const FOCUS_CHECK_IDLE_STATUS =
  'No focus pair analyzed yet. Load the same view unfocused and focused (or run a demo) to measure the focus indicator.';

const focusPairSlots = { base: null, focus: null };

function imageElementToFocusFrame(image, label) {
  const naturalWidth = image.naturalWidth || image.width;
  const naturalHeight = image.naturalHeight || image.height;
  if (!naturalWidth || !naturalHeight) {
    throw new Error('the frame has no measurable pixels');
  }
  const scale = Math.min(1, FOCUS_FRAME_MAX_DIMENSION / Math.max(naturalWidth, naturalHeight));
  const width = Math.max(1, Math.round(naturalWidth * scale));
  const height = Math.max(1, Math.round(naturalHeight * scale));
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(image, 0, 0, width, height);
  return { label, width, height, imageData: ctx.getImageData(0, 0, width, height) };
}

function canvasToFocusFrame(canvas, label) {
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  return {
    label,
    width: canvas.width,
    height: canvas.height,
    imageData: ctx.getImageData(0, 0, canvas.width, canvas.height),
  };
}

function truncateFocusLabel(label) {
  return label.length > 30 ? `${label.slice(0, 27)}…` : label;
}

function setFocusSlotButtonLabels() {
  if (dom.focusBaseBtn) {
    dom.focusBaseBtn.textContent = focusPairSlots.base
      ? `1. Unfocused: ${truncateFocusLabel(focusPairSlots.base.label)}`
      : '1. Load unfocused frame…';
  }
  if (dom.focusFocusBtn) {
    dom.focusFocusBtn.textContent = focusPairSlots.focus
      ? `2. Focused: ${truncateFocusLabel(focusPairSlots.focus.label)}`
      : '2. Load focused frame…';
  }
}

async function loadFocusFrameFromFile(slot, file) {
  if (!isSupportedImageFile(file)) {
    setMessage(
      `The selected file is not a supported image. Accepted formats: ${SUPPORTED_IMAGE_FORMATS_LABEL}.`,
      'error',
    );
    return;
  }
  try {
    const image = await decodeImageFileForBatch(file);
    focusPairSlots[slot] = imageElementToFocusFrame(
      image,
      file.name || (slot === 'base' ? 'unfocused frame' : 'focused frame'),
    );
    setFocusSlotButtonLabels();
    runFocusPairAnalysis();
  } catch (error) {
    setMessage(
      `Could not load the ${slot === 'base' ? 'unfocused' : 'focused'} frame: ${error.message}.`,
      'error',
    );
  }
}

function runFocusPairAnalysis() {
  const base = focusPairSlots.base;
  const focus = focusPairSlots.focus;
  if (!base || !focus) {
    if (dom.focusCheckStatus) {
      dom.focusCheckStatus.textContent = base
        ? `Unfocused frame loaded (${base.label}, ${base.width}×${base.height}px). Now load the focused frame of the same view.`
        : focus
          ? `Focused frame loaded (${focus.label}, ${focus.width}×${focus.height}px). Now load the unfocused frame of the same view.`
          : FOCUS_CHECK_IDLE_STATUS;
    }
    return null;
  }
  if (base.width !== focus.width || base.height !== focus.height) {
    state.focusCheck = null;
    renderFocusCheckResult();
    const mismatch = `Frame sizes do not match (${base.width}×${base.height} vs ${focus.width}×${focus.height}px) — capture the same view at the same size.`;
    if (dom.focusCheckStatus) {
      dom.focusCheckStatus.textContent = mismatch;
    }
    setMessage(mismatch, 'error');
    return null;
  }
  try {
    const analysis = analyzeFocusIndicator(base.imageData.data, focus.imageData.data, base.width, base.height);
    state.focusCheck = { analysis, baseLabel: base.label, focusLabel: focus.label };
    renderFocusCheckResult();
    return analysis;
  } catch (error) {
    state.focusCheck = null;
    renderFocusCheckResult();
    setMessage(`Focus analysis failed: ${error.message}`, 'error');
    return null;
  }
}

function paintFocusOverlay(analysis) {
  const canvas = dom.focusCheckOverlay;
  if (!canvas || !focusPairSlots.focus) {
    return;
  }
  const { width, height, mask } = analysis;
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  ctx.putImageData(focusPairSlots.focus.imageData, 0, 0);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.55)';
  ctx.fillRect(0, 0, width, height);
  if (!mask) {
    return;
  }
  const highlight = ctx.getImageData(0, 0, width, height);
  const px = highlight.data;
  for (let i = 0; i < mask.length; i += 1) {
    const value = mask[i];
    if (!value) {
      continue;
    }
    const o = i * 4;
    if (value === 2) {
      px[o] = 217;
      px[o + 1] = 70;
      px[o + 2] = 239;
    } else {
      px[o] = Math.round(px[o] * 0.45 + 217 * 0.55);
      px[o + 1] = Math.round(px[o + 1] * 0.45 + 70 * 0.55);
      px[o + 2] = Math.round(px[o + 2] * 0.45 + 239 * 0.55);
    }
    px[o + 3] = 255;
  }
  ctx.putImageData(highlight, 0, 0);
}

function renderFocusCheckResult() {
  if (!dom.focusCheckResult) {
    return;
  }
  const check = state.focusCheck;
  if (!check) {
    dom.focusCheckResult.hidden = true;
    if (dom.focusCheckStatus) {
      dom.focusCheckStatus.textContent = FOCUS_CHECK_IDLE_STATUS;
    }
    return;
  }

  const { analysis, baseLabel, focusLabel } = check;
  dom.focusCheckResult.hidden = false;
  dom.focusCheckVerdict.dataset.verdict = analysis.verdict;
  dom.focusCheckVerdict.textContent = analysis.verdictLabel;

  const stats = [
    ['Changed pixels', `${analysis.changedPixels.toLocaleString()} px`],
    ['Contrasting area (≥3:1)', `${analysis.contrastingAreaCss} CSS px²`],
    ['2.4.13 area minimum', `${analysis.requiredIndicatorArea} CSS px²`],
    [
      'Change contrast',
      analysis.meanChangeRatio
        ? `mean ${analysis.meanChangeRatio}:1 · max ${analysis.maxChangeRatio}:1`
        : 'no measurable change',
    ],
    ['Indicator color', analysis.indicatorColor ? analysis.indicatorColor.toUpperCase() : '—'],
  ];
  dom.focusCheckStats.innerHTML = '';
  stats.forEach(([label, value]) => {
    const wrap = document.createElement('div');
    const dt = document.createElement('dt');
    dt.textContent = label;
    const dd = document.createElement('dd');
    dd.textContent = value;
    wrap.append(dt, dd);
    dom.focusCheckStats.append(wrap);
  });

  paintFocusOverlay(analysis);

  const guidanceByVerdict = {
    none:
      'No pixels changed between the two frames beyond noise. If focus really moved in frame 2, the control has no visible indicator — WCAG 2.4.7 Does Not Support. Add a :focus-visible outline of at least 2px with ≥3:1 contrast against the surroundings.',
    weak:
      'An indicator exists but is too faint or too small to rely on: fewer ≥3:1 contrasting pixels than a 1px perimeter of the component. Thicken the outline and pick a focus color with at least 3:1 contrast against the page and the control.',
    strong:
      'The indicator clears the WCAG 2.4.13 bar — contrasting area and 3:1 change contrast measured from real pixels. Component bounds are approximated by the indicator’s own bounding box, which a ring drawn around the control makes a fair proxy.',
  };
  dom.focusCheckGuidance.textContent = guidanceByVerdict[analysis.verdict] || '';

  if (dom.focusCheckStatus) {
    dom.focusCheckStatus.textContent = `Diffed "${baseLabel}" vs "${focusLabel}" (${analysis.width}×${analysis.height}px): ${analysis.changedPixels.toLocaleString()} changed px, ${analysis.contrastingPixels.toLocaleString()} at ≥3:1 change contrast.`;
  }
}

function buildFocusDemoPair(kind) {
  const makeCanvas = () => {
    const canvas = document.createElement('canvas');
    canvas.width = 1280;
    canvas.height = 720;
    return canvas;
  };
  const baseCanvas = makeCanvas();
  paintDemoScene(baseCanvas.getContext('2d'), 'ui');
  const focusCanvas = makeCanvas();
  const fctx = focusCanvas.getContext('2d');
  paintDemoScene(fctx, 'ui');
  // Focus ring around the Export button (440, 260, 320x90), drawn on open
  // page so the diff isolates cleanly. Strong: bold blue, 6px. Weak: a faint
  // near-page gray a real design system might ship — visible in a diff but
  // nowhere near the 3:1 change-contrast bar.
  if (kind === 'strong') {
    fctx.lineWidth = 6;
    fctx.strokeStyle = '#1d4ed8';
    fctx.strokeRect(432, 252, 336, 106);
  } else {
    fctx.lineWidth = 2;
    fctx.strokeStyle = '#d8e0ea';
    fctx.strokeRect(434, 254, 332, 102);
  }
  return { baseCanvas, focusCanvas };
}

function runFocusCheckDemo(kind = 'weak') {
  const { baseCanvas, focusCanvas } = buildFocusDemoPair(kind);
  focusPairSlots.base = canvasToFocusFrame(baseCanvas, 'ui-sample (unfocused)');
  focusPairSlots.focus = canvasToFocusFrame(
    focusCanvas,
    kind === 'strong' ? 'ui-sample (bold 6px focus ring)' : 'ui-sample (faint 2px focus ring)',
  );
  setFocusSlotButtonLabels();
  const analysis = runFocusPairAnalysis();
  setMessage(
    kind === 'strong'
      ? 'Built-in focus demo: the bold 6px ring meets the WCAG 2.4.13 area and change-contrast minimums.'
      : 'Built-in focus demo: the faint 2px ring is visible in the diff but fails the 3:1 change-contrast bar.',
    'info',
  );
  return analysis;
}

const FOCUS_SEQUENCE_IDLE_STATUS =
  'No tab-through recording analyzed yet. Start the clip on the unfocused view, press Tab through the controls without scrolling, then load it — or run the built-in demo.';
const FOCUS_SEQUENCE_VIDEO_FPS = 3;
const FOCUS_SEQUENCE_MAX_FRAMES = 90;
const FOCUS_SEQUENCE_MAX_DIMENSION = 1280;
const FOCUS_SEQUENCE_VERDICT_COLORS = { strong: '#15803d', weak: '#b45309' };

function isFocusSequenceVideoFile(file) {
  if (!file) {
    return false;
  }
  if (typeof file.type === 'string' && file.type.startsWith('video/')) {
    return true;
  }
  return /\.(mp4|webm|mov|m4v)$/i.test(file.name || '');
}

async function runFocusSequenceFromVideo(file) {
  if (!isFocusSequenceVideoFile(file)) {
    setMessage('Focus order mapping needs an MP4, WebM, or MOV screen recording.', 'error');
    return null;
  }

  const objectUrl = URL.createObjectURL(file);
  const video = document.createElement('video');
  video.muted = true;
  video.playsInline = true;
  video.preload = 'auto';
  try {
    if (dom.focusSequenceStatus) {
      dom.focusSequenceStatus.textContent = `Reading ${file.name || 'video'} metadata…`;
    }
    video.src = objectUrl;
    await waitForVideoEvent(video, ['loadedmetadata', 'error'], {
      timeoutMs: 15000,
      timeoutMessage: 'Timed out while reading the video metadata.',
      isDone: () => video.readyState >= 1,
    });
    const durationMs = await resolveVideoDurationMs(video);
    if (!video.videoWidth || !video.videoHeight) {
      throw new Error('the selected video has no visible video track');
    }

    const plan = planVideoFrameSampling(durationMs, {
      sampleFps: FOCUS_SEQUENCE_VIDEO_FPS,
      maxFrames: FOCUS_SEQUENCE_MAX_FRAMES,
    });
    const scale = Math.min(1, FOCUS_SEQUENCE_MAX_DIMENSION / Math.max(video.videoWidth, video.videoHeight));
    const width = Math.max(1, Math.round(video.videoWidth * scale));
    const height = Math.max(1, Math.round(video.videoHeight * scale));
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d', { willReadFrequently: true });

    // Fold frame-by-frame: only the unfocused baseline stays in memory, so a
    // long recording never accumulates decoded frames.
    const tracker = createFocusSequenceTracker(width, height);
    let baselineImage = null;
    for (let index = 0; index < plan.timesMs.length; index += 1) {
      if (dom.focusSequenceStatus && index % 10 === 0) {
        dom.focusSequenceStatus.textContent = `Mapping ${file.name || 'video'} — frame ${index + 1}/${plan.frameCount}…`;
      }
      const framePresented =
        typeof video.requestVideoFrameCallback === 'function'
          ? new Promise((resolve) => {
              const fallback = setTimeout(resolve, 300);
              video.requestVideoFrameCallback(() => {
                clearTimeout(fallback);
                resolve();
              });
            })
          : null;
      await seekVideoTo(video, plan.timesMs[index] / 1000);
      if (framePresented) {
        await framePresented;
      }
      context.drawImage(video, 0, 0, width, height);
      const imageData = context.getImageData(0, 0, width, height);
      if (!baselineImage) {
        baselineImage = imageData;
      }
      trackFocusSequenceFrame(tracker, imageData.data);
    }

    const result = summarizeFocusSequence(tracker);
    state.focusSequence = {
      result,
      sourceLabel: file.name || 'tab-through video',
      baseline: baselineImage,
      truncated: Boolean(plan.truncated),
    };
    renderFocusSequenceResult();
    if (result.summary.stops > 0) {
      setMessage(
        `Focus order mapped: ${result.summary.stops} stop${result.summary.stops === 1 ? '' : 's'} across ${result.summary.framesAnalyzed} sampled frames — ${result.summary.strong} meet the WCAG 2.4.13 bar.`,
        'info',
      );
    } else {
      setMessage(
        'No focus indicator could be localized in the recording. Make sure the clip starts on the unfocused view and the view stays still while tabbing.',
        'error',
      );
    }
    return result;
  } catch (error) {
    state.focusSequence = null;
    renderFocusSequenceResult();
    setMessage(`Focus order mapping failed: ${error.message}.`, 'error');
    return null;
  } finally {
    video.removeAttribute('src');
    video.load();
    URL.revokeObjectURL(objectUrl);
  }
}

function buildFocusSequenceDemoFrames() {
  const width = 1280;
  const height = 720;
  const paintFrame = (decorate) => {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    paintDemoScene(ctx, 'ui');
    if (decorate) {
      decorate(ctx);
    }
    return ctx.getImageData(0, 0, width, height);
  };
  const strongRing = (x, y, w, h) => (ctx) => {
    ctx.lineWidth = 6;
    ctx.strokeStyle = '#1d4ed8';
    ctx.strokeRect(x - 8, y - 8, w + 16, h + 16);
  };
  const weakRing = (x, y, w, h) => (ctx) => {
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#d8e0ea';
    ctx.strokeRect(x - 6, y - 6, w + 12, h + 12);
  };

  // Demo scene geometry: Create report (80,260,320,90), ghost search input
  // (720,90,460,70), Share with team (810,260,360,90).
  const baseline = paintFrame(null);
  const frames = [
    baseline, // unfocused baseline
    paintFrame(null), // idle frame before the first Tab press
    paintFrame(strongRing(80, 260, 320, 90)), // stop 1: Create report
    paintFrame(strongRing(80, 260, 320, 90)), // same stop sampled twice
    paintFrame(weakRing(720, 90, 460, 70)), // stop 2: ghost input, faint ring
    paintFrame(strongRing(810, 260, 360, 90)), // stop 3: Share with team
    paintFrame(strongRing(80, 260, 320, 90)), // Tab cycles back to stop 1
  ];
  return { frames, baseline, width, height };
}

function runFocusSequenceDemo() {
  const { frames, baseline, width, height } = buildFocusSequenceDemoFrames();
  const result = analyzeFocusSequence(
    frames.map((frame) => frame.data),
    width,
    height,
  );
  state.focusSequence = {
    result,
    sourceLabel: 'ui-sample (built-in tab-through demo)',
    baseline,
    truncated: false,
  };
  renderFocusSequenceResult();
  setMessage(
    'Built-in tab-through demo: 3 focus stops mapped — 2 meet the WCAG 2.4.13 bar, the faint ring on the ghost search input does not.',
    'info',
  );
  return result;
}

function paintFocusSequenceOverlay() {
  const canvas = dom.focusSequenceOverlay;
  const sequence = state.focusSequence;
  if (!canvas || !sequence?.baseline) {
    return;
  }
  const { result, baseline } = sequence;
  canvas.width = result.width;
  canvas.height = result.height;
  const ctx = canvas.getContext('2d');
  ctx.putImageData(baseline, 0, 0);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.55)';
  ctx.fillRect(0, 0, result.width, result.height);

  const badgeRadius = Math.max(14, Math.round(Math.min(result.width, result.height) * 0.032));
  if (result.stops.length > 1) {
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = Math.max(2, Math.round(badgeRadius / 8));
    ctx.setLineDash([badgeRadius / 2, badgeRadius / 2.6]);
    ctx.beginPath();
    result.stops.forEach((stop, index) => {
      if (index === 0) {
        ctx.moveTo(stop.center.x, stop.center.y);
      } else {
        ctx.lineTo(stop.center.x, stop.center.y);
      }
    });
    ctx.stroke();
    ctx.setLineDash([]);
  }

  result.stops.forEach((stop) => {
    const color = FOCUS_SEQUENCE_VERDICT_COLORS[stop.verdict] || FOCUS_SEQUENCE_VERDICT_COLORS.weak;
    ctx.lineWidth = Math.max(3, Math.round(badgeRadius / 7));
    ctx.strokeStyle = color;
    ctx.strokeRect(stop.boundingBox.x, stop.boundingBox.y, stop.boundingBox.width, stop.boundingBox.height);
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(stop.center.x, stop.center.y, badgeRadius, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.font = `bold ${Math.round(badgeRadius * 1.15)}px "Inter", "Segoe UI", sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(String(stop.order), stop.center.x, stop.center.y + 1);
  });
  ctx.textAlign = 'start';
  ctx.textBaseline = 'alphabetic';
}

function renderFocusSequenceResult() {
  if (!dom.focusSequenceResult) {
    return;
  }
  const sequence = state.focusSequence;
  if (!sequence) {
    dom.focusSequenceResult.hidden = true;
    if (dom.downloadFocusSequenceBtn) {
      dom.downloadFocusSequenceBtn.disabled = true;
    }
    if (dom.focusSequenceStatus) {
      dom.focusSequenceStatus.textContent = FOCUS_SEQUENCE_IDLE_STATUS;
    }
    return;
  }

  const { result, sourceLabel, truncated } = sequence;
  const { summary } = result;
  dom.focusSequenceResult.hidden = false;
  dom.focusSequenceVerdict.dataset.verdict = result.aggregateVerdict;
  dom.focusSequenceVerdict.textContent = result.aggregateLabel;

  const skipped = [
    `${summary.duplicateFrames} duplicate`,
    `${summary.revisitFrames} revisit`,
    `${summary.noIndicatorFrames} no-indicator`,
  ];
  if (summary.viewChangedFrames > 0) {
    skipped.push(`${summary.viewChangedFrames} view-changed`);
  }
  if (summary.overflowFrames > 0) {
    skipped.push(`${summary.overflowFrames} beyond the stop cap`);
  }
  const stats = [
    ['Frames analyzed', String(summary.framesAnalyzed)],
    ['Focus stops mapped', String(summary.stops)],
    ['Meet 2.4.13', summary.stops ? `${summary.strong} of ${summary.stops}` : '—'],
    ['Below the bar', String(summary.weak)],
    ['Skipped samples', skipped.join(' · ')],
  ];
  dom.focusSequenceStats.innerHTML = '';
  stats.forEach(([label, value]) => {
    const wrap = document.createElement('div');
    const dt = document.createElement('dt');
    dt.textContent = label;
    const dd = document.createElement('dd');
    dd.textContent = value;
    wrap.append(dt, dd);
    dom.focusSequenceStats.append(wrap);
  });

  paintFocusSequenceOverlay();
  if (dom.downloadFocusSequenceBtn) {
    dom.downloadFocusSequenceBtn.disabled = result.stops.length < 1;
  }

  dom.focusSequenceStops.innerHTML = '';
  result.stops.forEach((stop) => {
    const item = document.createElement('li');
    item.dataset.verdict = stop.verdict;
    const chip = document.createElement('span');
    chip.className = 'focus-stop-chip';
    if (stop.indicatorColor) {
      chip.style.background = stop.indicatorColor;
    }
    chip.setAttribute('aria-hidden', 'true');
    const text = document.createElement('span');
    text.textContent =
      `Stop ${stop.order}: ${stop.verdict === 'strong' ? 'meets WCAG 2.4.13' : 'below WCAG 2.4.13'} — ` +
      `${stop.boundingBox.width}×${stop.boundingBox.height}px at (${stop.boundingBox.x}, ${stop.boundingBox.y}), ` +
      `contrasting area ${stop.contrastingAreaCss} vs ${stop.requiredIndicatorArea} CSS px² required` +
      `${stop.maxChangeRatio ? `, max change contrast ${stop.maxChangeRatio}:1` : ''}` +
      `${stop.indicatorColor ? `, indicator ${stop.indicatorColor.toUpperCase()}` : ''}`;
    item.append(chip, text);
    dom.focusSequenceStops.append(item);
  });

  const guidanceByVerdict = {
    none:
      'No frame changed enough from the unfocused baseline to localize a focus indicator. If focus really moved during the recording, the controls have no visible indicator (WCAG 2.4.7 Does Not Support) — add a :focus-visible outline of at least 2px with ≥3:1 contrast.',
    weak: `${summary.weak} of ${summary.stops} stops are visible in a diff but below the WCAG 2.4.13 area/contrast bar${result.worstStopOrder ? ` (worst: stop ${result.worstStopOrder})` : ''} — a keyboard user tabbing through this screen loses track of focus exactly there. Thicken those outlines or raise their change contrast to ≥3:1.`,
    strong:
      'Every mapped stop clears the WCAG 2.4.13 bar, so the focus indicator stays visible through the whole recorded tab order. Component bounds are approximated per stop by the indicator’s own bounding box.',
  };
  dom.focusSequenceGuidance.textContent = guidanceByVerdict[result.aggregateVerdict] || '';

  if (dom.focusSequenceStatus) {
    dom.focusSequenceStatus.textContent =
      `Mapped "${sourceLabel}" (${result.width}×${result.height}px): ${summary.framesAnalyzed} frames → ` +
      `${summary.stops} stop${summary.stops === 1 ? '' : 's'} (${summary.strong} strong · ${summary.weak} weak).` +
      `${truncated ? ` Sampling capped at ${FOCUS_SEQUENCE_MAX_FRAMES} frames.` : ''}`;
  }
}

function init() {
  void initializeOfflineApp();
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
      setMessage(
        `The selected file is not a supported image. Accepted formats: ${SUPPORTED_IMAGE_FORMATS_LABEL}.`,
        'error',
      );
      return;
    }
    handleImageInput(file, 'Loaded image');
  });

  if (dom.captureScreenBtn) {
    if (!isLiveCaptureSupported()) {
      dom.captureScreenBtn.disabled = true;
      dom.captureScreenBtn.title =
        'Live capture requires a browser with screen-capture support (getDisplayMedia).';
    }
    dom.captureScreenBtn.addEventListener('click', () => {
      void captureLiveAppFrame();
    });
  }

  if (dom.recordWalkthroughBtn) {
    if (!isLiveCaptureSupported()) {
      dom.recordWalkthroughBtn.disabled = true;
      dom.recordWalkthroughBtn.title =
        'Walkthrough recording requires a browser with screen-capture support (getDisplayMedia).';
    }
    dom.recordWalkthroughBtn.addEventListener('click', () => {
      if (walkthroughSession) {
        void stopWalkthroughRecording();
      } else {
        void startWalkthroughRecording();
      }
    });
  }

  if (dom.flashScanFileBtn) {
    if (!isFlashScanDecodeSupported()) {
      dom.flashScanFileBtn.title =
        'This browser lacks the WebCodecs ImageDecoder API, so animated GIF/APNG/WebP scanning is unavailable — MP4/WebM/MOV video scanning still works.';
    }
    dom.flashScanFileBtn.addEventListener('click', () => {
      dom.flashScanInput?.click();
    });
  }

  dom.flashScanInput?.addEventListener('change', (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (file) {
      void runFlashScanFromFile(file);
    }
  });

  dom.flashScanDemoBtn?.addEventListener('click', () => {
    runFlashScanDemo();
  });

  dom.focusBaseBtn?.addEventListener('click', () => {
    dom.focusBaseInput?.click();
  });
  dom.focusFocusBtn?.addEventListener('click', () => {
    dom.focusFocusInput?.click();
  });
  dom.focusBaseInput?.addEventListener('change', (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (file) {
      void loadFocusFrameFromFile('base', file);
    }
  });
  dom.focusFocusInput?.addEventListener('change', (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (file) {
      void loadFocusFrameFromFile('focus', file);
    }
  });
  dom.focusDemoWeakBtn?.addEventListener('click', () => {
    runFocusCheckDemo('weak');
  });
  dom.focusDemoStrongBtn?.addEventListener('click', () => {
    runFocusCheckDemo('strong');
  });
  dom.focusSequenceVideoBtn?.addEventListener('click', () => {
    dom.focusSequenceVideoInput?.click();
  });
  dom.focusSequenceVideoInput?.addEventListener('change', (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (file) {
      void runFocusSequenceFromVideo(file);
    }
  });
  dom.focusSequenceDemoBtn?.addEventListener('click', () => {
    runFocusSequenceDemo();
  });
  dom.downloadFocusSequenceBtn?.addEventListener('click', () => {
    if (!state.focusSequence?.result?.stops?.length || !dom.focusSequenceOverlay?.width) {
      setMessage('Map at least one focus stop before downloading the focus-order evidence.', 'error');
      return;
    }
    const safeBase = getSafeFileName(state.sourceName || state.focusSequence.sourceLabel || 'clearsight');
    const filename = `${safeBase}-focus-order-map.png`;
    downloadCanvasAsImage(dom.focusSequenceOverlay, filename);
    setMessage(
      `Focus-order evidence downloaded as ${filename}. It will also be included automatically in the submission package.`,
      'success',
    );
  });

  const handleImageUrlSubmit = () => {
    const sourceUrl = dom.imageUrlInput?.value || '';
    if (!sourceUrl.trim()) {
      setMessage('Enter an image URL before loading.', 'error');
      return;
    }
    loadImageFromUrl(sourceUrl);
  };

  if (dom.loadImageUrlBtn) {
    dom.loadImageUrlBtn.addEventListener('click', () => {
      handleImageUrlSubmit();
    });
  }

  if (dom.imageUrlInput) {
    dom.imageUrlInput.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') {
        event.preventDefault();
        handleImageUrlSubmit();
      }
    });
  }

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
        setMessage(
          `Drop failed: no supported image file found. Accepted formats: ${SUPPORTED_IMAGE_FORMATS_LABEL}.`,
          'error',
        );
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
    if (isTypingTarget(event.target) || event.target?.isContentEditable) {
      return;
    }

    const clipboardData = event.clipboardData;
    if (!clipboardData) {
      return;
    }

    const file = getImageFromClipboardData(clipboardData);
    if (!file) {
      const pastedUrl = extractImageUrlFromClipboardText(clipboardData.getData('text/plain'));
      if (pastedUrl) {
        event.preventDefault();
        if (dom.imageUrlInput) {
          dom.imageUrlInput.value = pastedUrl;
        }
        loadImageFromUrl(pastedUrl);
        return;
      }

      const hasItems = Array.from(clipboardData.items || []).length > 0;
      if (hasItems) {
        setMessage(
          `Clipboard does not contain a supported image. Accepted formats: ${SUPPORTED_IMAGE_FORMATS_LABEL}.`,
          'error',
        );
      }
      return;
    }
    if (!isSupportedImageFile(file)) {
      setMessage(
        `Clipboard image "${file.name || 'item'}" is not supported. Accepted formats: ${SUPPORTED_IMAGE_FORMATS_LABEL}.`,
        'error',
      );
      return;
    }
    event.preventDefault();
    handleImageInput(file, 'Pasted image');
  });

  dom.demoUi.addEventListener('click', () => {
    void loadSample('ui').catch((error) => setMessage(error.message, 'error'));
  });
  dom.demoDashboard.addEventListener('click', () => {
    void loadSample('dashboard').catch((error) => setMessage(error.message, 'error'));
  });
  dom.judgeTimerStartBtn?.addEventListener('click', () => {
    startJudgeTimer({ forceRestart: false });
  });
  dom.judgeTimerResetBtn?.addEventListener('click', () => {
    resetJudgeTimer();
    setMessage('Judge timer reset.', 'info');
  });
  dom.quickDemoBtn?.addEventListener('click', () => {
    void runQuickJudgeWorkflow();
  });
  dom.heroDemoBtn?.addEventListener('click', () => {
    dom.quickDemoBtn?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    void runQuickJudgeWorkflow();
  });
  dom.processBtn.addEventListener('click', () => {
    if (state.isRendering) {
      cancelRenderSession();
      setMessage('Render canceled.', 'info');
      return;
    }
    renderAll();
  });
  dom.clearWorkspaceBtn?.addEventListener('click', () => {
    clearWorkspace({ clearBatch: true });
  });
  dom.batchAuditFilesBtn?.addEventListener('click', () => {
    dom.batchAuditInput?.click();
  });
  dom.batchBaselineBtn?.addEventListener('click', () => {
    dom.batchBaselineInput?.click();
  });
  dom.batchBaselineInput?.addEventListener('change', (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    void loadBatchBaselineFile(file);
  });
  dom.batchAuditInput?.addEventListener('change', (event) => {
    const files = Array.from(event.target.files || []);
    event.target.value = '';
    runBatchAuditFromFiles(files);
  });
  dom.batchAuditSampleBtn?.addEventListener('click', () => {
    void runBatchSampleAudit();
  });
  dom.batchAuditCsvBtn?.addEventListener('click', () => {
    downloadBatchAuditCsvFile();
  });
  dom.batchAuditPdfBtn?.addEventListener('click', downloadBatchAuditPdf);
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
  dom.downloadChecklistShotsBtn?.addEventListener('click', downloadChecklistScreenshots);
  dom.downloadContactBtn?.addEventListener('click', downloadContactSheet);
  dom.downloadTopImpactBtn?.addEventListener('click', downloadTopImpactPack);
  dom.downloadReelBtn?.addEventListener('click', () => {
    exportVisionReel();
  });
  dom.downloadReportBtn?.addEventListener('click', downloadAccessibilityReport);
  dom.downloadReportCsvBtn?.addEventListener('click', downloadAccessibilityReportCsv);
  dom.downloadSummaryBtn?.addEventListener('click', downloadJudgeSummary);
  dom.downloadConformanceBtn?.addEventListener('click', downloadConformanceSummary);
  dom.downloadPackageBtn?.addEventListener('click', downloadSubmissionPackage);
  dom.downloadReviewerPacketBtn?.addEventListener('click', downloadReviewerPacket);
  dom.downloadAuditPdfBtn?.addEventListener('click', downloadAuditPdf);
  dom.downloadVerdictCardBtn?.addEventListener('click', downloadAuditVerdictCard);
  dom.downloadRepairProofBtn?.addEventListener('click', downloadRepairProofCard);
  dom.copyShareLinkBtn?.addEventListener('click', copyShareableAuditLink);
  dom.showShareQrBtn?.addEventListener('click', () => {
    void showShareableAuditQr();
  });
  dom.hideShareQrBtn?.addEventListener('click', hideShareQrCard);
  dom.downloadShareQrBtn?.addEventListener('click', downloadShareQrPng);
  dom.sharedAuditDismissBtn?.addEventListener('click', dismissSharedAuditView);
  dom.sharedAuditCopyBtn?.addEventListener('click', () => {
    copyTextWithFallback({
      payload: window.location.href,
      filename: 'clearsight-share-link.txt',
      mimeType: 'text/plain;charset=utf-8',
      copiedMessage: 'Share link copied to clipboard.',
      downloadMessage: 'Clipboard unavailable, share link downloaded for manual copy.',
    });
  });
  dom.sharedAuditPlanBtn?.addEventListener('click', copySharedAuditActionPlan);
  dom.downloadTextScanBtn?.addEventListener('click', downloadAnnotatedTextScan);
  dom.repairAllTextBtn?.addEventListener('click', () => {
    void repairAllTextScanRegions();
  });
  dom.repairAllAuditBtn?.addEventListener('click', () => {
    void repairAllAuditFailures();
  });
  dom.undoImageRepairBtn?.addEventListener('click', () => {
    void undoLastImageRepair();
  });
  dom.copyCssFixesBtn?.addEventListener('click', () => {
    void copyCssFixSheet();
  });
  dom.downloadCssFixesBtn?.addEventListener('click', downloadCssFixSheet);
  dom.textScanCanvas?.addEventListener('click', inspectTextScanCanvasRegion);
  dom.textScanCanvas?.addEventListener('keydown', (event) => {
    if (event.key !== 'Enter' && event.key !== ' ') {
      return;
    }
    event.preventDefault();
    const worst = state.textScan?.regions?.[0];
    if (worst) {
      loadTextScanRegion(worst, 0, { guideToFix: true });
    }
  });
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
  dom.recolorPreviewBtn?.addEventListener('click', runRecolorPreview);
  dom.recolorDownloadBtn?.addEventListener('click', downloadRecolorPng);
  dom.recolorApplyBtn?.addEventListener('click', applyRecolorAndVerify);
  dom.recolorRevealRange?.addEventListener('input', (event) => setRecolorReveal(event.target.value));
  dom.swapContrastBtn?.addEventListener('click', swapContrastColors);
  dom.autoFixContrastBtn?.addEventListener('click', autoFixContrastPair);
  dom.undoContrastBtn?.addEventListener('click', undoLastContrastChange);
  dom.downloadContrastSnapshotBtn?.addEventListener('click', downloadContrastSnapshot);
  dom.copyContrastBtn?.addEventListener('click', () => {
    copyContrastResult().catch(() => setMessage('Clipboard copy was interrupted.', 'error'));
  });
  dom.copyContrastCssBtn?.addEventListener('click', () => {
    copyCurrentContrastCssSnippet().catch(() => setMessage('Clipboard copy was interrupted.', 'error'));
  });
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
  dom.copyReportJsonBtn?.addEventListener('click', () => {
    clearDemoCopyStatus();
    copyAccessibilityReportJson().catch(() => setDemoCopyStatus('Clipboard copy was interrupted.'));
  });
  dom.copyReportCsvBtn?.addEventListener('click', () => {
    clearDemoCopyStatus();
    copyAccessibilityReportCsv().catch(() => setDemoCopyStatus('Clipboard copy was interrupted.'));
  });
  dom.copySuggestionsCsvBtn?.addEventListener('click', () => {
    clearDemoCopyStatus();
    copyContrastSuggestionsCsv().catch(() => setDemoCopyStatus('Clipboard copy was interrupted.'));
  });
  dom.downloadSuggestionsCsvBtn?.addEventListener('click', () => {
    downloadContrastSuggestionsCsv();
  });
  dom.copySuggestionsJsonBtn?.addEventListener('click', () => {
    clearDemoCopyStatus();
    copyContrastSuggestionsJson().catch(() => setDemoCopyStatus('Clipboard copy was interrupted.'));
  });
  dom.downloadSuggestionsJsonBtn?.addEventListener('click', () => {
    downloadContrastSuggestionsJson();
  });
  dom.copyWorkflowSnapshotBtn?.addEventListener('click', () => {
    clearDemoCopyStatus();
    copyWorkflowSnapshot().catch(() => setDemoCopyStatus('Clipboard copy was interrupted.'));
  });
  dom.copyJudgeSnapshotBtn?.addEventListener('click', () => {
    clearDemoCopyStatus();
    copyJudgeSnapshot().catch(() => setDemoCopyStatus('Clipboard copy was interrupted.'));
  });
  dom.copyManifestBtn?.addEventListener('click', () => {
    clearDemoCopyStatus();
    copySubmissionManifest().catch(() => setDemoCopyStatus('Clipboard copy was interrupted.'));
  });
  dom.downloadManifestBtn?.addEventListener('click', () => {
    clearDemoCopyStatus();
    downloadSubmissionManifest();
  });
  dom.finalizeHandoffBtn?.addEventListener('click', () => {
    void runJudgeHandoffFlow();
  });
  dom.copyHandoffPacketBtn?.addEventListener('click', () => {
    clearDemoCopyStatus();
    copyHandoffPacket().catch(() => setDemoCopyStatus('Clipboard copy was interrupted.'));
  });
  dom.copyHandoffPacketJsonBtn?.addEventListener('click', () => {
    clearDemoCopyStatus();
    copyHandoffPacketJson().catch(() => setDemoCopyStatus('Clipboard copy was interrupted.'));
  });
  dom.copyHandoffBundleBtn?.addEventListener('click', () => {
    clearDemoCopyStatus();
    copyHandoffBundle().catch(() => setDemoCopyStatus('Clipboard copy was interrupted.'));
  });
  dom.shortcutHelpSearchInput?.addEventListener('input', (event) => {
    filterShortcutHelpList(event.target?.value || '');
  });
  initializeSimulationGridKeyboardNav();

  if (dom.previewModalCloseBtn) {
    dom.previewModalCloseBtn.addEventListener('click', closePreviewModal);
  }
  if (dom.previewModalPrevBtn) {
    dom.previewModalPrevBtn.addEventListener('click', () => {
      stopPreviewModalSlideshow();
      navigatePreviewModal(-1);
    });
  }
  if (dom.previewModalNextBtn) {
    dom.previewModalNextBtn.addEventListener('click', () => {
      stopPreviewModalSlideshow();
      navigatePreviewModal(1);
    });
  }
  if (dom.previewModalPlayBtn) {
    dom.previewModalPlayBtn.addEventListener('click', () => {
      togglePreviewModalSlideshow();
    });
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
    clearContrastUndoState();
    state.lastAppliedContrastSuggestion = null;
    persistUserSettings();
    renderContrastResult();
  });
  dom.contrastBg.addEventListener('change', () => {
    clearContrastUndoState();
    state.lastAppliedContrastSuggestion = null;
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

  dom.xrayToggleBtn?.addEventListener('click', () => setXrayActive(!state.xrayActive));
  dom.sourceCanvas.addEventListener('pointermove', handleXrayPointerMove);
  dom.sourceCanvas.addEventListener('pointerleave', () => hideXrayLoupe());
  dom.sourceCanvas.addEventListener('keydown', (event) => {
    if (!state.xrayActive || event.ctrlKey || event.metaKey || event.altKey) {
      return;
    }
    const step = event.shiftKey ? 1 : XRAY_KEY_STEP;
    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      moveXrayProbe(-step, 0);
    } else if (event.key === 'ArrowRight') {
      event.preventDefault();
      moveXrayProbe(step, 0);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      moveXrayProbe(0, -step);
    } else if (event.key === 'ArrowDown') {
      event.preventDefault();
      moveXrayProbe(0, step);
    } else if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      applyXraySampleToChecker();
    }
  });

  dom.sourceCanvas.addEventListener('click', (event) => {
    if (!state.activeColorPickerTarget) {
      if (state.xrayActive) {
        event.preventDefault();
        applyXraySampleToChecker();
      }
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
  updateWorkflowChecklist();
  renderJudgeTimer();
  initSharedAuditView();
  setMessage('Upload an image or use a demo to begin.', 'info');
}

const SHARE_LINK_HASH_PREFIX = '#share=';

function bytesToBase64Url(bytes) {
  let binary = '';
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64UrlToBytes(encoded) {
  const normalized = String(encoded || '').replace(/-/g, '+').replace(/_/g, '/');
  if (!normalized || /[^A-Za-z0-9+/]/.test(normalized)) {
    throw new Error('Share token contains invalid characters.');
  }
  const padded = normalized + '='.repeat((4 - (normalized.length % 4)) % 4);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

async function gzipShareBytes(bytes) {
  const stream = new Blob([bytes]).stream().pipeThrough(new CompressionStream('gzip'));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

async function gunzipShareBytes(bytes) {
  const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

async function buildShareableAuditLink() {
  const payload = buildShareableAuditPayload(buildAccessibilityReport());
  const bytes = new TextEncoder().encode(JSON.stringify(payload));
  let token;
  if (typeof CompressionStream === 'function') {
    token = `1z.${bytesToBase64Url(await gzipShareBytes(bytes))}`;
  } else {
    token = `1r.${bytesToBase64Url(bytes)}`;
  }
  const base = `${window.location.origin}${window.location.pathname}${window.location.search}`;
  return `${base}${SHARE_LINK_HASH_PREFIX}${token}`;
}

async function decodeShareableAuditToken(token) {
  const dotIndex = String(token || '').indexOf('.');
  const format = dotIndex > 0 ? token.slice(0, dotIndex) : '';
  const body = dotIndex > 0 ? token.slice(dotIndex + 1) : '';
  if (!body || (format !== '1z' && format !== '1r')) {
    throw new Error('Unrecognized share-link format.');
  }

  let bytes = base64UrlToBytes(body);
  if (format === '1z') {
    if (typeof DecompressionStream !== 'function') {
      throw new Error('This browser cannot decompress shared audit links (DecompressionStream unavailable).');
    }
    bytes = await gunzipShareBytes(bytes);
  }

  return parseShareableAuditPayload(JSON.parse(new TextDecoder().decode(bytes)));
}

async function copyShareableAuditLink() {
  if (state.isRendering) {
    setDemoCopyStatus('Finish rendering before creating a share link.');
    return;
  }

  if (!state.sourceImage || !state.hasRenderedSource || !state.modeImpacts.length) {
    setDemoCopyStatus('Render an image and simulations before creating a share link.');
    return;
  }

  try {
    const link = await buildShareableAuditLink();
    const safeBase = getSafeFileName(state.sourceName || 'clearsight-source');
    await copyTextWithFallback({
      payload: link,
      filename: `${safeBase}-share-link.txt`,
      mimeType: 'text/plain;charset=utf-8',
      copiedMessage: `Shareable audit link copied (${formatBytes(link.length)} of URL — the whole verdict travels in the link, nothing is uploaded).`,
      downloadMessage: 'Clipboard unavailable, share link downloaded for manual copy.',
      statusReporter: (message) => setDemoCopyStatus(message),
    });
  } catch (error) {
    setDemoCopyStatus(`Could not build share link: ${error.message}`);
  }
}

function hideShareQrCard() {
  state.lastShareQr = null;
  if (dom.shareQrCard) {
    dom.shareQrCard.hidden = true;
  }
}

async function showShareableAuditQr() {
  if (state.isRendering) {
    setDemoCopyStatus('Finish rendering before creating a QR share code.');
    return;
  }

  if (!state.sourceImage || !state.hasRenderedSource || !state.modeImpacts.length) {
    setDemoCopyStatus('Render an image and simulations before creating a QR share code.');
    return;
  }

  try {
    const link = await buildShareableAuditLink();
    const qr = encodeQrMatrix(link);
    const quiet = QR_ENCODE_DEFAULTS.quietZone;
    const scale = Math.max(3, Math.min(8, Math.floor(720 / (qr.size + quiet * 2))));
    const dimension = (qr.size + quiet * 2) * scale;
    const canvas = dom.shareQrCanvas;
    canvas.width = dimension;
    canvas.height = dimension;
    const context = canvas.getContext('2d');
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, dimension, dimension);
    context.fillStyle = '#000000';
    for (let row = 0; row < qr.size; row += 1) {
      for (let col = 0; col < qr.size; col += 1) {
        if (qr.modules[row * qr.size + col]) {
          context.fillRect((col + quiet) * scale, (row + quiet) * scale, scale, scale);
        }
      }
    }
    state.lastShareQr = {
      version: qr.version,
      size: qr.size,
      ecLevel: qr.ecLevel,
      maskId: qr.maskId,
      byteLength: qr.byteLength,
      linkLength: link.length,
      scale,
      modules: qr.modules,
    };
    if (dom.shareQrMeta) {
      dom.shareQrMeta.textContent = `${formatBytes(link.length)} of URL encoded as QR version ${qr.version} — ${qr.size}×${qr.size} modules, error correction ${qr.ecLevel}.`;
    }
    if (dom.shareQrCard) {
      dom.shareQrCard.hidden = false;
    }
    setDemoCopyStatus('QR share code ready — scan it with a phone camera to open this audit there.');
  } catch (error) {
    setDemoCopyStatus(`Could not build QR share code: ${error.message}`);
  }
}

function downloadShareQrPng() {
  if (!state.lastShareQr || !dom.shareQrCanvas || dom.shareQrCard?.hidden) {
    setDemoCopyStatus('Create the QR share code before downloading it.');
    return;
  }
  const safeBase = getSafeFileName(state.sourceName || 'clearsight-source');
  dom.shareQrCanvas.toBlob((blob) => {
    if (blob) {
      downloadBlob(blob, `${safeBase}-share-qr.png`);
      setDemoCopyStatus('QR share code downloaded as PNG.');
    } else {
      setDemoCopyStatus('Could not encode the QR canvas as PNG.');
    }
  }, 'image/png');
}

function sharedAuditElement(tag, className, text) {
  const element = document.createElement(tag);
  if (className) {
    element.className = className;
  }
  if (text !== undefined && text !== null) {
    element.textContent = text;
  }
  return element;
}

function appendSharedAuditSwatch(parent, hex) {
  if (!hex) {
    return;
  }
  const swatch = sharedAuditElement('span', 'shared-audit-swatch');
  swatch.style.background = hex;
  swatch.setAttribute('aria-hidden', 'true');
  parent.appendChild(swatch);
  parent.appendChild(document.createTextNode(hex));
}

let activeSharedAudit = null;

function getSharedAuditProgressKey() {
  const token = window.location.hash.startsWith(SHARE_LINK_HASH_PREFIX)
    ? window.location.hash.slice(SHARE_LINK_HASH_PREFIX.length)
    : '';
  let hash = 2166136261;
  for (let index = 0; index < token.length; index += 1) {
    hash ^= token.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return `clearsight-shared-progress:${(hash >>> 0).toString(36)}`;
}

function readSharedAuditProgress(actionCount) {
  try {
    const stored = JSON.parse(localStorage.getItem(getSharedAuditProgressKey()) || '[]');
    return new Set(
      Array.isArray(stored)
        ? stored.filter((index) => Number.isInteger(index) && index >= 0 && index < actionCount)
        : [],
    );
  } catch {
    return new Set();
  }
}

function writeSharedAuditProgress(completed) {
  try {
    localStorage.setItem(getSharedAuditProgressKey(), JSON.stringify([...completed].sort((a, b) => a - b)));
  } catch {
    // Storage can be blocked in privacy modes; the tracker remains useful for this tab.
  }
}

function updateSharedAuditProgress(completed, total) {
  const progress = dom.sharedAuditBody?.querySelector('.shared-audit-progress');
  if (!progress) return;
  const count = completed.size;
  const percent = total ? Math.round((count / total) * 100) : 0;
  progress.style.setProperty('--shared-progress', `${percent}%`);
  progress.querySelector('strong').textContent =
    count === total ? `Review complete · ${count}/${total} actions` : `${count}/${total} actions complete`;
  progress.querySelector('[role="progressbar"]').setAttribute('aria-valuenow', String(count));
  progress.querySelector('[role="progressbar"]').setAttribute('aria-valuemax', String(total));
  if (dom.sharedAuditPlanBtn) {
    dom.sharedAuditPlanBtn.textContent = count ? `Copy action plan · ${count}/${total}` : 'Copy action plan';
  }
}

function buildSharedAuditActionPlanText(shared, completed) {
  const source = shared.source?.name || 'Shared ClearSight audit';
  const score = shared.score ? ` — Score ${shared.score.score}/100 (Grade ${shared.score.grade})` : '';
  const lines = [
    `# ClearSight remediation tracker`,
    '',
    `${source}${score}`,
    `Progress: ${completed.size}/${shared.remediation.length} actions complete`,
    '',
  ];
  shared.remediation.forEach((action, index) => {
    lines.push(
      `- [${completed.has(index) ? 'x' : ' '}] ${action.priorityLabel || action.priority || 'Info'}: ${action.text}`,
    );
  });
  lines.push('', `Audit link: ${window.location.href}`);
  return lines.join('\n');
}

function copySharedAuditActionPlan() {
  if (!activeSharedAudit?.remediation?.length) return;
  const completed = readSharedAuditProgress(activeSharedAudit.remediation.length);
  copyTextWithFallback({
    payload: buildSharedAuditActionPlanText(activeSharedAudit, completed),
    filename: 'clearsight-remediation-tracker.md',
    mimeType: 'text/markdown;charset=utf-8',
    copiedMessage: 'Remediation tracker copied with current completion status.',
    downloadMessage: 'Clipboard unavailable, remediation tracker downloaded for manual sharing.',
  });
}

function renderSharedAuditView(shared) {
  if (!dom.sharedAuditPanel || !dom.sharedAuditBody) {
    return;
  }

  dom.sharedAuditBody.replaceChildren();
  activeSharedAudit = shared;
  if (dom.sharedAuditError) {
    dom.sharedAuditError.hidden = true;
  }

  const metaParts = [];
  if (shared.source?.name) {
    metaParts.push(shared.source.name);
  }
  if (Number.isFinite(shared.source?.width) && Number.isFinite(shared.source?.height)) {
    metaParts.push(`${shared.source.width}×${shared.source.height}px${shared.source.downscaled ? ' (downscaled for audit)' : ''}`);
  }
  if (shared.generatedAt) {
    const generated = new Date(shared.generatedAt);
    if (!Number.isNaN(generated.getTime())) {
      metaParts.push(`audited ${generated.toLocaleString()}`);
    }
  }
  if (dom.sharedAuditMeta) {
    dom.sharedAuditMeta.textContent = metaParts.length
      ? metaParts.join(' · ')
      : 'Shared audit verdict decoded from this link.';
  }

  if (shared.score) {
    const scoreWrap = sharedAuditElement('div', 'clearsight-score shared-audit-score');
    const ring = sharedAuditElement('div', 'score-ring');
    ring.dataset.grade = shared.score.grade;
    ring.style.setProperty('--score-angle', `${Math.max(0, Math.min(100, shared.score.score)) * 3.6}deg`);
    ring.setAttribute('role', 'img');
    ring.setAttribute('aria-label', `Shared ClearSight score ${shared.score.score} out of 100, grade ${shared.score.grade}`);
    const ringInner = sharedAuditElement('div', 'score-ring-inner');
    ringInner.appendChild(sharedAuditElement('strong', '', String(shared.score.score)));
    ringInner.appendChild(sharedAuditElement('span', 'score-outof', '/100'));
    ring.appendChild(ringInner);
    scoreWrap.appendChild(ring);

    const scoreMeta = sharedAuditElement('div', 'score-meta');
    scoreMeta.appendChild(sharedAuditElement('p', 'score-kicker', 'ClearSight Score'));
    scoreMeta.appendChild(
      sharedAuditElement(
        'p',
        'score-verdict',
        `Grade ${shared.score.grade}${shared.score.verdictLabel ? ` · ${shared.score.verdictLabel}` : ''}`,
      ),
    );
    if (shared.score.axes.length) {
      scoreMeta.appendChild(
        sharedAuditElement(
          'p',
          'score-axes',
          shared.score.axes
            .map((axis) => `${axis.label}: ${Number.isFinite(axis.score) ? Math.round(axis.score) : '—'}`)
            .join(' · '),
        ),
      );
    }
    scoreWrap.appendChild(scoreMeta);
    dom.sharedAuditBody.appendChild(scoreWrap);
  }

  const metrics = [
    { label: 'Below AA', value: shared.textScan ? shared.textScan.belowAA : null },
    { label: 'Hidden CVD risks', value: shared.textScan ? shared.textScan.cvdHiddenFailures : null },
    { label: 'APCA risks', value: shared.textScan ? shared.textScan.apcaFalsePasses : null },
    { label: 'Color-only collisions', value: shared.collisions ? shared.collisions.total : null },
    {
      label: 'Peak visual shift',
      value: shared.simulations.length ? `${shared.simulations[0].impactPercent.toFixed(1)}%` : null,
    },
  ].filter((metric) => metric.value !== null && metric.value !== undefined);

  if (metrics.length) {
    const grid = sharedAuditElement('div', 'findings-metric-grid shared-audit-metrics');
    grid.setAttribute('aria-label', 'Shared audit metrics');
    metrics.forEach((metric) => {
      const cell = sharedAuditElement('div', 'findings-metric');
      cell.appendChild(sharedAuditElement('strong', '', String(metric.value)));
      cell.appendChild(sharedAuditElement('span', '', metric.label));
      grid.appendChild(cell);
    });
    dom.sharedAuditBody.appendChild(grid);
  }

  if (shared.textScan?.worst?.length) {
    dom.sharedAuditBody.appendChild(
      sharedAuditElement('h3', 'shared-audit-subtitle', `Worst text findings (${shared.textScan.regions} region${shared.textScan.regions === 1 ? '' : 's'} scanned)`),
    );
    const list = sharedAuditElement('ol', 'shared-audit-findings');
    shared.textScan.worst.slice(0, 5).forEach((region) => {
      const item = sharedAuditElement('li', region.passesAA ? 'is-pass' : 'is-fail');
      appendSharedAuditSwatch(item, region.text);
      item.appendChild(document.createTextNode(' on '));
      appendSharedAuditSwatch(item, region.background);
      const details = [`${Number(region.ratio).toFixed(2)}:1${region.levelLabel ? ` (${region.levelLabel})` : ''}`];
      if (Number.isFinite(region.cvdWorstRatio) && region.cvdWorstMode) {
        details.push(`CVD worst ${Number(region.cvdWorstRatio).toFixed(2)}:1 (${region.cvdWorstMode})${region.cvdHiddenFailure ? ' — hidden failure' : ''}`);
      }
      if (Number.isFinite(region.apcaLc)) {
        details.push(`APCA Lc ${Math.round(Math.abs(region.apcaLc))}${region.apcaFalsePass ? ' — perceptual false pass' : ''}`);
      }
      item.appendChild(document.createTextNode(` — ${details.join(' · ')}`));
      list.appendChild(item);
    });
    dom.sharedAuditBody.appendChild(list);
  }

  if (shared.collisions?.pairs?.length) {
    dom.sharedAuditBody.appendChild(
      sharedAuditElement('h3', 'shared-audit-subtitle', 'Color-only distinction risks (WCAG 1.4.1)'),
    );
    const list = sharedAuditElement('ul', 'shared-audit-findings');
    shared.collisions.pairs.slice(0, 4).forEach((pair) => {
      const item = sharedAuditElement('li', 'is-fail');
      appendSharedAuditSwatch(item, pair.colorA);
      item.appendChild(document.createTextNode(' vs '));
      appendSharedAuditSwatch(item, pair.colorB);
      const deltaBits = [];
      if (Number.isFinite(pair.baseDeltaE) && Number.isFinite(pair.worstDeltaE)) {
        deltaBits.push(`ΔE ${pair.baseDeltaE} → ${pair.worstDeltaE}`);
      }
      if (pair.worstModeLabel) {
        deltaBits.push(`under ${pair.worstModeLabel}`);
      }
      if (deltaBits.length) {
        item.appendChild(document.createTextNode(` — ${deltaBits.join(' ')}`));
      }
      list.appendChild(item);
    });
    dom.sharedAuditBody.appendChild(list);
  }

  const statusLines = [];
  if (shared.contrast) {
    const contrastBits = [
      `Checked pair ${shared.contrast.text || '?'} on ${shared.contrast.background || '?'}: ${shared.contrast.ratio.toFixed(2)}:1 — ${shared.contrast.passesAA ? 'passes AA' : 'fails AA'}${shared.contrast.passesAAA ? ', passes AAA' : ''}`,
    ];
    if (shared.contrast.cvdHiddenFailure) {
      contrastBits.push('hidden color-vision failure');
    }
    if (shared.contrast.apcaFalsePass) {
      contrastBits.push(`APCA perceptual false pass${Number.isFinite(shared.contrast.apcaLc) ? ` (Lc ${Math.round(Math.abs(shared.contrast.apcaLc))})` : ''}`);
    }
    statusLines.push(contrastBits.join(' · '));
  }
  if (shared.flash) {
    statusLines.push(
      `Animation flash scan (WCAG 2.3.1): ${shared.flash.riskLabel || shared.flash.riskLevel}${Number.isFinite(shared.flash.peakFlashesPerSecond) ? ` — peak ${shared.flash.peakFlashesPerSecond}/sec` : ''}${Number.isFinite(shared.flash.peakViolatingAreaPercent) ? ` over ${shared.flash.peakViolatingAreaPercent}% of the frame` : ''}`,
    );
  }
  statusLines.forEach((line) => {
    dom.sharedAuditBody.appendChild(sharedAuditElement('p', 'shared-audit-status muted', line));
  });

  if (shared.remediation.length) {
    dom.sharedAuditBody.appendChild(sharedAuditElement('h3', 'shared-audit-subtitle', 'Prioritized remediation plan'));
    const completed = readSharedAuditProgress(shared.remediation.length);
    const progress = sharedAuditElement('div', 'shared-audit-progress');
    progress.appendChild(sharedAuditElement('strong', '', ''));
    const track = sharedAuditElement('span', 'shared-audit-progress-track');
    track.setAttribute('role', 'progressbar');
    track.setAttribute('aria-label', 'Remediation actions completed');
    track.setAttribute('aria-valuemin', '0');
    const fill = sharedAuditElement('span', 'shared-audit-progress-fill');
    track.appendChild(fill);
    progress.appendChild(track);
    dom.sharedAuditBody.appendChild(progress);
    const list = sharedAuditElement('ol', 'shared-audit-remediation');
    shared.remediation.forEach((action, index) => {
      const item = sharedAuditElement('li');
      const label = sharedAuditElement('label', 'shared-audit-action');
      const checkbox = sharedAuditElement('input');
      checkbox.type = 'checkbox';
      checkbox.checked = completed.has(index);
      checkbox.setAttribute('aria-label', `Mark remediation action ${index + 1} complete`);
      const badge = sharedAuditElement('span', `shared-audit-priority priority-${action.priority || 'info'}`, action.priorityLabel || action.priority || 'Info');
      const text = sharedAuditElement('span', 'shared-audit-action-text');
      text.appendChild(badge);
      text.appendChild(document.createTextNode(` ${action.text}`));
      label.append(checkbox, text);
      item.appendChild(label);
      checkbox.addEventListener('change', () => {
        if (checkbox.checked) completed.add(index);
        else completed.delete(index);
        item.classList.toggle('is-complete', checkbox.checked);
        writeSharedAuditProgress(completed);
        updateSharedAuditProgress(completed, shared.remediation.length);
      });
      item.classList.toggle('is-complete', checkbox.checked);
      list.appendChild(item);
    });
    dom.sharedAuditBody.appendChild(list);
    if (dom.sharedAuditPlanBtn) dom.sharedAuditPlanBtn.hidden = false;
    updateSharedAuditProgress(completed, shared.remediation.length);
  } else if (dom.sharedAuditPlanBtn) {
    dom.sharedAuditPlanBtn.hidden = true;
  }

  dom.sharedAuditPanel.hidden = false;
}

function showSharedAuditError(message) {
  if (!dom.sharedAuditPanel || !dom.sharedAuditError) {
    return;
  }
  dom.sharedAuditBody?.replaceChildren();
  activeSharedAudit = null;
  if (dom.sharedAuditPlanBtn) dom.sharedAuditPlanBtn.hidden = true;
  if (dom.sharedAuditMeta) {
    dom.sharedAuditMeta.textContent = 'This share link could not be decoded.';
  }
  dom.sharedAuditError.textContent = message;
  dom.sharedAuditError.hidden = false;
  dom.sharedAuditPanel.hidden = false;
}

function dismissSharedAuditView() {
  if (dom.sharedAuditPanel) {
    dom.sharedAuditPanel.hidden = true;
  }
  activeSharedAudit = null;
  if (window.location.hash.startsWith(SHARE_LINK_HASH_PREFIX)) {
    history.replaceState(null, '', `${window.location.pathname}${window.location.search}`);
  }
}

async function initSharedAuditView() {
  const hash = window.location.hash || '';
  if (!hash.startsWith(SHARE_LINK_HASH_PREFIX)) {
    return;
  }

  const token = decodeURIComponent(hash.slice(SHARE_LINK_HASH_PREFIX.length));
  try {
    const shared = await decodeShareableAuditToken(token);
    renderSharedAuditView(shared);
  } catch (error) {
    showSharedAuditError(
      `Could not decode the shared audit in this link (${error.message}) Ask the sender to copy a fresh link from ClearSight.`,
    );
  }
}

window.addEventListener('DOMContentLoaded', init);
window.addEventListener('hashchange', () => {
  if (window.location.hash.startsWith(SHARE_LINK_HASH_PREFIX)) {
    initSharedAuditView();
  }
});

// Read-only hooks for the automated browser smoke test (scripts/smoke.mjs) to
// verify export artifact contents without driving clipboard/download UI.
window.__clearsightReportHooks = {
  buildAccessibilityReport,
  buildAccessibilityReportCsv,
  buildJudgeSummaryMarkdown,
  buildReviewerPacketHtml,
  buildSubmissionManifestText: () => getSubmissionManifestPayload()?.payload || '',
  buildCssFixSheetText: () => buildCssFixSheetPayload()?.css || '',
  buildConformanceSummaryText: () => buildConformanceSummaryPayload()?.markdown || '',
  runBatchSampleAudit: () => runBatchSampleAudit(),
  captureLiveAppFrame: () => captureLiveAppFrame(),
  getWalkthroughState: () =>
    walkthroughSession
      ? {
          recording: true,
          sampled: walkthroughSession.sampled,
          kept: walkthroughSession.frames.length,
          duplicates: walkthroughSession.duplicates,
          transitions: walkthroughSession.transitions,
          flashFrames: walkthroughSession.flashFrames.length,
          flashTruncated: walkthroughSession.flashTruncated,
        }
      : { recording: false },
  getSourceMeta: () =>
    state.sourceImage
      ? {
          name: state.sourceName || '',
          width: state.sourceOriginalDimensions?.width || 0,
          height: state.sourceOriginalDimensions?.height || 0,
          downscaled: Boolean(state.sourceWasDownscaled),
        }
      : null,
  getBatchAudit: () =>
    state.batchAudit
      ? {
          failures: state.batchAudit.failures.length,
          portfolio: summarizeBatchAudit(state.batchAudit.entries),
          entries: state.batchAudit.entries.map(({ name, audit }) => ({
            name,
            score: Number.isFinite(audit.score?.score) ? audit.score.score : null,
            grade: audit.score?.grade || null,
            belowAA: audit.textScan?.summary?.belowAA ?? 0,
            cvdHiddenFailures: audit.textScan?.summary?.cvdHiddenFailures ?? 0,
            apcaFalsePasses: audit.textScan?.summary?.apcaFalsePasses ?? 0,
            collisions: audit.palette?.collisions?.summary?.collisions ?? 0,
          })),
        }
      : null,
  compareBatchBaseline: (report) => {
    state.batchBaseline = { name: 'smoke-baseline.json', report };
    renderBatchAuditResults();
    return state.batchAudit?.entries?.length
      ? compareBatchAuditToBaseline(state.batchAudit.entries, report)
      : null;
  },
  buildBatchAuditCsvText: () => getBatchAuditCsvText(),
  buildBatchAuditPdfBytes: () => buildBatchAuditPdfBytes(),
  buildAuditPdfBytes: () => buildAuditPdfBytes(),
  buildAuditVerdictCard: () => {
    const canvas = buildAuditVerdictCardCanvas();
    return { width: canvas.width, height: canvas.height, dataUrl: canvas.toDataURL('image/png') };
  },
  buildRepairProofCard: () => {
    const canvas = buildRepairProofCardCanvas();
    return { width: canvas.width, height: canvas.height, dataUrl: canvas.toDataURL('image/png') };
  },
  buildShareLink: () => buildShareableAuditLink(),
  decodeShareToken: (token) => decodeShareableAuditToken(token),
  buildShareQr: () =>
    showShareableAuditQr().then(() =>
      state.lastShareQr
        ? {
            version: state.lastShareQr.version,
            size: state.lastShareQr.size,
            ecLevel: state.lastShareQr.ecLevel,
            maskId: state.lastShareQr.maskId,
            byteLength: state.lastShareQr.byteLength,
            linkLength: state.lastShareQr.linkLength,
            scale: state.lastShareQr.scale,
          }
        : null,
    ),
  getShareQrRaw: () => state.lastShareQr,
  getComponentRepair: () => state.componentSurfaceRepair,
  setXrayEnabled: (on) => setXrayActive(Boolean(on), { notify: false }),
  sampleXrayAt: (x, y) => sampleXrayAtCanvasPoint(x, y, { announce: true }),
  getXraySample: () => state.lastXraySample,
  runFlashScanDemo: () => runFlashScanDemo(),
  runFocusDemo: (kind) => runFocusCheckDemo(kind || 'weak'),
  getFocusCheck: () => buildFocusCheckReportSection(),
  runFocusSequenceDemo: () => {
    const result = runFocusSequenceDemo();
    return { aggregateVerdict: result.aggregateVerdict, summary: { ...result.summary } };
  },
  getFocusSequence: () => buildFocusSequenceReportSection(),
  scanFlashFile: (file) => runFlashScanFromFile(file).then(() => buildFlashScanReportSection()),
  getFlashScan: () => buildFlashScanReportSection(),
  exportVisionReel: (options) => exportVisionReel(options),
  getLastVisionReel: () =>
    state.lastReelExport
      ? {
          filename: state.lastReelExport.filename,
          mimeType: state.lastReelExport.mimeType,
          size: state.lastReelExport.bytes?.length || 0,
          segments: state.lastReelExport.segments,
          durationMs: state.lastReelExport.durationMs,
        }
      : null,
};
