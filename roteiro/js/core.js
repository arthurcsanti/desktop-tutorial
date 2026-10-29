// Estado compartilhado e utilitários de DOM usados por todas as telas.

export const state = {
  scripts: new Map(),
  currentId: null,
  view: 'library', // 'library' | 'script'
  filter: { type: 'all' },
  query: '',
  library: { mode: 'galeria', sort: 'updated' },
  lastField: null,
  syncing: false,
  planner: { mode: 'calendario', month: '', platform: '', day: '' },
  settings: { theme: 'envelhecido', sound: false, typewriter: true, linkPreview: false, clientId: '', driveLinked: false, lastSync: 0 },
};

// Funções de alto nível que o app.js registra (evita importações circulares).
export const app = {
  renderEditor: () => {},
  renderSidebar: () => {},
  renderTop: () => {},
  openScript: () => {},
  showLibrary: () => {},
  showPlanner: () => {},
  createScript: () => {},
  persist: async () => {},
  scheduleSync: () => {},
};

export const $ = (sel, root = document) => root.querySelector(sel);

export function h(tag, props, ...kids) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(props || {})) {
    if (v == null || v === false) continue;
    if (k === 'class') el.className = v;
    else if (k === 'value') el.value = v;
    else if (k === 'checked') el.checked = !!v;
    else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
    else if (k.startsWith('on')) el.addEventListener(k.slice(2).toLowerCase(), v);
    else el.setAttribute(k, v === true ? '' : v);
  }
  return fill(el, ...kids);
}

// Como replaceChildren, mas aceita listas aninhadas e ignora null/false.
export function fill(el, ...kids) {
  el.replaceChildren();
  for (const c of kids.flat(Infinity)) {
    if (c == null || c === false) continue;
    el.append(c.nodeType ? c : document.createTextNode(String(c)));
  }
  return el;
}

export function autosize(el) {
  el.style.height = 'auto';
  el.style.height = el.scrollHeight + 'px';
}

// Campo de texto ligado ao modelo. textarea cresce sozinha conforme o conteúdo.
export function field(tag, value, onChange, attrs = {}) {
  const el = h(tag, attrs);
  el.addEventListener('focus', () => (state.lastField = el));
  el.value = value ?? '';
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

export function button(label, onClick, attrs = {}) {
  return h('button', { type: 'button', class: 'btn btn-ghost', ...attrs, onClick }, label);
}

// Botão que não tira o foco do campo onde se está escrevendo.
export function keepFocus(el) {
  el.addEventListener('mousedown', (e) => e.preventDefault());
  return el;
}

export function toast(msg) {
  const t = $('#toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => t.classList.remove('show'), 3000);
}

export function uid() {
  if (globalThis.crypto?.randomUUID) return crypto.randomUUID();
  return 'id-' + Date.now().toString(36) + Math.random().toString(36).slice(2);
}

export const shortId = () => uid().replace(/-/g, '').slice(0, 12);

export function today() {
  return new Date().toLocaleDateString('pt-BR');
}

export const current = () => state.scripts.get(state.currentId);
export const live = () => [...state.scripts.values()].filter((s) => !s.purged);
// Roteiros (sem campanhas), fora da lixeira.
export const scripts = () => live().filter((s) => !s.deleted && s.kind !== 'campanha');
export const campaigns = () => live().filter((s) => !s.deleted && s.kind === 'campanha');

// Datas no formato AAAA-MM-DD (o mesmo do Obsidian e do campo de data do navegador), no fuso local.
export function isoDate(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
export function parseIso(s) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s || '');
  return m ? new Date(+m[1], +m[2] - 1, +m[3]) : null;
}
export function addDays(iso, n) {
  const d = parseIso(iso) || new Date();
  d.setDate(d.getDate() + n);
  return isoDate(d);
}
export const fmtDay = (iso) => parseIso(iso)?.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit' }) || 'sem data';

// Marca o roteiro como alterado e agenda a gravação.
export function touch(s, { list = true } = {}) {
  // Sempre cresce, mesmo se o relógio de outro aparelho estiver adiantado.
  s.updatedAt = Math.max(Date.now(), (s.updatedAt || 0) + 1);
  app.persist(s, { list });
}

export function move(arr, i, d) {
  const j = i + d;
  if (j < 0 || j >= arr.length) return false;
  [arr[i], arr[j]] = [arr[j], arr[i]];
  return true;
}

// Menu simples ancorado num botão. items: [{label, onClick, danger}] ou '-' para separador.
export function popMenu(anchor, items) {
  closeMenus();
  const menu = h('div', { class: 'popmenu', role: 'menu' },
    items.map((it) => it === '-'
      ? h('hr')
      : it.heading
        ? h('div', { class: 'popmenu-head' }, it.heading)
        : h('button', {
          type: 'button',
          role: 'menuitem',
          class: 'popmenu-item' + (it.danger ? ' danger' : '') + (it.active ? ' active' : ''),
          onMousedown: (e) => e.preventDefault(),
          onClick: () => { closeMenus(); it.onClick(); },
        }, it.label, it.hint ? h('span', { class: 'popmenu-hint' }, it.hint) : null)));
  document.body.append(menu);
  const r = anchor.getBoundingClientRect();
  const mw = menu.offsetWidth;
  const mh = menu.offsetHeight;
  let left = Math.min(r.left, window.innerWidth - mw - 8);
  let top = r.bottom + 4;
  if (top + mh > window.innerHeight - 8) top = Math.max(8, r.top - mh - 4);
  menu.style.left = Math.max(8, left) + 'px';
  menu.style.top = top + 'px';
  setTimeout(() => document.addEventListener('pointerdown', outside, { capture: true }), 0);
  function outside(e) {
    if (!menu.contains(e.target)) closeMenus();
  }
  menu._cleanup = () => document.removeEventListener('pointerdown', outside, { capture: true });
  return menu;
}

export function closeMenus() {
  document.querySelectorAll('.popmenu').forEach((m) => { m._cleanup?.(); m.remove(); });
}

export function download(name, data, type) {
  const blob = data instanceof Blob ? data : new Blob([data], { type });
  const url = URL.createObjectURL(blob);
  const a = h('a', { href: url, download: name });
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

export function pickFiles({ accept = 'image/*', multiple = true } = {}) {
  return new Promise((resolve) => {
    const input = h('input', { type: 'file', accept, multiple, hidden: true });
    input.addEventListener('change', () => { resolve([...input.files]); input.remove(); });
    document.body.append(input);
    input.click();
  });
}

export function safeName(text) {
  return (text || 'Sem título').replace(/[\\/:*?"<>|#^[\]]+/g, '-').replace(/\s+/g, ' ').trim().slice(0, 90) || 'Sem título';
}

export const fmtDate = (ts) => new Date(ts).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });

// Hash estável para variações visuais (rotação das fotos do moodboard etc.).
export function hashNum(str) {
  let x = 0;
  for (let i = 0; i < str.length; i++) x = (x * 31 + str.charCodeAt(i)) | 0;
  return Math.abs(x);
}

export function isUrl(s) {
  return /^https?:\/\/\S+$/i.test((s || '').trim());
}

// Pequeno formulário em diálogo (substitui o prompt do navegador).
// fields: [{name, label, value, placeholder, type}] -> Promise<{...} | null>
export function ask(title, fields, { ok = 'OK' } = {}) {
  return new Promise((resolve) => {
    const inputs = fields.map((f) => {
      if (f.type === 'select') {
        const sel = h('select', { name: f.name }, f.options.map((o) => (typeof o === 'string' ? { value: o, label: o } : o))
          .map((o) => (o.group ? h('optgroup', { label: o.group }) : h('option', { value: o.value }, o.label))));
        sel.value = f.value ?? '';
        if (f.onChange) sel.addEventListener('change', () => f.onChange(sel.value, inputs));
        return { f, input: sel };
      }
      const input = h(f.type === 'textarea' ? 'textarea' : 'input', {
        type: f.type && f.type !== 'textarea' ? f.type : 'text',
        name: f.name,
        placeholder: f.placeholder || '',
        autocomplete: 'off',
        rows: f.type === 'textarea' ? 4 : null,
      });
      input.value = f.value ?? '';
      return { f, input };
    });
    const dlg = h('dialog', { class: 'dialog dialog-sm' },
      h('form', { method: 'dialog', class: 'dialog-body' },
        h('header', { class: 'dialog-head' }, h('h2', null, title)),
        inputs.map(({ f, input }) => h('label', { class: 'field', 'data-name': f.name }, f.label, input)),
        h('div', { class: 'row row-end' },
          h('button', { class: 'btn btn-ghost', value: 'cancel', type: 'submit' }, 'Cancelar'),
          h('button', { class: 'btn btn-stamp', value: 'ok', type: 'submit' }, ok))));
    document.body.append(dlg);
    dlg.addEventListener('close', () => {
      const res = dlg.returnValue === 'ok' ? Object.fromEntries(inputs.map(({ f, input }) => [f.name, input.value.trim()])) : null;
      dlg.remove();
      resolve(res);
    });
    dlg.showModal();
    inputs.forEach(({ f, input }) => f.onChange?.(input.value, inputs));
    inputs[0]?.input.focus();
    if (inputs[0]?.input.tagName === 'INPUT') inputs[0].input.select();
  });
}
