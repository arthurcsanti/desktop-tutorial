// Importação de documentos de outros apps: Word (.docx), LibreOffice (.odt),
// página web (.html), texto (.txt) e Markdown (.md) sem o formato do app.
//
// Todo arquivo vira primeiro um "documento" simples (títulos, parágrafos,
// listas e tabelas). Depois, conforme o modelo de importação escolhido:
//  - "detectar": reconhece a estrutura de roteiro (ficha, tabela de cenas
//    CENA | NARRAÇÃO | VISUAL, notas de produção, texto integral) e põe
//    cada parte na aba certa;
//  - "pagina": tudo numa aba de página, com a formatação;
//  - "texto": tudo na aba Texto corrido.

import { readZip } from './zip.js';
import { parseBlocks, tableToMd } from './markdown.js';
import { buildScript, TEMPLATES } from './model.js';
import { uid } from './core.js';

export const IMPORT_EXT = /\.(docx|odt|html?|txt|md|markdown)$/i;

const dec = new TextDecoder();
const norm = (s) => (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();
const cap = (s) => { const t = (s || '').trim().toLowerCase(); return t.charAt(0).toUpperCase() + t.slice(1); };
const xml = (text) => new DOMParser().parseFromString(text, 'application/xml');
const kids = (el, name) => [...(el?.children || [])].filter((c) => !name || c.localName === name);
const attr = (el, name) => el?.getAttribute(name) ?? [...(el?.attributes || [])].find((a) => a.localName === name)?.value ?? null;

// Junta trechos com a mesma formatação e escreve em Markdown (**negrito**, *itálico*, ~~riscado~~, [link](url)).
function runsToMd(runs) {
  const merged = [];
  for (const r of runs) {
    const last = merged.at(-1);
    if (last && last.b === r.b && last.i === r.i && last.s === r.s && last.href === r.href) last.text += r.text;
    else merged.push({ ...r });
  }
  const md = merged.map((r) => {
    if (!r.text) return '';
    const m = r.text.match(/^(\s*)([\s\S]*?)(\s*)$/);
    let core = m[2];
    if (!core) return r.text;
    if (r.s) core = `~~${core}~~`;
    if (r.i) core = `*${core}*`;
    if (r.b) core = `**${core}**`;
    if (r.href) core = `[${core}](${r.href})`;
    return m[1] + core + m[3];
  }).join('');
  return { md, plain: merged.map((r) => r.text).join('') };
}

/* ---------- Word (.docx) ---------- */

async function docxToDoc(file) {
  const entries = await readZip(file);
  const get = (n) => entries.find((e) => e.name === n);
  const main = get('word/document.xml');
  if (!main) throw new Error('Não parece um arquivo do Word (.docx).');
  const doc = xml(dec.decode(main.data));
  const rels = {};
  const relsFile = get('word/_rels/document.xml.rels');
  if (relsFile) kids(xml(dec.decode(relsFile.data)).documentElement, 'Relationship').forEach((r) => { rels[attr(r, 'Id')] = attr(r, 'Target'); });
  const styles = {};
  const stylesFile = get('word/styles.xml');
  if (stylesFile) kids(xml(dec.decode(stylesFile.data)).documentElement, 'style').forEach((s) => { styles[attr(s, 'styleId')] = (attr(kids(s, 'name')[0], 'val') || '').toLowerCase(); });
  const ordered = {};
  const numFile = get('word/numbering.xml');
  if (numFile) {
    const nd = xml(dec.decode(numFile.data)).documentElement;
    const abs = {};
    kids(nd, 'abstractNum').forEach((a) => {
      const lvl0 = kids(a, 'lvl')[0];
      abs[attr(a, 'abstractNumId')] = attr(kids(lvl0, 'numFmt')[0], 'val') === 'decimal';
    });
    kids(nd, 'num').forEach((n) => { ordered[attr(n, 'numId')] = abs[attr(kids(n, 'abstractNumId')[0], 'val')]; });
  }
  const on = (rPr, name) => { const e = kids(rPr, name)[0]; return !!e && !/^(0|false|none)$/i.test(attr(e, 'val') || ''); };

  const paraRuns = (p) => {
    const runs = [];
    const walk = (el, href) => {
      for (const c of kids(el)) {
        if (c.localName === 'r') {
          const rPr = kids(c, 'rPr')[0];
          const fmt = { b: on(rPr, 'b'), i: on(rPr, 'i'), s: on(rPr, 'strike'), href };
          for (const t of kids(c)) {
            if (t.localName === 't') runs.push({ ...fmt, text: t.textContent });
            else if (t.localName === 'tab') runs.push({ ...fmt, text: '\t' });
            else if (t.localName === 'br' || t.localName === 'cr') runs.push({ ...fmt, text: '\n' });
          }
        } else if (c.localName === 'hyperlink') walk(c, rels[attr(c, 'id')] || href);
        else if (['smartTag', 'ins', 'sdt', 'sdtContent', 'fldSimple'].includes(c.localName)) walk(c, href);
      }
    };
    walk(p);
    return runs;
  };

  const blocks = [];
  const para = (p) => {
    const pPr = kids(p, 'pPr')[0];
    const styleId = attr(kids(pPr, 'pStyle')[0], 'val') || '';
    const style = styles[styleId] || styleId.toLowerCase();
    const { md, plain } = runsToMd(paraRuns(p));
    const hm = style.match(/^(?:heading|t[ií]tulo|titulo|ttulo)\s*(\d)/i) || (/^title$/i.test(style) ? [0, '1'] : null);
    const numPr = kids(pPr, 'numPr')[0];
    if (hm && plain.trim()) return { type: 'h', level: +hm[1], md: plain.trim(), plain: plain.trim() };
    if (numPr || /list/.test(style)) {
      const numId = attr(kids(numPr, 'numId')[0], 'val');
      return { type: 'li', ordered: numId ? !!ordered[numId] : /number/.test(style), indent: +(attr(kids(numPr, 'ilvl')[0], 'val') || 0), md, plain };
    }
    return { type: 'p', md, plain };
  };
  const cellText = (tc) => kids(tc, 'p').map((p) => runsToMd(paraRuns(p)).plain).join('\n').trim();
  const body = doc.getElementsByTagNameNS('*', 'body')[0];
  for (const el of kids(body)) {
    if (el.localName === 'p') blocks.push(para(el));
    else if (el.localName === 'tbl') blocks.push({ type: 'table', rows: kids(el, 'tr').map((tr) => kids(tr, 'tc').map(cellText)) });
    else if (el.localName === 'sdt') kids(kids(el, 'sdtContent')[0], 'p').forEach((p) => blocks.push(para(p)));
  }
  return blocks;
}

/* ---------- LibreOffice / OpenDocument (.odt) ---------- */

async function odtToDoc(file) {
  const entries = await readZip(file);
  const content = entries.find((e) => e.name === 'content.xml');
  if (!content) throw new Error('Não parece um arquivo .odt.');
  const doc = xml(dec.decode(content.data));
  const textOf = (el) => {
    let out = '';
    for (const n of el.childNodes) {
      if (n.nodeType === 3) out += n.nodeValue;
      else if (n.localName === 's') out += ' '.repeat(+(attr(n, 'c') || 1));
      else if (n.localName === 'tab') out += '\t';
      else if (n.localName === 'line-break') out += '\n';
      else if (n.localName === 'a') out += `[${textOf(n)}](${attr(n, 'href')})`;
      else out += textOf(n);
    }
    return out;
  };
  const blocks = [];
  const walk = (el, indent = 0) => {
    for (const c of kids(el)) {
      if (c.localName === 'h') { const t = textOf(c).trim(); if (t) blocks.push({ type: 'h', level: +(attr(c, 'outline-level') || 1), md: t, plain: t }); }
      else if (c.localName === 'p') { const t = textOf(c); blocks.push({ type: 'p', md: t, plain: t }); }
      else if (c.localName === 'list') kids(c, 'list-item').forEach((li) => kids(li).forEach((x) => {
        if (x.localName === 'p') { const t = textOf(x); blocks.push({ type: 'li', ordered: false, indent, md: t, plain: t }); }
        else if (x.localName === 'list') walk({ children: [x] }, indent + 1);
      }));
      else if (c.localName === 'table') {
        const rows = c.getElementsByTagNameNS('*', 'table-row');
        blocks.push({ type: 'table', rows: [...rows].map((r) => kids(r, 'table-cell').map((tc) => kids(tc, 'p').map(textOf).join('\n').trim())) });
      } else if (c.localName === 'section') walk(c, indent);
    }
  };
  walk(doc.getElementsByTagNameNS('*', 'text')[0]);
  return blocks;
}

/* ---------- página web (.html), inclusive "Baixar como HTML" do Google Docs ---------- */

function htmlToDoc(text) {
  const doc = new DOMParser().parseFromString(text, 'text/html');
  doc.querySelectorAll('script, style, head').forEach((e) => e.remove());
  const inline = (el) => {
    const runs = [];
    const walk = (n, fmt) => {
      for (const c of n.childNodes) {
        if (c.nodeType === 3) runs.push({ ...fmt, text: c.nodeValue.replace(/\s+/g, ' ') });
        else if (c.nodeType === 1) {
          const t = c.tagName.toLowerCase();
          const st = (c.getAttribute('style') || '').toLowerCase();
          if (t === 'br') { runs.push({ ...fmt, text: '\n' }); continue; }
          walk(c, {
            b: fmt.b || t === 'b' || t === 'strong' || /font-weight:\s*(700|bold)/.test(st),
            i: fmt.i || t === 'i' || t === 'em' || /font-style:\s*italic/.test(st),
            s: fmt.s || t === 's' || t === 'del' || /line-through/.test(st),
            href: t === 'a' && /^https?:/.test(c.getAttribute('href') || '') ? c.getAttribute('href') : fmt.href,
          });
        }
      }
    };
    walk(el, { b: false, i: false, s: false, href: null });
    return runsToMd(runs);
  };
  const blocks = [];
  const walk = (el, indent = 0) => {
    for (const c of el.children) {
      const t = c.tagName.toLowerCase();
      if (/^h[1-6]$/.test(t)) { const x = c.textContent.trim(); if (x) blocks.push({ type: 'h', level: +t[1], md: x, plain: x }); }
      else if (t === 'p') { const r = inline(c); blocks.push({ type: 'p', ...r }); }
      else if (t === 'ul' || t === 'ol') [...c.children].filter((li) => li.tagName === 'LI').forEach((li) => {
        // o texto do item sem as sublistas; as sublistas entram em seguida, com recuo
        const own = li.cloneNode(true);
        own.querySelectorAll('ul, ol').forEach((y) => y.remove());
        blocks.push({ type: 'li', ordered: t === 'ol', indent, ...inline(own) });
        li.querySelectorAll(':scope > ul, :scope > ol').forEach((sub) => walk({ children: [sub] }, indent + 1));
      });
      else if (t === 'table') blocks.push({ type: 'table', rows: [...c.querySelectorAll('tr')].map((tr) => [...tr.children].map((td) => td.innerText?.trim() ?? td.textContent.trim())) });
      else if (['div', 'section', 'article', 'main', 'body'].includes(t)) walk(c, indent);
      else if (t === 'hr') blocks.push({ type: 'p', md: '---', plain: '' });
    }
  };
  walk(doc.body);
  return blocks;
}

/* ---------- texto e Markdown ---------- */

function txtToDoc(text) {
  return text.replace(/\r\n?/g, '\n').split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean).map((p) => ({ type: 'p', md: p, plain: p }));
}

// O Google Docs e outros apps escapam caracteres no Markdown (\[beat\]): aqui eles voltam ao normal.
const unescape = (t) => (t || '').replace(/\\([\\`*_{}[\]()#+\-.!|>~=])/g, '$1');

function mdToDoc(text) {
  const body = text.replace(/^---\n[\s\S]*?\n---\n/, '');
  return parseBlocks(body).map((b) => ({ ...b, text: b.text, rows: b.rows?.map((r) => r.map(unescape)) })).map((b) => {
    if (/^h[1-3]$/.test(b.type)) return { type: 'h', level: +b.type[1], md: b.text, plain: b.text };
    if (b.type === 'ul' || b.type === 'ol' || b.type === 'todo') return { type: 'li', ordered: b.type === 'ol', indent: b.indent || 0, md: b.type === 'todo' ? `[${b.checked ? 'x' : ' '}] ${b.text}` : b.text, plain: b.text };
    if (b.type === 'table') return { type: 'table', rows: b.rows };
    if (b.type === 'image') return { type: 'p', md: `![${b.alt || ''}](${b.src})`, plain: '' };
    if (b.type === 'hr') return { type: 'p', md: '---', plain: '' };
    return { type: 'p', md: b.text || '', plain: unescape((b.text || '').replace(/(\*\*|__|~~|==|\*|_)/g, '')) };
  }).map((b) => (b.type === 'h' ? { ...b, md: unescape(b.md), plain: unescape(b.plain) } : b));
}

export async function fileToDoc(file) {
  const name = file.name || '';
  if (/\.docx$/i.test(name)) return docxToDoc(file);
  if (/\.odt$/i.test(name)) return odtToDoc(file);
  if (/\.html?$/i.test(name)) return htmlToDoc(await file.text());
  if (/\.(md|markdown)$/i.test(name)) return mdToDoc(await file.text());
  if (/\.txt$/i.test(name)) return txtToDoc(await file.text());
  if (/\.doc$/i.test(name)) throw new Error('Arquivos .doc antigos não são lidos. No Word ou no Google Docs, salve como .docx e importe de novo.');
  throw new Error('Formato não suportado.');
}

/* ---------- documento -> Markdown ---------- */

export function docToMd(blocks) {
  const out = [];
  let prev = null;
  for (const b of blocks) {
    let md;
    if (b.type === 'h') md = '#'.repeat(Math.min(3, b.level)) + ' ' + b.md;
    else if (b.type === 'li') md = '  '.repeat(b.indent || 0) + (b.ordered ? '1. ' : '- ') + b.md.replace(/\n/g, ' ');
    else if (b.type === 'table') md = b.rows.length ? tableToMd(b.rows.map((r) => r.map((c) => c || ''))) : '';
    else md = b.md.trim() ? b.md.trim() : '';
    if (!md) continue;
    if (prev) out.push(prev.type === 'li' && b.type === 'li' ? '\n' : '\n\n');
    out.push(md);
    prev = b;
  }
  return out.join('');
}

const plainText = (blocks) => blocks.filter((b) => b.type !== 'table').map((b) => (b.type === 'li' ? '– ' : '') + (b.plain ?? '')).filter((t) => t.trim()).join('\n\n');

/* ---------- reconhecer a estrutura de um roteiro ---------- */

const KIND = [
  ['ficha', /^ficha/],
  ['legenda', /^legenda/],
  ['texto', /^(roteiro|texto) (integral|corrido|completo|final)|^texto$|^narracao completa/],
  ['roteiro', /^roteiro$|^roteiro (do video|de cenas|tecnico)$|^cenas$|^decupagem/],
  ['producao', /^(notas de )?producao$|^notas$/],
  ['historico', /^historico/],
  ['referencias', /^referencias$/],
];
const kindOf = (title) => KIND.find(([, rx]) => rx.test(norm(title)))?.[0] || 'outro';
const isSceneTable = (rows) => rows.some((r) => r.some((c) => /^cena$/.test(norm(c))) && r.some((c) => /^narra/.test(norm(c))));
const isSectionName = (t) => t && t.length <= 40 && t === t.toUpperCase() && /[A-ZÀ-Ý]/.test(t) && !/[:[\]]/.test(t);

function parseScenes(rows) {
  let start = rows.findIndex((r) => r.some((c) => /^cena$/.test(norm(c))));
  start = start < 0 ? 0 : start + 1;
  const sections = [];
  let cur = null;
  const ensure = () => cur || (sections.push((cur = { id: uid(), name: 'Cenas', hint: '', scenes: [] })), cur);
  for (const raw of rows.slice(start)) {
    const c = raw.map((x) => (x || '').trim());
    if (!c.some(Boolean)) continue;
    if (/^\d{1,3}$/.test(c[0])) ensure().scenes.push({ id: uid(), narration: c[1] || '', visual: c[2] || '', plano: '', image: '' });
    else if (isSectionName(c[0]) && !c[2]) { sections.push((cur = { id: uid(), name: cap(c[0]), hint: c[1] || '', scenes: [] })); }
    // linhas sem número (células mescladas no Google Docs/Word): a fala vem na 1ª coluna
    else ensure().scenes.push({ id: uid(), narration: c[0] || '', visual: c[1] || '', plano: '', image: '' });
  }
  sections.forEach((s) => { if (!s.scenes.length) s.scenes.push({ id: uid(), narration: '', visual: '', plano: '', image: '' }); });
  return sections;
}

const kvMd = (rows) => rows.filter((r) => (r[0] || '').trim()).map((r) => `### ${cap(r[0])}\n\n${(r.slice(1).join('\n') || '').trim()}`).join('\n\n');

export function detectStructure(blocks) {
  const headings = blocks.filter((b) => b.type === 'h');
  const top = headings.length ? Math.min(...headings.map((b) => b.level)) : 0;
  const parts = { cover: [], ficha: null, roteiro: null, producao: null, historico: null, texto: null, extras: [] };
  let section = { title: '', blocks: parts.cover, kind: 'capa' };
  const sections = [];
  for (const b of blocks) {
    if (b.type === 'h' && b.level === top) {
      section = { title: b.plain, blocks: [], kind: kindOf(b.plain) };
      sections.push(section);
    } else section.blocks.push(b);
  }
  // Sem títulos: uma tabela de cenas solta ainda vira roteiro; o resto vai para o texto corrido.
  if (!sections.length) {
    const t = blocks.find((b) => b.type === 'table' && isSceneTable(b.rows));
    if (t) { parts.roteiro = parseScenes(t.rows); parts.texto = plainText(blocks.filter((b) => b !== t)); }
    else parts.texto = plainText(blocks);
    parts.cover = [];
    return parts;
  }
  for (const s of sections) {
    const tables = s.blocks.filter((b) => b.type === 'table');
    const rest = s.blocks.filter((b) => b.type !== 'table');
    if (s.kind === 'roteiro' || (s.kind === 'outro' && tables.some((t) => isSceneTable(t.rows)))) {
      const t = tables.find((x) => isSceneTable(x.rows)) || tables[0];
      parts.roteiro = t ? parseScenes(t.rows) : null;
      if (!t) parts.extras.push({ name: cap(s.title), content: docToMd(s.blocks) });
    } else if (s.kind === 'ficha') parts.ficha = [kvMd(tables.flatMap((t) => t.rows)), docToMd(rest)].filter(Boolean).join('\n\n');
    else if (s.kind === 'producao') parts.producao = [kvMd(tables.flatMap((t) => t.rows)), docToMd(rest)].filter(Boolean).join('\n\n');
    else if (s.kind === 'historico') parts.historico = tables[0]?.rows || null;
    else if (s.kind === 'texto') parts.texto = plainText(s.blocks);
    else if (s.kind === 'legenda') continue; // o app já tem a legenda (e ela é configurável)
    else parts.extras.push({ name: cap(s.title) || 'Página', content: docToMd(s.blocks) });
  }
  return parts;
}

/* ---------- montar o roteiro ---------- */

const PLACEHOLDER_TITLE = /^(titulo do video|titulo|sem titulo)$/;

// O título vem da capa do documento quando ela tem um título de verdade; senão, do nome do arquivo.
function guessTitle(cover, fallback) {
  const lines = cover.filter((b) => b.type !== 'table').map((b) => (b.plain || '').trim()).filter(Boolean);
  const t = lines.find((l) => !/^roteiro$/i.test(l));
  const looksLikeTitle = t && t.length <= 70 && !/[.;:!?]$/.test(t) && !PLACEHOLDER_TITLE.test(norm(t)) && kindOf(t) === 'outro';
  return looksLikeTitle ? t : fallback;
}

// Converte um arquivo num roteiro do app. Devolve { script, summary }.
export async function importDocument(file, { mode = 'detectar', template = 'youtube-3-atos', folder = '' } = {}) {
  const blocks = await fileToDoc(file);
  const fallback = (file.name || 'Importado').replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ').trim();
  const tpl = TEMPLATES.some((t) => t.id === template) ? template : 'youtube-3-atos';
  const s = buildScript(tpl);
  s.folder = folder;
  s.status = 'Rascunho';
  const tab = (type, name) => s.tabs.find((t) => t.type === type && (!name || t.name === name));
  const summary = [];

  if (mode === 'pagina') {
    s.title = guessTitle(blocks.slice(0, 6), fallback);
    const page = { id: uid(), type: 'pagina', name: 'Documento importado', content: docToMd(blocks) };
    s.tabs.unshift(page);
    s.activeTab = page.id;
    summary.push('documento inteiro na aba "Documento importado"');
  } else if (mode === 'texto') {
    s.title = guessTitle(blocks.slice(0, 3), fallback);
    const t = tab('texto');
    t.content = plainText(blocks);
    s.activeTab = t.id;
    summary.push('texto na aba Texto corrido');
  } else {
    const p = detectStructure(blocks);
    s.title = guessTitle(p.cover, fallback);
    const coverLines = p.cover.filter((b) => b.type !== 'table' && (b.plain || '').trim() && !/^roteiro$/i.test(b.plain.trim()) && b.plain.trim() !== s.title);
    const ficha = tab('pagina', 'Ficha');
    if (ficha && (p.ficha || coverLines.length)) {
      ficha.content = [coverLines.map((b) => b.md.trim()).join('\n'), p.ficha].filter(Boolean).join('\n\n');
      summary.push('ficha');
    }
    const rot = tab('roteiro');
    if (rot && p.roteiro?.length) {
      rot.sections = p.roteiro;
      summary.push(`roteiro (${p.roteiro.length} seç${p.roteiro.length === 1 ? 'ão' : 'ões'}, ${p.roteiro.reduce((n, x) => n + x.scenes.length, 0)} cenas)`);
    }
    const prod = tab('pagina', 'Produção');
    if (prod && (p.producao || p.historico)) {
      prod.content = [p.producao, p.historico ? '### Histórico de versões\n\n' + tableToMd(p.historico) : ''].filter(Boolean).join('\n\n');
      summary.push('notas de produção');
    }
    const texto = tab('texto');
    if (texto && p.texto) { texto.content = p.texto; summary.push('texto corrido'); }
    p.extras.forEach((x, i) => s.tabs.splice(1 + i, 0, { id: uid(), type: 'pagina', name: x.name, content: x.content }));
    if (p.extras.length) summary.push(`${p.extras.length} página${p.extras.length > 1 ? 's' : ''} extra${p.extras.length > 1 ? 's' : ''}`);
    s.activeTab = (p.roteiro?.length ? rot : p.texto && !p.ficha ? texto : s.tabs[0]).id;
  }
  s.updatedAt = Date.now();
  return { script: s, summary: summary.join(', ') || 'estrutura do modelo, sem conteúdo reconhecido' };
}
