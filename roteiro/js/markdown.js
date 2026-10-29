// Markdown é o formato oficial dos roteiros: o mesmo arquivo abre no Obsidian,
// no Notion (importação), no VS Code ou em qualquer editor de texto.
// Aqui ficam: formatação em linha, blocos de página, tabelas, frontmatter e
// a conversão roteiro <-> arquivo .md.

import { uid } from './core.js';

// ---------- formatação em linha ----------

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export function inline(md) {
  const slots = [];
  const keep = (html) => `\u0000${slots.push(html) - 1}\u0000`;
  let s = esc(md || '');
  s = s.replace(/`([^`\n]+)`/g, (_, c) => keep(`<code>${c}</code>`));
  s = s.replace(/!?\[\[([^\]|\n]+)(?:\|([^\]\n]+))?\]\]/g, (_, target, alias) =>
    keep(`<a class="wikilink" href="#" data-wiki="${target.trim()}">${alias || target}</a>`));
  s = s.replace(/\[([^\]\n]+)\]\(((?:https?:\/\/|mailto:)[^)\s]+)\)/g, (_, text, url) =>
    keep(`<a href="${url}" target="_blank" rel="noopener">${text}</a>`));
  s = s.replace(/(^|[\s(])((?:https?:\/\/)[^\s<]+[^\s<.,;:!?)])/g, (_, pre, url) =>
    pre + keep(`<a href="${url}" target="_blank" rel="noopener">${url}</a>`));
  s = s.replace(/\*\*([^*\n]+)\*\*/g, '<strong>$1</strong>');
  s = s.replace(/__([^_\n]+)__/g, '<strong>$1</strong>');
  s = s.replace(/(^|[^*\w])\*([^*\n]+)\*(?!\*)/g, '$1<em>$2</em>');
  s = s.replace(/(^|[^_\w])_([^_\n]+)_(?![_\w])/g, '$1<em>$2</em>');
  s = s.replace(/~~([^~\n]+)~~/g, '<s>$1</s>');
  s = s.replace(/==([^=\n]+)==/g, '<mark>$1</mark>');
  s = s.replace(/\n/g, '<br>');
  return s.replace(/\u0000(\d+)\u0000/g, (_, i) => slots[i]);
}

// Tira a marcação, para .txt e buscas.
export function plain(md) {
  return (md || '')
    .replace(/^---\n[\s\S]*?\n---\n/, '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '[imagem: $1 $2]')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '$1 ($2)')
    .replace(/\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g, (_, a, b) => b || a)
    .replace(/(\*\*|__|~~|==)(.+?)\1/g, '$2')
    .replace(/<br>/g, ' / ')
    .replace(/^>\s?\[!(\w+)\]\s*/gm, '[$1] ')
    .replace(/^>\s?/gm, '  ')
    .replace(/^#{1,6}\s+(.*)$/gm, (_, t) => t.toUpperCase())
    .replace(/^\|\s*-[-|\s:]*\|?\s*$/gm, '')
    .replace(/\n{3,}/g, '\n\n');
}

// ---------- tabelas ----------

export function splitRow(line) {
  let t = line.trim();
  if (t.startsWith('|')) t = t.slice(1);
  if (t.endsWith('|') && !t.endsWith('\\|')) t = t.slice(0, -1);
  const cells = [];
  let cur = '';
  for (let i = 0; i < t.length; i++) {
    if (t[i] === '\\' && t[i + 1] === '|') { cur += '|'; i++; continue; }
    if (t[i] === '|') { cells.push(cur); cur = ''; continue; }
    cur += t[i];
  }
  cells.push(cur);
  return cells.map((c) => c.trim().replace(/<br\s*\/?>/gi, '\n'));
}

const isSepRow = (line) => /^\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)*\|?\s*$/.test(line.trim());
const cellMd = (v) => String(v ?? '').replace(/\|/g, '\\|').replace(/\r?\n/g, '<br>').trim();

export function tableToMd(rows) {
  if (!rows.length) return '';
  const width = Math.max(...rows.map((r) => r.length));
  const line = (r) => '| ' + Array.from({ length: width }, (_, i) => cellMd(r[i]) || ' ').join(' | ') + ' |';
  return [line(rows[0]), '| ' + Array(width).fill('---').join(' | ') + ' |', ...rows.slice(1).map(line)].join('\n');
}

export function parseTable(lines) {
  return lines.filter((l) => !isSepRow(l)).map(splitRow);
}

// ---------- blocos de página (editor estilo Notion/Obsidian) ----------

export const LIST_TYPES = new Set(['ul', 'ol', 'todo']);

const RX = {
  fence: /^```(.*)$/,
  heading: /^(#{1,6})\s+(.*)$/,
  todo: /^(\s*)[-*+]\s+\[( |x|X)\]\s?(.*)$/,
  ul: /^(\s*)[-*+]\s+(.*)$/,
  ol: /^(\s*)\d+[.)]\s+(.*)$/,
  hr: /^(-{3,}|\*{3,}|_{3,})\s*$/,
  callout: /^>\s?\[!(\w+)\][+-]?\s*(.*)$/,
  quote: /^>\s?(.*)$/,
  image: /^!\[([^\]]*)\]\(([^)]+)\)\s*$/,
  embed: /^!\[\[([^\]|]+)(?:\|[^\]]*)?\]\]\s*$/,
  table: /^\s*\|/,
};

const startsBlock = (l) => RX.fence.test(l) || RX.heading.test(l) || RX.ul.test(l) || RX.ol.test(l) || RX.hr.test(l)
  || RX.quote.test(l) || RX.image.test(l) || RX.embed.test(l) || RX.table.test(l);

const indentOf = (sp) => Math.min(3, Math.floor(sp.replace(/\t/g, '  ').length / 2));

export function parseBlocks(md) {
  const lines = (md || '').replace(/\r\n?/g, '\n').split('\n');
  const blocks = [];
  const add = (b) => blocks.push({ id: uid(), ...b });
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    let m;
    if (!line.trim()) { i++; continue; }
    if ((m = line.match(RX.fence))) {
      const body = [];
      i++;
      while (i < lines.length && !/^```\s*$/.test(lines[i])) body.push(lines[i++]);
      i++;
      add({ type: 'code', lang: m[1].trim(), text: body.join('\n') });
    } else if ((m = line.match(RX.heading))) {
      add({ type: 'h' + Math.min(3, m[1].length), text: m[2] });
      i++;
    } else if ((m = line.match(RX.todo))) {
      add({ type: 'todo', indent: indentOf(m[1]), checked: m[2] !== ' ', text: m[3] });
      i++;
    } else if (RX.hr.test(line)) {
      add({ type: 'hr' });
      i++;
    } else if ((m = line.match(RX.ul))) {
      add({ type: 'ul', indent: indentOf(m[1]), text: m[2] });
      i++;
    } else if ((m = line.match(RX.ol))) {
      add({ type: 'ol', indent: indentOf(m[1]), text: m[2] });
      i++;
    } else if ((m = line.match(RX.callout))) {
      const body = [];
      i++;
      while (i < lines.length && RX.quote.test(lines[i])) body.push(lines[i++].replace(/^>\s?/, ''));
      add({ type: 'callout', kind: m[1].toLowerCase(), title: m[2], text: body.join('\n') });
    } else if (RX.quote.test(line)) {
      const body = [];
      while (i < lines.length && RX.quote.test(lines[i]) && !RX.callout.test(lines[i])) body.push(lines[i++].replace(/^>\s?/, ''));
      add({ type: 'quote', text: body.join('\n') });
    } else if ((m = line.match(RX.image))) {
      add({ type: 'image', alt: m[1], src: m[2].trim() });
      i++;
    } else if ((m = line.match(RX.embed))) {
      const f = m[1].trim();
      add({ type: 'image', alt: '', src: f.includes('/') ? f : 'anexos/' + f });
      i++;
    } else if (RX.table.test(line)) {
      const rows = [];
      while (i < lines.length && RX.table.test(lines[i])) rows.push(lines[i++]);
      add({ type: 'table', rows: parseTable(rows) });
    } else {
      const body = [line];
      i++;
      while (i < lines.length && lines[i].trim() && !startsBlock(lines[i])) body.push(lines[i++]);
      add({ type: 'p', text: body.join('\n') });
    }
  }
  return blocks;
}

function blockToMd(b, olNumber) {
  const pad = '  '.repeat(b.indent || 0);
  const quoteLines = (t) => (t || '').split('\n').map((l) => ('> ' + l).trimEnd()).join('\n');
  switch (b.type) {
    case 'h1': return '# ' + b.text;
    case 'h2': return '## ' + b.text;
    case 'h3': return '### ' + b.text;
    case 'ul': return pad + '- ' + b.text;
    case 'ol': return pad + olNumber + '. ' + b.text;
    case 'todo': return pad + `- [${b.checked ? 'x' : ' '}] ` + b.text;
    case 'quote': return quoteLines(b.text);
    case 'callout': return `> [!${b.kind || 'note'}]${b.title ? ' ' + b.title : ''}` + (b.text ? '\n' + quoteLines(b.text) : '');
    case 'hr': return '---';
    case 'image': return `![${(b.alt || '').replace(/[[\]]/g, '')}](${b.src})`;
    case 'code': return '```' + (b.lang || '') + '\n' + b.text + '\n```';
    case 'table': return tableToMd(b.rows);
    default: return b.text;
  }
}

export function blocksToMd(blocks) {
  const out = [];
  let prev = null;
  const counters = [];
  for (const b of blocks) {
    if (b.type === 'p' && !b.text.trim()) continue;
    if (b.type === 'ol') {
      const lvl = b.indent || 0;
      counters.length = lvl + 1;
      counters[lvl] = prev && LIST_TYPES.has(prev.type) && (prev.type === 'ol' || (prev.indent || 0) > lvl) ? (counters[lvl] || 0) + 1 : 1;
    } else if (!LIST_TYPES.has(b.type)) {
      counters.length = 0;
    }
    const md = blockToMd(b, counters[b.indent || 0] || 1);
    if (prev) out.push(LIST_TYPES.has(prev.type) && LIST_TYPES.has(b.type) ? '\n' : '\n\n');
    out.push(md);
    prev = b;
  }
  return out.join('');
}

// ---------- frontmatter (YAML simples) ----------

function yamlValue(v) {
  if (Array.isArray(v)) return '[' + v.map(yamlValue).join(', ') + ']';
  if (typeof v === 'boolean' || typeof v === 'number') return String(v);
  const s = String(v ?? '');
  return s === '' || /[:#[\]{},"'&*!|>%@`]|^\s|\s$|^(true|false|null|\d+)$/i.test(s) ? JSON.stringify(s) : s;
}

export function toFrontmatter(obj) {
  const lines = Object.entries(obj).filter(([, v]) => v !== undefined).map(([k, v]) => `${k}: ${yamlValue(v)}`);
  return `---\n${lines.join('\n')}\n---\n`;
}

function parseScalar(raw) {
  const v = raw.trim();
  if (v.startsWith('"')) { try { return JSON.parse(v); } catch { return v.slice(1, -1); } }
  if (v.startsWith("'") && v.endsWith("'")) return v.slice(1, -1).replace(/''/g, "'");
  if (v === 'true') return true;
  if (v === 'false') return false;
  if (v.startsWith('[') && v.endsWith(']')) {
    const inner = v.slice(1, -1).trim();
    if (!inner) return [];
    return (inner.match(/"(?:[^"\\]|\\.)*"|'[^']*'|[^,]+/g) || []).map((x) => parseScalar(x)).filter((x) => x !== '');
  }
  return v;
}

export function parseFrontmatter(md) {
  const text = (md || '').replace(/\r\n?/g, '\n').replace(/^﻿/, '');
  const m = text.match(/^---\n([\s\S]*?)\n---\n?/);
  if (!m) return { data: {}, body: text };
  const data = {};
  let lastKey = null;
  for (const line of m[1].split('\n')) {
    const kv = line.match(/^([\w\-À-ÿ]+):\s*(.*)$/);
    if (kv) {
      lastKey = kv[1];
      data[lastKey] = kv[2] === '' ? '' : parseScalar(kv[2]);
    } else if (lastKey && /^\s+-\s+/.test(line)) {
      if (!Array.isArray(data[lastKey])) data[lastKey] = [];
      data[lastKey].push(parseScalar(line.replace(/^\s+-\s+/, '')));
    }
  }
  return { data, body: text.slice(m[0].length) };
}

// ---------- roteiro <-> .md ----------

const norm = (s) => (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
const MARKER = /^<!--\s*aba:\s*(\w+)\s*(\{.*\})?\s*-->\s*$/;
const imageMd = (src, alt = '') => (src ? `![${alt.replace(/[[\]]/g, '')}](${src})` : '');
const imageSrc = (cell) => {
  const m = (cell || '').match(/!\[[^\]]*\]\(([^)]+)\)/) || (cell || '').match(/!\[\[([^\]|]+)/);
  if (!m) return '';
  const f = m[1].trim();
  return f.includes('/') || /^https?:/.test(f) ? f : 'anexos/' + f;
};
const linkParts = (cell) => {
  const m = (cell || '').match(/^\[([^\]]*)\]\(([^)\s]+)\)$/);
  if (m) return { title: m[1], url: m[2] };
  if (/^https?:\/\/\S+$/.test((cell || '').trim())) return { title: '', url: cell.trim() };
  return { title: cell || '', url: '' };
};

function roteiroToMd(t) {
  let n = 0;
  return t.sections.map((sec) => {
    const parts = [`### ${sec.name || 'Seção'}`];
    if (sec.hint) parts.push(sec.hint.split('\n').map((l) => '> ' + l).join('\n'));
    parts.push(tableToMd([
      ['Cena', 'Narração', 'Visual', 'Plano', 'Frame'],
      ...sec.scenes.map((c) => [String(++n).padStart(2, '0'), c.narration, c.visual, c.plano, imageMd(c.image)]),
    ]));
    return parts.join('\n\n');
  }).join('\n\n');
}

function parseRoteiro(body) {
  const sections = [];
  let sec = null;
  let tableLines = [];
  const flush = () => {
    if (!tableLines.length) return;
    const rows = parseTable(tableLines);
    tableLines = [];
    if (!sec) sections.push((sec = { id: uid(), name: 'Cenas', hint: '', scenes: [] }));
    const head = rows.shift().map(norm);
    const col = (names) => head.findIndex((x) => names.some((n) => x.startsWith(n)));
    const ci = { narration: col(['narra', 'fala', 'texto']), visual: col(['visual', 'imagem da cena', 'video']), plano: col(['plano', 'enquadra']), frame: col(['frame', 'imagem', 'quadro']) };
    for (const r of rows) {
      sec.scenes.push({
        id: uid(),
        narration: ci.narration >= 0 ? r[ci.narration] || '' : r[1] || '',
        visual: ci.visual >= 0 ? r[ci.visual] || '' : r[2] || '',
        plano: ci.plano >= 0 ? r[ci.plano] || '' : '',
        image: ci.frame >= 0 ? imageSrc(r[ci.frame]) : '',
      });
    }
  };
  for (const line of body.split('\n')) {
    const hm = line.match(/^#{2,4}\s+(.*)$/);
    if (hm) {
      flush();
      sections.push((sec = { id: uid(), name: hm[1].trim(), hint: '', scenes: [] }));
    } else if (RX.table.test(line)) {
      tableLines.push(line);
    } else {
      flush();
      const q = line.match(/^>\s?(.*)$/);
      if (q && sec) sec.hint = sec.hint ? sec.hint + '\n' + q[1] : q[1];
    }
  }
  flush();
  return sections;
}

function moodboardToMd(t) {
  return t.items.map((it) => {
    if (it.kind === 'image') return `- ${imageMd(it.src, it.caption || '')}`;
    if (it.kind === 'color') return `- cor: ${it.color}${it.caption ? ' ' + it.caption.replace(/\n/g, ' ') : ''}`;
    if (it.kind === 'link') return `- [${(it.title || it.url).replace(/[[\]]/g, '')}](${it.url})${it.caption ? ' — ' + it.caption.replace(/\n/g, ' ') : ''}`;
    return `- nota: ${cellMd(it.text)}`;
  }).join('\n');
}

function parseMoodboard(body) {
  const items = [];
  for (const raw of body.split('\n')) {
    const line = raw.replace(/^\s*[-*+]\s+/, '');
    if (line === raw && !raw.trim().startsWith('!')) continue;
    if (!line.trim()) continue;
    let m;
    if ((m = line.match(/^!\[([^\]]*)\]\(([^)]+)\)/))) items.push({ id: uid(), kind: 'image', src: m[2].trim(), caption: m[1] });
    else if ((m = line.match(/^!\[\[([^\]|]+)/))) items.push({ id: uid(), kind: 'image', src: imageSrc(line), caption: '' });
    else if ((m = line.match(/^cor:\s*(#[0-9a-f]{3,8})\b\s*(.*)$/i))) items.push({ id: uid(), kind: 'color', color: m[1], caption: m[2] });
    else if ((m = line.match(/^\[([^\]]*)\]\(([^)\s]+)\)\s*(?:—\s*(.*))?$/))) items.push({ id: uid(), kind: 'link', title: m[1], url: m[2], caption: m[3] || '' });
    else items.push({ id: uid(), kind: 'note', text: line.replace(/^nota:\s*/i, '').replace(/<br\s*\/?>/gi, '\n') });
  }
  return items;
}

const REF_HEAD = ['Tipo', 'Referência', 'Autor / fonte', 'Nota', 'Cena'];

function referenciasToMd(t) {
  if (!t.items.length) return '';
  return tableToMd([REF_HEAD, ...t.items.map((r) => [
    r.tipo,
    r.url ? `[${(r.titulo || r.url).replace(/[[\]]/g, '')}](${r.url})` : r.titulo,
    r.autor, r.nota, r.cena,
  ])]);
}

function parseReferencias(body) {
  const lines = body.split('\n').filter((l) => RX.table.test(l));
  if (!lines.length) return [];
  const rows = parseTable(lines);
  const head = rows.shift().map(norm);
  const col = (n) => head.findIndex((x) => x.startsWith(n));
  const c = { tipo: col('tipo'), ref: col('refer'), autor: col('autor'), nota: col('nota'), cena: col('cena') };
  return rows.map((r) => {
    const link = linkParts(r[c.ref >= 0 ? c.ref : 1]);
    return {
      id: uid(),
      tipo: r[c.tipo >= 0 ? c.tipo : 0] || 'Outro',
      titulo: link.title,
      url: link.url,
      autor: c.autor >= 0 ? r[c.autor] || '' : '',
      nota: c.nota >= 0 ? r[c.nota] || '' : '',
      cena: c.cena >= 0 ? r[c.cena] || '' : '',
    };
  });
}

function tabelaToMd(t) {
  if (!t.columns.length) return '';
  const fmt = (col, v) => (col.type === 'check' ? (v ? '[x]' : '[ ]') : v ?? '');
  return tableToMd([t.columns.map((c) => c.name), ...t.rows.map((r) => t.columns.map((c) => fmt(c, r.cells[c.id])))]);
}

function parseTabela(body, meta) {
  const lines = body.split('\n').filter((l) => RX.table.test(l));
  if (!lines.length) return { columns: [], rows: [] };
  const rows = parseTable(lines);
  const types = meta?.tipos || {};
  const columns = rows.shift().map((name) => ({ id: uid(), name, type: types[name] || 'texto' }));
  return {
    columns,
    rows: rows.map((r) => ({
      id: uid(),
      cells: Object.fromEntries(columns.map((c, i) => [c.id, c.type === 'check' ? /\[x\]/i.test(r[i] || '') : r[i] || ''])),
    })),
  };
}

const POST_COLS = [
  ['platform', 'Plataforma'], ['format', 'Formato'], ['date', 'Data'], ['time', 'Hora'], ['status', 'Status'],
  ['campaign', 'Campanha'], ['link', 'Link'], ['views', 'Visualizações'], ['likes', 'Curtidas'],
  ['comments', 'Comentários'], ['shares', 'Compartilhamentos'], ['saves', 'Salvos'], ['note', 'Nota'],
];

function publicacoesToMd(t) {
  if (!t.posts.length) return '';
  return tableToMd([POST_COLS.map((c) => c[1]), ...t.posts.map((p) => POST_COLS.map(([k]) => (k === 'campaign' && p.campaign ? `[[${p.campaign}]]` : p[k])))]);
}

function parsePublicacoes(body) {
  const lines = body.split('\n').filter((l) => RX.table.test(l));
  if (!lines.length) return [];
  const rows = parseTable(lines);
  const head = rows.shift().map(norm);
  const idx = Object.fromEntries(POST_COLS.map(([k, label]) => [k, head.findIndex((x) => x.startsWith(norm(label).slice(0, 6)))]));
  return rows.map((r) => {
    const p = { id: uid() };
    for (const [k] of POST_COLS) p[k] = idx[k] >= 0 ? (r[idx[k]] || '').trim() : '';
    p.campaign = p.campaign.replace(/^\[\[([^\]|]+)(?:\|[^\]]*)?\]\]$/, '$1');
    p.platform ||= 'Outro';
    p.status ||= 'Planejado';
    return p;
  });
}

function tabMeta(t) {
  if (t.type === 'roteiro' || t.type === 'referencias') return t.view ? { view: t.view } : null;
  if (t.type === 'tabela') {
    const tipos = Object.fromEntries(t.columns.filter((c) => c.type !== 'texto').map((c) => [c.name, c.type]));
    const meta = {};
    if (Object.keys(tipos).length) meta.tipos = tipos;
    if (t.view && t.view !== 'tabela') meta.view = t.view;
    return Object.keys(meta).length ? meta : null;
  }
  return null;
}

function tabToMd(t) {
  const meta = tabMeta(t);
  const content = {
    pagina: () => t.content || '',
    texto: () => t.content || '',
    roteiro: () => roteiroToMd(t),
    moodboard: () => moodboardToMd(t),
    referencias: () => referenciasToMd(t),
    tabela: () => tabelaToMd(t),
    publicacoes: () => publicacoesToMd(t),
  }[t.type]?.() ?? '';
  return `## ${(t.name || 'Aba').replace(/\n/g, ' ')}\n<!-- aba: ${t.type}${meta ? ' ' + JSON.stringify(meta) : ''} -->\n\n${content.trim()}`;
}

export function scriptToMd(s) {
  const c = s.kind === 'campanha' ? s.campaign || {} : null;
  const fm = toFrontmatter({
    id: s.id,
    tipo: c ? 'campanha' : undefined,
    titulo: s.title || '',
    objetivo: c ? c.objetivo || '' : undefined,
    inicio: c ? c.inicio || '' : undefined,
    fim: c ? c.fim || '' : undefined,
    plataformas: c ? c.plataformas || [] : undefined,
    cor: c ? c.cor || '' : undefined,
    status: s.status,
    pasta: s.folder || '',
    tags: s.tags || [],
    estrutura: s.template || '',
    capa: s.cover || '',
    fixado: !!s.pinned,
    lixeira: !!s.deleted,
    criado: new Date(s.createdAt).toISOString(),
    atualizado: new Date(s.updatedAt).toISOString(),
  });
  return `${fm}\n# ${s.title || 'Sem título'}\n\n${s.tabs.map(tabToMd).join('\n\n')}\n`;
}

export function mdToScript(md, { fallbackTitle = '', id } = {}) {
  const { data, body } = parseFrontmatter(md);
  const lines = body.split('\n');
  const markers = [];
  lines.forEach((l, i) => { const m = l.match(MARKER); if (m) markers.push({ i, type: m[1], meta: m[2] }); });
  const h1 = body.match(/^#\s+(.+)$/m);
  const tabs = [];
  if (!markers.length) {
    tabs.push({ id: uid(), type: 'pagina', name: 'Notas', content: body.replace(/^\s*#\s+.+\n?/, '').trim() });
  }
  markers.forEach((mk, k) => {
    const prevLine = lines[mk.i - 1] || '';
    const name = (prevLine.match(/^##\s+(.*)$/) || [])[1] || 'Aba';
    let end = k + 1 < markers.length ? markers[k + 1].i : lines.length;
    if (k + 1 < markers.length && /^##\s+/.test(lines[end - 1] || '')) end--;
    const content = lines.slice(mk.i + 1, end).join('\n').trim();
    let meta = null;
    try { meta = mk.meta ? JSON.parse(mk.meta) : null; } catch {}
    const tab = { id: uid(), type: mk.type, name: name.trim() };
    if (mk.type === 'roteiro') Object.assign(tab, { view: meta?.view || 'tabela', sections: parseRoteiro(content) });
    else if (mk.type === 'moodboard') tab.items = parseMoodboard(content);
    else if (mk.type === 'referencias') Object.assign(tab, { view: meta?.view || 'cartoes', items: parseReferencias(content) });
    else if (mk.type === 'tabela') Object.assign(tab, { view: meta?.view || 'tabela' }, parseTabela(content, meta));
    else if (mk.type === 'texto') tab.content = content;
    else if (mk.type === 'publicacoes') tab.posts = parsePublicacoes(content);
    else { tab.type = 'pagina'; tab.content = content; }
    tabs.push(tab);
  });
  const toTs = (v, fb) => { const t = Date.parse(v); return Number.isFinite(t) ? t : fb; };
  const now = Date.now();
  const isCampaign = data.tipo === 'campanha';
  const list = (v) => (Array.isArray(v) ? v : String(v || '').split(',')).map((t) => String(t).trim()).filter(Boolean);
  return {
    ...(isCampaign ? {
      kind: 'campanha',
      campaign: { objetivo: String(data.objetivo || ''), inicio: String(data.inicio || ''), fim: String(data.fim || ''), plataformas: list(data.plataformas), cor: String(data.cor || '#8a2e1d') },
    } : {}),
    id: String(data.id || id || uid()),
    title: String(data.titulo ?? data.title ?? (h1 ? h1[1].trim() : fallbackTitle)),
    status: String(data.status || 'Ideia'),
    folder: String(data.pasta || ''),
    tags: (Array.isArray(data.tags) ? data.tags : String(data.tags || '').split(',')).map((t) => String(t).trim()).filter(Boolean),
    template: String(data.estrutura || ''),
    cover: String(data.capa || ''),
    pinned: data.fixado === true,
    deleted: data.lixeira === true,
    createdAt: toTs(data.criado, now),
    updatedAt: toTs(data.atualizado, now),
    tabs,
  };
}

// Caminhos de anexos (imagens locais) usados por um roteiro.
export function attachmentsIn(s) {
  const out = new Set();
  const addSrc = (src) => { if (src && src.startsWith('anexos/')) out.add(src); };
  addSrc(s.cover);
  for (const t of s.tabs || []) {
    if (t.type === 'pagina') for (const m of (t.content || '').matchAll(/!\[[^\]]*\]\((anexos\/[^)\s]+)\)/g)) out.add(m[1]);
    if (t.type === 'roteiro') t.sections.forEach((sec) => sec.scenes.forEach((c) => addSrc(c.image)));
    if (t.type === 'moodboard') t.items.forEach((it) => addSrc(it.src));
  }
  return [...out];
}
