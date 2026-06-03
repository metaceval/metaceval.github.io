// ─── HOME VIEW ────────────────────────────────────────────────────────────────
// ─── HISTORY NAVIGATION ──────────────────────────────────────────────────────

function getNavState() {
  if (document.getElementById('homeView').classList.contains('visible'))
    return { screen: 'home' };
  if (S.view === 'evaluacion')
    return { screen: 'evaluacion', evalCat: S.evalCat, map: !!S.evalMapMode };
  return { screen: 'tecnicas', map: !!S.mapMode };
}

function getViewParam() {
  if (document.getElementById('homeView').classList.contains('visible')) return null;
  if (S.view === 'evaluacion') {
    const suffix = S.evalMapMode ? '-map' : '';
    return S.evalCat ? 'eval-' + S.evalCat + suffix : 'eval' + suffix;
  }
  return 'tecnicas' + (S.mapMode ? '-map' : '');
}

function applyViewParam(u) {
  const vp = getViewParam();
  if (vp) u.searchParams.set('view', vp);
  else u.searchParams.delete('view');

  if (S.view === 'tecnicas' && S.block) u.searchParams.set('block', S.block);
  else u.searchParams.delete('block');
  if (S.view === 'tecnicas' && S.field) u.searchParams.set('field', S.field);
  else u.searchParams.delete('field');

  const openModalId = S.modal || S.evalModal;
  if (openModalId) u.searchParams.set('modal', openModalId);
  else u.searchParams.delete('modal');

  if (S.mapMode && typeof MAP !== 'undefined' && MAP.selected >= 0 && MAP.nodes?.[MAP.selected]) {
    u.searchParams.set('node', MAP.nodes[MAP.selected].id);
  } else {
    u.searchParams.delete('node');
  }

  if (S.evalSelected) u.searchParams.set('item', S.evalSelected);
  else u.searchParams.delete('item');

  const EVAL_FILTER_PARAMS = [
    { key: 'evalModality',     param: 'emod' },
    { key: 'evalLocation',     param: 'eloc' },
    { key: 'evalGrouping',     param: 'egrp' },
    { key: 'evalAiResistance', param: 'eai'  },
  ];
  if (S.view === 'evaluacion') {
    EVAL_FILTER_PARAMS.forEach(({ key, param }) => {
      if (S[key]) u.searchParams.set(param, S[key]);
      else u.searchParams.delete(param);
    });
  } else {
    EVAL_FILTER_PARAMS.forEach(({ param }) => u.searchParams.delete(param));
  }
}

function updateURL() {
  if (S._popping) return;
  const u = new URL(location.href);
  applyViewParam(u);
  if (u.href === location.href) return;
  history.pushState(getNavState(), '', u);
}

function navPush() {
  if (S._popping || S._navLock) return;
  const st = getNavState();
  const cur = history.state;
  if (cur && cur.screen === st.screen && cur.evalCat === st.evalCat && !!cur.map === !!st.map) return;
  const u = new URL(location.href);
  applyViewParam(u);
  history.pushState(st, '', u);
}

function showHome() {
  document.getElementById('homeView').classList.add('visible');
  document.getElementById('viewToggle').style.display  = 'none';
  document.getElementById('blockNavBar').style.display = 'none';
  document.getElementById('fieldNavBar').style.display = 'none';
  document.getElementById('evalNavBar').style.display  = 'none';
  document.getElementById('main').style.display        = 'none';
  document.getElementById('evalSplitView').style.display = 'none';
  const mapView = document.getElementById('mapView');
  if (mapView) mapView.style.display = 'none';
  const selBtn = document.getElementById('selectBtn');
  const favBtn = document.getElementById('favBtn');
  if (selBtn) selBtn.style.display = 'none';
  if (favBtn) favBtn.style.display = 'none';
  applyI18N();
  navPush();
}

function hideHome() {
  document.getElementById('homeView').classList.remove('visible');
  document.getElementById('viewToggle').style.display = '';
}

function enterView(view, mapMode, evalCat) {
  S._navLock = true;
  if (evalCat) S.evalCat = evalCat;
  hideHome();
  if (view === 'tecnicas') {
    S.evalMapMode = false;
    switchView('tecnicas');
    if (mapMode) toggleMapView();
    S._navLock = false;
    navPush();
  } else {
    loadEvalLang(S.lang).then(() => {
      S.evalMapMode = !!mapMode;
      switchView('evaluacion');
      S._navLock = false;
      navPush();
    }).catch(() => { S._navLock = false; });
  }
}

// ─── RENDER: FILTER TABS ─────────────────────────────────────────────────────

function renderBlockTabs() {
  const wrap = document.getElementById('blockTabs');
  wrap.innerHTML = '';
  const mkTab = (label, val, hint = label) => {
    const b = document.createElement('button');
    b.className = 'block-tab' + (S.block === val ? ' active' : '');
    b.textContent = label;
    b.title = hint;
    b.setAttribute('aria-label', hint);
    b.onclick = () => {
      S.block = S.block === val ? null : val;
      S.field = null;
      S.page = 0;
      renderBlockTabs();
      renderTabs();
      renderCards();
      updateURL();
    };
    wrap.appendChild(b);
  };
  mkTab(i('allBlocks'), null, i('allBlocksHint'));
  allBlocks().forEach(block => mkTab(block.label, block.id, taxonomyHint(block.label, block.description)));
}

function renderTabs() {
  const wrap = document.getElementById('fieldTabs');
  wrap.innerHTML = '';
  const mkTab = (label, val, hint = label) => {
    const b = document.createElement('button');
    b.className = 'field-tab' + (S.field === val ? ' active' : '');
    b.textContent = label;
    b.title = hint;
    b.setAttribute('aria-label', hint);
    b.onclick = () => { S.field = S.field === val ? null : val; S.page = 0; renderTabs(); renderCards(); updateURL(); };
    wrap.appendChild(b);
  };
  mkTab(i('allFields'), null, i('allFieldsHint'));
  allFields().forEach(field => mkTab(field.label, field.id, taxonomyHint(field.label, field.description)));
}

// ─── RENDER: CARDS ───────────────────────────────────────────────────────────

function filteredData() {
  const data = S.data[S.lang] || [];

  let indexed = S.shared
    ? refsToItemIds(S.shared).map(id => {
      const row = rowById(id);
      return row ? { item: row.item, id, idx: row.idx } : null;
    }).filter(Boolean)
    : data.map((item, idx) => ({ item, id: item.id, idx }));

  if (S.block)
    indexed = indexed.filter(({ item }) => item.blockIds.includes(S.block));

  if (S.field)
    indexed = indexed.filter(({ item }) => item.fieldIds.includes(S.field));

  const norm = normSearch;
  const q = norm(S.search.trim());
  if (q) indexed = indexed.filter(({ item }) =>
    S.searchMode === 'title'
      ? norm(item.name).includes(q)
      : (norm(item.id).includes(q) ||
    norm(item.name).includes(q) ||
    norm(item.desc).includes(q) ||
    norm(item.example).includes(q) ||
    norm(item.source).includes(q) ||
    norm(item.summary).includes(q) ||
    item.blocks.some(b => norm(b).includes(q)) ||
    item.tags.some(t => norm(t).includes(q)) ||
    item.fields.some(f => norm(f).includes(q)) ||
    item.programs.some(p =>
      norm(p.label).includes(q) ||
      norm(p.url).includes(q)
    ))
  );

  return sortRows(indexed);
}

function clearSelection(render = true) {
  S.selected.clear();
  S.selectMode = false;
  if (render) {
    applyI18N();
    if (S.view === 'evaluacion') renderEvalCards(); else renderCards();
  }
}

function toggleSelectMode() {
  S.selectMode = !S.selectMode;
  if (!S.selectMode) S.selected.clear();
  applyI18N();
  if (S.view === 'evaluacion') renderEvalCards(); else renderCards();
}

function toggleCardSelection(itemId) {
  if (S.selected.has(itemId)) S.selected.delete(itemId);
  else S.selected.add(itemId);
  renderCards();
}

function selectVisibleCards() {
  pagedRows(filteredData()).forEach(({ id }) => S.selected.add(id));
  renderCards();
}

function pagedRows(rows) {
  if (!S.perPage) return rows;
  const start = S.page * S.perPage;
  return rows.slice(start, start + S.perPage);
}

function totalPages(total) {
  return S.perPage ? Math.max(1, Math.ceil(total / S.perPage)) : 1;
}

function renderCards() {
  if (S.mapMode) { refreshMap(); return; }
  const main = document.getElementById('main');
  const allRows = filteredData();
  const total = allRows.length;
  main.style.paddingBottom = S.selectMode ? '110px' : '';

  if (!total) {
    main.innerHTML = `<div class="state-box">
      <div class="icon">🔍</div>
      <h3>${i('noResults')}</h3><p>${i('noResHint')}</p>
    </div>`;
    return;
  }

  // Clamp page to valid range
  const pages = totalPages(total);
  if (S.page >= pages) S.page = pages - 1;

  const rows = pagedRows(allRows);

  main.innerHTML = '';

  // Results bar: count + per-page selector
  const bar = document.createElement('div');
  bar.className = 'results-bar';
  bar.innerHTML = `
    <p class="results-info">
      <strong>${total}</strong> ${i('techniques')}
      <span class="sort-wrap">
        <label for="sortSelect">${i('sort')}</label>
        <select id="sortSelect">
          <option value="random"    ${S.sortMode==='random'    ?'selected':''}>${i('sortRandom')}</option>
          <option value="alpha"     ${S.sortMode==='alpha'     ?'selected':''}>${i('sortAlpha')}</option>
          <option value="alphaDesc" ${S.sortMode==='alphaDesc' ?'selected':''}>${i('sortAlphaDesc')}</option>
        </select>
      </span>
      <span class="per-page-wrap">
        <label for="perPageSelect">${i('perPage')}</label>
        <select id="perPageSelect">
          <option value="10"  ${S.perPage===10  ?'selected':''}>10</option>
          <option value="25"  ${S.perPage===25  ?'selected':''}>25</option>
          <option value="50"  ${S.perPage===50  ?'selected':''}>50</option>
          <option value="0"   ${S.perPage===0   ?'selected':''}>${i('pageAll')}</option>
        </select>
      </span>
    </p>
  `;
  bar.querySelector('#sortSelect').onchange = e => {
    S.sortMode = isSupportedSortMode(e.target.value) ? e.target.value : 'random';
    S.page = 0;
    saveSortMode();
    renderCards();
  };
  bar.querySelector('#perPageSelect').onchange = e => {
    S.perPage = Number(e.target.value);
    S.page = 0;
    renderCards();
  };
  main.appendChild(bar);

  if (S.selectMode) {
    const selBar = document.createElement('div');
    selBar.className = 'selection-bar';
    selBar.innerHTML = `
      <div class="selection-bar-info">${S.selected.size} ${i('selectedCount')}</div>
      <div class="selection-bar-actions">
        <button class="btn" id="selectVisibleBtn">✓ ${i('selectVisible')}</button>
        <button class="btn" id="addSelectedFavsBtn">⭐ ${i('addSelectedFavs')}</button>
        <button class="btn btn-primary" id="shareSelectedBtn">🔗 ${i('shareSel')}</button>
        <button class="btn" id="cancelSelectionBtn">✕ ${i('selectOff')}</button>
      </div>
    `;
    main.appendChild(selBar);
    selBar.querySelector('#selectVisibleBtn').onclick = () => selectVisibleCards();
    selBar.querySelector('#addSelectedFavsBtn').onclick = e => openSelectedCatPicker(e.currentTarget);
    selBar.querySelector('#shareSelectedBtn').onclick = () => {
      if (!S.selected.size) return;
      copy(shareURL([...S.selected]));
    };
    selBar.querySelector('#cancelSelectionBtn').onclick = () => clearSelection();
  }

  const grid = document.createElement('div');
  grid.className = 'cards-grid';

  rows.forEach(({ item, id }) => {
    const fav = S.favorites.has(id);
    const shared = S.shared && S.shared.includes(id);
    const selected = S.selected.has(id);
    const card = document.createElement('div');
    card.className = 'card' + (fav ? ' is-fav' : '') + (shared ? ' is-shared' : '') + (selected ? ' is-selected' : '');
    const progIcon = item.programs.length
      ? `<span class="card-prog-icon" title="${item.programs.map(p => esc(p.label)).join(', ')}"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg></span>`
      : '';
    card.innerHTML = `
      <div class="card-top">
        <div class="card-name">${esc(item.name)}</div>
        ${progIcon}
        <span class="card-select ${selected ? 'active' : ''}" style="display:${S.selectMode ? 'inline-flex' : 'none'}">✓</span>
        <div class="cat-picker-wrap card-fav-wrap">
          <button class="fav-star ${fav ? 'active' : ''}" data-id="${esc(id)}">⭐</button>
        </div>
      </div>
      ${item.blocks.length ? `<div class="card-block">${item.blocks.map(blockBadgeHTML).join('')}</div>` : ''}
      <div class="card-fields">${item.fields.map(badgeHTML).join('')}</div>
      <div class="card-summary">${esc(item.summary)}</div>
    `;
    card.querySelector('.fav-star').onclick = e => { e.stopPropagation(); toggleFav(id, e.currentTarget); };
    card.onclick = () => { if (S.selectMode) toggleCardSelection(id); else openModal(id); };
    grid.appendChild(card);
  });

  main.appendChild(grid);

  // Pagination controls (only when perPage > 0 and more than one page)
  if (S.perPage && pages > 1) {
    main.appendChild(buildPagination(pages));
  }
}

function buildPagination(pages, currentPage, onNavigate) {
  if (currentPage === undefined) { currentPage = S.page; onNavigate = n => { S.page = n; renderCards(); window.scrollTo(0,0); }; }
  const wrap = document.createElement('div');
  wrap.className = 'pagination-bar';
  const p = currentPage;

  const btn = (label, title, disabled, active, onclick) => {
    const b = document.createElement('button');
    b.className = 'page-btn' + (active ? ' active' : '');
    b.innerHTML = label;
    b.title = title;
    b.disabled = disabled;
    if (!disabled) b.onclick = onclick;
    return b;
  };

  const ellipsis = () => {
    const s = document.createElement('span');
    s.className = 'page-ellipsis';
    s.textContent = '…';
    return s;
  };

  wrap.appendChild(btn('«', i('pageFirst'), p === 0, false, () => { onNavigate(0); window.scrollTo(0,0); }));
  wrap.appendChild(btn('‹', i('pagePrev'),  p === 0, false, () => { onNavigate(p - 1); window.scrollTo(0,0); }));

  // Page number buttons: always show first, last, current ±2, with ellipsis
  const show = new Set([0, pages - 1]);
  for (let n = Math.max(0, p - 2); n <= Math.min(pages - 1, p + 2); n++) show.add(n);
  const nums = [...show].sort((a, b) => a - b);

  let prev = -1;
  nums.forEach(n => {
    if (prev !== -1 && n - prev > 1) wrap.appendChild(ellipsis());
    wrap.appendChild(btn(n + 1, '', false, n === p, () => { onNavigate(n); window.scrollTo(0,0); }));
    prev = n;
  });

  wrap.appendChild(btn('›', i('pageNext'), p === pages - 1, false, () => { onNavigate(p + 1); window.scrollTo(0,0); }));
  wrap.appendChild(btn('»', i('pageLast'), p === pages - 1, false, () => { onNavigate(pages - 1); window.scrollTo(0,0); }));

  return wrap;
}

// ─── RENDER: MODAL ───────────────────────────────────────────────────────────

function openModal(itemId) {
  const item = itemById(itemId);
  if (!item) return;
  S.modal = item.id;

  // Reset order and restore relBox to its original DOM position (before modalEval)
  document.getElementById('modalBody').style.order    = '';
  document.getElementById('modalRelated').style.order = '';
  const existingExtra = document.getElementById('modalEvalExtra');
  if (existingExtra) existingExtra.remove();
  const existingInner2 = document.getElementById('modalEvalInner');
  if (existingInner2) existingInner2.remove();
  const evalEl = document.getElementById('modalEval');
  if (evalEl) evalEl.before(document.getElementById('modalRelated'));

  document.getElementById('modalBackBtn').style.display = S.modalHistory.length ? '' : 'none';
  document.getElementById('modalTitle').textContent = item.name;
  document.getElementById('modalId').textContent = 'ID: ' + item.id;
  document.getElementById('modalBlock').innerHTML = item.blocks.map(blockBadgeHTML).join('');
  document.getElementById('modalBlock').style.display = item.blocks.length ? '' : 'none';
  document.getElementById('modalFields').innerHTML = item.fields.map(badgeHTML).join('');
  document.getElementById('modalTags').innerHTML = item.summary ? esc(item.summary) : '';
  document.getElementById('modalTags').style.display = item.summary ? '' : 'none';
  document.getElementById('modalBody').innerHTML = formatDesc(item.desc);

  // Source
  const sourceEl = document.getElementById('modalSource');
  if (item.source) {
    sourceEl.style.display = '';
    sourceEl.textContent = item.source;
  } else {
    sourceEl.style.display = 'none';
    sourceEl.textContent = '';
  }

  // Example block
  const exampleEl = document.getElementById('modalExample');
  if (item.example) {
    exampleEl.style.display = '';
    exampleEl.innerHTML = `<div class="modal-example-label">${esc(i('example'))}</div>` + formatDesc(item.example);
  } else {
    exampleEl.style.display = 'none';
    exampleEl.innerHTML = '';
  }

  // Related techniques (bidirectional)
  const relBox = document.getElementById('modalRelated');
  const relatedItems = relatedBidirectional(item);
  if (relatedItems.length) {
    relBox.style.display = '';
    relBox.innerHTML = `<span class="modal-related-label">${esc(i('related'))}</span>` +
      collapsibleBtns(relatedItems, COLLAPSE_LIMIT,
        rel => `<button class="related-btn" type="button" data-related-id="${esc(rel.id)}">${esc(rel.name)}</button>`
      );
    initCollapsible(relBox);
    relBox.querySelectorAll('[data-related-id]').forEach(btn =>
      btn.addEventListener('click', ev => { ev.stopPropagation(); S.modalHistory.push(item.id); openModal(btn.dataset.relatedId); })
    );
  } else {
    relBox.style.display = 'none';
    relBox.innerHTML = '';
  }

  // Programs
  const progWrap = document.getElementById('modalPrograms');
  if (item.programs.length) {
    progWrap.style.display = 'flex';
    progWrap.innerHTML = `<span class="modal-programs-label">${i('programs')}</span>` +
      item.programs.map(p => `
        <a class="program-btn" href="${esc(p.url)}" target="_blank" rel="noopener noreferrer">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
            <rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>
          </svg>
          ${esc(p.label)}
        </a>`).join('');
  } else {
    progWrap.style.display = 'none';
  }

  // "Cómo evaluar" section — rendered then moved to end of scroll
  renderEvalSection(item);
  const modalScroll = document.querySelector('.modal-scroll');
  const evalEl2 = document.getElementById('modalEval');
  if (modalScroll && evalEl2) modalScroll.appendChild(evalEl2);

  // Restore technique-specific action buttons
  showModalActionButtons();
  const evalMapBtn = document.getElementById('modalEvalMapBtn');
  if (evalMapBtn) {
    evalMapBtn.style.display = '';
    document.getElementById('modalEvalMapBtnLabel').textContent = i('viewMapBtn');
    evalMapBtn.title = i('viewModeMap');
    evalMapBtn.onclick = () => {
      const id = S.modal;
      closeModal();
      if (!S.mapMode) toggleMapView();
      requestAnimationFrame(() => {
        const ni = MAP.nodes.findIndex(n => n.id === id);
        if (ni >= 0) mapSelectNode(ni);
      });
    };
  }
  const bipartiteBtn = document.getElementById('modalBipartiteBtn');
  if (bipartiteBtn) {
    bipartiteBtn.style.display = '';
    bipartiteBtn.title = i('bipartiteTip');
    bipartiteBtn.onclick = () => openBipartiteMap(item.id, 'tecnica');
  }
  const fav = S.favorites.has(item.id);
  document.getElementById('modalFavBtn').classList.toggle('fav-active', fav);

  // Reset handlers to técnica versions (may have been overwritten by openEvalModal)
  document.getElementById('modalFavBtn').onclick  = e => { if (S.modal !== null) toggleFav(S.modal, e.currentTarget); };
  document.getElementById('modalCopyBtn').onclick  = copyModal;
  document.getElementById('modalMarkdownBtn').onclick = downloadTechniqueMarkdown;
  document.getElementById('modalPrintBtn').onclick = printModal;
  document.getElementById('modalShareBtn').onclick = () => { if (S.modal !== null) copy(shareURL([S.modal])); };

  S.evalModal = null;
  openSharedModal();
  updateURL();
}

function printModal() {
  const item = S.modal ? itemById(S.modal) : null;
  if (!item) return;
  const el = ensurePrintArea();
  const fields = item.fields.length ? item.fields.join(', ') : '';
  const block  = item.blocks.join(', ');
  const meta   = [block, fields].filter(Boolean).join(' · ');
  el.innerHTML = `
    <h1>${esc(item.name)}</h1>
    ${meta ? `<p class="print-meta">${esc(meta)}</p>` : ''}
    ${item.summary ? `<p class="print-summary">${esc(item.summary)}</p>` : ''}
    <div class="print-body">${formatDesc(item.desc)}</div>
    ${item.source ? `<p class="print-source">${esc(item.source)}</p>` : ''}
    ${item.example ? `<div class="print-example-label">${esc(i('example'))}</div><div class="print-body print-example">${formatDesc(item.example)}</div>` : ''}
    <p class="print-footer">Metac · ${techniqueURL(item.id)}</p>
  `;
  window.print();
}

function buildTechniqueMarkdown(item) {
  const lines = [`# ${item.name}`, '', `ID: ${item.id}`];
  if (item.blocks.length) lines.push(`Bloques: ${item.blocks.join(', ')}`);
  if (item.fields.length) lines.push(`Ámbitos: ${item.fields.join(', ')}`);
  if (item.summary) lines.push('', item.summary);
  if (item.desc) lines.push('', item.desc.trim());
  if (item.example) lines.push('', `## ${i('example')}`, '', item.example.trim());
  if (item.source)  lines.push('', item.source.trim());

  const relatedItems = relatedBidirectional(item);
  if (relatedItems.length) {
    lines.push('', `## ${i('related')}`);
    relatedItems.forEach(rel => lines.push(`- ${rel.name} (\`${rel.id}\`)`));
  }

  if (item.programs.length) {
    lines.push('', `## ${i('programs')}`);
    item.programs.forEach(program => lines.push(`- [${program.label}](${program.url})`));
  }

  const evalGroups = EVAL_CATS.map(cat => ({
    ...cat,
    items: (item.eval_ids || [])
      .filter(id => id.startsWith(cat.prefix + '_'))
      .map(id => evalEntityById(id))
      .filter(Boolean),
  })).filter(group => group.items.length);

  if (evalGroups.length) {
    lines.push('', `## ${i('evalSection')}`);
    evalGroups.forEach(group => {
      lines.push('', `### ${i(group.i18n)}`);
      group.items.forEach(entity => lines.push(`- ${entity.name} (\`${entity.id}\`)`));
    });
  }

  lines.push('', `URL: ${techniqueURL(item.id)}`);
  return lines.join('\n');
}

function downloadTechniqueMarkdown() {
  const item = S.modal ? itemById(S.modal) : null;
  if (!item) return;
  downloadTextFile(`${slugifyFilename(item.name)}.md`, buildTechniqueMarkdown(item));
  toast(i('markdownDownloaded'));
}

function copyModal() {
  const item = S.modal ? itemById(S.modal) : null;
  if (!item) return;

  const meta = [item.blocks.join(', '), item.fields.join(', ')].filter(Boolean).join(' · ');
  const url = techniqueURL(item.id);
  const html = [
    `<h2>${esc(item.name)}</h2>`,
    meta ? `<p><em>${esc(meta)}</em></p>` : '',
    item.summary ? `<blockquote><p>${esc(item.summary)}</p></blockquote>` : '',
    item.desc ? formatDesc(item.desc) : '',
    item.example ? `<h3>${esc(i('example'))}</h3>${formatDesc(item.example)}` : '',
    item.source  ? `<p><em>${esc(item.source)}</em></p>` : '',
    `<p><a href="${esc(url)}">${esc(url)}</a></p>`,
  ].filter(Boolean).join('\n');

  const plain = [
    item.name,
    meta,
    item.summary ? '\n' + item.summary : '',
    item.desc ? '\n' + item.desc.replace(/## /g, '\n').trim() : '',
    item.example ? `\n${i('example')}\n` + item.example.replace(/## /g, '\n').trim() : '',
    item.source  ? '\n' + item.source.trim() : '',
    '\n' + url,
  ].filter(Boolean).join('\n');

  const btn = document.getElementById('modalCopyBtn');
  copyRichContent({ plain, html, btn });
}

function closeModal() {
  closeSharedModal();
  S.modal = null;
  S.evalModal = null;
  S.modalHistory = [];
  updateURL();
}

// ─── COLLAPSIBLE LIST HELPERS ────────────────────────────────────────────────

const COLLAPSE_LIMIT = 5;

function collapsibleBtns(items, limit, renderFn) {
  const visible = items.slice(0, limit);
  const extra   = items.slice(limit);
  let html = visible.map((item, i) =>
    renderFn(item) + (i < visible.length - 1 || extra.length > 0 ? '<span class="related-sep">,</span>' : '')
  ).join('');
  if (extra.length) {
    html += `<span class="collapsible-extra" style="display:none">${
      extra.map((item, i) => renderFn(item) + (i < extra.length - 1 ? '<span class="related-sep">,</span>' : '')).join('')
    }</span><button class="related-btn collapsible-more" type="button" style="font-size:.75rem;padding:3px 9px;border-style:dashed;opacity:.8">+${extra.length}</button>`;
  }
  return html;
}

function initCollapsible(container) {
  container.querySelectorAll('.collapsible-more').forEach(btn => {
    btn.addEventListener('click', ev => {
      ev.stopPropagation();
      const extra = btn.previousElementSibling;
      if (extra && extra.classList.contains('collapsible-extra')) extra.style.display = '';
      btn.remove();
    });
  });
}

// ─── RENDER: EVAL SECTION (inside technique modal) ───────────────────────────

function renderEvalSection(item) {
  const box = document.getElementById('modalEval');
  if (!box) return;
  const evalIds = item.eval_ids || [];
  if (!evalIds.length) {
    box.style.display = 'none';
    return;
  }
  // Eval data may not be loaded yet (e.g. modal opened via direct/shared URL
  // before loadEvalLang resolved). Hide for now and re-render once it arrives.
  if (!EV.byId[S.lang]) {
    box.style.display = 'none';
    loadEvalLang(S.lang)
      .then(() => { if (S.modal === item.id) renderEvalSection(item); })
      .catch(() => {});
    return;
  }
  const groups = EVAL_CATS.map(cat => ({
    ...cat,
    items: evalIds
      .filter(id => id.startsWith(cat.prefix + '_'))
      .map(id => evalEntityById(id))
      .filter(Boolean),
  })).filter(g => g.items.length);

  if (!groups.length) { box.style.display = 'none'; return; }

  box.style.display = 'block';
  box.innerHTML = `
    <div class="modal-eval-head">${esc(i('evalSection'))}</div>
    ${groups.map(g => `
      <div class="eval-group">
        <span class="eval-group-label">${esc(i(g.i18n))}:</span>${collapsibleBtns(g.items, COLLAPSE_LIMIT,
          e => `<button class="eval-chip" type="button" data-prefix="${g.prefix}" data-eval-id="${esc(e.id)}">${esc(e.name)}</button>`
        )}
      </div>
    `).join('')}
  `;
  initCollapsible(box);
  box.querySelectorAll('[data-eval-id]').forEach(btn => {
    btn.addEventListener('click', ev => {
      ev.stopPropagation();
      S.modalHistory.push({ type: 'tecnica', id: S.modal });
      openEvalModal(btn.dataset.evalId);
    });
  });
}
