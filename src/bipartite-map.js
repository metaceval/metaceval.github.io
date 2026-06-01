// ─── BIPARTITE EGO-NETWORK MAP ───────────────────────────────────────────────
// Shows the cross-domain connections between a technique (metac) and its
// associated evaluation items, or vice versa.
//
// Ego node on the left  → connected eval items on the right   (from technique)
// Ego node on the right → connected techniques  on the left   (from eval item)

const BMAP = {
  canvas: null,
  ctx: null,
  ego: null,        // { id, type: 'tecnica'|'eval', data }
  groups: [],       // [{ label, prefix, nodes: [{id, data, x, y}] }]
  allNodes: [],     // flat list of connected nodes with x,y
  camera: { x: 0, y: 0 },
  drag: null,
  hover: null,      // index in allNodes
  egoPos: null,     // { x, y }
  animFrame: null,
  navHistory: [],
  navPos: -1,
};

// ─── PALETTE ─────────────────────────────────────────────────────────────────

const BPAL = {
  light: {
    bg: '#f8fafc', grid: '#e2e8f0', text: '#1e293b', muted: '#64748b',
    ego: { bg: '#fef3c7', border: '#f59e0b', text: '#b45309' },
    TEC: { bg: '#dbeafe', border: '#3b82f6', text: '#1e40af' },
    INS: { bg: '#dcfce7', border: '#4ade80', text: '#15803d' },
    HER: { bg: '#f3e8ff', border: '#c084fc', text: '#7e22ce' },
    DIM: { bg: '#fef3c7', border: '#fbbf24', text: '#b45309' },
    tec: { bg: '#fef3c7', border: '#f59e0b', text: '#b45309' },
    edge: '#cbd5e1', edgeHover: '#3b82f6',
  },
  dark: {
    bg: '#0f172a', grid: '#1e293b', text: '#f1f5f9', muted: '#94a3b8',
    ego: { bg: '#451a03', border: '#f59e0b', text: '#fcd34d' },
    TEC: { bg: '#1e3a5f', border: '#3b82f6', text: '#93c5fd' },
    INS: { bg: '#14532d', border: '#22c55e', text: '#86efac' },
    HER: { bg: '#3b0764', border: '#a855f7', text: '#d8b4fe' },
    DIM: { bg: '#451a03', border: '#fbbf24', text: '#fcd34d' },
    tec: { bg: '#451a03', border: '#f59e0b', text: '#fcd34d' },
    edge: '#334155', edgeHover: '#60a5fa',
  },
};

function bmapPal() {
  return document.documentElement.dataset.theme === 'dark' ? BPAL.dark : BPAL.light;
}

function bmapNodeColor(type, prefix) {
  const p = bmapPal();
  if (type === 'tecnica') return p.tec;
  return p[prefix] || p.TEC;
}

// ─── DATA ────────────────────────────────────────────────────────────────────

function bmapConnectedEval(techId) {
  // EV.data[lang] is { tecnicas:[...], evidencias:[...], ... }
  const evData = EV.data[S.lang] || {};
  const all = Object.values(evData).flat();
  return all.filter(e => (e.metac_ids || []).includes(techId));
}

function bmapConnectedTech(evalEntity) {
  return (evalEntity.metac_ids || [])
    .map(id => itemById(id))
    .filter(Boolean);
}

// ─── LAYOUT ──────────────────────────────────────────────────────────────────

const NODE_W   = 200;
const NODE_H   = 38;
const NODE_GAP = 10;
const GROUP_GAP = 22;
const EGO_W    = 220;
const EGO_H    = 50;

function bmapBuild(id, type) {
  const canvas = document.getElementById('bipartiteMapCanvas');
  if (!canvas) return;
  BMAP.canvas = canvas;
  BMAP.ctx = canvas.getContext('2d');

  const data = type === 'tecnica'
    ? itemById(id)
    : evalEntityById(id);

  BMAP.ego = { id, type, data };
  BMAP.hover = null;
  BMAP.groups = [];
  BMAP.allNodes = [];

  // Determine ego side and connected side x positions
  const W = canvas.clientWidth || canvas.width;
  const egoX = type === 'tecnica' ? W * 0.22 : W * 0.78;
  const connX = type === 'tecnica' ? W * 0.72 : W * 0.28;

  // Build groups of connected nodes
  let rawGroups;
  if (type === 'tecnica') {
    const evItems = bmapConnectedEval(id);
    // Group by prefix (entity_type → category)
    const order = ['TEC','INS','HER','DIM'];
    const grouped = {};
    evItems.forEach(e => {
      const pfx = evalEntityPrefix(e.id);
      if (!grouped[pfx]) grouped[pfx] = [];
      grouped[pfx].push(e);
    });
    rawGroups = order
      .filter(pfx => grouped[pfx])
      .map(pfx => ({ prefix: pfx, nodes: grouped[pfx] }));
  } else {
    const techs = bmapConnectedTech(data);
    rawGroups = techs.length ? [{ prefix: 'tec', nodes: techs }] : [];
  }

  if (!rawGroups.length) {
    BMAP.groups = [];
    BMAP.egoPos = { x: egoX, y: (canvas.clientHeight || canvas.height) / 2 };
    return;
  }

  // Compute total height needed
  let totalH = rawGroups.reduce((acc, g) => acc + g.nodes.length * (NODE_H + NODE_GAP) - NODE_GAP + GROUP_GAP, 0) - GROUP_GAP;

  const centerY = (canvas.clientHeight || canvas.height) / 2;
  let curY = centerY - totalH / 2;

  const groups = [];
  const allNodes = [];

  rawGroups.forEach(g => {
    const groupNodes = [];
    g.nodes.forEach(nodeData => {
      const nodeId = nodeData.id;
      const entry = { id: nodeId, data: nodeData, prefix: g.prefix, x: connX, y: curY + NODE_H / 2 };
      groupNodes.push(entry);
      allNodes.push(entry);
      curY += NODE_H + NODE_GAP;
    });
    curY += GROUP_GAP - NODE_GAP;
    groups.push({ prefix: g.prefix, nodes: groupNodes });
  });

  BMAP.groups = groups;
  BMAP.allNodes = allNodes;
  BMAP.egoPos = { x: egoX, y: centerY };

  // Update title + nav
  const titleEl = document.getElementById('bipartiteMapTitle');
  if (titleEl) titleEl.textContent = data?.name || id;
  bmapUpdateNav();
}

// ─── RENDERING ───────────────────────────────────────────────────────────────

function bmapDraw() {
  const canvas = BMAP.canvas;
  if (!canvas) return;
  const ctx = BMAP.ctx;
  const W = canvas.width;
  const H = canvas.height;
  const p = bmapPal();
  const cx = BMAP.camera.x;
  const cy = BMAP.camera.y;

  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = p.bg;
  ctx.fillRect(0, 0, W, H);

  ctx.save();
  ctx.translate(cx, cy);

  const ego = BMAP.ego;
  const ep = BMAP.egoPos;
  if (!ep) { ctx.restore(); return; }

  // Draw edges
  BMAP.allNodes.forEach((node, idx) => {
    const isHover = BMAP.hover === idx;
    ctx.beginPath();
    ctx.moveTo(ep.x, ep.y);
    const cpX = (ep.x + node.x) / 2;
    ctx.bezierCurveTo(cpX, ep.y, cpX, node.y, node.x, node.y);
    ctx.strokeStyle = isHover ? p.edgeHover : p.edge;
    ctx.lineWidth = isHover ? 2 : 1;
    ctx.globalAlpha = isHover ? 0.9 : 0.55;
    ctx.stroke();
    ctx.globalAlpha = 1;
  });

  // Draw group labels
  const dark = document.documentElement.dataset.theme === 'dark';
  const GROUP_LABELS = {
    TEC: () => i('evalCatTec'),
    INS: () => i('evalCatIns'),
    HER: () => i('evalCatHer'),
    DIM: () => i('evalCatDim'),
    tec: () => i('techniques') || 'Técnicas activas',
  };
  BMAP.groups.forEach(g => {
    if (!g.nodes.length) return;
    const firstY = g.nodes[0].y - NODE_H / 2 - 14;
    const gX = g.nodes[0].x;
    const col = bmapNodeColor('eval', g.prefix);
    ctx.fillStyle = col.border;
    ctx.font = '600 10px system-ui,sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const label = GROUP_LABELS[g.prefix] ? GROUP_LABELS[g.prefix]() : g.prefix;
    ctx.fillText(label.toUpperCase(), gX, firstY);
  });

  // Draw connected nodes
  BMAP.allNodes.forEach((node, idx) => {
    const isHover = BMAP.hover === idx;
    const nodeType = ego.type === 'tecnica' ? 'eval' : 'tecnica';
    bmapDrawNode(ctx, node.x, node.y, NODE_W, NODE_H,
      node.data?.name || node.id,
      bmapNodeColor(nodeType, node.prefix),
      isHover, false);
  });

  // Draw ego node (on top)
  bmapDrawNode(ctx, ep.x, ep.y, EGO_W, EGO_H,
    ego.data?.name || ego.id,
    ego.type === 'tecnica' ? p.ego : bmapNodeColor('eval', evalEntityPrefix(ego.id)),
    false, true);

  // Empty state
  if (BMAP.allNodes.length === 0) {
    ctx.fillStyle = p.muted;
    ctx.font = '14px system-ui,sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(i('bipartiteEmpty') || 'Sin conexiones', W / 2, H / 2 + 40);
  }

  ctx.restore();
}

function bmapDrawNode(ctx, x, y, w, h, label, col, isHover, isEgo) {
  const r = 8;
  const bx = x - w / 2;
  const by = y - h / 2;

  if (isHover || isEgo) {
    ctx.shadowColor = col.border;
    ctx.shadowBlur = isEgo ? 16 : 10;
  }

  ctx.beginPath();
  ctx.roundRect(bx, by, w, h, r);
  ctx.fillStyle = isHover
    ? (document.documentElement.dataset.theme === 'dark' ? '#1e293b' : '#f0f9ff')
    : col.bg;
  ctx.fill();
  ctx.strokeStyle = isHover ? col.border : col.border;
  ctx.lineWidth = isEgo ? 2.5 : (isHover ? 2 : 1.5);
  ctx.stroke();
  ctx.shadowBlur = 0;

  ctx.fillStyle = col.text;
  ctx.font = `${isEgo ? 700 : 500} ${isEgo ? '13px' : '12px'} system-ui,sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  const maxW = w - 20;
  let txt = label;
  if (ctx.measureText(txt).width > maxW) {
    while (txt.length > 1 && ctx.measureText(txt + '…').width > maxW) txt = txt.slice(0, -1);
    txt += '…';
  }
  ctx.fillText(txt, x, y);
}

// ─── HIT TESTING ─────────────────────────────────────────────────────────────

function bmapHitNode(px, py) {
  const cx = BMAP.camera.x;
  const cy = BMAP.camera.y;
  const wx = px - cx;
  const wy = py - cy;

  // Check ego
  const ep = BMAP.egoPos;
  if (ep && Math.abs(wx - ep.x) < EGO_W / 2 && Math.abs(wy - ep.y) < EGO_H / 2) {
    return { target: 'ego' };
  }

  // Check connected nodes
  for (let i = 0; i < BMAP.allNodes.length; i++) {
    const n = BMAP.allNodes[i];
    if (Math.abs(wx - n.x) < NODE_W / 2 && Math.abs(wy - n.y) < NODE_H / 2) {
      return { target: 'node', idx: i };
    }
  }
  return null;
}

// ─── ANIMATION LOOP ──────────────────────────────────────────────────────────

function bmapLoop() {
  bmapDraw();
  BMAP.animFrame = requestAnimationFrame(bmapLoop);
}

// ─── NAVIGATION ──────────────────────────────────────────────────────────────

function bmapUpdateNav() {
  const back = document.getElementById('bmapNavBack');
  const fwd  = document.getElementById('bmapNavFwd');
  if (back) { back.disabled = BMAP.navPos <= 0; back.style.display = BMAP.navHistory.length > 1 ? '' : 'none'; }
  if (fwd)  { fwd.disabled  = BMAP.navPos >= BMAP.navHistory.length - 1; fwd.style.display = BMAP.navHistory.length > 1 ? '' : 'none'; }
}

// ─── OPEN / CLOSE ────────────────────────────────────────────────────────────

function openBipartiteMap(id, type) {
  const view = document.getElementById('bipartiteMapView');
  if (!view) return;

  view.style.display = 'flex';
  closeModal();


  BMAP.navHistory = [{ id, type }];
  BMAP.navPos = 0;
  BMAP.camera = { x: 0, y: 0 };
  BMAP.hover = null;

  const canvas = document.getElementById('bipartiteMapCanvas');
  canvas.width  = canvas.clientWidth;
  canvas.height = canvas.clientHeight;

  bmapBuild(id, type);
  cancelAnimationFrame(BMAP.animFrame);
  BMAP.animFrame = requestAnimationFrame(bmapLoop);
}

function closeBipartiteMap() {
  const view = document.getElementById('bipartiteMapView');
  if (view) view.style.display = 'none';
  cancelAnimationFrame(BMAP.animFrame);

}

// ─── EVENTS ──────────────────────────────────────────────────────────────────

function initBipartiteMapEvents() {
  const canvas = document.getElementById('bipartiteMapCanvas');
  if (!canvas) return;

  // Resize
  const ro = new ResizeObserver(() => {
    canvas.width  = canvas.clientWidth;
    canvas.height = canvas.clientHeight;
    // Recompute layout on resize
    if (BMAP.ego) bmapBuild(BMAP.ego.id, BMAP.ego.type);
  });
  ro.observe(canvas);

  // Mouse move → hover
  canvas.addEventListener('mousemove', e => {
    const rect = canvas.getBoundingClientRect();
    const hit = bmapHitNode(e.clientX - rect.left, e.clientY - rect.top);
    const newHover = hit?.target === 'node' ? hit.idx : null;
    if (newHover !== BMAP.hover) BMAP.hover = newHover;
    canvas.style.cursor = (hit && !BMAP.drag) ? 'pointer' : (BMAP.drag ? 'grabbing' : 'grab');
  });

  canvas.addEventListener('mouseleave', () => { BMAP.hover = null; });

  // Click → navigate or open modal
  canvas.addEventListener('click', e => {
    if (BMAP.drag?.moved) return;
    const rect = canvas.getBoundingClientRect();
    const hit = bmapHitNode(e.clientX - rect.left, e.clientY - rect.top);
    if (!hit) return;

    if (hit.target === 'ego') {
      const ego = BMAP.ego;
      if (ego.type === 'tecnica') openModal(ego.id);
      else openEvalModal(ego.id);
    } else {
      const node = BMAP.allNodes[hit.idx];
      // Connected nodes always open their ficha
      if (BMAP.ego.type === 'tecnica') openEvalModal(node.id);
      else openModal(node.id);
    }
  });

  // Drag (pan)
  let panStart = null;
  canvas.addEventListener('pointerdown', e => {
    panStart = { x: e.clientX - BMAP.camera.x, y: e.clientY - BMAP.camera.y, moved: false };
    BMAP.drag = panStart;
    canvas.setPointerCapture(e.pointerId);
  });
  canvas.addEventListener('pointermove', e => {
    if (!panStart) return;
    const dx = e.clientX - panStart.x - BMAP.camera.x;
    const dy = e.clientY - panStart.y - BMAP.camera.y;
    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) panStart.moved = true;
    if (panStart.moved) {
      BMAP.camera.x = e.clientX - panStart.x;
      BMAP.camera.y = e.clientY - panStart.y;
    }
  });
  canvas.addEventListener('pointerup', () => { panStart = null; BMAP.drag = null; });

  // Nav buttons
  document.getElementById('bmapNavBack')?.addEventListener('click', () => {
    if (BMAP.navPos <= 0) return;
    BMAP.navPos--;
    const { id, type } = BMAP.navHistory[BMAP.navPos];
    BMAP.camera = { x: 0, y: 0 };
    bmapBuild(id, type);
  });
  document.getElementById('bmapNavFwd')?.addEventListener('click', () => {
    if (BMAP.navPos >= BMAP.navHistory.length - 1) return;
    BMAP.navPos++;
    const { id, type } = BMAP.navHistory[BMAP.navPos];
    BMAP.camera = { x: 0, y: 0 };
    bmapBuild(id, type);
  });

  // Close
  document.getElementById('bmapCloseBtn')?.addEventListener('click', closeBipartiteMap);
}
