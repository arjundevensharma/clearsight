# ClearSight

ClearSight is a browser-first accessibility studio for product teams, designers, and students who want to verify visual accessibility quickly.

It helps you see screenshots as people with different vision profiles see them and gives concrete contrast fixes they can apply immediately.

## What it solves

Teams often rely on manual visual judgment for color accessibility and discoverability issues, which can miss edge cases:

- Color-vision deficiencies that change contrast in non-obvious ways.
- Low-vision conditions that reduce sharpness and contrast.
- Inconsistent contrast choices across text and background pairs.

ClearSight lets creators test those conditions in seconds using one uploaded screenshot and then generate concrete alternatives.

## Inspiration

The project started from repeated Devpost-style judging cycles where accessibility checks were hard to demonstrate quickly.

- Need a single offline workflow that works during live demos.
- Need reproducible screenshots for competition artifacts.
- Need clear, actionable recommendations instead of just “pass/fail” indicators.

This led to an all-client-side design: no upload chain, no backend dependency, no user friction.

## How it works

1. Upload a screenshot or load one of the built-in demo scenes.
2. Render multiple simulations:
   - Protanopia, Deuteranopia, Tritanopia
   - Protanomaly, Deuteranomaly, Tritanomaly
   - Achromatopsia
   - Low Vision: Blur
   - Low Vision: Low Contrast
3. Compare outputs side by side to spot visibility issues.
4. Enter text/background colors in the WCAG checker.
5. Get AA / AAA / large-text contrast statuses and up to four suggested accessible pairs.
6. Copy the demo script or screenshot checklist and download ready PNG previews.

All image processing uses canvas operations in-browser, and no image bytes are uploaded to any server.

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

## Run tests

```bash
npm test
```

Command executed: Node’s built-in test runner against `tests/vision-core.test.mjs`.

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
- `tests/` — core logic unit tests
- `README.md` — this file
- `PLAN.md` — project plan and notes
- `VIDEO_SCRIPT.md` — editable demo script source
- `SUBMISSION_SCREENSHOTS.md` — editable screenshot checklist

## Accessibility and verification notes

- All processing stays client-side.
- Input validation is explicit for file type/size and color formats.
- Contrast and transformation utilities are covered by automated tests.
- Static deployment uses only relative paths so it works under `https://arjundevensharma.github.io/clearsight/`.
