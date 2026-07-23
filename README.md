# ClearSight

ClearSight is a browser-first accessibility studio for product teams, designers, and students who want to verify visual accessibility quickly.

It helps you see screenshots as people with different vision profiles see them and gives concrete contrast fixes they can apply immediately.

Each rendered vision mode includes a source-aware hotspot map: muted context keeps the interface recognizable while bright pink pinpoints the regions whose appearance changes most.

## What it solves

Teams often rely on manual visual judgment for color accessibility and discoverability issues, which can miss edge cases:

- Color-vision deficiencies that change contrast in non-obvious ways.
- Low-vision conditions that reduce sharpness and contrast.
- Inconsistent contrast choices across text and background pairs.

ClearSight lets creators test those conditions in seconds using one uploaded screenshot and then generate concrete alternatives.

The default workspace keeps that screenshot-to-proof path focused: specialist motion and
keyboard-focus labs stay one click away in compact disclosures, while the evidence dock promotes
the four artifacts most teams actually hand off. Preview packs, raw data, video, and compliance
formats remain available under **More export formats** without crowding the primary audit flow.

## Inspiration

The project started from repeated Devpost-style judging cycles where accessibility checks were hard to demonstrate quickly.

- Need a single offline workflow that works during live demos.
- Need reproducible screenshots for competition artifacts.
- Need clear, actionable recommendations instead of just “pass/fail” indicators.

This led to an all-client-side design: no upload chain, no backend dependency, no user friction.

## How it works

1. Upload a screenshot, load one of the built-in demo scenes, or click **Capture a live app**
   to audit any running application with zero screenshots: pick a window, browser tab, or full
   screen and ClearSight grabs exactly one frame (sharing stops immediately), then feeds it
   through the complete six-axis audit. The frame never leaves your device.
   - Supported image formats: PNG, JPG/JPEG, GIF, WEBP, BMP, AVIF, SVG.
2. Render multiple simulations:
   - Protanopia, Deuteranopia, Tritanopia
   - Protanomaly, Deuteranomaly, Tritanomaly
   - Achromatopsia
   - Low Vision: Blur
   - Low Vision: Low Contrast
   - Low Vision: Cataracts (haze + glare)
   - Low Vision: Glaucoma (tunnel vision / peripheral field loss)
   - Low Vision: Macular degeneration (central field loss)
3. Compare outputs side by side to spot visibility issues. The live audit verdict panel
   condenses everything into a **ClearSight Score** — one deterministic 0–100 grade (A–F)
   weighted across six analysis axes: WCAG 2 text contrast (40%), hidden color-vision
   failures (25%), color independence per WCAG 1.4.1 (20%), APCA perceptual contrast
   (15%), component contrast per WCAG 1.4.11 (15%), and tap-target sizing per WCAG 2.5.8
   (15%). One hard AA failure can't be averaged away (the text axis blends mean with
   worst-region 50/50), axes without data are excluded with weights renormalized, and the
   score re-computes live after every repair so fixes show up as measurable grade changes.
   A live accessibility-fingerprint radar chart makes that six-axis profile visible at a
   glance and narrates every plotted value to assistive technology. Mission control also
   exposes the measured finding count for every axis—including invisible component surfaces
   and undersized tap targets—so the headline verdict cannot hide geometric or non-text
   failures behind a healthy text score, and its recommended action routes directly to the
   highest-priority repair or layout review.
   After an automated region repair or accessible recolor, the command center preserves the
   before score and shows a verified before→after point and grade delta beside the live ring.
   If a local fix makes the broader audit worse, ClearSight labels the regression instead of
   claiming success, so teams know not to adopt a narrowly optimized recolor.
   The score ships in the report JSON/CSV, judge summary, and reviewer packet.
4. Read the automatic text contrast scan: ClearSight locates text-like regions in the
   screenshot itself, estimates each region's foreground/background colors and WCAG ratio,
   outlines them on the image (worst contrast first), and can repair the selected region in
   place, rerun every simulation, and show measured before→after WCAG proof — no manual color
   picking or global recolor needed. For the fastest remediation demo, **Fix all detected
   failures** safely isolates every failing text cluster, applies locally scoped accessible
   color replacements in one pass, then reruns the complete audit and reports the before→after
   failing-region count plus the exact number of changed pixels.
   Beneath the scan, the **UI component contrast panel (WCAG 1.4.11 Non-text Contrast)**
   catches what no text lens can: a button or input whose *surface* nearly matches the page.
   For every detected region, ClearSight marches a thin ring outward until the surrounding
   color departs from the component surface, then checks that pair against the 3:1 non-text
   minimum — the demo UI sample's ghost search input passes AA on its placeholder text yet
   is flagged at 1.25:1, a control users can't see the edges of. Text sitting directly on
   the page is honestly reported as out of 1.4.11 scope rather than guessed at, and findings
   flow into the report JSON/CSV, judge summary, and remediation plan.
   Below it, the **tap target size panel (WCAG 2.2 SC 2.5.8 Target Size — Minimum)** catches
   the one failure no color lens can see: controls too small to hit. ClearSight measures every
   resolved component surface to pixel precision by flood-filling it, and searches regions that
   sit directly on the page for compact solid blocks (icon buttons, chips) — a solidity filter
   rejects thin glyph strokes so plain words are never mistaken for tap targets. Sizes convert
   to CSS pixels (stated 1× screenshot assumption), and an undersized target only *fails* when
   a 24px circle centered on it would overlap a neighboring target — the WCAG spacing exception
   is honored honestly when a small control has clearance. The demo UI sample's crisp 16px icon
   toolbar passes every contrast check yet is flagged at ~15–17px with neighbors inside 24px;
   the remediation plan says plainly that the fix is a layout change (bigger hit area or more
   gap), something no pixel repaint can honestly claim to repair. Findings flow into the report
   JSON, CSV columns, judge summary, and remediation plan.
   Every flagged surface carries a one-click **Repair surface & verify** action that repaints
   just that component with the closest surface color holding 3:1 against the page — and the
   repair is honest across *all* the audit's lenses at once: it chases the region's original
   text ratio so the text-contrast axis never walks backwards, enforces an APCA floor so the
   fix can't mint a perceptual false pass (on a light page that physics forces a genuinely
   dark surface with light text, not a muddy compromise), and steers away from surface colors
   that would collapse into the screenshot's dominant palette for color-blind users (no new
   WCAG 1.4.1 collisions). ClearSight then reruns all 12 simulations plus the complete audit
   and pins a proof line — the demo's ghost input repairs from 1.25:1 to a verified 11.4:1
   with the overall ClearSight Score rising and every other axis unchanged.
   Or click **Fix every detected accessibility failure** once to repair all below-AA text
   regions and every failing component surface in the same local pixel pass. ClearSight then
   reruns all 12 simulations and all six score axes and shows a single before→after proof
   with remaining findings and the exact number of changed pixels.
   Pixels prove the fix — code ships it: **Copy fixes as CSS** / **Download fix sheet (.css)**
   exports every pending repair as paste-ready CSS custom properties (`--clearsight-text-1-color`,
   `--clearsight-component-1-surface`, …) built from the *same verified plans* the one-click
   repairs paint, with honest comments per rule: measured before/after ratios, the WCAG
   criterion (1.4.3 or 1.4.11), APCA Lc for recolored labels, palette-safety verdicts, and
   explicit best-effort labeling whenever a target is unreachable. It now also carries every
   failing tap target as a screenshot-localized `.clearsight-target-fix-N` layout template:
   measured dimensions, the 24×24 CSS px goal, minimum hit-area rules, a spacing-exception
   alternative, and an explicit reminder to map the generated placeholder to the real source
   selector—honest handoff for the one axis a pixel repaint cannot fix. The sheet updates live as
   repairs land, and is bundled into the submission package zip as `<name>-fixes.css`.
   Every pixel repair is reversible: **Undo last screenshot repair** restores the exact
   pre-repair pixels and source provenance, then reruns all 12 simulations and six audit
   axes. If the score proof catches a regression—or a reviewer simply prefers the original—
   the workspace returns to its prior audit in one click.
   When the audit needs to travel to a compliance conversation, **Download conformance
   summary** turns it into a VPAT-style document: every machine-checkable WCAG 2.2
   criterion (1.4.1 Use of Color, 1.4.3/1.4.6 text contrast, 1.4.11 non-text contrast,
   2.3.1 flashes, 2.5.8 target size) is mapped to *Supports / Partially Supports / Does Not
   Support / Not Evaluated* with the measured evidence beside it, plus advisory CVD and APCA
   lenses. The document is deliberately honest: "Supports" is stated as "no failures
   detected by automated pixel analysis" — never a legal conformance claim — and criteria
   that require the DOM or interaction (alt text, keyboard, focus visibility, name/role/value)
   are listed under an explicit *Requires manual testing* section. It updates live as repairs
   land (a repaired 1.4.11 surface flips its row to Supports on re-audit) and is bundled into
   the submission package zip as `<name>-conformance-summary.md`. One manual criterion can
   become measurable: analyze a two-frame focus pair or a tab-through recording (section 1d,
   below) and 2.4.7 Focus Visible moves out of the manual-testing list into the machine-checked
   table with the measured diff as evidence, alongside a 2.4.13 Focus Appearance row — and when
   both are measured, the worse verdict drives the rows.
   Prefer to explore by hand? Toggle **Contrast X-ray** above the source preview and hover
   anywhere on the screenshot: a magnified loupe follows the cursor showing the estimated
   text/background pair under the probe, its live WCAG ratio and level, the worst of the
   seven color-vision projections (with hidden-failure callout), and the APCA Lc score —
   three contrast lenses at pointer speed. Click (or focus the preview and press Enter) to
   send the sampled pair straight into the checker. The probe is fully keyboard-operable
   (arrow keys move it, `Shift` steps 1px, `Esc` exits) and announces each verdict through a
   polite screen-reader live region.
5. Enter text/background colors in the WCAG checker (hex, `rgb()`/`rgba()`, or `hsl()`/`hsla()` style values).
6. Get AA / AAA / large-text contrast statuses and up to four suggested accessible pairs.
   Every check also projects the pair through all seven color-vision deficiency matrices and
   flags **hidden failures** — pairs that pass standard WCAG math for typical vision but drop
   below AA for color-blind users (e.g. pure red on black: 5.25:1 normally, 1.74:1 projected
   grayscale). Scanned text regions get the same per-region CVD-worst annotation and a
   `CVD risk` badge. Each pair is additionally scored with **APCA**, the perceptual contrast
   algorithm from the WCAG 3 draft: the checker shows the signed Lc value, reading polarity,
   and usage-tier chips (body text Lc 75+, fluent/large Lc 60+, spot text, non-text), and
   flags **perceptual false passes** — pairs like light gray on black that pass WCAG 2 at
   9:1 (AAA) and survive every color-vision projection, yet score only Lc 56 and read poorly
   in practice. APCA scores flow into the scan list (`APCA risk` badges), report JSON/CSV,
   judge summary, and the remediation plan.
7. Let the auto palette audit flag every failing dominant-color pairing, then click
   `Preview accessible recolor` to see your own screenshot repainted with the closest
   WCAG-passing replacement colors — original and fixed side by side, downloadable as PNG.
   The audit also runs a **color-only distinction scan** (WCAG 1.4.1 Use of Color): every
   clearly-distinct dominant color pair is projected through all seven color-vision matrices
   in CIE Lab space, and pairs whose perceptual difference collapses (ΔE falls from 25+ to
   under 12) are flagged with side-by-side "typical vision → seen with ..." swatches — the
   classic status-green vs alert-amber trap that no text-contrast check can catch, because
   the colors never touch each other. Findings flow into the report JSON/CSV, judge summary,
   reviewer packet, and the remediation plan.
8. Download `judge summary` for a reviewer-friendly quick audit narrative, or click
   **Download PDF audit report** for a stakeholder-ready PDF: grade-colored score donut,
   six-axis breakdown, findings tables (text scan, color collisions, component surfaces, tap targets, contrast lenses),
   the prioritized remediation plan, and the annotated screenshot embedded as JPEG.
   The PDF is written byte-by-byte in the browser by a from-scratch, zero-dependency
   PDF 1.4 writer in `vision-core` — no libraries, no upload — and is bundled into the
   submission package ZIP automatically.
   For a pitch deck, Devpost gallery, or status update, **Download audit verdict card**
   creates a polished 1200×630 PNG containing the real ClearSight Score, all six axis
   values, the audited screenshot, four at-a-glance finding counts, and the highest-priority
   next action. It is generated locally from the same report and included automatically in
   the submission package.
   After any one-click screenshot repair finishes its full six-axis re-audit, **Download
   repair proof card** unlocks a second 1200×630 artifact: exact before/after pixels,
   ClearSight Score and grade delta, four finding-count reductions, changed-pixel count,
   and an on-device verification statement. It is included automatically in the submission
   ZIP only when genuine pre-repair evidence exists, so the export can never imply a fix
   that ClearSight did not measure.
9. Copy the demo script or screenshot checklist and download ready PNG previews.
10. Click `Export vision reel (video)` to record a short WebM entirely in the browser: it
    cycles the original view and every rendered simulation (highest impact first) with mode
    labels and pixel-shift percentages baked into each frame — drop it straight into a demo
    video. Once recorded, the reel is bundled automatically into the submission package ZIP
    and listed in the manifest.
11. Auditing a whole app? Use **Batch audit** (section 1b) to drop up to 12 screenshots at
    once — or skip screenshots entirely with **Record app walkthrough**: share a window, tab,
    or screen and simply click through your product. ClearSight samples the stream locally,
    keeps one keyframe per *distinct* screen you visit (a coarse perceptual signature skips
    repeat frames and unstable mid-navigation paints, and revisiting a screen never duplicates
    it), while a parallel 10 fps motion sampler checks the live stream for general-luminance
    and saturated-red flashing under WCAG 2.3.1. The moment you press `Stop & audit`, every
    captured screen flows through the ranked batch audit and portfolio debt map and the motion
    scan produces a seizure-safety verdict — one recording, both static and temporal coverage,
    up to 12 screens / 2 minutes (motion analysis caps at the first 24 seconds), with nothing
    ever uploaded. Load a prior ClearSight CI `--json` report with **Compare CI baseline…** to turn
    the ranked screen list into a local visual regression review: every matched route gets
    a score delta, and the panel calls out improved, unchanged, new, and regressed screens.
    Every screen runs the complete six-axis audit headlessly (text contrast, hidden
    CVD failures, APCA false passes, WCAG 1.4.1 color collisions, component contrast, and tap-target size) and gets its own ClearSight
    Score ring, then the list ranks the riskiest screens first with per-screen finding counts.
    `Score built-in sample set` demos it instantly with the two demo scenes, `Open full audit`
    promotes any screen into the full 12-simulation workspace for repair, and
    `Download batch CSV` exports one spreadsheet row per screen.
    The portfolio accessibility debt map adds a weakest-screen-aware aggregate score, grade
    distribution, total cross-screen findings, weakest analysis axis, and an explicit
    release-ready / needs-review / blocked gate so teams can make a product-level decision
    without hiding a critical route behind a healthy average.
12. Shipping continuously? The identical six-axis audit also runs completely outside the
    browser: `npm run audit -- screens/*.png --min-grade B` scores PNG screenshots in pure
    Node with zero dependencies and fails the build when any screen drops below your gate —
    see [Audit screenshots in CI](#audit-screenshots-in-ci-no-browser-required).
13. Animated UI? The **Animation & video flash scan** (section 1c) covers the danger no static
    audit can see: photosensitive-seizure risk (**WCAG 2.3.1 Three Flashes or Below Threshold**).
    Load an animated GIF/APNG/WebP **or a real MP4/WebM/MOV video** — a spinner, promo banner,
    product-demo screen recording, or hero-banner clip — and ClearSight decodes the frames
    on-device and tracks both relative luminance and color across an 8×8 region grid. Videos are
    seek-sampled at 10 fps (first 24 s, truncation reported), including duration-less WebM straight
    out of `MediaRecorder` screen captures. It independently detects general flashes
    (≥10%-of-white luminance swings whose darker state sits below 0.80) and WCAG saturated-red
    flashes (R/(R+G+B) ≥ 0.8 with a CIE 1976 UCS chromaticity swing above 0.2) per rolling
    one-second window. It reports both peak rates, the share of the frame flashing
    simultaneously, and the worst one-second window, then renders a High / Caution / Low verdict
    with a frame-luminance timeline and concrete fixes (slow the cycle, shrink the region below
    25%, soften the swing, honor `prefers-reduced-motion`). `Run red-flash trap demo` shows a
    failure a luminance-only tool misses — a red/green promo banner with zero qualifying general
    flashes but 5 saturated-red flashes/sec across 62% of the frame — and findings flow into the
    report JSON, judge summary, and remediation plan. Video scanning works in every modern
    browser; decoding animated image files uses the WebCodecs `ImageDecoder` API (Chrome/Edge),
    and the built-in demo works everywhere.
14. Keyboard accessibility? The **Focus appearance check** (section 1d) makes WCAG **2.4.7
    Focus Visible** machine-checkable — a criterion every screenshot auditor must normally
    punt to manual testing, because a focus indicator only exists while focus is present.
    Capture the same view twice — without and with keyboard focus — and ClearSight diffs the
    frames pixel-by-pixel: the change *is* the indicator. It is then measured against the
    WCAG **2.4.13 Focus Appearance** metrics: the ≥3:1 contrast between the focused and
    unfocused states of every changed pixel, and a contrasting area at least as large as a
    1&nbsp;px perimeter of the component (bounds approximated by the indicator's own bounding
    box — an approximation the report states rather than hides). The verdict is honest in
    three tiers: no visible change fails 2.4.7 outright, a faint or undersized indicator is
    *Partially Supports* (visible in a diff is not visible to a user), and only an indicator
    clearing both 2.4.13 bars passes. The panel paints the focused frame with every changed
    pixel highlighted (solid magenta where the 3:1 bar is met), reports changed/contrasting
    pixel counts, the area minimum, mean/max change contrast, and the dominant indicator
    color, and the result flows into the report JSON, judge summary, remediation plan, and
    the conformance summary (2.4.7 + 2.4.13 rows with measured evidence). Two built-in demos
    diff the demo UI against itself with a faint 2px ring (detected, but 0 pixels reach 3:1 —
    fails) and a bold 6px ring (5,304 contrasting px vs the 904 px² minimum — passes). Both
    frames stay on-device, like everything else.
15. Two frames prove one focus state — a short recording proves the whole keyboard journey.
    The **Focus order map** (also section 1d) takes an MP4/WebM/MOV screen recording of you
    pressing <kbd>Tab</kbd> through a still view (start unfocused, no scrolling) and folds it
    frame-by-frame against the unfocused baseline, so each sampled frame's diff is exactly the
    indicator of wherever focus sits at that moment. Repeated samples of the same stop are
    deduped (keeping the best-measured capture, since mid-transition frames under-measure their
    own ring), returning to an earlier stop counts as a revisit, frames whose diff covers most
    of the screen are honestly set aside as *view-changed* rather than misread as focus, and
    long recordings sample at 3 fps up to 90 frames with only the baseline held in memory.
    Every distinct stop gets its own WCAG 2.4.13 verdict and the panel draws the numbered tab
    path on the dimmed baseline — green badges meet the bar, amber ones fall below — with a
    per-stop list of measured areas, change contrast, and indicator colors. The aggregate
    verdict flows into the report JSON, judge summary, remediation plan, and the conformance
    summary, where the *worst* measured focus evidence wins: one strong focused screenshot
    cannot excuse a faint indicator elsewhere in the tab order. The numbered map downloads
    as a standalone PNG and is automatically bundled into the submission ZIP and manifest,
    so the keyboard journey can travel with the audit as reviewable visual evidence. The
    built-in demo maps a synthesized 7-frame tab-through of the demo UI (two bold stops pass,
    the faint ring on the ghost search input fails, plus idle, duplicate, and revisit frames)
    — and the recording never leaves the device.

All image processing uses canvas operations in-browser, and no image bytes are uploaded to any server.
After the first visit, the app shell is cached for offline use. The hero shows a live
**Offline-ready** proof badge, and supported browsers can install ClearSight as a standalone app.

## Fast 90-second judge workflow

Use this exact sequence for a reliable, demo-friendly run:

0:00-0:10 — Load source (`Load demo UI`, `Load demo dashboard`, upload, URL import, or paste).  
0:10-0:30 — Click `Render simulations`, then open `Inspect highest-impact simulation`.  
0:30-1:10 — Run `Check contrast`, apply a suggestion if needed, then re-check.  
1:10-1:30 — Export `Download submission package` and copy one artifact (`G` for one-click handoff, or `J`/`Y`/`X`/`N`).
`Copy judge snapshot` also includes a readiness status block so you can hand off: completion percentage, next action, and expected artifact names in one paste.

If time is behind, use this fallback playbook:

- 0:00–0:20: load a built-in demo.
- 0:20–0:40: render and inspect top-impact simulation.
- 0:40–1:10: run contrast, apply one suggestion, and re-check.
- 1:10–1:30: package + one copy artifact export.

Controls stay intentionally locked until the workflow reaches that phase, so a disabled artifact/export control is expected guidance,
not an error.

### Judge-ready handoff checklist

To prevent surprises in front of judges, use this artifact-first checklist:

- 0:00–0:10: source loaded and simulations queued for render.
- 0:10–0:30: simulations rendered with visible ranking + top-impact simulation inspected.
- 0:30–1:10: contrast checked and at least one accessible suggestion applied/rejected intentionally.
- 1:10–1:30: one artifact copied and the submission package downloaded.
- 1:10–1:30: or press `G` once ready to run one-touch judge handoff (package + handoff packet).

Required exported artifacts
- `submission-manifest.txt`
- `submission-package.zip`
- `judge-summary.md`
- `accessibility-handoff-packet.md`
- `submission-report.json` + `submission-report.csv`
- `<name>-audit-report.pdf` — stakeholder-ready PDF (score ring, six-axis breakdown, findings tables, remediation plan, annotated screenshot), generated byte-by-byte in the browser with zero libraries and bundled into the ZIP automatically
- `<name>-conformance-summary.md` — VPAT-style WCAG conformance summary (criterion-by-criterion outcomes with measured evidence, advisory lenses, honest manual-testing scope), bundled into the ZIP automatically
- `source-original.png`, ranked contact sheet, and top-impact preview pack

Submission unlock rule:
- Source loaded: workflow can start.
- All simulations rendered: `Top-impact`, snapshots, and simulation artifacts become available.
- Contrast check run: handoff exports and copy actions become enabled.
- All three together: judge workflow is complete and your handoff packet is submission-ready.

### Share an audit with a link (zero upload)

Once the judge workflow is complete, **Copy shareable audit link** compresses the entire audit
verdict — ClearSight Score with axis breakdown, worst text findings with CVD/APCA columns,
WCAG 1.4.1 color-collision pairs, contrast lens results, flash-scan verdict, and the prioritized
remediation plan — into the URL fragment itself (gzip via `CompressionStream`, base64url-encoded,
typically ~2 KB). Opening the link renders a portable **Shared audit verdict** panel at the top of
the app: score ring, metric tiles, color-swatched findings, and an interactive remediation plan.
Recipients can check off actions, see live completion progress, and copy a handoff-ready markdown
tracker. Progress is scoped to that exact audit link and saved only in the recipient's browser.

Privacy properties worth stating in a demo:
- The fragment (`#share=…`) is never sent to any server — browsers strip it from HTTP requests.
- No screenshot travels with the link; only the derived findings do.
- Decoding happens entirely on the recipient's device, and works offline once the app shell is cached.
- Corrupted or truncated links fail with a friendly, actionable error instead of breaking the app.

**Show QR share code** renders that same link as a scannable QR code — point a phone camera at the
screen and the complete verdict opens there, still with zero upload. The QR encoder is ClearSight's
own from-scratch implementation in `vision-core` (byte-mode segments, Reed-Solomon error correction
over GF(256), all eight mask patterns scored by the four ISO/IEC 18004 penalty rules, BCH-coded
format/version information, versions 1–40 at EC levels M and L with honest capacity fallback — a
too-large payload gets a clear error, never a corrupt code). Output is verified against published
spec vectors in unit tests, round-tripped through a structural decoder, and decoded end-to-end with
Apple's Vision framework during development. The rendered code can also be downloaded as a PNG for
slides or printed handoff sheets.

### Target deliverables for judge handoff

By 90 seconds, you should have all of these ready:
- Ranked simulation previews (with impact order visible)
- Contrast result + top suggestions
- `submission-manifest.txt`
- `submission-package.zip` from **Download submission package**
- Judge summary (markdown) + contrast/accessibility reports

Goal: complete the flow in under 90 seconds for the most persuasive demo path.
Submission-related actions are intentionally gated; copy and package controls remain locked until source, simulations, and contrast checks are complete.

### Recommended first-time flow

1. Load input (upload, demo sample, paste from clipboard, public URL, or live screen capture).
2. Render all simulations.
3. Inspect the top-impact preview with `P`/`Inspect`.
4. Run contrast checks, apply any contrast suggestion, and validate pass status.
5. Download the submission package and copy at least one handoff artifact (summary or CSV/JSON) for submission notes.
6. Press `G` for one-touch judge handoff: package download and handoff packet copy in one action.

Keyboard shortcuts for speed:

- `R` render simulations
- `U` load demo UI
- `D` load demo dashboard
- `C` check contrast
- `A` generate suggestions
- `W` swap text and background contrast colors
- `I` download contrast snapshot
- `X` copy accessibility report JSON
- `Y` copy accessibility report CSV
- `Z` download submission package
- `J` download judge summary
- `N` copy accessibility handoff packet JSON
- `G` finalize judge handoff (download package + handoff packet)
- `P` inspect the highest-impact simulation
- `Esc` close preview / cancel color picker / exit contrast X-ray

Contrast suggestions are projected through all seven color-vision matrices before ranking. A
`CVD-safe` badge means the pair holds the active AA threshold in every simulated mode; orange risk
badges identify alternatives that still create a projected failure.

Expected output for submission:

- Source preview
- Simulation previews for all modes
- Ranked contact sheet (`Download contact sheet`)
- Vision reel video (`Export vision reel (video)` — auto-bundled into the package ZIP once recorded)
- Accessibility report (`Download accessibility report`)
- Accessibility report CSV (`Download accessibility report CSV` / `Y` copy)
- Portfolio accessibility PDF (`Download portfolio PDF` after any batch audit) with the fleet score, release gate, debt map, baseline deltas, and riskiest-first screen table
- Contrast snapshot (`Download contrast snapshot` / `I` shortcut)
- Submission package manifest (`submission-manifest.txt`) with ranked files, contrast status, and estimated per-file/total image payload sizes
- Judge summary (`Download judge summary`)
- Optional full package (`Download submission package`)

## Tech stack

- HTML/CSS/JavaScript static frontend.
- Canvas API for image transforms and previews.
- Node.js built-in test runner (`node:test`) for core utility logic.
- Plain markdown documentation kept in-repo for demo workflow.

## Run locally

From the repo root:

```bash
cd /Users/asharma/projects/hackathons/devpost-agent/projects/2026-07-22-clearsight/repo
python3 -m http.server 4173 -d docs
```

Then open `http://localhost:4173`.

Production site path is served from `docs/` and is already configured with relative asset URLs for GitHub Pages.

## Build production bundle

Use the build script to regenerate the deployed `docs/` bundle from `docs/current/` before sharing or shipping:

```bash
npm run build
```

This keeps `docs/` and `docs/current/` in sync and ensures relative-path assets remain consistent for
`https://arjundevensharma.github.io/clearsight/`.

## Run tests

```bash
npm test
```

Command executed: Node’s built-in test runner against `tests/vision-core.test.mjs` (core analysis
math) and `tests/audit-cli.test.mjs` (PNG decoder round-trips and CI auditor gate/report helpers).

### Browser smoke test

```bash
npm install
npm run smoke
```

`scripts/smoke.mjs` serves the production `docs/` bundle over HTTP, drives the full quick-judge
workflow in headless Chrome (sample load → 12 simulations → contrast check → suggestions → preview
modal), and fails on any page error, console error, or broken milestone. It auto-detects a
Chrome/Chromium binary from the Puppeteer cache or system install; set `PUPPETEER_EXECUTABLE_PATH`
to override, or `CLEARSIGHT_SMOKE_DIR=docs/current` to test the staging bundle.

## Audit screenshots in CI (no browser required)

The same six-axis audit that powers the in-app batch panel also runs headlessly in plain
Node — no Chrome, no npm dependencies, nothing installed beyond Node itself. A built-in
pure-JS PNG decoder (`scripts/lib/png.mjs`, using only `node:zlib`) feeds decoded pixels
straight into the production `auditImageAccessibility()` from `docs/js/vision-core.js`, so
CI scores are byte-for-byte the same math the web app shows judges.

```bash
# Report-only: rank every screenshot riskiest-first with a portfolio verdict
npm run audit -- screenshots/*.png

# Gate CI: exit 1 if any screen scores below ClearSight grade B (80/100)
npm run audit -- screenshots/*.png --min-grade B

# Machine-readable artifacts for dashboards and PR comments
npm run audit -- screenshots/*.png --min-score 75 --csv audit.csv --json audit.json

# Regression gate: compare this PR with a JSON report saved from main
npm run audit -- screenshots/*.png --baseline main-audit.json --max-score-drop 2

# GitHub-facing artifacts: PR comment, score badge, and code-scanning SARIF
npm run audit -- screenshots/*.png --markdown a11y-comment.md --badge clearsight-badge.svg --sarif clearsight.sarif

# Stakeholder-ready PDF portfolio report (score donut, debt map, ranked table, gate verdicts)
npm run audit -- screenshots/*.png --min-grade B --pdf a11y-portfolio.pdf
```

Each run prints a ranked table (score, grade, below-AA text regions, hidden CVD failures,
APCA risks, WCAG 1.4.1 color collisions, worst contrast ratio) plus the portfolio debt map:
weakest-screen-aware aggregate score, weakest analysis axis, cross-screen finding totals,
and the release-ready / needs-review / blocked gate. Exit codes are CI-friendly: `0` pass
or report-only, `1` gate failed, `2` usage or decode error. Screens that cannot be scored
fail a threshold gate — an unverifiable screen never passes silently.

Baseline comparison matches screens by filename and reports improved, unchanged, new, and
regressed routes. By default any score drop fails; `--max-score-drop N` allows a deliberate
tolerance. New routes are reported but do not silently inherit a baseline, so pair
`--baseline` with `--min-grade` when you want both “no regressions” and an absolute quality
floor. The generated JSON embeds the complete `baselineComparison` result for PR automation.

`--markdown` writes the same ranked table, portfolio verdict, gate results, and baseline
deltas as GitHub-flavored markdown, ready to post verbatim as a PR comment. `--badge`
writes a shields-style SVG badge with the portfolio score, colored by grade band (green A
through red F, gray when unscored) — commit it and embed it in your README like any CI
badge. `--sarif` emits SARIF 2.1.0 with one annotation per failing analysis axis and
baseline regression, turning screenshot files into first-class GitHub code-scanning
results. `--pdf` writes a stakeholder-ready portfolio PDF — grade-colored score donut,
debt map, riskiest-first table with per-screen axis findings and baseline deltas, and CI
gate verdicts — using the same from-scratch, zero-dependency PDF writer that powers the
in-app **Download PDF audit report** button. All artifacts are generated locally and
covered by unit tests.

Works directly on the PNGs your test tooling already emits (Playwright, Cypress, Puppeteer
screenshots). Example GitHub Actions job that gates the build and posts the audit as a PR
comment:

```yaml
- name: Accessibility gate on UI screenshots
  run: >
    npm run audit -- e2e/screenshots/*.png --min-grade B
    --baseline main-audit.json --json a11y-audit.json
    --markdown a11y-comment.md --badge clearsight-badge.svg
    --sarif clearsight.sarif

- name: Upload ClearSight findings to code scanning
  if: ${{ always() }}
  uses: github/codeql-action/upload-sarif@v3
  with:
    sarif_file: clearsight.sarif

- name: Post audit as PR comment
  if: ${{ always() && github.event_name == 'pull_request' }}
  run: gh pr comment ${{ github.event.pull_request.number }} --body-file a11y-comment.md
  env:
    GH_TOKEN: ${{ github.token }}
```

## Live demo

https://arjundevensharma.github.io/clearsight/

## Repo layout

- `docs/` — production static site
  - `index.html`
  - `style.css`
  - `app.js`
  - `js/vision-core.js`
  - `VIDEO_SCRIPT.md`
  - `SUBMISSION_SCREENSHOTS.md`
- `scripts/` — build sync, browser smoke test, and the zero-dependency CI screenshot auditor (`audit-cli.mjs` + `lib/png.mjs`)
- `tests/` — core logic unit tests (`vision-core.test.mjs`) and CI auditor tests (`audit-cli.test.mjs`)
- `README.md` — this file
- `PLAN.md` — project plan and notes
- `VIDEO_SCRIPT.md` — editable demo script source
- `SUBMISSION_SCREENSHOTS.md` — editable screenshot checklist

## Accessibility and verification notes

- All processing stays client-side.
- Input validation is explicit for file type/size and color formats.
- Contrast and transformation utilities are covered by automated tests.
- Static deployment uses only relative paths so it works under `https://arjundevensharma.github.io/clearsight/`.
