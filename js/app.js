// Lastro — interface.
import * as vault from './vault.js';
import { CATS, TYPES, classify, merchantKey, bankCategory, isOwnTransfer, strip } from './categorize.js';
import { readStatement, readInvestments } from './parsers.js';
import { summary, history, months, insights, recurring, subStatus, subsTotal, avgSpend, monthLabel, monthName, monthShort, mkOf, currentMk, MONTHS } from './analysis.js';
import * as exporter from './exports.js';
import { sampleData } from './sample.js';
import { createPlan, PLAN_ROUTES } from './planviews.js';
import * as P from './plan.js';
import * as R from './reminders.js';
import { icon, money, moneyShort, pct, esc, dateOf, uid, $, parseMoneyInput, WEEKDAYS, KINDS, KIND_COLOR, guessKind, avatar, tag, typeTag, heroValue, callout } from './ui.js';


/* ---------- estado ---------- */
const EMPTY = () => ({ v: 1, tx: [], rules: [], subs: [], dismissed: [], inv: [], imports: [], budgets: {}, annual: [], goals: [], accounts: [], bills: [], nwHistory: {}, closed: {}, exported: {}, settings: { income: 0, goalPct: 0.2, lockAfter: 60, hoursMonth: 176 } });
let data = null;
let mk = currentMk();
// grava logo após cada mudança, uma gravação por vez
let saving = Promise.resolve();
function save() {
  const snapshot = data;
  saving = saving.then(() => vault.save(snapshot)).catch(() => toast('Não foi possível salvar'));
  return saving;
}
function normalize(d) {
  const base = EMPTY();
  return { ...base, ...d, settings: { ...base.settings, ...(d?.settings || {}) } };
}
function pickMonth() {
  const ms = months(data);
  mk = ms.includes(currentMk()) || !ms.length ? currentMk() : ms[ms.length - 1];
}


/* ================================================================
   Portão: boas-vindas, criação de código, desbloqueio, recuperação
   ================================================================ */
const gate = $('#lock');
let pinBuf = '';
let pinHandler = null;
let fails = 0;
let waitUntil = 0;
const PIN_LEN = 6;

function keypad() {
  const k = [['1', ''], ['2', 'ABC'], ['3', 'DEF'], ['4', 'GHI'], ['5', 'JKL'], ['6', 'MNO'], ['7', 'PQRS'], ['8', 'TUV'], ['9', 'WXYZ']];
  return `<div class="keypad" role="group" aria-label="Teclado numérico">
    ${k.map(([n, l]) => `<button data-k="${n}">${n}${l ? `<small>${l}</small>` : ''}</button>`).join('')}
    <span></span><button data-k="0">0</button><button data-k="del" class="key-ghost" aria-label="Apagar">Apagar</button></div>`;
}
const dots = () => `<div class="pin-dots" aria-hidden="true">${'<i></i>'.repeat(PIN_LEN)}</div>`;
function paintPin() { gate.querySelectorAll('.pin-dots i').forEach((d, i) => d.classList.toggle('on', i < pinBuf.length)); }
function shake(msg) {
  const d = $('.pin-dots', gate); d.classList.remove('shake'); void d.offsetWidth; d.classList.add('shake');
  if (msg) $('.lock-sub', gate).textContent = msg;
  pinBuf = ''; setTimeout(paintPin, 300);
}
function pinScreen({ title, sub, onDone, extra = '', back }) {
  pinBuf = '';
  pinHandler = onDone;
  gate.innerHTML = `<div class="lock-inner">
    ${back ? `<button class="lock-back link" data-gate="${back}">‹ Voltar</button>` : ''}
    <img class="lock-logo" src="icons/logo.svg" alt="" width="64" height="64">
    <h1 class="lock-title">${title}</h1><p class="lock-sub">${sub}</p>
    ${dots()}${keypad()}${extra}</div>`;
}
function pressKey(k) {
  if (!pinHandler || Date.now() < waitUntil) return;
  if (k === 'del') pinBuf = pinBuf.slice(0, -1); else if (pinBuf.length < PIN_LEN) pinBuf += k;
  paintPin();
  if (pinBuf.length === PIN_LEN) { const p = pinBuf; setTimeout(() => pinHandler(p), 120); }
}
gate.addEventListener('click', (e) => {
  const k = e.target.closest('[data-k]')?.dataset.k;
  if (k) return pressKey(k);
  const g = e.target.closest('[data-gate]')?.dataset.gate;
  if (g) gateAction(g);
});
document.addEventListener('keydown', (e) => {
  if (gate.hidden || !pinHandler || e.target.tagName === 'INPUT') return;
  if (/^\d$/.test(e.key)) pressKey(e.key);
  if (e.key === 'Backspace') pressKey('del');
});

function showGate() { gate.hidden = false; $('#app').hidden = true; closeSheet(); }

async function gateAction(a) {
  if (a === 'welcome') return welcome();
  if (a === 'start') return createPin(true);
  if (a === 'unlock') return unlockScreen();
  if (a === 'forgot') return forgot();
  if (a === 'bio') return bioUnlock();
  if (a === 'recovery') return recoveryInput();
  if (a === 'restore') return restoreBackup();
  if (a === 'wipe') {
    if (!confirm('Apagar todos os dados deste aparelho? Isso não pode ser desfeito.')) return;
    await vault.wipe(); return welcome();
  }
  if (a === 'saved-key') return offerBio();
  if (a === 'enable-bio') {
    try { await vault.enableBio(); toast('Face ID ativado'); } catch { toast('Face ID não foi ativado'); }
    return enterApp();
  }
  if (a === 'skip-bio') return enterApp();
  if (a === 'copy-key') {
    try { await navigator.clipboard.writeText($('.recovery-code', gate).textContent); toast('Chave copiada'); } catch { toast('Selecione e copie a chave'); }
  }
  if (a === 'share-key') {
    const code = $('.recovery-code', gate).textContent;
    try { await navigator.share({ title: 'Chave de recuperação do Lastro', text: code }); } catch { /* cancelado */ }
  }
}

function welcome() {
  pinHandler = null;
  gate.innerHTML = `<div class="lock-inner welcome">
    <img class="lock-logo" src="icons/logo.svg" alt="" width="88" height="88">
    <h1 class="lock-title big">Lastro</h1>
    <p class="lock-sub">Suas finanças, só no seu iPhone.</p>
    <ul class="features">
      <li>${icon('upload')}<div><b>Importe extratos e faturas</b><span>PDF, Excel, CSV, OFX, TXT, MD e Word</span></div></li>
      <li>${icon('repeat')}<div><b>Veja para onde vai o dinheiro</b><span>Categorias, lojas, assinaturas e comparação mês a mês</span></div></li>
      <li>${icon('lock')}<div><b>Privado de verdade</b><span>Funciona offline e guarda tudo criptografado no aparelho</span></div></li>
    </ul>
    <button class="btn primary block" data-gate="start">Começar</button>
    <button class="link lock-link" data-gate="restore">Restaurar de um backup</button>
  </div>`;
}

function createPin(first, onCreated) {
  pinScreen({
    title: first ? 'Crie um código' : 'Novo código',
    sub: 'Seis números para abrir o app',
    back: first ? 'welcome' : undefined,
    onDone: (p1) => pinScreen({
      title: 'Confirme o código', sub: 'Digite de novo',
      onDone: async (p2) => {
        if (p1 !== p2) { createPin(first, onCreated); $('.lock-sub', gate).textContent = 'Os códigos não batem. Tente de novo.'; return; }
        if (onCreated) return onCreated(p1);
        $('.lock-sub', gate).textContent = 'Criando cofre…';
        const code = await vault.create(p1, EMPTY());
        data = EMPTY();
        vault.persist();
        showRecovery(code, true);
      },
    }),
  });
}

function showRecovery(code, onboarding) {
  pinHandler = null;
  gate.hidden = false; $('#app').hidden = true;
  gate.innerHTML = `<div class="lock-inner">
    <div class="gate-ico">${icon('key')}</div>
    <h1 class="lock-title">Chave de recuperação</h1>
    <p class="lock-sub">Se você esquecer o código e o Face ID não funcionar, só esta chave abre seus dados. Guarde num lugar seguro, como o app Senhas ou um papel.</p>
    <div class="recovery-code">${code}</div>
    <div class="row-actions"><button class="btn" data-gate="copy-key">${icon('copy')} Copiar</button><button class="btn" data-gate="share-key">${icon('share')} Compartilhar</button></div>
    <p class="note">${icon('info')} Não existe servidor: ninguém além de você consegue recuperar o acesso.</p>
    <button class="btn primary block" data-gate="${onboarding ? 'saved-key' : 'skip-bio'}">Já guardei</button>
  </div>`;
}

async function offerBio() {
  if (!(await vault.bioAvailable())) return enterApp();
  pinHandler = null;
  gate.innerHTML = `<div class="lock-inner">
    <div class="gate-ico">${icon('faceid')}</div>
    <h1 class="lock-title">Abrir com Face ID?</h1>
    <p class="lock-sub">Mais rápido que digitar o código. Se o Face ID falhar, o iPhone pede o código do aparelho.</p>
    <button class="btn primary block" data-gate="enable-bio">Ativar Face ID</button>
    <button class="link lock-link" data-gate="skip-bio">Agora não</button>
  </div>`;
}

async function unlockScreen(autoBio = false) {
  const meta = await vault.getMeta();
  const bio = !!meta?.bio;
  pinScreen({
    title: 'Lastro',
    sub: 'Digite seu código',
    extra: `<div class="lock-actions">
      ${bio ? `<button class="btn faceid-btn" data-gate="bio">${icon('faceid')} Usar Face ID</button>` : ''}
      <button class="link lock-link" data-gate="forgot">Esqueci o código</button></div>`,
    onDone: async (p) => {
      if (Date.now() < waitUntil) return;
      $('.lock-sub', gate).textContent = 'Abrindo…';
      if (await vault.unlockWithPin(p)) { fails = 0; return enterApp(true); }
      fails++;
      if (fails >= 5) {
        const secs = 30 * 2 ** (fails - 5);
        waitUntil = Date.now() + secs * 1000;
        shake(`Muitas tentativas. Aguarde ${secs} s.`);
      } else shake('Código incorreto');
    },
  });
  if (bio && autoBio) bioUnlock();
}

async function bioUnlock() {
  try {
    if (await vault.unlockWithBio()) return enterApp(true);
    toast('Não foi possível abrir com Face ID');
  } catch {
    toast('Face ID cancelado');
  }
}

async function forgot() {
  pinHandler = null;
  const bio = !!(await vault.getMeta())?.bio;
  gate.innerHTML = `<div class="lock-inner">
    <button class="lock-back link" data-gate="unlock">‹ Voltar</button>
    <div class="gate-ico">${icon('question')}</div>
    <h1 class="lock-title">Esqueceu o código?</h1>
    <p class="lock-sub">Entre de outro jeito e crie um código novo. Seus dados continuam intactos.</p>
    <div class="list choice">
      ${bio ? `<button class="row plain row-btn" data-gate="bio-reset">${icon('faceid')}<div class="row-main"><div class="row-title">Face ID ou código do iPhone</div><div class="row-sub">Se o rosto não for reconhecido, o iPhone pede o código dele</div></div>${icon('chevron')}</button>` : ''}
      <button class="row plain row-btn" data-gate="recovery">${icon('key')}<div class="row-main"><div class="row-title">Chave de recuperação</div><div class="row-sub">A chave de 20 letras que você guardou ao criar o app</div></div>${icon('chevron')}</button>
    </div>
    <button class="link lock-link danger" data-gate="wipe">Apagar tudo e começar de novo</button>
  </div>`;
  const b = $('[data-gate="bio-reset"]', gate);
  if (b) b.onclick = async (e) => {
    e.stopPropagation();
    try { if (await vault.unlockWithBio()) return resetPin(); } catch { /* cancelado */ }
    toast('Não foi possível confirmar');
  };
}

function recoveryInput() {
  pinHandler = null;
  gate.innerHTML = `<div class="lock-inner">
    <button class="lock-back link" data-gate="forgot">‹ Voltar</button>
    <div class="gate-ico">${icon('key')}</div>
    <h1 class="lock-title">Chave de recuperação</h1>
    <p class="lock-sub">Digite ou cole a chave. Hífens e espaços não importam.</p>
    <input class="field mono" id="rec-in" autocomplete="off" autocapitalize="characters" spellcheck="false" placeholder="XXXX-XXXX-XXXX-XXXX-XXXX">
    <button class="btn primary block" id="rec-go">Continuar</button>
  </div>`;
  $('#rec-go').onclick = async () => {
    $('#rec-go').textContent = 'Verificando…';
    if (await vault.unlockWithRecovery($('#rec-in').value)) return resetPin();
    $('#rec-go').textContent = 'Continuar';
    toast('Chave incorreta');
  };
}

function resetPin() {
  createPin(false, async (p) => {
    await vault.changePin(p);
    fails = 0; waitUntil = 0;
    toast('Código alterado');
    enterApp(true);
  });
}

function restoreBackup() {
  const input = Object.assign(document.createElement('input'), { type: 'file', accept: '.lastro,.json,application/json' });
  input.onchange = async () => {
    const f = input.files[0];
    if (!f) return;
    if (await vault.exists() && !confirm('Substituir os dados deste aparelho pelo backup?')) return;
    try {
      await vault.importBackup(await f.text());
      toast('Backup restaurado. Use o código do backup.');
      unlockScreen();
    } catch (e) { toast(e.message || 'Backup inválido'); }
  };
  input.click();
}

async function enterApp(loadData) {
  if (loadData) data = normalize(await vault.load());
  data ||= EMPTY();
  pinHandler = null;
  pickMonth();
  gate.hidden = true;
  $('#app').hidden = false;
  render();
}

async function lockApp() {
  if (!vault.isUnlocked()) return;
  await save();
  vault.lock();
  data = null;
  showGate();
  unlockScreen();
}

/* auto-bloqueio e privacidade no seletor de apps */
let hiddenAt = 0;
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    hiddenAt = Date.now();
    document.body.classList.add('privacy');
    if (data) save();
  } else {
    document.body.classList.remove('privacy');
    if (data && Date.now() - hiddenAt >= (data.settings.lockAfter ?? 60) * 1000) lockApp();
  }
});

/* ================================================================
   Telas
   ================================================================ */
const ROUTES = [
  { id: 'inicio', label: 'Início', icon: 'home' },
  { id: 'gastos', label: 'Gastos', icon: 'list' },
  { id: 'assinaturas', label: 'Assinaturas', icon: 'repeat' },
  { id: 'investir', label: 'Investir', icon: 'trend' },
  { id: 'planejar', label: 'Planejar', icon: 'target' },
];

function topbar() {
  return `<div class="topbar">
    <button class="month-pill" data-action="month">${monthLabel(mk)} ${icon('down')}</button>
    <div class="topbar-actions">
      <button class="icon-btn" data-action="import" aria-label="Importar">${icon('plus')}</button>
      <a class="icon-btn" href="#ajustes" aria-label="Ajustes">${icon('gear')}</a>
    </div></div>`;
}



function emptyState(title, sub) {
  return `<div class="card empty">
    <div class="gate-ico">${icon('upload')}</div>
    <h2>${title}</h2><p>${sub}</p>
    <div class="row-actions"><button class="btn primary" data-action="import">Importar extrato</button><button class="btn" data-action="sample">Ver exemplo</button></div>
  </div>`;
}

function monthsChart() {
  const data6 = history(data, mk, 6);
  const W = 340, H = 150, top = 22, bottom = 22, gap = 14;
  const maxV = Math.max(...data6.map((d) => d.total), 1);
  const bw = (W - gap * 5) / 6;
  const y = (v) => top + (H - top - bottom) * (1 - v / maxV);
  const r = 4;
  let bars = '';
  data6.forEach((d, i) => {
    const x = i * (bw + gap);
    const cur = d.mk === mk;
    if (d.total > 0) {
      const yy = Math.min(y(d.total), H - bottom - r);
      bars += `<path class="bar${cur ? ' current' : ''}" d="M${x},${H - bottom} V${yy + r} Q${x},${yy} ${x + r},${yy} H${x + bw - r} Q${x + bw},${yy} ${x + bw},${yy + r} V${H - bottom} Z"/>`;
    }
    bars += `<text class="axis${cur ? ' cur' : ''}" x="${x + bw / 2}" y="${H - 6}" text-anchor="middle">${monthShort(d.mk)}</text>`;
    if (cur && d.total) bars += `<text class="val" x="${x + bw / 2}" y="${y(d.total) - 7}" text-anchor="middle">${moneyShort(d.total)}</text>`;
    bars += `<rect class="hit" x="${x - gap / 2}" y="0" width="${bw + gap}" height="${H}" data-tip="${monthLabel(d.mk)}|${money(d.total)}" data-goto="${d.mk}"/>`;
  });
  const withData = data6.filter((d) => d.total);
  const avg = withData.reduce((s, d) => s + d.total, 0) / (withData.length || 1);
  return `<div class="chart"><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Gastos dos últimos 6 meses">
      <line class="grid" x1="0" x2="${W}" y1="${y(avg)}" y2="${y(avg)}" stroke-dasharray="2 4"/>
      <line class="grid" x1="0" x2="${W}" y1="${H - bottom}" y2="${H - bottom}"/>${bars}</svg></div>
    <div class="chart-foot"><span>Média: ${money(avg)} <span class="dash-key"></span></span><button class="link" data-action="toggle-table">Ver tabela</button></div>
    <table class="data-table" hidden><thead><tr><th>Mês</th><th>Gasto</th></tr></thead><tbody>${data6.map((d) => `<tr><td>${monthLabel(d.mk)}</td><td>${money(d.total)}</td></tr>`).join('')}</tbody></table>`;
}

function categoryBars(cats, total) {
  const max = cats[0]?.value || 1;
  return `<div class="cat-list">${cats.map((c) => {
    const cat = CATS[c.id] || CATS.outros;
    const d = c.last ? (c.value - c.last) / c.last : null;
    const note = d != null && Math.abs(d) >= 0.05 ? `${d > 0 ? '+' : '−'}${pct(Math.abs(d))}` : pct(c.value / total);
    return `<a class="cat-row" href="#gastos?f=${c.id}" style="--cat:${cat.color}" data-tip="${cat.name}|${money(c.value)} · ${pct(c.value / total)} do mês|Mês anterior: ${money(c.last)}">
      <div class="cat-name"><i></i>${cat.name}</div>
      <div class="cat-val">${money(c.value)}<small>${note}</small></div>
      <div class="cat-track"><div class="cat-fill" style="width:${(c.value / max) * 100}%"></div></div></a>`;
  }).join('')}</div>`;
}


/* ---------- planejamento ---------- */
const plan = createPlan({
  get data() { return data; },
  get mk() { return mk; },
  topbar: () => topbar(),
  openSheet: (h) => openSheet(h),
  closeSheet: () => closeSheet(),
  toast: (m) => toast(m),
  commit: (msg) => { save(); closeSheet(); render(); if (msg) toast(msg); },
  exportMd: () => doExport('md'),
});

/** observações que vêm do planejamento: orçamento, parcelas, gastos anuais e horas de trabalho */
function planInsights(s) {
  const out = [];
  const b = P.budgetStatus(data, mk);
  const over = b.rows.filter((r) => r.over);
  if (over.length) out.push({ tone: 'warn', icon: 'target', title: `${CATS[over[0].cat].name} passou do limite: ${money(over[0].spent)} de ${money(over[0].limit)}.`, sub: over.length > 1 ? `Mais ${over.length - 1} categoria${over.length > 2 ? 's' : ''} acima do orçamento.` : `${money(over[0].spent - over[0].limit)} acima do planejado.`, link: '#orcamento', linkLabel: 'Ver orçamento' });
  else {
    const soon = b.rows.find((r) => r.willOver || r.ratio >= 0.8);
    if (soon) out.push({ tone: 'warn', icon: 'target', title: `${CATS[soon.cat].name} já usou ${pct(soon.ratio)} do limite.`, sub: b.isCurrent ? `No ritmo atual, fecha o mês em ${money(soon.projected)} (limite ${money(soon.limit)}).` : '', link: '#orcamento', linkLabel: 'Ver orçamento' });
  }
  const ann = P.annualPlan(data, mk).list.find((a) => a.monthsLeft <= 1);
  if (ann) out.push({ tone: 'info', icon: 'calendar', title: `${ann.name} ${ann.monthsLeft === 0 ? 'é este mês' : 'é no mês que vem'}: ${money(ann.amount)}.`, sub: 'Gasto anual cadastrado.', link: '#anuais', linkLabel: 'Ver anuais' });
  const inst = P.installments(data, mk);
  if (s.income && inst.schedule[0].total / s.income > 0.15) out.push({ tone: 'info', icon: 'card', title: `${money(inst.schedule[0].total)} de parcelas já comprometidas em ${monthName(inst.schedule[0].mk).toLowerCase()}.`, sub: `${pct(inst.schedule[0].total / s.income)} da renda antes de o mês começar.`, link: '#parcelas', linkLabel: 'Ver parcelas' });
  const rate = P.hourlyRate(data, mk);
  const want = s.cats.find((c) => !CATS[c.id]?.unknown && !P.isEssential(data, c.id));
  if (rate && want && want.value / rate >= 4) out.push({ tone: 'info', icon: 'clock', title: `${CATS[want.id].name} custou ${P.hoursText(want.value, rate)} este mês.`, sub: `Sua hora vale cerca de ${money(rate)}.` });
  return out;
}

const views = {
  inicio() {
    if (!data.tx.length) return `${topbar()}<h1 class="page-title">Visão geral</h1><p class="page-sub">Nenhum lançamento ainda</p>${emptyState('Comece pelo extrato', 'Exporte o extrato ou a fatura no app do banco e importe aqui. Tudo é lido no próprio iPhone.')}`;
    const s = summary(data, mk);
    const planNotes = planInsights(s);
    // evita repetir a mesma categoria que já apareceu no aviso de orçamento
    const said = planNotes.filter((n) => n.icon === 'target').map((n) => n.title.split(' ')[0]);
    const notes = [...planNotes, ...insights(data, mk, money).filter((n) => !said.some((w) => n.title.startsWith(w)))];
    const left = s.income - s.total - s.invested;
    const inst = P.installments(data, mk);
    const nw = P.netWorth(data);
    return `${topbar()}
      <h1 class="page-title">Visão geral</h1>
      <p class="page-sub">${s.tx.length} lançamentos em ${monthName(mk).toLowerCase()}</p>
      <div class="card hero">
        <div class="hero-label">Gasto em ${monthName(mk).toLowerCase()}</div>
        ${heroValue(s.total)}
        ${s.delta != null ? `<span class="delta ${s.delta > 0 ? 'up' : 'down'}">${icon(s.delta > 0 ? 'up' : 'downright')}${pct(Math.abs(s.delta))}</span><span class="delta-note">vs. ${monthShort(s.prevMk)} (${money(s.last)})</span>` : '<span class="delta-note" style="margin:0">Sem dados do mês anterior</span>'}
        <div class="flow">
          <div><span>Entradas${s.incomeFromTx ? '' : ' *'}</span><strong>${moneyShort(s.income)}</strong></div>
          <div><span>Investido</span><strong>${moneyShort(s.invested)}</strong></div>
          <div><span>Sobra</span><strong class="${left < 0 ? 'neg' : ''}">${moneyShort(left)}</strong></div>
        </div>
        ${s.incomeFromTx || !s.income ? '' : '<p class="tiny">* renda informada nos Ajustes</p>'}
      </div>
      ${notes.length ? `<div class="section"><div class="section-head"><h2 class="section-title">Observações</h2></div>${notes.slice(0, 5).map(callout).join('')}</div>` : ''}
      <div class="section"><div class="section-head"><h2 class="section-title">Últimos 6 meses</h2></div><div class="card">${monthsChart()}</div></div>
      ${s.cats.length ? `<div class="section"><div class="section-head"><h2 class="section-title">Por categoria</h2><a class="link" href="#gastos">Ver gastos</a></div><div class="card">${categoryBars(s.cats, s.total)}</div></div>` : ''}
      ${s.merchants.length ? `<div class="section"><div class="section-head"><h2 class="section-title">Onde você mais gastou</h2></div>
        <div class="list">${s.merchants.slice(0, 5).map((m) => `
          <a class="row row-btn" href="#gastos?q=${encodeURIComponent(m.name)}">${avatar(m.name, m.cat)}
            <div class="row-main"><div class="row-title">${esc(m.name)}</div><div class="row-sub">${m.count}× · ${CATS[m.cat].name}</div></div>
            <div class="row-amt">${money(m.total)}</div></a>`).join('')}</div></div>` : ''}
      <div class="section grid-2">
        <a class="card stat" href="#assinaturas"><span>Assinaturas</span><strong>${money(subsTotal(data))}</strong><em>${data.subs.length} ativas · por mês</em></a>
        <a class="card stat" href="#gastos?f=outros"><span>Não identificados</span><strong>${s.unknown.length}</strong><em>${money(s.unknown.reduce((a, t) => a + t.amount, 0))} para revisar</em></a>
      </div>
      <div class="grid-2" style="margin-top:10px">
        <a class="card stat" href="#parcelas"><span>Parcelas a pagar</span><strong>${money(inst.owed)}</strong><em>${inst.schedule[0].total ? `${money(inst.schedule[0].total)} em ${monthShort(inst.schedule[0].mk)}` : 'nada comprometido'}</em></a>
        <a class="card stat" href="#patrimonio"><span>Patrimônio líquido</span><strong>${money(nw.net)}</strong><em>contas + investimentos − dívidas</em></a>
      </div>`;
  },

  gastos(params) {
    const filter = params.get('f') || 'todos';
    const q = (params.get('q') || '').toLowerCase();
    const s = summary(data, mk);
    // "#etiqueta" busca em todos os meses
    const allMonths = q.startsWith('#') || params.get('all') === '1';
    let tx = [...(allMonths ? data.tx : s.tx)].sort((a, b) => b.date.localeCompare(a.date) || b.id - a.id);
    if (['in', 'inv', 'skip', 'refund'].includes(filter)) tx = tx.filter((t) => t.type === filter);
    else if (filter !== 'todos') tx = tx.filter((t) => t.type === 'out' && t.cat === filter);
    if (q.startsWith('#')) tx = tx.filter((t) => (t.tags || []).some((tg) => tg.toLowerCase() === q.slice(1)));
    else if (q) tx = tx.filter((t) => `${t.merchant} ${t.desc}`.toLowerCase().includes(q));
    const groups = new Map();
    tx.forEach((t) => { if (!groups.has(t.date)) groups.set(t.date, []); groups.get(t.date).push(t); });
    const types = ['in', 'refund', 'inv', 'skip'].filter((ty) => s.tx.some((t) => t.type === ty));
    const chips = [`<button class="chip${filter === 'todos' ? ' on' : ''}" data-filter="todos">Todos</button>`]
      .concat(s.cats.map((c) => `<button class="chip${filter === c.id ? ' on' : ''}" data-filter="${c.id}" style="--cat:${CATS[c.id].color}"><i></i>${CATS[c.id].name}</button>`))
      .concat(types.map((ty) => `<button class="chip${filter === ty ? ' on' : ''}" data-filter="${ty}">${{ in: 'Entradas', refund: 'Reembolsos', inv: 'Investimentos', skip: 'Ignorados' }[ty]}</button>`)).join('');
    const outSum = tx.filter((t) => t.type === 'out').reduce((a, t) => a + t.amount, 0) - tx.filter((t) => t.type === 'refund').reduce((a, t) => a + t.amount, 0);
    const body = [...groups.entries()].map(([date, list]) => {
      const d = dateOf(date);
      const daySum = list.filter((t) => t.type === 'out').reduce((a, t) => a + t.amount, 0);
      return `<div class="day-head"><strong>${d.getDate()} de ${MONTHS[d.getMonth()]}${allMonths ? ` de ${d.getFullYear()}` : ''}</strong><span>${WEEKDAYS[d.getDay()]}${daySum ? ` · ${money(daySum)}` : ''}</span></div>
        <div class="list">${list.map((t) => `
          <button class="row row-btn" data-action="tx" data-id="${t.id}">${avatar(t.merchant, t.type === 'out' ? t.cat : 'saude')}
            <div class="row-main"><div class="row-title">${esc(t.merchant)}</div><div class="row-sub">${typeTag(t)}${t.type === 'out' && data.subs.some((x) => x.key === t.key) ? '<span class="pill">Assinatura</span>' : ''}${P.parcelOf(t) ? `<span class="hash">${P.parcelOf(t).n}/${P.parcelOf(t).of}</span>` : ''}${(t.tags || []).map((tg) => `<span class="hash">#${esc(tg)}</span>`).join('')}</div></div>
            <div class="row-amt ${t.type === 'in' || t.type === 'refund' ? 'in' : ''} ${t.type === 'skip' ? 'muted' : ''}">${t.type === 'in' || t.type === 'refund' ? '+' : '−'}${money(t.amount)}</div>
          </button>`).join('')}</div>`;
    }).join('');
    return `${topbar()}
      <h1 class="page-title">Gastos</h1>
      <p class="page-sub">${money(outSum)} em ${tx.filter((t) => t.type === 'out').length} gastos${allMonths ? ' · todos os meses' : ''}</p>
      <label class="search">${icon('search')}<input type="search" placeholder="Buscar loja, descrição ou #etiqueta" value="${esc(q)}" data-action="search"></label>
      <div class="chips">${chips}</div>
      ${body || (data.tx.length ? '<p class="empty-hint">Nada encontrado neste mês.</p>' : emptyState('Nenhum gasto ainda', 'Importe um extrato para ver seus lançamentos aqui.'))}`;
  },

  assinaturas() {
    const total = subsTotal(data);
    const s = summary(data, mk);
    const sugg = recurring(data);
    const today = mk === currentMk() ? new Date().getDate() : 0;
    const sorted = [...data.subs].sort((a, b) => a.day - b.day);
    const rate = P.hourlyRate(data, mk);
    return `${topbar()}
      <h1 class="page-title">Assinaturas</h1>
      <p class="page-sub">Cobranças que se repetem todo mês</p>
      <div class="grid-2">
        <div class="card stat"><span>Por mês</span><strong>${money(total)}</strong><em>${data.subs.length} ativas</em></div>
        <div class="card stat"><span>Por ano</span><strong>${money(total * 12)}</strong><em>${s.income ? `${pct(total / s.income)} da renda` : 'em 12 meses'}</em></div>
      </div>
      ${sugg.length ? `<div class="section"><div class="section-head"><h2 class="section-title">Encontradas no extrato</h2></div>
        ${sugg.map((sg) => `<div class="callout"><div class="callout-ico">${icon('repeat')}</div>
          <div><p><b>${esc(sg.name)}</b> · ${money(sg.amount)}</p><p>Cobrado em ${sg.months.join(', ')}, por volta do dia ${sg.day}.</p>
          <div class="callout-actions"><button class="btn small primary" data-action="sub-accept" data-key="${esc(sg.key)}">Adicionar assinatura</button><button class="btn small" data-action="sub-dismiss" data-key="${esc(sg.key)}">Ignorar</button></div></div></div>`).join('')}
      </div>` : ''}
      <div class="section"><div class="section-head"><h2 class="section-title">Em ${monthName(mk).toLowerCase()}</h2><button class="link" data-action="sub-new">+ Nova</button></div>
        ${sorted.length ? `<div class="list">${sorted.map((x) => {
          const st = subStatus(data, x, mk);
          const status = st.paid ? `<small class="ok">${icon('check')} pago dia ${+st.date.slice(8)}</small>` : `<small>${today && x.day < today ? 'não encontrado' : `previsto dia ${x.day}`}</small>`;
          return `<button class="row row-btn" data-action="sub-edit" data-id="${x.id}">${avatar(x.name, x.cat)}
            <div class="row-main"><div class="row-title">${esc(x.name)}</div><div class="row-sub">Todo dia ${x.day} · ${money(x.amount * 12)}/ano${rate ? ` · ${P.hoursText(x.amount * 12, rate)} por ano` : ''}</div></div>
            <div class="row-amt">${money(x.amount)}${status}</div></button>`;
        }).join('')}</div>` : '<p class="empty-hint">Nenhuma assinatura cadastrada. Toque em “+ Nova” ou importe extratos de alguns meses para o app encontrar.</p>'}
      </div>
      ${data.subs.length ? `<div class="section"><button class="btn block" data-action="calendar-subs">${icon('calendar')} Colocar todas no Calendário do iPhone</button></div>` : ''}
      <p class="note">${icon('info')} Uma cobrança vira sugestão quando aparece com o mesmo valor por 3 meses seguidos (2, se for streaming ou app).</p>`;
  },

  investir() {
    const inv = data.inv;
    const total = inv.reduce((s, x) => s + x.value, 0);
    const applied = inv.filter((x) => x.invested).reduce((s, x) => s + x.invested, 0);
    const gain = inv.filter((x) => x.invested).reduce((s, x) => s + x.value - x.invested, 0);
    const s = summary(data, mk);
    // reserva de emergência considera só os gastos essenciais
    const avg = P.avgEssential(data, mk, 3) || avgSpend(data, mk, 3) || s.total;
    const bench = P.portfolioVsBenchmarks(data);
    const st = data.settings;
    const reserve = inv.filter((x) => x.kind === 'Reserva de emergência').reduce((a, x) => a + x.value, 0);
    const reserveMonths = avg ? reserve / avg : 0;
    const groups = KINDS.map((k) => ({ k, v: inv.filter((x) => (x.kind || 'Outros') === k).reduce((a, x) => a + x.value, 0) })).filter((g) => g.v > 0).sort((a, b) => b.v - a.v);
    const goal = s.income * (data.settings.goalPct ?? 0.2);
    const tips = [];
    if (avg && reserveMonths < 6) tips.push(['shield', `Complete a reserva de emergência antes de aumentar o risco.`, `Hoje ela cobre ${reserveMonths.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} meses dos seus gastos essenciais; o recomendado é 6 (${money(avg * 6)}).`]);
    if (goal && s.invested < goal) tips.push(['piggy', `Aporte de ${money(s.invested)} em ${monthName(mk).toLowerCase()}.`, `A meta de ${pct(data.settings.goalPct ?? 0.2)} da renda seria ${money(goal)}. Faltam ${money(goal - s.invested)}.`]);
    const risky = groups.filter((g) => ['Renda variável', 'Cripto'].includes(g.k)).reduce((a, g) => a + g.v, 0);
    if (total && risky / total > 0.5) tips.push(['alert', `${pct(risky / total)} da carteira está em renda variável e cripto.`, 'Uma fatia maior em renda fixa reduz o sobe e desce.']);
    const bigSub = [...data.subs].sort((a, b) => b.amount - a.amount)[0];
    if (bigSub) tips.push(['repeat', `Cancelar ${bigSub.name} libera ${money(bigSub.amount * 12)} por ano.`, `Aplicado a 1% ao mês, vira cerca de ${money(bigSub.amount * ((1.01 ** 12 - 1) / 0.01))} em 12 meses.`]);
    return `${topbar()}
      <h1 class="page-title">Investimentos</h1>
      <p class="page-sub">Cadastre à mão ou importe a posição da corretora</p>
      ${inv.length ? `<div class="card hero">
        <div class="hero-label">Patrimônio investido</div>${heroValue(total)}
        ${applied ? `<span class="delta ${gain >= 0 ? 'down' : 'up'}">${icon(gain >= 0 ? 'up' : 'downright')}${money(Math.abs(gain))}</span><span class="delta-note">${gain >= 0 ? 'de rendimento' : 'de perda'} sobre ${money(applied)} aplicados</span>` : ''}
        <div class="stack">${groups.map((g) => `<div style="--cat:${KIND_COLOR[g.k]};flex:${g.v}" data-tip="${g.k}|${money(g.v)} · ${pct(g.v / total)}"></div>`).join('')}</div>
        <div class="cat-list tight">${groups.map((g) => `<div class="cat-row" style="--cat:${KIND_COLOR[g.k]}"><div class="cat-name"><i></i>${g.k}</div><div class="cat-val">${money(g.v)}<small>${pct(g.v / total)}</small></div></div>`).join('')}</div>
      </div>` : `<div class="card empty"><div class="gate-ico">${icon('trend')}</div><h2>Nenhum investimento</h2><p>Adicione seus investimentos ou importe a planilha de posição da corretora.</p><div class="row-actions"><button class="btn primary" data-action="inv-new">Adicionar</button><button class="btn" data-action="import" data-mode="inv">Importar</button></div></div>`}
      <div class="section grid-2">
        <div class="card stat"><span>Aporte em ${monthShort(mk)}</span><strong>${money(s.invested)}</strong><em>${s.income ? `${pct(s.invested / s.income)} da renda` : 'aplicações no extrato'}</em></div>
        <div class="card stat"><span>Meta mensal</span><strong>${money(goal)}</strong><em>${pct(data.settings.goalPct ?? 0.2)} da renda</em></div>
      </div>
      ${avg ? `<div class="section"><div class="section-head"><h2 class="section-title">Reserva de emergência</h2></div>
        <div class="card">
          <div class="spread"><span>${reserveMonths.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} de 6 meses de gastos essenciais</span><strong class="num">${money(reserve)}</strong></div>
          <div class="progress"><div style="width:${Math.min(1, reserveMonths / 6) * 100}%"></div></div>
          <div class="tiny">${reserve >= avg * 6 ? 'Reserva completa.' : `Faltam ${money(avg * 6 - reserve)} · base: ${money(avg)}/mês de essenciais`}${reserve ? '' : ' · marque um investimento como “Reserva de emergência”'}</div>
        </div></div>` : ''}
      ${inv.length ? `<div class="section"><div class="section-head"><h2 class="section-title">Comparado com CDI e inflação</h2><button class="link" data-action="rates-fetch">Atualizar</button></div>
        <div class="card">
          <div class="grid-2">
            <label class="form"><span class="tiny" style="margin:0">CDI (% ao ano)</span><input class="field" inputmode="decimal" data-setting="cdi" value="${st.cdi ? String(st.cdi).replace('.', ',') : ''}" placeholder="ex.: 10,65"></label>
            <label class="form"><span class="tiny" style="margin:0">IPCA 12 meses (%)</span><input class="field" inputmode="decimal" data-setting="ipca" value="${st.ipca ? String(st.ipca).replace('.', ',') : ''}" placeholder="ex.: 4,5"></label>
          </div>
          ${bench ? `<div class="kv" style="margin-top:14px">
            <span>Seu rendimento</span><b class="${bench.gain >= 0 ? 'pos' : 'neg'}">${money(bench.gain)}</b>
            ${bench.cdiGain ? `<span>Se estivesse 100% no CDI</span><b>${money(bench.cdiGain)}</b><span>Resultado</span><b>${pct(bench.pctCdi)} do CDI</b>` : ''}
            ${bench.ipcaGain ? `<span>Só para empatar com a inflação</span><b>${money(bench.ipcaGain)}</b><span>Ganho real (acima da inflação)</span><b class="${bench.gain - bench.ipcaGain >= 0 ? 'pos' : 'neg'}">${money(bench.gain - bench.ipcaGain)}</b>` : ''}
          </div>` : '<p class="tiny">Informe o valor aplicado e o mês da aplicação em cada investimento para comparar.</p>'}
          <p class="tiny">${st.ratesDate ? `Taxas de ${st.ratesDate} (Banco Central). ` : ''}A comparação usa a taxa atual como aproximação para todo o período.</p>
        </div></div>` : ''}
      ${inv.length ? `<div class="section"><div class="section-head"><h2 class="section-title">Carteira</h2><button class="link" data-action="inv-new">+ Adicionar</button></div>
        <div class="list">${[...inv].sort((a, b) => b.value - a.value).map((x) => {
          const g = x.invested ? (x.value - x.invested) / x.invested : null;
          const c = P.compareRates(x, st, mk);
          return `<button class="row row-btn" data-action="inv-edit" data-id="${x.id}"><div class="avatar" style="--cat:${KIND_COLOR[x.kind] || 'var(--c0)'}">${esc(x.name[0] || '?')}</div>
            <div class="row-main"><div class="row-title">${esc(x.name)}</div><div class="row-sub">${esc(x.kind || 'Outros')}${c?.pctCdi != null ? ` · ${pct(c.pctCdi)} do CDI` : ''}${c?.real != null ? ` · real ${c.real >= 0 ? '+' : '−'}${(Math.abs(c.real) * 100).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%` : ''}</div></div>
            <div class="row-amt">${money(x.value)}${g != null ? `<small class="${g >= 0 ? 'ok' : 'bad'}">${g >= 0 ? '+' : '−'}${(Math.abs(g) * 100).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%</small>` : ''}</div></button>`;
        }).join('')}</div></div>` : ''}
      ${tips.length ? `<div class="section"><div class="section-head"><h2 class="section-title">Sugestões</h2></div>
        ${tips.map(([ic, t, sub]) => callout({ tone: '', icon: ic, title: t, sub })).join('')}
        <p class="note">${icon('info')} Sugestões gerais, calculadas com os seus números. Não são recomendação de investimento.</p></div>` : ''}`;
  },

  relatorios() {
    const s = summary(data, mk);
    return `<div class="topbar"><a class="link" href="#planejar">‹ Planejar</a><button class="month-pill" data-action="month">${monthLabel(mk)} ${icon('down')}</button></div>
      <h1 class="page-title">Relatórios</h1>
      <p class="page-sub">Resumo de ${monthName(mk).toLowerCase()} pronto para exportar</p>
      <article class="card doc">
        <div class="doc-icon">${icon('file')}</div>
        <h2>${monthName(mk)} de ${mk.slice(0, 4)}</h2>
        <dl class="props">
          <dt>${icon('list')} Gasto total</dt><dd>${money(s.total)}</dd>
          <dt>${icon('trend')} Variação</dt><dd>${s.delta != null ? `${s.delta > 0 ? '+' : '−'}${pct(Math.abs(s.delta))} vs. ${monthShort(s.prevMk)}` : '—'}</dd>
          <dt>${icon('calendar')} Entradas</dt><dd>${money(s.income)}</dd>
          <dt>${icon('repeat')} Assinaturas</dt><dd>${money(subsTotal(data))}</dd>
          <dt>${icon('piggy')} Sobra</dt><dd>${money(s.income - s.total - s.invested)}</dd>
        </dl>
        ${s.cats.length ? `<h3>Categorias</h3><ul>${s.cats.slice(0, 6).map((c) => `<li><b>${CATS[c.id].name}</b> — ${money(c.value)} (${pct(c.value / s.total)})</li>`).join('')}</ul>` : '<p class="tiny">Sem gastos neste mês.</p>'}
        ${s.merchants.length ? `<h3>Lojas</h3><ul>${s.merchants.slice(0, 5).map((x) => `<li><b>${esc(x.name)}</b> — ${money(x.total)} em ${x.count}×</li>`).join('')}</ul>` : ''}
      </article>
      <div class="section"><div class="section-head"><h2 class="section-title">Exportar</h2></div>
        <div class="export-grid">
          <button class="export" data-action="export" data-fmt="pdf"><span class="ext">PDF</span><div><strong>Relatório</strong><span>Para imprimir ou enviar</span></div></button>
          <button class="export" data-action="export" data-fmt="xlsx"><span class="ext">XLSX</span><div><strong>Planilha</strong><span>Excel, Numbers, Sheets</span></div></button>
          <button class="export" data-action="export" data-fmt="md"><span class="ext">MD</span><div><strong>Markdown</strong><span>Nota pronta para o Obsidian</span></div></button>
          <button class="export" data-action="export" data-fmt="csv"><span class="ext">CSV</span><div><strong>Lançamentos</strong><span>Todos do mês</span></div></button>
        </div>
        <p class="note">${icon('info')} No iPhone abre a folha de compartilhar: escolha “Salvar em Arquivos”, o Obsidian ou outro app. A planilha exportada pode ser importada de volta.</p>
      </div>`;
  },

  async ajustes() {
    const st = data.settings;
    const meta = await vault.getMeta();
    const bioOk = await vault.bioAvailable();
    const theme = document.documentElement.dataset.theme || 'auto';
    const seg = (name, cur, opts) => `<div class="seg">${opts.map(([v, l]) => `<button class="${String(cur) === String(v) ? 'on' : ''}" data-set="${name}" data-v="${v}">${l}</button>`).join('')}</div>`;
    return `<div class="topbar"><a class="link" href="#inicio">‹ Início</a><span></span></div>
      <h1 class="page-title">Ajustes</h1>
      <p class="page-sub">Tudo fica neste aparelho</p>

      <div class="section"><div class="section-head"><h2 class="section-title">Segurança</h2></div>
        <div class="list">
          <div class="row plain"><div class="row-main"><div class="row-title">Face ID</div><div class="row-sub">${bioOk ? (meta.bio ? (meta.bio.mode === 'prf' ? 'Ativo · a chave vem do próprio Face ID' : 'Ativo') : 'Abrir o app com o rosto') : 'Indisponível neste navegador'}</div></div>
            ${bioOk ? `<button class="switch ${meta.bio ? 'on' : ''}" data-action="toggle-bio" role="switch" aria-checked="${!!meta.bio}" aria-label="Face ID"></button>` : ''}</div>
          <button class="row plain row-btn" data-action="change-pin"><div class="row-main"><div class="row-title">Alterar código</div></div>${icon('chevron')}</button>
          <button class="row plain row-btn" data-action="new-recovery"><div class="row-main"><div class="row-title">Nova chave de recuperação</div><div class="row-sub">A anterior deixa de funcionar</div></div>${icon('chevron')}</button>
          <div class="row plain"><div class="row-main"><div class="row-title">Bloquear após</div></div>${seg('lockAfter', st.lockAfter, [[0, 'Na hora'], [60, '1 min'], [300, '5 min']])}</div>
          <div class="row plain"><div class="row-main"><div class="row-title">Criptografia</div><div class="row-sub">AES-256-GCM · nada é enviado para a internet</div></div><span class="val-text">Ativa</span></div>
          <button class="row plain row-btn" data-action="lock"><div class="row-main"><div class="row-title">Bloquear agora</div></div>${icon('lock')}</button>
        </div></div>

      <div class="section"><div class="section-head"><h2 class="section-title">Aparência</h2></div>
        <div class="list"><div class="row plain"><div class="row-main"><div class="row-title">Tema</div></div>${seg('theme', theme, [['auto', 'Auto'], ['light', 'Claro'], ['dark', 'Escuro']])}</div></div></div>

      <div class="section"><div class="section-head"><h2 class="section-title">Finanças</h2></div>
        <div class="list">
          <label class="row plain"><div class="row-main"><div class="row-title">Seu nome completo</div><div class="row-sub">Para reconhecer PIX entre suas contas (Nubank → Inter…) e não contar como gasto</div></div>
            <input class="inline-input wide" data-setting-text="ownName" value="${esc(st.ownName || '')}" placeholder="Nome Sobrenome" autocomplete="name"></label>
          <label class="row plain"><div class="row-main"><div class="row-title">Renda mensal</div><div class="row-sub">Usada quando o extrato não tem o salário</div></div>
            <input class="inline-input" inputmode="decimal" data-setting="income" value="${st.income ? st.income.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) : ''}" placeholder="0,00"></label>
          <label class="row plain"><div class="row-main"><div class="row-title">Horas trabalhadas por mês</div><div class="row-sub">Para mostrar o custo dos gastos em horas de trabalho</div></div>
            <input class="inline-input" inputmode="numeric" data-setting="hoursMonth" value="${st.hoursMonth || 176}"></label>
          <label class="row plain"><div class="row-main"><div class="row-title">Dia do salário</div><div class="row-sub">Lembretes de metas caem nesse dia</div></div>
            <input class="inline-input" inputmode="numeric" data-setting="payday" value="${st.payday || 5}"></label>
          <label class="row plain"><div class="row-main"><div class="row-title">Dia do fechamento do mês</div><div class="row-sub">Lembrete para revisar o mês anterior</div></div>
            <input class="inline-input" inputmode="numeric" data-setting="closingDay" value="${st.closingDay || 3}"></label>
          <div class="row plain"><div class="row-main"><div class="row-title">Meta de investimento</div><div class="row-sub">Parte da renda para aplicar todo mês</div></div>${seg('goalPct', st.goalPct, [[0.1, '10%'], [0.2, '20%'], [0.3, '30%']])}</div>
          <button class="row plain row-btn" data-action="rules"><div class="row-main"><div class="row-title">Regras de categoria</div><div class="row-sub">${data.rules.length} regra${data.rules.length === 1 ? '' : 's'} criada${data.rules.length === 1 ? '' : 's'} por você</div></div>${icon('chevron')}</button>
        </div></div>

      <div class="section"><div class="section-head"><h2 class="section-title">Dados</h2></div>
        <div class="list">
          <button class="row plain row-btn" data-action="backup"><div class="row-main"><div class="row-title">Fazer backup criptografado</div><div class="row-sub">Arquivo .lastro para guardar no iCloud Drive</div></div>${icon('share')}</button>
          <button class="row plain row-btn" data-action="restore"><div class="row-main"><div class="row-title">Restaurar backup</div></div>${icon('upload')}</button>
          <button class="row plain row-btn" data-action="imports"><div class="row-main"><div class="row-title">Arquivos importados</div><div class="row-sub">${data.imports.length} importaç${data.imports.length === 1 ? 'ão' : 'ões'} · ${data.tx.length} lançamentos</div></div>${icon('chevron')}</button>
          <button class="row plain row-btn" data-action="sample"><div class="row-main"><div class="row-title">Carregar dados de exemplo</div></div>${icon('chevron')}</button>
          <button class="row plain row-btn" data-action="wipe"><div class="row-main"><div class="row-title danger">Apagar todos os dados</div></div></button>
        </div></div>
      <p class="empty-hint">Lastro · versão 1.2.1</p>`;
  },
};

/* ---------- render ---------- */
let renderSeq = 0;
async function render() {
  if (!data) return;
  const seq = ++renderSeq;
  const [route, query] = (location.hash.slice(1) || 'inicio').split('?');
  const all = { ...plan.views, ...views };
  const id = all[route] ? route : 'inicio';
  const html = await all[id](new URLSearchParams(query || ''));
  if (seq !== renderSeq) return;
  $('#view').innerHTML = html;
  const tab = PLAN_ROUTES.includes(id) ? 'planejar' : id === 'investir' || id === 'assinaturas' || id === 'gastos' ? id : id === 'ajustes' ? '' : 'inicio';
  const nav = ROUTES.map((r) => `<a href="#${r.id}" class="${r.id === tab ? 'active' : ''}">${icon(r.icon)}<span>${r.label}</span></a>`).join('');
  $('.tabbar').innerHTML = nav;
  $('.side-nav').innerHTML = nav + `<a href="#ajustes" class="${id === 'ajustes' ? 'active' : ''}">${icon('gear')}<span>Ajustes</span></a>`;
}
window.addEventListener('hashchange', () => { render(); window.scrollTo(0, 0); });

/* ---------- sheets ---------- */
function openSheet(html) {
  $('#sheet-body').innerHTML = html;
  $('#sheet').hidden = false;
}
const closeSheet = () => { $('#sheet').hidden = true; };

let toastTimer;
function toast(msg) {
  const el = $('#toast');
  el.textContent = msg; el.hidden = false;
  clearTimeout(toastTimer); toastTimer = setTimeout(() => { el.hidden = true; }, 2400);
}

function monthSheet() {
  const ms = new Set(months(data)); ms.add(currentMk()); ms.add(mk);
  const list = [...ms].sort().reverse();
  openSheet(`<h2>Mês</h2><p class="page-sub">Escolha o período</p>
    <div class="list">${list.map((m) => {
      const total = data.tx.filter((t) => t.type === 'out' && mkOf(t.date) === m).reduce((a, t) => a + t.amount, 0);
      return `<button class="row plain row-btn" data-action="set-month" data-mk="${m}"><div class="row-main"><div class="row-title">${monthLabel(m)}</div></div><span class="val-text">${total ? money(total) : 'sem dados'}</span>${m === mk ? icon('check') : ''}</button>`;
    }).join('')}</div>`);
}

/* ---------- importação ---------- */
const ACCEPT = '.pdf,.csv,.tsv,.xlsx,.xls,.xlsm,.ods,.ofx,.qfx,.txt,.md,.markdown,.docx,text/plain,text/csv,application/pdf';
function importSheet(mode = 'tx') {
  openSheet(`<h2>Importar</h2>
    <p class="page-sub">Os lançamentos são lidos e organizados automaticamente.</p>
    <div class="seg wide">${[['tx', 'Extrato ou fatura'], ['inv', 'Investimentos']].map(([v, l]) => `<button class="${mode === v ? 'on' : ''}" data-action="import" data-mode="${v}">${l}</button>`).join('')}</div>
    <label class="drop" id="drop">${icon('upload')}
      <p>${mode === 'tx' ? 'Escolha o extrato da conta ou a fatura do cartão' : 'Escolha a planilha ou o PDF de posição da corretora'}</p>
      <span class="btn primary">Escolher arquivo</span>
      <input type="file" id="file-in" accept="${ACCEPT}" hidden data-mode="${mode}">
    </label>
    <div class="formats">${['PDF', 'XLSX', 'CSV', 'OFX', 'TXT', 'MD', 'DOCX'].map((f) => `<span class="ext">${f}</span>`).join('')}</div>
    <p class="note">${icon('lock')} O arquivo é lido aqui no aparelho. Nada é enviado para a internet.</p>
    ${mode === 'tx' ? '<p class="note">' + icon('info') + ' No app do banco, procure por “Exportar extrato” ou “Baixar fatura”. OFX e CSV são os mais precisos.</p>' : ''}`);
  const input = $('#file-in');
  input.onchange = () => input.files[0] && handleFile(input.files[0], mode);
  const drop = $('#drop');
  drop.ondragover = (e) => { e.preventDefault(); drop.classList.add('over'); };
  drop.ondragleave = () => drop.classList.remove('over');
  drop.ondrop = (e) => { e.preventDefault(); drop.classList.remove('over'); if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0], mode); };
}

const askPassword = async (retry) => prompt(retry ? 'Senha incorreta. Tente de novo:' : 'Este PDF tem senha (muitos bancos usam parte do CPF). Digite a senha:');

let pending = null;
async function handleFile(file, mode) {
  openSheet(`<div class="loading"><div class="spinner"></div><p>Lendo ${esc(file.name)}…</p></div>`);
  try {
    if (mode === 'inv') {
      const items = await readInvestments(file, { askPassword });
      pending = { mode, file: file.name, items };
      return investReview();
    }
    const { items: raw, bank, text } = await readStatement(file, { askPassword });
    // evita duplicar lançamentos já importados
    const seen = new Map();
    data.tx.forEach((t) => { const k = `${t.date}|${t.amount.toFixed(2)}|${t.key}`; seen.set(k, (seen.get(k) || 0) + 1); });
    let dupes = 0;
    const catByName = Object.fromEntries(Object.entries(CATS).map(([k, c]) => [c.name.toLowerCase(), k]));
    const items = [];
    raw.forEach((r) => {
      const c = classify(r.desc, r.amount, data.rules, data.settings.ownName);
      // planilha exportada pelo próprio app traz a categoria; faturas de alguns bancos também
      if (r.cat && c.type === 'out') {
        const fromFile = catByName[r.cat.toLowerCase()] || (c.cat === 'outros' ? bankCategory(r.cat) : null);
        if (fromFile) c.cat = fromFile;
      }
      const t = { date: r.date, desc: r.desc, ...c, amount: Math.abs(+r.amount.toFixed(2)), bank: bank || undefined };
      const k = `${t.date}|${t.amount.toFixed(2)}|${t.key}`;
      if (seen.get(k)) { seen.set(k, seen.get(k) - 1); dupes++; return; }
      items.push(t);
    });
    pending = { mode, file: file.name, items, dupes, bank, text };
    txReview();
  } catch (e) {
    openSheet(`<h2>Não deu para ler</h2><p class="page-sub">${esc(e.message || 'Formato não reconhecido')}</p>
      <p class="note">${icon('info')} Tente exportar em outro formato (OFX ou CSV costumam funcionar melhor).</p>
      <button class="btn block" data-action="import">Tentar outro arquivo</button>`);
  }
}

function txReview() {
  const { items, dupes, file, bank } = pending;
  if (!items.length) {
    return openSheet(`<h2>Nada novo</h2><p class="page-sub">${dupes ? `Os ${dupes} lançamentos de ${esc(file)} já estavam no app.` : `Não encontramos lançamentos em ${esc(file)}.`}</p>
      ${dupes ? '' : `<p class="note">${icon('info')} ${pending.text?.trim() ? 'O app leu o texto, mas não reconheceu data, descrição e valor nas linhas.' : 'Não há texto no arquivo: parece ser uma imagem ou PDF escaneado.'} Se o banco oferecer CSV ou OFX, esses formatos são os mais precisos.</p>`}
      ${!dupes && pending.text?.trim() ? '<button class="btn block" data-action="show-text">Ver o texto que o app leu</button>' : ''}
      <button class="btn block" data-action="import">Escolher outro arquivo</button>`);
  }
  const out = items.filter((t) => t.type === 'out');
  const dates = items.map((t) => t.date).sort();
  const unknown = out.filter((t) => CATS[t.cat].unknown).length;
  openSheet(`<h2>${items.length} lançamentos</h2>
    <p class="page-sub">${bank ? `<b>${bank}</b> · ` : ''}${esc(file)} · ${dateOf(dates[0]).toLocaleDateString('pt-BR')} a ${dateOf(dates[dates.length - 1]).toLocaleDateString('pt-BR')}</p>
    <div class="grid-2" style="margin-bottom:14px">
      <div class="card stat"><span>Gastos</span><strong>${money(out.reduce((a, t) => a + t.amount, 0))}</strong><em>${out.length} lançamentos</em></div>
      <div class="card stat"><span>Sem categoria</span><strong>${unknown}</strong><em>${dupes ? `${dupes} repetidos ignorados` : 'revise depois em Gastos'}</em></div>
    </div>
    <div class="list review">${items.slice(0, 60).map((t) => `<div class="row">${avatar(t.merchant, t.type === 'out' ? t.cat : 'saude')}
      <div class="row-main"><div class="row-title">${esc(t.merchant)}</div><div class="row-sub">${dateOf(t.date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })} · ${typeTag(t)}</div></div>
      <div class="row-amt ${t.type === 'in' ? 'in' : ''}">${t.type === 'in' ? '+' : '−'}${money(t.amount)}</div></div>`).join('')}
      ${items.length > 60 ? `<div class="row plain"><div class="row-main row-sub">e mais ${items.length - 60}…</div></div>` : ''}</div>
    <div class="sheet-foot"><button class="btn block primary" data-action="confirm-import">Importar ${items.length} lançamentos</button>
    <button class="btn block ghost" data-action="close-sheet">Cancelar</button></div>`);
}

function investReview() {
  const { items, file } = pending;
  if (!items.length) {
    return openSheet(`<h2>Nada encontrado</h2><p class="page-sub">Não encontramos posições em ${esc(file)}. A planilha precisa ter uma coluna com o nome do ativo e outra com o valor.</p>
      <button class="btn block" data-action="inv-new">Adicionar à mão</button>`);
  }
  openSheet(`<h2>${items.length} investimentos</h2><p class="page-sub">${esc(file)} · ${money(items.reduce((a, x) => a + x.value, 0))}</p>
    <div class="list review">${items.map((x) => `<div class="row plain"><div class="row-main"><div class="row-title">${esc(x.name)}</div><div class="row-sub">${esc(x.kind || guessKind(x.name))}</div></div><div class="row-amt">${money(x.value)}</div></div>`).join('')}</div>
    <p class="note">${icon('info')} Ativos com o mesmo nome são atualizados; os novos são adicionados.</p>
    <div class="sheet-foot"><button class="btn block primary" data-action="confirm-inv">Salvar investimentos</button>
    <button class="btn block ghost" data-action="close-sheet">Cancelar</button></div>`);
}

function confirmImport() {
  const { items, file, bank } = pending;
  let id = data.tx.reduce((m, t) => Math.max(m, t.id), 0);
  const importId = uid();
  items.forEach((t) => data.tx.push({ ...t, id: ++id, src: importId }));
  data.imports.push({ id: importId, name: file, bank, kind: 'extrato', count: items.length, at: new Date().toISOString() });
  const latest = items.map((t) => t.date).sort().pop();
  mk = mkOf(latest);
  pending = null;
  save(); closeSheet();
  location.hash = 'inicio'; render();
  const subs = recurring(data).length;
  toast(subs ? `${items.length} importados · ${subs} possíve${subs > 1 ? 'is' : 'l'} assinatura${subs > 1 ? 's' : ''}` : `${items.length} lançamentos importados`);
}

function confirmInv() {
  const { items, file } = pending;
  items.forEach((x) => {
    const cur = data.inv.find((i) => i.name.toLowerCase() === x.name.toLowerCase());
    const kind = KINDS.find((k) => k.toLowerCase() === (x.kind || '').toLowerCase()) || cur?.kind || guessKind(x.name);
    if (cur) Object.assign(cur, { value: x.value, invested: x.invested ?? cur.invested, kind, updated: new Date().toISOString() });
    else data.inv.push({ id: uid(), name: x.name, kind, value: x.value, invested: x.invested, updated: new Date().toISOString() });
  });
  data.imports.push({ id: uid(), name: file, kind: 'investimentos', count: items.length, at: new Date().toISOString() });
  P.snapshotNetWorth(data);
  pending = null;
  save(); closeSheet();
  location.hash = 'investir'; render();
  toast('Investimentos atualizados');
}

/* ---------- lançamento ---------- */
function txSheet(id) {
  const t = data.tx.find((x) => x.id === Number(id));
  if (!t) return;
  const d = dateOf(t.date);
  const same = data.tx.filter((x) => x.key === t.key).length;
  const rate = P.hourlyRate(data, mkOf(t.date));
  const parcel = P.parcelOf(t);
  const allTags = [...new Set(data.tx.flatMap((x) => x.tags || []))].filter((tg) => !(t.tags || []).includes(tg)).slice(0, 8);
  openSheet(`<div class="tx-head">${avatar(t.merchant, t.type === 'out' ? t.cat : 'saude')}<div><h2>${esc(t.merchant)}</h2><span class="row-sub">${d.getDate()} de ${MONTHS[d.getMonth()]} · ${WEEKDAYS[d.getDay()]}</span></div></div>
    <div class="hero-value ${t.type === 'in' || t.type === 'refund' ? 'pos' : ''}">${t.type === 'in' || t.type === 'refund' ? '+' : '−'}${money(t.amount)}</div>
    ${t.type === 'out' && rate ? `<p class="hint-hours">${icon('clock')} ${P.hoursText(t.amount, rate)}</p>` : ''}
    <p class="raw">${esc(t.desc)}${t.bank ? ` · ${esc(t.bank)}` : ''}${parcel ? ` · parcela ${parcel.n} de ${parcel.of}` : ''}</p>
    <div class="section-head"><h2 class="section-title">Tipo</h2></div>
    <div class="seg wide tight">${Object.entries({ out: 'Gasto', in: 'Entrada', refund: 'Reembolso', inv: 'Aplicação', skip: 'Ignorar' }).map(([k, l]) => `<button class="${t.type === k ? 'on' : ''}" data-action="set-type" data-id="${t.id}" data-type="${k}">${l}</button>`).join('')}</div>
    ${t.type === 'out' || t.type === 'refund' ? `<div class="section-head" style="margin-top:18px"><h2 class="section-title">${t.type === 'refund' ? 'Abate o gasto de' : 'Categoria'}</h2></div>
    <div class="chip-wrap">${Object.entries(CATS).map(([k, c]) => `<button class="chip${k === t.cat ? ' on' : ''}" style="--cat:${c.color}" data-action="set-cat" data-id="${t.id}" data-cat="${k}"><i></i>${c.name}</button>`).join('')}</div>
    ${t.type === 'out' ? `<p class="note">${icon('info')} ${same > 1 ? `A mudança vale para os ${same} lançamentos de “${esc(t.merchant)}” e para os próximos.` : `Os próximos lançamentos de “${esc(t.merchant)}” seguem a mesma categoria.`}</p>` : ''}` : ''}
    ${t.type === 'in' ? `<p class="note">${icon('info')} Alguém te devolveu dinheiro? Marque como <b>Reembolso</b> para abater do gasto em vez de contar como renda.</p>` : ''}
    <div class="section-head" style="margin-top:18px"><h2 class="section-title">Etiquetas</h2></div>
    <div class="tags">${(t.tags || []).map((tg) => `<button class="tagchip on" data-action="tag-del" data-id="${t.id}" data-tag="${esc(tg)}">#${esc(tg)} ${icon('x')}</button>`).join('')}
      ${allTags.map((tg) => `<button class="tagchip" data-action="tag-add" data-id="${t.id}" data-tag="${esc(tg)}">+ #${esc(tg)}</button>`).join('')}</div>
    <form class="tag-form" data-id="${t.id}" style="margin-top:8px"><input class="field" name="tag" placeholder="Nova etiqueta, ex.: viagem-floripa" autocapitalize="none"></form>
    <div class="sheet-foot"><button class="btn block" data-action="close-sheet">Fechar</button>
    <button class="btn block ghost danger" data-action="del-tx" data-id="${t.id}">Excluir lançamento</button></div>`);
}

function setRule(key, patch) {
  const r = data.rules.find((x) => x.key === key);
  if (r) Object.assign(r, patch); else data.rules.push({ key, ...patch });
}

/* ---------- assinatura ---------- */
function subSheet(sub) {
  const s = sub || { name: '', amount: '', day: new Date().getDate(), cat: 'assinaturas' };
  openSheet(`<h2>${sub ? 'Editar assinatura' : 'Nova assinatura'}</h2><p class="page-sub">Cobrança que se repete todo mês</p>
    <form id="sub-form" class="form">
      <label><span>Nome</span><input class="field" name="name" required value="${esc(s.name)}" placeholder="Ex.: Netflix"></label>
      <div class="grid-2"><label><span>Valor</span><input class="field" name="amount" inputmode="decimal" required value="${s.amount ? Number(s.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 }) : ''}" placeholder="0,00"></label>
      <label><span>Dia da cobrança</span><input class="field" name="day" type="number" min="1" max="31" required value="${s.day}"></label></div>
      <label><span>Categoria</span><select class="field" name="cat">${Object.entries(CATS).filter(([, c]) => !c.unknown).map(([k, c]) => `<option value="${k}" ${k === s.cat ? 'selected' : ''}>${c.name}</option>`).join('')}</select></label>
      <div class="sheet-foot"><button class="btn block primary" type="submit">Salvar</button>
      ${sub ? `<div class="mini-actions" style="justify-content:center"><button class="btn small" type="button" data-action="remind" data-kind="sub" data-id="${sub.id}">${icon('bell')} Lembrete no iPhone</button><button class="btn small" type="button" data-action="calendar" data-kind="sub" data-id="${sub.id}">${icon('calendar')} Calendário</button></div>
      <button class="btn block ghost danger" type="button" data-action="sub-del" data-id="${sub.id}">Remover assinatura</button>` : ''}</div>
    </form>`);
  $('#sub-form').onsubmit = (e) => {
    e.preventDefault();
    const f = new FormData(e.target);
    const v = { name: f.get('name').trim(), amount: parseMoneyInput(f.get('amount')), day: Math.min(31, Math.max(1, +f.get('day'))), cat: f.get('cat') };
    if (sub) Object.assign(sub, v); else data.subs.push({ id: uid(), key: merchantKey(v.name), since: mk, ...v });
    save(); closeSheet(); render(); toast('Assinatura salva');
  };
}

/* ---------- investimento ---------- */
function invSheet(inv) {
  const x = inv || { name: '', kind: 'Renda fixa', value: '', invested: '' };
  const num = (v) => (v ? Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2 }) : '');
  openSheet(`<h2>${inv ? 'Editar investimento' : 'Novo investimento'}</h2><p class="page-sub">Atualize o valor sempre que olhar a corretora</p>
    <form id="inv-form" class="form">
      <label><span>Nome</span><input class="field" name="name" required value="${esc(x.name)}" placeholder="Ex.: Tesouro Selic 2029"></label>
      <label><span>Tipo</span><select class="field" name="kind">${KINDS.map((k) => `<option ${k === x.kind ? 'selected' : ''}>${k}</option>`).join('')}</select></label>
      <div class="grid-2"><label><span>Valor atual</span><input class="field" name="value" inputmode="decimal" required value="${num(x.value)}" placeholder="0,00"></label>
      <label><span>Valor aplicado</span><input class="field" name="invested" inputmode="decimal" value="${num(x.invested)}" placeholder="opcional"></label></div>
      <label><span>Mês da aplicação (para comparar com CDI e inflação)</span><input class="field" name="since" type="month" value="${x.since || ''}" max="${currentMk()}"></label>
      <div class="sheet-foot"><button class="btn block primary" type="submit">Salvar</button>
      ${inv ? `<button class="btn block ghost danger" type="button" data-action="inv-del" data-id="${inv.id}">Remover</button>` : ''}</div>
    </form>`);
  $('#inv-form').onsubmit = (e) => {
    e.preventDefault();
    const f = new FormData(e.target);
    const v = { name: f.get('name').trim(), kind: f.get('kind'), value: parseMoneyInput(f.get('value')), invested: parseMoneyInput(f.get('invested')) || undefined, since: f.get('since') || undefined, updated: new Date().toISOString() };
    if (inv) Object.assign(inv, v); else data.inv.push({ id: uid(), ...v });
    P.snapshotNetWorth(data);
    save(); closeSheet(); render(); toast('Investimento salvo');
  };
}

function rulesSheet() {
  openSheet(`<h2>Regras de categoria</h2><p class="page-sub">Criadas quando você troca a categoria de um lançamento</p>
    ${data.rules.length ? `<div class="list">${data.rules.map((r, i) => `<div class="row plain"><div class="row-main"><div class="row-title">${esc(r.key)}</div><div class="row-sub">${r.cat ? tag(r.cat) : ''}${r.type ? `<span class="tag">${TYPES[r.type]}</span>` : ''}</div></div>
      <button class="icon-btn" data-action="rule-del" data-i="${i}" aria-label="Remover">${icon('trash')}</button></div>`).join('')}</div>` : '<p class="empty-hint">Nenhuma regra ainda.</p>'}`);
}

function importsSheet() {
  openSheet(`<h2>Arquivos importados</h2><p class="page-sub">Remover uma importação apaga os lançamentos dela</p>
    ${data.imports.length ? `<div class="list">${[...data.imports].reverse().map((x) => `<div class="row plain"><div class="row-main"><div class="row-title">${esc(x.name)}</div><div class="row-sub">${x.bank ? `${esc(x.bank)} · ` : ''}${x.count} ${x.kind === 'investimentos' ? 'investimentos' : 'lançamentos'} · ${new Date(x.at).toLocaleDateString('pt-BR')}</div></div>
      ${x.kind !== 'investimentos' ? `<button class="icon-btn" data-action="import-del" data-id="${x.id}" aria-label="Remover">${icon('trash')}</button>` : ''}</div>`).join('')}</div>` : '<p class="empty-hint">Nada importado ainda.</p>'}`);
}

async function doExport(fmt) {
  const base = `lastro-${mk}`;
  toast('Gerando…');
  try {
    if (fmt === 'md') await exporter.deliver(new Blob([exporter.markdown(data, mk)], { type: 'text/markdown' }), `${base}.md`);
    if (fmt === 'csv') await exporter.deliver(new Blob([exporter.csv(data, mk)], { type: 'text/csv' }), `${base}.csv`);
    if (fmt === 'xlsx') await exporter.deliver(await exporter.xlsx(data, mk), `${base}.xlsx`);
    if (fmt === 'pdf') await exporter.deliver(await exporter.pdf(data, mk), `${base}.pdf`);
  } catch (e) {
    toast(`Erro ao exportar: ${e.message}`);
  }
}

/* ---------- eventos ---------- */
document.addEventListener('click', async (e) => {
  const chip = e.target.closest('[data-filter]');
  if (chip) { location.hash = `gastos?f=${chip.dataset.filter}`; return; }
  const goto = e.target.closest('[data-goto]');
  if (goto) { mk = goto.dataset.goto; render(); return; }
  const set = e.target.closest('[data-set]');
  if (set) {
    const { set: k, v } = set.dataset;
    if (k === 'theme') setTheme(v); else data.settings[k] = Number(v);
    save(); render(); return;
  }
  const a = e.target.closest('[data-action]');
  if (!a || !data) return;
  const act = a.dataset.action;
  const id = a.dataset.id;
  switch (act) {
    case 'import': importSheet(a.dataset.mode || 'tx'); break;
    case 'close-sheet': closeSheet(); break;
    case 'month': monthSheet(); break;
    case 'set-month': mk = a.dataset.mk; closeSheet(); render(); break;
    case 'confirm-import': confirmImport(); break;
    case 'show-text': openSheet(`<h2>Texto lido</h2><p class="page-sub">As primeiras linhas, do jeito que o app enxerga o arquivo.</p>
      <pre class="raw-text">${esc((pending?.text || '').split('\n').slice(0, 80).join('\n'))}</pre>
      <p class="note">${icon('lock')} Contém seus dados. Se for mandar um print para ajuste, cubra nomes, CPF e valores se preferir: o que importa é o formato das linhas.</p>
      <button class="btn block" data-action="close-sheet">Fechar</button>`); break;
    case 'confirm-inv': confirmInv(); break;
    case 'tx': txSheet(id); break;
    case 'set-cat': {
      const t = data.tx.find((x) => x.id === Number(id));
      if (t.type === 'refund') { t.cat = a.dataset.cat; save(); txSheet(id); render(); break; }
      setRule(t.key, { cat: a.dataset.cat, name: t.merchant });
      const n = data.tx.filter((x) => x.key === t.key && x.type === 'out').map((x) => { x.cat = a.dataset.cat; return x; }).length;
      save(); txSheet(id); render();
      if (n > 1) toast(`${n} lançamentos de ${t.merchant} atualizados`);
      break;
    }
    case 'set-type': {
      const t = data.tx.find((x) => x.id === Number(id));
      t.type = a.dataset.type;
      if (t.type === 'refund' && CATS[t.cat]?.unknown) t.cat = 'delivery';
      else if (t.type !== 'out' && t.type !== 'refund') t.cat = 'outros';
      save(); txSheet(id); render(); break;
    }
    case 'del-tx': data.tx = data.tx.filter((x) => x.id !== Number(id)); save(); closeSheet(); render(); break;
    case 'sub-accept': {
      const sg = recurring(data).find((x) => x.key === a.dataset.key);
      if (sg) data.subs.push({ id: uid(), key: sg.key, name: sg.name, amount: sg.amount, day: sg.day, cat: sg.cat === 'outros' ? 'assinaturas' : sg.cat, since: sg.since });
      save(); render(); toast(`${sg?.name || 'Assinatura'} adicionada`); break;
    }
    case 'sub-dismiss': data.dismissed.push(a.dataset.key); save(); render(); break;
    case 'sub-new': subSheet(); break;
    case 'sub-edit': subSheet(data.subs.find((x) => x.id === id)); break;
    case 'sub-del': data.subs = data.subs.filter((x) => x.id !== id); save(); closeSheet(); render(); break;
    case 'inv-new': invSheet(); break;
    case 'inv-edit': invSheet(data.inv.find((x) => x.id === id)); break;
    case 'inv-del': data.inv = data.inv.filter((x) => x.id !== id); save(); closeSheet(); render(); break;
    case 'toggle-table': {
      const t = a.closest('.card').querySelector('.data-table');
      t.hidden = !t.hidden; a.textContent = t.hidden ? 'Ver tabela' : 'Ocultar tabela'; break;
    }
    case 'export': doExport(a.dataset.fmt); break;
    case 'lock': lockApp(); break;
    case 'toggle-bio': {
      const meta = await vault.getMeta();
      try {
        if (meta.bio) { await vault.disableBio(); toast('Face ID desativado'); } else { await vault.enableBio(); toast('Face ID ativado'); }
      } catch { toast('Não foi possível ativar o Face ID'); }
      render(); break;
    }
    case 'change-pin': {
      showGate();
      createPin(false, async (p) => { await vault.changePin(p); toast('Código alterado'); enterApp(); });
      break;
    }
    case 'new-recovery': {
      if (!confirm('Gerar uma nova chave? A anterior deixa de funcionar.')) break;
      showRecovery(await vault.newRecovery(), false); break;
    }
    case 'rules': rulesSheet(); break;
    case 'rule-del': data.rules.splice(+a.dataset.i, 1); save(); rulesSheet(); render(); break;
    case 'imports': importsSheet(); break;
    case 'import-del': {
      if (!confirm('Remover esta importação e os lançamentos dela?')) break;
      data.tx = data.tx.filter((t) => t.src !== id); data.imports = data.imports.filter((x) => x.id !== id);
      save(); importsSheet(); render(); break;
    }
    case 'backup': {
      await save();
      const today = new Date().toISOString().slice(0, 10);
      await exporter.deliver(new Blob([await vault.exportBackup()], { type: 'application/json' }), `lastro-backup-${today}.lastro`);
      break;
    }
    case 'restore': restoreBackup(); break;
    case 'sample': {
      if (data.tx.length && !confirm('Substituir seus dados pelos dados de exemplo?')) break;
      data = normalize({ ...sampleData(), settings: data.settings });
      pickMonth(); save(); closeSheet(); location.hash = 'inicio'; render(); toast('Dados de exemplo carregados'); break;
    }
    case 'wipe': {
      if (!confirm('Apagar todos os dados deste aparelho? Isso não pode ser desfeito.')) break;
      await vault.wipe(); data = null; showGate(); welcome(); break;
    }
    case 'tag-add': case 'tag-del': {
      const t = data.tx.find((x) => x.id === Number(id));
      const tg = a.dataset.tag;
      t.tags = act === 'tag-add' ? [...new Set([...(t.tags || []), tg])] : (t.tags || []).filter((x) => x !== tg);
      save(); txSheet(id); render(); break;
    }
    case 'rates-fetch': {
      toast('Consultando o Banco Central…');
      try {
        const r = await P.fetchRates();
        Object.assign(data.settings, { cdi: r.cdi, ipca: r.ipca, ratesDate: r.date });
        save(); render(); toast(`CDI ${String(r.cdi).replace('.', ',')}% · IPCA ${String(r.ipca).replace('.', ',')}%`);
      } catch { toast('Sem conexão com o Banco Central. Digite as taxas à mão.'); }
      break;
    }
    case 'calendar-subs': await R.openCalendar(data.subs.map((x) => plan.reminderFor('sub', x.id))); break;
    default: await plan.action(act, a); break;
  }
});

document.addEventListener('submit', (e) => {
  const f = e.target.closest('.tag-form');
  if (!f || !data) return;
  e.preventDefault();
  const tg = new FormData(f).get('tag').trim().replace(/^#/, '').toLowerCase().replace(/\s+/g, '-');
  if (!tg) return;
  const t = data.tx.find((x) => x.id === Number(f.dataset.id));
  t.tags = [...new Set([...(t.tags || []), tg])];
  save(); txSheet(t.id); render();
});

document.addEventListener('change', (e) => {
  if (e.target.dataset?.settingText === 'ownName' && data) {
    data.settings.ownName = e.target.value.trim();
    // reclassifica transferências já importadas
    let n = 0;
    data.tx.forEach((t) => {
      if (t.type !== 'skip' && isOwnTransfer(strip(t.desc), data.settings.ownName)) {
        Object.assign(t, { type: 'skip', cat: 'outros', key: 'TRANSFERÊNCIA ENTRE CONTAS', merchant: 'Transferência entre contas' }); n++;
      }
    });
    save(); toast(n ? `${n} transferência${n > 1 ? 's' : ''} entre contas encontrada${n > 1 ? 's' : ''}` : 'Salvo');
    return;
  }
  if (data && plan.onChange(e.target)) return;
  const s = e.target.dataset?.setting;
  if (!s || !data) return;
  // taxas aceitam "10,65" ou "10.65"
  data.settings[s] = ['cdi', 'ipca'].includes(s) ? parseFloat(e.target.value.replace(',', '.')) || 0 : parseMoneyInput(e.target.value);
  save(); toast('Salvo');
});

document.addEventListener('input', (e) => {
  if (e.target.dataset.action !== 'search') return;
  const p = new URLSearchParams(location.hash.split('?')[1] || '');
  p.set('q', e.target.value);
  history.replaceState(null, '', `#gastos?${p}`);
  const pos = e.target.selectionStart;
  render().then(() => { const i = $('[data-action="search"]'); if (i) { i.focus(); i.setSelectionRange(pos, pos); } });
});

/* tooltip: passa o mouse no computador, toca no iPhone */
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
  if (e.pointerType !== 'mouse') return;
  const el = e.target.closest('[data-tip]');
  if (el) showTip(el, e.clientX, e.clientY); else tip.hidden = true;
});
document.addEventListener('pointerdown', (e) => {
  if (e.pointerType === 'mouse') return;
  const el = e.target.closest('[data-tip]');
  if (el && !el.matches('a')) showTip(el, e.clientX, e.clientY); else tip.hidden = true;
});
window.addEventListener('scroll', () => { tip.hidden = true; }, { passive: true });

/* tema */
function setTheme(t) {
  if (t === 'auto') delete document.documentElement.dataset.theme; else document.documentElement.dataset.theme = t;
  try { localStorage.setItem('lastro-theme', t); } catch { /* sem storage */ }
}

/* ---------- início ---------- */
(async () => {
  if (!window.crypto?.subtle || !window.indexedDB) {
    gate.innerHTML = '<div class="lock-inner"><h1 class="lock-title">Navegador não suportado</h1><p class="lock-sub">Abra no Safari do iPhone (iOS 16 ou mais recente).</p></div>';
    return;
  }
  if (await vault.exists()) unlockScreen(true); else welcome();
})();

if ('serviceWorker' in navigator && location.protocol !== 'file:') navigator.serviceWorker.register('sw.js').catch(() => {});

// atalho só para testes no computador (localhost): ?demo cria um cofre com o código 123456 e dados de exemplo
if (['localhost', '127.0.0.1'].includes(location.hostname) && new URLSearchParams(location.search).has('demo')) {
  (async () => {
    if (!(await vault.exists())) { await vault.create('123456', normalize(sampleData())); }
    if (await vault.unlockWithPin('123456')) enterApp(true);
  })();
}
