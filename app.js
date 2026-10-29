/* Caderno — app (etapa 1: estrutura visual com dados de exemplo).
   A importação real de extratos, a criptografia e as exportações entram na próxima etapa;
   as telas já leem tudo de `db`, então basta trocar a origem dos dados. */

'use strict';

/* ---------- Ícones (traço fino, estilo SF Symbols / Lucide) ---------- */
const ICONS = {
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
  tag: '<path d="M20.6 13.4 13.4 20.6a2 2 0 0 1-2.8 0L3 13V3h10l7.6 7.6a2 2 0 0 1 0 2.8z"/><circle cx="7.5" cy="7.5" r="1.2"/>',
  store: '<path d="M3 9 4.5 4h15L21 9"/><path d="M3 9h18v1.5a3 3 0 0 1-6 0 3 3 0 0 1-6 0 3 3 0 0 1-6 0z"/><path d="M5 13v8h14v-8"/>',
  shield: '<path d="M12 3 4.5 6v6c0 4.5 3.2 7.7 7.5 9 4.3-1.3 7.5-4.5 7.5-9V6z"/><path d="m9 12 2 2 4-4"/>',
  moon: '<path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z"/>',
  trash: '<path d="M4 7h16M10 11v6M14 11v6"/><path d="M6 7l1 13h10l1-13M9 7V4h6v3"/>',
  box: '<path d="M21 8 12 3 3 8v8l9 5 9-5z"/><path d="m3 8 9 5 9-5M12 13v8"/>',
  x: '<path d="M18 6 6 18M6 6l12 12"/>',
  check: '<path d="m5 12 5 5 9-10"/>',
  question: '<circle cx="12" cy="12" r="9"/><path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .8-1 1.5v.4M12 17h.01"/>',
};
const icon = (name) => `<span class="ico"><svg viewBox="0 0 24 24" aria-hidden="true">${ICONS[name] || ''}</svg></span>`;
function hydrateIcons(root = document) {
  root.querySelectorAll('.ico[data-i]').forEach((el) => {
    el.innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true">${ICONS[el.dataset.i]}</svg>`;
    el.removeAttribute('data-i');
  });
}

/* ---------- Formatação ---------- */
const BRL = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const money = (v) => BRL.format(v);
const moneyShort = (v) => (v >= 1000 ? `R$ ${(v / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} mil` : money(v));
const pct = (v) => `${Math.round(v * 100)}%`;
const MONTHS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
const MONTHS_FULL = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
const WEEKDAYS = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

/* ---------- Dados de exemplo ---------- */
const CATS = {
  moradia:     { name: 'Moradia',     color: 'var(--c1)' },
  mercado:     { name: 'Mercado',     color: 'var(--c2)' },
  delivery:    { name: 'Delivery',    color: 'var(--c3)' },
  transporte:  { name: 'Transporte',  color: 'var(--c4)' },
  assinaturas: { name: 'Assinaturas', color: 'var(--c5)' },
  saude:       { name: 'Saúde',       color: 'var(--c6)' },
  compras:     { name: 'Compras',     color: 'var(--c7)' },
  lazer:       { name: 'Lazer',       color: 'var(--c8)' },
  outros:      { name: 'Não identificado', color: 'var(--c0)', unknown: true },
};

const OCT = [
  [1, 'Imobiliária Lar', 'moradia', 1650], [1, 'Smart Fit', 'saude', 129.9], [2, 'Pão de Açúcar', 'mercado', 312.45],
  [3, 'iFood', 'delivery', 58.9], [4, 'Uber', 'transporte', 23.4], [5, 'YouTube Premium', 'assinaturas', 24.9],
  [5, 'Shell', 'transporte', 210], [6, 'iFood', 'delivery', 41.5], [7, 'Drogasil', 'saude', 86.3],
  [8, 'Spotify', 'assinaturas', 21.9], [9, 'Amazon', 'compras', 149.9], [10, 'Enel', 'moradia', 187.62],
  [10, 'iFood', 'delivery', 62], [11, 'Cinemark', 'lazer', 68], [12, 'PIX 034.***.***-12', 'outros', 150],
  [12, 'Assaí Atacadista', 'mercado', 268.1], [13, 'Uber', 'transporte', 31.8], [14, 'Netflix', 'assinaturas', 44.9],
  [15, 'iFood', 'delivery', 39.9], [16, 'Zara', 'compras', 239.9], [17, 'Vivo Fibra', 'moradia', 109.99],
  [18, 'Amazon Prime', 'assinaturas', 19.9], [19, 'Bar do Zé', 'lazer', 97], [19, 'Uber', 'transporte', 18.7],
  [20, 'iFood', 'delivery', 54.3], [21, 'Pão de Açúcar', 'mercado', 184.2], [22, 'Mercado Livre', 'compras', 89.9],
  [23, 'Shell', 'transporte', 180], [24, 'iFood', 'delivery', 47.8], [25, 'COMPRA CARTAO *SQ 4421', 'outros', 64],
  [26, 'Hortifruti', 'mercado', 76.4], [27, 'iCloud+', 'assinaturas', 14.9], [27, 'Uber', 'transporte', 27.9],
  [28, 'iFood', 'delivery', 59.6],
].map(([d, merchant, cat, amount], i) => ({ id: i + 1, date: new Date(2026, 9, d), merchant, cat, amount }));

const db = {
  month: new Date(2026, 9, 1),
  income: 7800,
  transactions: OCT,
  // totais dos meses anteriores (mai → set)
  history: [[4, 4120.4], [5, 3870.15], [6, 4390.8], [7, 4010.3], [8, 4285.6]],
  lastMonthByCat: { moradia: 1940, mercado: 820, delivery: 255, transporte: 470, assinaturas: 107, saude: 230, compras: 410, lazer: 205, outros: 120 },
  subscriptions: [
    { name: 'Smart Fit', cat: 'saude', amount: 129.9, day: 1, since: 'mar 2025' },
    { name: 'Netflix', cat: 'assinaturas', amount: 44.9, day: 14, since: 'jan 2024' },
    { name: 'YouTube Premium', cat: 'assinaturas', amount: 24.9, day: 5, since: 'ago 2025' },
    { name: 'Spotify', cat: 'assinaturas', amount: 21.9, day: 8, since: 'fev 2023' },
    { name: 'iCloud+', cat: 'assinaturas', amount: 14.9, day: 27, since: 'jun 2024' },
  ],
  suggestions: [{ name: 'Amazon Prime', amount: 19.9, months: ['ago', 'set', 'out'] }],
  investments: [
    { name: 'Tesouro Selic 2029', kind: 'Renda fixa · reserva', value: 12400, gain: 0.0091, cat: 'c1' },
    { name: 'CDB 112% CDI', kind: 'Renda fixa', value: 8200, gain: 0.0098, cat: 'c3' },
    { name: 'Ações e FIIs', kind: 'Renda variável', value: 6150, gain: -0.012, cat: 'c2' },
    { name: 'IVVB11', kind: 'Exterior · ETF', value: 4300, gain: 0.021, cat: 'c7' },
    { name: 'Bitcoin', kind: 'Cripto', value: 900, gain: 0.054, cat: 'c4' },
  ],
  monthlyInvested: 900,
};

/* ---------- Cálculos ---------- */
function monthSummary() {
  const tx = db.transactions;
  const total = tx.reduce((s, t) => s + t.amount, 0);
  const byCat = {};
  const byMerchant = {};
  tx.forEach((t) => {
    byCat[t.cat] = (byCat[t.cat] || 0) + t.amount;
    const m = (byMerchant[t.merchant] ||= { name: t.merchant, cat: t.cat, total: 0, count: 0 });
    m.total += t.amount; m.count += 1;
  });
  const last = db.history[db.history.length - 1][1];
  const cats = Object.entries(byCat).map(([id, v]) => ({ id, value: v, last: db.lastMonthByCat[id] || 0 })).sort((a, b) => b.value - a.value);
  const merchants = Object.values(byMerchant).filter((m) => !CATS[m.cat].unknown).sort((a, b) => b.total - a.total);
  const unknown = tx.filter((t) => CATS[t.cat].unknown);
  return { total, last, delta: (total - last) / last, cats, merchants, unknown, count: tx.length };
}
const subsTotal = () => db.subscriptions.reduce((s, x) => s + x.amount, 0);

/* ---------- Gráfico: últimos 6 meses ---------- */
function monthsChart(summary) {
  const data = [...db.history.map(([m, v]) => ({ m, v })), { m: db.month.getMonth(), v: summary.total, current: true }];
  const W = 340, H = 150, top = 20, bottom = 22, gap = 14;
  const max = Math.ceil(Math.max(...data.map((d) => d.v)) / 1000) * 1000;
  const bw = (W - gap * (data.length - 1)) / data.length;
  const y = (v) => top + (H - top - bottom) * (1 - v / max);
  const r = 4;
  let bars = '';
  data.forEach((d, i) => {
    const x = i * (bw + gap), yy = y(d.v), h = H - bottom - yy;
    // topo arredondado, base reta no eixo
    const path = `M${x},${H - bottom} V${yy + r} Q${x},${yy} ${x + r},${yy} H${x + bw - r} Q${x + bw},${yy} ${x + bw},${yy + r} V${H - bottom} Z`;
    bars += `<path class="bar${d.current ? ' current' : ''}" d="${path}"/>`;
    bars += `<text class="axis" x="${x + bw / 2}" y="${H - 6}" text-anchor="middle">${MONTHS[d.m]}</text>`;
    if (d.current) bars += `<text class="val" x="${x + bw / 2}" y="${yy - 6}" text-anchor="middle">${moneyShort(d.v)}</text>`;
    bars += `<rect class="hit" x="${x - gap / 2}" y="0" width="${bw + gap}" height="${H}" data-tip="${MONTHS_FULL[d.m]}|${money(d.v)}" data-h="${h}"/>`;
  });
  const gridY = y(max / 2);
  const table = data.map((d) => `<tr><td>${MONTHS_FULL[d.m]}</td><td>${money(d.v)}</td></tr>`).join('');
  return `
    <div class="chart" aria-label="Gastos dos últimos 6 meses">
      <svg viewBox="0 0 ${W} ${H}" role="img">
        <line class="grid" x1="0" x2="${W}" y1="${gridY}" y2="${gridY}" stroke-dasharray="2 4"/>
        <line class="grid" x1="0" x2="${W}" y1="${H - bottom}" y2="${H - bottom}"/>
        ${bars}
      </svg>
    </div>
    <div class="chart-foot"><span>Média: ${money(data.reduce((s, d) => s + d.v, 0) / data.length)}</span><button class="link" data-action="toggle-table">Ver tabela</button></div>
    <table class="data-table" hidden><thead><tr><th>Mês</th><th>Gasto</th></tr></thead><tbody>${table}</tbody></table>`;
}

function categoryBars(cats, total, limit = 6) {
  const shown = cats.slice(0, limit);
  const max = shown[0]?.value || 1;
  return `<div class="cat-list">${shown.map((c) => {
    const cat = CATS[c.id];
    const d = c.last ? (c.value - c.last) / c.last : 0;
    return `<div class="cat-row" style="--cat:${cat.color}" data-tip="${cat.name}|${money(c.value)} · ${pct(c.value / total)} do mês|Mês passado: ${money(c.last)}">
      <div class="cat-name"><i></i>${cat.name}</div>
      <div class="cat-val">${money(c.value)}<small>${d > 0.05 ? '+' + pct(d) : d < -0.05 ? '−' + pct(-d) : pct(c.value / total)}</small></div>
      <div class="cat-track"><div class="cat-fill" style="width:${(c.value / max) * 100}%"></div></div>
    </div>`;
  }).join('')}</div>`;
}

const avatar = (name, cat) => {
  const c = CATS[cat];
  return c.unknown
    ? `<div class="avatar unknown">${icon('question')}</div>`
    : `<div class="avatar" style="--cat:${c.color}">${esc(name.trim()[0].toUpperCase())}</div>`;
};
const tag = (cat) => `<span class="tag${CATS[cat].unknown ? ' unknown' : ''}" style="--cat:${CATS[cat].color}">${CATS[cat].name}</span>`;

/* ---------- Telas ---------- */
const ROUTES = [
  { id: 'inicio', label: 'Início', icon: 'home' },
  { id: 'gastos', label: 'Gastos', icon: 'list' },
  { id: 'assinaturas', label: 'Assinaturas', icon: 'repeat' },
  { id: 'investir', label: 'Investir', icon: 'trend' },
  { id: 'relatorios', label: 'Relatórios', icon: 'file' },
];

const monthLabel = () => `${MONTHS_FULL[db.month.getMonth()]} ${db.month.getFullYear()}`;
function topbar(extra = '') {
  return `<div class="topbar">
    <button class="month-pill" data-action="month">${monthLabel()} ${icon('down')}</button>
    <div class="topbar-actions">${extra}
      <button class="icon-btn" data-action="import" aria-label="Importar extrato">${icon('plus')}</button>
      <a class="icon-btn" href="#ajustes" aria-label="Ajustes">${icon('gear')}</a>
    </div>
  </div>`;
}

const views = {
  inicio() {
    const s = monthSummary();
    const [int, cents] = money(s.total).split(',');
    const up = s.delta > 0;
    const delivery = s.cats.find((c) => c.id === 'delivery');
    const deliveryTx = db.transactions.filter((t) => t.cat === 'delivery');
    const leftover = db.income - s.total;
    const sugg = db.suggestions[0];
    return `${topbar()}
      <h1 class="page-title">Visão geral</h1>
      <p class="page-sub">${s.count} lançamentos importados · atualizado hoje</p>

      <div class="card hero">
        <div class="hero-label">Gasto em ${MONTHS_FULL[db.month.getMonth()].toLowerCase()}</div>
        <div class="hero-value">${int}<span class="cents">,${cents}</span></div>
        <span class="delta ${up ? 'up' : 'down'}">${icon(up ? 'up' : 'downright')}${pct(Math.abs(s.delta))}</span><span class="delta-note">vs. ${MONTHS[db.month.getMonth() - 1]} (${money(s.last)})</span>
        <div class="flow">
          <div><span>Entradas</span><strong>${moneyShort(db.income)}</strong></div>
          <div><span>Saídas</span><strong>${moneyShort(s.total)}</strong></div>
          <div><span>Sobra</span><strong>${moneyShort(leftover)}</strong></div>
        </div>
      </div>

      <div class="section">
        <div class="section-head"><h2 class="section-title">Observações</h2></div>
        <div class="callout warn">
          <div class="callout-ico">${icon('alert')}</div>
          <div><p>Delivery subiu ${pct((delivery.value - delivery.last) / delivery.last)} em relação a setembro.</p>
          <p>${deliveryTx.length} pedidos no iFood, média de ${money(delivery.value / deliveryTx.length)} cada.</p></div>
        </div>
        <div class="callout">
          <div class="callout-ico">${icon('repeat')}</div>
          <div><p>${sugg.name} foi cobrado 3 meses seguidos (${money(sugg.amount)}).</p>
          <p>Quer registrar como assinatura?</p>
          <div class="callout-actions"><button class="btn small primary" data-action="add-sub">Adicionar</button><button class="btn small" data-action="dismiss-sub">Agora não</button></div></div>
        </div>
        <div class="callout good">
          <div class="callout-ico">${icon('piggy')}</div>
          <div><p>Sobraram ${money(leftover)} este mês.</p>
          <p>Investindo metade disso no Tesouro Selic, sua reserva chega a 6 meses em fevereiro.</p></div>
        </div>
      </div>

      <div class="section">
        <div class="section-head"><h2 class="section-title">Últimos 6 meses</h2></div>
        <div class="card">${monthsChart(s)}</div>
      </div>

      <div class="section">
        <div class="section-head"><h2 class="section-title">Por categoria</h2><a class="link" href="#gastos">Ver gastos</a></div>
        <div class="card">${categoryBars(s.cats, s.total)}</div>
      </div>

      <div class="section">
        <div class="section-head"><h2 class="section-title">Onde você mais gastou</h2></div>
        <div class="list">${s.merchants.slice(0, 5).map((m) => `
          <div class="row">${avatar(m.name, m.cat)}
            <div class="row-main"><div class="row-title">${esc(m.name)}</div><div class="row-sub">${m.count}× · ${CATS[m.cat].name}</div></div>
            <div class="row-amt">${money(m.total)}</div>
          </div>`).join('')}
        </div>
      </div>

      <div class="section grid-2">
        <a class="card stat" href="#assinaturas" style="text-decoration:none;color:inherit">
          <span>Assinaturas</span><strong>${money(subsTotal())}</strong><em>${db.subscriptions.length} ativas · por mês</em>
        </a>
        <a class="card stat" href="#gastos?f=outros" style="text-decoration:none;color:inherit">
          <span>Não identificados</span><strong>${s.unknown.length}</strong><em>${money(s.unknown.reduce((a, t) => a + t.amount, 0))} para revisar</em>
        </a>
      </div>`;
  },

  gastos(params) {
    const filter = params.get('f') || 'todos';
    const q = (params.get('q') || '').toLowerCase();
    const s = monthSummary();
    let tx = [...db.transactions].sort((a, b) => b.date - a.date || b.id - a.id);
    if (filter !== 'todos') tx = tx.filter((t) => t.cat === filter);
    if (q) tx = tx.filter((t) => t.merchant.toLowerCase().includes(q));
    const groups = new Map();
    tx.forEach((t) => { const k = t.date.toDateString(); if (!groups.has(k)) groups.set(k, []); groups.get(k).push(t); });
    const chips = [`<button class="chip${filter === 'todos' ? ' on' : ''}" data-filter="todos">Todos</button>`]
      .concat(s.cats.map((c) => `<button class="chip${filter === c.id ? ' on' : ''}" data-filter="${c.id}" style="--cat:${CATS[c.id].color}"><i></i>${CATS[c.id].name}</button>`)).join('');
    const body = [...groups.values()].map((list) => {
      const d = list[0].date;
      return `<div class="day-head"><strong>${d.getDate()} de ${MONTHS[d.getMonth()]}</strong><span>${WEEKDAYS[d.getDay()]} · ${money(list.reduce((a, t) => a + t.amount, 0))}</span></div>
        <div class="list">${list.map((t) => `
          <button class="row row-btn" data-action="tx" data-id="${t.id}">${avatar(t.merchant, t.cat)}
            <div class="row-main"><div class="row-title">${esc(t.merchant)}</div><div class="row-sub">${tag(t.cat)}${db.subscriptions.some((x) => x.name === t.merchant) ? '<span class="pill">Assinatura</span>' : ''}</div></div>
            <div class="row-amt">−${money(t.amount)}</div>
          </button>`).join('')}</div>`;
    }).join('');
    return `${topbar()}
      <h1 class="page-title">Gastos</h1>
      <p class="page-sub">${money(tx.reduce((a, t) => a + t.amount, 0))} em ${tx.length} lançamentos</p>
      <label class="search">${icon('search')}<input type="search" placeholder="Buscar loja ou descrição" value="${esc(q)}" data-action="search"></label>
      <div class="chips">${chips}</div>
      ${body || '<p class="empty-hint">Nada encontrado.</p>'}`;
  },

  assinaturas() {
    const total = subsTotal();
    const today = 29;
    const sorted = [...db.subscriptions].sort((a, b) => ((a.day - today + 31) % 31) - ((b.day - today + 31) % 31));
    return `${topbar()}
      <h1 class="page-title">Assinaturas</h1>
      <p class="page-sub">Cobranças recorrentes encontradas nos seus extratos</p>
      <div class="grid-2">
        <div class="card stat"><span>Por mês</span><strong>${money(total)}</strong><em>${db.subscriptions.length} ativas</em></div>
        <div class="card stat"><span>Por ano</span><strong>${money(total * 12)}</strong><em>${pct((total * 12) / (db.income * 12))} da renda</em></div>
      </div>

      ${db.suggestions.length ? `<div class="section">
        <div class="section-head"><h2 class="section-title">Encontradas no extrato</h2></div>
        ${db.suggestions.map((sg) => `<div class="callout">
          <div class="callout-ico">${icon('repeat')}</div>
          <div><p><b>${sg.name}</b> · ${money(sg.amount)}</p>
          <p>Cobrado em ${sg.months.join(', ')}. Mesmo valor, mesmo dia do mês.</p>
          <div class="callout-actions"><button class="btn small primary" data-action="add-sub">Adicionar assinatura</button><button class="btn small" data-action="dismiss-sub">Ignorar</button></div></div>
        </div>`).join('')}
      </div>` : ''}

      <div class="section">
        <div class="section-head"><h2 class="section-title">Próximas cobranças</h2><button class="link" data-action="new-sub">+ Nova</button></div>
        <div class="list">${sorted.map((x) => {
          const next = x.day > today ? new Date(2026, 9, x.day) : new Date(2026, 10, x.day);
          return `<div class="row">${avatar(x.name, x.cat)}
            <div class="row-main"><div class="row-title">${esc(x.name)}</div><div class="row-sub">Dia ${x.day} · desde ${x.since}</div></div>
            <div class="row-amt">${money(x.amount)}<small>${next.getDate()} ${MONTHS[next.getMonth()]}</small></div>
          </div>`;
        }).join('')}</div>
      </div>
      <p class="note">${icon('info')} Uma cobrança vira sugestão quando aparece com o mesmo valor por 3 meses seguidos.</p>`;
  },

  investir() {
    const inv = db.investments;
    const total = inv.reduce((s, x) => s + x.value, 0);
    const s = monthSummary();
    const reserveMonths = inv[0].value / s.total;
    return `${topbar()}
      <h1 class="page-title">Investimentos</h1>
      <p class="page-sub">Patrimônio registrado manualmente ou importado da corretora</p>
      <div class="card hero">
        <div class="hero-label">Patrimônio investido</div>
        <div class="hero-value">${money(total).split(',')[0]}<span class="cents">,${money(total).split(',')[1]}</span></div>
        <span class="delta down">${icon('up')}${money(inv.reduce((a, x) => a + x.value * x.gain, 0))}</span><span class="delta-note">rendimento no mês</span>
        <div class="stack">${inv.map((x) => `<div style="--cat:var(--${x.cat});flex:${x.value}" data-tip="${x.name}|${money(x.value)} · ${pct(x.value / total)}"></div>`).join('')}</div>
        <div class="cat-list" style="gap:8px">${inv.map((x) => `<div class="cat-row" style="--cat:var(--${x.cat})"><div class="cat-name"><i></i>${x.kind.split(' · ')[0] === 'Renda fixa' ? x.name : x.kind}</div><div class="cat-val">${pct(x.value / total)}</div></div>`).join('')}</div>
      </div>

      <div class="section grid-2">
        <div class="card stat"><span>Aporte em outubro</span><strong>${money(db.monthlyInvested)}</strong><em>${pct(db.monthlyInvested / db.income)} da renda</em></div>
        <div class="card stat"><span>Meta de aporte</span><strong>${money(db.income * 0.2)}</strong><em>20% da renda</em></div>
      </div>

      <div class="section">
        <div class="section-head"><h2 class="section-title">Reserva de emergência</h2></div>
        <div class="card">
          <div style="display:flex;justify-content:space-between;font-size:14px"><span>${reserveMonths.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} de 6 meses de gastos</span><strong class="num">${money(inv[0].value)}</strong></div>
          <div class="progress"><div style="width:${Math.min(1, reserveMonths / 6) * 100}%"></div></div>
          <div style="font-size:12.5px;color:var(--text-3)">Faltam ${money(Math.max(0, s.total * 6 - inv[0].value))} para completar</div>
        </div>
      </div>

      <div class="section">
        <div class="section-head"><h2 class="section-title">Carteira</h2><button class="link" data-action="new-inv">+ Adicionar</button></div>
        <div class="list">${inv.map((x) => `
          <div class="row"><div class="avatar" style="--cat:var(--${x.cat})">${esc(x.name[0])}</div>
            <div class="row-main"><div class="row-title">${esc(x.name)}</div><div class="row-sub">${x.kind}</div></div>
            <div class="row-amt">${money(x.value)}<small style="color:${x.gain >= 0 ? 'var(--good)' : 'var(--bad)'}">${x.gain >= 0 ? '+' : '−'}${(Math.abs(x.gain) * 100).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}% no mês</small></div>
          </div>`).join('')}</div>
      </div>

      <div class="section">
        <div class="section-head"><h2 class="section-title">Sugestões</h2></div>
        <div class="callout"><div class="callout-ico">${icon('shield')}</div><div><p>Complete a reserva antes de aumentar renda variável.</p><p>Hoje ela cobre ${reserveMonths.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} meses; o recomendado é 6.</p></div></div>
        <div class="callout"><div class="callout-ico">${icon('repeat')}</div><div><p>Cortar uma assinatura de streaming rende ${money(44.9 * 12)} por ano.</p><p>Aplicado no CDB, vira cerca de ${money(44.9 * 12 * 1.06)} em 12 meses.</p></div></div>
      </div>`;
  },

  relatorios() {
    const s = monthSummary();
    const m = MONTHS_FULL[db.month.getMonth()];
    return `${topbar()}
      <h1 class="page-title">Relatórios</h1>
      <p class="page-sub">Resumo do mês pronto para exportar</p>

      <article class="card doc">
        <div class="doc-icon">${icon('file')}</div>
        <h2>${m} de ${db.month.getFullYear()}</h2>
        <dl class="props">
          <dt>${icon('calendar')} Período</dt><dd>01–31 ${MONTHS[db.month.getMonth()]}</dd>
          <dt>${icon('list')} Gasto total</dt><dd>${money(s.total)}</dd>
          <dt>${icon('trend')} Variação</dt><dd>${s.delta > 0 ? '+' : '−'}${pct(Math.abs(s.delta))} vs. ${MONTHS[db.month.getMonth() - 1]}</dd>
          <dt>${icon('repeat')} Assinaturas</dt><dd>${money(subsTotal())}</dd>
          <dt>${icon('piggy')} Sobra</dt><dd>${money(db.income - s.total)}</dd>
        </dl>
        <h3>Categorias</h3>
        <ul>${s.cats.slice(0, 5).map((c) => `<li><b>${CATS[c.id].name}</b> — ${money(c.value)} (${pct(c.value / s.total)})</li>`).join('')}</ul>
        <h3>Lojas</h3>
        <ul>${s.merchants.slice(0, 4).map((x) => `<li><b>${esc(x.name)}</b> — ${money(x.total)} em ${x.count}×</li>`).join('')}</ul>
      </article>

      <div class="section">
        <div class="section-head"><h2 class="section-title">Exportar</h2></div>
        <div class="export-grid">
          <button class="export" data-action="export" data-fmt="pdf"><span class="ext">PDF</span><div><strong>Relatório</strong><span>Para imprimir ou enviar</span></div></button>
          <button class="export" data-action="export" data-fmt="xlsx"><span class="ext">XLSX</span><div><strong>Planilha</strong><span>Excel, Numbers, Sheets</span></div></button>
          <button class="export" data-action="export" data-fmt="md"><span class="ext">MD</span><div><strong>Markdown</strong><span>Nota pronta para o Obsidian</span></div></button>
          <button class="export" data-action="export" data-fmt="csv"><span class="ext">CSV</span><div><strong>Lançamentos</strong><span>Todos os gastos do mês</span></div></button>
        </div>
      </div>`;
  },

  ajustes() {
    const theme = document.documentElement.dataset.theme || 'auto';
    return `<div class="topbar"><a class="link" href="#inicio">‹ Voltar</a><span></span></div>
      <h1 class="page-title">Ajustes</h1>
      <p class="page-sub">Tudo fica neste aparelho</p>

      <div class="section"><div class="section-head"><h2 class="section-title">Segurança</h2></div>
        <div class="list">
          <div class="row plain"><div class="row-main"><div class="row-title">Criptografia</div><div class="row-sub">AES-256-GCM, chave derivada do seu código</div></div><span class="val-text">Ativa</span></div>
          <div class="row plain"><div class="row-main"><div class="row-title">Pedir código ao abrir</div></div><span class="switch" role="img" aria-label="Ligado"></span></div>
          <div class="row plain"><div class="row-main"><div class="row-title">Bloquear após</div></div><span class="val-text">1 minuto</span></div>
          <div class="row plain"><div class="row-main"><div class="row-title">Funciona sem internet</div><div class="row-sub">Nenhum dado é enviado para servidores</div></div><span class="val-text">Sim</span></div>
        </div>
      </div>

      <div class="section"><div class="section-head"><h2 class="section-title">Aparência</h2></div>
        <div class="list"><div class="row plain"><div class="row-main"><div class="row-title">Tema</div></div>
          <div class="seg">${['auto', 'light', 'dark'].map((t) => `<button class="${theme === t ? 'on' : ''}" data-theme-set="${t}">${{ auto: 'Auto', light: 'Claro', dark: 'Escuro' }[t]}</button>`).join('')}</div>
        </div></div>
      </div>

      <div class="section"><div class="section-head"><h2 class="section-title">Dados</h2></div>
        <div class="list">
          <button class="row plain row-btn" data-action="soon"><div class="row-main"><div class="row-title">Categorias e regras</div><div class="row-sub">Ex.: “IFD*” sempre vira Delivery</div></div>${icon('chevron')}</button>
          <button class="row plain row-btn" data-action="soon"><div class="row-main"><div class="row-title">Backup criptografado</div><div class="row-sub">Arquivo .caderno para guardar no iCloud Drive</div></div>${icon('chevron')}</button>
          <button class="row plain row-btn" data-action="lock"><div class="row-main"><div class="row-title">Bloquear agora</div></div>${icon('lock')}</button>
          <button class="row plain row-btn" data-action="soon"><div class="row-main"><div class="row-title danger">Apagar todos os dados</div></div></button>
        </div>
      </div>
      <p class="empty-hint">Caderno · versão 0.1</p>`;
  },
};

/* ---------- Sheets ---------- */
const sheets = {
  import: () => `<h2>Importar extrato</h2>
    <p class="page-sub">Os lançamentos são lidos e organizados por categoria automaticamente.</p>
    <div class="drop">${icon('upload')}<p>Escolha o arquivo exportado pelo banco ou corretora</p>
      <button class="btn primary" data-action="soon">Escolher arquivo</button></div>
    <div class="formats">${['PDF', 'XLSX', 'CSV', 'OFX', 'TXT', 'MD', 'DOCX'].map((f) => `<span class="ext">${f}</span>`).join('')}</div>
    <p class="note">${icon('lock')} O arquivo é lido aqui no iPhone. Nada é enviado para a internet.</p>
    <div class="section" style="margin-top:20px"><div class="section-head"><h2 class="section-title">Importados recentemente</h2></div>
      <div class="list">
        <div class="row plain"><div class="row-main"><div class="row-title">extrato-nubank-out.ofx</div><div class="row-sub">34 lançamentos · 28 out</div></div><span class="val-text">${icon('check')}</span></div>
        <div class="row plain"><div class="row-main"><div class="row-title">fatura-itau-set.pdf</div><div class="row-sub">41 lançamentos · 02 out</div></div><span class="val-text">${icon('check')}</span></div>
      </div></div>`,
  tx: (id) => {
    const t = db.transactions.find((x) => x.id === Number(id));
    return `<div style="display:flex;gap:12px;align-items:center;margin-bottom:16px">${avatar(t.merchant, t.cat)}<div><h2 style="margin:0">${esc(t.merchant)}</h2><span class="row-sub">${t.date.getDate()} de ${MONTHS[t.date.getMonth()]} · ${WEEKDAYS[t.date.getDay()]}</span></div></div>
      <div class="hero-value" style="margin-bottom:16px">−${money(t.amount)}</div>
      <div class="section-head"><h2 class="section-title">Categoria</h2></div>
      <div class="chips" style="flex-wrap:wrap;margin:0;padding:0 0 16px">${Object.entries(CATS).map(([k, c]) => `<button class="chip${k === t.cat ? ' on' : ''}" style="--cat:${c.color}" data-action="set-cat" data-id="${t.id}" data-cat="${k}"><i></i>${c.name}</button>`).join('')}</div>
      <p class="note">${icon('info')} Ao mudar a categoria, os próximos lançamentos de “${esc(t.merchant)}” seguem a mesma regra.</p>
      <div style="margin-top:16px"><button class="btn block" data-action="close-sheet">Fechar</button></div>`;
  },
};

/* ---------- Router e eventos ---------- */
const $ = (s) => document.querySelector(s);
function render() {
  const [route, query] = (location.hash.slice(1) || 'inicio').split('?');
  const id = views[route] ? route : 'inicio';
  $('#view').innerHTML = views[id](new URLSearchParams(query || ''));
  const nav = ROUTES.map((r) => `<a href="#${r.id}" class="${r.id === id ? 'active' : ''}">${icon(r.icon)}<span>${r.label}</span></a>`).join('');
  $('.tabbar').innerHTML = nav;
  $('.side-nav').innerHTML = nav + `<a href="#ajustes" class="${id === 'ajustes' ? 'active' : ''}">${icon('gear')}<span>Ajustes</span></a>`;
  hydrateIcons();
}
window.addEventListener('hashchange', () => { render(); window.scrollTo(0, 0); });

function openSheet(name, arg) {
  $('#sheet-body').innerHTML = sheets[name](arg);
  $('#sheet').hidden = false;
}
const closeSheet = () => { $('#sheet').hidden = true; };

let toastTimer;
function toast(msg) {
  const el = $('#toast');
  el.textContent = msg; el.hidden = false;
  clearTimeout(toastTimer); toastTimer = setTimeout(() => { el.hidden = true; }, 2200);
}

document.addEventListener('click', (e) => {
  const chip = e.target.closest('[data-filter]');
  if (chip) { location.hash = `gastos?f=${chip.dataset.filter}`; return; }
  const th = e.target.closest('[data-theme-set]');
  if (th) { setTheme(th.dataset.themeSet); render(); return; }
  const a = e.target.closest('[data-action]');
  if (!a) return;
  const act = a.dataset.action;
  if (act === 'import') openSheet('import');
  else if (act === 'close-sheet') closeSheet();
  else if (act === 'tx') openSheet('tx', a.dataset.id);
  else if (act === 'set-cat') {
    db.transactions.find((t) => t.id === Number(a.dataset.id)).cat = a.dataset.cat;
    openSheet('tx', a.dataset.id); render();
  } else if (act === 'add-sub') {
    const sg = db.suggestions.shift();
    if (sg) db.subscriptions.push({ name: sg.name, cat: 'assinaturas', amount: sg.amount, day: 18, since: 'ago 2026' });
    render(); toast(`${sg ? sg.name : 'Assinatura'} adicionada`);
  } else if (act === 'dismiss-sub') { db.suggestions.shift(); render(); }
  else if (act === 'toggle-table') {
    const t = a.closest('.card').querySelector('.data-table');
    t.hidden = !t.hidden; a.textContent = t.hidden ? 'Ver tabela' : 'Ocultar tabela';
  } else if (act === 'lock') lock();
  else toast('Disponível na próxima etapa');
});

document.addEventListener('input', (e) => {
  if (e.target.dataset.action !== 'search') return;
  const p = new URLSearchParams((location.hash.split('?')[1]) || '');
  p.set('q', e.target.value);
  history.replaceState(null, '', `#gastos?${p}`);
  const pos = e.target.selectionStart;
  render();
  const input = document.querySelector('[data-action="search"]');
  input.focus(); input.setSelectionRange(pos, pos);
});

/* tooltip: hover no desktop, toque no iPhone */
const tip = $('#tooltip');
function showTip(el, x, y) {
  const [title, ...lines] = el.dataset.tip.split('|');
  tip.innerHTML = `${esc(title)}<strong>${esc(lines[0] || '')}</strong>${lines.slice(1).map((l) => `<div>${esc(l)}</div>`).join('')}`;
  tip.hidden = false;
  const r = tip.getBoundingClientRect();
  tip.style.left = `${Math.min(window.innerWidth - r.width - 8, Math.max(8, x - r.width / 2))}px`;
  tip.style.top = `${Math.max(8, y - r.height - 14)}px`;
}
document.addEventListener('pointermove', (e) => {
  const el = e.target.closest('[data-tip]');
  if (el && e.pointerType === 'mouse') showTip(el, e.clientX, e.clientY); else if (e.pointerType === 'mouse') tip.hidden = true;
});
document.addEventListener('pointerdown', (e) => {
  const el = e.target.closest('[data-tip]');
  if (el && e.pointerType !== 'mouse') showTip(el, e.clientX, e.clientY); else if (e.pointerType !== 'mouse') tip.hidden = true;
});
window.addEventListener('scroll', () => { tip.hidden = true; }, { passive: true });

/* tema */
function setTheme(t) {
  if (t === 'auto') delete document.documentElement.dataset.theme; else document.documentElement.dataset.theme = t;
  try { localStorage.setItem('caderno-theme', t); } catch (_) { /* modo privado */ }
}
try { const t = localStorage.getItem('caderno-theme'); if (t && t !== 'auto') document.documentElement.dataset.theme = t; } catch (_) { /* sem storage */ }

/* ---------- Bloqueio (demo: qualquer código de 4 dígitos) ---------- */
let pin = '';
function paintPin() { document.querySelectorAll('.pin-dots i').forEach((d, i) => d.classList.toggle('on', i < pin.length)); }
function lock() { pin = ''; paintPin(); $('#lock').hidden = false; $('#app').hidden = true; closeSheet(); }
function unlock() { $('#lock').hidden = true; $('#app').hidden = false; render(); }
$('.keypad').addEventListener('click', (e) => {
  const k = e.target.closest('button')?.dataset.k;
  if (!k) return;
  if (k === 'del') pin = pin.slice(0, -1); else if (pin.length < 4) pin += k;
  paintPin();
  if (pin.length === 4) setTimeout(unlock, 180);
});
document.addEventListener('keydown', (e) => {
  if ($('#lock').hidden) return;
  if (/^\d$/.test(e.key) && pin.length < 4) { pin += e.key; paintPin(); if (pin.length === 4) setTimeout(unlock, 180); }
  if (e.key === 'Backspace') { pin = pin.slice(0, -1); paintPin(); }
});

hydrateIcons();
if (new URLSearchParams(location.search).has('demo')) unlock();

/* offline */
if ('serviceWorker' in navigator && location.protocol !== 'file:') navigator.serviceWorker.register('sw.js').catch(() => {});
