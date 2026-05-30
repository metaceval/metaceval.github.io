# Repository Guidelines

## Project Structure & Module Organization
This repository is a zero-dependency static web app. The whole application lives in `index.html`, with CSS in `<style>`, markup in the HTML body, and all behavior in an inline `<script>`. Runtime data also exists in `data/metac - ca.csv` and `data/metac - es.csv`, which mirror the Catalan and Spanish sources and act as local fallback files.

Keep the file organized by responsibility: theme/layout styles first, structural HTML next, then JavaScript sections such as config, i18n, state, parsing, rendering, and initialization. When adding features, preserve that order instead of scattering logic.

## Build, Test, and Development Commands
There is no build step, package manager, or bundler.

- `python3 -m http.server 8000` starts a local static server from the repo root.
- `xdg-open http://localhost:8000/index.html` opens the app in the browser.
- `python3 -m http.server` is preferred over opening the file directly when testing fetches from `data/`.

## Coding Style & Naming Conventions
Use 2-space indentation in HTML, CSS, and JavaScript to match the existing file. Keep JavaScript framework-free and dependency-free. Prefer clear function names such as `renderCards()` or `loadLang()` and keep shared state centralized instead of introducing globals in multiple places.

Use `camelCase` for variables and functions, `UPPER_SNAKE_CASE` for configuration-like constants, and descriptive CSS custom properties such as `--primary` or `--text-muted`. Preserve current naming and ordering when editing the inline sections.

## Testing Guidelines
There is no automated test suite yet. Validate changes manually in both languages and check the main flows: search, field filters, favorites, modal details, shared URLs, and CSV loading fallback.

When editing CSV files, keep the `ID` values stable and aligned across both language files. Favorites, categories, and shared links depend on those IDs, not on row order.

## Commit & Pull Request Guidelines
The repository currently has no commit history, so use a simple convention: short imperative subjects such as `Add offline CSV fallback` or `Fix modal close behavior`. Keep commits focused on one change.

Pull requests should include a concise summary, manual test notes, and screenshots or short recordings for visible UI changes. Mention any CSV schema or data-alignment changes explicitly.

## Related techniques

The app supports a final CSV column (index 8) for related techniques. This column must contain stable technique IDs, not translated names.

Expected cell format:

```
metac_099; metac_045; metac_078
```

Implementation rules:

- Parse the column into `item.related` (array of ID strings).
- Use IDs to look up related items through `S.byId[S.lang]`.
- Display translated names only in the UI.
- Hide the related block if there are no valid related IDs.
- Never create relationships from names.
- Never include the current technique ID as related to itself.
- Keep the same related IDs across ES, CA and EN.

## Data & Configuration Notes
Do not introduce external libraries or a build pipeline unless the repository is intentionally being restructured. If you change local storage keys, URL parameters, or CSV column meanings, document the migration impact in the PR.
