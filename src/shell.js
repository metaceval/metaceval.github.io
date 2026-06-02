// ─── SHARED BANNER ───────────────────────────────────────────────────────────

function updateSharedBanner() {
  const el = document.getElementById('sharedBanner');
  if (!S.shared) { el.classList.remove('visible'); return; }
  el.classList.add('visible');
  let txt;
  if (S.sharedName) {
    txt = `${i('sharedCat')} ${S.sharedName} (${S.shared.length})`;
  } else {
    txt = S.shared.length === 1 ? i('sharedOne') : `${i('sharedMany')} (${S.shared.length})`;
  }
  document.getElementById('sharedBannerText').textContent = txt;
  document.getElementById('exitSharedLabel').textContent = i('exitShared');
}

// ─── LANGUAGE SWITCH ─────────────────────────────────────────────────────────

async function switchLang(lang) {
  lang = resolveLang(lang);
  if (lang === S.lang && S.data[lang]) return;
  clearSelection(false);
  S.lang = lang;
  saveLang();

  const u = new URL(location.href);
  u.searchParams.set('lang', lang);
  applyViewParam(u);
  history.replaceState(history.state || {}, '', u);

  applyI18N();
  updateSharedBanner();

  if (!S.data[lang]) {
    document.getElementById('main').innerHTML = `<div class="state-box">
      <div class="spinner"></div><p>${i('loading')}</p>
    </div>`;
    try { await loadLang(lang); }
    catch { document.getElementById('main').innerHTML = `<div class="state-box"><h3>${i('error')}</h3></div>`; return; }
  }

  if (S.shared) S.shared = refsToItemIds(S.shared, lang);
  normalizeStoredRefs(lang);
  syncActiveFilters();
  updateFavBadge();
  updateSharedBanner();
  S.page = 0;
  renderViewToggle();
  if (S.view === 'evaluacion') {
    loadEvalLang(lang).then(() => { renderEvalTabs(); if (S.evalMapMode) renderEvalList(); else renderEvalCards(); }).catch(() => {});
  } else {
    renderBlockTabs();
    renderTabs();
    renderCards();
  }
  if (S.modal !== null) openModal(S.modal);
  else if (S.evalModal !== null) openEvalModal(S.evalModal);

  loadEvalLang(lang).catch(() => {});
}

// ─── THEME ───────────────────────────────────────────────────────────────────

const THEME_KEY = 'metac_theme';
const THEMES    = ['auto', 'dark', 'light'];

const THEME_ICONS = {
  auto:  `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/></svg>`,
  dark:  `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>`,
  light: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>`,
};
const THEME_LABEL_KEYS = { auto: 'themeAuto', dark: 'themeDark', light: 'themeLight' };

function applyTheme(pref) {
  const isDark = pref === 'dark' || (pref === 'auto' && matchMedia('(prefers-color-scheme: dark)').matches);
  document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
  document.documentElement.setAttribute('data-theme-pref', pref);
  const label = i(THEME_LABEL_KEYS[pref]);
  ['themeBtn', 'homethemeBtn'].forEach(id => {
    const btn = document.getElementById(id);
    if (btn) {
      btn.innerHTML = THEME_ICONS[pref];
      btn.title = label;
      btn.setAttribute('aria-label', label);
    }
  });
}

applyTheme(localStorage.getItem(THEME_KEY) || 'auto');

matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
  if ((document.documentElement.getAttribute('data-theme-pref') || 'auto') === 'auto') applyTheme('auto');
});
