// Editor de páginas em blocos, na linha do Notion e do Obsidian.
// Cada bloco aparece formatado; ao tocar, mostra o Markdown cru daquele bloco
// (como o "live preview" do Obsidian). O resultado é sempre Markdown puro.

import { h, fill, autosize, touch, popMenu, keepFocus, ask, toast, uid, pickFiles, state, app, live, move } from './core.js';
import { parseBlocks, blocksToMd, inline, LIST_TYPES } from './markdown.js';
import { img, saveImage } from './files.js';

const TEXT_TYPES = new Set(['p', 'h1', 'h2', 'h3', 'ul', 'ol', 'todo', 'quote', 'callout', 'code']);

export const BLOCK_OPTIONS = [
  { type: 'p', label: 'Texto', hint: '' },
  { type: 'h1', label: 'Título 1', hint: '#' },
  { type: 'h2', label: 'Título 2', hint: '##' },
  { type: 'h3', label: 'Título 3', hint: '###' },
  { type: 'ul', label: 'Lista', hint: '-' },
  { type: 'ol', label: 'Lista numerada', hint: '1.' },
  { type: 'todo', label: 'Tarefa', hint: '[]' },
  { type: 'quote', label: 'Citação', hint: '>' },
  { type: 'callout', label: 'Destaque', hint: '!' },
  { type: 'hr', label: 'Divisória', hint: '---' },
  { type: 'image', label: 'Imagem', hint: '' },
  { type: 'table', label: 'Tabela', hint: '' },
  { type: 'code', label: 'Código', hint: '```' },
];

const CALLOUTS = [
  ['note', 'Nota'], ['tip', 'Dica'], ['info', 'Info'], ['warning', 'Atenção'], ['question', 'Pergunta'], ['quote', 'Citação'],
];
const calloutLabel = (k) => (CALLOUTS.find((c) => c[0] === k) || [k, k])[1];

const AUTOFORMAT = [
  [/^###\s/, 'h3'], [/^##\s/, 'h2'], [/^#\s/, 'h1'],
  [/^(?:[-*]\s)?\[[ xX]?\]\s/, 'todo'], [/^[-*]\s/, 'ul'], [/^1[.)]\s/, 'ol'],
  [/^>\s/, 'quote'], [/^!\s/, 'callout'],
];

const norm = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

export function pageEditor(s, tab, { placeholder = 'Escreva, ou digite / para escolher um bloco…', typewriter = false } = {}) {
  let blocks = parseBlocks(tab.content);
  if (!blocks.length) blocks.push(nb('p'));
  let active = null;
  let slash = null;
  const els = new Map();

  const root = h('div', { class: 'page' + (typewriter ? ' page-typewriter' : '') });
  const body = h('div', { class: 'blocks' });
  const tail = h('div', {
    class: 'page-tail',
    onClick: () => {
      const last = blocks.at(-1);
      if (last && last.type === 'p' && !last.text) edit(last);
      else insertAfter(last, nb('p'), true);
    },
  });

  function nb(type, extra = {}) {
    const b = { id: uid(), type, text: '', ...extra };
    if (type === 'todo') b.checked ||= false;
    if (type === 'callout') b.kind ||= 'note';
    if (type === 'table') b.rows ||= [['Coluna 1', 'Coluna 2', 'Coluna 3'], ['', '', ''], ['', '', '']];
    return b;
  }

  function commit() {
    tab.content = blocksToMd(blocks);
    touch(s);
  }

  const idx = (b) => blocks.indexOf(b);

  function insertAfter(b, newB, focus) {
    const i = b ? idx(b) : blocks.length - 1;
    blocks.splice(i + 1, 0, newB);
    rerenderAll();
    commit();
    if (focus && TEXT_TYPES.has(newB.type)) edit(newB, 0);
    return newB;
  }

  function remove(b) {
    const i = idx(b);
    if (i < 0) return;
    blocks.splice(i, 1);
    if (!blocks.length) blocks.push(nb('p'));
    rerenderAll();
    commit();
  }

  // ---------- desenho ----------

  function rerenderAll() {
    els.clear();
    fill(body, blocks.map(renderBlock));
  }

  function rerender(b) {
    const old = els.get(b.id);
    const el = renderBlock(b);
    if (old?.isConnected) old.replaceWith(el);
    return el;
  }

  function olNumber(b) {
    let n = 1;
    for (let i = idx(b) - 1; i >= 0; i--) {
      const p = blocks[i];
      if (!LIST_TYPES.has(p.type)) break;
      if ((p.indent || 0) < (b.indent || 0)) break;
      if (p.type === 'ol' && (p.indent || 0) === (b.indent || 0)) n++;
    }
    return n;
  }

  function renderBlock(b) {
    const editing = active === b.id && TEXT_TYPES.has(b.type);
    const content = editing ? editor(b) : view(b);
    const handle = h('button', {
      type: 'button', class: 'b-handle', title: 'Opções do bloco', 'aria-label': 'Opções do bloco',
      onMousedown: (e) => e.preventDefault(),
      onClick: (e) => blockMenu(b, e.currentTarget),
    }, '⋮⋮');
    const el = h('div', {
      class: `block b-${b.type}` + (editing ? ' editing' : ''),
      'data-id': b.id,
      style: b.indent ? { paddingLeft: b.indent * 1.6 + 'em' } : null,
    }, handle, content);
    els.set(b.id, el);
    return el;
  }

  function view(b) {
    const html = (t) => {
      const d = h('div', { class: 'b-text' });
      d.innerHTML = inline(t);
      if (!t) d.dataset.placeholder = blocks.length === 1 ? placeholder : '';
      return d;
    };
    const clickToEdit = (el) => {
      el.addEventListener('click', (e) => {
        const a = e.target.closest('a');
        if (a?.dataset.wiki) { e.preventDefault(); openWiki(a.dataset.wiki); return; }
        if (a) return;
        edit(b);
      });
      return el;
    };
    switch (b.type) {
      case 'h1': case 'h2': case 'h3': {
        const el = h(b.type, { class: 'b-text' });
        el.innerHTML = inline(b.text) || '&nbsp;';
        return clickToEdit(el);
      }
      case 'ul':
        return clickToEdit(h('div', { class: 'b-li' }, h('span', { class: 'b-bullet' }, ['–', '◦', '·', '·'][b.indent || 0]), html(b.text)));
      case 'ol':
        return clickToEdit(h('div', { class: 'b-li' }, h('span', { class: 'b-bullet' }, olNumber(b) + '.'), html(b.text)));
      case 'todo': {
        const box = h('input', {
          type: 'checkbox', class: 'b-check', checked: b.checked, 'aria-label': 'Concluída',
          onClick: (e) => { e.stopPropagation(); b.checked = box.checked; commit(); rerender(b); },
        });
        return clickToEdit(h('div', { class: 'b-li' + (b.checked ? ' done' : '') }, box, html(b.text)));
      }
      case 'quote':
        return clickToEdit(h('blockquote', null, html(b.text)));
      case 'callout': {
        const stamp = h('button', {
          type: 'button', class: 'callout-kind', title: 'Trocar o tipo',
          onClick: (e) => {
            e.stopPropagation();
            popMenu(e.currentTarget, CALLOUTS.map(([k, label]) => ({ label, active: k === b.kind, onClick: () => { b.kind = k; commit(); rerender(b); } })));
          },
        }, calloutLabel(b.kind));
        return clickToEdit(h('div', { class: 'callout', 'data-kind': b.kind }, stamp, b.title ? h('b', null, b.title, ' ') : null, html(b.text)));
      }
      case 'code':
        return clickToEdit(h('pre', { class: 'b-code' }, h('code', null, b.text || ' ')));
      case 'hr':
        return h('hr', { onClick: () => insertAfter(b, nb('p'), true) });
      case 'image':
        return imageBlock(b);
      case 'table':
        return tableBlock(b);
      default:
        return clickToEdit(html(b.text));
    }
  }

  function imageBlock(b) {
    const cap = h('input', { class: 'b-caption', placeholder: 'Legenda', value: b.alt || '' });
    cap.addEventListener('input', () => { b.alt = cap.value; commit(); });
    return h('figure', { class: 'b-figure' + (b.wide ? ' wide' : '') },
      img(b.src, { alt: b.alt || '' }),
      h('figcaption', null, cap),
      h('div', { class: 'b-figure-tools' },
        h('button', { type: 'button', class: 'btn btn-ghost btn-mini', onClick: async () => {
          const [f] = await pickFiles({ multiple: false });
          if (!f) return;
          b.src = await saveImage(f); commit(); rerender(b);
        } }, 'Trocar'),
        h('button', { type: 'button', class: 'btn btn-ghost btn-mini', onClick: () => remove(b) }, 'Remover')));
  }

  function tableBlock(b) {
    const width = Math.max(...b.rows.map((r) => r.length));
    b.rows.forEach((r) => { while (r.length < width) r.push(''); });
    const cell = (r, c) => {
      const ta = h('textarea', { rows: 1, class: 'cell', 'aria-label': `Linha ${r + 1}, coluna ${c + 1}` });
      ta.value = b.rows[r][c] || '';
      ta.addEventListener('input', () => { b.rows[r][c] = ta.value; autosize(ta); commit(); });
      ta.addEventListener('focus', () => (state.lastField = ta));
      requestAnimationFrame(() => autosize(ta));
      return ta;
    };
    const table = h('table', { class: 'b-grid' },
      b.rows.map((row, r) => h('tr', null,
        row.map((_, c) => h(r === 0 ? 'th' : 'td', null, cell(r, c),
          r === 0 && width > 1 ? h('button', {
            type: 'button', class: 'grid-x', title: 'Remover coluna',
            onClick: () => { b.rows.forEach((x) => x.splice(c, 1)); commit(); rerender(b); },
          }, '×') : null)),
        r > 0 ? h('td', { class: 'grid-tools' }, h('button', {
          type: 'button', class: 'grid-x', title: 'Remover linha',
          onClick: () => { b.rows.splice(r, 1); commit(); rerender(b); },
        }, '×')) : h('td', { class: 'grid-tools' }))));
    return h('div', { class: 'b-table' },
      h('div', { class: 'b-table-scroll' }, table),
      h('div', { class: 'b-table-actions' },
        h('button', { type: 'button', class: 'btn btn-ghost btn-mini', onClick: () => { b.rows.push(Array(width).fill('')); commit(); rerender(b); } }, '+ linha'),
        h('button', { type: 'button', class: 'btn btn-ghost btn-mini', onClick: () => { b.rows.forEach((x, i) => x.push(i === 0 ? `Coluna ${width + 1}` : '')); commit(); rerender(b); } }, '+ coluna')));
  }

  // ---------- edição ----------

  function editor(b) {
    const ta = h('textarea', { class: 'b-input', rows: 1, spellcheck: 'true', 'aria-label': 'Texto do bloco' });
    ta.value = b.text || '';
    ta.placeholder = b.type === 'p' ? 'Digite / para blocos, ou só escreva' : '';
    ta.addEventListener('input', () => onInput(b, ta));
    ta.addEventListener('keydown', (e) => onKey(e, b, ta));
    ta.addEventListener('focus', () => { state.lastField = ta; ta.dataset.block = b.id; });
    ta.addEventListener('blur', () => setTimeout(() => {
      // Um campo já substituído (ex.: o bloco virou título) não mexe mais no bloco.
      if (!ta.isConnected || active !== b.id || slash || document.activeElement === ta) return;
      active = null;
      rerender(b);
    }, 120));
    ta.addEventListener('paste', (e) => onPaste(e, b));
    requestAnimationFrame(() => autosize(ta));
    if (b.type === 'callout') {
      return h('div', { class: 'callout editing', 'data-kind': b.kind }, h('span', { class: 'callout-kind' }, calloutLabel(b.kind)), ta);
    }
    return ta;
  }

  function edit(b, pos) {
    if (!TEXT_TYPES.has(b.type)) return;
    const prev = active && blocks.find((x) => x.id === active);
    active = b.id;
    if (prev && prev !== b) rerender(prev);
    const el = rerender(b);
    const ta = el.querySelector('.b-input');
    if (!ta) return;
    ta.focus();
    const p = pos == null ? ta.value.length : Math.min(pos, ta.value.length);
    ta.setSelectionRange(p, p);
  }

  function setType(b, type) {
    if (type === 'image') {
      pickFiles({ multiple: true }).then(async (files) => {
        if (!files.length) return;
        let anchor = b;
        const paths = [];
        for (const f of files) paths.push(await saveImage(f));
        paths.forEach((src, i) => {
          if (i === 0 && b.type === 'p' && !b.text) { Object.assign(b, { type: 'image', src, alt: '' }); return; }
          const nbk = nb('image', { src, alt: '' });
          blocks.splice(idx(anchor) + 1, 0, nbk);
          anchor = nbk;
        });
        active = null;
        rerenderAll();
        commit();
      });
      return;
    }
    if (type === 'hr' || type === 'table') {
      const nbk = nb(type);
      if (b.type === 'p' && !b.text) blocks.splice(idx(b), 1, nbk);
      else blocks.splice(idx(b) + 1, 0, nbk);
      const after = nb('p');
      blocks.splice(idx(nbk) + 1, 0, after);
      active = null;
      rerenderAll();
      commit();
      if (type === 'hr') edit(after);
      return;
    }
    b.type = type;
    if (!LIST_TYPES.has(type)) b.indent = 0;
    if (type === 'todo') b.checked ||= false;
    if (type === 'callout') b.kind ||= 'note';
    commit();
    edit(b);
  }

  function onInput(b, ta) {
    b.text = ta.value;
    autosize(ta);
    if (b.type === 'p') {
      if (/^```$/.test(ta.value)) { b.text = ''; setType(b, 'code'); return; }
      if (/^---$/.test(ta.value)) { b.text = ''; setType(b, 'hr'); return; }
      for (const [rx, type] of AUTOFORMAT) {
        if (rx.test(ta.value)) {
          b.text = ta.value.replace(rx, '');
          if (type === 'todo') b.checked = /\[[xX]\]/.test(ta.value);
          setType(b, type);
          const t = els.get(b.id)?.querySelector('.b-input');
          t?.setSelectionRange(0, 0);
          return;
        }
      }
      updateSlash(b, ta);
    }
    commit();
    if (typewriter) app.typewriterScroll?.(ta);
  }

  function onKey(e, b, ta) {
    if (slash && slashKey(e)) return;
    const mod = e.ctrlKey || e.metaKey;
    if (mod && !e.altKey) {
      const k = e.key.toLowerCase();
      if (k === 'b') { e.preventDefault(); wrap(ta, '**', '**'); return; }
      if (k === 'i') { e.preventDefault(); wrap(ta, '*', '*'); return; }
      if (k === 'k') { e.preventDefault(); insertLink(ta); return; }
      if (k === 'e') { e.preventDefault(); wrap(ta, '`', '`'); return; }
      if (e.shiftKey && k === 'x') { e.preventDefault(); wrap(ta, '~~', '~~'); return; }
      if (e.shiftKey && k === 'h') { e.preventDefault(); wrap(ta, '==', '=='); return; }
    }
    const atStart = ta.selectionStart === 0 && ta.selectionEnd === 0;
    const atEnd = ta.selectionStart === ta.value.length;

    if (e.key === 'Tab' && LIST_TYPES.has(b.type)) {
      e.preventDefault();
      b.indent = Math.max(0, Math.min(3, (b.indent || 0) + (e.shiftKey ? -1 : 1)));
      commit();
      edit(b, ta.selectionStart);
      return;
    }
    if (e.key === 'Enter' && !e.shiftKey && b.type !== 'code' && !e.isComposing) {
      e.preventDefault();
      if (LIST_TYPES.has(b.type) && !ta.value.trim()) {
        if (b.indent) b.indent--; else b.type = 'p';
        commit();
        edit(b, 0);
        return;
      }
      const before = ta.value.slice(0, ta.selectionStart);
      const after = ta.value.slice(ta.selectionEnd);
      b.text = before;
      const next = nb(LIST_TYPES.has(b.type) ? b.type : 'p', { text: after, indent: b.indent || 0 });
      active = null;
      blocks.splice(idx(b) + 1, 0, next);
      rerenderAll();
      commit();
      edit(next, 0);
      return;
    }
    if (e.key === 'Backspace' && atStart) {
      if (b.type !== 'p') {
        e.preventDefault();
        if (LIST_TYPES.has(b.type) && b.indent) b.indent--;
        else { b.type = 'p'; b.indent = 0; }
        commit();
        edit(b, 0);
        return;
      }
      const prev = blocks[idx(b) - 1];
      if (prev && TEXT_TYPES.has(prev.type) && prev.type !== 'code') {
        e.preventDefault();
        const at = prev.text.length;
        prev.text += (prev.text && b.text ? '' : '') + b.text;
        active = null;
        blocks.splice(idx(b), 1);
        rerenderAll();
        commit();
        edit(prev, at);
      } else if (prev && !b.text) {
        e.preventDefault();
        remove(prev);
        edit(b, 0);
      }
      return;
    }
    if (e.key === 'ArrowUp' && atStart) {
      const prev = [...blocks.slice(0, idx(b))].reverse().find((x) => TEXT_TYPES.has(x.type));
      if (prev) { e.preventDefault(); edit(prev); }
    }
    if (e.key === 'ArrowDown' && atEnd) {
      const next = blocks.slice(idx(b) + 1).find((x) => TEXT_TYPES.has(x.type));
      if (next) { e.preventDefault(); edit(next, 0); }
    }
    if (e.key === 'Escape') ta.blur();
  }

  async function onPaste(e, b) {
    const files = [...(e.clipboardData?.files || [])].filter((f) => f.type.startsWith('image/'));
    if (!files.length) return;
    e.preventDefault();
    let anchor = b;
    for (const f of files) {
      const src = await saveImage(f);
      const nbk = nb('image', { src, alt: '' });
      blocks.splice(idx(anchor) + 1, 0, nbk);
      anchor = nbk;
    }
    active = null;
    rerenderAll();
    commit();
  }

  // ---------- menu "/" ----------

  function updateSlash(b, ta) {
    const m = ta.value.match(/^\/([^\s/]{0,20})$/);
    if (!m) return closeSlash();
    const q = norm(m[1]);
    const items = BLOCK_OPTIONS.filter((o) => !q || norm(o.label).includes(q) || o.type.startsWith(q));
    if (!items.length) return closeSlash();
    if (!slash) {
      slash = { el: h('div', { class: 'popmenu slash', role: 'listbox' }), index: 0, b, ta };
      document.body.append(slash.el);
    }
    slash.items = items;
    slash.index = Math.min(slash.index, items.length - 1);
    drawSlash();
  }

  function drawSlash() {
    const { el, items, index, ta } = slash;
    fill(el, h('div', { class: 'popmenu-head' }, 'Blocos'), items.map((o, i) => h('button', {
      type: 'button', class: 'popmenu-item' + (i === index ? ' active' : ''),
      onMousedown: (e) => e.preventDefault(),
      onClick: () => pickSlash(o),
    }, o.label, o.hint ? h('span', { class: 'popmenu-hint' }, o.hint) : null)));
    const r = ta.getBoundingClientRect();
    el.style.left = Math.max(8, Math.min(r.left, window.innerWidth - el.offsetWidth - 8)) + 'px';
    const top = r.bottom + 4;
    el.style.top = (top + el.offsetHeight > window.innerHeight ? Math.max(8, r.top - el.offsetHeight - 4) : top) + 'px';
  }

  function slashKey(e) {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      slash.index = (slash.index + (e.key === 'ArrowDown' ? 1 : -1) + slash.items.length) % slash.items.length;
      drawSlash();
      return true;
    }
    if (e.key === 'Enter' || e.key === 'Tab') {
      e.preventDefault();
      pickSlash(slash.items[slash.index]);
      return true;
    }
    if (e.key === 'Escape') { e.preventDefault(); closeSlash(); return true; }
    return false;
  }

  function pickSlash(o) {
    const b = slash.b;
    closeSlash();
    b.text = '';
    setType(b, o.type);
  }

  function closeSlash() {
    slash?.el.remove();
    slash = null;
  }

  // ---------- formatação ----------

  function activeInput() {
    const el = active && els.get(active)?.querySelector('.b-input');
    if (el) return el;
    const lf = state.lastField;
    return lf?.isConnected && root.contains(lf) ? lf : null;
  }

  function wrap(ta, pre, post) {
    const { selectionStart: a, selectionEnd: z, value } = ta;
    const sel = value.slice(a, z);
    const already = value.slice(a - pre.length, a) === pre && value.slice(z, z + post.length) === post;
    if (already) {
      ta.value = value.slice(0, a - pre.length) + sel + value.slice(z + post.length);
      ta.setSelectionRange(a - pre.length, z - pre.length);
    } else {
      ta.value = value.slice(0, a) + pre + sel + post + value.slice(z);
      ta.setSelectionRange(a + pre.length, z + pre.length);
    }
    ta.dispatchEvent(new Event('input'));
  }

  function insertText(ta, text) {
    const { selectionStart: a, selectionEnd: z, value } = ta;
    ta.value = value.slice(0, a) + text + value.slice(z);
    ta.setSelectionRange(a + text.length, a + text.length);
    ta.focus();
    ta.dispatchEvent(new Event('input'));
  }

  async function insertLink(ta) {
    const sel = ta ? ta.value.slice(ta.selectionStart, ta.selectionEnd) : '';
    const range = ta ? [ta.selectionStart, ta.selectionEnd] : null;
    const res = await ask('Inserir link', [
      { name: 'text', label: 'Texto que aparece', value: sel, placeholder: 'ex.: trilha da abertura' },
      { name: 'url', label: 'Endereço (URL)', type: 'url', placeholder: 'https://…' },
    ], { ok: 'Inserir' });
    if (!res?.url) return;
    const url = /^\w+:/.test(res.url) ? res.url : 'https://' + res.url;
    const md = `[${(res.text || url).replace(/[[\]]/g, '')}](${url})`;
    if (ta?.isConnected) {
      ta.focus();
      ta.setSelectionRange(...range);
      insertText(ta, md);
    } else {
      insertAfter(blocks.at(-1), nb('p', { text: md }));
    }
  }

  function insertWiki(anchor) {
    const ta = activeInput();
    const others = live().filter((x) => !x.deleted && x.id !== s.id && x.title);
    if (!others.length) return toast('Ainda não há outros roteiros para ligar.');
    popMenu(anchor, [{ heading: 'Ligar a outro roteiro' }, ...others.slice(0, 30).map((x) => ({
      label: x.title,
      onClick: () => (ta ? insertText(ta, `[[${x.title}]]`) : insertAfter(blocks.at(-1), nb('p', { text: `[[${x.title}]]` }))),
    }))]);
  }

  function openWiki(title) {
    const t = norm(title);
    const target = live().find((x) => !x.deleted && norm(x.title || '') === t);
    if (target) app.openScript(target.id);
    else ask(`Criar o roteiro "${title}"?`, [], { ok: 'Criar' }).then((r) => r && app.createScript('branco', { title }));
  }

  function blockMenu(b, anchor) {
    popMenu(anchor, [
      { heading: 'Transformar em' },
      ...BLOCK_OPTIONS.filter((o) => TEXT_TYPES.has(o.type) || o.type === b.type).filter((o) => TEXT_TYPES.has(b.type) || o.type === b.type)
        .map((o) => ({ label: o.label, active: o.type === b.type, onClick: () => setType(b, o.type) })),
      '-',
      { label: 'Inserir bloco abaixo', onClick: () => insertAfter(b, nb('p'), true) },
      { label: 'Duplicar', onClick: () => insertAfter(b, { ...structuredClone(b), id: uid() }) },
      { label: 'Mover para cima', onClick: () => { if (move(blocks, idx(b), -1)) { rerenderAll(); commit(); } } },
      { label: 'Mover para baixo', onClick: () => { if (move(blocks, idx(b), 1)) { rerenderAll(); commit(); } } },
      { label: 'Apagar', danger: true, onClick: () => remove(b) },
    ]);
  }

  // ---------- barra de ferramentas ----------

  const tb = (label, title, fn, cls = '') => keepFocus(h('button', { type: 'button', class: 'tb ' + cls, title, 'aria-label': title, onClick: fn }, label));
  const withInput = (fn) => () => { const ta = activeInput(); if (ta) fn(ta); else toast('Toque antes no texto que quer formatar.'); };
  const blockType = (type) => () => {
    const b = blocks.find((x) => x.id === active);
    if (b) setType(b, type);
    else {
      const last = blocks.at(-1);
      if (last?.type === 'p' && !last.text) setType(last, type);
      else { const n = insertAfter(last, nb('p')); setType(n, type); }
    }
  };

  const toolbar = h('div', { class: 'toolbar', role: 'toolbar', 'aria-label': 'Formatação' },
    tb('B', 'Negrito (Ctrl+B)', withInput((ta) => wrap(ta, '**', '**')), 'tb-b'),
    tb('I', 'Itálico (Ctrl+I)', withInput((ta) => wrap(ta, '*', '*')), 'tb-i'),
    tb('S', 'Riscado (Ctrl+Shift+X)', withInput((ta) => wrap(ta, '~~', '~~')), 'tb-s'),
    tb('▮', 'Marca-texto (Ctrl+Shift+H)', withInput((ta) => wrap(ta, '==', '==')), 'tb-mark'),
    tb('‹›', 'Código (Ctrl+E)', withInput((ta) => wrap(ta, '`', '`'))),
    tb('Link', 'Link com texto (Ctrl+K)', () => insertLink(activeInput())),
    tb('[[ ]]', 'Ligar a outro roteiro', (e) => insertWiki(e.currentTarget)),
    h('span', { class: 'tb-sep' }),
    tb('T1', 'Título 1', blockType('h1')),
    tb('T2', 'Título 2', blockType('h2')),
    tb('T3', 'Título 3', blockType('h3')),
    tb('–', 'Lista', blockType('ul')),
    tb('1.', 'Lista numerada', blockType('ol')),
    tb('☐', 'Tarefa', blockType('todo')),
    tb('❝', 'Citação', blockType('quote')),
    tb('!', 'Destaque', blockType('callout')),
    h('span', { class: 'tb-sep' }),
    tb('Imagem', 'Inserir imagem', blockType('image')),
    tb('Tabela', 'Inserir tabela', blockType('table')),
    tb('—', 'Divisória', blockType('hr')),
  );

  // Soltar imagens em qualquer lugar da página.
  root.addEventListener('dragover', (e) => { if ([...e.dataTransfer.items].some((i) => i.kind === 'file')) { e.preventDefault(); root.classList.add('drop'); } });
  root.addEventListener('dragleave', () => root.classList.remove('drop'));
  root.addEventListener('drop', async (e) => {
    const files = [...e.dataTransfer.files].filter((f) => f.type.startsWith('image/'));
    root.classList.remove('drop');
    if (!files.length) return;
    e.preventDefault();
    let anchor = blocks.find((x) => x.id === active) || blocks.at(-1);
    for (const f of files) {
      const nbk = nb('image', { src: await saveImage(f), alt: '' });
      blocks.splice(idx(anchor) + 1, 0, nbk);
      anchor = nbk;
    }
    active = null;
    rerenderAll();
    commit();
  });

  rerenderAll();
  root.append(toolbar, body, tail);
  root._destroy = closeSlash;
  return root;
}
