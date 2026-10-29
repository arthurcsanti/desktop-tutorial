// Aba "Referências": músicas, vídeos, filmes, artigos e imagens.
// Cada referência tem um texto que aparece no lugar do link, tipo, autor,
// nota e a cena onde será usada. Visualização em cartões ou tabela.

import { h, field, touch, app, uid, ask, isUrl, toast } from '../core.js';
import { REF_TYPES } from '../model.js';
import { img, thumbFor, guessRefType, linkInfo } from '../files.js';

const mini = (label, title, onClick) =>
  h('button', { type: 'button', class: 'btn btn-ghost btn-mini', title, 'aria-label': title, onClick }, label);

async function addReference(s, tab) {
  const r = await ask('Nova referência', [
    { name: 'url', label: 'Link (YouTube, Spotify, site, imagem…)', placeholder: 'https://… (opcional)' },
    { name: 'titulo', label: 'Texto que aparece no lugar do link', placeholder: 'em branco = busca o título sozinho' },
    { name: 'nota', label: 'Nota', placeholder: 'ex.: usar o refrão na virada do 2º ato', type: 'textarea' },
  ], { ok: 'Adicionar' });
  if (!r || (!r.url && !r.titulo)) return;
  const url = r.url && !/^\w+:/.test(r.url) ? 'https://' + r.url : r.url;
  const ref = { id: uid(), tipo: guessRefType(url), titulo: r.titulo, url, autor: '', nota: r.nota, cena: '' };
  tab.items.push(ref);
  touch(s);
  app.renderEditor();
  if (url && isUrl(url) && !r.titulo) {
    const info = await linkInfo(url);
    if (info) {
      ref.titulo ||= info.title;
      ref.autor ||= info.author;
      touch(s);
      app.renderEditor();
    }
  }
}

function typeSelect(s, r) {
  const sel = h('select', { class: 'ref-type', 'aria-label': 'Tipo', onChange: () => { r.tipo = sel.value; touch(s); app.renderEditor(); } },
    [...new Set([...REF_TYPES, r.tipo])].map((t) => h('option', { value: t }, t)));
  sel.value = r.tipo;
  return sel;
}

function card(s, tab, r) {
  const th = thumbFor(r.url);
  const i = tab.items.indexOf(r);
  return h('article', { class: 'ref-card' },
    th ? h('a', { href: r.url, target: '_blank', rel: 'noopener', class: 'ref-thumb' }, img(th)) : null,
    h('div', { class: 'ref-body' },
      h('div', { class: 'ref-top' },
        typeSelect(s, r),
        r.url ? h('a', { class: 'ref-open', href: r.url, target: '_blank', rel: 'noopener', title: r.url }, 'abrir ↗') : null,
        mini('✕', 'Remover referência', () => { tab.items.splice(i, 1); touch(s); app.renderEditor(); })),
      field('input', r.titulo, (v) => { r.titulo = v; touch(s, { list: false }); }, { class: 'ref-title', placeholder: 'Texto do link' }),
      field('input', r.url, (v) => { r.url = v.trim(); touch(s, { list: false }); }, { class: 'ref-url', placeholder: 'https://…', 'aria-label': 'Endereço' }),
      h('div', { class: 'ref-row' },
        field('input', r.autor, (v) => { r.autor = v; touch(s, { list: false }); }, { placeholder: 'autor / fonte', 'aria-label': 'Autor ou fonte' }),
        field('input', r.cena, (v) => { r.cena = v; touch(s, { list: false }); }, { class: 'ref-scene', placeholder: 'cena', 'aria-label': 'Cena onde entra' })),
      field('textarea', r.nota, (v) => { r.nota = v; touch(s, { list: false }); }, { class: 'ref-note', placeholder: 'nota: como e onde usar' })));
}

function tableView(s, tab, items) {
  return h('div', { class: 'db-scroll' }, h('table', { class: 'db' },
    h('thead', null, h('tr', null, ['Tipo', 'Texto do link', 'Link', 'Autor / fonte', 'Cena', 'Nota', ''].map((x) => h('th', null, x)))),
    h('tbody', null, items.map((r) => h('tr', null,
      h('td', null, typeSelect(s, r)),
      h('td', null, field('textarea', r.titulo, (v) => { r.titulo = v; touch(s, { list: false }); }, { 'aria-label': 'Texto do link' })),
      h('td', { class: 'td-link' }, field('input', r.url, (v) => { r.url = v.trim(); touch(s, { list: false }); }, { 'aria-label': 'Link' }),
        r.url ? h('a', { href: r.url, target: '_blank', rel: 'noopener', class: 'open-link' }, '↗') : null),
      h('td', null, field('textarea', r.autor, (v) => { r.autor = v; touch(s, { list: false }); }, { 'aria-label': 'Autor' })),
      h('td', { class: 'td-narrow' }, field('input', r.cena, (v) => { r.cena = v; touch(s, { list: false }); }, { 'aria-label': 'Cena' })),
      h('td', null, field('textarea', r.nota, (v) => { r.nota = v; touch(s, { list: false }); }, { 'aria-label': 'Nota' })),
      h('td', { class: 'td-narrow' }, mini('✕', 'Remover', () => { tab.items.splice(tab.items.indexOf(r), 1); touch(s); app.renderEditor(); })))))));
}

export function referenciasView(s, tab) {
  const filter = tab._filter || '';
  const items = tab.items.filter((r) => !filter || r.tipo === filter);
  const types = [...new Set(tab.items.map((r) => r.tipo))];
  const view = tab.view || 'cartoes';

  let content;
  if (!tab.items.length) {
    content = h('div', { class: 'empty-note' }, 'Nenhuma referência ainda. Cole o link de uma música, de um vídeo ou de um artigo: o app descobre o tipo e busca o título sozinho.');
  } else if (view === 'tabela') {
    content = tableView(s, tab, items);
  } else {
    const groups = (filter ? [filter] : [...REF_TYPES, ...types.filter((t) => !REF_TYPES.includes(t))]).filter((t) => items.some((r) => r.tipo === t));
    content = groups.map((t) => h('section', { class: 'ref-group' },
      h('h3', { class: 'ref-group-title' }, t, h('span', { class: 'count' }, items.filter((r) => r.tipo === t).length)),
      h('div', { class: 'ref-grid' }, items.filter((r) => r.tipo === t).map((r) => card(s, tab, r)))));
  }

  const wrap = h('div', { class: 'refs' },
    h('div', { class: 'view-bar' },
      h('div', { class: 'seg' },
        [['cartoes', 'Cartões'], ['tabela', 'Tabela']].map(([v, label]) => h('button', {
          type: 'button', class: 'seg-btn' + (view === v ? ' active' : ''),
          onClick: () => { tab.view = v; touch(s, { list: false }); app.renderEditor(); },
        }, label))),
      h('button', { type: 'button', class: 'btn btn-stamp', onClick: () => addReference(s, tab) }, '+ Referência')),
    types.length > 1 ? h('div', { class: 'nav-chips filter-chips' },
      h('button', { type: 'button', class: 'tag' + (!filter ? ' active' : ''), onClick: () => { tab._filter = ''; app.renderEditor(); } }, 'Todas'),
      types.map((t) => h('button', { type: 'button', class: 'tag' + (filter === t ? ' active' : ''), onClick: () => { tab._filter = t; app.renderEditor(); } }, t))) : null,
    content);

  // Colar um link direto na aba cria a referência.
  wrap.addEventListener('paste', (e) => {
    if (e.target.matches('input, textarea')) return;
    const text = e.clipboardData?.getData('text') || '';
    if (!isUrl(text)) return;
    e.preventDefault();
    const ref = { id: uid(), tipo: guessRefType(text), titulo: '', url: text.trim(), autor: '', nota: '', cena: '' };
    tab.items.push(ref);
    touch(s);
    app.renderEditor();
    toast('Referência adicionada.');
    linkInfo(ref.url).then((info) => { if (info) { ref.titulo ||= info.title; ref.autor ||= info.author; touch(s); app.renderEditor(); } });
  });
  return wrap;
}
