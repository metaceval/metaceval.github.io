// ─── FAVORITES ───────────────────────────────────────────────────────────────

function toggleFav(itemId, anchorEl = null) {
  itemId = normalizeId(itemId);
  if (!itemById(itemId) && !evalEntityById(itemId)) return;
  const adding = !S.favorites.has(itemId);
  const fromCardStar = anchorEl && anchorEl.classList.contains('fav-star');
  const fromModalFav = anchorEl && anchorEl.id === 'modalFavBtn';

  if (!adding) {
    S.favorites.delete(itemId);
    S.categories.forEach(c => { c.itemIds = c.itemIds.filter(id => id !== itemId); });
    saveCats();
    toast(i('favRemoved'));
  } else {
    S.favorites.add(itemId);
    toast(i('favAdded'));
  }
  saveFavs();
  updateFavBadge();
  if (S.view === 'evaluacion') renderEvalCards(); else renderCards();
  if (S.modal !== null)
    document.getElementById('modalFavBtn').classList.toggle('fav-active', S.favorites.has(S.modal));

  if (adding && anchorEl) {
    let pickerAnchor = anchorEl;
    if (fromCardStar) {
      pickerAnchor = [...document.querySelectorAll('.fav-star')].find(btn => btn.dataset.id === itemId) || anchorEl;
    } else if (fromModalFav) {
      pickerAnchor = document.getElementById('modalFavBtn') || anchorEl;
    }
    openCatPicker(itemId, pickerAnchor);
  }
}

function updateFavBadge() {
  const n = S.favorites.size;
  const el = document.getElementById('favBadge');
  el.textContent = n;
  el.style.display = n ? 'flex' : 'none';
}

// ─── FAVORITES PANEL ─────────────────────────────────────────────────────────

function openPanel() { renderPanel(); document.getElementById('panelOverlay').classList.add('open'); document.body.style.overflow = 'hidden'; }
function closePanel() { document.getElementById('panelOverlay').classList.remove('open'); document.body.style.overflow = ''; }

let activePicker = null;

function catUID() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }

function createCategory(name) {
  const cat = { id: catUID(), name, itemIds: [] };
  S.categories.push(cat);
  saveCats();
  return cat;
}

function deleteCategory(id) {
  S.categories = S.categories.filter(c => c.id !== id);
  saveCats();
}

function addItemsToFavorites(itemIds) {
  const validIds = validItemIds(itemIds);
  let added = 0;
  validIds.forEach(id => {
    if (!S.favorites.has(id)) {
      S.favorites.add(id);
      added++;
    }
  });

  if (added) {
    saveFavs();
    updateFavBadge();
  }
  return added;
}

function removeFromCategory(itemId, catId) {
  itemId = normalizeId(itemId);
  const cat = S.categories.find(c => c.id === catId);
  if (cat) { cat.itemIds = cat.itemIds.filter(id => id !== itemId); saveCats(); }
}

function assignToCategory(itemId, catId = null) {
  itemId = normalizeId(itemId);
  S.categories.forEach(cat => {
    cat.itemIds = cat.itemIds.filter(id => id !== itemId);
  });
  if (catId) {
    const target = S.categories.find(cat => cat.id === catId);
    if (target && itemById(itemId) && !target.itemIds.includes(itemId)) target.itemIds.push(itemId);
  }
  saveCats();
}

function assignItemsToCategory(itemIds, catId = null) {
  const validIds = validItemIds(itemIds);
  if (!validIds.length) return 0;

  addItemsToFavorites(validIds);
  const idSet = new Set(validIds);
  S.categories.forEach(cat => {
    cat.itemIds = cat.itemIds.filter(id => !idSet.has(id));
  });
  if (catId) {
    const target = S.categories.find(cat => cat.id === catId);
    if (target) {
      validIds.forEach(id => {
        if (!target.itemIds.includes(id)) target.itemIds.push(id);
      });
    }
  }
  saveCats();
  return validIds.length;
}

function promptNewCategory(addItemIds = null) {
  const name = prompt(i('catPrompt'));
  if (!name || !name.trim()) return null;
  const cat = createCategory(name.trim());
  if (addItemIds !== null) {
    const ids = Array.isArray(addItemIds) ? addItemIds : [addItemIds];
    assignItemsToCategory(ids, cat.id);
  }
  renderPanel();
  return cat;
}

function openSelectedCatPicker(anchorEl) {
  const itemIds = validItemIds([...S.selected]);
  if (!itemIds.length) return;
  openCatPickerForItems(itemIds, anchorEl);
}

function openCatPickerForItems(itemIds, anchorEl) {
  const validIds = validItemIds(itemIds);
  if (!validIds.length) return;
  if (activePicker) { activePicker.remove(); activePicker = null; }

  const picker = document.createElement('div');
  picker.className = 'cat-picker';
  picker.onclick = e => e.stopPropagation();
  activePicker = picker;

  const title = document.createElement('div');
  title.className = 'cat-picker-title';
  title.textContent = i('addToCat');
  picker.appendChild(title);

  const choose = catId => {
    assignItemsToCategory(validIds, catId);
    picker.remove();
    activePicker = null;
    toast(i('selectedFavsAdded'));
    renderPanel();
    renderCards();
  };

  const noneRow = document.createElement('div');
  noneRow.className = 'cat-picker-row';
  const noneRadio = document.createElement('input');
  noneRadio.type = 'radio';
  noneRadio.name = 'cat-selected';
  noneRadio.onclick = e => e.stopPropagation();
  const noneLbl = document.createElement('span');
  noneLbl.textContent = i('uncategorized');
  noneRow.onclick = e => { e.stopPropagation(); choose(null); };
  noneRow.appendChild(noneRadio);
  noneRow.appendChild(noneLbl);
  picker.appendChild(noneRow);

  if (!S.categories.length) {
    const none = document.createElement('div');
    none.className = 'cat-picker-row';
    none.style.color = 'var(--text-muted)';
    none.textContent = i('noCatsYet');
    picker.appendChild(none);
  } else {
    S.categories.forEach(cat => {
      const row = document.createElement('div');
      row.className = 'cat-picker-row';
      const cb = document.createElement('input');
      cb.type = 'radio';
      cb.name = 'cat-selected';
      cb.onclick = e => e.stopPropagation();
      const lbl = document.createElement('span');
      lbl.textContent = cat.name;
      row.onclick = e => { e.stopPropagation(); choose(cat.id); };
      row.appendChild(cb);
      row.appendChild(lbl);
      picker.appendChild(row);
    });
  }

  const addRow = document.createElement('div');
  addRow.className = 'cat-picker-add';
  addRow.innerHTML = '<span>+</span> ' + i('newCat');
  addRow.onclick = e => {
    e.stopPropagation();
    picker.remove();
    activePicker = null;
    if (promptNewCategory(validIds)) {
      toast(i('selectedFavsAdded'));
      renderCards();
    }
  };
  picker.appendChild(addRow);

  picker.style.position = 'fixed';
  picker.style.right = 'auto';
  picker.style.top = '0';
  picker.style.left = '0';
  document.body.appendChild(picker);

  const rect = anchorEl.getBoundingClientRect();
  const margin = 8;
  const maxLeft = Math.max(margin, window.innerWidth - picker.offsetWidth - margin);
  const left = Math.min(Math.max(margin, rect.right - picker.offsetWidth), maxLeft);
  const maxTop = Math.max(margin, window.innerHeight - picker.offsetHeight - margin);
  const preferredTop = rect.bottom + 6;
  const fallbackTop = rect.top - picker.offsetHeight - 6;
  const top = preferredTop <= maxTop ? preferredTop : Math.max(margin, fallbackTop);
  picker.style.left = `${left}px`;
  picker.style.top = `${top}px`;

  setTimeout(() => {
    const close = e => {
      if (!picker.contains(e.target) && !anchorEl.contains(e.target)) {
        picker.remove();
        activePicker = null;
        document.removeEventListener('click', close);
      }
    };
    document.addEventListener('click', close);
  }, 0);
}

function openCatPicker(itemId, anchorEl) {
  itemId = normalizeId(itemId);
  if (activePicker) { activePicker.remove(); activePicker = null; }
  const picker = document.createElement('div');
  picker.className = 'cat-picker';
  picker.onclick = e => e.stopPropagation();
  activePicker = picker;

  const title = document.createElement('div');
  title.className = 'cat-picker-title';
  title.textContent = i('addToCat');
  picker.appendChild(title);

  const currentCat = S.categories.find(cat => cat.itemIds.includes(itemId));

  const noneRow = document.createElement('div');
  noneRow.className = 'cat-picker-row';
  const noneRadio = document.createElement('input');
  noneRadio.type = 'radio';
  noneRadio.name = `cat-${itemId}`;
  noneRadio.checked = !currentCat;
  noneRadio.onclick = e => e.stopPropagation();
  const noneLbl = document.createElement('span');
  noneLbl.textContent = i('uncategorized');
  noneRow.onclick = e => {
    e.stopPropagation();
    assignToCategory(itemId, null);
    picker.remove();
    activePicker = null;
    renderPanel();
  };
  noneRow.appendChild(noneRadio);
  noneRow.appendChild(noneLbl);
  picker.appendChild(noneRow);

  if (!S.categories.length) {
    const none = document.createElement('div');
    none.className = 'cat-picker-row';
    none.style.color = 'var(--text-muted)';
    none.textContent = i('noCatsYet');
    picker.appendChild(none);
  } else {
    S.categories.forEach(cat => {
      const row = document.createElement('div');
      row.className = 'cat-picker-row';
      const cb = document.createElement('input');
      cb.type = 'radio';
      cb.name = `cat-${itemId}`;
      cb.checked = currentCat ? currentCat.id === cat.id : false;
      cb.onclick = e => e.stopPropagation();
      const lbl = document.createElement('span');
      lbl.textContent = cat.name;
      row.onclick = e => {
        e.stopPropagation();
        assignToCategory(itemId, cat.id);
        picker.remove();
        activePicker = null;
        renderPanel();
      };
      row.appendChild(cb);
      row.appendChild(lbl);
      picker.appendChild(row);
    });
  }

  const addRow = document.createElement('div');
  addRow.className = 'cat-picker-add';
  addRow.innerHTML = '<span>+</span> ' + i('newCat');
  addRow.onclick = e => { e.stopPropagation(); picker.remove(); activePicker = null; promptNewCategory(itemId); };
  picker.appendChild(addRow);

  const wrap = anchorEl.closest('.cat-picker-wrap');
  if (wrap) {
    wrap.appendChild(picker);
  } else {
    picker.style.position = 'fixed';
    picker.style.right = 'auto';
    picker.style.top = '0';
    picker.style.left = '0';
    document.body.appendChild(picker);

    const rect = anchorEl.getBoundingClientRect();
    const margin = 8;
    const maxLeft = Math.max(margin, window.innerWidth - picker.offsetWidth - margin);
    const left = Math.min(Math.max(margin, rect.right - picker.offsetWidth), maxLeft);
    const maxTop = Math.max(margin, window.innerHeight - picker.offsetHeight - margin);
    const preferredTop = rect.bottom + 6;
    const fallbackTop = rect.top - picker.offsetHeight - 6;
    const top = preferredTop <= maxTop ? preferredTop : Math.max(margin, fallbackTop);
    picker.style.left = `${left}px`;
    picker.style.top = `${top}px`;
  }

  setTimeout(() => {
    const close = e => {
      if (!picker.contains(e.target) && !anchorEl.contains(e.target)) {
        picker.remove();
        activePicker = null;
        document.removeEventListener('click', close);
      }
    };
    document.addEventListener('click', close);
  }, 0);
}

function buildFavItem(itemId, catId) {
  itemId = normalizeId(itemId);
  const item = itemById(itemId) || evalEntityById(itemId);
  if (!item) return null;
  const isEval = !itemById(itemId);
  const el = document.createElement('div');
  el.className = 'fav-item';

  const nameSpan = document.createElement('span');
  nameSpan.className = 'fav-item-name';
  nameSpan.textContent = item.name;

  const pickerWrap = document.createElement('div');
  pickerWrap.className = 'cat-picker-wrap';
  const pickerBtn = document.createElement('button');
  pickerBtn.className = 'fav-tag-btn';
  pickerBtn.title = i('addToCat');
  pickerBtn.innerHTML = '<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>';
  pickerBtn.onclick = e => { e.stopPropagation(); openCatPicker(itemId, pickerBtn); };
  pickerWrap.appendChild(pickerBtn);

  const rmBtn = document.createElement('button');
  rmBtn.className = 'fav-remove';
  rmBtn.textContent = '✕';
  if (catId) {
    rmBtn.title = i('rmFromCat');
    rmBtn.onclick = e => { e.stopPropagation(); removeFromCategory(itemId, catId); renderPanel(); };
  } else {
    rmBtn.title = i('rmFav');
    rmBtn.onclick = e => { e.stopPropagation(); toggleFav(itemId); renderPanel(); };
  }

  el.appendChild(nameSpan);
  el.appendChild(pickerWrap);
  el.appendChild(rmBtn);
  el.onclick = () => { closePanel(); if (isEval) openEvalModal(itemId); else openModal(itemId); };
  return el;
}

function buildCatSection(cat, label, itemIds) {
  const valid = sortedItemIds(itemIds);
  const section = document.createElement('div');
  section.className = 'cat-section';

  const head = document.createElement('div');
  head.className = 'cat-section-head';

  const titleEl = document.createElement('span');
  titleEl.className = 'cat-title';
  titleEl.textContent = label;

  const countEl = document.createElement('span');
  countEl.className = 'cat-count';
  countEl.textContent = valid.length;

  const acts = document.createElement('div');
  acts.className = 'cat-actions';

  if (cat) {
    const renBtn = document.createElement('button');
    renBtn.className = 'cat-act';
    renBtn.title = i('renameCat');
    renBtn.textContent = '✏️';
    renBtn.onclick = e => {
      e.stopPropagation();
      const name = prompt(i('catPrompt'), cat.name);
      if (name && name.trim()) { cat.name = name.trim(); saveCats(); renderPanel(); }
    };
    acts.appendChild(renBtn);
  }

  const shareBtn = document.createElement('button');
  shareBtn.className = 'cat-act';
  shareBtn.title = i('shareCat');
  shareBtn.innerHTML = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>';
  shareBtn.onclick = e => { e.stopPropagation(); copy(shareURL(valid, cat ? cat.name : null)); };
  acts.appendChild(shareBtn);

  if (cat) {
    const delBtn = document.createElement('button');
    delBtn.className = 'cat-act danger';
    delBtn.title = i('deleteCat');
    delBtn.textContent = '🗑';
    delBtn.onclick = e => {
      e.stopPropagation();
      if (confirm(i('deleteCatOk'))) { deleteCategory(cat.id); renderPanel(); }
    };
    acts.appendChild(delBtn);
  }

  head.appendChild(titleEl);
  head.appendChild(countEl);
  head.appendChild(acts);
  section.appendChild(head);

  if (valid.length) {
    const itemsDiv = document.createElement('div');
    itemsDiv.className = 'cat-items';
    valid.forEach(itemId => {
      const el = buildFavItem(itemId, cat ? cat.id : null);
      if (el) itemsDiv.appendChild(el);
    });
    section.appendChild(itemsDiv);
  }

  return section;
}

function renderPanel() {
  const body = document.getElementById('panelBody');
  body.innerHTML = '';

  const newCatBtn = document.createElement('button');
  newCatBtn.className = 'panel-new-cat';
  newCatBtn.innerHTML = '<span style="font-size:1rem;font-weight:700;line-height:1">+</span> ' + i('newCat');
  newCatBtn.onclick = () => promptNewCategory();
  body.appendChild(newCatBtn);

  if (!S.favorites.size) {
    const empty = document.createElement('div');
    empty.className = 'state-box';
    empty.style.padding = '30px 0';
    empty.innerHTML = `<div class="icon">⭐</div><h3>${i('noFavs')}</h3><p>${i('noFavsHint')}</p>`;
    body.appendChild(empty);
    return;
  }

  const inCatSet = new Set(S.categories.flatMap(c => c.itemIds));
  const uncatItemIds = sortedItemIds([...S.favorites].filter(itemId => !inCatSet.has(itemId)));

  if (uncatItemIds.length) {
    body.appendChild(buildCatSection(null, i('uncategorized'), uncatItemIds));
  }

  S.categories.forEach(cat => {
    body.appendChild(buildCatSection(cat, cat.name, cat.itemIds));
  });
}

