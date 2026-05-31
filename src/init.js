// ─── INIT ────────────────────────────────────────────────────────────────────

function parseViewParam(vp) {
  if (!vp) return null;
  if (vp === 'tecnicas') return { view: 'tecnicas', mapMode: false };
  if (vp === 'tecnicas-map') return { view: 'tecnicas', mapMode: true };
  if (vp.startsWith('eval-')) {
    const rest = vp.slice(5);
    const isMap = rest.endsWith('-map');
    const cat = isMap ? rest.slice(0, -4) : rest;
    if (!EVAL_CATS.find(c => c.id === cat)) return null;
    return { view: 'evaluacion', evalCat: cat, mapMode: isMap };
  }
  return null;
}

async function init() {
  loadFavs();
  loadCats();
  updateFavBadge();
  loadLangPref();
  loadViewPref();

  // Read URL params (override saved preference)
  const p = new URLSearchParams(location.search);
  const urlLang = p.get('lang');
  if (p.has('lang')) S.lang = resolveLang(urlLang);
  const t = p.get('t');
  if (t) S.shared = uniqueIds(t.split(','));
  const tname = p.get('tname');
  if (tname) S.sharedName = tname;
  const viewParam  = p.get('view');
  const blockParam = p.get('block');
  const fieldParam = p.get('field');
  const modalParam = p.get('modal');
  const nodeParam  = p.get('node');
  const itemParam  = p.get('item');

  applyI18N();
  updateSharedBanner();

  // Load data
  try { await loadLang(S.lang); }
  catch {
    document.getElementById('main').innerHTML = `<div class="state-box"><h3>${i('error')}</h3></div>`;
    return;
  }
  // Detect if shared IDs belong to eval entities (prefixes: TEC, INS, HER, DIM)
  const evalPrefixSet = new Set(EVAL_CATS.map(c => c.prefix));
  const sharedHasEval = S.shared && S.shared.some(id => evalPrefixSet.has((id.split('_')[0] || '').toUpperCase()));

  if (sharedHasEval) {
    // Load eval data synchronously so shared IDs resolve correctly
    try { await loadEvalLang(S.lang); } catch {}
    S.shared = S.shared.filter(id => !!evalEntityById(id));
    S.view = 'evaluacion';
    S.evalMapMode = false;
  } else {
    if (S.shared) S.shared = refsToItemIds(S.shared);
  }

  syncActiveFilters();
  updateFavBadge();
  updateSharedBanner();

  renderViewToggle();

  const hasSharedUrl = !!S.shared;

  if (sharedHasEval) {
    // Shared eval URL — show eval view directly
    document.getElementById('blockNavBar').style.display = 'none';
    document.getElementById('fieldNavBar').style.display = 'none';
    document.getElementById('evalNavBar').style.display  = '';
    document.getElementById('main').style.display        = '';
    document.getElementById('evalSplitView').style.display = 'none';
    const selBtn = document.getElementById('selectBtn');
    const favBtn2 = document.getElementById('favBtn');
    if (selBtn) selBtn.style.display = '';
    if (favBtn2) favBtn2.style.display = '';
    renderEvalTabs();
    renderEvalCards();
    if (S.shared && S.shared.length === 1) openEvalModal(S.shared[0]);
  } else if (hasSharedUrl) {
    // Shared técnicas URL — show técnicas view directly
    if (S.shared) S.shared = refsToItemIds(S.shared);
    syncActiveFilters(); updateSharedBanner();
    renderBlockTabs(); renderTabs(); renderCards();
    loadEvalLang(S.lang).catch(() => {});
    if (S.shared && S.shared.length === 1) openModal(S.shared[0]);
  } else if (viewParam && parseViewParam(viewParam)) {
    // Deep-link URL → navigate to specified view
    const vp = parseViewParam(viewParam);
    if (vp.view === 'evaluacion') {
      S.evalCat = vp.evalCat;
      try { await loadEvalLang(S.lang); } catch {}
      S.evalMapMode = vp.mapMode;
      if (itemParam && evalEntityById(itemParam)) S.evalSelected = itemParam;
      switchView('evaluacion');
      if (itemParam && evalEntityById(itemParam)) showEvalDetail(itemParam);
      else if (modalParam) openEvalModal(modalParam);
    } else {
      if (blockParam) S.block = blockParam;
      if (fieldParam) S.field = fieldParam;
      renderBlockTabs(); renderTabs();
      S.mapMode = false;
      renderCards();
      if (vp.mapMode) {
        toggleMapView();
        if (nodeParam) {
          const nIdx = MAP.nodes.findIndex(n => n.id === nodeParam);
          if (nIdx >= 0) mapSelectNode(nIdx);
        }
      } else if (modalParam) {
        openModal(modalParam);
      }
      loadEvalLang(S.lang).catch(() => {});
    }
  } else if (S._hasSessionView && S.view === 'evaluacion') {
    // Restore session eval view
    try { await loadEvalLang(S.lang); } catch {}
    switchView('evaluacion');
  } else if (S._hasSessionView) {
    // Restore session técnicas view
    renderBlockTabs(); renderTabs();
    const savedMapMode = S.mapMode;
    S.mapMode = false;
    renderCards();
    if (savedMapMode) toggleMapView();
    loadEvalLang(S.lang).catch(() => {});
  } else {
    // No session, no shared URL → show home page
    showHome();
    // Pre-load técnicas data in background so home is ready
    loadEvalLang(S.lang).catch(() => {});
  }

  // ── Event listeners ──────────────────────────────────────────────────────

  // Logo → home
  document.querySelector('.logo').addEventListener('click', () => {
    if (S.mapMode) toggleMapView();
    if (S.selectMode) { S.selectMode = false; S.selected.clear(); }
    showHome();
  });

  // Home: técnicas entry links
  document.getElementById('homeEnterTecCards').onclick = () => enterView('tecnicas', false);
  document.getElementById('homeEnterTecMap').onclick   = () => enterView('tecnicas', true);
  // Home: eval category chips — cards and map icon buttons
  document.querySelectorAll('#homeEvalCats .home-eval-cat-cards').forEach(btn => {
    btn.onclick = () => enterView('evaluacion', false, btn.dataset.evalCat);
  });
  document.querySelectorAll('#homeEvalCats .home-eval-cat-map').forEach(btn => {
    btn.onclick = () => enterView('evaluacion', true, btn.dataset.evalCat);
  });

  // View toggle
  document.querySelectorAll('.view-btn[data-view]').forEach(btn => {
    btn.onclick = () => {
      if (S.view === btn.dataset.view) return;
      S.search = '';
      document.getElementById('searchInput').value = '';
      updateSearchUI();
      switchView(btn.dataset.view);
      // Load eval data on first switch to evaluacion view
      if (btn.dataset.view === 'evaluacion') loadEvalLang(S.lang).then(renderEvalList).catch(() => {});
    };
  });

  document.getElementById('searchInput').addEventListener('input', e => {
    S.search = e.target.value;
    S.page = 0;
    updateSearchUI();
    if (S.view === 'evaluacion') renderEvalList();
    else renderCards();
  });
  document.getElementById('searchClearBtn').onclick = () => {
    const input = document.getElementById('searchInput');
    input.value = '';
    S.search = '';
    S.page = 0;
    updateSearchUI();
    if (S.view === 'evaluacion') renderEvalList();
    else renderCards();
    input.focus();
  };

  ['themeBtn', 'homethemeBtn'].forEach(id => {
    const btn = document.getElementById(id);
    if (btn) btn.addEventListener('click', () => {
      const cur = document.documentElement.getAttribute('data-theme-pref') || 'auto';
      const next = THEMES[(THEMES.indexOf(cur) + 1) % THEMES.length];
      localStorage.setItem(THEME_KEY, next);
      applyTheme(next);
    });
  });

  document.querySelectorAll('.lang-btn').forEach(b => b.onclick = () => switchLang(b.dataset.lang));

  initEvalSplitEvents();
  initEvalMapEvents();
  initUnifiedMapEvents();
  // mapViewBtn removed — view mode toggle is now in results bar
  document.getElementById('mapZoomIn').onclick    = () => { MAP.camera.scale = Math.min(6, MAP.camera.scale * 1.25); };
  document.getElementById('mapZoomOut').onclick   = () => { MAP.camera.scale = Math.max(0.12, MAP.camera.scale / 1.25); };
  document.getElementById('mapFitBtn').onclick    = mapFitAll;
  document.getElementById('mapResetBtn').onclick  = () => { if (MAP.viewMode === 'blocks') initMapBlocks(); else initMapData(); };
  document.getElementById('viewModeCardsLegend').onclick = () => { if (S.mapMode) toggleMapView(); };
  document.getElementById('viewModeMapLegend').onclick   = () => {};
  // evalViewModeCards/Map are wired in renderEvalTabs each time tabs are rendered
  const gapLabel = document.getElementById('mapGapLabel');
  const gapMinus = document.getElementById('mapGapMinus');
  const gapPlus  = document.getElementById('mapGapPlus');
  const GAP_MIN = 0, GAP_MAX = 100, GAP_STEP = 4;

  function updateGapUI() {
    if (gapLabel) gapLabel.textContent = MAP.gap;
    if (gapMinus) gapMinus.disabled = MAP.gap <= GAP_MIN;
    if (gapPlus)  gapPlus.disabled  = MAP.gap >= GAP_MAX;
  }

  if (gapMinus) gapMinus.onclick = () => { MAP.gap = Math.max(GAP_MIN, MAP.gap - GAP_STEP); updateGapUI(); MAP.alpha = Math.max(MAP.alpha, 0.6); };
  if (gapPlus)  gapPlus.onclick  = () => { MAP.gap = Math.min(GAP_MAX, MAP.gap + GAP_STEP); updateGapUI(); MAP.alpha = Math.max(MAP.alpha, 0.6); };
  updateGapUI();
  document.getElementById('mapPanelClose').onclick = () => { mapSelectNode(-1); };
  document.getElementById('mapNavBack').onclick = e => { e.stopPropagation(); mapNavBack(); };
  document.getElementById('mapNavFwd').onclick  = e => { e.stopPropagation(); mapNavFwd(); };
  document.getElementById('mapPanelToggle').onclick = e => {
    e.stopPropagation();
    mapSetPanelCollapsed(!MAP.panelCollapsed);
  };
  mapSetupPanelDrag();
  mapSetupLegendDrag();
  // Allow touch-scroll inside panel without canvas intercepting events
  const panelScroll = document.querySelector('.map-panel-scroll');
  if (panelScroll) {
    panelScroll.addEventListener('touchstart', e => e.stopPropagation(), { passive: true });
    panelScroll.addEventListener('touchmove',  e => e.stopPropagation(), { passive: true });
  }
  document.getElementById('mapDepthMinus').addEventListener('click', e => { e.stopPropagation(); mapSetDepth(MAP.depth - 1); });
  document.getElementById('mapDepthPlus').addEventListener('click',  e => { e.stopPropagation(); mapSetDepth(MAP.depth + 1); });

  document.getElementById('mapLegendBtn').addEventListener('click', e => {
    e.stopPropagation();
    S.mapLegendVisible = !S.mapLegendVisible;
    localStorage.setItem('metac_map_legend_v1', S.mapLegendVisible ? 'shown' : 'hidden');
    document.getElementById('mapLegendBtn').classList.toggle('active', S.mapLegendVisible);
    updateMapLegend();
  });

  document.getElementById('mapColorModeBtn').addEventListener('click', e => {
    e.stopPropagation();
    const dd = document.getElementById('mapColorDropdown');
    if (dd) dd.style.display = dd.style.display === 'none' ? '' : 'none';
  });
  document.addEventListener('click', () => {
    const dd = document.getElementById('mapColorDropdown');
    if (dd) dd.style.display = 'none';
  });
  mapSetupEvents();

  document.getElementById('selectBtn').onclick = toggleSelectMode;
  document.getElementById('favBtn').onclick = openPanel;
  document.getElementById('panelClose').onclick = closePanel;
  document.getElementById('panelOverlay').onclick = e => { if (e.target === e.currentTarget) closePanel(); };

  document.getElementById('modalCloseBtn').onclick    = closeModal;
  document.getElementById('modalCopyBtn').onclick     = copyModal;
  document.getElementById('modalPrintBtn').onclick    = printModal;
  document.getElementById('modalCloseBtnFooter').onclick = closeModal;
  document.getElementById('modalOverlay').onclick = e => { if (e.target === e.currentTarget) closeModal(); };

  document.getElementById('modalBackBtn').onclick = () => {
    const prev = S.modalHistory.pop();
    if (!prev) return;
    if (typeof prev === 'string') { openModal(prev); return; }
    if (prev.type === 'eval') {
      if (S.view !== 'evaluacion') switchView('evaluacion');
      openEvalModal(prev.id);
    } else openModal(prev.id);
  };
  document.getElementById('modalFavBtn').onclick = e => { if (S.modal !== null) toggleFav(S.modal, e.currentTarget); };
  document.getElementById('modalShareBtn').onclick = () => { if (S.modal !== null) copy(shareURL([S.modal])); };

  document.getElementById('clearFavsBtn').onclick = () => {
    if (!confirm(i('clearConfirm'))) return;
    S.favorites.clear(); S.categories = []; saveFavs(); saveCats(); updateFavBadge(); renderCards(); renderPanel();
  };

  document.getElementById('exitSharedBtn').onclick = () => {
    clearSelection(false);
    S.shared = null;
    S.page = 0;
    const u = new URL(location.href);
    u.searchParams.delete('t');
    u.searchParams.delete('tname');
    applyViewParam(u);
    history.replaceState(history.state || {}, '', u);
    updateSharedBanner();
    applyI18N();
    if (S.view === 'evaluacion') renderEvalCards(); else renderCards();
  };

  document.addEventListener('keydown', e => {
    if (e.key !== 'Escape') return;
    if (document.getElementById('modalOverlay').classList.contains('open')) closeModal();
    else if (document.getElementById('panelOverlay').classList.contains('open')) closePanel();
    else if (S.selectMode) clearSelection();
    else if (S.mapMode) toggleMapView();
  });

  window.addEventListener('popstate', async ev => {
    const st = ev.state;
    S._popping = true;
    try {
      const homeVisible = document.getElementById('homeView').classList.contains('visible');
      if (!st || st.screen === 'home') {
        if (S.mapMode) toggleMapView();
        if (S.evalMapMode) toggleEvalMapMode();
        if (!homeVisible) showHome();
      } else if (st.screen === 'tecnicas') {
        if (homeVisible) hideHome();
        if (S.evalMapMode) toggleEvalMapMode();
        if (S.view !== 'tecnicas') switchView('tecnicas');
        if (!!st.map !== !!S.mapMode) toggleMapView();
      } else if (st.screen === 'evaluacion') {
        if (homeVisible) hideHome();
        if (S.mapMode) toggleMapView();
        if (!EV.data[S.lang]) { try { await loadEvalLang(S.lang); } catch {} }
        if (S.view !== 'evaluacion') switchView('evaluacion');
        if (st.evalCat && st.evalCat !== S.evalCat) {
          S.evalCat = st.evalCat;
          S.evalSelected = null;
          renderEvalTabs();
          if (S.evalMapMode) renderEvalList(); else renderEvalCards();
        }
        if (!!st.map !== !!S.evalMapMode) toggleEvalMapMode();
      }
    } finally {
      S._popping = false;
    }
  });

  // Seed initial history state so popstate has something to return to
  const uSeed = new URL(location.href);
  applyViewParam(uSeed);
  history.replaceState(getNavState(), '', uSeed);
}

init();


