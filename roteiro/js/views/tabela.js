// Aba "Tabela": banco de dados no estilo Notion. Colunas com tipo (texto,
// número, seleção, caixa, data, link), ordenação e visualização em quadro
// (kanban) agrupado por uma coluna de seleção. Salva como tabela Markdown.

import { h, field, touch, app, uid, popMenu } from '../core.js';
import { COLUMN_TYPES } from '../model.js';

const mini = (label, title, onClick) =>
  h('button', { type: 'button', class: 'btn btn-ghost btn-mini', title, 'aria-label': title, onClick }, label);

function emptyRow(tab) {
  return { id: uid(), cells: Object.fromEntries(tab.columns.map((c) => [c.id, c.type === 'check' ? false : ''])) };
}

function optionsOf(tab, col) {
  return [...new Set(tab.rows.map((r) => r.cells[col.id]).filter(Boolean))].sort((a, b) => String(a).localeCompare(String(b)));
}

function cellEditor(s, tab, col, row) {
  const v = row.cells[col.id];
  const set = (x) => { row.cells[col.id] = x; touch(s, { list: false }); };
  switch (col.type) {
    case 'check': {
      const box = h('input', { type: 'checkbox', checked: !!v, 'aria-label': col.name, onChange: () => set(box.checked) });
      return h('label', { class: 'cell-check' }, box);
    }
    case 'numero':
      return field('input', v, set, { type: 'text', inputmode: 'decimal', class: 'cell-num', 'aria-label': col.name });
    case 'data':
      return field('input', v, set, { type: 'date', 'aria-label': col.name });
    case 'selecao': {
      const listId = 'opts-' + col.id;
      return h('div', { class: 'cell-select' },
        field('input', v, set, { list: listId, class: 'select-pill', 'aria-label': col.name }),
        h('datalist', { id: listId }, optionsOf(tab, col).map((o) => h('option', { value: o }))));
    }
    case 'link':
      return h('div', { class: 'td-link' },
        field('input', v, set, { type: 'url', 'aria-label': col.name, placeholder: 'https://…' }),
        v ? h('a', { href: v, target: '_blank', rel: 'noopener', class: 'open-link' }, '↗') : null);
    default:
      return field('textarea', v, set, { 'aria-label': col.name });
  }
}

function columnMenu(s, tab, col, anchor) {
  const i = tab.columns.indexOf(col);
  popMenu(anchor, [
    { heading: 'Tipo da coluna' },
    ...Object.entries(COLUMN_TYPES).map(([k, label]) => ({
      label, active: col.type === k,
      onClick: () => {
        col.type = k;
        tab.rows.forEach((r) => {
          const v = r.cells[col.id];
          if (k === 'check') r.cells[col.id] = v === true || /^(x|sim|ok|true|1)$/i.test(String(v || ''));
          else if (typeof v === 'boolean') r.cells[col.id] = v ? 'sim' : '';
        });
        touch(s); app.renderEditor();
      },
    })),
    '-',
    { label: 'Ordenar A → Z', onClick: () => { tab.sort = { col: col.id, dir: 1 }; touch(s, { list: false }); app.renderEditor(); } },
    { label: 'Ordenar Z → A', onClick: () => { tab.sort = { col: col.id, dir: -1 }; touch(s, { list: false }); app.renderEditor(); } },
    tab.sort ? { label: 'Sem ordenação', onClick: () => { tab.sort = null; app.renderEditor(); } } : null,
    '-',
    { label: 'Mover para a esquerda', onClick: () => { if (i > 0) { tab.columns.splice(i - 1, 0, ...tab.columns.splice(i, 1)); touch(s); app.renderEditor(); } } },
    { label: 'Mover para a direita', onClick: () => { if (i < tab.columns.length - 1) { tab.columns.splice(i + 1, 0, ...tab.columns.splice(i, 1)); touch(s); app.renderEditor(); } } },
    { label: 'Apagar coluna', danger: true, onClick: () => { if (confirm(`Apagar a coluna "${col.name}"?`)) { tab.columns.splice(i, 1); touch(s); app.renderEditor(); } } },
  ].filter(Boolean));
}

function sortedRows(tab) {
  const rows = [...tab.rows];
  const sort = tab.sort;
  const col = sort && tab.columns.find((c) => c.id === sort.col);
  if (!col) return rows;
  const val = (r) => r.cells[col.id];
  return rows.sort((a, b) => {
    const x = val(a), y = val(b);
    if (col.type === 'numero') return ((parseFloat(String(x).replace(',', '.')) || 0) - (parseFloat(String(y).replace(',', '.')) || 0)) * sort.dir;
    if (col.type === 'check') return (Number(!!x) - Number(!!y)) * sort.dir;
    return String(x || '').localeCompare(String(y || ''), 'pt-BR', { numeric: true }) * sort.dir;
  });
}

function tableView(s, tab) {
  const total = tab.columns.filter((c) => c.type === 'numero').map((c) => {
    const sum = tab.rows.reduce((a, r) => a + (parseFloat(String(r.cells[c.id] || '').replace(',', '.')) || 0), 0);
    return [c.id, sum];
  });
  return h('div', { class: 'db-scroll' }, h('table', { class: 'db' },
    h('thead', null, h('tr', null,
      tab.columns.map((c) => h('th', null,
        h('div', { class: 'th-inner' },
          field('input', c.name, (v) => { c.name = v; touch(s, { list: false }); }, { class: 'th-name', 'aria-label': 'Nome da coluna' }),
          h('button', {
            type: 'button', class: 'th-type', title: 'Tipo, ordenação e opções',
            onClick: (e) => columnMenu(s, tab, c, e.currentTarget),
          }, (tab.sort?.col === c.id ? (tab.sort.dir > 0 ? '↑ ' : '↓ ') : '') + COLUMN_TYPES[c.type].toLowerCase())))),
      h('th', { class: 'td-narrow' }, mini('+', 'Nova coluna', () => {
        const col = { id: uid(), name: `Coluna ${tab.columns.length + 1}`, type: 'texto' };
        tab.columns.push(col);
        tab.rows.forEach((r) => (r.cells[col.id] = ''));
        touch(s); app.renderEditor();
      })))),
    h('tbody', null, sortedRows(tab).map((r) => h('tr', null,
      tab.columns.map((c) => h('td', { class: 'td-' + c.type }, cellEditor(s, tab, c, r))),
      h('td', { class: 'td-narrow' }, mini('✕', 'Apagar linha', () => { tab.rows.splice(tab.rows.indexOf(r), 1); touch(s); app.renderEditor(); }))))),
    total.length ? h('tfoot', null, h('tr', null, tab.columns.map((c) => {
      const t = total.find(([id]) => id === c.id);
      return h('td', { class: 'td-total' }, t ? 'Σ ' + t[1].toLocaleString('pt-BR') : '');
    }), h('td'))) : null));
}

function boardView(s, tab) {
  const groupCol = tab.columns.find((c) => c.id === tab.groupBy) || tab.columns.find((c) => c.type === 'selecao');
  if (!groupCol) {
    return h('div', { class: 'empty-note' }, 'Para ver em quadro, a tabela precisa de uma coluna do tipo "Seleção". Toque no tipo de uma coluna para mudar.');
  }
  const titleCol = tab.columns.find((c) => c !== groupCol);
  const groups = [...optionsOf(tab, groupCol), ''];
  return h('div', { class: 'kanban' }, groups.map((g) => {
    const rows = tab.rows.filter((r) => (r.cells[groupCol.id] || '') === g);
    if (!g && !rows.length) return null;
    const col = h('div', { class: 'kan-col', 'data-group': g },
      h('div', { class: 'kan-head' }, g || 'Sem ' + groupCol.name.toLowerCase(), h('span', { class: 'count' }, rows.length)),
      rows.map((r) => {
        const cardEl = h('div', { class: 'kan-card', draggable: 'true' },
          titleCol ? field('textarea', r.cells[titleCol.id], (v) => { r.cells[titleCol.id] = v; touch(s, { list: false }); }, { 'aria-label': titleCol.name }) : null,
          h('div', { class: 'kan-props' }, tab.columns.filter((c) => c !== titleCol && c !== groupCol && r.cells[c.id] !== '' && r.cells[c.id] != null && r.cells[c.id] !== false)
            .map((c) => h('span', { class: 'kan-prop' }, c.name + ': ' + (c.type === 'check' ? '✓' : r.cells[c.id])))),
          h('select', {
            class: 'kan-move', 'aria-label': 'Mover para',
            onChange: (e) => { r.cells[groupCol.id] = e.target.value; touch(s, { list: false }); app.renderEditor(); },
          }, groups.map((x) => { const o = h('option', { value: x }, x || '—'); o.selected = x === g; return o; })));
        cardEl.addEventListener('dragstart', (e) => e.dataTransfer.setData('text/row', r.id));
        return cardEl;
      }),
      h('button', { type: 'button', class: 'btn btn-ghost btn-add', onClick: () => { const r = emptyRow(tab); r.cells[groupCol.id] = g; tab.rows.push(r); touch(s); app.renderEditor(); } }, '+ cartão'));
    col.addEventListener('dragover', (e) => { e.preventDefault(); col.classList.add('drop'); });
    col.addEventListener('dragleave', () => col.classList.remove('drop'));
    col.addEventListener('drop', (e) => {
      e.preventDefault();
      const r = tab.rows.find((x) => x.id === e.dataTransfer.getData('text/row'));
      if (r) { r.cells[groupCol.id] = g; touch(s, { list: false }); app.renderEditor(); }
    });
    return col;
  }));
}

export function tabelaView(s, tab) {
  const view = tab.view || 'tabela';
  const selects = tab.columns.filter((c) => c.type === 'selecao');
  return h('div', { class: 'tabela' },
    h('div', { class: 'view-bar' },
      h('div', { class: 'seg' }, [['tabela', 'Tabela'], ['quadro', 'Quadro']].map(([v, label]) => h('button', {
        type: 'button', class: 'seg-btn' + (view === v ? ' active' : ''),
        onClick: () => { tab.view = v; touch(s, { list: false }); app.renderEditor(); },
      }, label))),
      view === 'quadro' && selects.length > 1 ? (() => {
        const sel = h('select', { class: 'btn', onChange: () => { tab.groupBy = sel.value; app.renderEditor(); } },
          selects.map((c) => h('option', { value: c.id }, 'Agrupar por ' + c.name)));
        sel.value = tab.groupBy || selects[0].id;
        return sel;
      })() : null,
      h('button', { type: 'button', class: 'btn', onClick: () => { tab.rows.push(emptyRow(tab)); touch(s); app.renderEditor(); } }, '+ Linha')),
    view === 'quadro' ? boardView(s, tab) : tableView(s, tab));
}
