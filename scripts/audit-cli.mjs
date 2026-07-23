#!/usr/bin/env node
// ClearSight CI auditor — score PNG screenshots from the command line with
// zero dependencies and no browser. Runs the exact production six-axis
// pipeline (WCAG 2 text contrast, hidden color-vision failures, APCA
// perceptual contrast, WCAG 1.4.1 color-only collisions, WCAG 1.4.11
// component-surface contrast, WCAG 2.5.8 tap-target sizing) from
// docs/js/vision-core.js against raw decoded pixels, then gates the exit
// code on a minimum ClearSight Score so inaccessible screens fail the build.
//
// Usage:
//   npm run audit -- screenshots/*.png
//   npm run audit -- screens/*.png --min-grade B --csv audit.csv --json audit.json
//   node scripts/audit-cli.mjs home.png checkout.png --min-score 80

import { readFile, writeFile } from 'node:fs/promises';
import { basename } from 'node:path';
import { pathToFileURL } from 'node:url';
import { decodePng, downscaleRgba } from './lib/png.mjs';
import { buildMarkdownReport, buildPortfolioPdfDoc, buildSarifReport, buildScoreBadgeSvg } from './lib/report.mjs';
import {
  auditImageAccessibility,
  buildBatchAuditCsv,
  buildPdfReport,
  summarizeBatchAudit,
  CLEARSIGHT_SCORE_GRADES,
} from '../docs/js/vision-core.js';

const DEFAULT_MAX_DIMENSION = 1600; // matches the in-app batch audit working resolution

export function minScoreForGrade(grade) {
  const normalized = String(grade || '').trim().toUpperCase();
  const entry = CLEARSIGHT_SCORE_GRADES.find((candidate) => candidate.grade === normalized);
  if (!entry) {
    const known = CLEARSIGHT_SCORE_GRADES.map((candidate) => candidate.grade).join(', ');
    throw new Error(`Unknown grade "${grade}" — expected one of ${known}.`);
  }
  return entry.min;
}

export function parseCliArgs(argv) {
  const options = {
    files: [],
    minScore: null,
    jsonPath: null,
    csvPath: null,
    markdownPath: null,
    badgePath: null,
    sarifPath: null,
    pdfPath: null,
    baselinePath: null,
    maxScoreDrop: 0,
    maxDimension: DEFAULT_MAX_DIMENSION,
    help: false,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    const readValue = (flag) => {
      const value = argv[i + 1];
      if (value === undefined) {
        throw new Error(`${flag} requires a value.`);
      }
      i += 1;
      return value;
    };

    if (arg === '--help' || arg === '-h') {
      options.help = true;
    } else if (arg === '--min-score') {
      const value = Number(readValue(arg));
      if (!Number.isFinite(value) || value < 0 || value > 100) {
        throw new Error('--min-score must be a number between 0 and 100.');
      }
      options.minScore = Math.max(options.minScore ?? 0, value);
    } else if (arg === '--min-grade') {
      options.minScore = Math.max(options.minScore ?? 0, minScoreForGrade(readValue(arg)));
    } else if (arg === '--json') {
      options.jsonPath = readValue(arg);
    } else if (arg === '--csv') {
      options.csvPath = readValue(arg);
    } else if (arg === '--markdown') {
      options.markdownPath = readValue(arg);
    } else if (arg === '--badge') {
      options.badgePath = readValue(arg);
    } else if (arg === '--sarif') {
      options.sarifPath = readValue(arg);
    } else if (arg === '--pdf') {
      options.pdfPath = readValue(arg);
    } else if (arg === '--baseline') {
      options.baselinePath = readValue(arg);
    } else if (arg === '--max-score-drop') {
      const value = Number(readValue(arg));
      if (!Number.isFinite(value) || value < 0 || value > 100) {
        throw new Error('--max-score-drop must be a number between 0 and 100.');
      }
      options.maxScoreDrop = value;
    } else if (arg === '--max-dim') {
      const value = Number(readValue(arg));
      if (!Number.isInteger(value) || value < 64) {
        throw new Error('--max-dim must be an integer of at least 64.');
      }
      options.maxDimension = value;
    } else if (arg.startsWith('-')) {
      throw new Error(`Unknown option "${arg}" — run with --help for usage.`);
    } else {
      options.files.push(arg);
    }
  }

  return options;
}

/**
 * Audit one decoded RGBA image and return a batch entry shaped exactly like
 * the in-app batch panel's ({ name, audit }), so the pure CSV/portfolio
 * helpers accept it unchanged.
 */
export function auditDecodedImage(name, decoded, maxDimension = DEFAULT_MAX_DIMENSION) {
  const working = downscaleRgba(decoded.data, decoded.width, decoded.height, maxDimension);
  const audit = auditImageAccessibility(working.data, working.width, working.height);
  audit.sourceWidth = decoded.width;
  audit.sourceHeight = decoded.height;
  audit.downscaledForAudit = working.downscaled;
  return { name, audit };
}

export function rankEntriesWorstFirst(entries) {
  const rankValue = (entry) =>
    Number.isFinite(entry.audit?.score?.score) ? entry.audit.score.score : Number.POSITIVE_INFINITY;
  return [...entries].sort((a, b) => rankValue(a) - rankValue(b));
}

/**
 * Gate a ranked batch on a minimum ClearSight Score. Screens that could not
 * be scored fail a threshold gate — an unverifiable screen must never pass
 * CI silently.
 */
export function evaluateAuditGate(entries, minScore) {
  if (!Number.isFinite(minScore)) {
    return { enabled: false, threshold: null, pass: true, failures: [] };
  }
  const failures = entries
    .filter((entry) => {
      const score = entry.audit?.score?.score;
      return !Number.isFinite(score) || score < minScore;
    })
    .map((entry) => ({
      name: entry.name,
      score: Number.isFinite(entry.audit?.score?.score) ? entry.audit.score.score : null,
      grade: entry.audit?.score?.grade || null,
    }));
  return { enabled: true, threshold: minScore, pass: failures.length === 0, failures };
}

export function compareAgainstBaseline(entries, baselineReport, maxScoreDrop = 0) {
  if (!baselineReport || !Array.isArray(baselineReport.screens)) {
    throw new Error('Baseline must be a ClearSight JSON report with a screens array.');
  }
  if (!Number.isFinite(maxScoreDrop) || maxScoreDrop < 0 || maxScoreDrop > 100) {
    throw new Error('Maximum score drop must be a number between 0 and 100.');
  }

  const baselineByName = new Map(baselineReport.screens.map((screen) => [screen.name, screen]));
  const comparisons = entries.map((entry) => {
    const baseline = baselineByName.get(entry.name);
    const currentScore = entry.audit?.score?.score;
    const baselineScore = baseline?.score?.score;
    if (!baseline) {
      return { name: entry.name, status: 'new', baselineScore: null, currentScore: Number.isFinite(currentScore) ? currentScore : null, delta: null };
    }
    if (!Number.isFinite(baselineScore)) {
      return { name: entry.name, status: 'baseline-unscored', baselineScore: null, currentScore: Number.isFinite(currentScore) ? currentScore : null, delta: null };
    }
    if (!Number.isFinite(currentScore)) {
      return { name: entry.name, status: 'regressed', baselineScore, currentScore: null, delta: null };
    }
    const delta = currentScore - baselineScore;
    return {
      name: entry.name,
      status: delta < -maxScoreDrop ? 'regressed' : delta > 0 ? 'improved' : delta < 0 ? 'within-tolerance' : 'unchanged',
      baselineScore,
      currentScore,
      delta,
    };
  });
  const failures = comparisons.filter((item) => item.status === 'regressed');
  return {
    enabled: true,
    maxScoreDrop,
    pass: failures.length === 0,
    matched: comparisons.filter((item) => item.baselineScore !== null).length,
    comparisons,
    failures,
  };
}

export function formatBaselineSummary(comparison) {
  const counts = comparison.comparisons.reduce((result, item) => {
    result[item.status] = (result[item.status] || 0) + 1;
    return result;
  }, {});
  const parts = [
    `${comparison.matched} matched`,
    `${counts.improved || 0} improved`,
    `${counts.regressed || 0} regressed`,
    `${counts.new || 0} new`,
  ];
  if (counts['within-tolerance']) parts.push(`${counts['within-tolerance']} within tolerance`);
  return `Baseline comparison: ${parts.join(', ')} · allowed drop ${comparison.maxScoreDrop} points`;
}

function truncate(text, max) {
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

export function formatAuditTable(entries) {
  const headers = ['#', 'Screen', 'Score', 'Grade', 'Below AA', 'Hidden CVD', 'APCA risk', 'Collisions', 'Components', 'Tap targets', 'Worst ratio'];
  const rows = entries.map((entry, index) => {
    const summary = entry.audit.textScan?.summary || {};
    const worst = entry.audit.textScan?.regions?.[0];
    const collisions = entry.audit.palette?.collisions?.summary?.collisions ?? 0;
    const componentFailures = entry.audit.componentContrast?.summary?.failing ?? 0;
    const undersizedTargets = entry.audit.targetSizes?.summary?.undersized ?? 0;
    const score = entry.audit.score;
    return [
      String(index + 1),
      truncate(entry.name, 36),
      Number.isFinite(score?.score) ? String(score.score) : '—',
      score?.grade || '—',
      String(summary.belowAA ?? 0),
      String(summary.cvdHiddenFailures ?? 0),
      String(summary.apcaFalsePasses ?? 0),
      String(collisions),
      String(componentFailures),
      String(undersizedTargets),
      worst ? `${worst.ratio.toFixed(2)}:1` : '—',
    ];
  });

  const widths = headers.map((header, col) =>
    Math.max(header.length, ...rows.map((row) => row[col].length)),
  );
  const renderRow = (row) => row.map((cell, col) => (col === 1 ? cell.padEnd(widths[col]) : cell.padStart(widths[col]))).join('  ');
  const divider = widths.map((width) => '-'.repeat(width)).join('  ');
  return [renderRow(headers), divider, ...rows.map(renderRow)].join('\n');
}

export function formatPortfolioSummary(portfolio) {
  const lines = [];
  if (Number.isFinite(portfolio.portfolioScore)) {
    lines.push(
      `Portfolio score ${portfolio.portfolioScore}/100 (average ${portfolio.averageScore}, weakest screen ${portfolio.lowestScore} — ${portfolio.lowestScreen})`,
    );
  }
  if (portfolio.weakestAxis) {
    lines.push(`Weakest axis: ${portfolio.weakestAxis.label} (${portfolio.weakestAxis.score}/100 fleet average)`);
  }
  const { totals } = portfolio;
  lines.push(
    `Findings across ${portfolio.scoredCount}/${portfolio.screenCount} scored screens: ` +
      `${totals.belowAA} below-AA text, ${totals.cvdHiddenFailures} hidden CVD, ` +
      `${totals.apcaFalsePasses} APCA risks, ${totals.collisions} color-only collisions, ` +
      `${totals.componentFailures} component contrast failures, ` +
      `${totals.undersizedTargets} undersized tap targets`,
  );
  lines.push(`Release gate: ${portfolio.releaseGate.label}`);
  return lines.join('\n');
}

function printHelp() {
  console.log(`ClearSight CI auditor — score PNG screenshots headlessly (no browser, no dependencies).

Usage:
  npm run audit -- <screenshots...> [options]
  node scripts/audit-cli.mjs screens/*.png --min-grade B

Options:
  --min-score <0-100>  Fail (exit 1) if any screen scores below this ClearSight Score.
  --min-grade <A-F>    Same gate expressed as a grade (A=90, B=80, C=70, D=60, F=0).
  --csv <file>         Write the ranked batch table as CSV.
  --json <file>        Write the full machine-readable report as JSON.
  --markdown <file>    Write a PR-comment-ready GitHub markdown report.
  --badge <file>       Write a shields-style SVG badge with the portfolio score.
  --sarif <file>       Write SARIF 2.1.0 for GitHub code-scanning annotations.
  --pdf <file>         Write a stakeholder-ready PDF portfolio report (zero dependencies).
  --baseline <file>    Compare scores by filename with a previous JSON report.
  --max-score-drop <n> Allow this many points of regression (default 0).
  --max-dim <px>       Audit working resolution cap (default ${DEFAULT_MAX_DIMENSION}).
  -h, --help           Show this help.

Screens are ranked riskiest-first across all six analysis axes. A baseline
enables a regression gate; pair it with --min-grade for an absolute floor.`);
}

async function main() {
  let options;
  try {
    options = parseCliArgs(process.argv.slice(2));
  } catch (error) {
    console.error(`clearsight-audit: ${error.message}`);
    process.exit(2);
  }

  if (options.help) {
    printHelp();
    return;
  }
  if (!options.files.length) {
    console.error('clearsight-audit: no screenshots given — pass one or more PNG files. See --help.');
    process.exit(2);
  }

  const entries = [];
  const failures = [];
  for (const file of options.files) {
    try {
      const decoded = decodePng(await readFile(file));
      entries.push(auditDecodedImage(basename(file), decoded, options.maxDimension));
      const entry = entries[entries.length - 1];
      console.log(
        `Audited ${entry.name}: ${entry.audit.score?.score ?? '—'}/100${entry.audit.score?.grade ? ` (Grade ${entry.audit.score.grade})` : ''}`,
      );
    } catch (error) {
      failures.push({ file, message: error.message });
      console.error(`clearsight-audit: skipped ${file} — ${error.message}`);
    }
  }

  if (!entries.length) {
    console.error('clearsight-audit: no screenshot could be audited.');
    process.exit(2);
  }

  const ranked = rankEntriesWorstFirst(entries);
  const portfolio = summarizeBatchAudit(ranked);
  const gate = evaluateAuditGate(ranked, options.minScore);
  let baselineComparison = null;
  if (options.baselinePath) {
    let baselineReport;
    try {
      baselineReport = JSON.parse(await readFile(options.baselinePath, 'utf8'));
    } catch (error) {
      throw new Error(`Could not read baseline "${options.baselinePath}": ${error.message}`);
    }
    baselineComparison = compareAgainstBaseline(ranked, baselineReport, options.maxScoreDrop);
  }

  console.log(`\nRanked riskiest-first (${ranked.length} screen${ranked.length === 1 ? '' : 's'}):\n`);
  console.log(formatAuditTable(ranked));
  console.log(`\n${formatPortfolioSummary(portfolio)}`);
  if (baselineComparison) console.log(`\n${formatBaselineSummary(baselineComparison)}`);

  if (options.csvPath) {
    await writeFile(options.csvPath, `${buildBatchAuditCsv(ranked)}\n`);
    console.log(`Wrote CSV: ${options.csvPath}`);
  }
  if (options.markdownPath) {
    await writeFile(
      options.markdownPath,
      buildMarkdownReport({ entries: ranked, portfolio, gate, baselineComparison, skipped: failures }),
    );
    console.log(`Wrote markdown report: ${options.markdownPath}`);
  }
  if (options.badgePath) {
    await writeFile(options.badgePath, buildScoreBadgeSvg(portfolio));
    console.log(`Wrote score badge: ${options.badgePath}`);
  }
  if (options.sarifPath) {
    await writeFile(
      options.sarifPath,
      `${JSON.stringify(buildSarifReport({ entries: ranked, gate, baselineComparison }), null, 2)}\n`,
    );
    console.log(`Wrote SARIF report: ${options.sarifPath}`);
  }
  if (options.pdfPath) {
    const pdfDoc = buildPortfolioPdfDoc({
      entries: ranked,
      portfolio,
      gate,
      baselineComparison,
      skipped: failures,
      generatedAt: new Date().toISOString().replace('T', ' ').replace(/\.\d+Z$/, ' UTC'),
    });
    await writeFile(options.pdfPath, buildPdfReport(pdfDoc));
    console.log(`Wrote PDF report: ${options.pdfPath}`);
  }
  if (options.jsonPath) {
    const report = {
      tool: 'clearsight-audit',
      generatedAt: new Date().toISOString(),
      portfolio,
      gate,
      baselineComparison,
      skipped: failures,
      screens: ranked.map((entry, index) => ({ rank: index + 1, name: entry.name, ...entry.audit })),
    };
    await writeFile(options.jsonPath, `${JSON.stringify(report, null, 2)}\n`);
    console.log(`Wrote JSON report: ${options.jsonPath}`);
  }

  const absoluteGateFailed = gate.enabled && !gate.pass;
  const regressionGateFailed = baselineComparison && !baselineComparison.pass;
  if (absoluteGateFailed || regressionGateFailed) {
    if (absoluteGateFailed) {
      const detail = gate.failures
        .map((failure) => `${failure.name} (${failure.score ?? 'unscored'}${failure.grade ? `/${failure.grade}` : ''})`)
        .join(', ');
      console.error(`\nGate FAILED (threshold ${gate.threshold}): ${detail}`);
    }
    if (regressionGateFailed) {
      const detail = baselineComparison.failures
        .map((failure) => `${failure.name} (${failure.baselineScore} → ${failure.currentScore ?? 'unscored'})`)
        .join(', ');
      console.error(`\nRegression gate FAILED (allowed drop ${baselineComparison.maxScoreDrop}): ${detail}`);
    }
    process.exit(1);
  } else if (gate.enabled || baselineComparison) {
    if (gate.enabled) console.log(`\nAbsolute gate passed: every screen scores ≥ ${gate.threshold}.`);
    if (baselineComparison) console.log('Regression gate passed: no screen exceeded the allowed score drop.');
  } else {
    console.log('\nReport-only mode — add --min-score, --min-grade, or --baseline to gate CI on the result.');
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(`clearsight-audit: ${error.message}`);
    process.exit(2);
  });
}
