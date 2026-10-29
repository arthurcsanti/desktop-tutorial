// Lastro — interface.
import * as vault from './vault.js';
import { CATS, TYPES, classify, merchantKey, bankCategory, isOwnTransfer, strip } from './categorize.js';
import { readStatement, readInvestments } from './parsers.js';
import { summary, history, months, insights, recurring, subStatus, subsTotal, avgSpend, monthLabel, monthName, monthShort, mkOf, currentMk, MONTHS } from './analysis.js';
import * as exporter from './exports.js';
import { sampleData } from './sample.js';

/* ---------- Ícones (traço fino, estilo SF Symbols) ---------- */
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
const icon = (name) => `<span class="ico"><svg viewBox="0 0 24 24" aria-hidden="true">${ICONS[name] || ''}</svg></span>`;

/* ---------- formatação ---------- */
const BRL = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const money = (v) => BRL.format(v);
const moneyShort = (v) => (Math.abs(v) >= 1000 ? `R$ ${(v / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} mil` : money(v));
const pct = (v) => `${Math.round(v * 100)}%`;
const WEEKDAYS = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const dateOf = (iso) => new Date(`${iso}T12:00:00`);
const uid = () => Math.random().toString(36).slice(2, 10);
const $ = (s, r = document) => r.querySelector(s);
const parseMoneyInput = (v) => parseFloat(String(v).replace(/\./g, '').replace(',', '.')) || 0;

/* ---------- estado ---------- */
const EMPTY = () => ({ v: 1, tx: [], rules: [], subs: [], dismissed: [], inv: [], imports: [], settings: { income: 0, goalPct: 0.2, lockAfter: 60 } });
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

/* ---------- categorias de investimento: cor segue o tipo ---------- */
const KINDS = ['Reserva de emergência', 'Renda fixa', 'Renda variável', 'Exterior', 'Cripto', 'Previdência', 'Fundos', 'Outros'];
const KIND_COLOR = { 'Reserva de emergência': 'var(--c1)', 'Renda fixa': 'var(--c3)', 'Renda variável': 'var(--c2)', Exterior: 'var(--c7)', Cripto: 'var(--c4)', Previdência: 'var(--c5)', Fundos: 'var(--c6)', Outros: 'var(--c8)' };
function guessKind(name) {
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
  { id: 'relatorios', label: 'Relatórios', icon: 'file' },
];

function topbar() {
  return `<div class="topbar">
    <button class="month-pill" data-action="month">${monthLabel(mk)} ${icon('down')}</button>
    <div class="topbar-actions">
      <button class="icon-btn" data-action="import" aria-label="Importar">${icon('plus')}</button>
      <a class="icon-btn" href="#ajustes" aria-label="Ajustes">${icon('gear')}</a>
    </div></div>`;
}

const avatar = (name, cat) => (CATS[cat]?.unknown
  ? `<div class="avatar unknown">${icon('question')}</div>`
  : `<div class="avatar" style="--cat:${CATS[cat]?.color || 'var(--c0)'}">${esc((name.replace(/^PIX · /, '').trim()[0] || '?').toUpperCase())}</div>`);
const tag = (cat) => `<span class="tag${CATS[cat]?.unknown ? ' unknown' : ''}" style="--cat:${CATS[cat]?.color}">${CATS[cat]?.name || cat}</span>`;
const typeTag = (t) => (t.type === 'out' ? tag(t.cat) : `<span class="tag type-${t.type}">${TYPES[t.type]}</span>`);

function heroValue(v) {
  const [int, cents] = money(v).split(',');
  return `<div class="hero-value">${int}<span class="cents">,${cents}</span></div>`;
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

function callout(n) {
  return `<div class="callout ${n.tone}">
    <div class="callout-ico">${icon(n.icon)}</div>
    <div><p>${esc(n.title)}</p>${n.sub ? `<p>${esc(n.sub)}</p>` : ''}
    ${n.action ? `<div class="callout-actions"><button class="btn small primary" data-action="sub-accept" data-key="${esc(n.action.key)}">Adicionar</button><button class="btn small" data-action="sub-dismiss" data-key="${esc(n.action.key)}">Agora não</button></div>` : ''}
    ${n.link ? `<div class="callout-actions"><a class="btn small" href="${n.link}">Revisar</a></div>` : ''}</div></div>`;
}

const views = {
  inicio() {
    if (!data.tx.length) return `${topbar()}<h1 class="page-title">Visão geral</h1><p class="page-sub">Nenhum lançamento ainda</p>${emptyState('Comece pelo extrato', 'Exporte o extrato ou a fatura no app do banco e importe aqui. Tudo é lido no próprio iPhone.')}`;
    const s = summary(data, mk);
    const notes = insights(data, mk, money);
    const left = s.income - s.total - s.invested;
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
      ${notes.length ? `<div class="section"><div class="section-head"><h2 class="section-title">Observações</h2></div>${notes.slice(0, 4).map(callout).join('')}</div>` : ''}
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
      </div>`;
  },

  gastos(params) {
    const filter = params.get('f') || 'todos';
    const q = (params.get('q') || '').toLowerCase();
    const s = summary(data, mk);
    let tx = [...s.tx].sort((a, b) => b.date.localeCompare(a.date) || b.id - a.id);
    if (filter === 'in' || filter === 'inv' || filter === 'skip') tx = tx.filter((t) => t.type === filter);
    else if (filter !== 'todos') tx = tx.filter((t) => t.type === 'out' && t.cat === filter);
    if (q) tx = tx.filter((t) => `${t.merchant} ${t.desc}`.toLowerCase().includes(q));
    const groups = new Map();
    tx.forEach((t) => { if (!groups.has(t.date)) groups.set(t.date, []); groups.get(t.date).push(t); });
    const types = ['in', 'inv', 'skip'].filter((ty) => s.tx.some((t) => t.type === ty));
    const chips = [`<button class="chip${filter === 'todos' ? ' on' : ''}" data-filter="todos">Todos</button>`]
      .concat(s.cats.map((c) => `<button class="chip${filter === c.id ? ' on' : ''}" data-filter="${c.id}" style="--cat:${CATS[c.id].color}"><i></i>${CATS[c.id].name}</button>`))
      .concat(types.map((ty) => `<button class="chip${filter === ty ? ' on' : ''}" data-filter="${ty}">${{ in: 'Entradas', inv: 'Investimentos', skip: 'Ignorados' }[ty]}</button>`)).join('');
    const outSum = tx.filter((t) => t.type === 'out').reduce((a, t) => a + t.amount, 0);
    const body = [...groups.entries()].map(([date, list]) => {
      const d = dateOf(date);
      const daySum = list.filter((t) => t.type === 'out').reduce((a, t) => a + t.amount, 0);
      return `<div class="day-head"><strong>${d.getDate()} de ${MONTHS[d.getMonth()]}</strong><span>${WEEKDAYS[d.getDay()]}${daySum ? ` · ${money(daySum)}` : ''}</span></div>
        <div class="list">${list.map((t) => `
          <button class="row row-btn" data-action="tx" data-id="${t.id}">${avatar(t.merchant, t.type === 'out' ? t.cat : 'saude')}
            <div class="row-main"><div class="row-title">${esc(t.merchant)}</div><div class="row-sub">${typeTag(t)}${t.type === 'out' && data.subs.some((x) => x.key === t.key) ? '<span class="pill">Assinatura</span>' : ''}</div></div>
            <div class="row-amt ${t.type === 'in' ? 'in' : ''} ${t.type === 'skip' ? 'muted' : ''}">${t.type === 'in' ? '+' : '−'}${money(t.amount)}</div>
          </button>`).join('')}</div>`;
    }).join('');
    return `${topbar()}
      <h1 class="page-title">Gastos</h1>
      <p class="page-sub">${money(outSum)} em ${tx.filter((t) => t.type === 'out').length} gastos</p>
      <label class="search">${icon('search')}<input type="search" placeholder="Buscar loja ou descrição" value="${esc(q)}" data-action="search"></label>
      <div class="chips">${chips}</div>
      ${body || (data.tx.length ? '<p class="empty-hint">Nada encontrado neste mês.</p>' : emptyState('Nenhum gasto ainda', 'Importe um extrato para ver seus lançamentos aqui.'))}`;
  },

  assinaturas() {
    const total = subsTotal(data);
    const s = summary(data, mk);
    const sugg = recurring(data);
    const today = mk === currentMk() ? new Date().getDate() : 0;
    const sorted = [...data.subs].sort((a, b) => a.day - b.day);
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
            <div class="row-main"><div class="row-title">${esc(x.name)}</div><div class="row-sub">Todo dia ${x.day} · ${money(x.amount * 12)}/ano</div></div>
            <div class="row-amt">${money(x.amount)}${status}</div></button>`;
        }).join('')}</div>` : '<p class="empty-hint">Nenhuma assinatura cadastrada. Toque em “+ Nova” ou importe extratos de alguns meses para o app encontrar.</p>'}
      </div>
      <p class="note">${icon('info')} Uma cobrança vira sugestão quando aparece com o mesmo valor por 3 meses seguidos (2, se for streaming ou app).</p>`;
  },

  investir() {
    const inv = data.inv;
    const total = inv.reduce((s, x) => s + x.value, 0);
    const applied = inv.filter((x) => x.invested).reduce((s, x) => s + x.invested, 0);
    const gain = inv.filter((x) => x.invested).reduce((s, x) => s + x.value - x.invested, 0);
    const s = summary(data, mk);
    const avg = avgSpend(data, mk, 3) || s.total;
    const reserve = inv.filter((x) => x.kind === 'Reserva de emergência').reduce((a, x) => a + x.value, 0);
    const reserveMonths = avg ? reserve / avg : 0;
    const groups = KINDS.map((k) => ({ k, v: inv.filter((x) => (x.kind || 'Outros') === k).reduce((a, x) => a + x.value, 0) })).filter((g) => g.v > 0).sort((a, b) => b.v - a.v);
    const goal = s.income * (data.settings.goalPct ?? 0.2);
    const tips = [];
    if (avg && reserveMonths < 6) tips.push(['shield', `Complete a reserva de emergência antes de aumentar o risco.`, `Hoje ela cobre ${reserveMonths.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} meses dos seus gastos; o recomendado é 6 (${money(avg * 6)}).`]);
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
          <div class="spread"><span>${reserveMonths.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} de 6 meses de gastos</span><strong class="num">${money(reserve)}</strong></div>
          <div class="progress"><div style="width:${Math.min(1, reserveMonths / 6) * 100}%"></div></div>
          <div class="tiny">${reserve >= avg * 6 ? 'Reserva completa.' : `Faltam ${money(avg * 6 - reserve)} · base: média de ${money(avg)}/mês`}${reserve ? '' : ' · marque um investimento como “Reserva de emergência”'}</div>
        </div></div>` : ''}
      ${inv.length ? `<div class="section"><div class="section-head"><h2 class="section-title">Carteira</h2><button class="link" data-action="inv-new">+ Adicionar</button></div>
        <div class="list">${[...inv].sort((a, b) => b.value - a.value).map((x) => {
          const g = x.invested ? (x.value - x.invested) / x.invested : null;
          return `<button class="row row-btn" data-action="inv-edit" data-id="${x.id}"><div class="avatar" style="--cat:${KIND_COLOR[x.kind] || 'var(--c0)'}">${esc(x.name[0] || '?')}</div>
            <div class="row-main"><div class="row-title">${esc(x.name)}</div><div class="row-sub">${esc(x.kind || 'Outros')}</div></div>
            <div class="row-amt">${money(x.value)}${g != null ? `<small class="${g >= 0 ? 'ok' : 'bad'}">${g >= 0 ? '+' : '−'}${(Math.abs(g) * 100).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%</small>` : ''}</div></button>`;
        }).join('')}</div></div>` : ''}
      ${tips.length ? `<div class="section"><div class="section-head"><h2 class="section-title">Sugestões</h2></div>
        ${tips.map(([ic, t, sub]) => callout({ tone: '', icon: ic, title: t, sub })).join('')}
        <p class="note">${icon('info')} Sugestões gerais, calculadas com os seus números. Não são recomendação de investimento.</p></div>` : ''}`;
  },

  relatorios() {
    const s = summary(data, mk);
    return `${topbar()}
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
      <p class="empty-hint">Lastro · versão 1.1</p>`;
  },
};

/* ---------- render ---------- */
let renderSeq = 0;
async function render() {
  if (!data) return;
  const seq = ++renderSeq;
  const [route, query] = (location.hash.slice(1) || 'inicio').split('?');
  const id = views[route] ? route : 'inicio';
  const html = await views[id](new URLSearchParams(query || ''));
  if (seq !== renderSeq) return;
  $('#view').innerHTML = html;
  const nav = ROUTES.map((r) => `<a href="#${r.id}" class="${r.id === id ? 'active' : ''}">${icon(r.icon)}<span>${r.label}</span></a>`).join('');
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
    const { items: raw, bank } = await readStatement(file, { askPassword });
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
    pending = { mode, file: file.name, items, dupes, bank };
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
      ${dupes ? '' : `<p class="note">${icon('info')} O arquivo precisa ter data, descrição e valor. Se for PDF escaneado (foto), exporte em CSV ou OFX no app do banco.</p>`}
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
  openSheet(`<div class="tx-head">${avatar(t.merchant, t.type === 'out' ? t.cat : 'saude')}<div><h2>${esc(t.merchant)}</h2><span class="row-sub">${d.getDate()} de ${MONTHS[d.getMonth()]} · ${WEEKDAYS[d.getDay()]}</span></div></div>
    <div class="hero-value ${t.type === 'in' ? 'pos' : ''}">${t.type === 'in' ? '+' : '−'}${money(t.amount)}</div>
    <p class="raw">${esc(t.desc)}${t.bank ? ` · ${esc(t.bank)}` : ''}</p>
    <div class="section-head"><h2 class="section-title">Tipo</h2></div>
    <div class="seg wide">${Object.entries(TYPES).map(([k, l]) => `<button class="${t.type === k ? 'on' : ''}" data-action="set-type" data-id="${t.id}" data-type="${k}">${l}</button>`).join('')}</div>
    ${t.type === 'out' ? `<div class="section-head" style="margin-top:18px"><h2 class="section-title">Categoria</h2></div>
    <div class="chip-wrap">${Object.entries(CATS).map(([k, c]) => `<button class="chip${k === t.cat ? ' on' : ''}" style="--cat:${c.color}" data-action="set-cat" data-id="${t.id}" data-cat="${k}"><i></i>${c.name}</button>`).join('')}</div>
    <p class="note">${icon('info')} ${same > 1 ? `A mudança vale para os ${same} lançamentos de “${esc(t.merchant)}” e para os próximos.` : `Os próximos lançamentos de “${esc(t.merchant)}” seguem a mesma categoria.`}</p>` : ''}
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
      ${sub ? `<button class="btn block ghost danger" type="button" data-action="sub-del" data-id="${sub.id}">Remover assinatura</button>` : ''}</div>
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
      <div class="sheet-foot"><button class="btn block primary" type="submit">Salvar</button>
      ${inv ? `<button class="btn block ghost danger" type="button" data-action="inv-del" data-id="${inv.id}">Remover</button>` : ''}</div>
    </form>`);
  $('#inv-form').onsubmit = (e) => {
    e.preventDefault();
    const f = new FormData(e.target);
    const v = { name: f.get('name').trim(), kind: f.get('kind'), value: parseMoneyInput(f.get('value')), invested: parseMoneyInput(f.get('invested')) || undefined, updated: new Date().toISOString() };
    if (inv) Object.assign(inv, v); else data.inv.push({ id: uid(), ...v });
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
    case 'confirm-inv': confirmInv(); break;
    case 'tx': txSheet(id); break;
    case 'set-cat': {
      const t = data.tx.find((x) => x.id === Number(id));
      setRule(t.key, { cat: a.dataset.cat, name: t.merchant });
      const n = data.tx.filter((x) => x.key === t.key && x.type === 'out').map((x) => { x.cat = a.dataset.cat; return x; }).length;
      save(); txSheet(id); render();
      if (n > 1) toast(`${n} lançamentos de ${t.merchant} atualizados`);
      break;
    }
    case 'set-type': {
      const t = data.tx.find((x) => x.id === Number(id));
      t.type = a.dataset.type;
      if (t.type !== 'out') t.cat = 'outros';
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
    default: break;
  }
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
  const s = e.target.dataset?.setting;
  if (!s || !data) return;
  data.settings[s] = parseMoneyInput(e.target.value);
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
