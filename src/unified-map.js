// ─── UNIFIED MAP (all nodes: metac + eval) ────────────────────────────────────

// Physics constants for the big graph (330 nodes)
const EU = {
  REPULSION:  55000,
  IDEAL_LEN:  110,
  ATTRACTION: 0.006,
  DAMPING:    0.82,
  GRAVITY:    0,
  COOLING:    0.985,
  STOP_ALPHA: 0.005,
  NODE_R:     12,
  LABEL_H:    52,
};

// Palette: extend EGPAL with METAC
EGPAL.light.METAC = { bg: '#f1f5f9', edge: '#94a3b8', stroke: '#64748b', text: '#334155' };
EGPAL.dark.METAC  = { bg: 'rgba(100,116,139,0.18)', edge: '#475569', stroke: '#94a3b8', text: '#cbd5e1' };

const UMAP = {
  nodes: [], edges: [],
  hover: -1, alpha: 1, raf: null, canvas: null,
  camera: { x: 0, y: 0, scale: 0.25 },
  isPanning: false, panMoved: false,
  panStart: { x: 0, y: 0 }, camStart: { x: 0, y: 0 },
  vis: { METAC: true, TEC: true, INS: true, HER: true, DIM: true },
  onlyPrincipal: false,
};

// Pre-position centres per type (keeps clusters visually separated)
const UMAP_CENTRES = {
  METAC: { x: -700, y:    0 },
  TEC:   { x:    0, y: -500 },
  INS:   { x:  600, y:    0 },
  HER:   { x:  400, y:  500 },
  DIM:   { x: -200, y:  550 },
};

function umapStop() {
  if (UMAP.raf !== null) { cancelAnimationFrame(UMAP.raf); UMAP.raf = null; }
}

function umapBuild() {
  const nodes = [];
  const edges = [];
  const idToIdx = new Map();

  function addNode(id, name, prefix) {
    if (!UMAP.vis[prefix]) return -1;
    if (idToIdx.has(id)) return idToIdx.get(id);
    const c = UMAP_CENTRES[prefix] || { x: 0, y: 0 };
    const angle = Math.random() * Math.PI * 2;
    const spread = 220;
    const idx = nodes.length;
    idToIdx.set(id, idx);
    nodes.push({
      x: c.x + Math.cos(angle) * spread * Math.random(),
      y: c.y + Math.sin(angle) * spread * Math.random(),
      vx: 0, vy: 0,
      r: EU.NODE_R, baseR: EU.NODE_R,
      prefix, name, id, kindPriority: 2, isCenter: false, fixed: false,
    });
    return idx;
  }

  function addEdge(ai, bi, kind, isCross) {
    if (ai < 0 || bi < 0) return;
    const ex = edges.find(e => (e.a === ai && e.b === bi) || (e.a === bi && e.b === ai));
    if (ex) return;
    edges.push({ a: ai, b: bi, kind, isCross });
  }

  // ── Add eval entities ──
  const evalMap = [
    { cat: 'tecnicas',    prefix: 'TEC' },
    { cat: 'evidencias',prefix: 'INS' },
    { cat: 'instrumentos',prefix: 'HER' },
    { cat: 'dimensiones', prefix: 'DIM' },
  ];
  evalMap.forEach(({ cat, prefix }) => {
    (EV.data[S.lang]?.[cat] || []).forEach(e => addNode(e.id, e.name, prefix));
  });

  // ── Add metac techniques ──
  (S.data[S.lang] || []).forEach(t => addNode(t.id, t.name, 'METAC'));

  // ── Intra-eval edges ──
  const addEvalEdges = (items, relField, tgtPrefix) => {
    items.forEach(e => {
      const ai = idToIdx.get(e.id);
      if (ai === undefined) return;
      (e[relField] || []).forEach(tid => {
        const bi = idToIdx.get(tid);
        if (bi === undefined) return;
        const kind = e.rel_meta?.[
          relField === 'related_instruments' ? 'rel_ins'
          : relField === 'related_tools'     ? 'rel_her'
          : relField === 'related_tecnicas'  ? 'rel_tec'
          : 'rel_dim'
        ]?.[tid] || 'complementaria';
        if (UMAP.onlyPrincipal && kind !== 'principal') return;
        addEdge(ai, bi, kind, false);
      });
    });
  };
  const ev = EV.data[S.lang] || {};
  addEvalEdges(ev.tecnicas    || [], 'related_instruments', 'INS');
  addEvalEdges(ev.evidencias  || [], 'related_tools',       'HER');
  addEvalEdges(ev.evidencias  || [], 'related_tecnicas',    'TEC');
  addEvalEdges(ev.evidencias  || [], 'related_dimensions',  'DIM');
  addEvalEdges(ev.instrumentos|| [], 'related_instruments', 'INS');
  addEvalEdges(ev.instrumentos|| [], 'related_dimensions',  'DIM');
  addEvalEdges(ev.dimensiones || [], 'related_instruments', 'INS');

  // ── metac ↔ eval edges ──
  (S.data[S.lang] || []).forEach(t => {
    const ai = idToIdx.get(t.id);
    if (ai === undefined) return;
    (t.eval_ids || []).forEach(eid => {
      const bi = idToIdx.get(eid);
      if (bi === undefined) return;
      if (UMAP.onlyPrincipal) return; // metac links don't have principal/complementaria
      addEdge(ai, bi, 'complementaria', true);
    });
  });

  UMAP.nodes = nodes;
  UMAP.edges = edges;
  UMAP.alpha = 1;
  UMAP.hover = -1;
}

function umapTick() {
  const { nodes, edges } = UMAP;
  const n = nodes.length;
  const alpha = UMAP.alpha;

  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      let dx = nodes[j].x - nodes[i].x, dy = nodes[j].y - nodes[i].y;
      const d2 = dx * dx + dy * dy || 0.01, d = Math.sqrt(d2);
      const f = (EU.REPULSION * alpha) / d2;
      dx /= d; dy /= d;
      nodes[i].vx -= dx * f; nodes[i].vy -= dy * f;
      nodes[j].vx += dx * f; nodes[j].vy += dy * f;
    }
  }

  edges.forEach(({ a, b }) => {
    const na = nodes[a], nb = nodes[b];
    const dx = nb.x - na.x, dy = nb.y - na.y;
    const d  = Math.sqrt(dx * dx + dy * dy) || 0.01;
    const f  = (d - EU.IDEAL_LEN) * EU.ATTRACTION;
    const ux = dx / d, uy = dy / d;
    na.vx += ux * f; na.vy += uy * f;
    nb.vx -= ux * f; nb.vy -= uy * f;
  });

  // Separation
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const ni = nodes[i], nj = nodes[j];
      const dx = nj.x - ni.x, dy = nj.y - ni.y;
      const d2 = dx * dx + dy * dy || 0.01;
      const minD = ni.r + nj.r + EU.LABEL_H;
      if (d2 < minD * minD) {
        const d = Math.sqrt(d2), push = (minD - d) / d * 0.3;
        ni.vx -= dx * push; ni.vy -= dy * push;
        nj.vx += dx * push; nj.vy += dy * push;
      }
    }
  }

  nodes.forEach(nd => {
    if (nd.fixed) { nd.vx = 0; nd.vy = 0; return; }
    nd.vx *= EU.DAMPING; nd.vy *= EU.DAMPING;
    nd.x  += nd.vx;      nd.y  += nd.vy;
  });

  UMAP.alpha *= EU.COOLING;
}

function umapDraw() {
  const canvas = UMAP.canvas;
  if (!canvas) return;
  const dpr = window.devicePixelRatio || 1;
  const cw = canvas.clientWidth, ch = canvas.clientHeight;
  canvas.width  = Math.round(cw * dpr);
  canvas.height = Math.round(ch * dpr);
  const ctx = canvas.getContext('2d');
  const dark = document.documentElement.dataset.theme === 'dark';
  const pal  = dark ? EGPAL.dark : EGPAL.light;
  const cam  = UMAP.camera;

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.save();
  ctx.scale(dpr, dpr);
  ctx.translate(cw / 2, ch / 2);
  ctx.scale(cam.scale, cam.scale);
  ctx.translate(-cam.x, -cam.y);

  // Edges
  UMAP.edges.forEach(({ a, b, isCross }) => {
    const na = UMAP.nodes[a], nb = UMAP.nodes[b];
    const col = pal[nb.prefix] || pal.METAC;
    ctx.beginPath();
    ctx.moveTo(na.x, na.y);
    ctx.lineTo(nb.x, nb.y);
    ctx.strokeStyle = (col.edge || '#999') + (isCross ? (dark ? '30' : '28') : (dark ? '55' : '44'));
    ctx.lineWidth = isCross ? 0.8 : 1.5;
    ctx.stroke();
  });

  // Nodes
  const hov = UMAP.hover;
  UMAP.nodes.forEach((nd, i) => {
    const col   = pal[nd.prefix] || pal.METAC;
    const isHov = i === hov;
    const r     = isHov ? nd.r + 2 : nd.r;

    ctx.save();
    ctx.globalAlpha = isHov ? 1 : 0.88;
    ctx.beginPath();
    ctx.arc(nd.x, nd.y, r, 0, Math.PI * 2);
    ctx.fillStyle   = col.bg;
    ctx.fill();
    ctx.lineWidth   = isHov ? 2 : 1.2;
    ctx.strokeStyle = isHov ? col.stroke : col.edge;
    ctx.stroke();
    ctx.restore();

    if (cam.scale > 0.45 || isHov) {
      const fs = 9, pad = 2;
      ctx.font = `500 ${fs}px -apple-system,BlinkMacSystemFont,sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      const maxW = 100;
      const words = nd.name.split(' ');
      let line = '', lines = [];
      for (const w of words) {
        const t = line ? line + ' ' + w : w;
        if (line && ctx.measureText(t).width > maxW) { lines.push(line); line = w; }
        else line = t;
      }
      if (line) lines.push(line);
      lines = lines.slice(0, 2);
      lines.forEach((ln, li) => {
        const tw = ctx.measureText(ln).width;
        const tx = nd.x, ty = nd.y + r + 3 + li * (fs + 2);
        ctx.fillStyle = dark ? 'rgba(15,23,42,0.82)' : 'rgba(255,255,255,0.88)';
        ctx.fillRect(tx - tw / 2 - pad, ty - 1, tw + pad * 2, fs + 2);
        ctx.fillStyle = col.text;
        ctx.fillText(ln, tx, ty);
      });
    }
  });

  ctx.restore();
}

function umapHitTest(sx, sy) {
  const canvas = UMAP.canvas;
  if (!canvas) return -1;
  const dpr = window.devicePixelRatio || 1;
  const w = canvas.width / dpr, h = canvas.height / dpr;
  const cam = UMAP.camera;
  const wx = (sx - w / 2) / cam.scale + cam.x;
  const wy = (sy - h / 2) / cam.scale + cam.y;
  for (let i = UMAP.nodes.length - 1; i >= 0; i--) {
    const nd = UMAP.nodes[i];
    const dx = wx - nd.x, dy = wy - nd.y;
    if (dx * dx + dy * dy <= (nd.r + 5) * (nd.r + 5)) return i;
  }
  return -1;
}

function umapLoop() {
  if (UMAP.alpha > EU.STOP_ALPHA) umapTick();
  umapDraw();
  UMAP.raf = requestAnimationFrame(umapLoop);
}

function umapFit() {
  if (!UMAP.nodes.length) return;
  const canvas = UMAP.canvas;
  if (!canvas) return;
  const cw = canvas.clientWidth, ch = canvas.clientHeight;
  if (!cw || !ch) { UMAP.camera.scale = 0.2; return; }
  const xs = UMAP.nodes.map(n => n.x), ys = UMAP.nodes.map(n => n.y);
  const minX = Math.min(...xs), maxX = Math.max(...xs);
  const minY = Math.min(...ys), maxY = Math.max(...ys);
  const pad = 60;
  const sx = (cw - pad * 2) / (maxX - minX || 1);
  const sy = (ch - pad * 2) / (maxY - minY || 1);
  UMAP.camera.scale = Math.min(sx, sy, 2);
  UMAP.camera.x = (minX + maxX) / 2;
  UMAP.camera.y = (minY + maxY) / 2;
}

function openUnifiedMap() {
  umapStop();
  const view   = document.getElementById('uniMapView');
  const canvas = document.getElementById('uniMapCanvas');
  UMAP.canvas  = canvas;

  const hdr  = document.querySelector('header');
  const vTog = document.getElementById('viewToggle');
  view.style.top = ((hdr?.offsetHeight || 0) + (vTog?.offsetHeight || 0)) + 'px';
  view.style.display = 'flex';
  document.body.style.overflow = 'hidden';

  umapRenderToggles();
  umapBuild();

  // Double RAF: first lets the browser paint the overlay (flex layout),
  // second reads real canvas dimensions for the fit calculation.
  requestAnimationFrame(() => requestAnimationFrame(() => {
    for (let k = 0; k < 80; k++) umapTick();  // warm-up physics
    umapFit();
    umapLoop();
  }));
}

function closeUnifiedMap() {
  umapStop();
  document.getElementById('uniMapView').style.display = 'none';
  document.body.style.overflow = '';
}

function umapRenderToggles() {
  const bar = document.getElementById('uniMapToggles');
  if (!bar) return;
  const types = [
    { prefix: 'METAC', label: i('viewTecnicas') },
    { prefix: 'TEC',   label: i('evalCatTec')  },
    { prefix: 'INS',   label: i('evalCatIns')  },
    { prefix: 'HER',   label: i('evalCatHer')  },
    { prefix: 'DIM',   label: i('evalCatDim')  },
  ];
  const dark = document.documentElement.dataset.theme === 'dark';
  const pal  = dark ? EGPAL.dark : EGPAL.light;

  bar.innerHTML = types.map(t => {
    const col = pal[t.prefix];
    const active = UMAP.vis[t.prefix];
    return `<button class="umap-toggle${active ? ' on' : ''}" data-prefix="${t.prefix}"
      style="background:${active ? col.bg : 'transparent'};color:${active ? col.text : 'var(--text-muted)'};border-color:${active ? col.edge : 'var(--border)'}"
    >${esc(t.label)}</button>`;
  }).join('');

  bar.querySelectorAll('.umap-toggle').forEach(btn => {
    btn.onclick = () => {
      UMAP.vis[btn.dataset.prefix] = !UMAP.vis[btn.dataset.prefix];
      umapBuild();
      umapRenderToggles();
    };
  });
}

function initUnifiedMapEvents() {
  const canvas = document.getElementById('uniMapCanvas');
  if (!canvas) return;

  document.getElementById('uniMapCloseBtn').onclick = closeUnifiedMap;
  document.getElementById('uniMapFitBtn').onclick   = umapFit;

  const prinBtn = document.getElementById('uniMapPrinBtn');
  if (prinBtn) {
    prinBtn.onclick = () => {
      UMAP.onlyPrincipal = !UMAP.onlyPrincipal;
      prinBtn.classList.toggle('active', UMAP.onlyPrincipal);
      umapBuild();
    };
  }

  let pointers = new Map(), lastPinchDist = 0;

  canvas.addEventListener('pointermove', e => {
    pointers.set(e.pointerId, e);
    const rect = canvas.getBoundingClientRect();
    const sx = e.clientX - rect.left, sy = e.clientY - rect.top;

    if (pointers.size === 2) {
      const pts = [...pointers.values()];
      const dx = pts[0].clientX - pts[1].clientX, dy = pts[0].clientY - pts[1].clientY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (lastPinchDist) {
        UMAP.camera.scale = Math.max(0.08, Math.min(4, UMAP.camera.scale * dist / lastPinchDist));
      }
      lastPinchDist = dist;
      return;
    } else { lastPinchDist = 0; }

    if (UMAP.isPanning) {
      const dx = e.clientX - UMAP.panStart.x, dy = e.clientY - UMAP.panStart.y;
      if (!UMAP.panMoved && dx * dx + dy * dy < 25) return;
      UMAP.camera.x = UMAP.camStart.x - dx / UMAP.camera.scale;
      UMAP.camera.y = UMAP.camStart.y - dy / UMAP.camera.scale;
      UMAP.panMoved = true;
      return;
    }
    const hit = umapHitTest(sx, sy);
    if (hit !== UMAP.hover) {
      UMAP.hover = hit;
      canvas.classList.toggle('hovering', hit >= 0);
    }
  });

  canvas.addEventListener('pointerdown', e => {
    canvas.setPointerCapture(e.pointerId);
    pointers.set(e.pointerId, e);
    UMAP.isPanning = true;
    UMAP.panMoved  = false;
    UMAP.panStart  = { x: e.clientX, y: e.clientY };
    UMAP.camStart  = { ...UMAP.camera };
  });

  const finishPtr = e => {
    pointers.delete(e.pointerId);
    if (!UMAP.panMoved) {
      const rect = canvas.getBoundingClientRect();
      const hit = umapHitTest(e.clientX - rect.left, e.clientY - rect.top);
      if (hit >= 0) {
        const nd = UMAP.nodes[hit];
        closeUnifiedMap();
        if (nd.prefix === 'METAC') openModal(nd.id);
        else openEvalModal(nd.id);
      }
    }
    UMAP.isPanning = false;
    UMAP.panMoved  = false;
  };
  canvas.addEventListener('pointerup',     finishPtr);
  canvas.addEventListener('pointercancel', finishPtr);

  canvas.addEventListener('wheel', e => {
    e.preventDefault();
    UMAP.camera.scale = Math.max(0.08, Math.min(4, UMAP.camera.scale * (e.deltaY < 0 ? 1.12 : 0.9)));
  }, { passive: false });

  new MutationObserver(() => { if (UMAP.raf) umapDraw(); })
    .observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
}

