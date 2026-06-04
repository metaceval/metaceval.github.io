// ─── RENDER: EVAL VIEW ───────────────────────────────────────────────────────

const dismissedEvalDescs = new Set();

// ─── EVAL EXAMPLES (external HTML files) ─────────────────────────────────────

const _exampleCache = {};   // key: "lang/id" → html string | null

async function loadEvalExample(id, lang) {
  const langs = lang === 'es' ? ['es'] : [lang, 'es'];
  for (const l of langs) {
    const key = `${l}/${id}`;
    if (key in _exampleCache) return _exampleCache[key];
    try {
      const res = await fetch(`examples/${l}/${id}.html`);
      if (res.ok) {
        const html = await res.text();
        _exampleCache[key] = html;
        return html;
      }
    } catch (_) {}
    _exampleCache[key] = null;
  }
  return null;
}

function getCachedEvalExample(id, lang) {
  const langs = lang === 'es' ? ['es'] : [lang, 'es'];
  for (const l of langs) {
    const html = _exampleCache[`${l}/${id}`];
    if (html) return html;
  }
  return null;
}

async function renderEvalExample(entity) {
  const el = document.getElementById('modalEvalExample');
  if (!el) return;
  el.style.display = 'none';
  el.innerHTML = '';

  const html = await loadEvalExample(entity.id, S.lang);
  if (!html) return;

  // Guard: ensure the same modal is still open
  if (S.evalModal !== entity.id) return;

  el.innerHTML = `<div class="modal-example-label">${esc(i('example'))}</div>${html}`;
  el.style.display = '';
}

const svgCards = '<svg width="13" height="13" viewBox="0 0 16 16" fill="currentColor"><rect x="1" y="1" width="6" height="6" rx="1"/><rect x="9" y="1" width="6" height="6" rx="1"/><rect x="1" y="9" width="6" height="6" rx="1"/><rect x="9" y="9" width="6" height="6" rx="1"/></svg>';
const svgMap   = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="5" cy="6" r="2"/><circle cx="19" cy="6" r="2"/><circle cx="12" cy="19" r="2"/><line x1="7" y1="6" x2="17" y2="6"/><line x1="5.5" y1="8" x2="11" y2="17"/><line x1="18.5" y1="8" x2="13" y2="17"/></svg>';

function recalcSplitViewTop() {
  const hdr   = document.querySelector('header');
  const vTog  = document.getElementById('viewToggle');
  const eNav  = document.getElementById('evalNavBar');
  const split = document.getElementById('evalSplitView');
  if (!split || split.style.display === 'none') return;
  const top = (hdr?.offsetHeight || 0) + (vTog?.offsetHeight || 0) + (eNav?.offsetHeight || 0);
  split.style.top = (top + 6) + 'px';
}

function renderEvalNavFilter() {
  const row = document.getElementById('evalNavFilterRow');
  if (!row) return;
  const activeCount = evalActiveFilterCount();

  row.innerHTML =
    // Category select (first)
    `<div class="eval-filter-nav-item">
      <span class="eval-filter-nav-label">${esc(i('evalCatLabel'))}</span>
      <select id="evalNavCatSelect">
        <option value="" ${S.evalCat === null ? 'selected' : ''}>${esc(i('evalCatAll'))}</option>
        ${EVAL_CATS.map(c => `<option value="${c.id}" ${S.evalCat === c.id ? 'selected' : ''}>${esc(i(c.i18n))}</option>`).join('')}
      </select>
    </div>
    <span class="eval-filter-nav-sep"></span>` +
    // Global attribute filters
    EVAL_GLOBAL_FILTERS.map(filter => `
      <div class="eval-filter-nav-item">
        <span class="eval-filter-nav-label">${esc(i(filter.label))}</span>
        <select data-eval-filter="${filter.key}">
          <option value="">${esc(i(filter.allKey))}</option>
          ${getEvalFilterOptions(filter.field).map(value =>
            `<option value="${esc(value)}" ${S[filter.key] === value ? 'selected' : ''}>${esc(evalFilterValueLabel(value))}</option>`
          ).join('')}
        </select>
      </div>
    `).join('') +
    // Clear
    `<button class="btn eval-filter-clear-inline" type="button" ${activeCount ? '' : 'style="display:none"'}>${esc(i('evalFiltersClear'))}</button>`;

  row.querySelector('#evalNavCatSelect').onchange = e => evalCatSelect(e.target.value || null);
  row.querySelectorAll('[data-eval-filter]').forEach(sel => {
    sel.onchange = e => {
      S[e.target.dataset.evalFilter] = e.target.value;
      S.evalPage = 0;
      if (S.evalMapMode) renderEvalList(); else renderEvalCards();
      updateURL();
    };
  });
  const clearBtn = row.querySelector('.eval-filter-clear-inline');
  if (clearBtn) clearBtn.onclick = () => { clearEvalGlobalFilters(); S.evalPage = 0; if (S.evalMapMode) renderEvalList(); else renderEvalCards(); updateURL(); };
  recalcSplitViewTop();
}

function syncEvalViewMode() {
  // Update Fichas/Mapa buttons in view-toggle bar
  const fichasBtn = document.getElementById('viewToggleFichas');
  const mapaBtn   = document.getElementById('viewToggleMapa');
  if (fichasBtn) fichasBtn.classList.toggle('active', !S.evalMapMode);
  if (mapaBtn)   mapaBtn.classList.toggle('active',  S.evalMapMode);
  // Tools row: graph controls + type visibility (map only)
  const toolsRow = document.getElementById('evalToolsRow');
  if (toolsRow) toolsRow.style.display = S.evalMapMode ? '' : 'none';
  // Filter row: always visible in eval view
  const filterRow = document.getElementById('evalNavFilterRow');
  if (filterRow) filterRow.style.display = '';
  const hub2nd = document.getElementById('evalHub2ndBtn');
  if (hub2nd) hub2nd.classList.toggle('active', !!EGRAPH.expanded);
  if (typeof syncEvalOccasionalButtons === 'function') syncEvalOccasionalButtons();
  if (typeof renderEvalTypeToggles === 'function') renderEvalTypeToggles('evalHubTypeToggles');
}

const EVAL_GLOBAL_FILTERS = [
  { key: 'evalModality',     field: 'modality',      label: 'evalFilterModality',     allKey: 'evalFilterAll' },
  { key: 'evalLocation',     field: 'location',      label: 'evalFilterLocation',     allKey: 'evalFilterAllMasc' },
  { key: 'evalGrouping',     field: 'grouping',      label: 'evalFilterGrouping',     allKey: 'evalFilterAllMasc' },
  { key: 'evalAiResistance', field: 'ai_resistance', label: 'evalFilterAiResistance', allKey: 'evalFilterAll' },
];

function evalFilterValueLabel(value) {
  const map = {
    Presencial: 'evalFilterValPresencial',
    Online: 'evalFilterValOnline',
    Aula: 'evalFilterValAula',
    Laboratorio: 'evalFilterValLaboratorio',
    Exterior: 'evalFilterValExterior',
    Virtual: 'evalFilterValVirtual',
    Domicilio: 'evalFilterValDomicilio',
    Individual: 'evalFilterValIndividual',
    Parejas: 'evalFilterValParejas',
    'Grupo pequeño': 'evalFilterValGrupoPequeno',
    'Gran grupo': 'evalFilterValGranGrupo',
    Alta: 'evalFilterValAlta',
    Media: 'evalFilterValMedia',
    Baja: 'evalFilterValBaja',
  };
  return map[value] ? i(map[value]) : value;
}

function evalFilterTokens(value) {
  return String(value || '')
    .split('/')
    .map(token => token.trim())
    .filter(Boolean);
}

function evalMatchesGlobalFilters(entity) {
  return EVAL_GLOBAL_FILTERS.every(filter => {
    const selected = S[filter.key];
    if (!selected) return true;
    return evalFilterTokens(entity[filter.field]).includes(selected);
  });
}

function evalSearchMatches(entity) {
  const q = normSearch(S.search || '');
  if (!q) return true;
  if (S.searchMode === 'title') return normSearch(entity.name).includes(q);
  return normSearch(entity.id).includes(q) ||
    normSearch(entity.name).includes(q) ||
    normSearch(entity.summary).includes(q) ||
    normSearch(entity.desc).includes(q) ||
    (entity.tags || []).some(t => normSearch(t).includes(q));
}

function filterEvalItems(items) {
  return items.filter(entity => evalMatchesGlobalFilters(entity) && evalSearchMatches(entity));
}

function getEvalFilterOptions(field) {
  const values = new Set();
  const data = EV.data[S.lang] || {};
  EVAL_CATS.forEach(cat => {
    (data[cat.id] || []).forEach(entity => {
      evalFilterTokens(entity[field]).forEach(value => values.add(value));
    });
  });
  return [...values].sort((a, b) => a.localeCompare(b, S.lang, { sensitivity: 'base', numeric: true }));
}

function clearEvalGlobalFilters() {
  EVAL_GLOBAL_FILTERS.forEach(filter => { S[filter.key] = ''; });
}

function evalActiveFilterCount() {
  return EVAL_GLOBAL_FILTERS.reduce((count, filter) => count + (S[filter.key] ? 1 : 0), 0);
}

function buildEvalFilterBar(compact = false) {
  const wrap = document.createElement('div');
  wrap.className = 'eval-filter-bar' + (compact ? ' compact' : '');
  const activeCount = evalActiveFilterCount();

  wrap.innerHTML = `
    <div class="eval-filter-head">
      <span class="eval-filter-title">${esc(i('evalFilters'))}</span>
      <span class="eval-filter-summary">${activeCount ? esc(i('evalFiltersSummary')(activeCount)) : ''}</span>
      <button class="btn eval-filter-clear" type="button" ${activeCount ? '' : 'disabled'}>${esc(i('evalFiltersClear'))}</button>
    </div>
    <div class="eval-filter-controls">
      ${EVAL_GLOBAL_FILTERS.map(filter => `
        <label class="eval-filter-control">
          <span>${esc(i(filter.label))}</span>
          <select data-eval-filter="${filter.key}">
            <option value="">${esc(i(filter.allKey))}</option>
            ${getEvalFilterOptions(filter.field).map(value => `
              <option value="${esc(value)}" ${S[filter.key] === value ? 'selected' : ''}>${esc(evalFilterValueLabel(value))}</option>
            `).join('')}
          </select>
        </label>
      `).join('')}
    </div>
  `;

  wrap.querySelector('.eval-filter-clear').onclick = () => {
    clearEvalGlobalFilters();
    S.evalPage = 0;
    if (S.evalMapMode) renderEvalList();
    else renderEvalCards();
    updateURL();
  };

  wrap.querySelectorAll('[data-eval-filter]').forEach(select => {
    select.onchange = e => {
      S[e.target.dataset.evalFilter] = e.target.value;
      S.evalPage = 0;
      if (S.evalMapMode) renderEvalList();
      else renderEvalCards();
      updateURL();
    };
  });

  return wrap;
}

function getEvalCategoryDescription(cat, isEvalShared = false) {
  if (isEvalShared || !cat) return '';
  const descKey = 'evalCatDesc' + cat.cls.charAt(0).toUpperCase() + cat.cls.slice(1);
  return i(descKey) || '';
}

function buildEvalCategoryDescription(cat, isEvalShared = false) {
  const descText = getEvalCategoryDescription(cat, isEvalShared);
  if (!descText) return null;
  if (dismissedEvalDescs.has(cat.id)) return null;
  const descEl = document.createElement('div');
  descEl.className = 'eval-cat-desc';
  descEl.innerHTML = descText;
  const closeBtn = document.createElement('button');
  closeBtn.className = 'eval-cat-desc-close';
  closeBtn.title = 'Cerrar';
  closeBtn.textContent = '✕';
  closeBtn.onclick = () => { dismissedEvalDescs.add(cat.id); descEl.remove(); };
  descEl.appendChild(closeBtn);
  return descEl;
}

function toggleEvalMapMode() {
  S.evalMapMode = !S.evalMapMode;
  saveViewPref();
  syncEvalViewMode();
  const mainEl  = document.getElementById('main');
  const splitEl = document.getElementById('evalSplitView');
  const selectBtn = document.getElementById('selectBtn');
  if (S.evalMapMode) {
    mainEl.style.display  = 'none';
    splitEl.style.display = 'flex';
    if (selectBtn) selectBtn.style.display = 'none';
    EGRAPH.navHistory = []; EGRAPH.navPos = -1; evalNavUpdateBtns();
    renderEvalList();
  } else {
    evalGraphStop();
    splitEl.style.display = 'none';
    mainEl.style.display  = '';
    if (selectBtn) selectBtn.style.display = '';
    renderEvalCards();
  }
  navPush();
}

function renderEvalTabs() {
  // Category selection moved to renderEvalNavFilter; this bar is now empty/hidden
  const bar = document.getElementById('evalTabs');
  if (bar) { bar.innerHTML = ''; bar.style.display = 'none'; }
}

function evalCatSelect(newCat) {
  S.evalCat = newCat;
  S.evalSelected = null;
  S.evalPage = 0;
  S.search = '';
  document.getElementById('searchInput').value = '';
  updateSearchUI();
  EGRAPH.navHistory = []; EGRAPH.navPos = -1; evalNavUpdateBtns();
  const panel = document.getElementById('evalNodePanel');
  if (panel) panel.classList.remove('visible');
  evalGraphStop();
  renderEvalNavFilter();
  if (S.evalMapMode) renderEvalList(); else renderEvalCards();
  navPush();
}

function renderEvalCards() {
  const main = document.getElementById('main');
  if (!EV.data[S.lang]) {
    main.innerHTML = `<div class="state-box"><div class="spinner"></div><p>${esc(i('evalNoData'))}</p></div>`;
    return;
  }
  const cat = S.evalCat ? (EVAL_CATS.find(c => c.id === S.evalCat) || null) : null;

  // When displaying a shared eval collection, show those specific items across all categories
  const evalPrefixSet = new Set(EVAL_CATS.map(c => c.prefix));
  const isEvalShared = S.shared && S.shared.length && S.shared.some(id => evalPrefixSet.has((id.split('_')[0] || '').toUpperCase()));
  let items;
  if (isEvalShared) {
    items = S.shared.map(id => evalEntityById(id)).filter(Boolean);
  } else if (cat) {
    items = (EV.data[S.lang] || {})[cat.id] || [];
  } else {
    items = EVAL_CATS.flatMap(c => (EV.data[S.lang] || {})[c.id] || []);
  }

  const filtered = filterEvalItems(items);

  // Sort
  const sorted = [...filtered].sort((a, b) => {
    if (S.evalSortMode === 'alpha' || S.evalSortMode === 'alphaDesc') {
      const cmp = a.name.localeCompare(b.name, S.lang, { sensitivity: 'base', numeric: true });
      return S.evalSortMode === 'alphaDesc' ? -cmp : cmp;
    }
    return dailyRank(a.id) - dailyRank(b.id);
  });

  const total = sorted.length;
  const pages = S.evalPerPage ? Math.max(1, Math.ceil(total / S.evalPerPage)) : 1;
  if (S.evalPage >= pages) S.evalPage = pages - 1;
  const paged = S.evalPerPage ? sorted.slice(S.evalPage * S.evalPerPage, (S.evalPage + 1) * S.evalPerPage) : sorted;

  main.innerHTML = '';
  main.style.paddingBottom = S.selectMode ? '110px' : '';

  // ── Results bar (mirrors técnicas) ───────────────────────────────────────
  const bar = document.createElement('div');
  bar.className = 'results-bar';
  bar.innerHTML = `
    <p class="results-info">
      <strong>${total}</strong> ${isEvalShared ? i('techniques') : cat ? i(cat.i18n).toLowerCase() : i('evalCatAll').toLowerCase()}
      <span class="sort-wrap">
        <label for="evalSortSelect">${i('sort')}</label>
        <select id="evalSortSelect">
          <option value="random"    ${S.evalSortMode==='random'    ?'selected':''}>${i('sortRandom')}</option>
          <option value="alpha"     ${S.evalSortMode==='alpha'     ?'selected':''}>${i('sortAlpha')}</option>
          <option value="alphaDesc" ${S.evalSortMode==='alphaDesc' ?'selected':''}>${i('sortAlphaDesc')}</option>
        </select>
      </span>
      <span class="per-page-wrap">
        <label for="evalPerPageSelect">${i('perPage')}</label>
        <select id="evalPerPageSelect">
          <option value="10"  ${S.evalPerPage===10  ?'selected':''}>10</option>
          <option value="25"  ${S.evalPerPage===25  ?'selected':''}>${25}</option>
          <option value="50"  ${S.evalPerPage===50  ?'selected':''}>${50}</option>
          <option value="0"   ${S.evalPerPage===0   ?'selected':''}>${i('pageAll')}</option>
        </select>
      </span>
    </p>
  `;
  bar.querySelector('#evalSortSelect').onchange = e => {
    S.evalSortMode = e.target.value; S.evalPage = 0; renderEvalCards();
  };
  bar.querySelector('#evalPerPageSelect').onchange = e => {
    S.evalPerPage = Number(e.target.value); S.evalPage = 0; renderEvalCards();
  };
  renderEvalNavFilter();
  const descEl = buildEvalCategoryDescription(cat, isEvalShared);
  if (descEl) main.appendChild(descEl);
  main.appendChild(bar);

  if (!total) {
    const empty = document.createElement('div');
    empty.className = 'state-box';
    empty.innerHTML = `<p>${esc(i('noResults') || 'Sin resultados')}</p>`;
    main.appendChild(empty);
    return;
  }

  if (S.selectMode) {
    const selBar = document.createElement('div');
    selBar.className = 'selection-bar';
    selBar.innerHTML = `
      <div class="selection-bar-info">${S.selected.size} ${i('selectedCount')}</div>
      <div class="selection-bar-actions">
        <button class="btn" id="evalSelectVisibleBtn">✓ ${i('selectVisible')}</button>
        <button class="btn btn-primary" id="evalShareSelectedBtn">🔗 ${i('shareSel')}</button>
        <button class="btn" id="evalCancelSelBtn">✕ ${i('selectOff')}</button>
      </div>
    `;
    main.appendChild(selBar);
    selBar.querySelector('#evalSelectVisibleBtn').onclick = () => {
      paged.forEach(e => S.selected.add(e.id));
      renderEvalCards();
    };
    selBar.querySelector('#evalShareSelectedBtn').onclick = () => {
      if (!S.selected.size) return;
      copy(shareURL([...S.selected]));
    };
    selBar.querySelector('#evalCancelSelBtn').onclick = () => clearSelection();
  }

  const grid = document.createElement('div');
  grid.className = 'cards-grid';
  paged.forEach(e => {
    const fav = S.favorites.has(e.id);
    const selected = S.selected.has(e.id);
    const eCat = EVAL_CATS.find(c => c.prefix === evalEntityPrefix(e.id)) || cat;
    const metaBadges = [
      e.phase         ? `<span class="meta-badge meta-badge-phase">${esc(e.phase)}</span>` : '',
      e.participation ? `<span class="meta-badge meta-badge-partic">${esc(e.participation)}</span>` : '',
      e.complexity    ? `<span class="meta-badge meta-badge-complex">${esc(e.complexity)}</span>` : '',
    ].join('');
    const card = document.createElement('div');
    card.className = 'card eval-card' + (fav ? ' is-fav' : '') + (selected ? ' is-selected' : '');
    card.dataset.evalId = e.id;
    card.innerHTML = `
      <div class="card-top">
        <div class="card-name">${esc(e.name)}</div>
        <span class="card-select ${selected ? 'active' : ''}" style="display:${S.selectMode ? 'inline-flex' : 'none'}">✓</span>
        <div class="cat-picker-wrap card-fav-wrap">
          <button class="fav-star ${fav ? 'active' : ''}" data-id="${esc(e.id)}">⭐</button>
        </div>
      </div>
      <div class="card-fields">
        ${(isEvalShared || !S.evalCat) ? `<span class="eval-chip" data-prefix="${eCat.prefix}" style="font-size:.72rem;padding:3px 8px;cursor:default">${esc(i(eCat.i18n))}</span>` : ''}
        ${metaBadges}
      </div>
      ${e.summary ? `<div class="card-summary">${esc(e.summary)}</div>` : ''}
    `;
    card.querySelector('.fav-star').onclick = ev => { ev.stopPropagation(); toggleFav(e.id, ev.currentTarget); };
    card.onclick = () => { if (S.selectMode) { if (S.selected.has(e.id)) S.selected.delete(e.id); else S.selected.add(e.id); renderEvalCards(); } else openEvalModal(e.id); };
    grid.appendChild(card);
  });
  main.appendChild(grid);

  if (S.evalPerPage && pages > 1) main.appendChild(buildPagination(pages, S.evalPage, p => { S.evalPage = p; renderEvalCards(); }));
}

// ─── EVAL SPLIT VIEW FUNCTIONS ───────────────────────────────────────────────

function renderEvalList() {
  const panel = document.getElementById('evalListPanel');
  if (!panel) return;
  const cat = S.evalCat ? EVAL_CATS.find(c => c.id === S.evalCat) : null;
  const items = cat
    ? ((EV.data[S.lang] || {})[cat.id] || [])
    : EVAL_CATS.flatMap(c => (EV.data[S.lang] || {})[c.id] || []);
  const filtered = filterEvalItems(items);

  const header = `
    <div class="eval-list-header">
      <div class="eval-list-header-cat">${esc(cat ? i(cat.i18n) : i('evalCatAll'))}</div>
      <div class="eval-list-header-hint">${esc(i('evalListHint'))}</div>
    </div>`;

  renderEvalNavFilter();
  recalcSplitViewTop();

  if (!filtered.length) {
    panel.innerHTML = header;
    const empty = document.createElement('div');
    empty.style.padding = '16px';
    empty.style.color = 'var(--text-muted)';
    empty.style.fontSize = '.85rem';
    empty.textContent = i('noResults') || 'Sin resultados';
    panel.appendChild(empty);
    if (S.evalSelected) {
      S.evalSelected = null;
      evalGraphStop();
      const nodePanel = document.getElementById('evalNodePanel');
      if (nodePanel) nodePanel.classList.remove('visible');
    }
    return;
  }
  panel.innerHTML = header;
  panel.insertAdjacentHTML('beforeend', filtered.map(e => {
    const pfx = evalEntityPrefix(e.id).toLowerCase();
    const catCls = pfx ? ` cat-${pfx === 'tec' ? 'tec' : pfx === 'ins' ? 'ins' : pfx === 'her' ? 'her' : pfx === 'dim' ? 'dim' : ''}` : '';
    const selCls = S.evalSelected === e.id ? ' selected' : '';
    return `
    <div class="eval-list-item${selCls}${catCls}" data-eval-id="${esc(e.id)}" role="button" tabindex="0">
      <div class="eval-list-name">${esc(e.name)}</div>
      ${e.summary ? `<div class="eval-list-summary">${esc(e.summary)}</div>` : ''}
    </div>`;
  }).join(''));
  panel.querySelectorAll('.eval-list-item').forEach(el => {
    el.onclick = () => showEvalDetail(el.dataset.evalId);
  });

  if (S.evalSelected && !filtered.some(entity => entity.id === S.evalSelected)) {
    S.evalSelected = null;
    evalGraphStop();
    const nodePanel = document.getElementById('evalNodePanel');
    if (nodePanel) nodePanel.classList.remove('visible');
  }

  // Auto-select random item if nothing is selected yet
  if (!S.evalSelected && filtered.length) {
    const randIdx = Math.floor(Math.random() * filtered.length);
    showEvalDetail(filtered[randIdx].id);
  }

  // Scroll selected item into view after DOM is ready (handles category change rebuilds)
  requestAnimationFrame(() => {
    const selEl = panel.querySelector('.eval-list-item.selected');
    if (selEl) selEl.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  });
}

function evalNavUpdateBtns() {
  const show = EGRAPH.navHistory.length > 1;
  ['evalNavBack','evalMapNavBack'].forEach(id => {
    const b = document.getElementById(id);
    if (b) { b.style.display = show ? '' : 'none'; b.disabled = EGRAPH.navPos <= 0; }
  });
  ['evalNavFwd','evalMapNavFwd'].forEach(id => {
    const b = document.getElementById(id);
    if (b) { b.style.display = show ? '' : 'none'; b.disabled = EGRAPH.navPos >= EGRAPH.navHistory.length - 1; }
  });
}

function evalNavGo(id) {
  const entity = evalEntityById(id);
  if (!entity) return;
  EGRAPH._navigating = true;
  const inFullMap = document.getElementById('evalMapView')?.style.display !== 'none';
  if (inFullMap) {
    const cat = EVAL_CATS.find(c => c.prefix === evalEntityPrefix(id));
    renderEvalMapNodePanel(entity, cat);
  } else {
    showEvalDetail(id);
  }
  EGRAPH._navigating = false;
}

function evalNavBack() {
  if (EGRAPH.navPos <= 0) return;
  EGRAPH.navPos--;
  evalNavGo(EGRAPH.navHistory[EGRAPH.navPos]);
  evalNavUpdateBtns();
}

function evalNavFwd() {
  if (EGRAPH.navPos >= EGRAPH.navHistory.length - 1) return;
  EGRAPH.navPos++;
  evalNavGo(EGRAPH.navHistory[EGRAPH.navPos]);
  evalNavUpdateBtns();
}

function showEvalDetail(evalId) {
  const entity = evalEntityById(evalId);
  if (!entity) return;

  if (!EGRAPH._navigating) {
    EGRAPH.navHistory = EGRAPH.navHistory.slice(0, EGRAPH.navPos + 1);
    EGRAPH.navHistory.push(evalId);
    EGRAPH.navPos = EGRAPH.navHistory.length - 1;
    evalNavUpdateBtns();
  }

  S.evalSelected = evalId;
  updateURL();
  const selPrefix = evalEntityPrefix(evalId).toLowerCase();
  const selCatCls = selPrefix === 'tec' ? 'cat-tec' : selPrefix === 'ins' ? 'cat-ins' : selPrefix === 'her' ? 'cat-her' : selPrefix === 'dim' ? 'cat-dim' : '';
  let selectedEl = null;
  document.querySelectorAll('#evalListPanel .eval-list-item').forEach(el => {
    const isSelected = el.dataset.evalId === evalId;
    el.classList.toggle('selected', isSelected);
    if (isSelected) {
      if (selCatCls) el.classList.add(selCatCls);
      selectedEl = el;
    }
  });
  if (selectedEl) requestAnimationFrame(() => selectedEl.scrollIntoView({ block: 'nearest', behavior: 'smooth' }));

  // Hub graph — canvas now fills full panel
  const canvas = document.getElementById('evalHubCanvas');
  evalGraphStop();
  EGRAPH.canvas   = canvas;
  EGRAPH.expanded = false;
  const cat = EVAL_CATS.find(c => c.prefix === evalEntityPrefix(evalId));
  const catId = cat?.id || 'evidencias';
  evalGraphBuild(entity, catId);
  requestAnimationFrame(() => requestAnimationFrame(() => {
    evalGraphResizeCanvas();
    const leftOffset = (catId === 'tecnicas' || catId === 'dimensiones')
      ? (canvas.clientWidth || 0) * 0.28
      : 0;
    EGRAPH.camera = { x: leftOffset, y: 0, scale: 1 };
    evalGraphLoop();
  }));

  // Floating detail panel
  renderEvalNodePanel(entity, cat);
}

function renderEvalNodePanel(entity, cat) {
  const panel = document.getElementById('evalNodePanel');
  if (!panel) return;
  const prefix = evalEntityPrefix(entity.id);

  document.getElementById('evalNodePanelName').textContent = entity.name;

  const metaBadges = [];
  if (cat) metaBadges.push(`<span class="eval-chip" data-prefix="${prefix}" style="cursor:default;font-size:.72rem;padding:2px 7px">${esc(i(cat.i18n))}</span>`);
  if (entity.phase)         metaBadges.push(`<span class="meta-badge meta-badge-phase">${esc(entity.phase)}</span>`);
  if (entity.participation) metaBadges.push(`<span class="meta-badge meta-badge-partic">${esc(entity.participation)}</span>`);
  if (entity.complexity)    metaBadges.push(`<span class="meta-badge meta-badge-complex">${esc(entity.complexity)}</span>`);

  const metacItems = (entity.metac_ids || []).map(id => itemById(id)).filter(Boolean);

  const body = document.getElementById('evalNodePanelBody');
  body.innerHTML = `
    ${metaBadges.length ? `<div class="map-panel-badges" style="gap:4px;flex-wrap:wrap">${metaBadges.join('')}</div>` : ''}
    ${entity.summary ? `<p class="map-panel-summary">${esc(entity.summary)}</p>` : ''}
    <div style="font-size:.84rem;line-height:1.7;margin-top:8px;padding:0 14px 8px">${formatDesc(entity.desc || '')}</div>
    ${metacItems.length ? `
      <div class="map-panel-related">
        <span class="map-panel-rel-label">${esc(i('evalUsedBy'))}</span>
        <div class="map-panel-rel-line" style="text-align:left">
          ${metacItems.slice(0, 5).map((t, idx) => `<span class="related-btn" role="button" tabindex="0" data-metac-id="${esc(t.id)}">${esc(t.name)}</span>${idx < Math.min(metacItems.length, 5) - 1 || metacItems.length > 5 ? '<span class="related-sep">,</span> ' : ''}`).join('')}${metacItems.length > 5 ? `<span style="color:var(--text-muted)">+${metacItems.length - 5}</span>` : ''}
        </div>
      </div>` : ''}
  `;

  body.querySelectorAll('[data-metac-id]').forEach(btn => {
    btn.addEventListener('click', () => { switchView('tecnicas'); openModal(btn.dataset.metacId); });
  });

  const toggle = document.getElementById('evalNodePanelToggle');
  if (toggle) { toggle.textContent = '−'; toggle.title = i('mapPanelCollapse'); }
  const openBtnLabel = document.getElementById('evalNodePanelOpenBtnLabel');
  if (openBtnLabel) openBtnLabel.textContent = i('mapOpenFicha');
  const compactOpen = document.getElementById('evalNodePanelOpenCompact');
  if (compactOpen) compactOpen.title = i('mapOpenFicha');
  panel.classList.add('visible');
  panel.classList.remove('collapsed');
}

function renderEvalMapNodePanel(entity, cat) {
  const panel = document.getElementById('evalMapNodePanel');
  if (!panel) return;

  if (!EGRAPH._navigating) {
    EGRAPH.navHistory = EGRAPH.navHistory.slice(0, EGRAPH.navPos + 1);
    EGRAPH.navHistory.push(entity.id);
    EGRAPH.navPos = EGRAPH.navHistory.length - 1;
    evalNavUpdateBtns();
  }

  const prefix = evalEntityPrefix(entity.id);

  document.getElementById('evalMapNodePanelName').textContent = entity.name;

  const metaBadges = [];
  if (cat) metaBadges.push(`<span class="eval-chip" data-prefix="${prefix}" style="cursor:default;font-size:.72rem;padding:2px 7px">${esc(i(cat.i18n))}</span>`);
  if (entity.phase)         metaBadges.push(`<span class="meta-badge meta-badge-phase">${esc(entity.phase)}</span>`);
  if (entity.participation) metaBadges.push(`<span class="meta-badge meta-badge-partic">${esc(entity.participation)}</span>`);
  if (entity.complexity)    metaBadges.push(`<span class="meta-badge meta-badge-complex">${esc(entity.complexity)}</span>`);

  const metacItems = (entity.metac_ids || []).map(id => itemById(id)).filter(Boolean);

  const body = document.getElementById('evalMapNodePanelBody');
  body.innerHTML = `
    ${metaBadges.length ? `<div class="map-panel-badges" style="gap:4px;flex-wrap:wrap">${metaBadges.join('')}</div>` : ''}
    ${entity.summary ? `<p class="map-panel-summary">${esc(entity.summary)}</p>` : ''}
    <div style="font-size:.84rem;line-height:1.7;margin-top:8px;padding:0 14px 8px">${formatDesc(entity.desc || '')}</div>
    ${metacItems.length ? `
      <div class="map-panel-related">
        <span class="map-panel-rel-label">${esc(i('evalUsedBy'))}</span>
        <div class="map-panel-rel-line" style="text-align:left">
          ${metacItems.slice(0, 5).map((t, idx) => `<span class="related-btn" role="button" tabindex="0" data-metac-id="${esc(t.id)}">${esc(t.name)}</span>${idx < Math.min(metacItems.length, 5) - 1 || metacItems.length > 5 ? '<span class="related-sep">,</span> ' : ''}`).join('')}${metacItems.length > 5 ? `<span style="color:var(--text-muted)">+${metacItems.length - 5}</span>` : ''}
        </div>
      </div>` : ''}
  `;

  body.querySelectorAll('[data-metac-id]').forEach(btn => {
    btn.addEventListener('click', () => {
      closeEvalMap();
      switchView('tecnicas');
      openModal(btn.dataset.metacId);
    });
  });

  // "Open full card" button
  const foot = document.getElementById('evalMapNodePanelFoot');
  const openBtn = document.getElementById('evalMapNodeOpenBtn');
  if (foot && openBtn) {
    openBtn.textContent = i('mapOpenFicha');
    openBtn.onclick = () => {
      closeEvalMap();
      if (S.view === 'evaluacion') showEvalDetail(entity.id);
      else openEvalModal(entity.id);
    };
    foot.style.display = '';
  }

  const mapToggle = document.getElementById('evalMapNodePanelToggle');
  if (mapToggle) { mapToggle.textContent = '−'; mapToggle.title = i('mapPanelCollapse'); }
  const mapCompactOpen = document.getElementById('evalMapNodePanelOpenCompact');
  if (mapCompactOpen) mapCompactOpen.title = i('mapOpenFicha');

  panel.classList.add('visible');
  panel.classList.remove('collapsed');
}

function initEvalSplitEvents() {
  const canvas = document.getElementById('evalHubCanvas');
  if (!canvas) return;

  // 2nd-level toggle
  document.getElementById('evalHub2ndBtn').onclick = () => {
    EGRAPH.expanded = !EGRAPH.expanded;
    document.getElementById('evalHub2ndBtn').classList.toggle('active', EGRAPH.expanded);
    if (S.evalSelected) {
      const entity = evalEntityById(S.evalSelected);
      const cat = EVAL_CATS.find(c => c.prefix === evalEntityPrefix(S.evalSelected));
      if (entity) evalGraphBuild(entity, cat?.id || 'evidencias');
    }
  };

  const occasionalBtn = document.getElementById('evalHubOccasionalBtn');
  if (occasionalBtn) {
    occasionalBtn.onclick = () => {
      EGRAPH.showOccasional = !EGRAPH.showOccasional;
      if (typeof syncEvalOccasionalButtons === 'function') syncEvalOccasionalButtons();
      if (typeof rebuildCurrentEvalGraph === 'function') rebuildCurrentEvalGraph();
    };
  }



  // Floating panel drag + collapse + close
  const nodePanel = document.getElementById('evalNodePanel');
  const panelHead = document.getElementById('evalNodePanelHead');
  if (nodePanel && panelHead) {
    let pdrag = null;
    panelHead.addEventListener('pointerdown', e => {
      if (e.target.closest('button')) return;
      const rect = nodePanel.getBoundingClientRect();
      const parentRect = (nodePanel.offsetParent || nodePanel.parentElement).getBoundingClientRect();
      pdrag = {
        pointerId: e.pointerId,
        x0: e.clientX,
        y0: e.clientY,
        right0: parentRect.right - rect.right,
        top0: rect.top - parentRect.top,
      };
      panelHead.setPointerCapture(e.pointerId);
      nodePanel.classList.add('is-dragging');
    });
    panelHead.addEventListener('pointermove', e => {
      if (!pdrag || pdrag.pointerId !== e.pointerId) return;
      const dx = e.clientX - pdrag.x0;
      const dy = e.clientY - pdrag.y0;
      nodePanel.style.right = Math.max(0, pdrag.right0 - dx) + 'px';
      nodePanel.style.top   = Math.max(0, pdrag.top0  + dy) + 'px';
    });
    const stopDrag = e => {
      if (pdrag && pdrag.pointerId !== e.pointerId) return;
      pdrag = null;
      nodePanel.classList.remove('is-dragging');
    };
    panelHead.addEventListener('pointerup',     stopDrag);
    panelHead.addEventListener('pointercancel', stopDrag);

    document.getElementById('evalNavBack').onclick = e => { e.stopPropagation(); evalNavBack(); };
    document.getElementById('evalNavFwd').onclick  = e => { e.stopPropagation(); evalNavFwd(); };
    document.getElementById('evalNodePanelToggle').onclick = () => {
      const collapsed = nodePanel.classList.toggle('collapsed');
      const toggle = document.getElementById('evalNodePanelToggle');
      toggle.textContent = collapsed ? '+' : '−';
      toggle.title = collapsed ? i('mapPanelExpand') : i('mapPanelCollapse');
    };
    document.getElementById('evalNodePanelOpenCompact').onclick = () => {
      if (S.evalSelected) openEvalModal(S.evalSelected);
    };
    document.getElementById('evalNodePanelOpenBtn').onclick = () => {
      if (S.evalSelected) openEvalModal(S.evalSelected);
    };
    document.getElementById('evalNodePanelClose').onclick = () => {
      nodePanel.classList.remove('visible');
      S.evalSelected = null;
      document.querySelectorAll('#evalListPanel .eval-list-item').forEach(el => el.classList.remove('selected'));
    };
  }

  // Pan / drag on hub canvas
  let isPanning = false, panMoved = false;
  let panStart = { x: 0, y: 0 }, camStart = { x: 0, y: 0 };
  let splitNodeDragStart = null;
  const PAN_THRESHOLD = 5;

  canvas.addEventListener('pointermove', e => {
    const rect = canvas.getBoundingClientRect();
    const sx = e.clientX - rect.left, sy = e.clientY - rect.top;
    if (EGRAPH.dragNode >= 0) {
      const dx = e.clientX - panStart.x, dy = e.clientY - panStart.y;
      if (!EGRAPH.dragMoved && dx * dx + dy * dy < PAN_THRESHOLD * PAN_THRESHOLD) return;
      EGRAPH.dragMoved = true;
      const nd = EGRAPH.nodes[EGRAPH.dragNode];
      if (!nd || !splitNodeDragStart) return;
      nd.x = splitNodeDragStart.nx0 + dx / EGRAPH.camera.scale;
      nd.y = splitNodeDragStart.ny0 + dy / EGRAPH.camera.scale;
      nd.vx = 0; nd.vy = 0; nd.fixed = true;
      EGRAPH.alpha = Math.max(EGRAPH.alpha, 0.3);
      return;
    }
    if (isPanning) {
      const dx = e.clientX - panStart.x, dy = e.clientY - panStart.y;
      if (!panMoved && dx * dx + dy * dy < PAN_THRESHOLD * PAN_THRESHOLD) return;
      EGRAPH.camera.x = camStart.x - dx / EGRAPH.camera.scale;
      EGRAPH.camera.y = camStart.y - dy / EGRAPH.camera.scale;
      panMoved = true;
      return;
    }
    const hit = evalGraphHitTest(sx, sy);
    if (hit !== EGRAPH.hover) {
      EGRAPH.hover = hit;
      canvas.classList.toggle('hovering', hit >= 0);
    }
    const tip = document.getElementById('mapTooltip');
    if (hit >= 0) {
      const nd = EGRAPH.nodes[hit];
      document.getElementById('mapTipName').textContent    = nd.name;
      document.getElementById('mapTipSummary').textContent = nd.summary || '';
      tip.style.display = 'block';
      const tw = tip.offsetWidth  || 250;
      const th = tip.offsetHeight || 80;
      tip.style.left = Math.min(e.clientX + 14, window.innerWidth  - tw - 8) + 'px';
      tip.style.top  = Math.min(e.clientY - 10, window.innerHeight - th - 8) + 'px';
    } else {
      tip.style.display = 'none';
    }
  });
  canvas.addEventListener('pointerdown', e => {
    canvas.setPointerCapture(e.pointerId);
    const rect = canvas.getBoundingClientRect();
    const hit = evalGraphHitTest(e.clientX - rect.left, e.clientY - rect.top);
    panStart = { x: e.clientX, y: e.clientY };
    if (hit >= 0) {
      const nd = EGRAPH.nodes[hit];
      EGRAPH.dragNode = hit;
      EGRAPH.dragMoved = false;
      splitNodeDragStart = { nx0: nd.x, ny0: nd.y };
      isPanning = false;
      panMoved = false;
    } else {
      isPanning = true; panMoved = false;
      camStart = { ...EGRAPH.camera };
    }
  });
  canvas.addEventListener('pointerup', e => {
    if (EGRAPH.dragNode >= 0) {
      const hitNode = EGRAPH.nodes[EGRAPH.dragNode];
      const wasDragged = EGRAPH.dragMoved;
      if (hitNode) hitNode.fixed = false;
      EGRAPH.dragNode = -1;
      EGRAPH.dragMoved = false;
      splitNodeDragStart = null;
      if (!wasDragged && hitNode && !hitNode.isCenter) {
        showEvalDetail(hitNode.id);
        const prefix = evalEntityPrefix(hitNode.id);
        const newCat = EVAL_CATS.find(c => c.prefix === prefix);
        if (newCat && newCat.id !== S.evalCat) {
          S.evalCat = newCat.id;
          renderEvalTabs();
          renderEvalList();
        }
      }
      isPanning = false; panMoved = false;
      return;
    }
    if (!panMoved) {
      const rect = canvas.getBoundingClientRect();
      const hit = evalGraphHitTest(e.clientX - rect.left, e.clientY - rect.top);
      const hitNode = hit >= 0 ? EGRAPH.nodes[hit] : null;
      if (hitNode && !hitNode.isCenter) {
        showEvalDetail(hitNode.id);
        // Update list tab if category changed
        const prefix = evalEntityPrefix(hitNode.id);
        const newCat = EVAL_CATS.find(c => c.prefix === prefix);
        if (newCat && newCat.id !== S.evalCat) {
          S.evalCat = newCat.id;
          renderEvalTabs();
          renderEvalList();
        }
      }
    }
    isPanning = false; panMoved = false;
  });
  canvas.addEventListener('mouseleave', () => {
    document.getElementById('mapTooltip').style.display = 'none';
    EGRAPH.hover = -1;
    canvas.classList.remove('hovering');
  });
  canvas.addEventListener('pointercancel', () => {
    EGRAPH.dragNode = -1;
    EGRAPH.dragMoved = false;
    splitNodeDragStart = null;
    isPanning = false;
    panMoved = false;
  });
  canvas.addEventListener('wheel', e => {
    e.preventDefault();
    EGRAPH.camera.scale = Math.max(0.2, Math.min(4, EGRAPH.camera.scale * (e.deltaY < 0 ? 1.1 : 0.9)));
  }, { passive: false });
}

// ─── OPEN EVAL MODAL ─────────────────────────────────────────────────────────

function openEvalModal(evalId) {
  const entity = evalEntityById(evalId);
  if (!entity) return;

  S.evalModal = evalId;
  S.modal = null;

  const prefix = evalEntityPrefix(evalId);
  const cat = EVAL_CATS.find(c => c.prefix === prefix);

  document.getElementById('modalBackBtn').style.display = S.modalHistory.length ? '' : 'none';
  document.getElementById('modalTitle').textContent = entity.name;
  document.getElementById('modalId').textContent = 'ID: ' + entity.id;

  // Type badge
  const blockEl = document.getElementById('modalBlock');
  blockEl.innerHTML = cat
    ? `<span class="eval-chip" data-prefix="${prefix}" style="font-size:.8rem;cursor:default">${esc(i(cat.i18n))}</span>`
    : '';
  blockEl.style.display = '';

  // Phase / participation / complexity as meta badges
  const metaParts = [];
  if (entity.phase)         metaParts.push(`<span class="meta-badge meta-badge-phase">${esc(i('evalPhase'))} ${esc(entity.phase)}</span>`);
  if (entity.participation) metaParts.push(`<span class="meta-badge meta-badge-partic">${esc(i('evalPartic'))} ${esc(entity.participation)}</span>`);
  if (entity.complexity)    metaParts.push(`<span class="meta-badge meta-badge-complex">${esc(i('evalComplex'))} ${esc(entity.complexity)}</span>`);
  const fieldsEl = document.getElementById('modalFields');
  fieldsEl.innerHTML = metaParts.join('');

  // Summary
  const tagsEl = document.getElementById('modalTags');
  tagsEl.textContent = entity.summary || '';
  tagsEl.style.display = entity.summary ? '' : 'none';

  // Programs: hide
  document.getElementById('modalPrograms').style.display = 'none';

  // "Técnicas activas que la usan"
  const relBox = document.getElementById('modalRelated');
  const metacItems = (entity.metac_ids || []).map(id => itemById(id)).filter(Boolean);
  if (metacItems.length) {
    relBox.style.display = '';
    relBox.innerHTML = `<span class="modal-related-label">${esc(i('evalUsedBy'))}</span>` +
      collapsibleBtns(metacItems, COLLAPSE_LIMIT,
        t => `<button class="related-btn" type="button" data-metac-id="${esc(t.id)}">${esc(t.name)}</button>`
      );
    initCollapsible(relBox);
    relBox.querySelectorAll('[data-metac-id]').forEach(btn => {
      btn.addEventListener('click', ev => {
        ev.stopPropagation();
        S.modalHistory.push({ type: 'eval', id: S.evalModal });
        if (S.view !== 'tecnicas') switchView('tecnicas');
        openModal(btn.dataset.metacId);
      });
    });
  } else {
    relBox.style.display = 'none';
  }

  // Hide "Cómo evaluar" section (not applicable for eval entities)
  const evalBox = document.getElementById('modalEval');
  if (evalBox) evalBox.style.display = 'none';

  // Reset order (not needed now but keep clean)
  document.getElementById('modalBody').style.order    = '';
  document.getElementById('modalRelated').style.order = '';

  // Hide technique-specific blocks
  const exEl = document.getElementById('modalExample');
  if (exEl) { exEl.style.display = 'none'; exEl.innerHTML = ''; }
  const srcEl = document.getElementById('modalSource');
  if (srcEl) { srcEl.style.display = 'none'; srcEl.textContent = ''; }

  // Eval example (external HTML, loaded async)
  renderEvalExample(entity);

  // Description
  document.getElementById('modalBody').innerHTML = formatDesc(entity.desc || '');

  // Extra fields (F): purpose, when_to_use, typical_evidence, limitations
  const extraSections = [
    { key: 'evalPurpose',     value: entity.purpose },
    { key: 'evalWhenToUse',   value: entity.when_to_use },
    { key: 'evalEvidence',    value: entity.typical_evidence },
    { key: 'evalLimitations', value: entity.limitations },
  ];
  const existingExtra = document.getElementById('modalEvalExtra');
  if (existingExtra) existingExtra.remove();
  const hasExtra = extraSections.some(s => s.value && (Array.isArray(s.value) ? s.value.length : s.value));
  if (hasExtra) {
    const extraEl = document.createElement('div');
    extraEl.id = 'modalEvalExtra';
    extraSections.forEach(({ key, value }) => {
      if (!value || (Array.isArray(value) && !value.length)) return;
      const sec = document.createElement('div');
      sec.className = 'modal-eval-section';
      const isArr = Array.isArray(value);
      sec.innerHTML = `<h5>${esc(i(key))}</h5>` +
        (isArr
          ? `<ul>${value.map(v => `<li>${esc(v)}</li>`).join('')}</ul>`
          : `<p>${esc(value)}</p>`);
      extraEl.appendChild(sec);
    });
    document.getElementById('modalBody').after(extraEl);
  }

  // Internal eval relationships (técnicas↔evidencias↔instrumentos↔dimensiones)
  const existingInner = document.getElementById('modalEvalInner');
  if (existingInner) existingInner.remove();
  const byId = EV.byId[S.lang];
  const innerGroups = [
    { field: 'related_tecnicas',    cat: EVAL_CATS.find(c => c.prefix === 'TEC') },
    { field: 'related_instruments', cat: EVAL_CATS.find(c => c.prefix === 'EVI') },
    { field: 'related_tools',       cat: EVAL_CATS.find(c => c.prefix === 'INS') },
    { field: 'related_dimensions',  cat: EVAL_CATS.find(c => c.prefix === 'DIM') },
  ].map(({ field, cat }) => ({
    cat,
    items: (entity[field] || []).map(id => byId?.get(id)).filter(Boolean),
  })).filter(g => g.items.length);

  if (innerGroups.length) {
    const innerEl = document.createElement('div');
    innerEl.id = 'modalEvalInner';
    innerEl.className = 'modal-eval';
    innerEl.innerHTML = `<div class="modal-eval-head">${esc(i('evalInnerRel'))}</div>` +
      innerGroups.map(g => `
        <div class="eval-group">
          <span class="eval-group-label">${esc(i(g.cat.i18n))}:</span>${collapsibleBtns(g.items, COLLAPSE_LIMIT,
            e => `<button class="eval-chip" type="button" data-prefix="${g.cat.prefix}" data-inner-id="${esc(e.id)}">${esc(e.name)}</button>`
          )}
        </div>`).join('');
    initCollapsible(innerEl);
    innerEl.querySelectorAll('[data-inner-id]').forEach(btn => {
      btn.addEventListener('click', ev => {
        ev.stopPropagation();
        S.modalHistory.push({ type: 'eval', id: S.evalModal });
        openEvalModal(btn.dataset.innerId);
      });
    });
    const modalScroll = document.querySelector('.modal-scroll');
    if (modalScroll) modalScroll.appendChild(innerEl);
  }

  // Move "técnicas activas" to the end of the scroll container
  const modalScroll = document.querySelector('.modal-scroll');
  if (modalScroll && relBox) modalScroll.appendChild(relBox);

  // Show all action buttons adapted for eval entity
  showModalActionButtons();

  // Fav
  const favBtn = document.getElementById('modalFavBtn');
  if (favBtn) {
    favBtn.classList.toggle('fav-active', S.favorites.has(entity.id));
    favBtn.onclick = e => toggleFav(entity.id, e.currentTarget);
  }

  // Copy
  const copyBtn = document.getElementById('modalCopyBtn');
  if (copyBtn) {
    copyBtn.onclick = () => {
      const eCat = EVAL_CATS.find(c => c.prefix === evalEntityPrefix(entity.id));
      const meta = [eCat ? i(eCat.i18n) : '', entity.phase, entity.participation, entity.complexity].filter(Boolean).join(' · ');
      const exHtml = getCachedEvalExample(entity.id, S.lang);
      const exPlain = exHtml ? '\n' + i('example') + '\n' + exHtml.replace(/<[^>]+>/g, ' ').replace(/\s{2,}/g, ' ').trim() : '';
      const plain = [entity.name, meta, entity.summary ? '\n' + entity.summary : '', entity.desc ? '\n' + entity.desc : '', exPlain].filter(Boolean).join('\n');
      const html  = [`<h2>${esc(entity.name)}</h2>`, meta ? `<p><em>${esc(meta)}</em></p>` : '', entity.summary ? `<blockquote><p>${esc(entity.summary)}</p></blockquote>` : '', entity.desc ? formatDesc(entity.desc) : '', exHtml ? `<h3>${esc(i('example'))}</h3>${exHtml}` : ''].filter(Boolean).join('\n');
      copyRichContent({ plain, html, btn: copyBtn });
    };
  }

  const markdownBtn = document.getElementById('modalMarkdownBtn');
  if (markdownBtn) markdownBtn.onclick = () => downloadEvalMarkdown(entity);

  const docxBtn = document.getElementById('modalDocxBtn');
  if (docxBtn) docxBtn.onclick = () => downloadEvalDocx(entity);

  // Print
  const printBtn = document.getElementById('modalPrintBtn');
  if (printBtn) {
    printBtn.onclick = () => {
      const eCat = EVAL_CATS.find(c => c.prefix === evalEntityPrefix(entity.id));
      const meta = [eCat ? i(eCat.i18n) : '', entity.phase, entity.participation, entity.complexity].filter(Boolean).join(' · ');
      const exHtml = getCachedEvalExample(entity.id, S.lang);
      const el = ensurePrintArea();
      el.innerHTML = `<h1>${esc(entity.name)}</h1>
        ${meta ? `<p class="print-meta">${esc(meta)}</p>` : ''}
        ${entity.summary ? `<p class="print-summary">${esc(entity.summary)}</p>` : ''}
        <div class="print-body">${formatDesc(entity.desc || '')}</div>
        ${exHtml ? `<div class="print-example-label">${esc(i('example'))}</div><div class="print-body print-example">${exHtml}</div>` : ''}`;
      window.print();
    };
  }

  // Share
  const shareBtn = document.getElementById('modalShareBtn');
  if (shareBtn) shareBtn.onclick = () => copy(shareURL([entity.id]));

  // Map button
  const mapBtn = document.getElementById('modalEvalMapBtn');
  if (mapBtn) {
    mapBtn.style.display = '';
    mapBtn.onclick = () => { closeModal(); openEvalMap(entity, cat?.id || entity.entity_type); };
  }
  const bipartiteBtn = document.getElementById('modalBipartiteBtn');
  if (bipartiteBtn) {
    bipartiteBtn.style.display = (entity.metac_ids || []).length > 0 ? '' : 'none';
    bipartiteBtn.title = i('bipartiteTip');
    bipartiteBtn.onclick = () => openBipartiteMap(entity.id, 'eval');
  }

  openSharedModal();
  updateURL();
}

function buildEvalMarkdown(entity) {
  const eCat = EVAL_CATS.find(c => c.prefix === evalEntityPrefix(entity.id));
  const lines = [`# ${entity.name}`, '', `ID: ${entity.id}`];
  if (eCat) lines.push(`Tipo: ${i(eCat.i18n)}`);
  if (entity.phase) lines.push(`${i('evalPhase')} ${entity.phase}`);
  if (entity.participation) lines.push(`${i('evalPartic')} ${entity.participation}`);
  if (entity.complexity) lines.push(`${i('evalComplex')} ${entity.complexity}`);
  if (entity.summary) lines.push('', entity.summary);
  if (entity.desc) lines.push('', entity.desc.trim());

  const extraSections = [
    { key: 'evalPurpose', value: entity.purpose },
    { key: 'evalWhenToUse', value: entity.when_to_use },
    { key: 'evalEvidence', value: entity.typical_evidence },
    { key: 'evalLimitations', value: entity.limitations },
  ];
  extraSections.forEach(section => {
    if (!section.value || (Array.isArray(section.value) && !section.value.length)) return;
    lines.push('', `## ${i(section.key)}`);
    if (Array.isArray(section.value)) section.value.forEach(value => lines.push(`- ${value}`));
    else lines.push(section.value);
  });

  const byId = EV.byId[S.lang];
  const innerGroups = [
    { field: 'related_tecnicas', cat: EVAL_CATS.find(c => c.prefix === 'TEC') },
    { field: 'related_instruments', cat: EVAL_CATS.find(c => c.prefix === 'EVI') },
    { field: 'related_tools', cat: EVAL_CATS.find(c => c.prefix === 'INS') },
    { field: 'related_dimensions', cat: EVAL_CATS.find(c => c.prefix === 'DIM') },
  ].map(({ field, cat }) => ({
    cat,
    items: (entity[field] || []).map(id => byId?.get(id)).filter(Boolean),
  })).filter(group => group.items.length);

  if (innerGroups.length) {
    lines.push('', `## ${i('evalInnerRel')}`);
    innerGroups.forEach(group => {
      lines.push('', `### ${i(group.cat.i18n)}`);
      group.items.forEach(item => lines.push(`- ${item.name} (\`${item.id}\`)`));
    });
  }

  const metacItems = (entity.metac_ids || []).map(id => itemById(id)).filter(Boolean);
  if (metacItems.length) {
    lines.push('', `## ${i('evalUsedBy')}`);
    metacItems.forEach(item => lines.push(`- ${item.name} (\`${item.id}\`)`));
  }

  const exHtml = getCachedEvalExample(entity.id, S.lang);
  if (exHtml) {
    const exText = exHtml.replace(/<\/tr>/gi, '\n').replace(/<\/th>|<\/td>/gi, '\t').replace(/<[^>]+>/g, '').replace(/\t\n/g, '\n').replace(/[ \t]{2,}/g, ' ').trim();
    lines.push('', `## ${i('example')}`, '', exText);
  }

  lines.push('', `URL: ${shareURL([entity.id])}`);
  return lines.join('\n');
}

function downloadEvalMarkdown(entity) {
  if (!entity) return;
  downloadTextFile(`${slugifyFilename(entity.name)}.md`, buildEvalMarkdown(entity));
  toast(i('markdownDownloaded'));
}

async function downloadEvalDocx(entity) {
  if (!entity) return;
  const eCat = EVAL_CATS.find(c => c.prefix === evalEntityPrefix(entity.id));
  const meta = [eCat ? i(eCat.i18n) : '', entity.phase, entity.participation, entity.complexity].filter(Boolean).join(' · ');
  const exHtml = getCachedEvalExample(entity.id, S.lang);
  const byId   = EV.byId[S.lang];

  const extraSections = [
    { key: 'evalPurpose',    value: entity.purpose },
    { key: 'evalWhenToUse', value: entity.when_to_use },
    { key: 'evalEvidence',  value: entity.typical_evidence },
    { key: 'evalLimitations', value: entity.limitations },
  ].filter(s => s.value && (!Array.isArray(s.value) || s.value.length));

  const innerGroups = [
    { field: 'related_tecnicas',   prefix: 'TEC' },
    { field: 'related_instruments', prefix: 'EVI' },
    { field: 'related_tools',      prefix: 'INS' },
    { field: 'related_dimensions', prefix: 'DIM' },
  ].map(({ field, prefix }) => ({
    cat: EVAL_CATS.find(c => c.prefix === prefix),
    items: (entity[field] || []).map(id => byId?.get(id)).filter(Boolean),
  })).filter(g => g.items.length);

  const metacItems = (entity.metac_ids || []).map(id => itemById(id)).filter(Boolean);

  const htmlContent = [
    meta            ? `<p><em>${esc(meta)}</em></p>` : '',
    entity.summary  ? `<p>${esc(entity.summary)}</p>` : '',
    entity.desc     ? formatDesc(entity.desc) : '',
    ...extraSections.map(s => {
      const body = Array.isArray(s.value)
        ? `<ul>${s.value.map(v => `<li>${esc(v)}</li>`).join('')}</ul>`
        : `<p>${esc(s.value)}</p>`;
      return `<h2>${esc(i(s.key))}</h2>${body}`;
    }),
    innerGroups.length ? `<h2>${esc(i('evalInnerRel'))}</h2>${innerGroups.map(g =>
      `<h3>${esc(i(g.cat.i18n))}</h3><ul>${g.items.map(it => `<li>${esc(it.name)}</li>`).join('')}</ul>`
    ).join('')}` : '',
    metacItems.length ? `<h2>${esc(i('evalUsedBy'))}</h2><ul>${metacItems.map(it => `<li>${esc(it.name)}</li>`).join('')}</ul>` : '',
    exHtml          ? `<h2>${esc(i('example'))}</h2>${exHtml}` : '',
  ].filter(Boolean).join('\n');

  await generateDocx(entity.name, `${slugifyFilename(entity.name)}.docx`, htmlContent);
  toast(i('docxDownloaded'));
}

// ─── VIEW SWITCH ─────────────────────────────────────────────────────────────

function updateViewToggleSlider(instant = false) {
  const doUpdate = () => {
    const slider = document.getElementById('viewToggleSlider');
    if (!slider) return;
    const parent = slider.parentElement;
    const activeBtn = parent.querySelector('.view-btn.active');
    if (!activeBtn || !activeBtn.offsetWidth) return;
    if (instant) slider.style.transition = 'none';
    slider.style.left  = activeBtn.offsetLeft + 'px';
    slider.style.width = activeBtn.offsetWidth + 'px';
    parent.classList.add('slider-ready');
    if (instant) requestAnimationFrame(() => { slider.style.transition = ''; });
  };
  // defer to ensure layout is calculated after text/class changes
  requestAnimationFrame(doUpdate);
}

function renderViewToggle() {
  document.getElementById('viewBtnTecnicas').textContent  = i('viewTecnicas');
  document.getElementById('viewBtnEvaluacion').textContent = i('viewEvaluacion');
  document.getElementById('viewBtnTecnicas').classList.toggle('active', S.view === 'tecnicas');
  document.getElementById('viewBtnEvaluacion').classList.toggle('active', S.view === 'evaluacion');
  updateViewToggleSlider();

  // Sync Fichas/Mapa buttons in view-toggle bar
  const isMapActive = S.view === 'evaluacion' ? S.evalMapMode : S.mapMode;
  const fichasBtn = document.getElementById('viewToggleFichas');
  const mapaBtn   = document.getElementById('viewToggleMapa');
  if (fichasBtn) {
    fichasBtn.innerHTML = svgCards + ' ' + esc(i('viewCardsBtn'));
    fichasBtn.classList.toggle('active', !isMapActive);
    fichasBtn.title = i('viewModeCards');
  }
  if (mapaBtn) {
    mapaBtn.innerHTML = svgMap + ' ' + esc(i('viewMapBtn'));
    mapaBtn.classList.toggle('active', isMapActive);
    mapaBtn.title = i('viewModeMap');
  }

}

function switchView(view) {
  // Close técnicas map if open (toggleMapView restores #main properly)
  if (S.mapMode) toggleMapView();
  if (S.selectMode) { S.selectMode = false; S.selected.clear(); }
  S.view = view;
  saveViewPref();
  S.page = 0;
  renderViewToggle();
  const blockBar  = document.getElementById('blockNavBar');
  const fieldBar  = document.getElementById('fieldNavBar');
  const evalBar   = document.getElementById('evalNavBar');
  const mainEl    = document.getElementById('main');
  const splitEl   = document.getElementById('evalSplitView');
  const selectBtn = document.getElementById('selectBtn');
  const favBtn    = document.getElementById('favBtn');

  if (view === 'tecnicas') {
    blockBar.style.display = '';
    fieldBar.style.display = '';
    evalBar.style.display  = 'none';
    mainEl.style.display   = '';
    splitEl.style.display  = 'none';

    if (selectBtn) selectBtn.style.display = '';
    if (favBtn)    favBtn.style.display    = '';
    evalGraphStop();
    renderBlockTabs();
    renderTabs();
    renderCards();
  } else {
    blockBar.style.display = 'none';
    fieldBar.style.display = 'none';
    evalBar.style.display  = '';
    mainEl.style.display   = 'none';

    if (selectBtn) selectBtn.style.display = S.evalMapMode ? 'none' : '';
    if (favBtn)    favBtn.style.display    = '';

    // Render tabs first so evalNavBar has its real height before we position the split view
    renderEvalTabs();

    syncEvalViewMode();

    // Position fixed panels below sticky bars
    const hdr  = document.querySelector('header');
    const vTog = document.getElementById('viewToggle');
    const eNav = document.getElementById('evalNavBar');
    const top  = (hdr?.offsetHeight || 0) + (vTog?.offsetHeight || 0) + (eNav?.offsetHeight || 0);
    splitEl.style.top = (top + 6) + 'px';

    if (S.evalMapMode) {
      splitEl.style.display = 'flex';
      mainEl.style.display  = 'none';
      renderEvalList();
    } else {
      splitEl.style.display = 'none';
      mainEl.style.display  = '';
      renderEvalCards();
    }
  }
  navPush();
}
