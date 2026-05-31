// ─── EVAL GRAPH ENGINE ───────────────────────────────────────────────────────

// Physics & sizing constants
const EG = {
  REPULSION:  120000,
  IDEAL_LEN:  160,
  ATTRACTION: 0.018,
  DAMPING:    0.76,
  GRAVITY:    0.001,
  STRATIFY:   0.045,
  COLUMN_X:   320,
  COOLING:    0.98,
  STOP_ALPHA: 0.001,
  CENTER_R:   26,
  NODE_R:     21,
  NODE_R2:    13,
  LABEL_H:    72,
};

// Color palette — matches the eval chip colors
const EGPAL = {
  light: {
    TEC: { bg: '#dbeafe', edge: '#93c5fd', stroke: '#2563EB', text: '#1D4ED8' },
    INS: { bg: '#dcfce7', edge: '#4ade80', stroke: '#16a34a', text: '#15803d' },
    HER: { bg: '#f3e8ff', edge: '#c084fc', stroke: '#9333ea', text: '#7e22ce' },
    DIM: { bg: '#fef3c7', edge: '#fbbf24', stroke: '#d97706', text: '#b45309' },
  },
  dark: {
    TEC: { bg: 'rgba(37,99,235,0.15)',   edge: '#3b82f6', stroke: '#60a5fa', text: '#93c5fd' },
    INS: { bg: 'rgba(22,163,74,0.15)',   edge: '#22c55e', stroke: '#4ade80', text: '#86efac' },
    HER: { bg: 'rgba(147,51,234,0.15)',  edge: '#a855f7', stroke: '#c084fc', text: '#d8b4fe' },
    DIM: { bg: 'rgba(217,119,6,0.15)',   edge: '#f59e0b', stroke: '#fbbf24', text: '#fde68a' },
  },
};

// Relation definitions (field names in metaceval JSON schema)
const EVAL_RELATIONS = {
  tecnicas:     { left: null,
                  right: { cat: 'evidencias',   field: 'related_instruments', metaKey: 'rel_ins' } },
  dimensiones:  { left: null,
                  right: { cat: 'evidencias',   field: 'related_instruments', metaKey: 'rel_ins' } },
  evidencias:   { left:  { cat: 'tecnicas',     field: 'related_tecnicas',    metaKey: 'rel_tec' },
                  right: { cat: 'instrumentos', field: 'related_tools',       metaKey: 'rel_her' } },
  instrumentos: { left:  { cat: 'evidencias',   field: 'related_instruments', metaKey: 'rel_ins' },
                  right: null },
};
const EVAL_DIM_REL  = { cat: 'dimensiones', field: 'related_dimensions', metaKey: 'rel_dim' };
const EVAL_REL_PRI  = { principal: 3, complementaria: 2, ocasional: 1 };
const EVAL_GRAPH_TYPES = [
  { prefix: 'TEC', cat: 'tecnicas', label: 'evalCatTec' },
  { prefix: 'INS', cat: 'evidencias', label: 'evalCatIns' },
  { prefix: 'HER', cat: 'instrumentos', label: 'evalCatHer' },
  { prefix: 'DIM', cat: 'dimensiones', label: 'evalCatDim' },
];

// Graph state
const EGRAPH = {
  nodes: [], edges: [], rawNodes: [], rawEdges: [],
  hover: -1, alpha: 1, raf: null, canvas: null,
  camera: { x: 0, y: 0, scale: 1 },
  expanded: false,
  showOccasional: false,
  vis: { TEC: true, INS: true, HER: true, DIM: true },
  isPanning: false, panMoved: false,
  panStart: { x: 0, y: 0 }, camStart: { x: 0, y: 0 },
  dragNode: -1,
  currentEntity: null, currentCat: null,
  navHistory: [], navPos: -1, _navigating: false,
};

function syncEvalOccasionalButtons() {
  ['evalHubOccasionalBtn', 'evalMapOccasionalBtn'].forEach(id => {
    const btn = document.getElementById(id);
    if (btn) btn.classList.toggle('active', !!EGRAPH.showOccasional);
  });
}

function rebuildCurrentEvalGraph() {
  const inFullMap = document.getElementById('evalMapView')?.style.display !== 'none';
  if (inFullMap) {
    if (EGRAPH.currentEntity) evalGraphBuild(EGRAPH.currentEntity, EGRAPH.currentCat);
    return;
  }
  if (!S.evalSelected) return;
  const entity = evalEntityById(S.evalSelected);
  const cat = EVAL_CATS.find(c => c.prefix === evalEntityPrefix(S.evalSelected));
  if (entity) evalGraphBuild(entity, cat?.id || 'evidencias');
}

function evalGraphStop() {
  if (EGRAPH.raf !== null) { cancelAnimationFrame(EGRAPH.raf); EGRAPH.raf = null; }
}

function evalFindByIds(ids, cat) {
  if (!ids || !ids.length || !EV.data[S.lang]) return [];
  const items = EV.data[S.lang][cat] || [];
  return ids.map(id => items.find(e => e.id === id)).filter(Boolean);
}

function evalGetRelKind(item, metaKey, targetId) {
  return item.rel_meta?.[metaKey]?.[targetId] || 'complementaria';
}

function evalCatToPrefix(cat) {
  return EVAL_CATS.find(entry => entry.id === cat)?.prefix || '';
}

function evalCurrentCenterPrefix() {
  if (EGRAPH.currentCat) return evalCatToPrefix(EGRAPH.currentCat);
  if (S.evalSelected) return evalEntityPrefix(S.evalSelected);
  return '';
}

function renderEvalTypeToggles(targetId) {
  const bar = document.getElementById(targetId);
  if (!bar) return;
  const dark = document.documentElement.dataset.theme === 'dark';
  const pal  = dark ? EGPAL.dark : EGPAL.light;
  const lockedPrefix = evalCurrentCenterPrefix();

  bar.innerHTML = `<span class="eval-type-filter-label">${esc(i('evalTypeFilterLabel'))}</span>` +
  EVAL_GRAPH_TYPES.map(type => {
    const col = pal[type.prefix];
    const active = EGRAPH.vis[type.prefix];
    const locked = lockedPrefix === type.prefix;
    return `<button class="eval-type-toggle${active ? ' on' : ''}" data-prefix="${type.prefix}"
      ${locked ? 'disabled aria-disabled="true"' : ''}
      style="${active ? `color:${col.text};border-color:${col.edge};background:${col.bg}` : ''}"
      title="${esc(typeof i('evalTypeToggleTip') === 'function' ? i('evalTypeToggleTip')(i(type.label)) : i(type.label))}"
    >${esc(i(type.label))}</button>`;
  }).join('');

  bar.querySelectorAll('.eval-type-toggle').forEach(btn => {
    if (btn.disabled) return;
    btn.onclick = () => {
      EGRAPH.vis[btn.dataset.prefix] = !EGRAPH.vis[btn.dataset.prefix];
      rebuildCurrentEvalGraph();
      syncEvalOccasionalButtons();
      renderEvalTypeToggles('evalHubTypeToggles');
      renderEvalTypeToggles('evalMapTypeToggles');
    };
  });
}

function evalGraphBuild(entity, cat) {
  const prefix = evalEntityPrefix(entity.id);
  const nodes = [];
  const edges = [];
  const idToIdx = new Map();

  nodes.push({
    x: 0, y: 0, vx: 0, vy: 0,
    r: EG.CENTER_R, prefix, cat,
    name: entity.name, id: entity.id, summary: entity.summary || '', isCenter: true, targetX: 0,
  });
  idToIdx.set(entity.id, 0);

  function kindRadius(base, kind) {
    if (kind === 'complementaria') return Math.round(base * 0.65);
    if (kind === 'ocasional')      return Math.max(4, Math.round(base * 0.40));
    return base;
  }

  function addEdge(ai, bi, kind) {
    const ex = edges.find(e => (e.a === ai && e.b === bi) || (e.a === bi && e.b === ai));
    if (ex) { if (EVAL_REL_PRI[kind] > EVAL_REL_PRI[ex.kind]) ex.kind = kind; return; }
    const trans = nodes[ai]?.cat === 'dimensiones' || nodes[bi]?.cat === 'dimensiones';
    edges.push({ a: ai, b: bi, kind, isTransversal: trans });
  }

  function addConnected(srcEntity, relDef, parentIdx, targetX, baseR) {
    if (!relDef) return [];
    const targetPrefix = evalCatToPrefix(relDef.cat);
    if (targetPrefix && !EGRAPH.vis[targetPrefix]) return [];
    const connected = evalFindByIds(srcEntity[relDef.field] || [], relDef.cat);
    const result = [];
    connected.forEach((ni, k) => {
      const kind = evalGetRelKind(srcEntity, relDef.metaKey, ni.id);
      const r    = kindRadius(baseR, kind);
      let nodeIdx = idToIdx.get(ni.id);
      if (nodeIdx === undefined) {
        const spread = connected.length > 1 ? (k - (connected.length - 1) / 2) * 220 : 0;
        nodeIdx = nodes.length;
        idToIdx.set(ni.id, nodeIdx);
        nodes.push({
          x: targetX + (Math.random() - 0.5) * 60,
          y: spread  + (Math.random() - 0.5) * 30,
          vx: 0, vy: 0,
          r, baseR, kindPriority: EVAL_REL_PRI[kind],
          prefix: evalEntityPrefix(ni.id), cat: relDef.cat,
          name: ni.name, id: ni.id, summary: ni.summary || '', isCenter: false, targetX,
        });
      } else if (!nodes[nodeIdx].isCenter && EVAL_REL_PRI[kind] > (nodes[nodeIdx].kindPriority || 0)) {
        nodes[nodeIdx].r            = kindRadius(nodes[nodeIdx].baseR, kind);
        nodes[nodeIdx].kindPriority = EVAL_REL_PRI[kind];
      }
      result.push({ idx: nodeIdx, entity: ni, cat: relDef.cat });
      addEdge(parentIdx, nodeIdx, kind);
    });
    return result;
  }

  const L1 = EG.COLUMN_X, L2 = EG.COLUMN_X * 2.0, L3 = EG.COLUMN_X * 2.7;

  if (cat === 'evidencias') {
    addConnected(entity, EVAL_RELATIONS[cat].left,  0, -L1, EG.NODE_R);
    addConnected(entity, EVAL_DIM_REL,              0, -L1, EG.NODE_R);
    const tools = addConnected(entity, EVAL_RELATIONS[cat].right, 0, L1, EG.NODE_R);
    if (EGRAPH.expanded) {
      tools.forEach(({ idx, entity: ni, cat: nc }) =>
        addConnected(ni, EVAL_DIM_REL, idx, L2, EG.NODE_R2)
      );
    }
  } else if (cat === 'tecnicas' || cat === 'dimensiones') {
    addConnected(entity, EVAL_DIM_REL, 0, -L1, EG.NODE_R);
    const l1 = addConnected(entity, EVAL_RELATIONS[cat].right, 0, L1, EG.NODE_R);
    l1.forEach(({ idx, entity: ni, cat: nc }) =>
      addConnected(ni, EVAL_RELATIONS[nc]?.right, idx, L2, EG.NODE_R2)
    );
    if (EGRAPH.expanded) {
      l1.forEach(({ idx, entity: ni, cat: nc }) => {
        addConnected(ni, EVAL_RELATIONS[nc]?.left, idx, L2, EG.NODE_R2);
        addConnected(ni, EVAL_DIM_REL, idx, L2, EG.NODE_R2);
      });
    }
  } else { // instrumentos
    addConnected(entity, EVAL_DIM_REL, 0, L1, EG.NODE_R);
    const l1 = addConnected(entity, EVAL_RELATIONS[cat].left, 0, -L1, EG.NODE_R);
    l1.forEach(({ idx, entity: ni, cat: nc }) =>
      addConnected(ni, EVAL_RELATIONS[nc]?.left, idx, -L2, EG.NODE_R2)
    );
    if (EGRAPH.expanded) {
      l1.forEach(({ idx, entity: ni, cat: nc }) => {
        addConnected(ni, EVAL_DIM_REL, idx, L1, EG.NODE_R2);
        addConnected(ni, EVAL_RELATIONS[nc]?.right, idx, -L3, EG.NODE_R2);
      });
    }
  }

  // Filter optional edges
  const visEdges = EGRAPH.showOccasional
    ? edges : edges.filter(e => e.kind !== 'ocasional');
  const reachable = new Set([0]);
  let changed = true;
  while (changed) {
    changed = false;
    visEdges.forEach(e => {
      if (reachable.has(e.a) && !reachable.has(e.b)) { reachable.add(e.b); changed = true; }
      if (reachable.has(e.b) && !reachable.has(e.a)) { reachable.add(e.a); changed = true; }
    });
  }
  const idxMap = new Map();
  const keptNodes = [];
  nodes.forEach((nd, i) => {
    if (!reachable.has(i)) return;
    idxMap.set(i, keptNodes.length);
    keptNodes.push(nd);
  });
  const keptEdges = visEdges
    .filter(e => reachable.has(e.a) && reachable.has(e.b))
    .map(e => ({ ...e, a: idxMap.get(e.a), b: idxMap.get(e.b) }));

  EGRAPH.rawNodes = nodes;
  EGRAPH.rawEdges = edges;
  EGRAPH.nodes    = keptNodes;
  EGRAPH.edges    = keptEdges;
  EGRAPH.alpha    = 1;
  EGRAPH.hover    = -1;
  EGRAPH.camera   = { x: 0, y: 0, scale: 1 };
  renderEvalTypeToggles('evalHubTypeToggles');
  renderEvalTypeToggles('evalMapTypeToggles');
}

function evalGraphTick() {
  const { nodes, edges } = EGRAPH;
  const n = nodes.length;
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      let dx = nodes[j].x - nodes[i].x, dy = nodes[j].y - nodes[i].y;
      const d2 = dx * dx + dy * dy || 0.01, d = Math.sqrt(d2);
      const f  = (EG.REPULSION * EGRAPH.alpha) / d2;
      dx /= d; dy /= d;
      nodes[i].vx -= dx * f; nodes[i].vy -= dy * f;
      nodes[j].vx += dx * f; nodes[j].vy += dy * f;
    }
  }
  edges.forEach(({ a, b }) => {
    const na = nodes[a], nb = nodes[b];
    const dx = nb.x - na.x, dy = nb.y - na.y;
    const d  = Math.sqrt(dx * dx + dy * dy) || 0.01;
    const f  = (d - EG.IDEAL_LEN) * EG.ATTRACTION;
    const ux = dx / d, uy = dy / d;
    na.vx += ux * f; na.vy += uy * f;
    nb.vx -= ux * f; nb.vy -= uy * f;
  });
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const ni = nodes[i], nj = nodes[j];
      const dx = nj.x - ni.x, dy = nj.y - ni.y;
      const d2 = dx * dx + dy * dy || 0.01;
      const minD = ni.r + nj.r + EG.LABEL_H;
      if (d2 < minD * minD) {
        const d = Math.sqrt(d2), push = (minD - d) / d * 0.5;
        ni.vx -= dx * push; ni.vy -= dy * push;
        nj.vx += dx * push; nj.vy += dy * push;
      }
    }
  }
  nodes.forEach((nd, i) => {
    if (i === 0 || nd.fixed) { nd.vx = 0; nd.vy = 0; return; }
    nd.vx += (nd.targetX - nd.x) * EG.STRATIFY;
    nd.vy -= nd.y * EG.GRAVITY;
    nd.vx *= EG.DAMPING; nd.vy *= EG.DAMPING;
    nd.x  += nd.vx;      nd.y  += nd.vy;
  });
  EGRAPH.alpha *= EG.COOLING;
}

function evalGraphWrapLabel(ctx, text, maxW) {
  const words = text.split(' ');
  const lines = [];
  let line = '';
  for (const w of words) {
    const t = line ? line + ' ' + w : w;
    if (line && ctx.measureText(t).width > maxW) { lines.push(line); line = w; }
    else line = t;
  }
  if (line) lines.push(line);
  return lines.slice(0, 2);
}

function evalGraphDraw() {
  const canvas = EGRAPH.canvas;
  if (!canvas) return;
  evalGraphResizeCanvas();
  const dpr  = window.devicePixelRatio || 1;
  const ctx  = canvas.getContext('2d');
  const cw   = canvas.width, ch = canvas.height;
  const w    = cw / dpr, h = ch / dpr;
  const dark = document.documentElement.dataset.theme === 'dark';
  const pal  = dark ? EGPAL.dark : EGPAL.light;
  const hov  = EGRAPH.hover;
  const cam  = EGRAPH.camera;

  ctx.clearRect(0, 0, cw, ch);
  ctx.save();
  ctx.scale(dpr, dpr);
  ctx.translate(w / 2, h / 2);
  ctx.scale(cam.scale, cam.scale);
  ctx.translate(-cam.x, -cam.y);

  EGRAPH.edges.forEach(({ a, b, isTransversal }) => {
    const na = EGRAPH.nodes[a], nb = EGRAPH.nodes[b];
    const col = isTransversal ? pal.DIM : pal[nb.prefix];
    ctx.beginPath();
    ctx.moveTo(na.x, na.y);
    ctx.lineTo(nb.x, nb.y);
    ctx.strokeStyle = (col?.edge || '#999') + (dark ? '88' : '66');
    ctx.lineWidth   = 2;
    ctx.stroke();
  });

  EGRAPH.nodes.forEach((nd, i) => {
    const col   = pal[nd.prefix] || pal.INS;
    const isHov = i === hov && !nd.isCenter;
    const r     = isHov ? nd.r + 2 : nd.r;
    const alpha = nd.isCenter ? 1
      : nd.kindPriority === 3 ? 1
      : nd.kindPriority === 2 ? 0.65 : 0.40;

    ctx.save();
    ctx.globalAlpha = isHov ? Math.min(1, alpha + 0.2) : alpha;
    ctx.beginPath();
    ctx.arc(nd.x, nd.y, r, 0, Math.PI * 2);
    ctx.fillStyle   = col.bg;
    ctx.fill();
    ctx.lineWidth   = nd.isCenter ? 2.5 : isHov ? 2.2 : 1.5;
    ctx.strokeStyle = nd.isCenter || isHov ? col.stroke : col.edge;
    ctx.stroke();
    ctx.restore();

    const fs   = nd.isCenter ? 13 : 11;
    const maxW = nd.isCenter ? 160 : 140;
    const lineH = fs + 2;
    const pad   = 3;
    ctx.font         = `${nd.isCenter ? 700 : 500} ${fs}px -apple-system,BlinkMacSystemFont,sans-serif`;
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'top';
    const lines = evalGraphWrapLabel(ctx, nd.name, maxW);
    lines.forEach((line, li) => {
      const tw = ctx.measureText(line).width;
      const tx = nd.x, ty = nd.y + r + 4 + li * lineH;
      ctx.fillStyle = dark ? 'rgba(15,23,42,0.82)' : 'rgba(255,255,255,0.88)';
      ctx.fillRect(tx - tw / 2 - pad, ty - 1, tw + pad * 2, fs + 3);
      ctx.fillStyle = col.text;
      ctx.fillText(line, tx, ty);
    });
  });

  ctx.restore();
}

function evalGraphResizeCanvas() {
  const canvas = EGRAPH.canvas;
  if (!canvas || !canvas.clientWidth) return;
  const dpr = window.devicePixelRatio || 1;
  canvas.width  = Math.round(canvas.clientWidth  * dpr);
  canvas.height = Math.round(canvas.clientHeight * dpr);
}

function evalGraphHitTest(sx, sy) {
  const canvas = EGRAPH.canvas;
  if (!canvas) return -1;
  const dpr = window.devicePixelRatio || 1;
  const w = canvas.width / dpr, h = canvas.height / dpr;
  const cam = EGRAPH.camera;
  const wx = (sx - w / 2) / cam.scale + cam.x;
  const wy = (sy - h / 2) / cam.scale + cam.y;
  for (let i = EGRAPH.nodes.length - 1; i >= 0; i--) {
    const nd = EGRAPH.nodes[i];
    const dx = wx - nd.x, dy = wy - nd.y;
    if (dx * dx + dy * dy <= (nd.r + 4) * (nd.r + 4)) return i;
  }
  return -1;
}

function evalGraphLoop() {
  if (EGRAPH.alpha > EG.STOP_ALPHA) evalGraphTick();
  evalGraphDraw();
  EGRAPH.raf = requestAnimationFrame(evalGraphLoop);
}

function openEvalMap(entity, cat) {
  evalGraphStop();
  EGRAPH.navHistory = []; EGRAPH.navPos = -1; evalNavUpdateBtns();
  EGRAPH.currentEntity = entity;
  EGRAPH.currentCat    = cat;

  const view   = document.getElementById('evalMapView');
  const canvas = document.getElementById('evalMapCanvas');
  EGRAPH.canvas = canvas;

  // Position below sticky bars
  const hdr  = document.querySelector('header');
  const vTog = document.getElementById('viewToggle');
  const top  = (hdr?.offsetHeight || 0) + (vTog?.offsetHeight || 0);
  view.style.top = top + 'px';
  view.style.display = 'flex';

  // Label
  const lbl = document.getElementById('evalMapTitle');
  if (lbl) lbl.textContent = entity.name;
  syncEvalOccasionalButtons();
  renderEvalTypeToggles('evalMapTypeToggles');

  // Reset floating panel
  const np = document.getElementById('evalMapNodePanel');
  if (np) np.classList.remove('visible', 'collapsed');

  evalGraphBuild(entity, cat);
  requestAnimationFrame(() => {
    evalGraphResizeCanvas();
    const cw = canvas.clientWidth, ch = canvas.clientHeight;
    EGRAPH.camera = { x: 0, y: ch / 2 - ch / 2, scale: 1 };
    evalGraphLoop();
  });
  document.body.style.overflow = 'hidden';
}

function closeEvalMap() {
  evalGraphStop();
  document.getElementById('evalMapView').style.display = 'none';
  document.body.style.overflow = '';
  // Restart inline hub graph if returning to the split view
  if (S.view === 'evaluacion' && S.evalSelected) {
    const hubCanvas = document.getElementById('evalHubCanvas');
    if (hubCanvas) {
      EGRAPH.canvas = hubCanvas;
      requestAnimationFrame(() => requestAnimationFrame(() => {
        evalGraphResizeCanvas();
        evalGraphLoop();
      }));
    }
  }
}

function initEvalMapEvents() {
  const canvas = document.getElementById('evalMapCanvas');
  const view   = document.getElementById('evalMapView');
  if (!canvas || !view) return;

  // Close button
  document.getElementById('evalMapCloseBtn').onclick = closeEvalMap;

  // 2nd-level toggle
  const expBtn = document.getElementById('evalMapExpandBtn');
  if (expBtn) {
    expBtn.onclick = () => {
      EGRAPH.expanded = !EGRAPH.expanded;
      expBtn.classList.toggle('active', EGRAPH.expanded);
      if (EGRAPH.currentEntity) evalGraphBuild(EGRAPH.currentEntity, EGRAPH.currentCat);
    };
  }

  const occasionalBtn = document.getElementById('evalMapOccasionalBtn');
  if (occasionalBtn) {
    occasionalBtn.onclick = () => {
      EGRAPH.showOccasional = !EGRAPH.showOccasional;
      syncEvalOccasionalButtons();
      rebuildCurrentEvalGraph();
    };
  }

  // Fit button
  document.getElementById('evalMapFitBtn').onclick = () => {
    if (!EGRAPH.nodes.length) return;
    const cw = canvas.clientWidth, ch = canvas.clientHeight;
    EGRAPH.camera = { x: 0, y: 0, scale: 1 };
    evalGraphDraw();
  };

  // Pointer events: pan + drag
  let pointers = new Map();
  let lastPinchDist = 0;
  let nodeDragStart = null;

  canvas.addEventListener('pointermove', e => {
    const rect = canvas.getBoundingClientRect();
    const sx = e.clientX - rect.left, sy = e.clientY - rect.top;
    if (EGRAPH.dragNode >= 0) {
      const ddx = e.clientX - EGRAPH.panStart.x, ddy = e.clientY - EGRAPH.panStart.y;
      if (!EGRAPH.dragMoved && ddx * ddx + ddy * ddy < 25) return;
      EGRAPH.dragMoved = true;
      const cam = EGRAPH.camera;
      const nd = EGRAPH.nodes[EGRAPH.dragNode];
      if (!nd) return;
      nd.x = nodeDragStart.nx0 + (e.clientX - EGRAPH.panStart.x) / cam.scale;
      nd.y = nodeDragStart.ny0 + (e.clientY - EGRAPH.panStart.y) / cam.scale;
      nd.vx = 0; nd.vy = 0; nd.fixed = true;
      EGRAPH.alpha = Math.max(EGRAPH.alpha, 0.3);
      return;
    }
    if (EGRAPH.isPanning && pointers.size === 1) {
      const dx = e.clientX - EGRAPH.panStart.x;
      const dy = e.clientY - EGRAPH.panStart.y;
      if (!EGRAPH.panMoved && dx * dx + dy * dy < 25) return;
      EGRAPH.camera.x = EGRAPH.camStart.x - dx / EGRAPH.camera.scale;
      EGRAPH.camera.y = EGRAPH.camStart.y - dy / EGRAPH.camera.scale;
      EGRAPH.panMoved = true;
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
    pointers.set(e.pointerId, e);
    const rect = canvas.getBoundingClientRect();
    const sx = e.clientX - rect.left, sy = e.clientY - rect.top;
    const hit = evalGraphHitTest(sx, sy);
    if (hit >= 0) {
      const nd = EGRAPH.nodes[hit];
      EGRAPH.dragNode     = hit;
      EGRAPH.dragMoved    = false;
      EGRAPH.panStart     = { x: e.clientX, y: e.clientY };
      nodeDragStart       = { nx0: nd.x, ny0: nd.y };
    } else {
      EGRAPH.isPanning = true;
      EGRAPH.panMoved  = false;
      EGRAPH.panStart  = { x: e.clientX, y: e.clientY };
      EGRAPH.camStart  = { ...EGRAPH.camera };
    }
  });

  const finishPtr = e => {
    pointers.delete(e.pointerId);
    if (EGRAPH.dragNode >= 0) {
      const dragged = EGRAPH.nodes[EGRAPH.dragNode];
      const wasDragged = EGRAPH.dragMoved;
      if (dragged) dragged.fixed = false;
      EGRAPH.dragNode  = -1;
      EGRAPH.dragMoved = false;
      nodeDragStart = null;
      // No actual drag movement → treat as click on node
      if (!wasDragged && dragged && !dragged.isCenter) {
        const entity = evalEntityById(dragged.id);
        const dcat = EVAL_CATS.find(c => c.prefix === evalEntityPrefix(dragged.id));
        if (entity) renderEvalMapNodePanel(entity, dcat);
      }
    } else if (!EGRAPH.panMoved) {
      const rect = canvas.getBoundingClientRect();
      const hit = evalGraphHitTest(e.clientX - rect.left, e.clientY - rect.top);
      const nd = hit >= 0 ? EGRAPH.nodes[hit] : null;
      if (nd && !nd.isCenter) {
        const entity = evalEntityById(nd.id);
        const ncat = EVAL_CATS.find(c => c.prefix === evalEntityPrefix(nd.id));
        if (entity) renderEvalMapNodePanel(entity, ncat);
      }
    }
    EGRAPH.isPanning = false;
    EGRAPH.panMoved  = false;
  };
  canvas.addEventListener('pointerup',     finishPtr);
  canvas.addEventListener('pointercancel', finishPtr);
  canvas.addEventListener('mouseleave', () => {
    document.getElementById('mapTooltip').style.display = 'none';
    EGRAPH.hover = -1;
    canvas.classList.remove('hovering');
  });

  // Pinch zoom
  canvas.addEventListener('pointermove', e => {
    pointers.set(e.pointerId, e);
    if (pointers.size === 2) {
      const pts = [...pointers.values()];
      const dx = pts[0].clientX - pts[1].clientX;
      const dy = pts[0].clientY - pts[1].clientY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (lastPinchDist) {
        EGRAPH.camera.scale *= dist / lastPinchDist;
        EGRAPH.camera.scale  = Math.max(0.2, Math.min(4, EGRAPH.camera.scale));
      }
      lastPinchDist = dist;
    } else {
      lastPinchDist = 0;
    }
  });

  // Wheel zoom
  canvas.addEventListener('wheel', e => {
    e.preventDefault();
    const factor = e.deltaY < 0 ? 1.1 : 0.9;
    EGRAPH.camera.scale = Math.max(0.2, Math.min(4, EGRAPH.camera.scale * factor));
  }, { passive: false });

  // Floating node panel: drag + collapse + close
  const nodePanel  = document.getElementById('evalMapNodePanel');
  const panelHead  = document.getElementById('evalMapNodePanelHead');
  if (nodePanel && panelHead) {
    let mpDrag = null;

    panelHead.addEventListener('pointerdown', e => {
      if (e.target.closest('button')) return;
      const rect = nodePanel.getBoundingClientRect();
      const parentRect = (nodePanel.offsetParent || nodePanel.parentElement).getBoundingClientRect();
      mpDrag = {
        pointerId: e.pointerId,
        x0: e.clientX,
        y0: e.clientY,
        right0: parentRect.right - rect.right,
        top0:   rect.top - parentRect.top,
      };
      panelHead.setPointerCapture(e.pointerId);
      nodePanel.classList.add('is-dragging');
    });

    panelHead.addEventListener('pointermove', e => {
      if (!mpDrag || mpDrag.pointerId !== e.pointerId) return;
      const dx = e.clientX - mpDrag.x0;
      const dy = e.clientY - mpDrag.y0;
      nodePanel.style.right = Math.max(0, mpDrag.right0 - dx) + 'px';
      nodePanel.style.top   = Math.max(0, mpDrag.top0  + dy) + 'px';
    });

    const mpStop = e => {
      if (mpDrag && mpDrag.pointerId === e.pointerId) {
        mpDrag = null;
        nodePanel.classList.remove('is-dragging');
      }
    };
    panelHead.addEventListener('pointerup',     mpStop);
    panelHead.addEventListener('pointercancel', mpStop);

    document.getElementById('evalMapNavBack').onclick = e => { e.stopPropagation(); evalNavBack(); };
    document.getElementById('evalMapNavFwd').onclick  = e => { e.stopPropagation(); evalNavFwd(); };
    document.getElementById('evalMapNodePanelToggle').onclick = () => {
      const collapsed = nodePanel.classList.toggle('collapsed');
      const toggle = document.getElementById('evalMapNodePanelToggle');
      toggle.textContent = collapsed ? '+' : '−';
      toggle.title = collapsed ? i('mapPanelExpand') : i('mapPanelCollapse');
    };
    document.getElementById('evalMapNodePanelOpenCompact').onclick = () => {
      const btn = document.getElementById('evalMapNodeOpenBtn');
      if (btn) btn.click();
    };
    document.getElementById('evalMapNodePanelClose').onclick = () => {
      nodePanel.classList.remove('visible');
    };
  }

  // Theme change → redraw
  new MutationObserver(() => {
    renderEvalTypeToggles('evalHubTypeToggles');
    renderEvalTypeToggles('evalMapTypeToggles');
    if (EGRAPH.raf) evalGraphDraw();
  })
    .observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
}
