// ── Shared DOCX generation (OOXML + JSZip) ───────────────────────────────────
// Usage: await generateDocx(name, filename, htmlContent)

let _jsZipPromise = null;

function ensureJSZip() {
  if (typeof JSZip !== 'undefined') return Promise.resolve();
  if (!_jsZipPromise) {
    _jsZipPromise = new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = 'https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js';
      s.onload  = resolve;
      s.onerror = () => reject(new Error('No se pudo cargar JSZip (sin conexión a internet)'));
      document.head.appendChild(s);
    });
  }
  return _jsZipPromise;
}

function _xe(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function _inlineRuns(node, props) {
  props = props || {};
  let out = '';
  for (const c of node.childNodes) {
    if (c.nodeType === 3) {
      if (c.textContent) {
        const rpr = (props.b || props.i)
          ? '<w:rPr>' + (props.b ? '<w:b/><w:bCs/>' : '') + (props.i ? '<w:i/><w:iCs/>' : '') + '</w:rPr>'
          : '';
        out += `<w:r>${rpr}<w:t xml:space="preserve">${_xe(c.textContent)}</w:t></w:r>`;
      }
    } else if (c.nodeType === 1) {
      const tag = c.tagName.toLowerCase();
      if (tag === 'br') { out += '<w:r><w:br/></w:r>'; continue; }
      const p2 = Object.assign({}, props);
      if (tag === 'strong' || tag === 'b') p2.b = true;
      if (tag === 'em'     || tag === 'i') p2.i = true;
      out += _inlineRuns(c, p2);
    }
  }
  return out;
}

function _wPara(node, styleId, extraPpr) {
  const runs = _inlineRuns(node);
  const ppr  = (styleId || extraPpr)
    ? `<w:pPr>${styleId ? `<w:pStyle w:val="${styleId}"/>` : ''}${extraPpr || ''}</w:pPr>`
    : '';
  return `<w:p>${ppr}${runs}</w:p>`;
}

function _wTable(table) {
  let maxCols = 0;
  for (const row of table.querySelectorAll('tr')) {
    let n = 0;
    for (const c of row.querySelectorAll('th,td')) n += parseInt(c.getAttribute('colspan') || 1);
    maxCols = Math.max(maxCols, n);
  }
  const colW = maxCols > 0 ? Math.floor(9000 / maxCols) : 2250;
  const grid = '<w:tblGrid>' + Array(maxCols).fill(`<w:gridCol w:w="${colW}"/>`).join('') + '</w:tblGrid>';
  const bdr  = 'w:val="single" w:sz="4" w:space="0" w:color="C8D6E5"';
  const tblPr = `<w:tblPr><w:tblStyle w:val="TableGrid"/>
    <w:tblW w:w="5000" w:type="pct"/>
    <w:tblBorders>
      <w:top ${bdr}/><w:left ${bdr}/><w:bottom ${bdr}/>
      <w:right ${bdr}/><w:insideH ${bdr}/><w:insideV ${bdr}/>
    </w:tblBorders>
    <w:tblCellMar>
      <w:top w:w="80" w:type="dxa"/><w:left w:w="120" w:type="dxa"/>
      <w:bottom w:w="80" w:type="dxa"/><w:right w:w="120" w:type="dxa"/>
    </w:tblCellMar></w:tblPr>`;
  let rows = '';
  for (const row of table.querySelectorAll('tr')) {
    let cells = '';
    for (const cell of row.querySelectorAll('th,td')) {
      const isTh = cell.tagName.toLowerCase() === 'th';
      const span = parseInt(cell.getAttribute('colspan') || 1);
      const tcPr = (span > 1 || isTh)
        ? `<w:tcPr>${span > 1 ? `<w:gridSpan w:val="${span}"/>` : ''}${isTh ? '<w:shd w:val="clear" w:color="auto" w:fill="DBEAFE"/>' : ''}</w:tcPr>`
        : '';
      const runs = _inlineRuns(cell, isTh ? { b: true } : {});
      cells += `<w:tc>${tcPr}<w:p><w:pPr><w:spacing w:before="40" w:after="40"/></w:pPr>${runs}</w:p></w:tc>`;
    }
    rows += `<w:tr>${cells}</w:tr>`;
  }
  return `<w:tbl>${tblPr}${grid}${rows}</w:tbl><w:p/>`;
}

function _domToOoxml(node) {
  let out = '';
  for (const c of node.childNodes) {
    if (c.nodeType !== 1) continue;
    const tag = c.tagName.toLowerCase();
    if      (tag === 'svg')   { /* skip diagrams */ }
    else if (tag === 'h1')    out += _wPara(c, 'Heading1');
    else if (tag === 'h2')    out += _wPara(c, 'Heading2');
    else if (tag === 'h3')    out += _wPara(c, 'Heading3');
    else if (tag === 'h4')    out += _wPara(c, 'Heading4');
    else if (tag === 'p')     out += c.classList.contains('note') ? _wPara(c, 'Quote') : _wPara(c, 'Normal');
    else if (tag === 'ul') {
      for (const li of c.querySelectorAll(':scope > li'))
        out += `<w:p><w:pPr><w:pStyle w:val="ListParagraph"/><w:numPr><w:ilvl w:val="0"/><w:numId w:val="1"/></w:numPr></w:pPr>${_inlineRuns(li)}</w:p>`;
    }
    else if (tag === 'ol') {
      for (const li of c.querySelectorAll(':scope > li'))
        out += `<w:p><w:pPr><w:pStyle w:val="ListParagraph"/><w:numPr><w:ilvl w:val="0"/><w:numId w:val="2"/></w:numPr></w:pPr>${_inlineRuns(li)}</w:p>`;
    }
    else if (tag === 'table') out += _wTable(c);
    else out += _domToOoxml(c);
  }
  return out;
}

async function generateDocx(name, filename, htmlContent) {
  await ensureJSZip();

  const div = document.createElement('div');
  div.innerHTML = htmlContent;

  const W   = 'xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"';
  const bdr = 'w:val="single" w:sz="4" w:space="0" w:color="C8D6E5"';

  const bodyXml =
    `<w:p><w:pPr><w:pStyle w:val="Heading1"/></w:pPr><w:r><w:t>${_xe(name)}</w:t></w:r></w:p>` +
    _domToOoxml(div);

  const files = {
    '[Content_Types].xml': `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml"  ContentType="application/xml"/>
  <Override PartName="/word/document.xml"  ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
  <Override PartName="/word/styles.xml"    ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>
  <Override PartName="/word/numbering.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.numbering+xml"/>
</Types>`,

    '_rels/.rels': `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`,

    'word/_rels/document.xml.rels': `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles"    Target="styles.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/numbering" Target="numbering.xml"/>
</Relationships>`,

    'word/document.xml': `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document ${W}><w:body>
${bodyXml}
<w:sectPr>
  <w:pgSz w:w="11906" w:h="16838"/>
  <w:pgMar w:top="1134" w:right="1134" w:bottom="1134" w:left="1134" w:header="709" w:footer="709" w:gutter="0"/>
</w:sectPr>
</w:body></w:document>`,

    'word/styles.xml': `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles ${W}>
  <w:docDefaults>
    <w:rPrDefault><w:rPr>
      <w:rFonts w:ascii="Calibri" w:hAnsi="Calibri" w:cs="Calibri"/>
      <w:sz w:val="22"/><w:szCs w:val="22"/>
    </w:rPr></w:rPrDefault>
    <w:pPrDefault><w:pPr>
      <w:spacing w:after="120" w:line="240" w:lineRule="auto"/>
    </w:pPr></w:pPrDefault>
  </w:docDefaults>
  <w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/></w:style>
  <w:style w:type="paragraph" w:styleId="Heading1">
    <w:name w:val="heading 1"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:qFormat/>
    <w:pPr><w:keepNext/><w:spacing w:before="240" w:after="120"/></w:pPr>
    <w:rPr><w:b/><w:bCs/><w:color w:val="2563EB"/><w:sz w:val="32"/><w:szCs w:val="32"/></w:rPr>
  </w:style>
  <w:style w:type="paragraph" w:styleId="Heading2">
    <w:name w:val="heading 2"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:qFormat/>
    <w:pPr><w:keepNext/><w:spacing w:before="200" w:after="80"/></w:pPr>
    <w:rPr><w:b/><w:bCs/><w:color w:val="2563EB"/><w:sz w:val="26"/><w:szCs w:val="26"/></w:rPr>
  </w:style>
  <w:style w:type="paragraph" w:styleId="Heading3">
    <w:name w:val="heading 3"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:qFormat/>
    <w:pPr><w:keepNext/><w:spacing w:before="160" w:after="80"/></w:pPr>
    <w:rPr><w:b/><w:bCs/><w:color w:val="2563EB"/><w:sz w:val="24"/><w:szCs w:val="24"/></w:rPr>
  </w:style>
  <w:style w:type="paragraph" w:styleId="Heading4">
    <w:name w:val="heading 4"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:qFormat/>
    <w:pPr><w:keepNext/><w:spacing w:before="160" w:after="60"/></w:pPr>
    <w:rPr><w:b/><w:bCs/><w:color w:val="2563EB"/><w:sz w:val="22"/><w:szCs w:val="22"/></w:rPr>
  </w:style>
  <w:style w:type="paragraph" w:styleId="ListParagraph">
    <w:name w:val="List Paragraph"/><w:basedOn w:val="Normal"/>
    <w:pPr><w:ind w:left="720"/></w:pPr>
  </w:style>
  <w:style w:type="paragraph" w:styleId="Quote">
    <w:name w:val="Quote"/><w:basedOn w:val="Normal"/>
    <w:pPr><w:ind w:left="480"/><w:shd w:val="clear" w:color="auto" w:fill="FEF9C3"/></w:pPr>
    <w:rPr><w:color w:val="475569"/><w:sz w:val="18"/><w:szCs w:val="18"/></w:rPr>
  </w:style>
  <w:style w:type="table" w:styleId="TableGrid">
    <w:name w:val="Table Grid"/>
    <w:tblPr><w:tblBorders>
      <w:top ${bdr}/><w:left ${bdr}/><w:bottom ${bdr}/>
      <w:right ${bdr}/><w:insideH ${bdr}/><w:insideV ${bdr}/>
    </w:tblBorders></w:tblPr>
  </w:style>
</w:styles>`,

    'word/numbering.xml': `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:numbering ${W}>
  <w:abstractNum w:abstractNumId="0"><w:multiLevelType w:val="hybridMultilevel"/>
    <w:lvl w:ilvl="0"><w:start w:val="1"/><w:numFmt w:val="bullet"/><w:lvlText w:val="•"/>
      <w:lvlJc w:val="left"/><w:pPr><w:ind w:left="720" w:hanging="360"/></w:pPr></w:lvl>
  </w:abstractNum>
  <w:abstractNum w:abstractNumId="1"><w:multiLevelType w:val="hybridMultilevel"/>
    <w:lvl w:ilvl="0"><w:start w:val="1"/><w:numFmt w:val="decimal"/><w:lvlText w:val="%1."/>
      <w:lvlJc w:val="left"/><w:pPr><w:ind w:left="720" w:hanging="360"/></w:pPr></w:lvl>
  </w:abstractNum>
  <w:num w:numId="1"><w:abstractNumId w:val="0"/></w:num>
  <w:num w:numId="2"><w:abstractNumId w:val="1"/></w:num>
</w:numbering>`,
  };

  const zip = new JSZip();
  for (const [path, content] of Object.entries(files)) zip.file(path, content);
  const blob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE' });

  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}
