// Exportar e importar: .md (formato oficial), pacote .zip para o Obsidian
// (.md + anexos), .txt, PDF pela impressão e importação de .md / .zip / .json.

import { h, fill, $, safeName, download } from './core.js';
import { scriptToMd, mdToScript, parseBlocks, inline, plain, attachmentsIn } from './markdown.js';
import { migrate } from './model.js';
import { img, getBlob, putDownloaded } from './files.js';
import { makeZip, readZip } from './zip.js';

export const fileName = (s) => safeName(s.title) + '.md';

export function exportMd(s) {
  download(fileName(s), scriptToMd(s), 'text/markdown');
}

export function exportTxt(s) {
  download(safeName(s.title) + '.txt', plain(scriptToMd(s)), 'text/plain');
}

async function zipEntries(scripts) {
  const entries = [];
  const names = new Set();
  const paths = new Set();
  for (const s of scripts) {
    let name = fileName(s);
    for (let i = 2; names.has(name); i++) name = `${safeName(s.title)} (${i}).md`;
    names.add(name);
    entries.push({ name, data: scriptToMd(s) });
    attachmentsIn(s).forEach((p) => paths.add(p));
  }
  for (const p of paths) {
    const blob = await getBlob(p);
    if (blob) entries.push({ name: p, data: blob });
  }
  return entries;
}

export async function exportZip(scripts, name) {
  download(name, await makeZip(await zipEntries(scripts)), 'application/zip');
}

// ---------- importar ----------

const isScriptJson = (x) => x && typeof x.id === 'string' && (Array.isArray(x.tabs) || Array.isArray(x.sections));

// Devolve os roteiros lidos (ainda não gravados) e grava as imagens que vierem junto.
export async function importFiles(files) {
  const scripts = [];
  const dec = new TextDecoder();
  const readMd = (text, name) => mdToScript(text, { fallbackTitle: name.replace(/^.*\//, '').replace(/\.(md|markdown|txt)$/i, '') });
  for (const f of files) {
    const name = f.name || '';
    if (/\.zip$/i.test(name)) {
      for (const e of await readZip(f)) {
        if (/\.(md|markdown)$/i.test(e.name) && !e.name.startsWith('__MACOSX')) scripts.push(readMd(dec.decode(e.data), e.name));
        else if (/\.(jpe?g|png|gif|webp|svg)$/i.test(e.name)) {
          const base = e.name.replace(/^.*\//, '');
          const type = 'image/' + base.split('.').pop().toLowerCase().replace('jpg', 'jpeg').replace('svg', 'svg+xml');
          await putDownloaded('anexos/' + base, new Blob([e.data], { type }));
        }
      }
    } else if (/\.json$/i.test(name)) {
      const data = JSON.parse(await f.text());
      const items = Array.isArray(data) ? data : data.scripts || [data];
      scripts.push(...items.filter(isScriptJson).map(migrate));
    } else {
      scripts.push(readMd(await f.text(), name));
    }
  }
  return scripts;
}

// ---------- PDF (impressão) ----------

function staticBlocks(md) {
  return parseBlocks(md).map((b) => {
    const html = (tag, text, attrs) => { const el = h(tag, attrs); el.innerHTML = inline(text); return el; };
    switch (b.type) {
      case 'h1': case 'h2': case 'h3': return html('h' + (Number(b.type[1]) + 2), b.text);
      case 'ul': return html('div', '– ' + b.text, { class: 'p-li', style: { marginLeft: (b.indent || 0) * 1.4 + 'em' } });
      case 'ol': return html('div', '• ' + b.text, { class: 'p-li', style: { marginLeft: (b.indent || 0) * 1.4 + 'em' } });
      case 'todo': return html('div', (b.checked ? '☑ ' : '☐ ') + b.text, { class: 'p-li', style: { marginLeft: (b.indent || 0) * 1.4 + 'em' } });
      case 'quote': return html('blockquote', b.text);
      case 'callout': return html('div', b.text, { class: 'p-callout' });
      case 'hr': return h('hr');
      case 'image': return h('figure', { class: 'p-fig' }, img(b.src, { loading: 'eager' }), b.alt ? h('figcaption', null, b.alt) : null);
      case 'code': return h('pre', null, b.text);
      case 'table': return h('table', { class: 'p-kv' }, b.rows.map((r, i) => h('tr', null, r.map((c) => h(i ? 'td' : 'th', null, c)))));
      default: return html('p', b.text);
    }
  });
}

function printTab(t) {
  const title = h('h2', null, t.name);
  if (t.type === 'pagina') return t.content?.trim() ? [title, staticBlocks(t.content)] : null;
  if (t.type === 'texto') return t.content?.trim() ? [title, h('div', { class: 'p-full' }, t.content)] : null;
  if (t.type === 'roteiro') {
    let n = 0;
    const hasFrames = t.sections.some((sec) => sec.scenes.some((c) => c.image));
    return [title, h('table', { class: 'p-script' },
      h('thead', null, h('tr', null, h('th', null, 'Cena'), h('th', null, 'Narração'), h('th', null, 'Visual'), hasFrames ? h('th', null, 'Frame') : null)),
      h('tbody', null, t.sections.map((sec) => [
        h('tr', { class: 'p-sec' }, h('td', { colspan: hasFrames ? 4 : 3 }, sec.name.toUpperCase())),
        sec.scenes.map((c) => h('tr', null,
          h('td', null, String(++n).padStart(2, '0')),
          h('td', null, c.narration),
          h('td', null, c.plano ? h('b', null, c.plano + '. ') : null, c.visual),
          hasFrames ? h('td', { class: 'p-frame' }, c.image ? img(c.image, { loading: 'eager' }) : null) : null)),
      ])))];
  }
  if (t.type === 'moodboard') {
    if (!t.items.length) return null;
    return [title, h('div', { class: 'p-mood' }, t.items.map((it) => {
      if (it.kind === 'image') return h('figure', null, img(it.src, { loading: 'eager' }), it.caption ? h('figcaption', null, it.caption) : null);
      if (it.kind === 'color') return h('figure', null, h('div', { class: 'p-swatch', style: { background: it.color } }), h('figcaption', null, it.color.toUpperCase() + (it.caption ? ' · ' + it.caption : '')));
      if (it.kind === 'link') return h('figure', null, h('figcaption', null, (it.title || it.url) + ' — ' + it.url));
      return h('figure', { class: 'p-note' }, it.text);
    }))];
  }
  if (t.type === 'referencias') {
    if (!t.items.length) return null;
    return [title, h('table', { class: 'p-kv' },
      h('tr', null, ['Tipo', 'Referência', 'Autor', 'Cena', 'Nota'].map((x) => h('th', null, x))),
      t.items.map((r) => h('tr', null, h('td', null, r.tipo), h('td', null, r.titulo || r.url, r.url && r.titulo ? h('div', { class: 'p-url' }, r.url) : null), h('td', null, r.autor), h('td', null, r.cena), h('td', null, r.nota))))];
  }
  if (t.type === 'tabela') {
    if (!t.columns.length || !t.rows.length) return null;
    return [title, h('table', { class: 'p-kv' },
      h('tr', null, t.columns.map((c) => h('th', null, c.name))),
      t.rows.map((r) => h('tr', null, t.columns.map((c) => h('td', null, c.type === 'check' ? (r.cells[c.id] ? '☑' : '☐') : r.cells[c.id] || '')))))];
  }
  return null;
}

export async function printScript(s, tabIds) {
  const tabs = s.tabs.filter((t) => !tabIds || tabIds.includes(t.id));
  const area = $('#print-area');
  fill(area,
    h('div', { class: 'p-cover' },
      s.cover ? img(s.cover, { class: 'p-cover-img', loading: 'eager' }) : null,
      h('div', { class: 'p-kicker' }, 'ROTEIRO'),
      h('h1', null, s.title || 'Sem título'),
      h('p', { class: 'p-small' }, [s.status, s.folder, s.tags.map((t) => '#' + t).join(' ')].filter(Boolean).join(' · ')),
      h('p', { class: 'p-small' }, new Date(s.updatedAt).toLocaleDateString('pt-BR'))),
    tabs.map(printTab));
  const imgs = [...area.querySelectorAll('img')];
  await Promise.race([
    Promise.all(imgs.map((im) => (im.complete && im.src ? 0 : new Promise((r) => { im.onload = im.onerror = r; })))),
    new Promise((r) => setTimeout(r, 4000)),
  ]);
  window.print();
}
