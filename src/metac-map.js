// ─── MAP VIEW ────────────────────────────────────────────────────────────────

const MAP = {
  nodes: [],
  edges: [],
  camera: { x: 0, y: 0, scale: 1 },
  camTarget: null,
  raf: null,
  alpha: 1,
  hover: -1,
  selected: -1,
  selNeighbors: new Map(), // nodeIdx → depth level
  drag: null,
  lastPinchDist: 0,
  lastTapTime: 0,
  viewMode: 'blocks',  // 'blocks' | 'techniques'
  hintShownAt: 0,
  depth: 1,
  selLevel1: new Map(), // nodeIdx → 1 (direct neighbors only)
  gap: 50,
  _prevColorMode: null,
  panelPos: null,
  panelDrag: null,
  panelCollapsed: false,
  panelCollapseManual: false,
  legendPos: null,
  legendDrag: null,
  navHistory: [],   // node IDs visited in the panel
  navPos: -1,       // current position in navHistory
  _navigating: false,
};

const MAP_REPULSION  = 6000;
const MAP_ATTRACTION = 0.016;
const MAP_GRAVITY    = 0.0018;
const MAP_IDEAL_LEN  = 160;
const MAP_DAMPING    = 0.5;
const MAP_COOLING    = 0.977;
const MAP_STOP_ALPHA = 0.004;
const MAP_LABEL_SCALE = 0.7; // min camera scale to show labels

function mapCanvas() { return document.getElementById('mapCanvas'); }

function mapFitAll() {
  const nodes = MAP.nodes;
  if (!nodes || !nodes.length) return;
  const canvas = mapCanvas();
  if (!canvas) return;
  const dpr = window.devicePixelRatio || 1;
  const W = canvas.width / dpr, H = canvas.height / dpr;
  const pad = 40;
  const toolbar = document.querySelector('.map-toolbar');
  const bottomClear = toolbar ? toolbar.offsetHeight + 16 * 2 : 60;
  const availH = H - bottomClear;
  // When a node is selected, fit only the highlighted subset
  const hasSelection = MAP.selected >= 0 && MAP.selNeighbors && MAP.selNeighbors.size;
  const subset = hasSelection
    ? nodes.filter((_, i) => i === MAP.selected || MAP.selNeighbors.has(i))
    : nodes;
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const n of subset) {
    minX = Math.min(minX, n.x - n.r);
    minY = Math.min(minY, n.y - n.r);
    maxX = Math.max(maxX, n.x + n.r);
    maxY = Math.max(maxY, n.y + n.r);
  }
  const bw = maxX - minX, bh = maxY - minY;
  const scale = Math.min(6, Math.max(0.12, Math.min((W - pad * 2) / bw, (availH - pad * 2) / bh)));
  // Shift camera target down in world space so content appears above the toolbar
  const cx = (minX + maxX) / 2;
  const cy = (minY + maxY) / 2 + bottomClear / 2 / scale;
  MAP.camTarget = { x: cx, y: cy, scale };
  if (!MAP.running) { MAP.running = true; requestAnimationFrame(mapTick); }
}

function mapResizeCanvas() {
  const c = mapCanvas();
  if (!c) return;
  const dpr = window.devicePixelRatio || 1;
  const rect = c.getBoundingClientRect();
  c.width  = rect.width  * dpr;
  c.height = rect.height * dpr;
}

function mapWorldToScreen(wx, wy) {
  const c = mapCanvas();
  return {
    x: (wx - MAP.camera.x) * MAP.camera.scale + c.width  / 2,
    y: (wy - MAP.camera.y) * MAP.camera.scale + c.height / 2,
  };
}

function mapHitTest(sx, sy) {
  for (let i = MAP.nodes.length - 1; i >= 0; i--) {
    const n = MAP.nodes[i];
    const s = mapWorldToScreen(n.x, n.y);
    const r = (n.r + 3) * MAP.camera.scale;
    if ((sx - s.x) ** 2 + (sy - s.y) ** 2 <= r * r) return i;
  }
  return -1;
}

function mapPanelMargin() {
  return window.matchMedia('(max-width: 600px)').matches ? 12 : 16;
}

function mapPanelBottomClear() {
  const toolbar = document.querySelector('.map-toolbar');
  return toolbar ? toolbar.offsetHeight + 32 : 60;
}

function mapPreparePanelForPositioning() {
  const panel = document.getElementById('mapNodePanel');
  const view  = document.getElementById('mapView');
  if (!panel || !view) return false;
  const margin   = mapPanelMargin();
  const viewRect = view.getBoundingClientRect();
  const maxWidth = Math.max(160, viewRect.width - margin * 2);
  const isMobile = window.matchMedia('(max-width: 600px)').matches;
  const targetWidth = MAP.panelCollapsed
    ? Math.min(isMobile ? 320 : 280, maxWidth)
    : isMobile ? maxWidth : 280;
  panel.style.width  = Math.min(targetWidth, maxWidth) + 'px';
  panel.style.right  = 'auto';
  panel.style.bottom = 'auto';
  return true;
}

function mapClampPanelPosition(left, top) {
  const panel = document.getElementById('mapNodePanel');
  const view  = document.getElementById('mapView');
  if (!panel || !view) return { left: 0, top: 0 };
  const margin   = mapPanelMargin();
  const viewRect = view.getBoundingClientRect();
  const rect     = panel.getBoundingClientRect();
  const maxLeft  = Math.max(margin, viewRect.width - rect.width - margin);
  const maxTop   = Math.max(margin, viewRect.height - rect.height - mapPanelBottomClear());
  return {
    left: Math.min(Math.max(left, margin), maxLeft),
    top:  Math.min(Math.max(top,  margin), maxTop),
  };
}

function mapMovePanelTo(left, top, remember = true) {
  const panel = document.getElementById('mapNodePanel');
  if (!panel || !mapPreparePanelForPositioning()) return null;
  const pos = mapClampPanelPosition(left, top);
  panel.style.left = pos.left + 'px';
  panel.style.top  = pos.top  + 'px';
  if (remember) MAP.panelPos = pos;
  return pos;
}

function mapDefaultPanelPosition(idx) {
  const panel = document.getElementById('mapNodePanel');
  const view  = document.getElementById('mapView');
  if (!panel || !view) return { left: 16, top: 16 };

  const viewRect = view.getBoundingClientRect();
  const rect     = panel.getBoundingClientRect();
  const margin   = mapPanelMargin();
  const nd       = MAP.nodes[idx];
  let sx = viewRect.width / 2;
  let sy = viewRect.height / 2;

  if (nd) {
    const dpr = window.devicePixelRatio || 1;
    const p   = mapWorldToScreen(nd.x, nd.y);
    sx = p.x / dpr;
    sy = p.y / dpr;
  }

  const gap = 24;
  let left;
  let top;
  if (window.matchMedia('(max-width: 600px)').matches) {
    left = margin;
    top  = sy > viewRect.height / 2 ? sy - rect.height - gap : sy + gap;
  } else {
    left = viewRect.width - rect.width - margin;
    top  = sy - rect.height / 2;
  }
  return mapClampPanelPosition(left, top);
}

function mapPlacePanel(idx) {
  if (!mapPreparePanelForPositioning()) return;
  const pos = MAP.panelPos ? mapClampPanelPosition(MAP.panelPos.left, MAP.panelPos.top) : mapDefaultPanelPosition(idx);
  mapMovePanelTo(pos.left, pos.top, Boolean(MAP.panelPos));
}

function mapClampLegendPosition(left, top) {
  const legend = document.getElementById('mapLegend');
  const view   = document.getElementById('mapView');
  if (!legend || !view) return { left: 10, top: 10 };
  const margin   = window.matchMedia('(max-width: 600px)').matches ? 8 : 10;
  const viewRect = view.getBoundingClientRect();
  const rect     = legend.getBoundingClientRect();
  const maxLeft  = Math.max(margin, viewRect.width - rect.width - margin);
  const maxTop   = Math.max(margin, viewRect.height - rect.height - mapPanelBottomClear());
  return {
    left: Math.min(Math.max(left, margin), maxLeft),
    top:  Math.min(Math.max(top,  margin), maxTop),
  };
}

function mapMoveLegendTo(left, top, remember = true) {
  const legend = document.getElementById('mapLegend');
  if (!legend) return null;
  legend.style.right  = 'auto';
  legend.style.bottom = 'auto';
  const pos = mapClampLegendPosition(left, top);
  legend.style.left = pos.left + 'px';
  legend.style.top  = pos.top  + 'px';
  if (remember) MAP.legendPos = pos;
  return pos;
}

function mapPlaceLegend() {
  const legend = document.getElementById('mapLegend');
  if (!legend || legend.style.display === 'none') return;
  const pos = MAP.legendPos || { left: 10, top: 10 };
  mapMoveLegendTo(pos.left, pos.top, Boolean(MAP.legendPos));
}

function initMapBlocks() {
  MAP.viewMode     = 'blocks';
  MAP.selected     = -1;
  MAP.selNeighbors = new Map();
  MAP.hover        = -1;
  MAP.alpha        = 0.4;
  MAP.camera       = { x: 0, y: 0, scale: 1 };
  MAP.camTarget    = null;
  mapHidePanel();

  // Gather blocks from the full dataset (ignoring current block filter)
  const allData = S.data[S.lang] || [];
  const blockMap = new Map();
  allData.forEach(item => {
    item.blockIds.forEach((bid, bi) => {
      if (!blockMap.has(bid)) {
        // Use the first field color of the most-common field in this block
        const existing = blockMap.get(bid);
        blockMap.set(bid, {
          id: bid,
          label: item.blocks[bi],
          description: blockDescription(bid) || '',
          count: 0,
          colorIdx: item.fieldIds.length > 0 ? fieldColorIdx(item.fields[0]) : -1,
        });
      }
      blockMap.get(bid).count++;
    });
  });

  // Determine dominant field color per block
  const blockFieldCount = new Map(); // blockId → Map(fieldColorIdx → count)
  allData.forEach(item => {
    item.blockIds.forEach(bid => {
      if (!blockFieldCount.has(bid)) blockFieldCount.set(bid, new Map());
      const fm = blockFieldCount.get(bid);
      item.fieldIds.forEach(fid => {
        const ci = fieldColorIdx(item.fields[item.fieldIds.indexOf(fid)]);
        fm.set(ci, (fm.get(ci) || 0) + 1);
      });
    });
  });
  blockMap.forEach((b, bid) => {
    const fm = blockFieldCount.get(bid);
    if (fm && fm.size > 0) {
      b.colorIdx = [...fm.entries()].sort((a, b) => b[1] - a[1])[0][0];
    }
  });

  const blocks = [...blockMap.values()].sort((a, b) => alphaByLabel(a.label, b.label));
  const n = blocks.length;
  const spread = Math.max(160, 60 * Math.sqrt(n));

  MAP.nodes = blocks.map((b, i) => {
    const angle = (2 * Math.PI * i / n) - Math.PI / 2;
    return {
      id:       b.id,
      name:     b.label,
      summary:  b.description,
      count:    b.count,
      x: spread * Math.cos(angle) + (Math.random() - 0.5) * 20,
      y: spread * Math.sin(angle) + (Math.random() - 0.5) * 20,
      vx: 0, vy: 0,
      r: 44,
      colorIdx: b.colorIdx,
      type: 'block',
    };
  });
  MAP.edges = [];

  mapUpdateInfo();
  updateMapLegend();
}

function initMapData() {
  MAP.navHistory = []; MAP.navPos = -1; mapUpdateNavBtns();
  MAP.viewMode     = 'techniques';
  const rows = filteredData().map(r => r.item)
    .sort((a, b) => alphaByLabel(a.name, b.name));
  const idxById = new Map();

  // Spread initial positions grouped by block
  const blockAngles = new Map();
  const blockList = [...new Set(rows.flatMap(item => item.blockIds))];
  blockList.forEach((bid, i) =>
    blockAngles.set(bid, (2 * Math.PI * i) / Math.max(1, blockList.length)));

  const spread = Math.max(200, 30 * Math.sqrt(rows.length));

  MAP.nodes = rows.map((item, i) => {
    idxById.set(item.id, i);
    const blockId = item.blockIds[0];
    const base = blockAngles.get(blockId) ?? (2 * Math.PI * i / rows.length);
    const angle = base + (Math.random() - 0.5) * 0.9;
    const dist  = spread * (0.4 + Math.random() * 0.7);
    return {
      id:       item.id,
      name:     item.name,
      summary:  item.summary,
      x: dist * Math.cos(angle),
      y: dist * Math.sin(angle),
      vx: 0, vy: 0,
      r: 10,
      colorIdx: item.fieldIds.length > 0 ? fieldColorIdx(item.fields[0]) : -1,
      blockColorIdx: item.blockIds.length > 0 ? blockColorIdxById(item.blockIds[0]) : -1,
    };
  });

  // Build undirected edges (deduplicated)
  MAP.edges = [];
  const seen = new Set();
  rows.forEach((item, i) => {
    (item.related || []).forEach(relId => {
      const j = idxById.get(relId);
      if (j === undefined) return;
      const key = i < j ? `${i}_${j}` : `${j}_${i}`;
      if (!seen.has(key)) { seen.add(key); MAP.edges.push({ a: i, b: j }); }
    });
  });

  // Size by degree (hub nodes are larger)
  const degree = new Array(MAP.nodes.length).fill(0);
  MAP.edges.forEach(e => { degree[e.a]++; degree[e.b]++; });
  MAP.nodes.forEach((n, i) => { n.r = 8 + Math.min(degree[i] * 2.5, 16); });

  MAP.alpha        = 1;
  MAP.camera       = { x: 0, y: 0, scale: 1 };
  MAP.camTarget    = null;
  MAP.hover        = -1;
  MAP.selected     = -1;
  MAP.selNeighbors = new Map();
  mapHidePanel();
  mapUpdateInfo();
  updateMapLegend();
}

function mapTick() {
  const { nodes, edges } = MAP;
  const n = nodes.length;

  // Repulsion (all pairs)
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      let dx = nodes[j].x - nodes[i].x;
      let dy = nodes[j].y - nodes[i].y;
      const d2 = dx * dx + dy * dy || 0.01;
      const d  = Math.sqrt(d2);
      const f  = (MAP_REPULSION * MAP.alpha) / d2;
      dx /= d; dy /= d;
      nodes[i].vx -= dx * f; nodes[i].vy -= dy * f;
      nodes[j].vx += dx * f; nodes[j].vy += dy * f;
    }
  }

  // Edge spring attraction
  edges.forEach(({ a, b }) => {
    const na = nodes[a], nb = nodes[b];
    const dx = nb.x - na.x, dy = nb.y - na.y;
    const d  = Math.sqrt(dx * dx + dy * dy) || 0.01;
    const f  = (d - MAP_IDEAL_LEN) * MAP_ATTRACTION;
    const ux = dx / d, uy = dy / d;
    na.vx += ux * f; na.vy += uy * f;
    nb.vx -= ux * f; nb.vy -= uy * f;
  });

  // Collision separation (O(n²))
  {
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        const ni = nodes[i], nj = nodes[j];
        const dx = nj.x - ni.x, dy = nj.y - ni.y;
        const d2 = dx * dx + dy * dy || 0.01;
        const minD = ni.r + nj.r + MAP.gap;
        if (d2 < minD * minD) {
          const d   = Math.sqrt(d2);
          const push = (minD - d) / d * 0.55;
          ni.vx -= dx * push; ni.vy -= dy * push;
          nj.vx += dx * push; nj.vy += dy * push;
        }
      }
    }
  }

  // Gravity toward center
  nodes.forEach(nd => {
    nd.vx -= nd.x * MAP_GRAVITY;
    nd.vy -= nd.y * MAP_GRAVITY;
  });

  // Integrate + damp
  nodes.forEach(nd => {
    nd.vx *= MAP_DAMPING; nd.vy *= MAP_DAMPING;
    nd.x  += nd.vx;      nd.y  += nd.vy;
  });

  MAP.alpha *= MAP_COOLING;
}

function mapDraw() {
  const canvas = mapCanvas();
  if (!canvas) return;
  const ctx  = canvas.getContext('2d');
  const w    = canvas.width, h = canvas.height;
  const cam  = MAP.camera;
  const dark = document.documentElement.getAttribute('data-theme') === 'dark';

  const zoomEl = document.getElementById('mapZoomLevel');
  if (zoomEl) zoomEl.textContent = Math.round(cam.scale * 100) + '%';

  ctx.clearRect(0, 0, w, h);
  ctx.save();
  ctx.translate(w / 2, h / 2);
  ctx.scale(cam.scale, cam.scale);
  ctx.translate(-cam.x, -cam.y);

  // Color mode: 'depth', 'field', or 'block'. 'depth' requires a selected node.
  const effectiveColorMode = S.mapColorMode;

  // Edges — two passes: background first, highlighted on top
  const sel  = MAP.selected;
  const hov  = MAP.hover;
  const neigh = MAP.selNeighbors;

  // Pass 1: background / hover edges
  MAP.edges.forEach(({ a, b, ghost: ghostEdge }) => {
    if (a >= MAP.nodes.length || b >= MAP.nodes.length) return;
    const aInSub = a === sel || neigh.has(a);
    const bInSub = b === sel || neigh.has(b);
    const isHighEdge = sel >= 0 && aInSub && bInSub;
    if (isHighEdge || ghostEdge) return; // drawn in pass 2
    const isHovEdge = hov >= 0 && sel < 0 && (a === hov || b === hov);
    ctx.beginPath();
    ctx.moveTo(MAP.nodes[a].x, MAP.nodes[a].y);
    ctx.lineTo(MAP.nodes[b].x, MAP.nodes[b].y);
    ctx.setLineDash([]);
    ctx.lineWidth   = isHovEdge ? 1.5 / cam.scale : 0.7 / cam.scale;
    ctx.strokeStyle = isHovEdge
      ? (dark ? 'rgba(148,163,184,0.85)' : 'rgba(37,99,235,0.55)')
      : sel >= 0
        ? (dark ? 'rgba(100,116,139,0.15)' : 'rgba(148,163,184,0.18)')
        : (dark ? 'rgba(148,163,184,0.55)' : 'rgba(100,116,139,0.5)');
    ctx.stroke();
  });

  // Pass 2: highlighted edges drawn on top so they're always visible
  MAP.edges.forEach(({ a, b, ghost: ghostEdge }) => {
    if (a >= MAP.nodes.length || b >= MAP.nodes.length) return;
    const aInSub = a === sel || neigh.has(a);
    const bInSub = b === sel || neigh.has(b);
    const isHighEdge = sel >= 0 && aInSub && bInSub;
    if (!isHighEdge && !ghostEdge) return;
    const isSelEdge = a === sel || b === sel;
    ctx.beginPath();
    ctx.moveTo(MAP.nodes[a].x, MAP.nodes[a].y);
    ctx.lineTo(MAP.nodes[b].x, MAP.nodes[b].y);
    if (ghostEdge || isSelEdge) {
      ctx.setLineDash([]);
      ctx.lineWidth   = 2 / cam.scale;
      ctx.strokeStyle = dark ? 'rgba(148,163,184,0.95)' : 'rgba(37,99,235,0.75)';
    } else {
      ctx.setLineDash([]);
      ctx.lineWidth   = 1.5 / cam.scale;
      ctx.strokeStyle = dark ? 'rgba(148,163,184,0.55)' : 'rgba(37,99,235,0.35)';
    }
    ctx.stroke();
    ctx.setLineDash([]);
  });

  // Nodes
  MAP.nodes.forEach((nd, i) => {
    const isSel   = i === sel;
    const isNeigh = MAP.selNeighbors.has(i);
    const isHov   = i === hov;
    const dimmed  = sel >= 0 && !isSel && !isNeigh && !nd.ghost;
    const isBlock = nd.type === 'block';
    let col;
    if (effectiveColorMode === 'depth' && (isSel || isNeigh) && !isBlock) {
      if (isSel) col = MAP_SEL_DEPTH_COLOR;
      else { const d = MAP.selNeighbors.get(i) ?? 1; col = MAP_DEPTH_COLORS[Math.min(d - 1, MAP_DEPTH_COLORS.length - 1)]; }
    } else if (effectiveColorMode === 'block' && !isBlock) {
      col = nd.blockColorIdx >= 0 ? COLORS[nd.blockColorIdx] : { bg: dark ? '#1e293b' : '#f1f5f9', text: '#64748b', border: '#e2e8f0' };
    } else {
      col = nd.colorIdx >= 0 ? COLORS[nd.colorIdx] : { bg: dark ? '#1e293b' : '#f1f5f9', text: '#64748b', border: '#e2e8f0' };
    }

    ctx.globalAlpha = dimmed ? 0.15 : 1;

    if (isSel || isBlock && isHov) {
      ctx.shadowColor = col.text + 'cc'; ctx.shadowBlur = 20 / cam.scale;
    } else if (isHov && sel < 0) {
      ctx.shadowColor = col.text + '88'; ctx.shadowBlur = 14 / cam.scale;
    }

    const r = isSel ? nd.r * 1.15 : nd.r;
    ctx.beginPath();
    ctx.arc(nd.x, nd.y, r, 0, Math.PI * 2);

    if (isBlock) {
      ctx.fillStyle   = dark ? col.border : col.bg;
      ctx.fill();
      ctx.lineWidth   = (isHov ? 3 : 2) / cam.scale;
      ctx.strokeStyle = dark ? col.border : col.text;
      ctx.setLineDash([]);
    } else if (nd.ghost) {
      ctx.fillStyle   = dark ? col.border : col.bg;
      ctx.fill();
      ctx.lineWidth   = (isHov ? 2.2 : 1.2) / cam.scale;
      ctx.strokeStyle = isHov ? (dark ? col.border : col.text) : col.border;
      ctx.setLineDash([]);
    } else {
      ctx.fillStyle   = dark ? col.border : col.bg;
      ctx.fill();
      ctx.lineWidth   = (isSel ? 2.8 : isHov ? 2.2 : 1.2) / cam.scale;
      ctx.strokeStyle = (isSel || isHov) ? (dark ? col.border : col.text) : col.border;
      ctx.setLineDash([]);
    }
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.shadowBlur  = 0;

    // Block node: draw label inside + count badge
    if (isBlock) {
      const maxW   = r * 1.6;
      const fsName = Math.max(10, Math.min(15, r * 0.32)) / cam.scale;
      const fsCnt  = Math.max(9, Math.min(12, r * 0.24)) / cam.scale;
      ctx.textAlign    = 'center';
      ctx.textBaseline = 'middle';

      // Wrap block name into 2 lines if needed
      ctx.font      = `700 ${fsName}px -apple-system,BlinkMacSystemFont,sans-serif`;
      ctx.fillStyle = dark ? '#f1f5f9' : col.text;
      const words   = nd.name.split(' ');
      let lines     = [''], li = 0;
      words.forEach(w => {
        const test = lines[li] + (lines[li] ? ' ' : '') + w;
        if (ctx.measureText(test).width > maxW && lines[li]) { li++; lines[li] = w; }
        else lines[li] = test;
      });
      lines = lines.slice(0, 3);
      const lineH  = fsName * 1.25;
      const totalH = lines.length * lineH + fsCnt * 1.5;
      const startY = nd.y - totalH / 2 + lineH / 2;
      lines.forEach((ln, li2) => ctx.fillText(ln, nd.x, startY + li2 * lineH));

      // Count
      ctx.font      = `500 ${fsCnt}px -apple-system,BlinkMacSystemFont,sans-serif`;
      ctx.fillStyle = dark ? '#94a3b8' : col.text + 'bb';
      ctx.fillText(`${nd.count} recursos`, nd.x, startY + lines.length * lineH + fsCnt * 0.4);
    }

    ctx.globalAlpha = 1;
  });

  // Labels for technique nodes: zoomed in enough OR hovered OR selected/neighbor
  const showAllLabels = cam.scale >= MAP_LABEL_SCALE;
  MAP.nodes.forEach((nd, i) => {
    if (nd.type === 'block') return;
    const hover   = i === hov;
    const isSel    = i === sel;
    const isNeigh  = MAP.selNeighbors.has(i);
    const isLevel1 = MAP.selLevel1.has(i);
    const dimmed   = sel >= 0 && !isSel && !isNeigh && !nd.ghost;
    // Show label only for level-1 neighbors (not deeper levels, to avoid clutter)
    if (!showAllLabels && !hover && !isSel && !isLevel1 && !nd.ghost) return;
    if (dimmed) return;

    let col;
    if (effectiveColorMode === 'depth' && (isSel || isNeigh)) {
      if (isSel) col = MAP_SEL_DEPTH_COLOR;
      else { const d = MAP.selNeighbors.get(i) ?? 1; col = MAP_DEPTH_COLORS[Math.min(d - 1, MAP_DEPTH_COLORS.length - 1)]; }
    } else if (effectiveColorMode === 'block' && nd.type !== 'block') {
      col = nd.blockColorIdx >= 0 ? COLORS[nd.blockColorIdx] : { text: '#64748b', bg: '#f1f5f9', border: '#e2e8f0' };
    } else {
      col = nd.colorIdx >= 0 ? COLORS[nd.colorIdx] : { text: '#64748b', bg: '#f1f5f9', border: '#e2e8f0' };
    }
    const prominent = hover || isSel;
    const maxChars  = prominent ? 30 : 20;
    const label     = nd.name.length > maxChars ? nd.name.slice(0, maxChars) + '…' : nd.name;
    const fs        = prominent ? Math.max(11, Math.min(14, nd.r * 1.1)) : Math.max(9, Math.min(12, nd.r));
    const r2        = isSel ? nd.r * 1.2 : nd.r;
    const gap       = (r2 + 3) / cam.scale;

    ctx.font         = `${prominent ? 600 : 400} ${fs / cam.scale}px -apple-system,BlinkMacSystemFont,sans-serif`;
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'top';

    if (prominent) {
      const tw = ctx.measureText(label).width;
      const ph = (fs + 4) / cam.scale;
      const pw = tw + 12 / cam.scale;
      const px = nd.x - pw / 2;
      const py = nd.y + gap;
      ctx.fillStyle   = dark ? 'rgba(15,23,42,0.92)' : 'rgba(255,255,255,0.95)';
      ctx.strokeStyle = col.border;
      ctx.lineWidth   = 1 / cam.scale;
      const rr = 4 / cam.scale;
      ctx.beginPath();
      if (ctx.roundRect) { ctx.roundRect(px, py, pw, ph, rr); } else { ctx.rect(px, py, pw, ph); }
      ctx.fill(); ctx.stroke();
      ctx.fillStyle = dark ? '#f1f5f9' : '#1e293b';
    } else {
      ctx.fillStyle = dark ? '#94a3b8' : '#475569';
    }

    ctx.fillText(label, nd.x, nd.y + gap + (prominent ? 2 / cam.scale : 0));
  });

  ctx.restore();
}

function mapLerpCamera() {
  if (!MAP.camTarget) return;
  const t = MAP.camTarget;
  const eps = 0.001;
  MAP.camera.x     += (t.x     - MAP.camera.x)     * 0.12;
  MAP.camera.y     += (t.y     - MAP.camera.y)     * 0.12;
  MAP.camera.scale += (t.scale - MAP.camera.scale) * 0.12;
  if (Math.abs(t.x - MAP.camera.x) < eps &&
      Math.abs(t.y - MAP.camera.y) < eps &&
      Math.abs(t.scale - MAP.camera.scale) < eps * 0.1) {
    MAP.camera = { ...t };
    MAP.camTarget = null;
  }
}

function mapLoop() {
  if (MAP.alpha > MAP_STOP_ALPHA) mapTick();
  mapLerpCamera();
  mapDraw();
  MAP.raf = requestAnimationFrame(mapLoop);
}

function mapStart() {
  if (MAP.raf) cancelAnimationFrame(MAP.raf);
  MAP.raf = requestAnimationFrame(mapLoop);
}

function mapStop() {
  if (MAP.raf) { cancelAnimationFrame(MAP.raf); MAP.raf = null; }
}

function mapUpdateInfo() {
  const el   = document.getElementById('mapInfo');
  const hint = document.getElementById('mapHint');
  if (el) {
    if (MAP.viewMode === 'blocks') {
      el.textContent = `${MAP.nodes.length} ${i('mapBlocks')}`;
    } else {
      el.textContent = `${MAP.nodes.length} ${i('mapNodes')}`;
    }
  }
}

function updateMapLegend() {
  const legend  = document.getElementById('mapLegend');
  const title   = document.getElementById('mapLegendTitle');
  const body    = document.getElementById('mapLegendBody');
  const modeBtn = document.getElementById('mapColorModeBtn');
  if (!legend) return;

  legend.style.display = S.mapLegendVisible && S.mapMode ? '' : 'none';
  if (!S.mapLegendVisible || !S.mapMode) return;

  const hasSelection = MAP.selected >= 0 && MAP.depth >= 2;
  const effectiveMode = (S.mapColorMode === 'depth' && MAP.selected < 0) ? 'field' : S.mapColorMode;

  const modeOrder = ['field', 'block', 'depth'];
  const modeLabel = { field: i('mapColorField'), block: i('mapColorBlock'), depth: i('mapColorDepth') };

  const dropdown  = document.getElementById('mapColorDropdown');
  const colorLabel = document.getElementById('mapColorLabel');
  const showBtn = MAP.viewMode === 'techniques';
  const colorRow = document.getElementById('mapColorRow');
  if (colorRow) colorRow.style.display = showBtn ? '' : 'none';
  if (colorLabel) colorLabel.textContent = i('mapColorLabel');
  if (modeBtn) {
    modeBtn.innerHTML = `${esc(modeLabel[effectiveMode])} <span style="font-size:.6rem">▾</span>`;
    modeBtn.title     = i('mapColorTip');
  }
  if (dropdown) {
    const availableModes = hasSelection ? modeOrder : modeOrder.filter(m => m !== 'depth');
    dropdown.innerHTML = availableModes.map(m => `
      <button class="map-color-dropdown-item${effectiveMode === m ? ' active' : ''}" data-mode="${m}">
        <span class="map-color-dropdown-check">${effectiveMode === m ? '✓' : ''}</span>
        ${esc(modeLabel[m])}
      </button>
    `).join('');
    dropdown.querySelectorAll('[data-mode]').forEach(btn => {
      btn.addEventListener('click', e => {
        e.stopPropagation();
        S.mapColorMode = btn.dataset.mode;
        localStorage.setItem('metac_map_color_v1', S.mapColorMode);
        dropdown.style.display = 'none';
        updateMapLegend();
      });
    });
  }
  if (title) { title.textContent = showBtn ? '' : modeLabel[effectiveMode]; }
  if (!body) return;
  body.innerHTML = '';

  if (effectiveMode === 'depth' && MAP.selected >= 0) {
    const mkEntry = (col, label) => {
      const e = document.createElement('div');
      e.className = 'map-legend-entry';
      e.innerHTML = `<span class="map-legend-swatch" style="background:${col.bg};border-color:${col.border}"></span><span>${esc(label)}</span>`;
      body.appendChild(e);
    };
    mkEntry(MAP_SEL_DEPTH_COLOR, i('mapSelected'));
    for (let d = 1; d <= MAP.depth; d++)
      mkEntry(MAP_DEPTH_COLORS[Math.min(d - 1, MAP_DEPTH_COLORS.length - 1)], i('mapDepth') + ' ' + d);
  } else if (effectiveMode === 'block') {
    // Block mode: one entry per unique block present in visible nodes
    const seen = new Map(); // blockColorIdx → blockLabel
    MAP.nodes.forEach(nd => {
      if (nd.ghost || nd.type === 'block' || nd.blockColorIdx < 0) return;
      if (!seen.has(nd.blockColorIdx)) {
        const item = itemById(nd.id);
        if (item && item.blocks.length > 0) seen.set(nd.blockColorIdx, item.blocks[0]);
      }
    });
    [...seen.entries()].sort((a, b) => alphaByLabel(a[1], b[1])).forEach(([ci, name]) => {
      const col = COLORS[ci];
      const e = document.createElement('div');
      e.className = 'map-legend-entry';
      e.innerHTML = `<span class="map-legend-swatch" style="background:${col.bg};border-color:${col.border}"></span><span title="${esc(name)}">${esc(name)}</span>`;
      body.appendChild(e);
    });
  } else {
    if (MAP.viewMode === 'blocks') {
      MAP.nodes
        .filter(nd => nd.type === 'block' && nd.colorIdx >= 0)
        .sort((a, b) => alphaByLabel(a.name, b.name))
        .forEach(nd => {
          const col = COLORS[nd.colorIdx];
          const e = document.createElement('div');
          e.className = 'map-legend-entry';
          e.innerHTML = `<span class="map-legend-swatch" style="background:${col.bg};border-color:${col.border}"></span><span title="${esc(nd.name)}">${esc(nd.name)}</span>`;
          body.appendChild(e);
        });
      mapPlaceLegend();
      return;
    }

    // Field mode: collect unique fields from current visible nodes
    const seen = new Map(); // colorIdx → fieldName
    MAP.nodes.forEach(nd => {
      if (nd.ghost || nd.type === 'block' || nd.colorIdx < 0) return;
      if (!seen.has(nd.colorIdx)) {
        const item = itemById(nd.id);
        if (item && item.fields.length > 0) seen.set(nd.colorIdx, item.fields[0]);
      }
    });
    [...seen.entries()].sort((a, b) => alphaByLabel(a[1], b[1])).forEach(([ci, name]) => {
      const col = COLORS[ci];
      const e = document.createElement('div');
      e.className = 'map-legend-entry';
      e.innerHTML = `<span class="map-legend-swatch" style="background:${col.bg};border-color:${col.border}"></span><span title="${esc(name)}">${esc(name)}</span>`;
      body.appendChild(e);
    });
  }
  mapPlaceLegend();
}

function mapBuildNeighbors(rootIdx, depth) {
  const depthMap = new Map(); // nodeIdx → depth level
  depthMap.set(rootIdx, 0);
  let frontier = [rootIdx];
  for (let d = 1; d <= depth; d++) {
    const next = [];
    frontier.forEach(ni => {
      MAP.edges.forEach(({ a, b }) => {
        const other = a === ni ? b : b === ni ? a : -1;
        if (other >= 0 && !depthMap.has(other)) { depthMap.set(other, d); next.push(other); }
      });
    });
    frontier = next;
    if (!frontier.length) break;
  }
  depthMap.delete(rootIdx);
  return depthMap;
}

function mapSetDepth(d) {
  const MAX = 6;
  MAP.depth = Math.max(1, Math.min(MAX, d));
  if (MAP.selected >= 0) {
    MAP.selLevel1    = mapBuildNeighbors(MAP.selected, 1);
    MAP.selNeighbors = mapBuildNeighbors(MAP.selected, MAP.depth);
  }
  const label = document.getElementById('mapDepthLabel');
  const minus = document.getElementById('mapDepthMinus');
  const plus  = document.getElementById('mapDepthPlus');
  if (label) label.textContent = MAP.depth;
  if (minus) minus.disabled = MAP.depth <= 1;
  if (plus)  plus.disabled  = MAP.depth >= MAX;
  MAP.alpha = Math.max(MAP.alpha, 0.05);
  updateMapLegend();
}

function mapRemoveGhosts() {
  const first = MAP.nodes.findIndex(n => n.ghost);
  if (first < 0) return;
  MAP.nodes  = MAP.nodes.slice(0, first);
  MAP.edges  = MAP.edges.filter(e => !e.ghost && e.a < first && e.b < first);
}

function mapUpdateNavBtns() {
  const back = document.getElementById('mapNavBack');
  const fwd  = document.getElementById('mapNavFwd');
  const show = MAP.navHistory.length > 1;
  if (back) { back.style.display = show ? '' : 'none'; back.disabled = MAP.navPos <= 0; }
  if (fwd)  { fwd.style.display  = show ? '' : 'none'; fwd.disabled  = MAP.navPos >= MAP.navHistory.length - 1; }
}

function mapNavBack() {
  if (MAP.navPos <= 0) return;
  MAP.navPos--;
  const id  = MAP.navHistory[MAP.navPos];
  const idx = MAP.nodes.findIndex(n => n.id === id);
  if (idx >= 0) { MAP._navigating = true; mapSelectNode(idx); MAP._navigating = false; }
  mapUpdateNavBtns();
}

function mapNavFwd() {
  if (MAP.navPos >= MAP.navHistory.length - 1) return;
  MAP.navPos++;
  const id  = MAP.navHistory[MAP.navPos];
  const idx = MAP.nodes.findIndex(n => n.id === id);
  if (idx >= 0) { MAP._navigating = true; mapSelectNode(idx); MAP._navigating = false; }
  mapUpdateNavBtns();
}

function mapSelectNode(idx) {
  mapRemoveGhosts();
  if (idx < 0) {
    if (MAP._prevColorMode) { S.mapColorMode = MAP._prevColorMode; MAP._prevColorMode = null; updateMapLegend(); }
    MAP.selected     = -1;
    MAP.selNeighbors = new Map();
    mapHidePanel();
    updateURL();
    return;
  }
  if (MAP.selected < 0) MAP._prevColorMode = S.mapColorMode;
  S.mapColorMode = 'depth';
  MAP.selected     = idx;
  MAP.selNeighbors = new Map();

  // Push to navigation history (skip when navigating via back/forward)
  if (!MAP._navigating) {
    MAP.navHistory = MAP.navHistory.slice(0, MAP.navPos + 1);
    MAP.navHistory.push(MAP.nodes[idx].id);
    MAP.navPos = MAP.navHistory.length - 1;
  }
  mapUpdateNavBtns();

  const nd   = MAP.nodes[idx];
  const item = itemById(nd.id);

  // Add ghost nodes for related items not currently in the map
  if (item) {
    const existingIds = new Set(MAP.nodes.map(n => n.id));
    const missing = (item.related || [])
      .filter(rid => !existingIds.has(rid))
      .map(rid => itemById(rid))
      .filter(Boolean);

    missing.forEach((rel, i) => {
      const angle = (2 * Math.PI * i / Math.max(1, missing.length)) - Math.PI / 2;
      const dist  = 130;
      const gi    = MAP.nodes.length;
      MAP.nodes.push({
        id:       rel.id,
        name:     rel.name,
        summary:  rel.summary,
        x: nd.x + dist * Math.cos(angle) + (Math.random() - 0.5) * 20,
        y: nd.y + dist * Math.sin(angle) + (Math.random() - 0.5) * 20,
        vx: 0, vy: 0,
        r: 9,
        colorIdx: rel.fieldIds.length > 0 ? fieldColorIdx(rel.fields[0]) : -1,
        blockColorIdx: rel.blockIds.length > 0 ? blockColorIdxById(rel.blockIds[0]) : -1,
        ghost: true,
      });
      MAP.edges.push({ a: idx, b: gi, ghost: true });
    });
  }

  // Level-1 neighbors (always, regardless of depth — used for label visibility)
  MAP.selLevel1    = mapBuildNeighbors(idx, 1);
  // Full neighbor set at current depth (depth persists between selections)
  MAP.selNeighbors = mapBuildNeighbors(idx, MAP.depth);

  MAP.camTarget = { x: nd.x, y: nd.y, scale: Math.max(MAP.camera.scale, 0.9) };
  mapShowPanel(idx);
  updateMapLegend();
  updateURL();
}

function mapShowPanel(idx) {
  const nd   = MAP.nodes[idx];
  const item = itemById(nd.id);
  if (!item) return;

  document.getElementById('mapPanelName').textContent    = item.name;
  document.getElementById('mapPanelSummary').textContent = item.summary || '';
  document.getElementById('mapPanelSummary').style.display = item.summary ? '' : 'none';

  // Clickable field + block badges
  const badgesEl = document.getElementById('mapPanelBadges');
  badgesEl.innerHTML = '';

  item.blocks
    .map((label, idx) => ({ label, id: item.blockIds[idx] }))
    .sort((a, b) => alphaByLabel(a.label, b.label))
    .forEach(({ label: bLabel, id: blockId }) => {
      const btn = document.createElement('button');
      btn.className = 'block-badge map-filter-badge';
      btn.textContent = bLabel;
      btn.title = i('mapClickBlock');
      btn.addEventListener('click', e => {
        e.stopPropagation();
        S.block = blockId; S.field = null; S.page = 0;
        renderBlockTabs(); renderTabs();
        mapSelectNode(-1);
        initMapData();
      });
      badgesEl.appendChild(btn);
    });

  item.fields
    .map((label, idx) => ({ label, id: item.fieldIds[idx] }))
    .sort((a, b) => alphaByLabel(a.label, b.label))
    .forEach(({ label: fLabel, id: fieldId }) => {
      const ci  = fieldColorIdx(fLabel);
      const btn = document.createElement('button');
      btn.className = 'field-badge map-filter-badge';
      btn.setAttribute('data-c', ci);
      btn.textContent = fLabel;
      btn.title = fLabel;
      btn.addEventListener('click', e => {
        e.stopPropagation();
        // If current block doesn't include this field, clear block filter
        const fieldsInBlock = allFields().map(f => f.id);
        if (!fieldsInBlock.includes(fieldId)) { S.block = null; renderBlockTabs(); }
        S.field = fieldId; S.page = 0;
        renderTabs();
        mapSelectNode(-1);
        initMapData();
      });
      badgesEl.appendChild(btn);
    });

  // Related chips (navigate within map, bidirectional)
  const relEl   = document.getElementById('mapPanelRelated');
  const relItems = relatedBidirectional(item)
    .map(relItem => ({ rid: relItem.id, relItem, nIdx: MAP.nodes.findIndex(n => n.id === relItem.id) }));

  if (relItems.length) {
    relEl.style.display = '';
    relEl.innerHTML = `<span class="map-panel-rel-label">${esc(i('related'))}</span>`;
    const line = document.createElement('span');
    line.className = 'map-panel-rel-line';
    relItems.forEach(({ rid, relItem, nIdx }, idx) => {
      const btn = document.createElement('button');
      btn.className = 'related-btn map-rel-chip';
      btn.textContent = relItem.name;
      btn.addEventListener('click', e => {
        e.stopPropagation();
        if (nIdx >= 0) {
          mapSelectNode(nIdx);
        } else {
          S.block = relItem.blockIds[0] || null;
          S.field = null; S.page = 0;
          renderBlockTabs(); renderTabs();
          initMapData();
          requestAnimationFrame(() => {
            const newIdx = MAP.nodes.findIndex(n => n.id === rid);
            if (newIdx >= 0) mapSelectNode(newIdx);
          });
        }
      });
      line.appendChild(btn);
      if (idx < relItems.length - 1) line.appendChild(document.createTextNode(', '));
    });
    relEl.appendChild(line);
  } else {
    relEl.style.display = 'none';
  }

  // Show depth control in legend (keep current depth)
  const depthGroup = document.getElementById('mapToolbarDepth');
  if (depthGroup) depthGroup.style.display = 'flex';
  mapSetDepth(MAP.depth);
  // Ensure legend is visible so depth control is accessible
  if (!S.mapLegendVisible) { MAP._legendWasHidden = true; S.mapLegendVisible = true; updateMapLegend(); }

  document.getElementById('mapOpenBtn').onclick = () => openModal(nd.id);
  document.getElementById('mapPanelOpenCompact').onclick = () => openModal(nd.id);
  const bpBtn = document.getElementById('mapBipartiteBtn');
  if (bpBtn) {
    bpBtn.style.display = '';
    bpBtn.title = i('bipartiteTip');
    bpBtn.onclick = () => openBipartiteMap(nd.id, 'tecnica');
    const bpLabel = document.getElementById('mapBipartiteBtnLabel');
    if (bpLabel) bpLabel.textContent = i('mapVerEnEval');
  }
  document.getElementById('mapNodePanel').classList.add('visible');
  if (!MAP.panelCollapseManual) MAP.panelCollapsed = mapShouldAutoCollapsePanel();
  mapApplyPanelCollapsed();
  mapPlacePanel(idx);
}

function mapHidePanel() {
  document.getElementById('mapNodePanel').classList.remove('visible', 'is-dragging');
  const bpBtn = document.getElementById('mapBipartiteBtn');
  if (bpBtn) bpBtn.style.display = 'none';
  MAP.panelDrag = null;
  const cv = mapCanvas(); if (cv) cv.style.pointerEvents = '';
  const depthGroup = document.getElementById('mapToolbarDepth');
  if (depthGroup) depthGroup.style.display = 'none';
  // Restore legend visibility if it was auto-shown
  if (MAP._legendWasHidden) { MAP._legendWasHidden = false; S.mapLegendVisible = false; }
  MAP.selLevel1 = new Map();
  updateMapLegend();
  const minus = document.getElementById('mapDepthMinus');
  const plus  = document.getElementById('mapDepthPlus');
  if (minus) minus.disabled = true;
  if (plus)  plus.disabled  = false;
  mapRemoveGhosts();
}

function refreshMap() {
  // Preserve the current selection across a refresh (search typing/clearing,
  // filter tab changes) so the focused node stays selected and its relations
  // stay visible. Without this, clearing the search box via its X would rebuild
  // the graph and deselect, making it impossible to locate an item by search
  // and then explore its relations in the full graph. The map "reset" button
  // calls initMapData directly (bypassing refreshMap) so it still clears.
  const prevSelId = (MAP.selected >= 0 && MAP.nodes && MAP.nodes[MAP.selected])
    ? MAP.nodes[MAP.selected].id : null;
  const prevColorMode = MAP._prevColorMode;

  if (MAP.viewMode === 'blocks') { initMapBlocks(); return; }
  initMapData();

  if (prevSelId == null) return;
  const idx = MAP.nodes.findIndex(n => n.id === prevSelId);
  if (idx < 0) return;
  // Re-select. Pre-set MAP.selected and restore _prevColorMode so the
  // first-selection bookkeeping inside mapSelectNode is skipped and the base
  // color mode to return to on deselect is preserved.
  MAP._prevColorMode = prevColorMode;
  MAP.selected = idx;
  mapSelectNode(idx);
}

function shouldOpenMapWithBlocks() {
  return false;
}

function mapShowHint() {
  const b = document.getElementById('mapHintBanner');
  if (!b) return;
  document.getElementById('mapHintLine1').textContent = i('mapHint1');
  document.getElementById('mapHintLine2').textContent = i('mapHint2');
  document.getElementById('mapHintLine3').textContent = i('mapHint3');
  b.classList.remove('hidden');
  MAP.hintShownAt = Date.now();
}

function mapHideHint() {
  document.getElementById('mapHintBanner')?.classList.add('hidden');
}

function mapApplyPanelCollapsed() {
  const panel = document.getElementById('mapNodePanel');
  const toggle = document.getElementById('mapPanelToggle');
  if (!panel || !toggle) return;
  panel.classList.toggle('collapsed', MAP.panelCollapsed);
  toggle.textContent = MAP.panelCollapsed ? '+' : '−';
  toggle.title = MAP.panelCollapsed ? i('mapPanelExpand') : i('mapPanelCollapse');
}

function mapSetPanelCollapsed(collapsed) {
  MAP.panelCollapsed = collapsed;
  MAP.panelCollapseManual = true;
  mapApplyPanelCollapsed();
  if (document.getElementById('mapNodePanel')?.classList.contains('visible')) mapPlacePanel(MAP.selected);
}

function mapShouldAutoCollapsePanel() {
  const panel = document.getElementById('mapNodePanel');
  const view  = document.getElementById('mapView');
  if (!panel || !view || !window.matchMedia('(max-width: 600px)').matches) return false;

  const savedCollapsed = MAP.panelCollapsed;
  const savedClass = panel.classList.contains('collapsed');
  MAP.panelCollapsed = false;
  panel.classList.remove('collapsed');
  mapPreparePanelForPositioning();

  const panelRect = panel.getBoundingClientRect();
  const viewRect  = view.getBoundingClientRect();
  const shouldCollapse = viewRect.height < 620 || panelRect.height > viewRect.height * 0.34;

  MAP.panelCollapsed = savedCollapsed;
  panel.classList.toggle('collapsed', savedClass);
  return shouldCollapse;
}

function mapSetupLegendDrag() {
  const legend = document.getElementById('mapLegend');
  const head   = legend?.querySelector('.map-legend-head');
  const view   = document.getElementById('mapView');
  if (!legend || !head || !view || head._mapDragAttached) return;
  head._mapDragAttached = true;

  head.addEventListener('pointerdown', e => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    if (e.target.closest('button, a, input, select, textarea')) return;
    if (legend.style.display === 'none') return;

    const legendRect = legend.getBoundingClientRect();
    const viewRect   = view.getBoundingClientRect();
    const pos = mapMoveLegendTo(legendRect.left - viewRect.left, legendRect.top - viewRect.top, true);
    if (!pos) return;

    MAP.legendDrag = {
      pointerId: e.pointerId,
      x0: e.clientX,
      y0: e.clientY,
      left0: pos.left,
      top0: pos.top,
    };
    legend.classList.add('is-dragging');
    head.setPointerCapture?.(e.pointerId);
    document.getElementById('mapTooltip').style.display = 'none';
    e.preventDefault();
    e.stopPropagation();
  });

  head.addEventListener('pointermove', e => {
    const drag = MAP.legendDrag;
    if (!drag || drag.pointerId !== e.pointerId) return;
    mapMoveLegendTo(drag.left0 + e.clientX - drag.x0, drag.top0 + e.clientY - drag.y0, true);
    e.preventDefault();
    e.stopPropagation();
  });

  const finishDrag = e => {
    const drag = MAP.legendDrag;
    if (!drag || drag.pointerId !== e.pointerId) return;
    MAP.legendDrag = null;
    legend.classList.remove('is-dragging');
    e.stopPropagation();
  };
  head.addEventListener('pointerup', finishDrag);
  head.addEventListener('pointercancel', finishDrag);
}

function mapSetupPanelDrag() {
  const panel = document.getElementById('mapNodePanel');
  const head  = panel?.querySelector('.map-panel-head');
  const view  = document.getElementById('mapView');
  if (!panel || !head || !view || head._mapDragAttached) return;
  head._mapDragAttached = true;

  head.addEventListener('pointerdown', e => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    if (e.target.closest('button, a, input, select, textarea')) return;
    if (!panel.classList.contains('visible')) return;

    const panelRect = panel.getBoundingClientRect();
    const viewRect  = view.getBoundingClientRect();
    const pos = mapMovePanelTo(panelRect.left - viewRect.left, panelRect.top - viewRect.top, true);
    if (!pos) return;

    MAP.panelDrag = {
      pointerId: e.pointerId,
      x0: e.clientX,
      y0: e.clientY,
      left0: pos.left,
      top0: pos.top,
    };
    panel.classList.add('is-dragging');
    head.setPointerCapture?.(e.pointerId);
    document.getElementById('mapTooltip').style.display = 'none';
    e.preventDefault();
    e.stopPropagation();
  });

  head.addEventListener('pointermove', e => {
    const drag = MAP.panelDrag;
    if (!drag || drag.pointerId !== e.pointerId) return;
    mapMovePanelTo(drag.left0 + e.clientX - drag.x0, drag.top0 + e.clientY - drag.y0, true);
    e.preventDefault();
    e.stopPropagation();
  });

  const finishDrag = e => {
    const drag = MAP.panelDrag;
    if (!drag || drag.pointerId !== e.pointerId) return;
    MAP.panelDrag = null;
    panel.classList.remove('is-dragging');
    e.stopPropagation();
  };
  head.addEventListener('pointerup', finishDrag);
  head.addEventListener('pointercancel', finishDrag);
}

function toggleMapView() {
  S.mapMode = !S.mapMode;
  saveViewPref();
  const mapView = document.getElementById('mapView');
  const mainEl  = document.getElementById('main');
  if (S.mapMode) {
    // Use getBoundingClientRect to get the exact bottom of the last visible bar
    const banner = document.getElementById('sharedBanner');
    const bars = [
      document.getElementById('viewToggle'),
      document.querySelector('.block-nav'),
      document.querySelector('.field-nav'),
      banner?.classList.contains('visible') ? banner : null,
    ].filter(Boolean);
    const topPx = bars.reduce((max, el) => {
      const b = el.getBoundingClientRect().bottom;
      return b > max ? b : max;
    }, document.querySelector('header')?.getBoundingClientRect().bottom || 0);
    mapView.style.top = topPx + 'px';
    mapView.style.display = 'block';
    mainEl.style.display  = 'none';
    document.body.classList.add('map-mode');
    renderViewToggle();
    document.getElementById('selectBtn').style.display = 'none';
    document.getElementById('favBtn').style.display    = 'none';
    mapResizeCanvas();
    if (shouldOpenMapWithBlocks()) initMapBlocks();
    else initMapData();
    mapShowHint();
    mapStart();
  } else {
    mapStop();
    mapView.style.display = 'none';
    mainEl.style.display  = '';
    document.body.classList.remove('map-mode');
    renderViewToggle();
    document.getElementById('selectBtn').style.display = '';
    document.getElementById('favBtn').style.display    = '';
    renderCards();
  }
  navPush();
}

function mapSetupEvents() {
  const canvas = mapCanvas();
  if (!canvas || canvas._mapEventsAttached) return;
  canvas._mapEventsAttached = true;

  // ── Mouse ──────────────────────────────────────────────────────────────────

  canvas.addEventListener('mousemove', e => {
    const rect = canvas.getBoundingClientRect();
    const dpr  = window.devicePixelRatio || 1;
    const sx   = (e.clientX - rect.left) * dpr;
    const sy   = (e.clientY - rect.top)  * dpr;

    if (MAP.drag) {
      if (MAP.drag.isPan) {
        MAP.camera.x = MAP.drag.cx0 - (e.clientX - MAP.drag.mx0) / MAP.camera.scale;
        MAP.camera.y = MAP.drag.cy0 - (e.clientY - MAP.drag.my0) / MAP.camera.scale;
      } else {
        const nd = MAP.nodes[MAP.drag.ni];
        nd.x  = MAP.drag.nx0 + (e.clientX - MAP.drag.mx0) / MAP.camera.scale;
        nd.y  = MAP.drag.ny0 + (e.clientY - MAP.drag.my0) / MAP.camera.scale;
        nd.vx = 0; nd.vy = 0;
        MAP.alpha = Math.max(MAP.alpha, 0.3);
      }
      canvas.classList.add('dragging');
      return;
    }

    const hit = mapHitTest(sx, sy);
    if (hit !== MAP.hover) { MAP.hover = hit; }
    canvas.classList.toggle('hovering', hit >= 0);

    const tip = document.getElementById('mapTooltip');
    if (hit >= 0) {
      const nd = MAP.nodes[hit];
      document.getElementById('mapTipName').textContent    = nd.name;
      document.getElementById('mapTipSummary').textContent = nd.summary || '';
      tip.style.display = 'block';
      // Keep tooltip within viewport
      const tw = tip.offsetWidth  || 250;
      const th = tip.offsetHeight || 80;
      tip.style.left = Math.min(e.clientX + 14, window.innerWidth  - tw - 8) + 'px';
      tip.style.top  = Math.min(e.clientY - 10, window.innerHeight - th - 8) + 'px';
    } else {
      tip.style.display = 'none';
    }
  });

  canvas.addEventListener('mousedown', e => {
    const rect = canvas.getBoundingClientRect();
    const dpr  = window.devicePixelRatio || 1;
    const sx   = (e.clientX - rect.left) * dpr;
    const sy   = (e.clientY - rect.top)  * dpr;
    const hit  = mapHitTest(sx, sy);
    if (hit >= 0) {
      const nd = MAP.nodes[hit];
      MAP.drag = { isPan: false, ni: hit, mx0: e.clientX, my0: e.clientY, nx0: nd.x, ny0: nd.y };
    } else {
      MAP.drag = { isPan: true, mx0: e.clientX, my0: e.clientY, cx0: MAP.camera.x, cy0: MAP.camera.y };
    }
    e.preventDefault();
  });

  canvas.addEventListener('mouseup', e => {
    if (MAP.drag) {
      const moved = Math.abs(e.clientX - MAP.drag.mx0) > 5 || Math.abs(e.clientY - MAP.drag.my0) > 5;
      if (!moved) {
        if (MAP.drag.isPan) {
          mapSelectNode(-1);
        } else if (MAP.viewMode === 'blocks') {
          const blockId = MAP.nodes[MAP.drag.ni].id;
          S.block = blockId; S.field = null; S.page = 0;
          renderBlockTabs(); renderTabs();
          initMapData();
        } else if (MAP.nodes[MAP.drag.ni]?.ghost) {
          const targetId   = MAP.nodes[MAP.drag.ni].id;
          const ghostItem  = itemById(targetId);
          if (ghostItem) {
            S.block = ghostItem.blockIds[0] || null;
            S.field = null; S.page = 0;
            renderBlockTabs(); renderTabs();
            initMapData();
            requestAnimationFrame(() => {
              const ni = MAP.nodes.findIndex(n => n.id === targetId);
              if (ni >= 0) mapSelectNode(ni);
            });
          }
        } else {
          mapSelectNode(MAP.drag.ni);
        }
      }
    }
    MAP.drag = null;
    canvas.classList.remove('dragging');
  });

  canvas.addEventListener('dblclick', e => {
    const rect = canvas.getBoundingClientRect();
    const dpr  = window.devicePixelRatio || 1;
    const hit  = mapHitTest((e.clientX - rect.left) * dpr, (e.clientY - rect.top) * dpr);
    if (hit >= 0) openModal(MAP.nodes[hit].id);
  });

  canvas.addEventListener('mouseleave', () => {
    MAP.drag  = null;
    MAP.hover = -1;
    document.getElementById('mapTooltip').style.display = 'none';
    canvas.classList.remove('dragging', 'hovering');
  });

  canvas.addEventListener('wheel', e => {
    e.preventDefault();
    const factor = e.deltaY < 0 ? 1.12 : 1 / 1.12;
    const rect   = canvas.getBoundingClientRect();
    const dpr    = window.devicePixelRatio || 1;
    const mx     = (e.clientX - rect.left) * dpr;
    const my     = (e.clientY - rect.top)  * dpr;
    const c      = canvas;
    // Zoom toward cursor
    const wx = (mx - c.width  / 2) / MAP.camera.scale + MAP.camera.x;
    const wy = (my - c.height / 2) / MAP.camera.scale + MAP.camera.y;
    MAP.camera.scale = Math.max(0.12, Math.min(6, MAP.camera.scale * factor));
    MAP.camera.x     = wx - (mx - c.width  / 2) / MAP.camera.scale;
    MAP.camera.y     = wy - (my - c.height / 2) / MAP.camera.scale;
  }, { passive: false });

  // ── Touch ──────────────────────────────────────────────────────────────────

  canvas.addEventListener('touchstart', e => {
    if (e.touches.length === 1) {
      const t    = e.touches[0];
      const rect = canvas.getBoundingClientRect();
      const dpr  = window.devicePixelRatio || 1;
      const sx   = (t.clientX - rect.left) * dpr;
      const sy   = (t.clientY - rect.top)  * dpr;
      const hit  = mapHitTest(sx, sy);
      if (hit >= 0) {
        const nd = MAP.nodes[hit];
        MAP.drag = { isPan: false, ni: hit, mx0: t.clientX, my0: t.clientY, nx0: nd.x, ny0: nd.y };
      } else {
        MAP.drag = { isPan: true, mx0: t.clientX, my0: t.clientY, cx0: MAP.camera.x, cy0: MAP.camera.y };
      }
    } else if (e.touches.length === 2) {
      MAP.drag = null;
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      MAP.lastPinchDist = Math.sqrt(dx * dx + dy * dy);
    }
    e.preventDefault();
  }, { passive: false });

  canvas.addEventListener('touchmove', e => {
    if (e.touches.length === 2) {
      const dx   = e.touches[0].clientX - e.touches[1].clientX;
      const dy   = e.touches[0].clientY - e.touches[1].clientY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (MAP.lastPinchDist > 0) {
        MAP.camera.scale = Math.max(0.12, Math.min(6, MAP.camera.scale * dist / MAP.lastPinchDist));
      }
      MAP.lastPinchDist = dist;
    } else if (e.touches.length === 1 && MAP.drag) {
      const t = e.touches[0];
      if (MAP.drag.isPan) {
        MAP.camera.x = MAP.drag.cx0 - (t.clientX - MAP.drag.mx0) / MAP.camera.scale;
        MAP.camera.y = MAP.drag.cy0 - (t.clientY - MAP.drag.my0) / MAP.camera.scale;
      } else {
        const nd = MAP.nodes[MAP.drag.ni];
        nd.x  = MAP.drag.nx0 + (t.clientX - MAP.drag.mx0) / MAP.camera.scale;
        nd.y  = MAP.drag.ny0 + (t.clientY - MAP.drag.my0) / MAP.camera.scale;
        nd.vx = 0; nd.vy = 0;
        MAP.alpha = Math.max(MAP.alpha, 0.3);
      }
    }
    e.preventDefault();
  }, { passive: false });

  canvas.addEventListener('touchend', e => {
    if (e.changedTouches.length === 1 && MAP.drag) {
      const t     = e.changedTouches[0];
      const moved = Math.abs(t.clientX - MAP.drag.mx0) > 8 || Math.abs(t.clientY - MAP.drag.my0) > 8;
      if (!moved) {
        const now = Date.now();
        const isDoubleTap = (now - MAP.lastTapTime) < 350 && !MAP.drag.isPan;
        MAP.lastTapTime = now;
        if (isDoubleTap && MAP.viewMode === 'techniques') {
          openModal(MAP.nodes[MAP.drag.ni].id);
        } else if (MAP.drag.isPan) {
          mapSelectNode(-1);
        } else if (MAP.viewMode === 'blocks') {
          const blockId = MAP.nodes[MAP.drag.ni].id;
          S.block = blockId; S.field = null; S.page = 0;
          renderBlockTabs(); renderTabs();
          initMapData();
        } else if (MAP.nodes[MAP.drag.ni]?.ghost) {
          const targetId   = MAP.nodes[MAP.drag.ni].id;
          const ghostItem  = itemById(targetId);
          if (ghostItem) {
            S.block = ghostItem.blockIds[0] || null;
            S.field = null; S.page = 0;
            renderBlockTabs(); renderTabs();
            initMapData();
            requestAnimationFrame(() => {
              const ni = MAP.nodes.findIndex(n => n.id === targetId);
              if (ni >= 0) mapSelectNode(ni);
            });
          }
        } else {
          mapSelectNode(MAP.drag.ni);
        }
      }
    }
    MAP.drag = null;
    MAP.lastPinchDist = 0;
    e.preventDefault();
  }, { passive: false });

  // ── Hide hint on any click while map is active ──────────────────────────────
  document.addEventListener('click', () => {
    if (S.mapMode && (Date.now() - (MAP.hintShownAt || 0)) > 300) mapHideHint();
  });

  // ── Resize ─────────────────────────────────────────────────────────────────

  window.addEventListener('resize', () => {
    if (!S.mapMode) return;
    // Recompute top offset using actual rendered positions
    const bannerEl = document.getElementById('sharedBanner');
    const resBars = [
      document.getElementById('viewToggle'),
      document.querySelector('.block-nav'),
      document.querySelector('.field-nav'),
      bannerEl?.classList.contains('visible') ? bannerEl : null,
    ].filter(Boolean);
    const resTop = resBars.reduce((max, el) => {
      const b = el.getBoundingClientRect().bottom;
      return b > max ? b : max;
    }, document.querySelector('header')?.getBoundingClientRect().bottom || 0);
    document.getElementById('mapView').style.top = resTop + 'px';
    mapResizeCanvas();
    if (document.getElementById('mapNodePanel')?.classList.contains('visible')) {
      if (!MAP.panelCollapseManual) {
        MAP.panelCollapsed = mapShouldAutoCollapsePanel();
        mapApplyPanelCollapsed();
      }
      mapPlacePanel(MAP.selected);
    }
    mapPlaceLegend();
  });

  // ── Theme change: redraw ────────────────────────────────────────────────────
  new MutationObserver(() => { if (S.mapMode) mapDraw(); })
    .observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
}

