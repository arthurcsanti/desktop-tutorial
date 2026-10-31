// O arquivo de roteiros, com as visualizações do Notion: galeria, lista,
// tabela e quadro por status.

import { h, field, touch, app, state, fmtDate } from '../core.js';
import { STATUSES, TEMPLATES, coverOf, withCurrent } from '../model.js';
import { img } from '../files.js';
import { roteiroStats } from './roteiro.js';

const VIEWS = [['galeria', 'Galeria'], ['lista', 'Lista'], ['tabela', 'Tabela'], ['quadro', 'Quadro']];
const SORTS = [['updated', 'Editados por último'], ['created', 'Criados por último'], ['title', 'Título A → Z'], ['status', 'Status']];

function speechTime(s) {
  const secs = s.tabs.filter((t) => t.type === 'roteiro').reduce((a, t) => a + roteiroStats(t).secs, 0);
  return secs ? `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')}` : '—';
}

function sortItems(items) {
  const by = state.library.sort;
  const cmp = {
    updated: (a, b) => b.updatedAt - a.updatedAt,
    created: (a, b) => b.createdAt - a.createdAt,
    title: (a, b) => (a.title || '').localeCompare(b.title || '', 'pt-BR'),
    status: (a, b) => STATUSES.indexOf(a.status) - STATUSES.indexOf(b.status),
  }[by];
  return [...items].sort((a, b) => (b.pinned - a.pinned) || cmp(a, b));
}

function statusSelect(s) {
  const sel = h('select', { class: 'status-select', 'aria-label': 'Status', onClick: (e) => e.stopPropagation(), onChange: () => { s.status = sel.value; touch(s); app.showLibrary(); } },
    withCurrent(STATUSES, s.status).map((st) => h('option', { value: st }, st)));
  sel.value = s.status;
  return sel;
}

function galleryCard(s) {
  const cover = coverOf(s);
  return h('button', { type: 'button', class: 'g-card', onClick: () => app.openScript(s.id) },
    h('div', { class: 'g-cover' + (cover ? '' : ' g-cover-paper') },
      cover ? img(cover) : h('span', { class: 'g-cover-title' }, s.title || 'Sem título'),
      h('span', { class: 'stamp' }, s.status)),
    h('div', { class: 'g-body' },
      h('div', { class: 'g-title' }, s.pinned ? '★ ' : '', s.title || 'Sem título'),
      h('div', { class: 'g-meta' },
        s.folder ? h('span', null, '▸ ' + s.folder) : null,
        h('span', null, fmtDate(s.updatedAt)),
        h('span', null, '≈ ' + speechTime(s))),
      s.tags.length ? h('div', { class: 'g-tags' }, s.tags.map((t) => h('span', { class: 'tag-mini' }, '#' + t))) : null));
}

function listRow(s) {
  return h('button', { type: 'button', class: 'l-row', onClick: () => app.openScript(s.id) },
    h('span', { class: 'l-title' }, s.pinned ? '★ ' : '', s.title || 'Sem título'),
    h('span', { class: 'stamp-mini' }, s.status),
    h('span', { class: 'l-meta' }, s.folder ? '▸ ' + s.folder : ''),
    h('span', { class: 'l-meta' }, s.tags.map((t) => '#' + t).join(' ')),
    h('span', { class: 'l-meta' }, fmtDate(s.updatedAt)));
}

function tableView(items) {
  const tpl = (id) => TEMPLATES.find((t) => t.id === id)?.name || '—';
  return h('div', { class: 'db-scroll' }, h('table', { class: 'db db-library' },
    h('thead', null, h('tr', null, ['Título', 'Status', 'Pasta', 'Tags', 'Estrutura', 'Fala', 'Editado'].map((x) => h('th', null, x)))),
    h('tbody', null, items.map((s) => h('tr', null,
      h('td', null, h('button', { type: 'button', class: 'link-btn', onClick: () => app.openScript(s.id) }, s.title || 'Sem título')),
      h('td', null, statusSelect(s)),
      h('td', null, field('input', s.folder, (v) => { s.folder = v.trim(); touch(s); }, { 'aria-label': 'Pasta', placeholder: '—' })),
      h('td', null, field('input', s.tags.join(', '), (v) => { s.tags = [...new Set(v.split(',').map((t) => t.trim().replace(/^#/, '')).filter(Boolean))]; touch(s); }, { 'aria-label': 'Tags', placeholder: '—' })),
      h('td', { class: 'muted' }, tpl(s.template)),
      h('td', { class: 'muted' }, speechTime(s)),
      h('td', { class: 'muted' }, fmtDate(s.updatedAt)))))));
}

function boardView(items) {
  return h('div', { class: 'kanban' }, STATUSES.map((st) => {
    const rows = items.filter((s) => s.status === st);
    const col = h('div', { class: 'kan-col' },
      h('div', { class: 'kan-head' }, st, h('span', { class: 'count' }, rows.length)),
      rows.map((s) => {
        const c = h('div', { class: 'kan-card kan-script', draggable: 'true', onClick: () => app.openScript(s.id) },
          h('div', { class: 'g-title' }, s.title || 'Sem título'),
          h('div', { class: 'g-meta' }, s.folder ? h('span', null, '▸ ' + s.folder) : null, h('span', null, '≈ ' + speechTime(s))),
          statusSelect(s));
        c.addEventListener('dragstart', (e) => e.dataTransfer.setData('text/script', s.id));
        return c;
      }));
    col.addEventListener('dragover', (e) => { e.preventDefault(); col.classList.add('drop'); });
    col.addEventListener('dragleave', () => col.classList.remove('drop'));
    col.addEventListener('drop', (e) => {
      e.preventDefault();
      const s = state.scripts.get(e.dataTransfer.getData('text/script'));
      if (s) { s.status = st; touch(s); app.showLibrary(); }
    });
    return col;
  }));
}

export function libraryView(items, title) {
  const lib = state.library;
  const sorted = sortItems(items);
  const sortSel = h('select', { class: 'btn', 'aria-label': 'Ordenar', onChange: () => { lib.sort = sortSel.value; app.saveUi?.(); app.showLibrary(); } },
    SORTS.map(([v, label]) => h('option', { value: v }, label)));
  sortSel.value = lib.sort;

  let content;
  if (!items.length) {
    content = h('div', { class: 'paper paper-empty' },
      h('div', { class: 'empty-kicker' }, state.query ? 'Nada encontrado.' : 'Gaveta vazia.'),
      h('p', null, state.query ? 'Tente outra palavra.' : 'Nenhum roteiro aqui ainda. Puxe uma folha nova para começar.'),
      state.query ? null : h('button', { type: 'button', class: 'btn btn-stamp', onClick: () => document.getElementById('dlg-new').showModal() }, '+ Puxar folha nova'));
  } else if (lib.mode === 'lista') content = h('div', { class: 'l-list' }, sorted.map(listRow));
  else if (lib.mode === 'tabela') content = tableView(sorted);
  else if (lib.mode === 'quadro') content = boardView(sorted);
  else content = h('div', { class: 'gallery' }, sorted.map(galleryCard));

  return h('div', { class: 'library' },
    h('div', { class: 'lib-head' },
      h('h1', { class: 'lib-title' }, title, h('span', { class: 'count' }, items.length)),
      h('div', { class: 'lib-tools' },
        h('div', { class: 'seg seg-dark' }, VIEWS.map(([v, label]) => h('button', {
          type: 'button', class: 'seg-btn' + (lib.mode === v ? ' active' : ''),
          onClick: () => { lib.mode = v; app.saveUi?.(); app.showLibrary(); },
        }, label))),
        lib.mode === 'quadro' ? null : sortSel)),
    content);
}
