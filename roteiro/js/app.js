import { state, app, $, h, fill, field, toast, current, live, scripts, touch, popMenu, ask, pickFiles, fmtDate, move, uid, autosize, isoDate } from './core.js';
import { TEMPLATES, STATUSES, TAB_TYPES, TAB_PRESETS, PLATFORMS, OBJECTIVES, CAMPAIGN_STATUSES, buildScript, makeTab, migrate } from './model.js';
import { scriptToMd, mdToScript, attachmentsIn } from './markdown.js';
import { img, saveImage, putDownloaded } from './files.js';
import { pageEditor } from './editor.js';
import { roteiroView, narrationText } from './views/roteiro.js';
import { moodboardView } from './views/moodboard.js';
import { referenciasView } from './views/referencias.js';
import { tabelaView } from './views/tabela.js';
import { libraryView } from './views/library.js';
import { publicacoesView } from './views/publicacoes.js';
import { plannerView, campaignPanel, newCampaign, allPosts } from './views/planner.js';
import { exportMd, exportTxt, exportZip, importFiles, printScript, fileName } from './export.js';
import * as db from './db.js';
import * as drive from './drive.js';

const THEMES = [
  { id: 'envelhecido', name: 'Papel envelhecido', desc: 'Amarelado e escuro, como folha guardada numa gaveta.' },
  { id: 'noturno', name: 'Papel carbono', desc: 'Folha escura, tinta clara. Para escrever de madrugada.' },
  { id: 'pergaminho', name: 'Pergaminho claro', desc: 'Mais claro, para ambientes com muita luz.' },
];

// ---------- gravação local ----------

const saveTimers = new Map();
app.persist = (s, { list = true } = {}) => {
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
    app.scheduleSync();
  }, 400));
  if (list) renderSidebarSoon();
};

async function flushSaves() {
  for (const [id, timer] of saveTimers) {
    clearTimeout(timer);
    saveTimers.delete(id);
    const s = state.scripts.get(id);
    if (s) await db.putScript(s);
  }
}

const saveSettings = () => db.setMeta('settings', state.settings);
app.saveUi = () => db.setMeta('ui', { library: state.library }).catch(() => {});

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
app.typewriterScroll = (el) => {
  if (!state.settings.typewriter || el.selectionStart !== el.value.length) return;
  const desk = $('#desk');
  const delta = el.getBoundingClientRect().bottom - desk.clientHeight * 0.55;
  if (delta > 0) desk.scrollBy({ top: delta, behavior: 'smooth' });
};

// ---------- filtros e barra lateral ----------

function inFolder(s, path) {
  return s.folder === path || (s.folder || '').startsWith(path + '/');
}

const searchCache = new WeakMap();
function searchText(s) {
  const c = searchCache.get(s);
  if (c && c.at === s.updatedAt) return c.text;
  const text = [s.title, s.folder, s.tags.join(' '), scriptToMd(s)].join(' ').toLowerCase();
  searchCache.set(s, { at: s.updatedAt, text });
  return text;
}

function filtered() {
  const q = state.query.trim().toLowerCase();
  const f = state.filter;
  return live()
    .filter((s) => (f.type === 'trash' ? s.deleted : !s.deleted && s.kind !== 'campanha'))
    .filter((s) => {
      if (f.type === 'pinned') return s.pinned;
      if (f.type === 'folder') return inFolder(s, f.value);
      if (f.type === 'tag') return s.tags.includes(f.value);
      if (f.type === 'status') return s.status === f.value;
      return true;
    })
    .filter((s) => !q || searchText(s).includes(q));
}

function filterTitle() {
  const f = state.filter;
  if (state.query.trim()) return `Busca: "${state.query.trim()}"`;
  return { all: 'Todos os roteiros', pinned: 'Fixados', trash: 'Lixeira', folder: f.value, tag: '#' + f.value, status: f.value }[f.type];
}

function folderTree(paths) {
  const root = {};
  for (const p of paths) {
    let node = root;
    p.split('/').map((x) => x.trim()).filter(Boolean).forEach((part) => { node = node[part] ||= {}; });
  }
  const out = [];
  const walk = (node, prefix, depth) => {
    for (const name of Object.keys(node).sort((a, b) => a.localeCompare(b, 'pt-BR'))) {
      const path = prefix ? prefix + '/' + name : name;
      out.push({ name, path, depth });
      walk(node[name], path, depth + 1);
    }
  };
  walk(root, '', 0);
  return out;
}

function setFilter(filter) {
  state.filter = filter;
  app.showLibrary();
}

function renderNav() {
  const active = scripts();
  const folders = folderTree([...new Set(active.map((s) => s.folder).filter(Boolean))]);
  const tags = [...new Set(active.flatMap((s) => s.tags))].sort((a, b) => a.localeCompare(b, 'pt-BR'));
  const f = state.filter;
  const isOn = (type, value) => state.view === 'library' && f.type === type && f.value === value;
  const item = (label, filter, count, depth = 0) => h('button', {
    type: 'button',
    class: 'nav-item' + (isOn(filter.type, filter.value) ? ' active' : ''),
    style: depth ? { paddingLeft: 8 + depth * 14 + 'px' } : null,
    onClick: () => setFilter(filter),
  }, h('span', null, label), count != null ? h('span', { class: 'count' }, count) : null);

  const plan = (label, mode, count) => h('button', {
    type: 'button',
    class: 'nav-item' + (state.view === 'planner' && state.planner.mode === mode ? ' active' : ''),
    onClick: () => app.showPlanner(mode),
  }, h('span', null, label), count != null ? h('span', { class: 'count' }, count) : null);
  const today = isoDate();
  const upcoming = allPosts().filter((x) => x.p.date >= today && x.p.status !== 'Publicado').length;

  fill($('#nav'),
    h('div', { class: 'nav-label' }, 'Planejamento'),
    plan('◷ Calendário', 'calendario'),
    plan('≡ Ordem de publicação', 'fila', upcoming),
    plan('◎ Campanhas', 'campanhas', live().filter((s) => !s.deleted && s.kind === 'campanha').length),
    h('div', { class: 'nav-label' }, 'Roteiros'),
    item('Todos os roteiros', { type: 'all' }, active.length),
    item('★ Fixados', { type: 'pinned' }, active.filter((s) => s.pinned).length),
    h('div', { class: 'nav-label' }, 'Status'),
    h('div', { class: 'nav-chips' }, STATUSES.map((st) => {
      const n = active.filter((s) => s.status === st).length;
      return n ? h('button', { type: 'button', class: 'tag' + (isOn('status', st) ? ' active' : ''), onClick: () => setFilter({ type: 'status', value: st }) }, `${st} ${n}`) : null;
    })),
    h('div', { class: 'nav-label nav-label-row' }, 'Pastas',
      h('button', { type: 'button', class: 'nav-add', title: 'Nova pasta', 'aria-label': 'Nova pasta', onClick: newFolder }, '+')),
    folders.length
      ? folders.map((x) => item((x.depth ? '' : '▸ ') + x.name, { type: 'folder', value: x.path }, active.filter((s) => inFolder(s, x.path)).length, x.depth))
      : h('div', { class: 'nav-hint' }, 'Use "Canal/Série" para criar subpastas.'),
    tags.length ? h('div', { class: 'nav-label' }, 'Tags') : null,
    tags.length ? h('div', { class: 'nav-chips' }, tags.map((t) => h('button', { type: 'button', class: 'tag' + (isOn('tag', t) ? ' active' : ''), onClick: () => setFilter({ type: 'tag', value: t }) }, '#' + t))) : null,
    item('Lixeira', { type: 'trash' }, live().filter((s) => s.deleted).length),
  );
}

async function newFolder() {
  const r = await ask('Nova pasta', [{ name: 'name', label: 'Nome (use / para subpasta)', placeholder: 'Canal/Série 1' }], { ok: 'Criar' });
  const name = r?.name?.replace(/^\/+|\/+$/g, '');
  if (!name) return;
  // Uma pasta existe enquanto tiver roteiros: já cria o primeiro dentro dela.
  await app.createScript('branco', { folder: name, open: false });
  setFilter({ type: 'folder', value: name });
}

function renderList() {
  const items = filtered().sort((a, b) => (b.pinned - a.pinned) || (b.updatedAt - a.updatedAt)).slice(0, 60);
  if (!items.length) return fill($('#list'), h('p', { class: 'list-empty' }, state.query ? 'Nada encontrado.' : 'Nenhum roteiro aqui.'));
  fill($('#list'), items.map((s) => h('button', {
    type: 'button',
    class: 'card' + (state.view === 'script' && s.id === state.currentId ? ' active' : ''),
    onClick: () => app.openScript(s.id),
  },
  h('div', { class: 'card-title' }, s.pinned ? '★ ' : '', s.title || 'Sem título'),
  h('div', { class: 'card-meta' }, h('span', { class: 'stamp-mini' }, s.status), h('span', null, fmtDate(s.updatedAt)), s.folder ? h('span', null, '▸ ' + s.folder) : null))));
}

app.renderSidebar = () => {
  renderNav();
  renderList();
};

let sidebarTimer;
function renderSidebarSoon() {
  clearTimeout(sidebarTimer);
  sidebarTimer = setTimeout(app.renderSidebar, 300);
}

const setDrawer = (open) => $('#app').classList.toggle('drawer-open', open);

// ---------- topo ----------

app.renderTop = () => {
  const s = current();
  const crumbHome = h('button', { type: 'button', class: 'crumb-link', onClick: () => app.showLibrary() }, 'Arquivo');
  if (state.view === 'planner') {
    fill($('#crumb'), h('span', null, 'Planejamento'));
    fill($('#top-actions'));
    return;
  }
  if (s?.kind === 'campanha' && state.view === 'script') {
    fill($('#crumb'), h('button', { type: 'button', class: 'crumb-link', onClick: () => app.showPlanner('campanhas') }, 'Campanhas'), h('span', null, ' / ' + (s.title || 'Sem título')));
    fill($('#top-actions'),
      h('button', { type: 'button', class: 'btn btn-ghost', onClick: openExport }, 'Exportar'),
      h('button', { type: 'button', class: 'btn btn-ghost danger', title: 'Mover para a lixeira', 'aria-label': 'Mover para a lixeira', onClick: () => trash(s) }, '✕'));
    return;
  }
  if (state.view !== 'script' || !s) {
    fill($('#crumb'), crumbHome, h('span', null, ' / ' + filterTitle()));
    fill($('#top-actions'), h('button', { type: 'button', class: 'btn btn-ghost', onClick: () => $('#dlg-new').showModal() }, '+ Novo'));
    return;
  }
  fill($('#crumb'),
    crumbHome,
    s.folder ? h('button', { type: 'button', class: 'crumb-link', onClick: () => setFilter({ type: 'folder', value: s.folder }) }, ' / ' + s.folder) : null,
    h('span', null, ' / ' + (s.title || 'Sem título')));
  const btn = (label, title, onClick, cls = '') => h('button', { type: 'button', class: 'btn btn-ghost ' + cls, title, 'aria-label': title, onClick }, label);
  fill($('#top-actions'),
    btn(s.pinned ? '★' : '☆', s.pinned ? 'Desafixar' : 'Fixar', () => { s.pinned = !s.pinned; touch(s); app.renderTop(); }),
    btn('Foco', 'Modo foco: esconde o arquivo', () => $('#app').classList.toggle('focus'), 'hide-sm'),
    btn(state.settings.sound ? 'Som ●' : 'Som ○', 'Som de máquina de escrever', async () => {
      state.settings.sound = !state.settings.sound;
      await saveSettings();
      app.renderTop();
      clack('return');
    }, 'hide-sm'),
    btn('Exportar', 'Exportar ou imprimir', openExport),
    btn('⋯', 'Mais opções', (e) => popMenu(e.currentTarget, [
      { label: s.cover ? 'Trocar capa' : 'Adicionar capa', onClick: () => pickCover(s) },
      s.cover ? { label: 'Remover capa', onClick: () => { s.cover = ''; touch(s); app.renderEditor(); } } : null,
      { label: 'Duplicar roteiro', onClick: () => duplicate(s) },
      { label: 'Modo foco', onClick: () => $('#app').classList.toggle('focus') },
      { label: 'Som de máquina ' + (state.settings.sound ? '(ligado)' : '(desligado)'), onClick: async () => { state.settings.sound = !state.settings.sound; await saveSettings(); app.renderTop(); } },
      '-',
      { label: 'Mover para a lixeira', danger: true, onClick: () => trash(s) },
    ].filter(Boolean))),
  );
};

// ---------- página do roteiro ----------

let currentPage = null;

function renderProps(s) {
  const folders = [...new Set(live().map((x) => x.folder).filter(Boolean))];
  const tpl = TEMPLATES.find((t) => t.id === s.template);
  const statusSel = h('select', { class: 'prop-val', onChange: () => { s.status = statusSel.value; touch(s); } }, STATUSES.map((st) => h('option', { value: st }, st)));
  statusSel.value = s.status;
  return h('div', { class: 'props' },
    h('label', { class: 'prop' }, h('span', { class: 'prop-key' }, 'Pasta'),
      field('input', s.folder, (v) => { s.folder = v.trim().replace(/^\/+|\/+$/g, ''); touch(s); app.renderTop(); }, { list: 'folders-list', placeholder: 'Sem pasta', class: 'prop-val' }),
      h('datalist', { id: 'folders-list' }, folders.map((f) => h('option', { value: f })))),
    h('label', { class: 'prop' }, h('span', { class: 'prop-key' }, 'Tags'),
      field('input', s.tags.join(', '), (v) => { s.tags = [...new Set(v.split(',').map((t) => t.trim().replace(/^#/, '')).filter(Boolean))]; touch(s); },
        { placeholder: 'separe, por, vírgula', class: 'prop-val' })),
    h('label', { class: 'prop' }, h('span', { class: 'prop-key' }, 'Status'), statusSel),
    h('div', { class: 'prop prop-static' }, h('span', { class: 'prop-key' }, 'Estrutura'),
      h('span', { class: 'prop-val' }, tpl ? tpl.name : '—', ' · criado ', new Date(s.createdAt).toLocaleDateString('pt-BR'))));
}

async function pickCover(s) {
  const [f] = await pickFiles({ multiple: false });
  if (!f) return;
  s.cover = await saveImage(f);
  touch(s);
  app.renderEditor();
}

function activeTab(s) {
  return s.tabs.find((t) => t.id === s.activeTab) || s.tabs[0];
}

function selectTab(s, t) {
  s.activeTab = t.id;
  db.putScript(s).catch(() => {});
  app.renderEditor();
}

function tabMenu(s, t, anchor) {
  const i = s.tabs.indexOf(t);
  popMenu(anchor, [
    { label: 'Renomear', onClick: async () => { const r = await ask('Renomear aba', [{ name: 'name', label: 'Nome', value: t.name }]); if (r?.name) { t.name = r.name.replace(/\n/g, ' '); touch(s); app.renderEditor(); } } },
    { label: 'Mover para a esquerda', onClick: () => { if (move(s.tabs, i, -1)) { touch(s); app.renderEditor(); } } },
    { label: 'Mover para a direita', onClick: () => { if (move(s.tabs, i, 1)) { touch(s); app.renderEditor(); } } },
    { label: 'Duplicar aba', onClick: () => { const c = { ...structuredClone(t), id: uid(), name: t.name + ' (cópia)' }; s.tabs.splice(i + 1, 0, c); s.activeTab = c.id; touch(s); app.renderEditor(); } },
    '-',
    { label: 'Apagar aba', danger: true, onClick: () => {
      if (s.tabs.length === 1) return toast('O roteiro precisa de pelo menos uma aba.');
      if (!confirm(`Apagar a aba "${t.name}" e todo o conteúdo dela?`)) return;
      s.tabs.splice(i, 1);
      s.activeTab = s.tabs[Math.max(0, i - 1)].id;
      touch(s);
      app.renderEditor();
    } },
  ]);
}

function addTabMenu(s, anchor) {
  popMenu(anchor, Object.keys(TAB_TYPES).flatMap((type) => [
    { heading: TAB_TYPES[type].icon + ' ' + TAB_TYPES[type].label },
    ...TAB_PRESETS.filter((p) => p.type === type).map((p) => ({
      label: p.name,
      onClick: () => {
        const t = makeTab(p.name);
        s.tabs.push(t);
        s.activeTab = t.id;
        touch(s);
        app.renderEditor();
      },
    })),
  ]));
}

function renderTabs(s) {
  const act = activeTab(s);
  return h('div', { class: 'tabs', role: 'tablist' },
    s.tabs.map((t) => {
      const on = t === act;
      return h('div', { class: 'tab' + (on ? ' active' : ''), role: 'tab', 'aria-selected': on ? 'true' : 'false' },
        h('button', {
          type: 'button', class: 'tab-btn',
          onClick: () => { if (!on) selectTab(s, t); },
          onDblclick: (e) => tabMenu(s, t, e.currentTarget),
        }, h('span', { class: 'tab-icon' }, TAB_TYPES[t.type]?.icon || '¶'), t.name),
        on ? h('button', { type: 'button', class: 'tab-more', title: 'Opções da aba', 'aria-label': 'Opções da aba', onClick: (e) => tabMenu(s, t, e.currentTarget) }, '▾') : null);
    }),
    h('button', { type: 'button', class: 'tab tab-add', title: 'Nova aba', 'aria-label': 'Nova aba', onClick: (e) => addTabMenu(s, e.currentTarget) }, '+ aba'));
}

function textoView(s, tab) {
  const count = h('span', { class: 'muted small' });
  const upd = () => {
    const words = (tab.content.match(/[\p{L}\p{N}]+/gu) || []).length;
    count.textContent = `${words} palavras · ≈ ${Math.max(words ? 1 : 0, Math.round(words / 150))} min de leitura`;
  };
  upd();
  const ta = field('textarea', tab.content, (v) => { tab.content = v; touch(s); upd(); app.typewriterScroll(ta); }, {
    class: 'typewriter',
    placeholder: 'Escreva aqui o roteiro corrido, do começo ao fim, sem tabela.\n\nBom para o teleprompter, para ler em voz alta e para cronometrar.',
  });
  const rot = s.tabs.find((t) => t.type === 'roteiro');
  return h('div', null,
    h('div', { class: 'view-bar' },
      rot ? h('button', {
        type: 'button', class: 'btn',
        onClick: () => {
          if (tab.content.trim() && !confirm('Substituir este texto pela narração da aba Roteiro?')) return;
          tab.content = narrationText(rot);
          touch(s);
          app.renderEditor();
        },
      }, 'Montar a partir do roteiro') : h('span'),
      count),
    ta);
}

function tabContent(s, t) {
  switch (t.type) {
    case 'roteiro': return roteiroView(s, t);
    case 'moodboard': return moodboardView(s, t);
    case 'referencias': return referenciasView(s, t);
    case 'tabela': return tabelaView(s, t);
    case 'texto': return textoView(s, t);
    case 'publicacoes': return publicacoesView(s, t);
    default: return (currentPage = pageEditor(s, t));
  }
}

app.renderEditor = () => {
  currentPage?._destroy?.();
  currentPage = null;
  app.renderTop();
  const s = current();
  if (state.view !== 'script' || !s) return;
  const t = activeTab(s);
  const isCamp = s.kind === 'campanha';
  const oldTitle = s.title;
  const title = field('textarea', s.title, (v) => { s.title = v.replace(/\n/g, ' '); touch(s); app.renderTop(); }, { class: 'doc-title', placeholder: isCamp ? 'Nome da campanha' : 'Sem título', 'aria-label': 'Título' });
  title.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); title.blur(); } });
  // Renomear a campanha atualiza as publicações ligadas a ela.
  if (isCamp) title.addEventListener('change', () => renameCampaign(oldTitle, s.title));
  fill($('#editor'),
    s.deleted ? h('div', { class: 'banner' },
      'Este roteiro está na lixeira.',
      h('button', { type: 'button', class: 'btn', onClick: () => restore(s) }, 'Restaurar'),
      h('button', { type: 'button', class: 'btn danger', onClick: () => purge(s) }, 'Apagar para sempre')) : null,
    h('article', { class: 'paper sheet' + (s.cover ? ' has-cover' : '') },
      s.cover ? h('div', { class: 'cover-img' }, img(s.cover, { alt: 'Capa' }),
        h('div', { class: 'cover-tools' },
          h('button', { type: 'button', class: 'btn btn-mini', onClick: () => pickCover(s) }, 'Trocar capa'),
          h('button', { type: 'button', class: 'btn btn-mini', onClick: () => { s.cover = ''; touch(s); app.renderEditor(); } }, 'Remover'))) : null,
      h('div', { class: 'doc-head' },
        h('div', { class: 'doc-kicker' }, isCamp ? 'CAMPANHA' : 'ROTEIRO',
          s.cover ? null : h('button', { type: 'button', class: 'add-cover', onClick: () => pickCover(s) }, '+ capa')),
        title,
        isCamp ? campaignProps(s) : renderProps(s)),
      isCamp ? campaignPanel(s) : null,
      renderTabs(s),
      h('div', { class: 'tab-body', 'data-type': t.type }, tabContent(s, t))));
};

function renameCampaign(oldTitle, newTitle) {
  if (!oldTitle || oldTitle === newTitle) return;
  for (const { p, s } of allPosts()) {
    if (p.campaign === oldTitle) { p.campaign = newTitle; touch(s); }
  }
}

function campaignProps(s) {
  const c = s.campaign;
  const sel = (options, value, onChange) => {
    const el = h('select', { class: 'prop-val', onChange: () => onChange(el.value) }, options.map((o) => h('option', { value: o }, o)));
    el.value = value;
    return el;
  };
  const save = () => touch(s, { list: false });
  return h('div', { class: 'props' },
    h('label', { class: 'prop' }, h('span', { class: 'prop-key' }, 'Objetivo'), sel(OBJECTIVES.includes(c.objetivo) ? OBJECTIVES : [c.objetivo, ...OBJECTIVES], c.objetivo, (v) => { c.objetivo = v; save(); })),
    h('label', { class: 'prop' }, h('span', { class: 'prop-key' }, 'Status'), sel(CAMPAIGN_STATUSES, s.status, (v) => { s.status = v; save(); })),
    h('label', { class: 'prop' }, h('span', { class: 'prop-key' }, 'Início'), field('input', c.inicio, (v) => { c.inicio = v; save(); }, { type: 'date', class: 'prop-val' })),
    h('label', { class: 'prop' }, h('span', { class: 'prop-key' }, 'Fim'), field('input', c.fim, (v) => { c.fim = v; save(); }, { type: 'date', class: 'prop-val' })),
    h('div', { class: 'prop prop-wide' }, h('span', { class: 'prop-key' }, 'Plataformas'),
      h('div', { class: 'pf-toggles' }, PLATFORMS.filter((p) => p.id !== 'Outro').map((p) => {
        const on = c.plataformas.includes(p.id);
        return h('button', {
          type: 'button', class: 'pf-toggle' + (on ? ' on' : ''), 'aria-pressed': on ? 'true' : 'false', style: { '--pf': p.color },
          onClick: () => { c.plataformas = on ? c.plataformas.filter((x) => x !== p.id) : [...c.plataformas, p.id]; save(); app.renderEditor(); },
        }, p.id);
      }))),
    h('label', { class: 'prop' }, h('span', { class: 'prop-key' }, 'Cor'),
      (() => { const inp = h('input', { type: 'color', value: c.cor || '#8a2e1d', class: 'prop-color' }); inp.addEventListener('input', () => { c.cor = inp.value; save(); }); return inp; })()));
}

// ---------- navegação ----------

app.showPlanner = (mode, date) => {
  currentPage?._destroy?.();
  currentPage = null;
  if (mode) state.planner.mode = mode;
  if (date) { state.planner.month = date.slice(0, 7); state.planner.day = date; }
  state.view = 'planner';
  app.renderSidebar();
  app.renderTop();
  fill($('#editor'), plannerView());
  setDrawer(false);
};

app.showLibrary = () => {
  currentPage?._destroy?.();
  currentPage = null;
  state.view = 'library';
  app.renderSidebar();
  app.renderTop();
  fill($('#editor'), libraryView(filtered(), filterTitle()));
  setDrawer(false);
};

app.openScript = (id) => {
  const s = state.scripts.get(id);
  if (!s) return;
  state.currentId = id;
  state.view = 'script';
  state.lastField = null;
  app.renderSidebar();
  app.renderEditor();
  $('#desk').scrollTop = 0;
  setDrawer(false);
  db.setMeta('lastOpen', id).catch(() => {});
};

app.createScript = async (templateId, { title = '', folder, open = true } = {}) => {
  const s = buildScript(templateId);
  s.title = title;
  s.folder = folder ?? (state.filter.type === 'folder' ? state.filter.value : '');
  s.activeTab = s.tabs[0].id;
  state.scripts.set(s.id, s);
  await db.putScript(s);
  if (state.filter.type === 'trash') state.filter = { type: 'all' };
  if (open) {
    app.openScript(s.id);
    if (!title) requestAnimationFrame(() => $('.doc-title')?.focus());
  }
  app.scheduleSync();
  return s;
};

function duplicate(s) {
  const copy = structuredClone(s);
  delete copy._sync;
  copy.id = uid();
  copy.title = (s.title || 'Sem título') + ' (cópia)';
  copy.createdAt = copy.updatedAt = Date.now();
  copy.pinned = false;
  state.scripts.set(copy.id, copy);
  touch(copy);
  app.openScript(copy.id);
  toast('Cópia criada.');
}

function trash(s) {
  s.deleted = true;
  touch(s);
  toast('Movido para a lixeira.');
  app.showLibrary();
}

function restore(s) {
  s.deleted = false;
  touch(s);
  app.renderSidebar();
  app.renderEditor();
}

async function purge(s) {
  if (!confirm('Apagar este roteiro para sempre? Não dá para desfazer.')) return;
  if (s._sync?.fileId) {
    // Fica um registro vazio até a próxima sincronização apagar o arquivo no Drive.
    const tomb = { id: s.id, purged: true, deleted: true, updatedAt: Date.now(), title: '', tags: [], tabs: [], _sync: s._sync };
    state.scripts.set(s.id, tomb);
    await db.putScript(tomb);
    app.scheduleSync();
  } else {
    state.scripts.delete(s.id);
    await db.deleteScript(s.id);
  }
  app.showLibrary();
}

// ---------- exportar / importar ----------

function openExport() {
  const s = current();
  if (!s) return;
  const checks = s.tabs.map((t) => ({ t, c: h('input', { type: 'checkbox', checked: true }) }));
  fill($('#export-body'),
    h('div', { class: 'export-list' },
      h('button', { type: 'button', class: 'btn', onClick: () => exportMd(s) }, 'Markdown (.md) — abre no Obsidian, Notion, VS Code…'),
      h('button', { type: 'button', class: 'btn', onClick: () => exportZip([s], fileName(s).replace(/\.md$/, '') + '.zip') }, 'Pacote para o Obsidian (.zip com .md + imagens)'),
      h('button', { type: 'button', class: 'btn', onClick: () => exportTxt(s) }, 'Texto puro (.txt)')),
    h('fieldset', null,
      h('legend', null, 'PDF'),
      h('p', { class: 'muted small' }, 'Escolha as abas que entram no PDF:'),
      h('div', { class: 'export-tabs' }, checks.map(({ t, c }) => h('label', { class: 'check' }, c, `${TAB_TYPES[t.type]?.icon || ''} ${t.name}`))),
      h('button', {
        type: 'button', class: 'btn btn-stamp',
        onClick: () => { $('#dlg-export').close(); printScript(s, checks.filter((x) => x.c.checked).map((x) => x.t.id)); },
      }, 'Imprimir / salvar PDF')));
  $('#dlg-export').showModal();
}

async function importPicked(files) {
  if (!files.length) return;
  try {
    const items = await importFiles(files);
    if (!items.length) return toast('Não encontrei roteiros nesses arquivos.');
    let n = 0;
    for (const s of items) {
      const local = state.scripts.get(s.id);
      if (local && local.updatedAt >= s.updatedAt) continue;
      if (local?._sync) s._sync = local._sync;
      state.scripts.set(s.id, s);
      await db.putScript(s);
      n++;
    }
    app.renderSidebar();
    if (state.view === 'library') app.showLibrary();
    toast(n ? `${n} roteiro(s) importado(s).` : 'Os roteiros desses arquivos já estavam atualizados aqui.');
    app.scheduleSync();
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
    openSettings();
    $('#opt-client').focus();
    return toast('Cole o ID do cliente OAuth para conectar.');
  }
  try {
    await drive.loadGoogle();
    await drive.connect(id);
    state.settings.driveLinked = true;
    await saveSettings();
    await syncNow();
  } catch (e) {
    setSyncLabel('Erro: ' + e.message, 'err');
  }
}

const driveIO = {
  toMd: scriptToMd,
  fromMd: (text, opts) => mdToScript(text, opts),
  fileName,
  localFiles: async () => (await db.allFiles()).map((f) => ({ path: f.path, blob: f.blob })),
  needPaths: (scripts) => [...new Set(scripts.filter((s) => !s.purged).flatMap(attachmentsIn))],
  saveBlob: putDownloaded,
};

async function syncNow() {
  if (state.syncing || !drive.isConnected() || !navigator.onLine) return refreshSyncLabel();
  state.syncing = true;
  setSyncLabel('Sincronizando…', 'busy');
  try {
    await flushSaves();
    const { save, remove } = await drive.sync([...state.scripts.values()], driveIO);
    let currentChanged = false;
    for (const r of save) {
      const local = state.scripts.get(r.id);
      if (local && local !== r) {
        // Editado aqui durante a sincronização: fica a versão local, que sobe na próxima rodada.
        if (local.updatedAt > (local._sync?.at || 0) && local.updatedAt > r.updatedAt) continue;
        const openTab = local.tabs?.find((x) => x.id === local.activeTab)?.name;
        r.activeTab = r.tabs.find((x) => x.name === openTab)?.id;
        if (r.id === state.currentId) currentChanged = true;
      }
      state.scripts.set(r.id, r);
      await db.putScript(r);
    }
    for (const id of remove) {
      state.scripts.delete(id);
      await db.deleteScript(id);
      if (id === state.currentId) { state.view = 'library'; currentChanged = true; }
    }
    state.settings.lastSync = Date.now();
    await saveSettings();
    app.renderSidebar();
    const typing = document.activeElement?.closest?.('#editor');
    if (currentChanged && !typing) (state.view === 'script' ? app.renderEditor : app.showLibrary)();
    refreshSyncLabel();
  } catch (e) {
    setSyncLabel('Erro ao sincronizar: ' + e.message, 'err');
  } finally {
    state.syncing = false;
  }
}

let syncTimer;
app.scheduleSync = () => {
  if (!drive.isConnected()) return refreshSyncLabel();
  clearTimeout(syncTimer);
  syncTimer = setTimeout(syncNow, 5000);
};

// ---------- ajustes ----------

function applyTheme() {
  document.documentElement.dataset.theme = state.settings.theme;
}

function openSettings() {
  const st = state.settings;
  fill($('#themes'), THEMES.map((t) => {
    const r = h('input', { type: 'radio', name: 'theme', value: t.id, checked: st.theme === t.id });
    r.addEventListener('change', async () => { st.theme = t.id; applyTheme(); await saveSettings(); });
    return h('label', { class: 'theme-opt' }, r, h('span', { class: 'swatch', 'data-swatch': t.id }),
      h('span', null, h('b', null, t.name), h('br'), h('span', { class: 'muted small' }, t.desc)));
  }));
  $('#opt-sound').checked = st.sound;
  $('#opt-typewriter').checked = st.typewriter;
  $('#opt-linkpreview').checked = st.linkPreview;
  $('#opt-client').value = st.clientId;
  refreshSyncLabel();
  if (!$('#dlg-settings').open) $('#dlg-settings').showModal();
}

function renderTemplates() {
  fill($('#templates'), TEMPLATES.map((t) => h('button', {
    type: 'button', class: 'tpl',
    onClick: () => { $('#dlg-new').close(); app.createScript(t.id); },
  },
  h('div', { class: 'tpl-name' }, t.name),
  h('div', { class: 'tpl-desc' }, t.desc),
  h('div', { class: 'tpl-secs' }, t.sections.map((s) => s.name).join(' → ')))));
}

// ---------- início ----------

function bind() {
  $('#btn-new').addEventListener('click', () => $('#dlg-new').showModal());
  $('#btn-settings').addEventListener('click', openSettings);
  $('#btn-menu').addEventListener('click', () => setDrawer(!$('#app').classList.contains('drawer-open')));
  $('#scrim').addEventListener('click', () => setDrawer(false));
  $('#search').addEventListener('input', (e) => {
    state.query = e.target.value;
    if (state.view === 'library') app.showLibrary(); else renderList();
  });
  $('#search').addEventListener('keydown', (e) => { if (e.key === 'Enter') app.showLibrary(); });
  $('#btn-sync').addEventListener('click', () => {
    if (!state.settings.clientId) openSettings();
    else if (drive.isConnected()) syncNow();
    else connectDrive();
  });

  $('#opt-sound').addEventListener('change', async (e) => { state.settings.sound = e.target.checked; await saveSettings(); app.renderTop(); });
  $('#opt-typewriter').addEventListener('change', async (e) => { state.settings.typewriter = e.target.checked; await saveSettings(); });
  $('#opt-linkpreview').addEventListener('change', async (e) => { state.settings.linkPreview = e.target.checked; await saveSettings(); });
  $('#opt-client').addEventListener('change', async (e) => {
    state.settings.clientId = e.target.value.trim();
    await saveSettings();
    if (state.settings.clientId) drive.loadGoogle().catch(() => {});
  });
  $('#btn-connect').addEventListener('click', () => { state.settings.clientId = $('#opt-client').value.trim(); connectDrive(); });
  $('#btn-sync-now').addEventListener('click', () => (drive.isConnected() ? syncNow() : connectDrive()));
  $('#btn-disconnect').addEventListener('click', async () => {
    drive.disconnect();
    state.settings.driveLinked = false;
    await saveSettings();
    refreshSyncLabel();
  });
  $('#btn-backup').addEventListener('click', () => exportZip(live().filter((s) => !s.deleted), `maquina-de-roteiro-${new Date().toISOString().slice(0, 10)}.zip`));
  $('#file-import').addEventListener('change', (e) => { importPicked([...e.target.files]); e.target.value = ''; });

  // Colar imagens direto no moodboard.
  document.addEventListener('paste', async (e) => {
    const s = current();
    if (state.view !== 'script' || !s || e.target.closest?.('input, textarea')) return;
    const t = activeTab(s);
    const files = [...(e.clipboardData?.files || [])].filter((f) => f.type.startsWith('image/'));
    if (t.type !== 'moodboard' || !files.length) return;
    e.preventDefault();
    for (const f of files) t.items.push({ id: uid(), kind: 'image', src: await saveImage(f), caption: '' });
    touch(s);
    app.renderEditor();
  });

  document.addEventListener('keydown', (e) => {
    const mod = e.ctrlKey || e.metaKey;
    if (mod && e.key.toLowerCase() === 's') { e.preventDefault(); flushSaves().then(() => { toast('Salvo.'); syncNow(); }); }
    if (mod && e.altKey && e.key.toLowerCase() === 'n') { e.preventDefault(); $('#dlg-new').showModal(); }
    if (mod && e.key.toLowerCase() === 'p' && state.view === 'script') { e.preventDefault(); openExport(); }
    if (e.key === 'Escape' && $('#app').classList.contains('focus')) $('#app').classList.remove('focus');
  });

  window.addEventListener('online', () => { refreshSyncLabel(); syncNow(); });
  window.addEventListener('offline', refreshSyncLabel);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') flushSaves();
    else syncNow();
  });
  window.addEventListener('pagehide', () => { flushSaves(); });
  window.addEventListener('resize', () => document.querySelectorAll('#editor textarea').forEach(autosize));
  setInterval(syncNow, 2 * 60 * 1000);
}

async function init() {
  bind();
  renderTemplates();
  let lastOpen = null;
  try {
    const saved = await db.getMeta('settings');
    if (saved) Object.assign(state.settings, saved);
    const ui = await db.getMeta('ui');
    if (ui?.library) Object.assign(state.library, ui.library);
    for (const raw of await db.allScripts()) {
      const s = migrate(raw);
      if (s !== raw) await db.putScript(s);
      state.scripts.set(s.id, s);
    }
    lastOpen = await db.getMeta('lastOpen');
  } catch (e) {
    toast('Este navegador não deixou salvar localmente. Exporte seus roteiros com frequência.');
  }
  applyTheme();
  // Pede ao navegador para não apagar os dados do app quando faltar espaço.
  navigator.storage?.persist?.().catch(() => {});
  const last = state.scripts.get(lastOpen);
  if (last && !last.deleted && !last.purged) app.openScript(last.id);
  else app.showLibrary();
  refreshSyncLabel();
  if (state.settings.clientId) drive.loadGoogle().catch(() => {});

  if ('serviceWorker' in navigator && location.protocol !== 'file:') {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }
}

init();
