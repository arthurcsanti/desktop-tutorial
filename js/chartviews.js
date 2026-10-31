// Gráficos e detalhamento de gastos: por dia, ritmo do mês, dia da semana,
// calendário de calor, categorias ao longo dos meses e maiores gastos.
// Tocar num dia (barra ou calendário) abre os lançamentos daquele dia.
import { CATS } from './categorize.js';
import { mkOf, shiftMonth, monthName, monthShort, monthLabel, summary, MONTHS } from './analysis.js';
import { icon, money, moneyShort, pct, esc, dateOf, avatar, typeTag, WEEKDAYS } from './ui.js';

const W = 340;
const WD_SHORT = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];

const daysIn = (mk) => new Date(+mk.slice(0, 4), +mk.slice(5), 0).getDate();
const dayIso = (mk, d) => `${mk}-${String(d).padStart(2, '0')}`;
const dayLabel = (iso) => { const d = dateOf(iso); return `${d.getDate()} de ${MONTHS[d.getMonth()]}`; };
const href = (params) => {
  const q = new URLSearchParams(Object.entries(params).filter(([, v]) => v)).toString();
  return `#graficos${q ? `?${q}` : ''}`;
};

// Gasto líquido de um lançamento: compra soma, reembolso abate.
const spend = (t) => (t.type === 'out' ? t.amount : t.type === 'refund' ? -t.amount : 0);

function txOf(data, mk, cat) {
  return data.tx.filter((t) => mkOf(t.date) === mk && (t.type === 'out' || t.type === 'refund') && (!cat || t.cat === cat));
}

function perDay(data, mk, cat) {
  const n = daysIn(mk);
  const days = Array.from({ length: n }, (_, i) => ({ iso: dayIso(mk, i + 1), total: 0, count: 0 }));
  txOf(data, mk, cat).forEach((t) => {
    const d = days[+t.date.slice(8) - 1];
    if (!d) return;
    d.total += spend(t);
    if (t.type === 'out') d.count++;
  });
  return days;
}

// Até que dia o mês "existe": hoje no mês atual, o mês inteiro nos anteriores.
function lastDay(mk) {
  const now = new Date();
  const cur = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  if (mk === cur) return now.getDate();
  return mk > cur ? 0 : daysIn(mk);
}

/* ---------- desenho ---------- */

function barsSvg(items, { height = 150, highlight = -1, avg = 0, label }) {
  const H = height, top = 22, bottom = 22;
  const gap = items.length > 20 ? 2 : items.length > 8 ? 6 : 12;
  const bw = (W - gap * (items.length - 1)) / items.length;
  const max = Math.max(1, ...items.map((d) => d.value));
  const y = (v) => top + (H - top - bottom) * (1 - Math.max(0, v) / max);
  const r = Math.min(3, bw / 2);
  let out = '';
  items.forEach((d, i) => {
    const x = i * (bw + gap);
    if (d.value > 0) {
      const yy = Math.min(y(d.value), H - bottom - r);
      out += `<path class="bar${i === highlight ? ' current' : ''}" d="M${x},${H - bottom} V${yy + r} Q${x},${yy} ${x + r},${yy} H${x + bw - r} Q${x + bw},${yy} ${x + bw},${yy + r} V${H - bottom} Z"/>`;
    }
    if (d.axis) out += `<text class="axis${i === highlight ? ' cur' : ''}" x="${x + bw / 2}" y="${H - 6}" text-anchor="middle">${d.axis}</text>`;
    if (i === highlight && d.value > 0) out += `<text class="val" x="${Math.min(W - 24, Math.max(24, x + bw / 2))}" y="${y(d.value) - 7}" text-anchor="middle">${moneyShort(d.value)}</text>`;
    const hit = `<rect class="hit" x="${x - gap / 2}" y="0" width="${bw + gap}" height="${H}" data-tip="${esc(d.tip)}|${money(d.value)}${d.sub ? `|${esc(d.sub)}` : ''}"${d.href ? ` data-href="${d.href}"` : ''}/>`;
    out += hit;
  });
  const avgLine = avg ? `<line class="grid" x1="0" x2="${W}" y1="${y(avg)}" y2="${y(avg)}" stroke-dasharray="2 4"/>` : '';
  return `<div class="chart"><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(label)}">${avgLine}<line class="grid" x1="0" x2="${W}" y1="${H - bottom}" y2="${H - bottom}"/>${out}</svg></div>`;
}

/** Linhas. series: [{ name, values: [n|null], color, dashed, area }]; labels: rótulos do eixo x. */
function lineSvg(series, labels, { height = 160, label, tips }) {
  const H = height, top = 18, bottom = 22, n = labels.length;
  const all = series.flatMap((s) => s.values).filter((v) => v != null);
  const max = Math.max(1, ...all);
  const x = (i) => (n === 1 ? W / 2 : (i * W) / (n - 1));
  const y = (v) => top + (H - top - bottom) * (1 - Math.max(0, v) / max);
  let out = '';
  series.forEach((s) => {
    let d = '';
    let started = false;
    let lastI = -1;
    s.values.forEach((v, i) => {
      if (v == null) { started = false; return; }
      d += `${started ? 'L' : 'M'}${x(i).toFixed(1)},${y(v).toFixed(1)} `;
      started = true;
      lastI = i;
    });
    if (s.area && lastI > 0) {
      const firstI = s.values.findIndex((v) => v != null);
      out += `<path class="line-area" style="--ln:${s.color}" d="${d}L${x(lastI).toFixed(1)},${H - bottom} L${x(firstI).toFixed(1)},${H - bottom} Z"/>`;
    }
    out += `<path class="line${s.dashed ? ' dashed' : ''}" style="--ln:${s.color}" d="${d}"/>`;
    if (lastI >= 0 && !s.dashed) out += `<circle class="line-dot" style="--ln:${s.color}" cx="${x(lastI)}" cy="${y(s.values[lastI])}" r="3.5"/>`;
  });
  const step = Math.ceil(n / 7);
  labels.forEach((l, i) => {
    if (i % step === 0 || i === n - 1) out += `<text class="axis" x="${x(i)}" y="${H - 6}" text-anchor="${i === 0 ? 'start' : i === n - 1 ? 'end' : 'middle'}">${l}</text>`;
  });
  const slot = W / Math.max(1, n - 1);
  labels.forEach((l, i) => {
    out += `<rect class="hit" x="${x(i) - slot / 2}" y="0" width="${slot}" height="${H}" data-tip="${esc(tips[i])}"/>`;
  });
  return `<div class="chart"><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(label)}"><line class="grid" x1="0" x2="${W}" y1="${H - bottom}" y2="${H - bottom}"/>${out}</svg></div>`;
}

const legend = (items) => `<div class="legend">${items.map((s) => `<span style="--ln:${s.color}"><i class="${s.dashed ? 'dashed' : ''}"></i>${esc(s.name)}</span>`).join('')}</div>`;

/* ---------- cartões ---------- */

function dailyCard(days, upTo, mk, cat) {
  const active = days.slice(0, upTo || days.length);
  const spentDays = active.filter((d) => d.total > 0);
  const maxI = days.reduce((b, d, i) => (d.total > (days[b]?.total ?? -1) ? i : b), 0);
  const total = active.reduce((a, d) => a + d.total, 0);
  const avg = upTo ? total / upTo : 0;
  const items = days.map((d, i) => {
    const wd = dateOf(d.iso).getDay();
    return {
      value: d.total,
      axis: (i + 1) % 5 === 0 || i === 0 ? String(i + 1) : '',
      tip: `${dayLabel(d.iso)} · ${WEEKDAYS[wd]}`,
      sub: d.count ? `${d.count} compra${d.count > 1 ? 's' : ''}` : 'sem gastos',
      href: href({ c: cat, d: d.iso }),
    };
  });
  const top = days[maxI];
  return `<div class="section"><div class="section-head"><h2 class="section-title">Gasto por dia</h2></div>
    <div class="card">
      ${top && top.total > 0 ? `<p class="chart-lead">${icon('flag')}<span>O dia em que você mais gastou foi <b>${WEEKDAYS[dateOf(top.iso).getDay()]}, ${dayLabel(top.iso)}</b>: ${money(top.total)} em ${top.count} compra${top.count > 1 ? 's' : ''}.</span></p>` : ''}
      ${barsSvg(items, { highlight: top && top.total > 0 ? maxI : -1, avg, label: 'Gasto por dia do mês' })}
      <div class="chart-foot"><span>Média por dia: ${money(avg)} <span class="dash-key"></span></span><span>Toque num dia para ver as compras</span></div>
      <div class="mini-stats">
        <div><strong>${spentDays.length}</strong><span>dias com gastos</span></div>
        <div><strong>${Math.max(0, (upTo || 0) - spentDays.length)}</strong><span>dias sem gastar</span></div>
        <div><strong>${money(total)}</strong><span>no total</span></div>
      </div>
    </div></div>`;
}

function dayDetail(data, iso, cat) {
  const list = data.tx.filter((t) => t.date === iso && (!cat || t.cat === cat)).sort((a, b) => b.amount - a.amount);
  const total = list.reduce((a, t) => a + spend(t), 0);
  const d = dateOf(iso);
  return `<div class="card day-detail" id="dia">
    <div class="spread"><strong>${WEEKDAYS[d.getDay()]}, ${dayLabel(iso)}</strong><a class="link" href="${href({ c: cat })}">Fechar</a></div>
    <p class="page-sub" style="margin:2px 0 8px">${money(total)} em ${list.filter((t) => t.type === 'out').length} gasto${list.length === 1 ? '' : 's'}${cat ? ` de ${CATS[cat]?.name || cat}` : ''}</p>
    ${list.length ? `<div class="list">${list.map((t) => `
      <button class="row row-btn" data-action="tx" data-id="${t.id}">${avatar(t.merchant, t.type === 'out' ? t.cat : 'saude')}
        <div class="row-main"><div class="row-title">${esc(t.merchant)}</div><div class="row-sub">${typeTag(t)}</div></div>
        <div class="row-amt ${t.type === 'out' ? '' : 'in'}">${t.type === 'out' ? '−' : '+'}${money(t.amount)}</div></button>`).join('')}</div>` : '<p class="empty-hint">Nenhum lançamento neste dia.</p>'}
  </div>`;
}

function paceCard(data, mk, cat) {
  const prev = shiftMonth(mk, -1);
  const upTo = lastDay(mk);
  const cum = (days, limit) => { let a = 0; return days.map((d, i) => (i < limit ? (a += d.total) : null)); };
  const cur = cum(perDay(data, mk, cat), upTo);
  const prevDays = perDay(data, prev, cat);
  const old = cum(prevDays, prevDays.length);
  const n = Math.max(cur.length, old.length);
  const pad = (arr) => Array.from({ length: n }, (_, i) => (i < arr.length ? arr[i] : null));
  const curP = pad(cur), oldP = pad(old);
  const labels = Array.from({ length: n }, (_, i) => String(i + 1));
  const tips = labels.map((l, i) => `Dia ${l}|${monthShort(mk)}: ${curP[i] != null ? money(curP[i]) : '—'}|${monthShort(prev)}: ${oldP[i] != null ? money(oldP[i]) : '—'}`);
  const series = [
    { name: monthName(prev), values: oldP, color: 'var(--c0)', dashed: true },
    { name: monthName(mk), values: curP, color: 'var(--c1)', area: true },
  ];
  const at = upTo ? curP[upTo - 1] : null;
  const before = upTo ? oldP[Math.min(upTo, oldP.length) - 1] : null;
  let lead = '';
  if (at != null && before) {
    const diff = (at - before) / before;
    lead = `No dia ${upTo} você tinha gasto ${money(at)}. Em ${monthName(prev).toLowerCase()}, no mesmo dia, eram ${money(before)} (${diff >= 0 ? '+' : '−'}${pct(Math.abs(diff))}).`;
  }
  return `<div class="section"><div class="section-head"><h2 class="section-title">Ritmo do mês</h2></div>
    <div class="card">
      ${lead ? `<p class="chart-lead">${icon('trend')}<span>${lead}</span></p>` : ''}
      ${lineSvg(series, labels, { label: 'Gasto acumulado no mês comparado ao mês anterior', tips })}
      ${legend(series.slice().reverse())}
    </div></div>`;
}

function weekdayCard(days, upTo) {
  const sums = Array(7).fill(0), counts = Array(7).fill(0);
  days.slice(0, upTo || 0).forEach((d) => { const w = dateOf(d.iso).getDay(); sums[w] += d.total; counts[w]++; });
  const avgs = sums.map((s, i) => (counts[i] ? s / counts[i] : 0));
  const maxI = avgs.reduce((b, v, i) => (v > avgs[b] ? i : b), 0);
  const items = avgs.map((v, i) => ({ value: v, axis: WD_SHORT[i], tip: `${WEEKDAYS[i]} (média)`, sub: `${counts[i]} ${WEEKDAYS[i]}${counts[i] === 1 ? '' : 's'} no mês` }));
  if (!avgs[maxI]) return '';
  return `<div class="section"><div class="section-head"><h2 class="section-title">Por dia da semana</h2></div>
    <div class="card">
      <p class="chart-lead">${icon('calendar')}<span>Você gasta mais ${maxI === 0 || maxI === 6 ? 'aos' : 'às'} <b>${WEEKDAYS[maxI]}s</b>: ${money(avgs[maxI])} em média.</span></p>
      ${barsSvg(items, { highlight: maxI, height: 130, label: 'Média de gasto por dia da semana' })}
    </div></div>`;
}

function heatCard(days, upTo, mk, cat, selected) {
  const max = Math.max(1, ...days.map((d) => d.total));
  const first = dateOf(days[0].iso).getDay();
  const cells = Array(first).fill('<span class="heat-cell blank"></span>').concat(days.map((d, i) => {
    const level = d.total > 0 ? Math.max(0.12, d.total / max) : 0;
    const future = upTo && i >= upTo;
    return `<a class="heat-cell${future ? ' future' : ''}${d.iso === selected ? ' sel' : ''}" href="${href({ c: cat, d: d.iso })}" style="--lv:${level.toFixed(2)}" data-tip="${dayLabel(d.iso)} · ${WEEKDAYS[dateOf(d.iso).getDay()]}|${money(d.total)}"><span>${i + 1}</span></a>`;
  }));
  return `<div class="section"><div class="section-head"><h2 class="section-title">Calendário de gastos</h2></div>
    <div class="card">
      <div class="heat-grid">${WD_SHORT.map((w) => `<span class="heat-wd">${w}</span>`).join('')}${cells.join('')}</div>
      <div class="heat-key"><span>menos</span><i style="--lv:.12"></i><i style="--lv:.4"></i><i style="--lv:.7"></i><i style="--lv:1"></i><span>mais</span></div>
    </div></div>`;
}

function categoryTrendCard(data, mk, cat) {
  const n = 6;
  const mks = Array.from({ length: n }, (_, i) => shiftMonth(mk, i - n + 1));
  const total = (m, c) => data.tx.filter((t) => mkOf(t.date) === m && t.cat === c).reduce((a, t) => a + spend(t), 0);
  let cats;
  if (cat) cats = [cat];
  else {
    const sums = {};
    data.tx.filter((t) => mks.includes(mkOf(t.date)) && t.type === 'out' && !CATS[t.cat]?.unknown).forEach((t) => { sums[t.cat] = (sums[t.cat] || 0) + t.amount; });
    cats = Object.entries(sums).sort((a, b) => b[1] - a[1]).slice(0, 4).map(([c]) => c);
  }
  if (!cats.length) return '';
  const series = cats.map((c) => ({ name: CATS[c]?.name || c, values: mks.map((m) => Math.max(0, total(m, c))), color: CATS[c]?.color || 'var(--c0)' }));
  const tips = mks.map((m, i) => [monthLabel(m), ...series.map((s) => `${s.name}: ${money(s.values[i])}`)].join('|'));
  const peaks = series.map((s) => {
    const i = s.values.reduce((b, v, k) => (v > s.values[b] ? k : b), 0);
    return s.values[i] ? `<li><i style="--ln:${s.color}"></i><span>Mais gasto com <b>${esc(s.name)}</b> em <b>${monthName(mks[i]).toLowerCase()}</b>: ${money(s.values[i])}</span></li>` : '';
  }).join('');
  return `<div class="section"><div class="section-head"><h2 class="section-title">${cat ? `${esc(CATS[cat]?.name || cat)} nos últimos meses` : 'Categorias nos últimos meses'}</h2></div>
    <div class="card">
      ${lineSvg(series, mks.map(monthShort), { label: 'Gasto por categoria nos últimos 6 meses', tips })}
      ${series.length > 1 ? legend(series) : ''}
      <ul class="peaks">${peaks}</ul>
    </div></div>`;
}

function categoryShareCard(s, mk) {
  if (!s.cats.length) return '';
  const total = s.total || 1;
  return `<div class="section"><div class="section-head"><h2 class="section-title">Para onde foi o dinheiro</h2></div>
    <div class="card">
      <div class="stack">${s.cats.map((c) => `<div style="--cat:${CATS[c.id]?.color};flex:${c.value}" data-tip="${CATS[c.id]?.name || c.id}|${money(c.value)} · ${pct(c.value / total)}"></div>`).join('')}</div>
      <div class="share-list">${s.cats.map((c) => `<a href="${href({ c: c.id })}" style="--cat:${CATS[c.id]?.color}"><i></i><span>${CATS[c.id]?.name || c.id}</span><b>${pct(c.value / total)}</b><em>${money(c.value)}</em></a>`).join('')}</div>
    </div></div>`;
}

function biggestCard(data, mk, cat) {
  const list = txOf(data, mk, cat).filter((t) => t.type === 'out').sort((a, b) => b.amount - a.amount).slice(0, 8);
  if (!list.length) return '';
  return `<div class="section"><div class="section-head"><h2 class="section-title">Maiores gastos do mês</h2></div>
    <div class="list">${list.map((t, i) => `
      <button class="row row-btn" data-action="tx" data-id="${t.id}"><span class="rank">${i + 1}</span>
        <div class="row-main"><div class="row-title">${esc(t.merchant)}</div><div class="row-sub">${typeTag(t)}<span class="hash">${dayLabel(t.date)}</span></div></div>
        <div class="row-amt">−${money(t.amount)}</div></button>`).join('')}</div></div>`;
}

/* ---------- tela ---------- */

export function chartsView({ data, mk, params, topbar, emptyState }) {
  if (!data.tx.length) return `${topbar()}<h1 class="page-title">Gráficos</h1>${emptyState('Sem lançamentos ainda', 'Importe um extrato para ver seus gastos em gráficos.')}`;
  const cat = CATS[params.get('c')] ? params.get('c') : '';
  const sel = /^\d{4}-\d{2}-\d{2}$/.test(params.get('d') || '') && mkOf(params.get('d')) === mk ? params.get('d') : '';
  const s = summary(data, mk);
  const days = perDay(data, mk, cat);
  const upTo = lastDay(mk);
  const chips = [`<a class="chip${!cat ? ' on' : ''}" href="${href({})}">Todos</a>`]
    .concat(s.cats.map((c) => `<a class="chip${cat === c.id ? ' on' : ''}" href="${href({ c: c.id })}" style="--cat:${CATS[c.id]?.color}"><i></i>${CATS[c.id]?.name || c.id}</a>`)).join('');
  const spent = days.slice(0, upTo || days.length).reduce((a, d) => a + d.total, 0);
  return `${topbar()}
    <h1 class="page-title">Gráficos</h1>
    <p class="page-sub">${cat ? `${esc(CATS[cat]?.name)} · ` : ''}${money(spent)} em ${monthName(mk).toLowerCase()}</p>
    <div class="chips">${chips}</div>
    ${dailyCard(days, upTo, mk, cat)}
    ${sel ? dayDetail(data, sel, cat) : ''}
    ${paceCard(data, mk, cat)}
    ${weekdayCard(days, upTo)}
    ${heatCard(days, upTo, mk, cat, sel)}
    ${categoryTrendCard(data, mk, cat)}
    ${cat ? '' : categoryShareCard(s, mk)}
    ${biggestCard(data, mk, cat)}`;
}
