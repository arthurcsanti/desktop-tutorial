// Peças de interface compartilhadas: ícones, formatação e componentes pequenos.
import { CATS, TYPES } from './categorize.js';

/* ---------- Ícones (traço fino, estilo SF Symbols) ---------- */
export const ICONS = {
  target: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/>',
  bell: '<path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.9 1.9 0 0 0 3.4 0"/>',
  label: '<path d="M3 12V5a2 2 0 0 1 2-2h7l9 9-9 9-9-9z"/><circle cx="8" cy="8" r="1.3"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  scale: '<path d="M12 3v18M7 21h10M5 7h14"/><path d="M5 7l-3 7a3 3 0 0 0 6 0zM19 7l-3 7a3 3 0 0 0 6 0z"/>',
  flag: '<path d="M5 21V4M5 4h11l-2 4 2 4H5"/>',
  receipt: '<path d="M5 3h14v18l-3-2-2 2-2-2-2 2-2-2-3 2z"/><path d="M9 8h6M9 12h6"/>',
  wallet: '<path d="M4 7a2 2 0 0 1 2-2h12v4"/><path d="M4 7v11a2 2 0 0 0 2 2h14V9H6a2 2 0 0 1-2-2z"/><circle cx="16" cy="14.5" r="1"/>',
  checklist: '<path d="m4 6 1.5 1.5L8 5M4 12l1.5 1.5L8 11M4 18l1.5 1.5L8 17"/><path d="M11 6h9M11 12h9M11 18h9"/>',
  card: '<rect x="3" y="5" width="18" height="14" rx="2.5"/><path d="M3 10h18M7 15h4"/>',
  layers: '<path d="m12 3 9 5-9 5-9-5z"/><path d="m3 13 9 5 9-5"/>',
  home: '<path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V20h14V9.5"/><path d="M10 20v-6h4v6"/>',
  list: '<path d="M8 6h13M8 12h13M8 18h13"/><circle cx="3.5" cy="6" r=".6"/><circle cx="3.5" cy="12" r=".6"/><circle cx="3.5" cy="18" r=".6"/>',
  repeat: '<path d="M17 2l4 4-4 4"/><path d="M3 11V9a3 3 0 0 1 3-3h15"/><path d="M7 22l-4-4 4-4"/><path d="M21 13v2a3 3 0 0 1-3 3H3"/>',
  trend: '<path d="M3 17l6-6 4 4 8-8"/><path d="M15 7h6v6"/>',
  file: '<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5"/><path d="M9 13h6M9 17h4"/>',
  gear: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
  lock: '<rect x="4" y="11" width="16" height="10" rx="2.5"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>',
  upload: '<path d="M12 15V3"/><path d="m7 8 5-5 5 5"/><path d="M20 15v4a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-4"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  chevron: '<path d="m9 6 6 6-6 6"/>',
  down: '<path d="m6 9 6 6 6-6"/>',
  up: '<path d="M7 17 17 7"/><path d="M8 7h9v9"/>',
  downright: '<path d="M7 7l10 10"/><path d="M17 8v9H8"/>',
  alert: '<path d="M12 9v4M12 17h.01"/><path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 16v-4M12 8h.01"/>',
  piggy: '<path d="M19 9.5c1 .5 1.8 1.5 2 2.5h-1.5"/><path d="M5 11a7 6 0 0 1 12.5-2.5L20 8l-.5 3.5A6 6 0 0 1 17 16v3h-3v-2h-4v2H7v-3.2A6 6 0 0 1 5 11z"/><path d="M5 11H3"/><circle cx="15" cy="11" r=".6"/>',
  calendar: '<rect x="3" y="5" width="18" height="16" rx="2.5"/><path d="M3 10h18M8 3v4M16 3v4"/>',
  store: '<path d="M3 9 4.5 4h15L21 9"/><path d="M3 9h18v1.5a3 3 0 0 1-6 0 3 3 0 0 1-6 0 3 3 0 0 1-6 0z"/><path d="M5 13v8h14v-8"/>',
  shield: '<path d="M12 3 4.5 6v6c0 4.5 3.2 7.7 7.5 9 4.3-1.3 7.5-4.5 7.5-9V6z"/><path d="m9 12 2 2 4-4"/>',
  key: '<circle cx="8" cy="15" r="4"/><path d="m10.8 12.2 9.2-9.2M17 6l3 3M14.5 8.5l2 2"/>',
  trash: '<path d="M4 7h16M10 11v6M14 11v6"/><path d="M6 7l1 13h10l1-13M9 7V4h6v3"/>',
  x: '<path d="M18 6 6 18M6 6l12 12"/>',
  check: '<path d="m5 12 5 5 9-10"/>',
  question: '<circle cx="12" cy="12" r="9"/><path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .8-1 1.5v.4M12 17h.01"/>',
  faceid: '<path d="M4 8V6a2 2 0 0 1 2-2h2M16 4h2a2 2 0 0 1 2 2v2M20 16v2a2 2 0 0 1-2 2h-2M8 20H6a2 2 0 0 1-2-2v-2"/><path d="M9 9v1.5M15 9v1.5M12 9v4h-1"/><path d="M9 15.5c1.6 1.3 4.4 1.3 6 0"/>',
  copy: '<rect x="9" y="9" width="12" height="12" rx="2.5"/><path d="M5 15V5a2 2 0 0 1 2-2h10"/>',
  share: '<path d="M12 3v12M7 8l5-5 5 5"/><path d="M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7"/>',
};
export const icon = (name) => `<span class="ico"><svg viewBox="0 0 24 24" aria-hidden="true">${ICONS[name] || ''}</svg></span>`;

/* ---------- formatação ---------- */
export const BRL = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
export const money = (v) => BRL.format(v);
export const moneyShort = (v) => (Math.abs(v) >= 1000 ? `R$ ${(v / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} mil` : money(v));
export const pct = (v) => `${Math.round(v * 100)}%`;
export const WEEKDAYS = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];
export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const dateOf = (iso) => new Date(`${iso}T12:00:00`);
export const uid = () => Math.random().toString(36).slice(2, 10);
export const $ = (s, r = document) => r.querySelector(s);
export const parseMoneyInput = (v) => parseFloat(String(v).replace(/\./g, '').replace(',', '.')) || 0;

/* ---------- categorias de investimento: cor segue o tipo ---------- */
export const KINDS = ['Reserva de emergência', 'Renda fixa', 'Renda variável', 'Exterior', 'Cripto', 'Previdência', 'Fundos', 'Outros'];
export const KIND_COLOR = { 'Reserva de emergência': 'var(--c1)', 'Renda fixa': 'var(--c3)', 'Renda variável': 'var(--c2)', Exterior: 'var(--c7)', Cripto: 'var(--c4)', Previdência: 'var(--c5)', Fundos: 'var(--c6)', Outros: 'var(--c8)' };
export function guessKind(name) {
  const s = name.toUpperCase();
  if (/SELIC|RESERVA/.test(s)) return 'Reserva de emergência';
  if (/TESOURO|CDB|LCI|LCA|RDB|CRI|CRA|DEB[EÊ]NTURE|POUPAN/.test(s)) return 'Renda fixa';
  if (/IVVB|BDR|NASDAQ|S&P|EXTERIOR|AVENUE|NOMAD|STOCK|\bETF\b.*US/.test(s)) return 'Exterior';
  if (/BITCOIN|BTC|ETH|CRIPTO|HASH11|QBTC/.test(s)) return 'Cripto';
  if (/PREV|PGBL|VGBL/.test(s)) return 'Previdência';
  if (/FUNDO|FIC|FIM|MULTIMERCADO/.test(s)) return 'Fundos';
  if (/[A-Z]{4}\d{1,2}\b|FII|A[CÇ][OÕ]ES/.test(s)) return 'Renda variável';
  return 'Outros';
}

export const avatar = (name, cat) => (CATS[cat]?.unknown
  ? `<div class="avatar unknown">${icon('question')}</div>`
  : `<div class="avatar" style="--cat:${CATS[cat]?.color || 'var(--c0)'}">${esc((name.replace(/^PIX · /, '').trim()[0] || '?').toUpperCase())}</div>`);
export const tag = (cat) => `<span class="tag${CATS[cat]?.unknown ? ' unknown' : ''}" style="--cat:${CATS[cat]?.color}">${CATS[cat]?.name || cat}</span>`;
export const typeTag = (t) => (t.type === 'out' ? tag(t.cat) : `<span class="tag type-${t.type}">${TYPES[t.type]}</span>`);

export function heroValue(v) {
  const [int, cents] = money(v).split(',');
  return `<div class="hero-value">${int}<span class="cents">,${cents}</span></div>`;
}

export function callout(n) {
  return `<div class="callout ${n.tone}">
    <div class="callout-ico">${icon(n.icon)}</div>
    <div><p>${esc(n.title)}</p>${n.sub ? `<p>${esc(n.sub)}</p>` : ''}
    ${n.action ? `<div class="callout-actions"><button class="btn small primary" data-action="sub-accept" data-key="${esc(n.action.key)}">Adicionar</button><button class="btn small" data-action="sub-dismiss" data-key="${esc(n.action.key)}">Agora não</button></div>` : ''}
    ${n.link ? `<div class="callout-actions"><a class="btn small" href="${n.link}">${n.linkLabel || 'Revisar'}</a></div>` : ''}
    ${n.buttons ? `<div class="callout-actions">${n.buttons}</div>` : ''}</div></div>`;
}


/** Barras verticais simples (uma série). items: [{ label, value, tip, strong }] */
export function barChart(items, { height = 140, money: fmt = money } = {}) {
  const W = 340, H = height, top = 20, bottom = 22, gap = items.length > 8 ? 6 : 12;
  const max = Math.max(0, ...items.map((d) => d.value));
  const min = Math.min(0, ...items.map((d) => d.value));
  const span = max - min || 1;
  const bw = (W - gap * (items.length - 1)) / items.length;
  const y = (v) => top + (H - top - bottom) * (1 - (v - min) / span);
  const base = y(0);
  const r = 3;
  let out = '';
  items.forEach((d, i) => {
    const x = i * (bw + gap);
    if (d.value) {
      const yy = y(d.value);
      const up = d.value > 0;
      const h = Math.abs(base - yy);
      const rr = Math.min(r, h);
      out += up
        ? `<path class="bar${d.strong ? ' current' : ''}" d="M${x},${base} V${yy + rr} Q${x},${yy} ${x + rr},${yy} H${x + bw - rr} Q${x + bw},${yy} ${x + bw},${yy + rr} V${base} Z"/>`
        : `<path class="bar neg" d="M${x},${base} V${yy - rr} Q${x},${yy} ${x + rr},${yy} H${x + bw - rr} Q${x + bw},${yy} ${x + bw},${yy - rr} V${base} Z"/>`;
    }
    out += `<text class="axis${d.strong ? ' cur' : ''}" x="${x + bw / 2}" y="${H - 6}" text-anchor="middle">${d.label}</text>`;
    if (d.strong && d.value) out += `<text class="val" x="${x + bw / 2}" y="${y(Math.max(d.value, 0)) - 6}" text-anchor="middle">${moneyShort(d.value)}</text>`;
    out += `<rect class="hit" x="${x - gap / 2}" y="0" width="${bw + gap}" height="${H}" data-tip="${esc(d.tip || d.label)}|${fmt(d.value)}"/>`;
  });
  return `<div class="chart"><svg viewBox="0 0 ${W} ${H}" role="img"><line class="grid" x1="0" x2="${W}" y1="${base}" y2="${base}"/>${out}</svg></div>`;
}

/** Linha de lista padrão: ícone, título, subtítulo, valor e seta */
export function navRow({ href, action, icon: ic, title, sub, value, attrs = '' }) {
  const inner = `${ic ? `<div class="row-ico">${icon(ic)}</div>` : ''}<div class="row-main"><div class="row-title">${title}</div>${sub ? `<div class="row-sub">${sub}</div>` : ''}</div>${value != null ? `<span class="row-val">${value}</span>` : ''}${icon('chevron')}`;
  return href ? `<a class="row plain row-btn has-ico" href="${href}" ${attrs}>${inner}</a>` : `<button class="row plain row-btn has-ico" data-action="${action}" ${attrs}>${inner}</button>`;
}

export const progress = (ratio, tone = '') => `<div class="progress ${tone}"><div style="width:${Math.max(0, Math.min(1, ratio)) * 100}%"></div></div>`;
