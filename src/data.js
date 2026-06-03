// ─── CONFIG ──────────────────────────────────────────────────────────────────

const LANGS = ['es', 'ca', 'en'];
const DEFAULT_LANG = 'en';

const LOCAL_JSON = {
  es: 'data/es/metac.json',
  ca: 'data/ca/metac.json',
  en: 'data/en/metac.json',
};

const LOCAL_EVAL_JSON = {
  tecnicas:    lang => `data/${lang}/tecnicas.json`,
  evidencias:lang => `data/${lang}/evidencias.json`,
  instrumentos:lang => `data/${lang}/instrumentos.json`,
  dimensiones: lang => `data/${lang}/dimensiones.json`,
};

const EVAL_CATS = [
  { id: 'tecnicas',     prefix: 'TEC', cls: 'tec', i18n: 'evalCatTec' },
  { id: 'evidencias', prefix: 'EVI', cls: 'evi', i18n: 'evalCatEvi' },
  { id: 'instrumentos', prefix: 'INS', cls: 'ins', i18n: 'evalCatIns' },
  { id: 'dimensiones',  prefix: 'DIM', cls: 'dim', i18n: 'evalCatDim' },
];

const EV = {
  data:  { es: null, ca: null, en: null },
  byId:  { es: null, ca: null, en: null },
};

// Field color palette
const COLORS = [
  { bg:'#ffedd5', text:'#c2410c', border:'#fb923c' },
  { bg:'#dcfce7', text:'#15803d', border:'#4ade80' },
  { bg:'#f3e8ff', text:'#7e22ce', border:'#c084fc' },
  { bg:'#dbeafe', text:'#1d4ed8', border:'#60a5fa' },
  { bg:'#ccfbf1', text:'#0f766e', border:'#2dd4bf' },
  { bg:'#fee2e2', text:'#b91c1c', border:'#f87171' },
  { bg:'#e0e7ff', text:'#4338ca', border:'#818cf8' },
  { bg:'#fef3c7', text:'#b45309', border:'#fbbf24' },
  { bg:'#cffafe', text:'#0e7490', border:'#22d3ee' },
  { bg:'#fce7f3', text:'#be185d', border:'#f472b6' },
];

const MAP_DEPTH_COLORS = [
  { bg:'#bfdbfe', text:'#1e40af', border:'#3b82f6' }, // d1 blue
  { bg:'#fed7aa', text:'#9a3412', border:'#f97316' }, // d2 orange
  { bg:'#bbf7d0', text:'#166534', border:'#22c55e' }, // d3 green
  { bg:'#e9d5ff', text:'#6b21a8', border:'#a855f7' }, // d4 purple
  { bg:'#fde68a', text:'#854d0e', border:'#eab308' }, // d5 amber
  { bg:'#a5f3fc', text:'#155e75', border:'#06b6d4' }, // d6 cyan
];
// Selected node swatch color for legend (depth mode)
const MAP_SEL_DEPTH_COLOR = { bg:'#bae6fd', text:'#0369a1', border:'#0ea5e9' };

// Maps field keywords → color index (works for ES, CA and EN)
const FIELD_MAP = [
  ['activac','activació','activat','prior knowledge'],
  ['cohes','cooperat'],
  ['comunic','creativit','creativity'],
  ['construcció','construccion','coneixement','conocimiento','knowledge construction','knowledge building'],
  ['avaluac','evaluac','formativ','feedback','retroaliment','assessment'],
  ['pensament','pensamiento','crític','crítico','critical','metacog'],
  ['processament','procesamiento','processing','anàlisi','análisis','analysis'],
  ['resoluc','reptes','retos','problem solving','challenges'],
  ['marcos pedagogicos','marcs pedagogics','pedagogical frameworks'],
  ['rutinas de pensamiento','rutines de pensament','thinking routines'],
];

const BLOCK_DEFS = [
  {
    id: 'pedagogical-models',
    labels: {
      es: 'Modelos pedagógicos',
      ca: 'Models pedagògics',
      en: 'Pedagogical Models',
    },
    descriptions: {
      es: 'Enfoques generales que orientan cómo se entiende y organiza la enseñanza y el aprendizaje.',
      ca: "Enfocaments generals que orienten com s'entén i s'organitza l'ensenyament i l'aprenentatge.",
      en: 'General approaches that guide how teaching and learning are understood and organized.',
    },
  },
  {
    id: 'educational-frameworks',
    labels: {
      es: 'Marcos educativos',
      ca: 'Marcs educatius',
      en: 'Educational Frameworks',
    },
    descriptions: {
      es: 'Marcos amplios que estructuran principios, competencias o maneras de diseñar experiencias educativas.',
      ca: 'Marcs amplis que estructuren principis, competències o maneres de dissenyar experiències educatives.',
      en: 'Broad frameworks that structure principles, competencies, or ways to design learning experiences.',
    },
  },
  {
    id: 'active-methodologies',
    labels: {
      es: 'Metodologías activas y rutinas de pensamiento',
      ca: 'Metodologies actives i rutines de pensament',
      en: 'Active Methodologies and Thinking Routines',
    },
    descriptions: {
      es: 'Recursos metodológicos y rutinas que implican al alumnado de forma activa en pensar, investigar, crear o resolver.',
      ca: "Recursos metodològics i rutines que impliquen l'alumnat de forma activa en pensar, investigar, crear o resoldre.",
      en: 'Methodological resources and routines that actively involve students in thinking, investigating, creating, or solving.',
    },
  },
  {
    id: 'cooperative-learning',
    labels: {
      es: 'Organización del aprendizaje cooperativo',
      ca: "Organització de l'aprenentatge cooperatiu",
      en: 'Cooperative Learning Organization',
    },
    descriptions: {
      es: 'Estructuras para organizar equipos, interacción, roles y responsabilidad compartida en el aprendizaje cooperativo.',
      ca: "Estructures per organitzar equips, interacció, rols i responsabilitat compartida en l'aprenentatge cooperatiu.",
      en: 'Structures for organizing teams, interaction, roles, and shared responsibility in cooperative learning.',
    },
    aliases: {
      ca: ['Organització de l\'aprenentatge cooperatiu'],
    },
  },
];

const FIELD_DEFS = [
  {
    id: 'prior-knowledge',
    labels: {
      es: 'Activación de conocimientos previos',
      ca: 'Activació de coneixements previs',
      en: 'Activation of Prior Knowledge',
    },
    descriptions: {
      es: 'Recursos metodológicos para hacer emerger ideas iniciales, experiencias y conocimientos antes de aprender algo nuevo.',
      ca: "Recursos metodològics per fer emergir idees inicials, experiències i coneixements abans d'aprendre alguna cosa nova.",
      en: 'Methodological resources for eliciting initial ideas, experiences, and knowledge before learning something new.',
    },
    aliases: {
      en: ['Activating prior knowledge'],
    },
  },
  {
    id: 'information-processing',
    labels: {
      es: 'Procesamiento y Análisis de la información',
      ca: 'Processament i Anàlisi de la informació',
      en: 'Information Processing and Analysis',
    },
    descriptions: {
      es: 'Recursos metodológicos para organizar, comparar, interpretar, resumir o analizar información.',
      ca: 'Recursos metodològics per organitzar, comparar, interpretar, resumir o analitzar informació.',
      en: 'Methodological resources for organizing, comparing, interpreting, summarizing, or analyzing information.',
    },
  },
  {
    id: 'knowledge-building',
    labels: {
      es: 'Construcción de conocimiento',
      ca: 'Construcció de coneixement',
      en: 'Knowledge Building',
    },
    descriptions: {
      es: 'Recursos metodológicos orientados a elaborar comprensión nueva, conectar ideas y construir explicaciones.',
      ca: 'Recursos metodològics orientats a elaborar comprensió nova, connectar idees i construir explicacions.',
      en: 'Methodological resources for building new understanding, connecting ideas, and constructing explanations.',
    },
    aliases: {
      en: ['Knowledge Construction'],
    },
  },
  {
    id: 'problem-solving',
    labels: {
      es: 'Resolución de problemas y Retos',
      ca: 'Resolució de problemes i Reptes',
      en: 'Problem Solving and Challenges',
    },
    descriptions: {
      es: 'Recursos metodológicos centrados en afrontar problemas, retos, decisiones o situaciones abiertas.',
      ca: 'Recursos metodològics centrats a afrontar problemes, reptes, decisions o situacions obertes.',
      en: 'Methodological resources focused on problems, challenges, decisions, or open-ended situations.',
    },
  },
  {
    id: 'critical-thinking',
    labels: {
      es: 'Pensamiento Crítico y Metacognición',
      ca: 'Pensament Crític i Metacognició',
      en: 'Critical Thinking and Metacognition',
    },
    descriptions: {
      es: 'Recursos metodológicos para justificar ideas, revisar el propio pensamiento, reflexionar y autorregular el aprendizaje.',
      ca: "Recursos metodològics per justificar idees, revisar el propi pensament, reflexionar i autoregular l'aprenentatge.",
      en: 'Methodological resources for justifying ideas, reviewing thinking, reflecting, and self-regulating learning.',
    },
    aliases: {
      es: ['Pensamiento Crític y Metacognición'],
      en: ['Critical Thinking', 'and metacognition'],
    },
  },
  {
    id: 'formative-assessment',
    labels: {
      es: 'Evaluación Formativa y Feedback',
      ca: 'Avaluació Formativa i Feedback',
      en: 'Formative Assessment and Feedback',
    },
    descriptions: {
      es: 'Recursos metodológicos para recoger evidencias, dar retroalimentación y mejorar durante el proceso de aprendizaje.',
      ca: "Recursos metodològics per recollir evidències, donar retroalimentació i millorar durant el procés d'aprenentatge.",
      en: 'Methodological resources for gathering evidence, giving feedback, and improving during the learning process.',
    },
    aliases: {
      es: ['Evaluación Formativa y Retroalimentación'],
    },
  },
  {
    id: 'cohesion-cooperation',
    labels: {
      es: 'Cohesión y Cooperación',
      ca: 'Cohesió i Cooperació',
      en: 'Cohesion and Cooperation',
    },
    descriptions: {
      es: 'Recursos metodológicos para crear grupo, trabajar en equipo, compartir responsabilidades y cooperar.',
      ca: 'Recursos metodològics per crear grup, treballar en equip, compartir responsabilitats i cooperar.',
      en: 'Methodological resources for building group cohesion, teamwork, shared responsibility, and cooperation.',
    },
  },
  {
    id: 'communication-creativity',
    labels: {
      es: 'Comunicación y Creatividad',
      ca: 'Comunicació i Creativitat',
      en: 'Communication and Creativity',
    },
    descriptions: {
      es: 'Recursos metodológicos para expresar, dialogar, presentar, crear ideas o producir respuestas originales.',
      ca: 'Recursos metodològics per expressar, dialogar, presentar, crear idees o produir respostes originals.',
      en: 'Methodological resources for expression, dialogue, presentation, idea generation, or original responses.',
    },
  },
  {
    id: 'pedagogical-frameworks',
    labels: {
      es: 'Marcos pedagógicos',
      ca: 'Marcs pedagògics',
      en: 'Pedagogical Frameworks',
    },
    descriptions: {
      es: 'Ámbito para recursos metodológicos vinculados con enfoques pedagógicos generales o marcos de diseño didáctico.',
      ca: 'Àmbit per a recursos metodològics vinculats amb enfocaments pedagògics generals o marcs de disseny didàctic.',
      en: 'Field for methodological resources linked to general pedagogical approaches or instructional design frameworks.',
    },
  },
  {
    id: 'thinking-routines',
    labels: {
      es: 'Rutinas de pensamiento',
      ca: 'Rutines de pensament',
      en: 'Thinking Routines',
    },
    descriptions: {
      es: 'Ámbito para rutinas breves y transferibles que hacen visible el pensamiento del alumnado.',
      ca: "Àmbit per a rutines breus i transferibles que fan visible el pensament de l'alumnat.",
      en: "Field for short, transferable routines that make students' thinking visible.",
    },
  },
];


// ─── STATE ───────────────────────────────────────────────────────────────────

const DAILY_ORDER_KEY = orderDateKey();
const SORT_MODES = ['random', 'alpha', 'alphaDesc'];
const LS_SORT = 'metec_sort_v1';

const S = {
  lang:         DEFAULT_LANG,
  data:         { es: null, ca: null, en: null },
  byId:         { es: null, ca: null, en: null },
  sortMode:     loadSortMode(),
  favorites:    new Set(),
  selected:     new Set(),
  selectMode:   false,
  categories:   [],     // [{id, name, itemIds:[]}]
  search:       '',
  searchMode:   'all',   // 'all' | 'title'
  block:        null,
  field:        null,
  modal:        null,
  modalHistory: [],
  shared:       null,
  sharedName:   null,
  page:         0,
  perPage:      25,
  mapMode:          false,
  mapColorMode:     localStorage.getItem('metac_map_color_v1') || 'depth',
  mapLegendVisible: localStorage.getItem('metac_map_legend_v1') !== 'hidden',
  view:             'tecnicas',   // 'tecnicas' | 'evaluacion'
  evalCat:          null,
  evalModal:        null,         // currently open eval entity ID
  evalSelected:     null,         // selected entity in split view
  evalMapMode:      false,        // true = split+graph, false = cards grid
  evalSortMode:     'random',
  evalPerPage:      25,
  evalPage:         0,
  evalModality:     '',
  evalLocation:     '',
  evalGrouping:     '',
  evalAiResistance: '',
  _navLock:         false,  // prevents intermediate pushState during enterView
  _popping:         false,  // true while handling popstate
};

// ─── JSON LOADER ─────────────────────────────────────────────────────────────

function fromJSON(items, lang = DEFAULT_LANG) {
  return items.filter(item => item.name).map((item, rowIndex) => {
    const fields = [], fieldIds = [];
    (item.fields || []).forEach(f => {
      const norm = normalizeField(f, lang);
      if (norm.id && !fieldIds.includes(norm.id)) {
        fieldIds.push(norm.id);
        fields.push(norm.label);
      }
    });
    const blocks = [], blockIds = [];
    if (item.block) {
      const nb = normalizeBlock(item.block, lang);
      if (nb.id) { blockIds.push(nb.id); blocks.push(nb.label); }
    }
    return {
      id:       normalizeId(item.id) || `row_${rowIndex + 1}`,
      name:     item.name || '',
      desc:     item.desc || '',
      tags:     item.tags || [],
      blocks,
      blockIds,
      fields,
      fieldIds,
      programs: item.programs || [],
      summary:  item.summary || '',
      related:  item.related || [],
      eval_ids: item.eval_ids || [],
      example:  item.example || '',
      source:   item.source  || '',
    };
  });
}

function normalizeId(value) {
  return value === null || value === undefined ? '' : String(value).trim();
}

function buildIdMap(data) {
  const map = new Map();
  data.forEach((item, idx) => {
    if (!item.id) return;
    if (map.has(item.id)) console.warn(`Duplicate methodological resource ID: ${item.id}`);
    else map.set(item.id, { item, idx });
  });
  return map;
}

function orderDateKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function hashString(value) {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i++) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function dailyRank(itemId) {
  return hashString(`${DAILY_ORDER_KEY}:${normalizeId(itemId)}`);
}

function sortRows(rows) {
  return rows.sort((a, b) => {
    if (S.sortMode === 'alpha' || S.sortMode === 'alphaDesc') {
      const byName = a.item.name.localeCompare(b.item.name, S.lang, { sensitivity: 'base', numeric: true });
      if (byName) return S.sortMode === 'alphaDesc' ? -byName : byName;
      return a.idx - b.idx;
    }

    return dailyRank(a.id) - dailyRank(b.id) || a.idx - b.idx;
  });
}

function alphaByLabel(a, b) {
  return String(a || '').localeCompare(String(b || ''), S.lang, { sensitivity: 'base', numeric: true });
}

function rowById(itemId, lang = S.lang) {
  return (S.byId[lang] || new Map()).get(normalizeId(itemId)) || null;
}

function itemById(itemId, lang = S.lang) {
  const row = rowById(itemId, lang);
  return row ? row.item : null;
}

function relatedBidirectional(item, lang = S.lang) {
  const byId = S.byId[lang] || new Map();
  const data  = S.data[lang] || [];
  const ids = new Set((item.related || []).filter(id => id !== item.id));
  data.forEach(t => { if (t.id !== item.id && (t.related || []).includes(item.id)) ids.add(t.id); });
  return [...ids].map(id => byId.get(id)?.item).filter(Boolean)
    .sort((a, b) => alphaByLabel(a.name, b.name));
}

function uniqueIds(ids) {
  const seen = new Set();
  const out = [];
  ids.forEach(value => {
    const id = normalizeId(value);
    if (id && !seen.has(id)) {
      seen.add(id);
      out.push(id);
    }
  });
  return out;
}

function validItemIds(ids, lang = S.lang) {
  const map = S.byId[lang] || new Map();
  return uniqueIds(ids).filter(id => map.has(id) || !!evalEntityById(id, lang));
}

function sortedItemIds(ids, lang = S.lang) {
  const map = S.byId[lang] || new Map();
  return validItemIds(ids, lang).sort((a, b) => {
    const ia = map.has(a) ? map.get(a).idx : Infinity;
    const ib = map.has(b) ? map.get(b).idx : Infinity;
    if (ia !== ib) return ia - ib;
    const na = (evalEntityById(a, lang) || {}).name || a;
    const nb = (evalEntityById(b, lang) || {}).name || b;
    return na.localeCompare(nb);
  });
}

function refsToItemIds(refs, lang = S.lang) {
  const data = S.data[lang] || [];
  const map = S.byId[lang] || new Map();
  return uniqueIds(refs).map(ref => {
    if (map.has(ref)) return ref;
    if (/^\d+$/.test(ref)) {
      const legacyItem = data[Number(ref)];
      return legacyItem ? legacyItem.id : '';
    }
    return '';
  }).filter(id => id && map.has(id));
}

function normalizeStoredRefs(lang = S.lang) {
  if (!S.data[lang]) return;

  const favs = refsToItemIds([...S.favorites], lang);
  const favsChanged = favs.length !== S.favorites.size || favs.some(id => !S.favorites.has(id));
  S.favorites = new Set(favs);
  if (favsChanged) saveFavs();

  let catsChanged = false;
  S.categories = S.categories.map(cat => {
    const rawIds = Array.isArray(cat.itemIds) ? cat.itemIds : [];
    const itemIds = refsToItemIds(rawIds, lang);
    if (itemIds.length !== rawIds.length || itemIds.some((id, idx) => id !== rawIds[idx])) catsChanged = true;
    return { id: cat.id, name: cat.name, itemIds };
  });
  if (catsChanged) saveCats();
}

// Parse "Label1|url1 ; Label2|url2"
function parsePrograms(raw) {
  return raw.split(';').map(s => s.trim()).filter(Boolean).map(entry => {
    const pipe = entry.indexOf('|');
    if (pipe === -1) return null;
    return { label: entry.slice(0, pipe).trim(), url: entry.slice(pipe + 1).trim() };
  }).filter(Boolean);
}

// ─── FIELD UTILS ─────────────────────────────────────────────────────────────

function canonicalKey(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/['`´]/g, "'")
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ');
}

function normSearch(s) {
  return String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function taxonomyLabel(def, lang = S.lang) {
  return def.labels[lang] || def.labels[DEFAULT_LANG] || def.id;
}

function taxonomyDescription(def, lang = S.lang) {
  return (def.descriptions && (def.descriptions[lang] || def.descriptions[DEFAULT_LANG])) || '';
}

function taxonomyHint(label, description) {
  return description || label;
}

function buildTaxonomyIndex(defs) {
  const map = new Map();
  defs.forEach(def => {
    Object.values(def.labels).forEach(label => map.set(canonicalKey(label), def));
    Object.values(def.aliases || {}).flat().forEach(alias => map.set(canonicalKey(alias), def));
  });
  return map;
}

const BLOCK_INDEX = buildTaxonomyIndex(BLOCK_DEFS);
const FIELD_INDEX = buildTaxonomyIndex(FIELD_DEFS);

function customTaxonomyId(prefix, value) {
  const key = canonicalKey(value);
  return key ? `${prefix}:${key}` : '';
}

function normalizeBlock(value, lang = S.lang) {
  const raw = String(value || '').trim();
  if (!raw) return { id: '', label: '' };
  const def = BLOCK_INDEX.get(canonicalKey(raw));
  return def
    ? { id: def.id, label: taxonomyLabel(def, lang) }
    : { id: customTaxonomyId('block', raw), label: raw };
}

function normalizeField(value, lang = S.lang) {
  const raw = String(value || '').trim();
  if (!raw) return { id: '', label: '' };
  const def = FIELD_INDEX.get(canonicalKey(raw));
  return def
    ? { id: def.id, label: taxonomyLabel(def, lang) }
    : { id: customTaxonomyId('field', raw), label: raw };
}

const colorCache = {};
function fieldColorIdx(name) {
  if (colorCache[name] !== undefined) return colorCache[name];
  const n = canonicalKey(name);
  for (let i = 0; i < FIELD_MAP.length; i++) {
    if (FIELD_MAP[i].some(kw => n.includes(kw))) {
      return (colorCache[name] = i);
    }
  }
  const h = [...name].reduce((a, c) => (a * 31 + c.charCodeAt(0)) & 0xffff, 0);
  return (colorCache[name] = h % COLORS.length);
}

function fieldColor(name) { return COLORS[fieldColorIdx(name)]; }

function blockColorIdxById(blockId) {
  const idx = BLOCK_DEFS.findIndex(b => b.id === blockId);
  if (idx >= 0) return idx % COLORS.length;
  const h = [...blockId].reduce((a, c) => (a * 31 + c.charCodeAt(0)) & 0xffff, 0);
  return h % COLORS.length;
}

function badgeHTML(field) {
  return `<span class="field-badge" data-c="${fieldColorIdx(field)}">${esc(field)}</span>`;
}

function blockBadgeHTML(block) {
  return block ? `<span class="block-badge">${esc(block)}</span>` : '';
}

function knownOrder(defs, id) {
  const idx = defs.findIndex(def => def.id === id);
  return idx === -1 ? defs.length : idx;
}

function taxonomyDescriptionById(defs, id, lang = S.lang) {
  const def = defs.find(item => item.id === id);
  return def ? taxonomyDescription(def, lang) : '';
}

function blockDescription(id, lang = S.lang) {
  return taxonomyDescriptionById(BLOCK_DEFS, id, lang);
}

function fieldDescription(id, lang = S.lang) {
  return taxonomyDescriptionById(FIELD_DEFS, id, lang);
}

function blockScopedData() {
  const data = S.data[S.lang] || [];
  return S.block ? data.filter(item => item.blockIds.includes(S.block)) : data;
}

function allBlocks() {
  const map = new Map();
  (S.data[S.lang] || []).forEach(item => {
    (item.blockIds || []).forEach((id, idx) => {
      if (!map.has(id)) map.set(id, {
        id,
        label: item.blocks[idx],
        description: blockDescription(id),
      });
    });
  });
  return [...map.values()]
    .sort((a, b) => knownOrder(BLOCK_DEFS, a.id) - knownOrder(BLOCK_DEFS, b.id) || a.label.localeCompare(b.label));
}

function allFields() {
  const map = new Map();
  blockScopedData().forEach(item => {
    item.fieldIds.forEach((id, idx) => {
      if (id && !map.has(id)) map.set(id, {
        id,
        label: item.fields[idx],
        description: fieldDescription(id),
      });
    });
  });
  return [...map.values()]
    .sort((a, b) => knownOrder(FIELD_DEFS, a.id) - knownOrder(FIELD_DEFS, b.id) || a.label.localeCompare(b.label));
}

function syncActiveFilters() {
  if (S.block && !allBlocks().some(block => block.id === S.block)) {
    S.block = null;
    S.field = null;
  }
  if (S.field && !allFields().some(field => field.id === S.field)) S.field = null;
}

// ─── DESCRIPTION FORMATTER ───────────────────────────────────────────────────

function esc(s) {
  return String(s)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;')
    .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function inlineFormat(raw) {
  return raw.split(/<br\s*\/?>/i)
    .map(part => esc(part)
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*([^*]+)\*/g, '<em>$1</em>'))
    .join('<br>');
}

function formatDesc(text) {
  const lines = text.split('\n');
  let html = '', list = [], ulList = [], tableLines = [];

  const flush = () => {
    if (list.length) { html += '<ol>' + list.map(li => `<li>${li}</li>`).join('') + '</ol>'; list = []; }
    if (ulList.length) { html += '<ul>' + ulList.map(li => `<li>${li}</li>`).join('') + '</ul>'; ulList = []; }
  };

  const flushTable = () => {
    if (!tableLines.length) return;
    let head = true, tableHtml = '<table class="desc-table"><thead>';
    tableLines.forEach(line => {
      const clean = line.replace(/\|h\s*$/, '').trim();
      if (/^\|[\s\-:|\s]+\|$/.test(clean)) return; // separator row
      const cells = clean.split('|').slice(1, -1);  // drop first/last empty
      const tag = head ? 'th' : 'td';
      if (head) {
        tableHtml += '<tr>' + cells.map(c => `<th>${inlineFormat(c.trim())}</th>`).join('') + '</tr></thead><tbody>';
        head = false;
      } else {
        tableHtml += '<tr>' + cells.map(c => `<td>${inlineFormat(c.trim())}</td>`).join('') + '</tr>';
      }
    });
    tableHtml += '</tbody></table>';
    html += tableHtml;
    tableLines = [];
  };

  for (let idx = 0; idx < lines.length; idx++) {
    const raw = lines[idx];
    const line = raw.trim();

    if (line.startsWith('|')) {
      flush();
      tableLines.push(line);
      continue;
    } else {
      flushTable();
    }

    if (!line) {
      if (list.length) {
        let next = idx + 1;
        while (next < lines.length && !lines[next].trim()) next++;
        if (next < lines.length && /^\d+\.\s+/.test(lines[next].trim())) continue;
      }
      flush();
      continue;
    }

    if (line.startsWith('## ')) {
      flush();
      html += `<h4>${esc(line.slice(3))}</h4>`;
      continue;
    }

    const num = line.match(/^\d+\.\s+([\s\S]+)/);
    if (num) { if (ulList.length) { html += '<ul>' + ulList.map(li => `<li>${li}</li>`).join('') + '</ul>'; ulList = []; } list.push(inlineFormat(num[1])); continue; }

    const ul = line.match(/^[-*]\s+([\s\S]+)/);
    if (ul) { if (list.length) { html += '<ol>' + list.map(li => `<li>${li}</li>`).join('') + '</ol>'; list = []; } ulList.push(inlineFormat(ul[1])); continue; }

    flush();

    // Section header: starts with 2+ uppercase letters then colon
    const sec = line.match(/^([A-ZÁÉÍÓÚÀÈÌÒÙÜÑÇ][A-ZÁÉÍÓÚÀÈÌÒÙÜÑÇ\s\(\)\/,']+:)\s*(.*)/);
    if (sec) {
      html += `<p><span class="section-label">${esc(sec[1])}</span>${sec[2] ? ' ' + inlineFormat(sec[2]) : ''}</p>`;
    } else {
      html += `<p>${inlineFormat(line)}</p>`;
    }
  }

  flush();
  flushTable();
  return html;
}

// ─── DATA FETCH ──────────────────────────────────────────────────────────────

async function loadLang(lang) {
  lang = resolveLang(lang);
  if (S.data[lang]) return;
  const res = await fetch(LOCAL_JSON[lang]);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const items = await res.json();
  S.data[lang] = fromJSON(items, lang);
  S.byId[lang] = buildIdMap(S.data[lang]);
  normalizeStoredRefs(lang);
}

// ─── EVALMAP DATA ────────────────────────────────────────────────────────────

async function loadEvalLang(lang) {
  lang = resolveLang(lang);
  if (EV.data[lang]) return;
  const entries = Object.entries(LOCAL_EVAL_JSON);
  const results = await Promise.all(
    entries.map(([, pathFn]) => fetch(pathFn(lang)).then(r => r.ok ? r.json() : []))
  );
  const byId = new Map();
  const combined = {};
  entries.forEach(([cat], i) => {
    combined[cat] = results[i];
    results[i].forEach(e => byId.set(e.id, e));
  });
  EV.data[lang] = combined;
  EV.byId[lang] = byId;
}

function evalEntityById(id, lang = S.lang) {
  return (EV.byId[lang] || new Map()).get(id) || null;
}

function evalEntityPrefix(id) {
  return id ? id.split('_')[0] : '';
}

// ─── SHARING & CLIPBOARD ─────────────────────────────────────────────────────

function techniqueURL(id) {
  const u = new URL(location.href.split('?')[0]);
  u.searchParams.set('t', id);
  return u.toString();
}

function shareURL(itemIds, name = null) {
  const u = new URL(location.href.split('?')[0]);
  u.searchParams.set('t', sortedItemIds(itemIds).join(','));
  u.searchParams.set('lang', S.lang);
  if (name) u.searchParams.set('tname', name);
  return u.toString();
}

async function copy(text) {
  try { await navigator.clipboard.writeText(text); }
  catch {
    const t = document.createElement('textarea');
    t.value = text; t.style.cssText = 'position:fixed;opacity:0';
    document.body.append(t); t.select();
    document.execCommand('copy'); t.remove();
  }
  toast(i('copied'));
}

function setTransientButtonState(btn, title) {
  if (!btn) return;
  btn.style.color = 'var(--primary)';
  const origTitle = btn.title;
  if (title) btn.title = title;
  setTimeout(() => {
    btn.style.color = '';
    btn.title = origTitle;
  }, 2000);
}

function copyRichContent({ plain, html, btn }) {
  const promise = (typeof ClipboardItem !== 'undefined')
    ? navigator.clipboard.write([new ClipboardItem({
        'text/html': new Blob([html], { type: 'text/html' }),
        'text/plain': new Blob([plain], { type: 'text/plain' }),
      })])
    : navigator.clipboard.writeText(plain);
  return promise.then(() => setTransientButtonState(btn, i('copied')));
}

function ensurePrintArea() {
  let el = document.getElementById('printArea');
  if (!el) {
    el = document.createElement('div');
    el.id = 'printArea';
    document.body.appendChild(el);
  }
  return el;
}

function slugifyFilename(text) {
  return String(text || 'document')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase() || 'document';
}

function downloadTextFile(filename, text, mime = 'text/markdown;charset=utf-8') {
  const blob = new Blob([text], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function showModalActionButtons() {
  ['modalFavBtn', 'modalCopyBtn', 'modalMarkdownBtn', 'modalPrintBtn', 'modalShareBtn'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.style.display = '';
  });
}

function openSharedModal() {
  document.getElementById('modalOverlay').classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeSharedModal() {
  document.getElementById('modalOverlay').classList.remove('open');
  document.body.style.overflow = '';
}

// ─── LOCALSTORAGE ────────────────────────────────────────────────────────────

const LS = 'metec_favs_v1';
function saveFavs() { localStorage.setItem(LS, JSON.stringify([...S.favorites])); }
function loadFavs() {
  try { const r = localStorage.getItem(LS); if (r) S.favorites = new Set(JSON.parse(r)); }
  catch {}
}

const LS_CATS = 'metec_cats_v1';
function saveCats() { localStorage.setItem(LS_CATS, JSON.stringify(S.categories)); }
function loadCats() {
  try {
    const r = localStorage.getItem(LS_CATS);
    if (r) S.categories = JSON.parse(r).map(c => ({
      id: c.id,
      name: c.name,
      itemIds: Array.isArray(c.itemIds) ? c.itemIds : (Array.isArray(c.indices) ? c.indices : []),
    }));
  } catch {}
}

const LS_LANG = 'metec_lang_v1';
function saveLang() { localStorage.setItem(LS_LANG, S.lang); }
function isSupportedLang(lang) { return LANGS.includes(lang); }
function resolveLang(lang) { return isSupportedLang(lang) ? lang : DEFAULT_LANG; }
function isSupportedSortMode(mode) { return SORT_MODES.includes(mode); }
function loadSortMode() {
  try {
    const saved = localStorage.getItem(LS_SORT);
    if (isSupportedSortMode(saved)) return saved;
  } catch {}
  return 'random';
}
function saveSortMode() {
  try { localStorage.setItem(LS_SORT, S.sortMode); }
  catch {}
}

const LS_VIEW = 'metac_view_v1';
function saveViewPref() {}
function loadViewPref() {}

function loadLangPref() {
  const saved = localStorage.getItem(LS_LANG);
  if (isSupportedLang(saved)) { S.lang = saved; return; }
  const browserLang = String((navigator.languages && navigator.languages[0]) || navigator.language || '').toLowerCase();
  if (browserLang.startsWith('ca')) S.lang = 'ca';
  else if (browserLang.startsWith('es')) S.lang = 'es';
  else if (browserLang.startsWith('en')) S.lang = 'en';
  else S.lang = DEFAULT_LANG;
}

function updateSearchUI() {
  const input = document.getElementById('searchInput');
  const clearBtn = document.getElementById('searchClearBtn');
  clearBtn.classList.toggle('visible', !!input.value);
  clearBtn.setAttribute('aria-label', i('clearSearch'));
}

function updateSearchModeUI() {
  const btn = document.getElementById('searchModeBtn');
  if (!btn) return;
  const isTitleMode = S.searchMode === 'title';
  btn.classList.toggle('active', isTitleMode);
  btn.title = isTitleMode ? i('searchAll') : i('searchTitle');
  document.getElementById('searchInput').placeholder =
    isTitleMode ? i('searchTitlePlaceholder') : i('searchPlaceholder');
}
