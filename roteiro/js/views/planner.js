// Planejamento: calendário de publicação, ordem (fila) de publicação e
// campanhas com objetivo, período, plataformas e metas. As publicações
// moram na aba "Publicações" de cada roteiro; as campanhas são documentos
// próprios (um .md cada), então tudo continua em Markdown.

import { h, state, app, touch, ask, toast, scripts, campaigns, isoDate, parseIso, addDays, fmtDay, download } from '../core.js';
import { PLATFORMS, POST_STATUSES, OBJECTIVES, METRICS, newPost, makeTab, platformOf, buildCampaign, withCurrent } from '../model.js';
import { stamp } from './publicacoes.js';

const WEEKDAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const cap = (t) => t.charAt(0).toUpperCase() + t.slice(1);
const MODES = [['calendario', 'Calendário'], ['fila', 'Ordem de publicação'], ['campanhas', 'Campanhas']];

// ---------- dados ----------

export function allPosts() {
  const out = [];
  for (const s of scripts()) {
    for (const tab of s.tabs) if (tab.type === 'publicacoes') for (const p of tab.posts) out.push({ p, s, tab });
  }
  return out;
}

const byWhen = (a, b) => (a.p.date || '9999').localeCompare(b.p.date || '9999') || (a.p.time || '99').localeCompare(b.p.time || '99');

function visiblePosts() {
  const pf = state.planner.platform;
  return allPosts().filter((x) => !pf || x.p.platform === pf);
}

export function nextFreeDate(platform, from = isoDate()) {
  const taken = new Set(allPosts().filter((x) => x.p.platform === platform).map((x) => x.p.date));
  let d = from;
  while (taken.has(d)) d = addDays(d, 1);
  return d;
}

function openPost({ s, tab }) {
  s.activeTab = tab.id;
  app.openScript(s.id);
}

const num = (v) => parseFloat(String(v || '').replace(/\./g, '').replace(',', '.')) || 0;
const fmtNum = (n) => n.toLocaleString('pt-BR');

export function campaignSummary(c) {
  const posts = allPosts().filter((x) => x.p.campaign && x.p.campaign === c.title).sort(byWhen);
  const published = posts.filter((x) => x.p.status === 'Publicado').length;
  const totals = Object.fromEntries(METRICS.map(([k]) => [k, posts.reduce((a, x) => a + num(x.p[k]), 0)]));
  let metasPct = null;
  const metas = c.tabs.find((t) => t.type === 'tabela' && t.columns.some((col) => /^meta$/i.test(col.name)));
  if (metas) {
    const goal = metas.columns.find((col) => /^meta$/i.test(col.name));
    const res = metas.columns.find((col) => /^resultado/i.test(col.name));
    const rows = metas.rows.filter((r) => num(r.cells[goal.id]) > 0);
    if (res && rows.length) metasPct = rows.reduce((a, r) => a + Math.min(1, num(r.cells[res.id]) / num(r.cells[goal.id])), 0) / rows.length;
  }
  return { posts, published, total: posts.length, totals, metasPct };
}

// ---------- agendar ----------

async function schedule(date = isoDate(), scriptId = '') {
  const list = scripts().sort((a, b) => b.updatedAt - a.updatedAt);
  const combos = PLATFORMS.flatMap((p) => p.formats.map((f) => ({ value: `${p.id}|${f}`, label: `${p.id} · ${f}` })));
  const r = await ask('Agendar publicação', [
    {
      name: 'script', label: 'Roteiro', type: 'select', value: scriptId || '__new',
      options: [{ value: '__new', label: '+ Novo roteiro…' }, ...list.map((s) => ({ value: s.id, label: s.title || 'Sem título' }))],
      onChange: (v, inputs) => { const row = inputs.find((x) => x.f.name === 'title')?.input.closest('label'); if (row) row.hidden = v !== '__new'; },
    },
    { name: 'title', label: 'Título do novo roteiro', placeholder: 'ex.: 5 erros ao filmar com celular' },
    { name: 'combo', label: 'Plataforma e formato', type: 'select', value: state.planner.platform ? combos.find((c) => c.value.startsWith(state.planner.platform + '|'))?.value : 'YouTube|Vídeo', options: combos },
    { name: 'date', label: 'Data', type: 'date', value: date },
    { name: 'time', label: 'Hora (opcional)', type: 'time' },
    { name: 'campaign', label: 'Campanha', type: 'select', value: '', options: [{ value: '', label: '—' }, ...campaigns().map((c) => ({ value: c.title, label: c.title || 'Sem título' }))] },
    { name: 'status', label: 'Status', type: 'select', value: 'Planejado', options: POST_STATUSES },
  ], { ok: 'Agendar' });
  if (!r) return;
  const [platform, format] = r.combo.split('|');
  let s = state.scripts.get(r.script);
  if (!s) {
    const short = /Short|Reels|TikTok|Vídeo/.test(format) && platform !== 'YouTube';
    s = await app.createScript(short || format === 'Short' ? 'curto' : 'youtube-3-atos', { title: r.title || 'Sem título', open: false });
  }
  let tab = s.tabs.find((t) => t.type === 'publicacoes');
  if (!tab) { tab = makeTab('Publicações'); tab.posts = []; s.tabs.push(tab); }
  const empty = tab.posts.find((p) => !p.date && !p.link && p.status === 'Planejado');
  const post = empty || newPost();
  Object.assign(post, { platform, format, date: r.date, time: r.time, campaign: r.campaign, status: r.status });
  if (!empty) tab.posts.push(post);
  touch(s);
  state.planner.day = r.date;
  state.planner.month = r.date.slice(0, 7);
  app.showPlanner();
  toast('Publicação agendada.');
}

// ---------- calendário no celular e no computador (.ics) ----------

function icsText(t) {
  return String(t || '').replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');
}

function exportIcs() {
  const items = visiblePosts().filter((x) => x.p.date && x.p.status !== 'Publicado');
  if (!items.length) return toast('Não há publicações futuras com data para exportar.');
  const stampNow = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+Z$/, 'Z');
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Maquina de Roteiro//PT-BR', 'CALSCALE:GREGORIAN', 'X-WR-CALNAME:Publicações'];
  for (const { p, s } of items) {
    const day = p.date.replace(/-/g, '');
    const pl = platformOf(p.platform);
    lines.push('BEGIN:VEVENT', `UID:${p.id}@maquina-de-roteiro`, `DTSTAMP:${stampNow}`);
    if (p.time) lines.push(`DTSTART:${day}T${p.time.replace(':', '')}00`, 'DURATION:PT30M');
    else lines.push(`DTSTART;VALUE=DATE:${day}`, `DTEND;VALUE=DATE:${addDays(p.date, 1).replace(/-/g, '')}`);
    lines.push(
      `SUMMARY:${icsText(`[${pl.abbr} ${p.format}] ${s.title || 'Sem título'}`)}`,
      `DESCRIPTION:${icsText([`Status: ${p.status}`, p.campaign && `Campanha: ${p.campaign}`, p.note].filter(Boolean).join('\n'))}`,
      'BEGIN:VALARM', 'ACTION:DISPLAY', `DESCRIPTION:${icsText('Publicar: ' + (s.title || ''))}`, `TRIGGER:${p.time ? '-PT1H' : '-PT3H'}`, 'END:VALARM',
      'END:VEVENT');
  }
  lines.push('END:VCALENDAR');
  download('publicacoes.ics', lines.join('\r\n') + '\r\n', 'text/calendar');
  toast(`${items.length} publicação(ões) exportadas. Abra o arquivo para adicionar ao calendário.`);
}

// ---------- peças ----------

function chip(x, { compact = false } = {}) {
  const { p, s } = x;
  const pl = platformOf(p.platform);
  const late = p.date && p.date < isoDate() && p.status !== 'Publicado';
  const el = h('button', {
    type: 'button',
    class: `post-chip st-${POST_STATUSES.indexOf(p.status)}` + (late ? ' late' : ''),
    style: { '--pf': pl.color },
    draggable: 'true',
    title: `${pl.id} · ${p.format} — ${s.title || 'Sem título'} (${p.status})${p.campaign ? ' · ' + p.campaign : ''}`,
    onClick: (e) => { e.stopPropagation(); openPost(x); },
  },
  h('span', { class: 'chip-pf' }, pl.abbr),
  compact ? null : h('span', { class: 'chip-title' }, p.time ? p.time + ' ' : '', s.title || 'Sem título'),
  p.status === 'Publicado' ? h('span', { class: 'chip-done' }, '✓') : null);
  el.addEventListener('dragstart', (e) => e.dataTransfer.setData('text/post', p.id));
  return el;
}

function moveTo(postId, date) {
  const x = allPosts().find((y) => y.p.id === postId);
  if (!x || x.p.date === date) return;
  x.p.date = date;
  touch(x.s);
  app.showPlanner();
}

function platformFilter() {
  const used = new Set(allPosts().map((x) => x.p.platform));
  const cur = state.planner.platform;
  const pick = (v) => () => { state.planner.platform = v; app.showPlanner(); };
  return h('div', { class: 'nav-chips pf-filter' },
    h('button', { type: 'button', class: 'tag' + (!cur ? ' active' : ''), onClick: pick('') }, 'Todas'),
    PLATFORMS.filter((p) => used.has(p.id)).map((p) => h('button', { type: 'button', class: 'tag' + (cur === p.id ? ' active' : ''), style: { '--pf': p.color }, onClick: pick(p.id) }, h('span', { class: 'dot' }), p.id)));
}

// ---------- calendário ----------

function calendarView() {
  const pl = state.planner;
  const [y, m] = pl.month.split('-').map(Number);
  const first = new Date(y, m - 1, 1);
  const start = new Date(first);
  start.setDate(1 - first.getDay());
  const today = isoDate();
  const posts = visiblePosts();
  const camps = campaigns().filter((c) => c.campaign?.inicio);
  const days = Array.from({ length: 42 }, (_, i) => { const d = new Date(start); d.setDate(start.getDate() + i); return d; });
  const weeks = [0, 1, 2, 3, 4, 5].filter((w) => w < 5 || days[w * 7].getMonth() === m - 1);

  const cell = (d) => {
    const iso = isoDate(d);
    const items = posts.filter((x) => x.p.date === iso).sort(byWhen);
    const bands = camps.filter((c) => iso >= c.campaign.inicio && iso <= (c.campaign.fim || c.campaign.inicio));
    const el = h('div', {
      class: 'cal-day' + (d.getMonth() !== m - 1 ? ' other' : '') + (iso === today ? ' today' : '') + (iso === pl.day ? ' selected' : ''),
      onClick: () => { pl.day = iso; app.showPlanner(); },
      onDblclick: () => schedule(iso),
    },
    h('div', { class: 'cal-num' }, d.getDate()),
    bands.length ? h('div', { class: 'cal-bands' }, bands.map((c) => h('div', {
      class: 'band', style: { background: c.campaign.cor }, title: c.title,
    }, iso === c.campaign.inicio || d.getDay() === 0 ? c.title : ''))) : null,
    h('div', { class: 'cal-posts' }, items.map((x) => chip(x))));
    el.addEventListener('dragover', (e) => { e.preventDefault(); el.classList.add('drop'); });
    el.addEventListener('dragleave', () => el.classList.remove('drop'));
    el.addEventListener('drop', (e) => { e.preventDefault(); moveTo(e.dataTransfer.getData('text/post'), iso); });
    return el;
  };

  const dayItems = pl.day ? posts.filter((x) => x.p.date === pl.day).sort(byWhen) : [];
  const monthName = cap(first.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }));
  const shift = (n) => () => { const d = new Date(y, m - 1 + n, 1); pl.month = isoDate(d).slice(0, 7); app.showPlanner(); };
  const inMonth = posts.filter((x) => x.p.date?.startsWith(pl.month));

  return h('div', null,
    h('div', { class: 'cal-head' },
      h('div', { class: 'cal-nav' },
        h('button', { type: 'button', class: 'btn btn-ghost', 'aria-label': 'Mês anterior', onClick: shift(-1) }, '‹'),
        h('h2', { class: 'cal-month' }, monthName),
        h('button', { type: 'button', class: 'btn btn-ghost', 'aria-label': 'Próximo mês', onClick: shift(1) }, '›'),
        h('button', { type: 'button', class: 'btn btn-ghost', onClick: () => { pl.month = today.slice(0, 7); pl.day = today; app.showPlanner(); } }, 'Hoje')),
      h('div', { class: 'cal-count' },
        PLATFORMS.map((p) => {
          const n = inMonth.filter((x) => x.p.platform === p.id).length;
          return n ? h('span', { class: 'cal-count-item' }, stamp(p.id), ' ', n) : null;
        }),
        h('span', { class: 'muted' }, `${inMonth.filter((x) => x.p.status === 'Publicado').length}/${inMonth.length} publicados`))),
    h('div', { class: 'cal-grid' },
      WEEKDAYS.map((w) => h('div', { class: 'cal-wd' }, w)),
      weeks.flatMap((w) => days.slice(w * 7, w * 7 + 7).map(cell))),
    pl.day ? h('section', { class: 'day-panel' },
      h('div', { class: 'day-head' },
        h('h3', null, cap(parseIso(pl.day).toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' }))),
        h('button', { type: 'button', class: 'btn btn-stamp', onClick: () => schedule(pl.day) }, '+ Agendar neste dia')),
      dayItems.length ? dayItems.map((x) => queueRow(x)) : h('p', { class: 'muted small' }, 'Nada marcado para este dia. Arraste uma publicação para cá ou toque em "Agendar".')) : null,
    h('p', { class: 'muted small hint' }, 'Toque num dia para ver os detalhes; toque duas vezes para agendar. No computador, arraste as publicações entre os dias.'));
}

// ---------- ordem de publicação ----------

function queueRow(x, { n, list, i } = {}) {
  const { p, s } = x;
  const late = p.date && p.date < isoDate() && p.status !== 'Publicado';
  const statusSel = h('select', { class: 'q-status', 'aria-label': 'Status', onClick: (e) => e.stopPropagation(), onChange: () => { p.status = statusSel.value; touch(s); app.showPlanner(); } },
    withCurrent(POST_STATUSES, p.status).map((st) => h('option', { value: st }, st)));
  statusSel.value = p.status;
  // Trocar de posição na fila troca as datas e horas das duas publicações.
  const swap = (j) => () => {
    const o = list[j];
    if (!o) return;
    [p.date, o.p.date] = [o.p.date, p.date];
    [p.time, o.p.time] = [o.p.time, p.time];
    touch(s);
    touch(o.s);
    app.showPlanner();
  };
  return h('div', { class: 'q-row' + (n != null ? ' has-n' : '') + (late ? ' late' : '') + (p.status === 'Publicado' ? ' done' : ''), style: { '--pf': platformOf(p.platform).color } },
    n != null ? h('span', { class: 'q-n' }, String(n).padStart(2, '0')) : null,
    h('span', { class: 'q-date' }, p.date ? fmtDay(p.date) : 'sem data', p.time ? h('small', null, ' ' + p.time) : null, late ? h('small', { class: 'q-late' }, ' atrasado') : null),
    stamp(p.platform),
    h('span', { class: 'q-format' }, p.format),
    h('button', { type: 'button', class: 'q-title link-btn', onClick: () => openPost(x) }, s.title || 'Sem título'),
    p.campaign ? h('span', { class: 'q-camp' }, p.campaign) : h('span'),
    statusSel,
    list ? h('span', { class: 'q-move' },
      h('button', { type: 'button', class: 'btn btn-ghost btn-mini', title: 'Publicar antes', 'aria-label': 'Publicar antes', onClick: swap(i - 1) }, '↑'),
      h('button', { type: 'button', class: 'btn btn-ghost btn-mini', title: 'Publicar depois', 'aria-label': 'Publicar depois', onClick: swap(i + 1) }, '↓')) : null,
    !p.date ? h('button', { type: 'button', class: 'btn btn-mini', onClick: () => { p.date = nextFreeDate(p.platform); touch(s); app.showPlanner(); } }, 'Agendar') : null,
    p.link ? h('a', { href: p.link, target: '_blank', rel: 'noopener', class: 'open-link' }, '↗') : null);
}

function weekLabel(iso) {
  const d = parseIso(iso);
  const start = new Date(d);
  start.setDate(d.getDate() - d.getDay());
  return 'Semana de ' + start.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
}

function queueView() {
  const today = isoDate();
  const posts = visiblePosts();
  const upcoming = posts.filter((x) => x.p.date && x.p.status !== 'Publicado').sort(byWhen);
  const backlog = posts.filter((x) => !x.p.date && x.p.status !== 'Publicado');
  const done = posts.filter((x) => x.p.status === 'Publicado' && x.p.date >= addDays(today, -60)).sort(byWhen).reverse();
  const noPosts = scripts().filter((s) => !s.tabs.some((t) => t.type === 'publicacoes' && t.posts.length) && s.status !== 'Publicado');

  let lastWeek = '';
  const rows = [];
  upcoming.forEach((x, i) => {
    const wk = weekLabel(x.p.date);
    if (wk !== lastWeek) { rows.push(h('div', { class: 'q-week' }, wk)); lastWeek = wk; }
    rows.push(queueRow(x, { n: i + 1, list: upcoming, i }));
  });

  return h('div', { class: 'queue' },
    h('section', { class: 'q-sec' },
      h('h2', { class: 'part' }, 'Próximas publicações', h('span', { class: 'count' }, upcoming.length)),
      rows.length ? rows : h('p', { class: 'muted small' }, 'Nada agendado. Use "+ Agendar" ou dê data às publicações da fila abaixo.')),
    backlog.length ? h('section', { class: 'q-sec' },
      h('h2', { class: 'part' }, 'Na fila, sem data', h('span', { class: 'count' }, backlog.length)),
      h('div', { class: 'row' }, h('button', {
        type: 'button', class: 'btn',
        onClick: () => { backlog.forEach((x) => { x.p.date = nextFreeDate(x.p.platform); touch(x.s); }); app.showPlanner(); },
      }, 'Distribuir nas próximas datas livres')),
      backlog.map((x) => queueRow(x))) : null,
    noPosts.length ? h('section', { class: 'q-sec' },
      h('h2', { class: 'part' }, 'Roteiros sem publicação planejada', h('span', { class: 'count' }, noPosts.length)),
      noPosts.map((s) => h('div', { class: 'q-row' },
        h('span', { class: 'stamp-mini' }, s.status),
        h('button', { type: 'button', class: 'q-title link-btn', onClick: () => app.openScript(s.id) }, s.title || 'Sem título'),
        h('button', { type: 'button', class: 'btn btn-mini', onClick: () => schedule(isoDate(), s.id) }, 'Agendar')))) : null,
    done.length ? h('section', { class: 'q-sec' },
      h('h2', { class: 'part' }, 'Publicados (últimos 60 dias)', h('span', { class: 'count' }, done.length)),
      done.map((x) => h('div', { class: 'q-done' },
        queueRow(x),
        h('div', { class: 'q-metrics' }, METRICS.filter(([k]) => x.p[k]).map(([k, label]) => h('span', null, `${label}: ${x.p[k]}`)))))) : null);
}

// ---------- campanhas ----------

export async function newCampaign() {
  const r = await ask('Nova campanha', [
    { name: 'title', label: 'Nome', placeholder: 'ex.: Lançamento do curso — novembro' },
    { name: 'objetivo', label: 'Objetivo', type: 'select', value: OBJECTIVES[0], options: OBJECTIVES },
    { name: 'inicio', label: 'Início', type: 'date', value: isoDate() },
    { name: 'fim', label: 'Fim', type: 'date', value: addDays(isoDate(), 30) },
  ], { ok: 'Criar' });
  if (!r) return;
  const c = buildCampaign(r.title || 'Nova campanha');
  Object.assign(c.campaign, { objetivo: r.objetivo, inicio: r.inicio, fim: r.fim });
  c.activeTab = c.tabs[0].id;
  state.scripts.set(c.id, c);
  touch(c);
  app.openScript(c.id);
}

function progress(pct, label) {
  return h('div', { class: 'progress', title: label },
    h('div', { class: 'progress-bar', style: { width: Math.round(pct * 100) + '%' } }),
    h('span', null, label));
}

function campaignCard(c) {
  const sum = campaignSummary(c);
  const k = c.campaign || {};
  const period = [k.inicio && fmtDay(k.inicio), k.fim && fmtDay(k.fim)].filter(Boolean).join(' → ') || 'sem período';
  return h('button', { type: 'button', class: 'camp-card', style: { '--camp': k.cor || '#8a2e1d' }, onClick: () => app.openScript(c.id) },
    h('div', { class: 'camp-top' }, h('span', { class: 'stamp-mini' }, c.status), h('span', { class: 'muted small' }, period)),
    h('div', { class: 'camp-title' }, c.title || 'Sem título'),
    h('div', { class: 'camp-obj' }, k.objetivo || '—'),
    h('div', { class: 'camp-pf' }, (k.plataformas || []).map(stamp)),
    progress(sum.total ? sum.published / sum.total : 0, `${sum.published} de ${sum.total} publicados`),
    sum.metasPct != null ? progress(sum.metasPct, `metas: ${Math.round(sum.metasPct * 100)}%`) : null,
    sum.totals.views ? h('div', { class: 'muted small' }, `${fmtNum(sum.totals.views)} visualizações · ${fmtNum(sum.totals.likes)} curtidas`) : null);
}

function campaignsView() {
  const list = campaigns().sort((a, b) => (a.campaign?.inicio || '9').localeCompare(b.campaign?.inicio || '9'));
  return h('div', null,
    h('p', { class: 'muted small' }, 'Uma campanha junta publicações de várias plataformas em torno de um objetivo e de um período. Ligue as publicações a ela na aba Publicações de cada roteiro.'),
    list.length ? h('div', { class: 'camp-grid' }, list.map(campaignCard))
      : h('div', { class: 'empty-note' }, 'Nenhuma campanha ainda. Crie uma para planejar um lançamento, uma série ou um mês temático.'));
}

// Painel com as publicações e números de uma campanha (aparece no topo do documento da campanha).
export function campaignPanel(c) {
  const sum = campaignSummary(c);
  return h('section', { class: 'camp-panel' },
    h('div', { class: 'camp-panel-head' },
      h('h3', null, 'Publicações da campanha', h('span', { class: 'count' }, sum.total)),
      h('button', { type: 'button', class: 'btn btn-mini', onClick: () => { state.planner.platform = ''; app.showPlanner('calendario', c.campaign?.inicio); } }, 'Ver no calendário')),
    progress(sum.total ? sum.published / sum.total : 0, `${sum.published} de ${sum.total} publicados`),
    sum.metasPct != null ? progress(sum.metasPct, `metas atingidas: ${Math.round(sum.metasPct * 100)}%`) : null,
    h('div', { class: 'camp-totals' }, METRICS.map(([k, label]) => h('div', null, h('b', null, fmtNum(sum.totals[k])), h('span', null, label)))),
    sum.posts.length ? sum.posts.map((x) => queueRow(x))
      : h('p', { class: 'muted small' }, `Nenhuma publicação ligada ainda. Na aba Publicações de um roteiro, escolha a campanha "${c.title}".`));
}

// ---------- tela ----------

export function plannerView() {
  const pl = state.planner;
  pl.month ||= isoDate().slice(0, 7);
  const body = { calendario: calendarView, fila: queueView, campanhas: campaignsView }[pl.mode]();
  return h('div', { class: 'planner' },
    h('div', { class: 'lib-head' },
      h('h1', { class: 'lib-title' }, MODES.find((m) => m[0] === pl.mode)[1]),
      h('div', { class: 'lib-tools' },
        h('div', { class: 'seg seg-dark' }, MODES.map(([v, label]) => h('button', {
          type: 'button', class: 'seg-btn' + (pl.mode === v ? ' active' : ''), onClick: () => app.showPlanner(v),
        }, label))),
        pl.mode === 'campanhas'
          ? h('button', { type: 'button', class: 'btn btn-stamp', onClick: newCampaign }, '+ Campanha')
          : [h('button', { type: 'button', class: 'btn btn-stamp', onClick: () => schedule(pl.day || isoDate()) }, '+ Agendar'),
            h('button', { type: 'button', class: 'btn', title: 'Baixa um arquivo .ics para o app Calendário do celular ou do computador', onClick: exportIcs }, 'Exportar p/ calendário')])),
    pl.mode === 'campanhas' ? null : platformFilter(),
    h('div', { class: 'paper planner-paper' }, body));
}

