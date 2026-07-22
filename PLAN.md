# ClearSight Project Plan

## Project concept
ClearSight is a static, privacy-first accessibility utility that helps designers and developers **see** and **fix** accessibility issues in UI screenshots fast. The app lets users upload a screenshot (or use built-in demo scenes), then generates side-by-side visualizations for common vision deficiencies and low-vision conditions. It also includes a WCAG contrast checker that can validate text/background pairs and suggest accessible alternatives.

The project is intentionally scoped for a one-day build:
- One click to load an image.
- Immediate client-side simulation in-browser.
- Immediately understandable, demo-friendly output.
- Lightweight export and sharing workflow to support hackathon judging videos.

## Chosen tech stack
- **Frontend**: HTML5, CSS3, Vanilla JavaScript (ES modules)
- **Image processing**: Canvas API
- **Accessibility logic**: WCAG contrast ratio math (relative luminance + ratio calculation) implemented in JS
- **Testing**: Node.js built-in `node --test` for pure utility functions
- **Hosting**: GitHub Pages from `/docs` directory with relative asset paths

## Feature list (priority order)
### MVP (must-have)
1. Image upload or built-in demo image loading.
2. Render a source preview plus multiple simulation cards in-browser using Canvas.
3. Simulate common color-vision deficiency modes, with clear labels and loading/error states.
4. Add two low-vision modes (blur and low contrast) for visual accessibility simulation.
5. WCAG contrast checker with explicit pass/fail result for AA/AAA thresholds.
6. Visible error and validation messages for unsupported files, oversized images, and invalid colors.

### High-priority enhancements
7. Palette suggestion panel to propose accessible replacement color pairs.
8. One-click copy of suggested palette values and re-run check.

### Nice-to-have
9. Instructional demo script links and screenshot checklist for Devpost submission.
10. Lightweight export controls for generated results (downloadable previews).
11. Add source-image color picker controls for direct contrast text/background sampling.

## Session checkpoint (2026-07-22)
- [x] Add simulation impact ranking to make high-risk vision modes immediately visible after render.
- [x] Add source-vs-simulated slider comparison inside each simulation card.
- [x] Add unit/integration coverage for impact metric calculations.
- [x] Add drag-and-drop image loading and clipboard-paste upload flow for faster demo iterations.
- [x] Add contact-sheet export to download source + completed simulation previews as one PNG for submission packaging.
- [x] Add ranked simulation card ordering so highest-impact previews appear first after each render.
- [x] Make contact-sheet export rank-aware with visible impact delta metadata for faster judging and review.
- [x] Add one-click accessibility audit report export (JSON) covering ranked simulation impact and current contrast checks.
- [x] Add global simulation blend control to synchronize source-vs-sim overlay across all cards for faster review.
- [x] Add workspace reset control to clear source, simulations, and contrast state between demo iterations.
- [x] Add keyboard-accessible modal behavior (focus restore, tab trap) and one-key shortcuts for demo workflow.
- [x] Add single-click submission package export that downloads rendered visuals, ranked contact sheet, and accessibility report together.
- [x] Add an accessibility health summary panel combining top-impact simulation delta and contrast status.
- [x] Add global simulation intensity slider to tune matrix/filter severity across all preview modes.
- [x] Add live auto-re-render for severity slider changes with debounced updates (no manual re-run needed).
- [x] Add one-click top-impact export pack for source + highest-impact simulations with a compact contact sheet.
- [x] Add inspectable full-size simulation preview modal with direct download for focused judging review.
- [x] Make WCAG contrast checker context-aware with large-text AA threshold support (3:1) and align suggestions/reporting output.
- [x] Add source-image color picker controls for direct contrast text/background sampling from the rendered source.
- [x] Add quick-access top-impact simulations filter toggle for rapid high-risk review during demos.
- [x] Add one-click highest-impact preview action (button + keyboard shortcut) for immediate demo triage.
- [x] Add an in-app judge-focused onboarding workflow panel and mirrored README execution checklist for faster demo clarity.

## Architecture
### File layout
- `index.html` / `style.css` / `app.js` are deployed in `docs/` for GitHub Pages.
- `docs/js/vision-core.js` contains testable pure functions:
  - color transform matrices
  - contrast math
  - palette suggestions
- `app.js` handles UI orchestration, file loading, canvas rendering, and events.
- `tests/vision-core.test.mjs` validates core logic in Node without a browser.
- `VIDEO_SCRIPT.md` documents the 1–3 minute demo narrative required in submission.

### Runtime flow
1. User selects or generates an image.
2. App validates input and draws a scaled source image onto an internal render surface.
3. For each mode:
   - apply matrix transforms in JS (CVD modes), or
   - apply Canvas filters (low-vision modes),
   - write output into mode-specific preview canvases.
4. WCAG panel parses color inputs, computes contrast ratios, and renders recommendations.

## Static deployment contract
- Output must live under `docs/` and load correctly under a subpath using relative paths (e.g. `./app.js`, `./style.css`).
- All logic is client-only; no credentials, secrets, or paid APIs.
- Works offline after page load and never uploads images to a server.
