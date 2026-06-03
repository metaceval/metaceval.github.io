# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project overview

**Metac** is a zero-dependency, no-framework web app for browsing, relating and sharing two connected catalogs:

1. **Métodos activos** (`metac_*`) — active-learning methodologies / técnicas de aprendizaje activo.
2. **Evaluación** — evaluation resources grouped in four categories (see below), used to assess those methods.

The two catalogs are cross-linked: each technique declares which evaluation resources fit it (`eval_ids`), and the app renders these relationships both inside the technique modal and as interactive bipartite/ego-network maps.

There is **no build step, no package manager, and no test suite**. To develop, serve the repo root with any static server (the app fetches local JSON via `fetch`, so opening `index.html` from `file://` will not work in most browsers):

```bash
python3 -m http.server
```

The app supports **three languages**: `es`, `ca`, `en` (`DEFAULT_LANG` is `en`).

## Architecture

The app is **modular vanilla JS**, not a single file. `index.html` is a declarative shell (inlined CSS-critical bits + HTML) that loads, in order, the scripts in `src/` (see the `<script src="src/…">` tags near the end of `index.html`):

| File | Responsibility |
|------|----------------|
| `src/data.js` | CONFIG, global `S` (technique state) and `EV` (evaluation state), JSON loaders, parsers, normalizers, color/field helpers, `formatDesc`, sharing, favorites/categories persistence. |
| `src/i18n.js` | `I18N` object (strings for `es`/`ca`/`en`), `i(key)` accessor, language switching. |
| `src/shell.js` | App shell, theme handling, top-level view wiring. |
| `src/ui-tecnicas.js` | Técnicas view: cards, tabs, `openModal`, related block, **eval section in modal** (`renderEvalSection`). |
| `src/evaluacion.js` | Evaluación view: cards/list/tabs for the four eval categories, `openEvalModal`. |
| `src/eval-map.js` | Evaluation relationship map + type toggles. |
| `src/bipartite-map.js` | Bipartite map técnicas ↔ evaluación. |
| `src/metac-map.js` / `src/unified-map.js` | Technique relationship maps. |
| `src/favoritos.js` | Favorites panel. |
| `src/init.js` | Reads URL params, loads data, wires all event listeners (entry point). |
| `src/analytics.js` | Lightweight visit analytics. |

Stylesheets live in `css/`. CSS custom properties drive theming (light/dark/auto, persisted under `metac_theme`); layout uses CSS Grid for card grids and Flexbox elsewhere.

All dynamic content (cards, tabs, modal bodies, panels, maps) is injected by JS at runtime. Render functions re-read `S`/`EV` and rebuild DOM.

## State

- **`S`** (in `src/data.js`) — single source of truth for the técnicas catalog: `lang`, `data` (per-language parsed arrays), `byId` (per-language ID maps), `favorites` (Set of technique IDs), `categories`, `search`, active tab, `modal` (open technique ID), `modalHistory`, `shared` (URL-decoded IDs), map color/legend prefs, etc.
- **`EV`** (in `src/data.js`) — evaluation catalog: `EV.data[lang]` (object keyed by the four category ids) and `EV.byId[lang]` (a single `Map` combining all four files, keyed by entity ID). Populated lazily by `loadEvalLang(lang)`.

## Data sources

All data is **local JSON** under `data/{es,ca,en}/` (no Google Sheets / CSV anymore):

- `data/{lang}/metac.json` — the techniques catalog (loaded by `loadLang`).
- `data/{lang}/tecnicas.json`, `evidencias.json`, `instrumentos.json`, `dimensiones.json` — the four evaluation categories (loaded by `loadEvalLang`).

The repo-root `metac-*.md` and `eval-*.md` files are **generated documentation exports** (for NotebookLM, etc.), produced by `scripts/generate_metac_md.py` and `scripts/generate_eval_md.py` from the JSON. They are not consumed by the app; regenerate them with those scripts after editing the JSON.

### Technique object shape

`fromJSON` (in `src/data.js`) maps each raw JSON item to:

```js
{ id, name, desc, tags, blocks, blockIds, fields, fieldIds, programs, summary, related, eval_ids }
```

- `programs` is an array of `{ label, url }`.
- `fields`/`fieldIds` and `blocks`/`blockIds` are produced by `normalizeField` / `normalizeBlock` (these normalize labels and assign stable language-independent IDs — update them if new fields/blocks or typos appear).

## Evaluation system (`eval_ids`)

Each technique JSON item may carry an `eval_ids` array of evaluation entity IDs. Entity IDs are **prefixed by category**, and `EVAL_CATS` (in `src/data.js`) maps prefix → category:

| Prefix | Category id | JSON file | i18n label |
|--------|-------------|-----------|------------|
| `TEC_` | `tecnicas` | `tecnicas.json` | `evalCatTec` |
| `EVI_` | `evidencias` | `evidencias.json` | `evalCatEvi` |
| `INS_` | `instrumentos` | `instrumentos.json` | `evalCatIns` |
| `DIM_` | `dimensiones` | `dimensiones.json` | `evalCatDim` |

`renderEvalSection(item)` (in `src/ui-tecnicas.js`) renders the "Cómo evaluar" block in the technique modal: it groups `eval_ids` by prefix, resolves each via `evalEntityById`, and renders a chip per resource. Clicking a chip pushes onto `S.modalHistory` and opens the eval modal.

**Lazy-load guard:** eval data is loaded by `loadEvalLang` and may not be ready when a modal opens via a direct/shared URL (`?t=metac_099`). `renderEvalSection` handles this: if `EV.byId[S.lang]` is not yet populated it hides the box, kicks off `loadEvalLang`, and re-renders on resolve **only if the same modal is still open** (`S.modal === item.id`). Preserve this guard when editing.

## Related techniques (`related`)

Each technique JSON item may carry a `related` array of stable technique IDs (internal links between techniques).

### Data rules

- Related techniques are stored as **stable IDs**, never as translated technique names.
- IDs use the exact format `metac_001`, `metac_002`, …
- A technique must never include its own ID in its `related` list.
- Ignore related IDs that do not exist in the current language dataset.
- The same related IDs are used across languages because IDs are language-independent.
- `related` is optional; if empty the UI hides the related block.

### UI behavior (`renderRelated` in `src/ui-tecnicas.js`)

- Appears in the modal, after program links and before the full description.
- Shows the localized label (`Relacionadas:` / `Relacionades:` / `Related:`, key `related` in `I18N`).
- Displays the **translated names** for the current language, looked up via `S.byId[S.lang]`.
- Clicking a related item opens that technique's modal.
- Must not modify search, filters, favorites, categories or shared links, and must not introduce a new URL parameter.

### Important

Never use translated technique names as internal references. Relationships (`related`, `eval_ids`) always use IDs; names are only for display.

## Key conventions

- **IDs are the stable cross-language reference**: favorites, categories, selection/modal state, share URLs, `related` and `eval_ids` all store IDs. Row order may differ between languages as long as IDs stay aligned.
- **`fieldColor()` / `fieldColorIdx()`** map field names to colors via keyword matching in `FIELD_MAP` (entries cover es/ca/en). Add entries there for new field categories before falling back to the hash.
- **`formatDesc()`** is a lightweight renderer (not a Markdown parser): `## ` → `<h4>`, numbered lines → `<ol>`, ALL-CAPS-colon prefixes → section labels. Keep the `desc` JSON content consistent with these rules.
- **Sharing**: `shareURL(itemIds)` encodes `?t=metac_001,metac_003&lang=es`; `?t=` populates `S.shared` on load. Eval entities can also be deep-linked.
- **LocalStorage keys**: favorites `metec_favs_v1` (note the "metec" typo — do not change it or existing users lose favorites), theme `metac_theme`, map prefs `metac_map_color_v1` / `metac_map_legend_v1`.

## Manual tests

After changing technique/eval rendering, verify:

1. Open a technique with `eval_ids` (e.g. `metac_099`) — the "Cómo evaluar" block shows the resources grouped by category, in the current language.
2. Open the same technique via direct URL `?t=metac_099&lang=es` on a fresh load — the eval block still appears once eval data loads (lazy-load guard).
3. Click an eval chip — its modal opens; back button returns to the technique.
4. Open a technique with `related` IDs — related block appears; clicking opens the target technique.
5. Switch language — related and eval names show translated labels for the same IDs.
6. Verify favorites and shared URLs still work.
