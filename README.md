# ClearSight

ClearSight is a browser-only accessibility simulator and WCAG contrast helper for UI screenshots.

## Run locally

```bash
cd /Users/asharma/projects/hackathons/devpost-agent/projects/2026-07-22-clearsight/repo
python3 -m http.server 4173 -d docs
```

Open `http://localhost:4173`.

## Repo layout

- `docs/` – production static app for GitHub Pages
  - `index.html`
  - `style.css`
  - `app.js`
  - `js/vision-core.js`
- `tests/` – automated unit tests for pure logic
- `PLAN.md` – project plan + architecture for the hackathon
- `VIDEO_SCRIPT.md` – mandatory demo video narrative

## Required constraints covered

- Static web app served from `docs/`.
- All processing runs client-side (Canvas API).
- No secrets, no backend, no paid services.
- Defensive validation and visible errors for unsupported image/file/contrast inputs.

## Submission notes

When you submit on Devpost, include:
- Project video link
- Demo screenshot/gif of:
  - upload or demo source
  - at least 3 simulation cards
  - contrast checker pass/fail and suggestions
