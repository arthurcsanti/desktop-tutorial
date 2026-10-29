import { TEMPLATES, LEGEND, STATUSES, buildScript, uid, today } from './templates.js';
import * as db from './db.js';
import * as drive from './drive.js';

const THEMES = [
  { id: 'envelhecido', name: 'Papel envelhecido', desc: 'Amarelado e escuro, como folha guardada numa gaveta.' },
  { id: 'noturno', name: 'Papel carbono', desc: 'Folha escura, tinta clara. Para escrever de madrugada.' },
  { id: 'pergaminho', name: 'Pergaminho claro', desc: 'Mais claro, para ambientes com muita luz.' },
];

const TABS = [
  ['ficha', 'Capa e ficha'],
  ['roteiro', 'Roteiro'],
  ['texto', 'Texto integral'],
  ['producao', 'Produção'],
];

const state = {
  scripts: new Map(),
  currentId: null,
  tab: 'roteiro',
  filter: { type: 'all' },
  query: '',
  lastField: null,
  syncing: false,
  settings: { theme: 'envelhecido', sound: false, typewriter: true, clientId: '', driveLinked: false, lastSync: 0 },
};

const $ = (sel) => document.querySelector(sel);

function h(tag, props, ...kids) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(props || {})) {
    if (v == null || v === false) continue;
    if (k === 'class') el.className = v;
    else if (k === 'value') el.value = v;
    else if (k.startsWith('on')) el.addEventListener(k.slice(2).toLowerCase(), v);
    else el.setAttribute(k, v === true ? '' : v);
  }
  return fill(el, ...kids);
}

// Como replaceChildren, mas aceita listas aninhadas e ignora null/false.
function fill(el, ...kids) {
  el.replaceChildren();
  for (const c of kids.flat(Infinity)) {
    if (c == null || c === false) continue;
    el.append(c.nodeType ? c : document.createTextNode(String(c)));
  }
  return el;
}

function autosize(el) {
  el.style.height = 'auto';
  el.style.height = el.scrollHeight + 'px';
}

function field(tag, value, onChange, attrs = {}) {
  const el = h(tag, { ...attrs, onFocus: () => (state.lastField = el) });
  el.value = value || '';
  el.addEventListener('input', () => {
    onChange(el.value);
    if (tag === 'textarea') autosize(el);
  });
  if (tag === 'textarea') {
    el.rows = 1;
    requestAnimationFrame(() => autosize(el));
  }
  return el;
}

function toast(msg) {
  const t = $('#toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => t.classList.remove('show'), 2800);
}

const current = () => state.scripts.get(state.currentId);
const live = () => [...state.scripts.values()].filter((s) => !s.purged);
const fmtDate = (ts) => new Date(ts).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });

// ---------- salvar ----------

const saveTimers = new Map();
function touch(s, { list = true } = {}) {
  s.updatedAt = Date.now();
  $('#savestate').textContent = 'datilografando…';
  clearTimeout(saveTimers.get(s.id));
  saveTimers.set(s.id, setTimeout(async () => {
    saveTimers.delete(s.id);
    try {
      await db.putScript(s);
      $('#savestate').textContent = 'salvo neste aparelho';
    } catch (e) {
      $('#savestate').textContent = 'não foi possível salvar';
      toast('Erro ao salvar: ' + e.message);
    }
    scheduleSync();
  }, 400));
  if (list) renderListSoon();
}

async function flushSaves() {
  for (const [id, timer] of saveTimers) {
    clearTimeout(timer);
    saveTimers.delete(id);
    const s = state.scripts.get(id);
    if (s) await db.putScript(s);
  }
}

async function saveSettings() {
  await db.setMeta('settings', state.settings);
}

// ---------- som de máquina ----------

let audio;
function clack(kind) {
  if (!state.settings.sound) return;
  try {
    audio ||= new (window.AudioContext || window.webkitAudioContext)();
    const len = kind === 'return' ? 0.09 : 0.03;
    const buf = audio.createBuffer(1, Math.floor(audio.sampleRate * len), audio.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / d.length, kind === 'return' ? 2 : 5);
    const src = audio.createBufferSource();
    src.buffer = buf;
    const f = audio.createBiquadFilter();
    f.type = 'bandpass';
    f.frequency.value = kind === 'return' ? 700 : 1500 + Math.random() * 900;
    const g = audio.createGain();
    g.gain.value = kind === 'return' ? 0.8 : 0.45;
    src.connect(f).connect(g).connect(audio.destination);
    src.start();
  } catch {}
}

document.addEventListener('keydown', (e) => {
  if (!e.target.closest?.('.paper') || e.ctrlKey || e.metaKey || e.altKey) return;
  if (e.key === 'Enter') clack('return');
  else if (e.key.length === 1 || e.key === 'Backspace') clack('key');
});

// Rolagem de máquina de escrever: mantém a linha que está sendo escrita no meio da tela.
function typewriterScroll(el) {
  if (!state.settings.typewriter || el.selectionStart !== el.value.length) return;
  const desk = $('#desk');
  const rect = el.getBoundingClientRect();
  const target = desk.clientHeight * 0.55;
  const delta = rect.bottom - target;
  if (delta > 0) desk.scrollBy({ top: delta, behavior: 'smooth' });
}

// ---------- barra lateral ----------

function filtered() {
  const q = state.query.trim().toLowerCase();
  const f = state.filter;
  return live()
    .filter((s) => (f.type === 'trash' ? s.deleted : !s.deleted))
    .filter((s) => {
      if (f.type === 'pinned') return s.pinned;
      if (f.type === 'folder') return s.folder === f.value;
      if (f.type === 'tag') return s.tags.includes(f.value);
      if (f.type === 'status') return s.status === f.value;
      return true;
    })
    .filter((s) => !q || searchText(s).includes(q))
    .sort((a, b) => (b.pinned - a.pinned) || (b.updatedAt - a.updatedAt));
}

function searchText(s) {
  return [
    s.title, s.cover.subtitle, s.folder, s.tags.join(' '), s.fulltext,
    s.ficha.map((x) => x.value).join(' '),
    s.sections.map((x) => x.name + ' ' + x.scenes.map((c) => c.narration + ' ' + c.visual).join(' ')).join(' '),
  ].join(' ').toLowerCase();
}

function renderNav() {
  const active = live().filter((s) => !s.deleted);
  const folders = [...new Set(active.map((s) => s.folder).filter(Boolean))].sort((a, b) => a.localeCompare(b));
  const tags = [...new Set(active.flatMap((s) => s.tags))].sort((a, b) => a.localeCompare(b));
  const f = state.filter;
  const item = (label, filter, count) =>
    h('button', {
      type: 'button',
      class: 'nav-item' + (f.type === filter.type && f.value === filter.value ? ' active' : ''),
      onClick: () => { state.filter = filter; renderSidebar(); },
    }, h('span', null, label), count != null ? h('span', { class: 'count' }, count) : null);

  const nav = $('#nav');
  fill(nav, [
    item('Todos os roteiros', { type: 'all' }, active.length),
    item('Fixados', { type: 'pinned' }, active.filter((s) => s.pinned).length),
    h('div', { class: 'nav-label' }, 'Status'),
    h('div', { class: 'nav-chips' }, STATUSES.map((st) => {
      const n = active.filter((s) => s.status === st).length;
      return n ? h('button', {
        type: 'button',
        class: 'tag' + (f.type === 'status' && f.value === st ? ' active' : ''),
        onClick: () => { state.filter = { type: 'status', value: st }; renderSidebar(); },
      }, `${st} ${n}`) : null;
    })),
    folders.length ? h('div', { class: 'nav-label' }, 'Pastas') : null,
    folders.map((name) => item('▸ ' + name, { type: 'folder', value: name }, active.filter((s) => s.folder === name).length)),
    tags.length ? h('div', { class: 'nav-label' }, 'Tags') : null,
    tags.length ? h('div', { class: 'nav-chips' }, tags.map((t) => h('button', {
      type: 'button',
      class: 'tag' + (f.type === 'tag' && f.value === t ? ' active' : ''),
      onClick: () => { state.filter = { type: 'tag', value: t }; renderSidebar(); },
    }, '#' + t))) : null,
    item('Lixeira', { type: 'trash' }, live().filter((s) => s.deleted).length),
  ]);
}

function renderList() {
  const list = $('#list');
  const items = filtered();
  if (!items.length) {
    list.replaceChildren(h('p', { class: 'list-empty' }, state.query ? 'Nada encontrado.' : 'Nenhum roteiro aqui ainda.'));
    return;
  }
  list.replaceChildren(...items.map((s) => h('button', {
    type: 'button',
    class: 'card' + (s.id === state.currentId ? ' active' : ''),
    onClick: () => openScript(s.id),
  },
  h('div', { class: 'card-title' }, s.pinned ? '★ ' : '', s.title || 'Sem título'),
  h('div', { class: 'card-meta' },
    h('span', { class: 'stamp-mini' }, s.status),
    h('span', null, fmtDate(s.updatedAt)),
    s.folder ? h('span', null, '▸ ' + s.folder) : null))));
}

function renderSidebar() {
  renderNav();
  renderList();
}

let listTimer;
function renderListSoon() {
  clearTimeout(listTimer);
  listTimer = setTimeout(renderSidebar, 300);
}

function setDrawer(open) {
  $('#app').classList.toggle('drawer-open', open);
}

// ---------- topo ----------

function renderTop() {
  const s = current();
  const crumb = $('#crumb');
  const actions = $('#top-actions');
  if (!s) {
    crumb.replaceChildren();
    actions.replaceChildren();
    return;
  }
  fill(crumb,
    s.folder ? h('span', { class: 'crumb-folder' }, s.folder + ' / ') : null,
    h('span', null, s.title || 'Sem título'),
  );
  const btn = (label, title, onClick, cls = '') =>
    h('button', { type: 'button', class: 'btn btn-ghost ' + cls, title, 'aria-label': title, onClick }, label);
  actions.replaceChildren(
    btn(s.pinned ? '★' : '☆', s.pinned ? 'Desafixar' : 'Fixar', () => { s.pinned = !s.pinned; touch(s); renderTop(); }),
    btn('Foco', 'Modo foco: esconde o arquivo', () => $('#app').classList.toggle('focus'), 'hide-sm'),
    btn(state.settings.sound ? 'Som ●' : 'Som ○', 'Som de máquina de escrever', async () => {
      state.settings.sound = !state.settings.sound;
      await saveSettings();
      renderTop();
      clack('return');
    }),
    btn('⧉', 'Duplicar', () => duplicate(s)),
    btn('Exportar', 'Exportar ou imprimir', () => $('#dlg-export').showModal()),
    btn('✕', 'Mover para a lixeira', () => trash(s), 'danger'),
  );
}

// ---------- editor ----------

function renderEditor() {
  renderTop();
  const root = $('#editor');
  const s = current();
  if (!s) {
    root.replaceChildren(h('div', { class: 'paper paper-empty' },
      h('div', { class: 'empty-kicker' }, 'A máquina está pronta.'),
      h('p', null, 'Nenhuma folha no rolo. Puxe uma folha nova ou escolha um roteiro no arquivo.'),
      h('button', { type: 'button', class: 'btn btn-stamp', onClick: () => $('#dlg-new').showModal() }, '+ Puxar folha nova'),
    ));
    return;
  }
  const tabs = h('div', { class: 'tabs', role: 'tablist' }, TABS.map(([id, label]) => h('button', {
    type: 'button',
    role: 'tab',
    class: 'tab' + (state.tab === id ? ' active' : ''),
    'aria-selected': state.tab === id ? 'true' : 'false',
    onClick: () => { state.tab = id; renderEditor(); },
  }, label)));

  const body = { ficha: renderFicha, roteiro: renderRoteiro, texto: renderTexto, producao: renderProducao }[state.tab](s);
  fill(root,
    s.deleted ? h('div', { class: 'banner' },
      'Este roteiro está na lixeira.',
      h('button', { type: 'button', class: 'btn', onClick: () => restore(s) }, 'Restaurar'),
      h('button', { type: 'button', class: 'btn danger', onClick: () => purge(s) }, 'Apagar para sempre')) : null,
    h('article', { class: 'paper' }, renderProps(s), tabs, body),
  );
}

// Propriedades no estilo Notion: pasta, tags e status.
function renderProps(s) {
  const folders = [...new Set(live().map((x) => x.folder).filter(Boolean))];
  const listId = 'folders-' + s.id;
  const tpl = TEMPLATES.find((t) => t.id === s.template);
  return h('div', { class: 'props' },
    h('label', { class: 'prop' }, h('span', { class: 'prop-key' }, 'Pasta'),
      field('input', s.folder, (v) => { s.folder = v.trim(); touch(s); renderTop(); }, { list: listId, placeholder: 'Sem pasta', class: 'prop-val' }),
      h('datalist', { id: listId }, folders.map((f) => h('option', { value: f })))),
    h('label', { class: 'prop' }, h('span', { class: 'prop-key' }, 'Tags'),
      field('input', s.tags.join(', '), (v) => {
        s.tags = [...new Set(v.split(',').map((t) => t.trim().replace(/^#/, '')).filter(Boolean))];
        touch(s);
      }, { placeholder: 'separe, por, vírgula', class: 'prop-val' })),
    h('label', { class: 'prop' }, h('span', { class: 'prop-key' }, 'Status'),
      (() => {
        const sel = h('select', { class: 'prop-val', onChange: () => { s.status = sel.value; touch(s); } },
          STATUSES.map((st) => h('option', { value: st }, st)));
        sel.value = s.status;
        return sel;
      })()),
    h('div', { class: 'prop prop-static' }, h('span', { class: 'prop-key' }, 'Estrutura'),
      h('span', { class: 'prop-val' }, tpl ? tpl.name : '—', ' · criado em ', new Date(s.createdAt).toLocaleDateString('pt-BR'))),
  );
}

function renderFicha(s) {
  const c = s.cover;
  const cf = (key, placeholder, cls = '') =>
    field('input', c[key], (v) => { c[key] = v; touch(s, { list: false }); }, { placeholder, class: 'line ' + cls });
  return h('div', null,
    h('section', { class: 'cover' },
      h('div', { class: 'cover-kicker' }, 'ROTEIRO'),
      field('input', s.title, (v) => { s.title = v; touch(s); renderTop(); }, { placeholder: 'TÍTULO DO VÍDEO', class: 'line cover-title' }),
      cf('subtitle', 'Subtítulo ou nome da série', 'cover-sub'),
      cf('episode', 'EP. 00', 'cover-ep'),
      h('div', { class: 'cover-by' }, 'escrito por'),
      cf('author', 'Nome do autor', 'cover-author'),
      h('div', { class: 'cover-crew' },
        h('label', null, 'Direção: ', cf('direcao', 'Nome')),
        h('label', null, 'Produção: ', cf('producao', 'Nome')),
        h('label', null, 'Edição: ', cf('edicao', 'Nome'))),
      h('div', { class: 'cover-foot' },
        h('label', null, 'Versão ', cf('versao', '1.0', 'w-s')),
        h('label', null, '| Rascunho nº ', cf('rascunho', '1', 'w-s')),
        h('label', null, '| ', cf('data', 'DD/MM/AAAA', 'w-m'))),
      cf('contato', 'contato@email.com | @perfil', 'cover-contact'),
    ),
    h('h2', { class: 'part' }, 'Ficha do vídeo'),
    fieldTable(s, s.ficha, 'Novo campo da ficha'),
    h('h2', { class: 'part' }, 'Legenda'),
    h('dl', { class: 'legend-table' }, LEGEND.map((l) => [h('dt', null, l.code), h('dd', null, l.desc)])),
  );
}

// Lista de campos rótulo + texto, usada na ficha e nas notas de produção.
function fieldTable(s, rows, addLabel) {
  return h('div', { class: 'kv' },
    rows.map((r, i) => h('div', { class: 'kv-row' },
      field('input', r.label, (v) => { r.label = v; touch(s, { list: false }); }, { class: 'kv-key', 'aria-label': 'Nome do campo' }),
      field('textarea', r.value, (v) => { r.value = v; touch(s); }, { class: 'kv-val', placeholder: r.hint || '' }),
      h('button', {
        type: 'button', class: 'btn btn-ghost btn-x', title: 'Remover campo', 'aria-label': 'Remover campo',
        onClick: () => {
          if (r.value && !confirm(`Remover o campo "${r.label}"?`)) return;
          rows.splice(i, 1); touch(s); renderEditor();
        },
      }, '✕'))),
    h('button', {
      type: 'button', class: 'btn btn-ghost btn-add',
      onClick: () => { rows.push({ id: uid(), label: 'Novo campo', hint: '', value: '' }); touch(s); renderEditor(); },
    }, '+ ' + addLabel));
}

const MARKERS = /\b(OFF|SOBE SOM|BG|LETTERING)\s*:|\b[\p{Lu}][\p{Lu}\s.]*\(ON\)\s*:|\[[^\]]*\]/gu;
function countWords(text) {
  const clean = (text || '').replace(MARKERS, ' ');
  return (clean.match(/[\p{L}\p{N}]+/gu) || []).length;
}

function stats(s) {
  const words = s.sections.reduce((n, sec) => n + sec.scenes.reduce((m, c) => m + countWords(c.narration), 0), 0);
  const scenes = s.sections.reduce((n, sec) => n + sec.scenes.length, 0);
  const secs = Math.round((words / 150) * 60);
  return { words, scenes, time: `${Math.floor(secs / 60)} min ${String(secs % 60).padStart(2, '0')} s` };
}

function insertAtCursor(text) {
  const el = state.lastField;
  if (!el || !el.isConnected) return toast('Clique antes no campo onde quer inserir.');
  const start = el.selectionStart ?? el.value.length;
  const end = el.selectionEnd ?? start;
  const before = el.value.slice(0, start);
  const sep = before && !/\s$/.test(before) && !text.startsWith('[') ? '\n' : '';
  el.value = before + sep + text + el.value.slice(end);
  const pos = start + sep.length + text.length;
  el.focus();
  el.setSelectionRange(pos, pos);
  el.dispatchEvent(new Event('input'));
  clack('key');
}

function move(arr, i, d) {
  const j = i + d;
  if (j < 0 || j >= arr.length) return false;
  [arr[i], arr[j]] = [arr[j], arr[i]];
  return true;
}

function renderRoteiro(s) {
  const st = stats(s);
  let n = 0;
  const statLine = h('div', { class: 'stats' }, `${st.scenes} cenas · ${st.words} palavras de narração · ≈ ${st.time} de fala`);
  const refreshStats = () => {
    const x = stats(s);
    statLine.textContent = `${x.scenes} cenas · ${x.words} palavras de narração · ≈ ${x.time} de fala`;
  };
  const mini = (label, title, onClick) =>
    h('button', { type: 'button', class: 'btn btn-ghost btn-mini', title, 'aria-label': title, onClick }, label);

  return h('div', null,
    h('div', { class: 'legend-bar' },
      h('span', { class: 'muted small' }, 'Inserir:'),
      LEGEND.map((l) => h('button', {
        type: 'button', class: 'chip', title: l.desc,
        onMousedown: (e) => e.preventDefault(),
        onClick: () => insertAtCursor(l.insert),
      }, l.code))),
    statLine,
    h('div', { class: 'script-head' }, h('span', null, 'Cena'), h('span', null, 'Narração'), h('span', null, 'Visual')),
    s.sections.map((sec, si) => h('section', { class: 'sec' },
      h('div', { class: 'sec-head' },
        field('input', sec.name, (v) => { sec.name = v; touch(s, { list: false }); }, { class: 'sec-name', placeholder: 'NOME DA SEÇÃO' }),
        h('div', { class: 'sec-tools' },
          mini('↑', 'Subir seção', () => { if (move(s.sections, si, -1)) { touch(s); renderEditor(); } }),
          mini('↓', 'Descer seção', () => { if (move(s.sections, si, 1)) { touch(s); renderEditor(); } }),
          mini('✕', 'Remover seção', () => {
            const filled = sec.scenes.some((c) => c.narration || c.visual);
            if (filled && !confirm(`Remover a seção "${sec.name}" e todas as cenas dela?`)) return;
            s.sections.splice(si, 1); touch(s); renderEditor();
          }))),
      field('textarea', sec.hint, (v) => { sec.hint = v; touch(s, { list: false }); }, { class: 'sec-hint', placeholder: 'Anotação da seção (opcional)' }),
      sec.scenes.map((c, ci) => {
        n++;
        return h('div', { class: 'scene' },
          h('div', { class: 'scene-num' }, String(n).padStart(2, '0'),
            h('div', { class: 'scene-tools' },
              mini('↑', 'Subir cena', () => { if (move(sec.scenes, ci, -1)) { touch(s); renderEditor(); } }),
              mini('↓', 'Descer cena', () => { if (move(sec.scenes, ci, 1)) { touch(s); renderEditor(); } }),
              mini('✕', 'Remover cena', () => {
                if ((c.narration || c.visual) && !confirm('Remover esta cena?')) return;
                sec.scenes.splice(ci, 1); touch(s); renderEditor();
              }))),
          field('textarea', c.narration, (v) => { c.narration = v; touch(s); refreshStats(); }, { class: 'scene-text', placeholder: c.pn || 'OFF: ', 'aria-label': 'Narração' }),
          field('textarea', c.visual, (v) => { c.visual = v; touch(s); }, { class: 'scene-visual', placeholder: c.pv || 'DESCREVA AS IMAGENS DA CENA', 'aria-label': 'Visual' }),
        );
      }),
      h('button', {
        type: 'button', class: 'btn btn-ghost btn-add',
        onClick: () => { sec.scenes.push({ id: uid(), narration: '', visual: '' }); touch(s); renderEditor(); focusLast('.scene-text'); },
      }, '+ cena'))),
    h('button', {
      type: 'button', class: 'btn btn-add-sec',
      onClick: () => {
        s.sections.push({ id: uid(), name: 'Nova seção', hint: '', scenes: [{ id: uid(), narration: '', visual: '' }] });
        touch(s); renderEditor(); focusLast('.sec-name', true);
      },
    }, '+ Nova seção'),
  );
}

function focusLast(selector, select) {
  const els = document.querySelectorAll('#editor ' + selector);
  const el = els[els.length - 1];
  if (!el) return;
  el.focus();
  if (select) el.select();
}

function narrationText(s) {
  return s.sections
    .map((sec) => [sec.name.toUpperCase(), ...sec.scenes.map((c) => c.narration).filter(Boolean)].join('\n\n'))
    .join('\n\n\n');
}

function renderTexto(s) {
  const count = h('span', { class: 'muted small' });
  const upd = () => (count.textContent = `${countWords(s.fulltext)} palavras`);
  upd();
  const ta = field('textarea', s.fulltext, (v) => { s.fulltext = v; touch(s); upd(); typewriterScroll(ta); }, {
    class: 'typewriter',
    placeholder: 'Escreva aqui o roteiro corrido, do começo ao fim, sem tabela.\n\nBom para o teleprompter, para ler em voz alta e para cronometrar.',
  });
  return h('div', null,
    h('div', { class: 'texto-bar' },
      h('button', {
        type: 'button', class: 'btn',
        onClick: () => {
          const gen = narrationText(s);
          if (s.fulltext.trim() && !confirm('Substituir o texto integral pela narração do roteiro?')) return;
          s.fulltext = gen; touch(s); renderEditor();
        },
      }, 'Montar a partir do roteiro'),
      count),
    ta);
}

function renderProducao(s) {
  return h('div', null,
    h('h2', { class: 'part' }, 'Notas de produção'),
    fieldTable(s, s.notes, 'Nova nota'),
    h('h2', { class: 'part' }, 'Histórico de versões'),
    h('div', { class: 'versions' },
      h('div', { class: 'ver-row ver-head' }, h('span', null, 'Versão'), h('span', null, 'Data'), h('span', null, 'Alterações'), h('span')),
      s.versions.map((v, i) => h('div', { class: 'ver-row' },
        field('input', v.v, (x) => { v.v = x; touch(s, { list: false }); }, { 'aria-label': 'Versão' }),
        field('input', v.date, (x) => { v.date = x; touch(s, { list: false }); }, { 'aria-label': 'Data' }),
        field('textarea', v.changes, (x) => { v.changes = x; touch(s, { list: false }); }, { 'aria-label': 'Alterações' }),
        h('button', { type: 'button', class: 'btn btn-ghost btn-x', title: 'Remover', onClick: () => { s.versions.splice(i, 1); touch(s); renderEditor(); } }, '✕'))),
      h('button', {
        type: 'button', class: 'btn btn-ghost btn-add',
        onClick: () => {
          const last = parseFloat(s.versions.at(-1)?.v) || 0;
          const v = (Math.floor(last * 10 + 1) / 10).toFixed(1);
          s.versions.push({ id: uid(), v, date: today(), changes: '' });
          s.cover.versao = v;
          touch(s); renderEditor();
        },
      }, '+ Nova versão')));
}

// ---------- ações ----------

async function createScript(templateId) {
  const s = buildScript(templateId);
  if (state.filter.type === 'folder') s.folder = state.filter.value;
  state.scripts.set(s.id, s);
  await db.putScript(s);
  if (state.filter.type === 'trash') state.filter = { type: 'all' };
  state.tab = 'ficha';
  openScript(s.id);
  requestAnimationFrame(() => $('.cover-title')?.focus());
  scheduleSync();
}

function openScript(id) {
  state.currentId = id;
  state.lastField = null;
  if (!['ficha', 'roteiro', 'texto', 'producao'].includes(state.tab)) state.tab = 'roteiro';
  renderSidebar();
  renderEditor();
  $('#desk').scrollTop = 0;
  setDrawer(false);
  db.setMeta('lastOpen', id).catch(() => {});
}

function duplicate(s) {
  const copy = structuredClone(s);
  copy.id = uid();
  copy.title = (s.title || 'Sem título') + ' (cópia)';
  copy.createdAt = copy.updatedAt = Date.now();
  copy.pinned = false;
  state.scripts.set(copy.id, copy);
  touch(copy);
  openScript(copy.id);
  toast('Cópia criada.');
}

function trash(s) {
  s.deleted = true;
  touch(s);
  state.currentId = null;
  renderSidebar();
  renderEditor();
  toast('Movido para a lixeira.');
}

function restore(s) {
  s.deleted = false;
  touch(s);
  renderSidebar();
  renderEditor();
}

function purge(s) {
  if (!confirm('Apagar este roteiro para sempre? Não dá para desfazer.')) return;
  // Fica só um registro vazio, para que os outros aparelhos também apaguem.
  const tomb = { id: s.id, purged: true, deleted: true, updatedAt: Date.now(), title: '', tags: [], sections: [], ficha: [], notes: [], versions: [], cover: {}, fulltext: '' };
  state.scripts.set(s.id, tomb);
  touch(tomb);
  state.currentId = null;
  renderSidebar();
  renderEditor();
}

// ---------- exportar ----------

function download(name, text, type) {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = h('a', { href: url, download: name });
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

const safeName = (s) => (s.title || 'roteiro').replace(/[\\/:*?"<>|]+/g, '-').trim();

function toMarkdown(s) {
  const cell = (t) => (t || '').replace(/\|/g, '\\|').replace(/\n/g, '<br>');
  const c = s.cover;
  const out = [
    '---',
    `status: ${s.status}`,
    s.folder ? `pasta: ${s.folder}` : null,
    s.tags.length ? `tags: [${s.tags.join(', ')}]` : null,
    `atualizado: ${new Date(s.updatedAt).toISOString()}`,
    '---',
    '',
    `# ${s.title || 'Sem título'}`,
    c.subtitle ? `*${c.subtitle}*${c.episode ? ' — ' + c.episode : ''}` : c.episode,
    c.author ? `escrito por **${c.author}**` : null,
    [c.direcao && `Direção: ${c.direcao}`, c.producao && `Produção: ${c.producao}`, c.edicao && `Edição: ${c.edicao}`].filter(Boolean).join(' · '),
    `Versão ${c.versao} | Rascunho nº ${c.rascunho} | ${c.data}`,
    c.contato,
    '',
    '## Ficha do vídeo',
    '',
    ...s.ficha.map((f) => `**${f.label}:** ${f.value.replace(/\n/g, '  \n')}`),
    '',
    '## Roteiro',
  ];
  let n = 0;
  for (const sec of s.sections) {
    out.push('', `### ${sec.name}`);
    if (sec.hint) out.push('', `> ${sec.hint.replace(/\n/g, '\n> ')}`);
    out.push('', '| Cena | Narração | Visual |', '|---|---|---|');
    for (const sc of sec.scenes) out.push(`| ${String(++n).padStart(2, '0')} | ${cell(sc.narration)} | ${cell(sc.visual)} |`);
  }
  if (s.fulltext.trim()) out.push('', '## Texto integral', '', s.fulltext);
  out.push('', '## Notas de produção', '', ...s.notes.map((f) => `**${f.label}:** ${f.value.replace(/\n/g, '  \n')}`));
  out.push('', '## Histórico de versões', '', '| Versão | Data | Alterações |', '|---|---|---|',
    ...s.versions.map((v) => `| ${cell(v.v)} | ${cell(v.date)} | ${cell(v.changes)} |`));
  return out.filter((x) => x != null).join('\n') + '\n';
}

function toText(s) {
  const c = s.cover;
  const line = '-'.repeat(60);
  const out = [
    'ROTEIRO', '', (s.title || 'SEM TÍTULO').toUpperCase(), c.subtitle, c.episode, '',
    c.author ? 'escrito por ' + c.author : null, '', line, 'FICHA DO VÍDEO', line,
    ...s.ficha.map((f) => `${f.label.toUpperCase()}: ${f.value}`), '', line, 'ROTEIRO', line,
  ];
  let n = 0;
  for (const sec of s.sections) {
    out.push('', `== ${sec.name.toUpperCase()} ==`);
    for (const sc of sec.scenes) {
      out.push('', `${String(++n).padStart(2, '0')}  ${sc.narration}`);
      if (sc.visual) out.push(`    [VISUAL] ${sc.visual}`);
    }
  }
  if (s.fulltext.trim()) out.push('', line, 'TEXTO INTEGRAL', line, '', s.fulltext);
  out.push('', line, 'NOTAS DE PRODUÇÃO', line, ...s.notes.map((f) => `${f.label.toUpperCase()}: ${f.value}`));
  return out.filter((x) => x != null).join('\n') + '\n';
}

function printScript(s) {
  const c = s.cover;
  let n = 0;
  const kv = (rows) => h('table', { class: 'p-kv' }, rows.filter((r) => r.value).map((r) => h('tr', null, h('th', null, r.label), h('td', null, r.value))));
  fill($('#print-area'),
    h('div', { class: 'p-cover' },
      h('div', null, 'ROTEIRO'),
      h('h1', null, s.title || 'Sem título'),
      h('div', null, c.subtitle), h('div', null, c.episode),
      c.author ? h('p', null, 'escrito por', h('br'), c.author) : null,
      h('p', { class: 'p-small' }, [c.direcao && 'Direção: ' + c.direcao, c.producao && 'Produção: ' + c.producao, c.edicao && 'Edição: ' + c.edicao].filter(Boolean).join('   ')),
      h('p', { class: 'p-small' }, `Versão ${c.versao} | Rascunho nº ${c.rascunho} | ${c.data}`),
      h('p', { class: 'p-small' }, c.contato)),
    h('h2', null, 'Ficha do vídeo'), kv(s.ficha),
    h('h2', null, 'Roteiro'),
    h('table', { class: 'p-script' },
      h('thead', null, h('tr', null, h('th', null, 'Cena'), h('th', null, 'Narração'), h('th', null, 'Visual'))),
      h('tbody', null, s.sections.map((sec) => [
        h('tr', { class: 'p-sec' }, h('td', { colspan: 3 }, sec.name.toUpperCase())),
        sec.scenes.map((sc) => h('tr', null, h('td', null, String(++n).padStart(2, '0')), h('td', null, sc.narration), h('td', null, sc.visual))),
      ]))),
    s.fulltext.trim() ? [h('h2', null, 'Texto integral'), h('div', { class: 'p-full' }, s.fulltext)] : null,
    h('h2', null, 'Notas de produção'), kv(s.notes),
  );
  window.print();
}

function handleExport(kind) {
  const s = current();
  if (!s) return;
  if (kind === 'md') download(safeName(s) + '.md', toMarkdown(s), 'text/markdown');
  if (kind === 'txt') download(safeName(s) + '.txt', toText(s), 'text/plain');
  if (kind === 'json') download(safeName(s) + '.roteiro.json', JSON.stringify(s, null, 2), 'application/json');
  if (kind === 'pdf') { $('#dlg-export').close(); printScript(s); }
}

function isScript(x) {
  return x && typeof x.id === 'string' && Array.isArray(x.sections) && typeof x.updatedAt === 'number';
}

async function importFile(file) {
  try {
    const data = JSON.parse(await file.text());
    const items = (Array.isArray(data) ? data : data.scripts || [data]).filter(isScript);
    if (!items.length) return toast('Esse arquivo não tem roteiros deste app.');
    let n = 0;
    for (const s of items) {
      const local = state.scripts.get(s.id);
      if (!local || s.updatedAt > local.updatedAt) {
        state.scripts.set(s.id, s);
        await db.putScript(s);
        n++;
      }
    }
    renderSidebar();
    toast(`${n} roteiro(s) importado(s).`);
    scheduleSync();
  } catch (e) {
    toast('Não consegui ler o arquivo: ' + e.message);
  }
}

// ---------- nuvem ----------

function setSyncLabel(text, kind) {
  $('#sync-label').textContent = text;
  $('#sync-dot').className = 'sync-dot ' + (kind || '');
  const st = $('#drive-status');
  if (st) st.textContent = text;
}

function refreshSyncLabel() {
  const st = state.settings;
  if (!st.clientId || !st.driveLinked) return setSyncLabel('Só neste aparelho', '');
  if (!navigator.onLine) return setSyncLabel('Offline — sincroniza quando voltar', 'warn');
  if (!drive.isConnected()) return setSyncLabel('Drive: toque para reconectar', 'warn');
  const when = st.lastSync ? new Date(st.lastSync).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '—';
  setSyncLabel(`Drive sincronizado ${when}`, 'ok');
}

async function connectDrive() {
  const id = state.settings.clientId.trim();
  if (!id) {
    $('#dlg-settings').showModal();
    $('#opt-client').focus();
    return toast('Cole o ID do cliente OAuth para conectar.');
  }
  try {
    await drive.connect(id);
    state.settings.driveLinked = true;
    await saveSettings();
    await syncNow();
  } catch (e) {
    setSyncLabel('Erro: ' + e.message, 'err');
  }
}

async function syncNow() {
  if (state.syncing || !drive.isConnected() || !navigator.onLine) return refreshSyncLabel();
  state.syncing = true;
  setSyncLabel('Sincronizando…', 'busy');
  try {
    await flushSaves();
    const { pulled } = await drive.sync([...state.scripts.values()]);
    let currentChanged = false;
    for (const r of pulled) {
      const local = state.scripts.get(r.id);
      if (!local || r.updatedAt > local.updatedAt) {
        state.scripts.set(r.id, r);
        await db.putScript(r);
        if (r.id === state.currentId) currentChanged = true;
      }
    }
    state.settings.lastSync = Date.now();
    await saveSettings();
    renderSidebar();
    const typing = document.activeElement?.closest?.('#editor');
    if (currentChanged && !typing) renderEditor();
    refreshSyncLabel();
  } catch (e) {
    setSyncLabel('Erro ao sincronizar: ' + e.message, 'err');
  } finally {
    state.syncing = false;
  }
}

let syncTimer;
function scheduleSync() {
  if (!drive.isConnected()) return refreshSyncLabel();
  clearTimeout(syncTimer);
  syncTimer = setTimeout(syncNow, 5000);
}

// ---------- ajustes ----------

function applyTheme() {
  document.documentElement.dataset.theme = state.settings.theme;
}

function renderSettings() {
  const st = state.settings;
  $('#themes').replaceChildren(...THEMES.map((t) => h('label', { class: 'theme-opt' },
    (() => {
      const r = h('input', { type: 'radio', name: 'theme', value: t.id });
      r.checked = st.theme === t.id;
      r.addEventListener('change', async () => { st.theme = t.id; applyTheme(); await saveSettings(); });
      return r;
    })(),
    h('span', { class: 'swatch', 'data-swatch': t.id }),
    h('span', null, h('b', null, t.name), h('br'), h('span', { class: 'muted small' }, t.desc)))));
  $('#opt-sound').checked = st.sound;
  $('#opt-typewriter').checked = st.typewriter;
  $('#opt-client').value = st.clientId;
  refreshSyncLabel();
}

function renderTemplates() {
  $('#templates').replaceChildren(...TEMPLATES.map((t) => h('button', {
    type: 'button', class: 'tpl',
    onClick: () => { $('#dlg-new').close(); createScript(t.id); },
  },
  h('div', { class: 'tpl-name' }, t.name),
  h('div', { class: 'tpl-desc' }, t.desc),
  h('div', { class: 'tpl-secs' }, t.sections.map((s) => s.name).join(' → ')))));
}

// ---------- início ----------

function bind() {
  $('#btn-new').addEventListener('click', () => $('#dlg-new').showModal());
  $('#btn-settings').addEventListener('click', () => { renderSettings(); $('#dlg-settings').showModal(); });
  $('#btn-menu').addEventListener('click', () => setDrawer(!$('#app').classList.contains('drawer-open')));
  $('#scrim').addEventListener('click', () => setDrawer(false));
  $('#search').addEventListener('input', (e) => { state.query = e.target.value; renderList(); });
  $('#btn-sync').addEventListener('click', () => {
    if (!state.settings.clientId) { renderSettings(); $('#dlg-settings').showModal(); }
    else if (drive.isConnected()) syncNow();
    else connectDrive();
  });

  $('#opt-sound').addEventListener('change', async (e) => { state.settings.sound = e.target.checked; await saveSettings(); renderTop(); });
  $('#opt-typewriter').addEventListener('change', async (e) => { state.settings.typewriter = e.target.checked; await saveSettings(); });
  $('#opt-client').addEventListener('change', async (e) => {
    state.settings.clientId = e.target.value.trim();
    await saveSettings();
    if (state.settings.clientId) drive.loadGoogle().catch(() => {});
  });
  $('#btn-connect').addEventListener('click', () => {
    state.settings.clientId = $('#opt-client').value.trim();
    connectDrive();
  });
  $('#btn-sync-now').addEventListener('click', () => (drive.isConnected() ? syncNow() : connectDrive()));
  $('#btn-disconnect').addEventListener('click', async () => {
    drive.disconnect();
    state.settings.driveLinked = false;
    await saveSettings();
    refreshSyncLabel();
  });
  $('#btn-backup').addEventListener('click', () => {
    download(`maquina-de-roteiro-backup-${new Date().toISOString().slice(0, 10)}.json`,
      JSON.stringify({ app: 'maquina-de-roteiro', exportedAt: Date.now(), scripts: [...state.scripts.values()] }, null, 2),
      'application/json');
  });
  $('#file-import').addEventListener('change', (e) => {
    const f = e.target.files[0];
    if (f) importFile(f);
    e.target.value = '';
  });
  document.querySelectorAll('[data-export]').forEach((b) => b.addEventListener('click', () => handleExport(b.dataset.export)));

  document.addEventListener('keydown', (e) => {
    const mod = e.ctrlKey || e.metaKey;
    if (mod && e.key.toLowerCase() === 's') { e.preventDefault(); flushSaves().then(() => { toast('Salvo.'); syncNow(); }); }
    if (mod && e.altKey && e.key.toLowerCase() === 'n') { e.preventDefault(); $('#dlg-new').showModal(); }
    if (e.key === 'Escape' && $('#app').classList.contains('focus')) $('#app').classList.remove('focus');
  });

  window.addEventListener('online', () => { refreshSyncLabel(); syncNow(); });
  window.addEventListener('offline', refreshSyncLabel);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') flushSaves();
    else syncNow();
  });
  window.addEventListener('pagehide', () => { flushSaves(); });
  setInterval(syncNow, 2 * 60 * 1000);
}

async function init() {
  bind();
  renderTemplates();
  try {
    const saved = await db.getMeta('settings');
    if (saved) Object.assign(state.settings, saved);
    for (const s of await db.allScripts()) state.scripts.set(s.id, s);
    const last = await db.getMeta('lastOpen');
    const ls = state.scripts.get(last);
    if (ls && !ls.deleted) state.currentId = last;
  } catch (e) {
    toast('Este navegador não deixou salvar localmente. Exporte seus roteiros com frequência.');
  }
  applyTheme();
  renderSidebar();
  renderEditor();
  refreshSyncLabel();
  if (state.settings.clientId) drive.loadGoogle().catch(() => {});

  if ('serviceWorker' in navigator && location.protocol !== 'file:') {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }
}

init();
