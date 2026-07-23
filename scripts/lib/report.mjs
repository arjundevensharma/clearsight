// GitHub-facing report artifacts for the ClearSight CI auditor: a
// PR-comment-ready GitHub-flavored-markdown report and a shields-style SVG
// score badge. Pure string builders with no I/O so they are unit-testable
// and reusable; the CLI wires them to --markdown and --badge.

import { CLEARSIGHT_SCORE_GRADES } from '../../docs/js/vision-core.js';

export const GRADE_COLORS = {
  A: '#2f9e44',
  B: '#66a80f',
  C: '#e8b500',
  D: '#e8590c',
  F: '#e03131',
};

const SARIF_RULES = {
  'clearsight/score': {
    name: 'ClearSightScore',
    shortDescription: { text: 'Screenshot does not meet the configured ClearSight Score floor' },
    helpUri: 'https://arjundevensharma.github.io/clearsight/',
  },
  'clearsight/regression': {
    name: 'AccessibilityRegression',
    shortDescription: { text: 'Screenshot accessibility score regressed from its baseline' },
    helpUri: 'https://arjundevensharma.github.io/clearsight/',
  },
  'clearsight/text-contrast': {
    name: 'TextContrast',
    shortDescription: { text: 'Text regions fail WCAG 2 AA contrast' },
    helpUri: 'https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html',
  },
  'clearsight/cvd-contrast': {
    name: 'ColorVisionContrast',
    shortDescription: { text: 'Text contrast fails under a simulated color-vision deficiency' },
    helpUri: 'https://www.w3.org/WAI/WCAG22/Understanding/use-of-color.html',
  },
  'clearsight/apca-risk': {
    name: 'APCAPerceptualRisk',
    shortDescription: { text: 'Text has a perceptual contrast risk under APCA analysis' },
    helpUri: 'https://www.w3.org/WAI/WCAG3/Explainer/',
  },
  'clearsight/color-collision': {
    name: 'ColorOnlyCollision',
    shortDescription: { text: 'Distinct UI colors collapse under color-vision simulation' },
    helpUri: 'https://www.w3.org/WAI/WCAG22/Understanding/use-of-color.html',
  },
  'clearsight/component-contrast': {
    name: 'ComponentContrast',
    shortDescription: { text: 'UI component surface fails WCAG 1.4.11 non-text contrast' },
    helpUri: 'https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html',
  },
  'clearsight/target-size': {
    name: 'TapTargetSize',
    shortDescription: { text: 'Interactive target fails WCAG 2.5.8 minimum size or spacing' },
    helpUri: 'https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html',
  },
};

function sarifLocation(name) {
  return {
    physicalLocation: {
      artifactLocation: { uri: String(name) },
      region: { startLine: 1, startColumn: 1 },
    },
  };
}

/**
 * Build SARIF 2.1.0 for GitHub code scanning. Screenshots are reported as
 * artifacts, allowing every failing analysis axis and baseline regression to
 * show as a first-class annotation in a pull request.
 */
export function buildSarifReport({ entries, gate, baselineComparison = null }) {
  if (!Array.isArray(entries) || !entries.length) {
    throw new Error('SARIF report requires at least one audited screen.');
  }

  const comparisons = new Map(
    (baselineComparison?.comparisons || []).map((item) => [item.name, item]),
  );
  const gateFailures = new Set((gate?.failures || []).map((item) => item.name));
  const results = [];
  const add = (entry, ruleId, level, message, properties = {}) => {
    results.push({
      ruleId,
      level,
      message: { text: message },
      locations: [sarifLocation(entry.name)],
      properties: { screen: entry.name, ...properties },
    });
  };

  entries.forEach((entry) => {
    const score = entry.audit?.score;
    const summary = entry.audit?.textScan?.summary || {};
    const collisions = entry.audit?.palette?.collisions?.summary?.collisions ?? 0;
    const componentFailures = entry.audit?.componentContrast?.summary?.failing ?? 0;
    const undersizedTargets = entry.audit?.targetSizes?.summary?.undersized ?? 0;
    const worst = entry.audit?.textScan?.regions?.[0];
    const comparison = comparisons.get(entry.name);

    if (gateFailures.has(entry.name)) {
      add(
        entry,
        'clearsight/score',
        'error',
        Number.isFinite(score?.score)
          ? `ClearSight Score ${score.score}/100 (Grade ${score.grade || 'ungraded'}) is below the required ${gate.threshold}.`
          : `ClearSight could not score this screenshot; the required score is ${gate.threshold}.`,
        { score: score?.score ?? null, grade: score?.grade ?? null, threshold: gate.threshold },
      );
    }
    if (comparison?.status === 'regressed') {
      add(
        entry,
        'clearsight/regression',
        'error',
        `ClearSight Score regressed from ${comparison.baselineScore} to ${comparison.currentScore ?? 'unscorable'} (allowed drop ${baselineComparison.maxScoreDrop}).`,
        { baselineScore: comparison.baselineScore, currentScore: comparison.currentScore, delta: comparison.delta },
      );
    }
    if ((summary.belowAA ?? 0) > 0) {
      add(entry, 'clearsight/text-contrast', 'error',
        `${summary.belowAA} text region${summary.belowAA === 1 ? '' : 's'} fail WCAG 2 AA contrast${worst ? `; worst ratio ${worst.ratio.toFixed(2)}:1` : ''}.`,
        { count: summary.belowAA, worstRatio: worst?.ratio ?? null });
    }
    if ((summary.cvdHiddenFailures ?? 0) > 0) {
      add(entry, 'clearsight/cvd-contrast', 'error',
        `${summary.cvdHiddenFailures} text region${summary.cvdHiddenFailures === 1 ? '' : 's'} become hidden contrast failures under color-vision simulation.`,
        { count: summary.cvdHiddenFailures });
    }
    if ((summary.apcaFalsePasses ?? 0) > 0) {
      add(entry, 'clearsight/apca-risk', 'warning',
        `${summary.apcaFalsePasses} text region${summary.apcaFalsePasses === 1 ? '' : 's'} pass WCAG 2 but remain perceptual APCA risks.`,
        { count: summary.apcaFalsePasses });
    }
    if (collisions > 0) {
      add(entry, 'clearsight/color-collision', 'warning',
        `${collisions} distinct color pair${collisions === 1 ? '' : 's'} collapse under color-vision simulation; add a non-color cue.`,
        { count: collisions });
    }
    if (componentFailures > 0) {
      add(entry, 'clearsight/component-contrast', 'error',
        `${componentFailures} UI component surface${componentFailures === 1 ? '' : 's'} fail the WCAG 1.4.11 3:1 non-text contrast minimum.`,
        { count: componentFailures });
    }
    if (undersizedTargets > 0) {
      add(entry, 'clearsight/target-size', 'error',
        `${undersizedTargets} interactive target${undersizedTargets === 1 ? '' : 's'} fail the WCAG 2.5.8 24×24 CSS px minimum without a spacing exception.`,
        { count: undersizedTargets });
    }
  });

  const usedRuleIds = new Set(results.map((result) => result.ruleId));
  return {
    version: '2.1.0',
    $schema: 'https://json.schemastore.org/sarif-2.1.0.json',
    runs: [{
      tool: {
        driver: {
          name: 'ClearSight CI',
          informationUri: 'https://arjundevensharma.github.io/clearsight/',
          rules: Object.entries(SARIF_RULES)
            .filter(([id]) => usedRuleIds.has(id))
            .map(([id, rule]) => ({ id, ...rule })),
        },
      },
      results,
    }],
  };
}

const UNSCORED_COLOR = '#8d959e';

const GRADE_DOTS = { A: '🟢', B: '🟢', C: '🟡', D: '🟠', F: '🔴' };

const RELEASE_GATE_BADGES = {
  ready: '✅',
  review: '⚠️',
  blocked: '⛔',
  insufficient: '❔',
};

export function gradeForScore(score) {
  if (!Number.isFinite(score)) return null;
  const entry = CLEARSIGHT_SCORE_GRADES.find((candidate) => score >= candidate.min);
  return entry ? entry.grade : null;
}

function escapeMarkdownCell(text) {
  return String(text).replace(/\\/g, '\\\\').replace(/\|/g, '\\|');
}

function formatDelta(comparison) {
  if (!comparison) return '—';
  switch (comparison.status) {
    case 'new':
      return '🆕 new';
    case 'baseline-unscored':
      return '— (baseline unscored)';
    case 'improved':
      return `🔺 +${comparison.delta}`;
    case 'within-tolerance':
      return `🔻 ${comparison.delta} (tolerated)`;
    case 'regressed':
      return comparison.delta === null ? '🔻 unscorable' : `🔻 ${comparison.delta}`;
    default:
      return '±0';
  }
}

function formatGradeCell(grade) {
  if (!grade) return '—';
  const dot = GRADE_DOTS[grade];
  return dot ? `${dot} ${grade}` : grade;
}

/**
 * Build a GitHub-flavored-markdown audit report suitable for posting as a PR
 * comment (e.g. `gh pr comment --body-file`). Mirrors the CLI's terminal
 * output: ranked riskiest-first table, portfolio debt map, gate verdicts,
 * optional baseline deltas, and skipped-file transparency.
 */
export function buildMarkdownReport({ entries, portfolio, gate, baselineComparison = null, skipped = [] }) {
  if (!Array.isArray(entries) || !entries.length) {
    throw new Error('Markdown report requires at least one audited screen.');
  }
  if (!portfolio || typeof portfolio !== 'object') {
    throw new Error('Markdown report requires a portfolio summary.');
  }

  const comparisonByName = new Map(
    (baselineComparison?.comparisons || []).map((item) => [item.name, item]),
  );
  const lines = ['## ClearSight accessibility audit', ''];

  const portfolioGrade = gradeForScore(portfolio.portfolioScore);
  const gateBadge = RELEASE_GATE_BADGES[portfolio.releaseGate?.status] || '❔';
  if (Number.isFinite(portfolio.portfolioScore)) {
    lines.push(
      `**Portfolio score: ${portfolio.portfolioScore}/100${portfolioGrade ? ` · Grade ${portfolioGrade}` : ''}** ` +
        `(fleet average ${portfolio.averageScore}, weakest screen ${portfolio.lowestScore} — ${escapeMarkdownCell(portfolio.lowestScreen)})`,
    );
  } else {
    lines.push('**Portfolio score: unscored** — no screen produced enough audit signal.');
  }
  lines.push(`${gateBadge} ${portfolio.releaseGate?.label || 'Release gate unavailable'}`);
  if (portfolio.weakestAxis) {
    lines.push(`Weakest axis: **${portfolio.weakestAxis.label}** (${portfolio.weakestAxis.score}/100 fleet average)`);
  }
  lines.push('');

  const withDelta = Boolean(baselineComparison);
  const headers = ['#', 'Screen', 'Score', 'Grade'];
  if (withDelta) headers.push('Δ score');
  headers.push('Below AA', 'Hidden CVD', 'APCA risk', 'Collisions', 'Components', 'Tap targets', 'Worst ratio');
  const aligns = headers.map((header) => (header === 'Screen' ? ':--' : header === 'Grade' || header.startsWith('Δ') ? ':-:' : '--:'));

  lines.push(`| ${headers.join(' | ')} |`);
  lines.push(`| ${aligns.join(' | ')} |`);
  entries.forEach((entry, index) => {
    const summary = entry.audit.textScan?.summary || {};
    const worst = entry.audit.textScan?.regions?.[0];
    const collisions = entry.audit.palette?.collisions?.summary?.collisions ?? 0;
    const componentFailures = entry.audit.componentContrast?.summary?.failing ?? 0;
    const undersizedTargets = entry.audit.targetSizes?.summary?.undersized ?? 0;
    const score = entry.audit.score;
    const row = [
      String(index + 1),
      `\`${escapeMarkdownCell(entry.name)}\``,
      Number.isFinite(score?.score) ? String(score.score) : '—',
      formatGradeCell(score?.grade),
    ];
    if (withDelta) row.push(formatDelta(comparisonByName.get(entry.name)));
    row.push(
      String(summary.belowAA ?? 0),
      String(summary.cvdHiddenFailures ?? 0),
      String(summary.apcaFalsePasses ?? 0),
      String(collisions),
      String(componentFailures),
      String(undersizedTargets),
      worst ? `${worst.ratio.toFixed(2)}:1` : '—',
    );
    lines.push(`| ${row.join(' | ')} |`);
  });
  lines.push('');

  const { totals } = portfolio;
  if (totals) {
    lines.push(
      `Findings across ${portfolio.scoredCount}/${portfolio.screenCount} scored screens: ` +
        `**${totals.belowAA}** below-AA text · **${totals.cvdHiddenFailures}** hidden CVD failures · ` +
        `**${totals.apcaFalsePasses}** APCA perceptual risks · **${totals.collisions}** color-only collisions · ` +
        `**${totals.componentFailures}** component contrast failures · ` +
        `**${totals.undersizedTargets}** undersized tap targets`,
    );
    lines.push('');
  }

  if (gate?.enabled) {
    if (gate.pass) {
      lines.push(`**Score gate (≥ ${gate.threshold}):** ✅ passed — every screen meets the floor.`);
    } else {
      const detail = gate.failures
        .map((failure) => `\`${escapeMarkdownCell(failure.name)}\` (${failure.score ?? 'unscored'}${failure.grade ? `, Grade ${failure.grade}` : ''})`)
        .join(', ');
      lines.push(`**Score gate (≥ ${gate.threshold}):** ❌ FAILED — ${detail}`);
    }
  }
  if (baselineComparison) {
    if (baselineComparison.pass) {
      lines.push(
        `**Regression gate (allowed drop ${baselineComparison.maxScoreDrop}):** ✅ passed — ${baselineComparison.matched} screen${baselineComparison.matched === 1 ? '' : 's'} matched against baseline.`,
      );
    } else {
      const detail = baselineComparison.failures
        .map((failure) => `\`${escapeMarkdownCell(failure.name)}\` (${failure.baselineScore} → ${failure.currentScore ?? 'unscored'})`)
        .join(', ');
      lines.push(`**Regression gate (allowed drop ${baselineComparison.maxScoreDrop}):** ❌ FAILED — ${detail}`);
    }
  }
  if (!gate?.enabled && !baselineComparison) {
    lines.push('_Report-only run — add `--min-score`, `--min-grade`, or `--baseline` to gate CI on this result._');
  }

  if (skipped.length) {
    lines.push('');
    lines.push('<details><summary>Skipped files</summary>');
    lines.push('');
    skipped.forEach((item) => {
      lines.push(`- \`${escapeMarkdownCell(item.file)}\` — ${escapeMarkdownCell(item.message)}`);
    });
    lines.push('');
    lines.push('</details>');
  }

  lines.push('');
  lines.push(
    '_Six axes: WCAG 2 text contrast · hidden color-vision (CVD) failures · APCA perceptual contrast · WCAG 1.4.1 color-only collisions · WCAG 1.4.11 component contrast · WCAG 2.5.8 tap-target size. ' +
      'Generated by [ClearSight](https://arjundevensharma.github.io/clearsight/) `npm run audit`._',
  );
  return `${lines.join('\n')}\n`;
}

function estimateTextWidth(text) {
  // Verdana 11px averages ~6.4px/char for badge-length ASCII strings; wide
  // enough that shields-style badges never clip.
  return Math.round(String(text).length * 6.4) + 12;
}

function escapeXml(text) {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Build a shields.io-flat-style SVG badge showing the portfolio ClearSight
 * Score and grade, colored by grade band, for embedding in a README.
 */
export function buildScoreBadgeSvg(portfolio, label = 'ClearSight') {
  const score = portfolio?.portfolioScore;
  const scored = Number.isFinite(score);
  const grade = scored ? gradeForScore(score) : null;
  const value = scored ? `${score}/100${grade ? ` ${grade}` : ''}` : 'unscored';
  const color = scored ? GRADE_COLORS[grade] || UNSCORED_COLOR : UNSCORED_COLOR;

  const labelWidth = estimateTextWidth(label);
  const valueWidth = estimateTextWidth(value);
  const width = labelWidth + valueWidth;
  const labelX = labelWidth / 2;
  const valueX = labelWidth + valueWidth / 2;
  const title = `${label}: ${value}`;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="20" role="img" aria-label="${escapeXml(title)}">
  <title>${escapeXml(title)}</title>
  <linearGradient id="smooth" x2="0" y2="100%">
    <stop offset="0" stop-color="#bbb" stop-opacity=".1"/>
    <stop offset="1" stop-opacity=".1"/>
  </linearGradient>
  <clipPath id="round"><rect width="${width}" height="20" rx="3" fill="#fff"/></clipPath>
  <g clip-path="url(#round)">
    <rect width="${labelWidth}" height="20" fill="#555"/>
    <rect x="${labelWidth}" width="${valueWidth}" height="20" fill="${color}"/>
    <rect width="${width}" height="20" fill="url(#smooth)"/>
  </g>
  <g fill="#fff" text-anchor="middle" font-family="Verdana,Geneva,DejaVu Sans,sans-serif" font-size="11">
    <text x="${labelX}" y="15" fill="#010101" fill-opacity=".3">${escapeXml(label)}</text>
    <text x="${labelX}" y="14">${escapeXml(label)}</text>
    <text x="${valueX}" y="15" fill="#010101" fill-opacity=".3">${escapeXml(value)}</text>
    <text x="${valueX}" y="14">${escapeXml(value)}</text>
  </g>
</svg>
`;
}

/**
 * Build the document model for the portfolio PDF (consumed by vision-core's
 * buildPdfReport). Pure — no I/O, no clock; pass generatedAt in.
 */
export function buildPortfolioPdfDoc({ entries, portfolio, gate, baselineComparison = null, skipped = [], generatedAt = '' }) {
  if (!Array.isArray(entries) || !portfolio) {
    throw new Error('Portfolio PDF requires audited entries and a portfolio summary.');
  }

  const blocks = [];
  const scored = Number.isFinite(portfolio.portfolioScore);
  const gradeText = Object.entries(portfolio.gradeCounts || {})
    .map(([grade, count]) => `${count}x ${grade}`)
    .join(', ');

  blocks.push({ type: 'heading', text: 'Portfolio debt map' });
  blocks.push({
    type: 'keyValues',
    rows: [
      ['Screens audited', `${portfolio.scoredCount} scored of ${portfolio.screenCount} submitted`],
      ['Average score', scored ? `${portfolio.averageScore}/100` : 'n/a'],
      [
        'Weakest screen',
        portfolio.lowestScreen ? `${portfolio.lowestScreen} at ${portfolio.lowestScore}/100` : 'n/a',
      ],
      ['Grade distribution', gradeText || 'n/a'],
      [
        'Weakest system axis',
        portfolio.weakestAxis ? `${portfolio.weakestAxis.label} (${portfolio.weakestAxis.score}/100 average)` : 'n/a',
      ],
      ['Release gate', portfolio.releaseGate?.label || 'n/a'],
      [
        'Cross-screen findings',
        `${portfolio.totals.belowAA} below-AA text, ${portfolio.totals.cvdHiddenFailures} hidden CVD, ${portfolio.totals.apcaFalsePasses} APCA risks, ${portfolio.totals.collisions} color-only collisions, ${portfolio.totals.componentFailures} component contrast failures, ${portfolio.totals.undersizedTargets} undersized tap targets`,
      ],
    ],
  });

  const baselineByName = baselineComparison
    ? new Map(baselineComparison.comparisons.map((item) => [item.name, item]))
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
  if (baselineByName) {
    columns.push({ label: 'vs base', width: 52 });
  }
  blocks.push({ type: 'heading', text: 'Screens ranked riskiest-first' });
  blocks.push({
    type: 'table',
    columns,
    rows: entries.map((entry, index) => {
      const score = entry.audit?.score;
      const textSummary = entry.audit?.textScan?.summary || {};
      const row = [
        index + 1,
        entry.name,
        Number.isFinite(score?.score) ? `${score.score} (${score.grade})` : 'unscored',
        textSummary.belowAA ?? 0,
        textSummary.cvdHiddenFailures ?? 0,
        textSummary.apcaFalsePasses ?? 0,
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
  });

  const gateLines = [];
  if (gate?.enabled) {
    gateLines.push(
      gate.pass
        ? `Score gate passed: every screen scores at least ${gate.threshold}.`
        : `Score gate FAILED (threshold ${gate.threshold}): ${gate.failures.map((failure) => failure.name).join(', ')}.`,
    );
  }
  if (baselineComparison) {
    gateLines.push(
      baselineComparison.pass
        ? `Regression gate passed: no screen dropped more than ${baselineComparison.maxScoreDrop} point(s) vs baseline.`
        : `Regression gate FAILED: ${baselineComparison.failures.map((failure) => failure.name).join(', ')}.`,
    );
  }
  if (gateLines.length) {
    blocks.push({ type: 'heading', text: 'CI gates' });
    gateLines.forEach((line) => blocks.push({ type: 'text', text: line }));
  }

  if (skipped.length) {
    blocks.push({
      type: 'note',
      text: `Skipped ${skipped.length} file(s) that could not be decoded: ${skipped.map((failure) => failure.file).join(', ')}.`,
    });
  }

  return {
    title: 'ClearSight portfolio accessibility audit',
    subtitle: `${portfolio.screenCount} screen${portfolio.screenCount === 1 ? '' : 's'} — ranked riskiest-first across all six analysis axes`,
    generatedAt,
    score: scored
      ? {
          value: portfolio.portfolioScore,
          grade: gradeForScore(portfolio.portfolioScore),
          label: portfolio.releaseGate?.label || '',
          note: 'Portfolio score: 75% fleet average + 25% weakest screen.',
        }
      : null,
    blocks,
    image: null,
  };
}
