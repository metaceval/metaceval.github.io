# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project overview

**Metac** is a single-page, zero-dependency web app for browsing and sharing active-learning methodologies (técnicas de aprendizaje activo). It is a single HTML file (`index.html`) with all CSS and JavaScript inlined.

There is no build step, no package manager, and no test suite. To develop, open `index.html` directly in a browser or serve it with any static server (e.g. `python3 -m http.server`).

## Architecture

Everything lives in `index.html` in three logical sections:

1. **CSS** (`<style>`) — CSS custom properties drive theming; layout uses CSS Grid for the card grid and Flexbox elsewhere. No external stylesheet.

2. **HTML** — Declarative shell only. All dynamic content (cards, tabs, modal body, panel items) is injected by JavaScript at runtime.

3. **JavaScript** (`<script>`) — Plain vanilla JS, no framework. Key sections, in order:

   - **CONFIG** — `CSV` object holds Google Sheets published-CSV URLs for ES and CA languages. `COLORS` / `FIELD_MAP` map field names to badge colors.
   - **I18N** — `I18N` object with all UI strings for `es` and `ca`. Access via `i(key)`.
   - **STATE** — `S` object is the single source of truth: `lang`, `data` (per-language parsed arrays), `byId` (per-language ID maps), `favorites` (Set of technique IDs), `search`, `field` (active tab), `modal` (open technique ID), `shared` (URL-decoded technique IDs).
   - **CSV PARSER** — `parseCSV` / `toObjects` convert raw Google Sheets CSV into technique objects `{ id, name, desc, tags, fields, programs, summary }`. Programs are parsed from the format `Label|url ; Label2|url2`.
   - **RENDER functions** — `renderTabs()`, `renderCards()`, `openModal(itemId)`, `renderPanel()`. All re-read `S` and rebuild DOM.
   - **DATA FETCH** — `loadLang(lang)` fetches the CSV for the given language (cached in `S.data`). Also falls back to local CSV files during development (the two `.csv` files in the repo).
   - **SHARING** — `shareURL(itemIds)` encodes technique IDs as `?t=metac_001,metac_003&lang=es`. The `?t=` param populates `S.shared` on load, which filters the card grid.
   - **INIT** — Reads URL params, loads data, wires all event listeners.

## Data sources

- **Live** (production): Google Sheets published as CSV, URLs in the `CSV` constant.
- **Local** (backup/offline fallback): `data/metac - ca.csv` (Catalan) and `data/metac - es.csv` (Spanish). These mirror the Google Sheets data and are loaded automatically if the published Google Sheets CSV is unavailable.

## CSV column format

| Column | Field | Notes |
|--------|-------|-------|
| 0 | `id` | Stable technique ID shared by both languages |
| 1 | `name` | Technique name |
| 2 | `desc` | Markdown-lite description: `## Heading`, numbered lists `1. item`, ALL-CAPS: label |
| 3 | `tags` | Comma-separated keywords |
| 4 | `fields` | Comma-separated ámbitos (field/domain badges) |
| 5 | `programs` | Semicolon-separated `Label|url` pairs (optional) |
| 6 | `summary` | Abstract shown in cards and modal metadata |

## Related techniques

The spreadsheet may include a final column with related technique IDs:

| Column | Field | Notes |
|--------|-------|-------|
| 7 | `block` | Block/category name (already present) |
| 8 | `related` | Semicolon-separated stable technique IDs, e.g. `metac_099; metac_045; metac_078` |

The `related` field must be treated as a list of internal links between techniques.

### Data rules

- Related techniques must always be stored as stable IDs, never as translated technique names.
- IDs must use the exact format `metac_001`, `metac_002`, etc.
- Multiple related IDs are separated with semicolon and one space: `metac_099; metac_045; metac_078`
- A technique must never include its own ID in its `related` list.
- Ignore related IDs that do not exist in the current language dataset.
- The same related IDs should be used across languages because IDs are language-independent.
- Related techniques are optional. If the column is missing or a cell is empty, the UI must not show the related block.

### Parser requirements

When converting CSV rows into technique objects, include a new `related` property:

```js
related: (r[col.related] || '')
  .split(';')
  .map(x => x.trim())
  .filter(Boolean)
  .filter(id => id !== r[col.id])
```

The parser must not depend on the translated column name. It should use the column position, just like the other CSV fields.

### UI requirements

When a technique modal is opened, show a block of related techniques if `item.related` contains valid IDs.

The related block should:

- appear in the modal, preferably after program links and before the full description;
- show the localized label (Spanish: `Relacionadas:`, Catalan: `Relacionades:`, English: `Related:`);
- display the translated names of the related techniques for the current language;
- use the related IDs only to look up the corresponding items in `S.byId[S.lang]`;
- open the corresponding technique modal when a related item is clicked;
- not modify search, filters, favorites, categories or shared links;
- not create a new URL parameter;
- not break existing shared URLs, because those already use stable IDs.

### Suggested implementation

Add localized strings to `I18N`:

```js
// es
related: 'Relacionadas:',
// ca
related: 'Relacionades:',
// en
related: 'Related:',
```

Add a container to the modal HTML, after `modalPrograms`:

```html
<div class="modal-related" id="modalRelated" style="display:none"></div>
```

Add CSS near the existing modal program styles:

```css
.modal-related {
  padding: 12px 20px;
  border-bottom: 1px solid var(--border);
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
}
.modal-related-label {
  font-size: .78rem;
  font-weight: 600;
  color: var(--text-muted);
  margin-right: 2px;
}
.related-btn {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 5px 12px;
  background: #f8fafc;
  color: var(--primary);
  border: 1px solid var(--border);
  border-radius: 50px;
  font-size: .8rem;
  font-weight: 600;
  cursor: pointer;
  transition: background .12s, border-color .12s;
}
.related-btn:hover { background: #eff6ff; border-color: #bfdbfe; }
[data-theme="dark"] .related-btn { background: #111827; border-color: var(--border); color: var(--primary); }
[data-theme="dark"] .related-btn:hover { background: #0f1f3d; border-color: #3b82f6; }
```

Add a helper function in the render section:

```js
function renderRelated(item) {
  const box = document.getElementById('modalRelated');
  if (!box) return;
  const byId = S.byId[S.lang] || {};
  const relatedItems = (item.related || []).map(id => byId[id]).filter(Boolean);
  if (!relatedItems.length) { box.style.display = 'none'; box.innerHTML = ''; return; }
  box.style.display = 'flex';
  box.innerHTML = `
    <span class="modal-related-label">${esc(i('related'))}</span>
    ${relatedItems.map(rel => `
      <button class="related-btn" type="button" data-related-id="${esc(rel.id)}">${esc(rel.name)}</button>
    `).join('')}
  `;
  box.querySelectorAll('[data-related-id]').forEach(btn => {
    btn.addEventListener('click', ev => { ev.stopPropagation(); openModal(btn.dataset.relatedId); });
  });
}
```

Call `renderRelated(item)` inside `openModal(itemId)`, after rendering programs and before rendering the modal body.

### Manual tests

After implementing related techniques, test:

1. Open a technique with related IDs — related block appears in the correct language.
2. Click a related technique — its modal opens.
3. Change language — same related IDs show translated names.
4. Open a technique with no related IDs — block is hidden.
5. Verify favorites, shared URLs (`?t=metac_001&lang=es`), and local CSV fallback still work.

### Important

Do not use translated technique names as internal references. The program must always use IDs for relationships and only use names for display.

## Key conventions

- **IDs are the stable cross-language reference**: favorites, categories, selection state, modal state, and share URLs store technique IDs. Row order can differ between languages as long as IDs stay aligned.
- **`normField()`** corrects known typos in the ES CSV field names; update it if new typos appear.
- **`fieldColor()`** maps field names to colors via keyword matching in `FIELD_MAP`. Add entries there for new field categories before falling back to the hash.
- **`formatDesc()`** is a lightweight renderer: `## ` → `<h4>`, numbered lines → `<ol>`, ALL-CAPS-colon prefixes → `<span class="section-label">`. It is not a Markdown parser; keep the CSV format consistent with these rules.
- **LocalStorage key** is `metec_favs_v1` (note: "metec", not "metac" — changing it would lose existing users' favorites).
