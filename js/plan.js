// Planejamento: parcelas futuras, orçamento, essenciais x supérfluos, custo em horas, juros e tarifas,
// gastos anuais, metas, patrimônio líquido, comparação com CDI/IPCA, imposto de renda e fechamento do mês.
import { CATS, strip } from './categorize.js';
import { summary, mkOf, shiftMonth, currentMk, recurring } from './analysis.js';

const monthsBetween = (a, b) => {
  const [ya, ma] = a.split('-').map(Number), [yb, mb] = b.split('-').map(Number);
  return (yb - ya) * 12 + (mb - ma);
};

/* ---------- parcelas ---------- */
const PARCEL = /(?:PARCELA\s*)?\b(\d{1,2})\s*(?:\/|DE)\s*(\d{1,2})\b/;

/** "LOJA X 03/10" → { n: 3, of: 10 }. Ignora quando o número é a própria data (extratos do Itaú). */
export function parcelOf(t) {
  if (t.type !== 'out' || /^(PIX|TED|DOC)/.test(t.key)) return null;
  const m = strip(t.desc).match(PARCEL);
  if (!m) return null;
  const n = +m[1], of = +m[2];
  if (of < 2 || of > 48 || n < 1 || n > of) return null;
  if (n === +t.date.slice(8) && of === +t.date.slice(5, 7)) return null;
  return { n, of };
}

/** Compras parceladas e quanto ainda falta pagar em cada mês. */
export function installments(data, fromMk = currentMk()) {
  const groups = {};
  data.tx.forEach((t) => {
    const p = parcelOf(t);
    if (!p) return;
    const id = `${t.key}|${t.amount.toFixed(2)}|${p.of}`;
    const g = groups[id];
    // fica com a parcela mais recente da mesma compra
    if (!g || p.n > g.n) groups[id] = { id, name: t.merchant, cat: t.cat, amount: t.amount, n: p.n, of: p.of, mk: mkOf(t.date) };
  });
  const list = Object.values(groups).map((g) => {
    const endMk = shiftMonth(g.mk, g.of - g.n);
    // parcelas que ainda vencem depois do mês de referência
    const remaining = Math.min(g.of - g.n, Math.max(0, monthsBetween(fromMk, endMk)));
    return { ...g, endMk, remaining, owed: remaining * g.amount, total: g.of * g.amount };
  }).filter((g) => g.remaining > 0)
    .sort((a, b) => b.owed - a.owed);
  // valor por mês nos próximos 12 meses
  const schedule = Array.from({ length: 12 }, (_, i) => {
    const m = shiftMonth(fromMk, i + 1);
    const items = list.filter((g) => m > g.mk && m <= g.endMk);
    return { mk: m, total: items.reduce((s, g) => s + g.amount, 0), count: items.length };
  });
  return { list, schedule, owed: list.reduce((s, g) => s + g.owed, 0) };
}

/* ---------- orçamento ---------- */
export function budgetStatus(data, mk) {
  const s = summary(data, mk);
  const now = new Date();
  const isCurrent = mk === currentMk();
  const days = new Date(+mk.slice(0, 4), +mk.slice(5), 0).getDate();
  const elapsed = isCurrent ? Math.max(1, now.getDate()) : days;
  const rows = Object.entries(data.budgets || {}).filter(([, v]) => v > 0).map(([cat, limit]) => {
    const spent = s.cats.find((c) => c.id === cat)?.value || 0;
    const projected = isCurrent ? (spent / elapsed) * days : spent;
    return { cat, limit, spent, projected, ratio: spent / limit, over: spent > limit, willOver: projected > limit };
  }).sort((a, b) => b.ratio - a.ratio);
  const limitTotal = rows.reduce((a, r) => a + r.limit, 0);
  return { rows, limitTotal, spentTotal: s.total, projectedTotal: isCurrent ? (s.total / elapsed) * days : s.total, isCurrent, elapsed, days };
}

/** sugere limites pela média dos últimos 3 meses, arredondada para cima de 50 em 50 */
export function suggestBudgets(data, mk) {
  const out = {};
  for (let i = 1; i <= 3; i++) {
    summary(data, shiftMonth(mk, -i)).cats.forEach((c) => { out[c.id] = (out[c.id] || 0) + c.value / 3; });
  }
  Object.keys(out).forEach((k) => {
    if (CATS[k]?.unknown || out[k] < 20) delete out[k]; else out[k] = Math.ceil(out[k] / 50) * 50;
  });
  return out;
}

/* ---------- essenciais x supérfluos ---------- */
export const DEFAULT_ESSENTIAL = { moradia: true, mercado: true, transporte: true, saude: true, taxas: true, delivery: false, assinaturas: false, compras: false, lazer: false };
export const isEssential = (data, cat) => (data.settings.essential || DEFAULT_ESSENTIAL)[cat] ?? DEFAULT_ESSENTIAL[cat] ?? false;

export function needsWants(data, mk) {
  const s = summary(data, mk);
  let needs = 0, wants = 0, unknown = 0;
  s.cats.forEach((c) => {
    if (CATS[c.id]?.unknown) unknown += c.value; else if (isEssential(data, c.id)) needs += c.value; else wants += c.value;
  });
  return { needs, wants, unknown, invested: s.invested, income: s.income };
}

export function avgEssential(data, mk, n = 3) {
  let sum = 0, k = 0;
  for (let i = 0; i < n; i++) {
    const v = needsWants(data, shiftMonth(mk, -i)).needs;
    if (v) { sum += v; k++; }
  }
  return k ? sum / k : 0;
}

/* ---------- custo em horas de trabalho ---------- */
export function hourlyRate(data, mk) {
  let inc = 0, k = 0;
  for (let i = 0; i < 3; i++) {
    const v = summary(data, shiftMonth(mk, -i)).income;
    if (v) { inc += v; k++; }
  }
  const income = k ? inc / k : data.settings.income || 0;
  const hours = data.settings.hoursMonth || 176;
  return income && hours ? income / hours : 0;
}
export function hoursText(amount, rate) {
  if (!rate) return '';
  const h = amount / rate;
  if (h < 1) return `${Math.max(1, Math.round(h * 60))} min de trabalho`;
  const hh = Math.floor(h), mm = Math.round((h - hh) * 60);
  if (h >= 16) return `${(h / 8).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} dias de trabalho`;
  return `${hh}h${mm ? String(mm).padStart(2, '0') : ''} de trabalho`;
}

/* ---------- juros e tarifas ---------- */
export function feesByYear(data, year) {
  const tx = data.tx.filter((t) => t.type === 'out' && t.cat === 'taxas' && t.date.startsWith(String(year)));
  const by = {};
  tx.forEach((t) => { (by[t.merchant] ||= { name: t.merchant, total: 0, count: 0 }); by[t.merchant].total += t.amount; by[t.merchant].count++; });
  const months = Array.from({ length: 12 }, (_, i) => tx.filter((t) => +t.date.slice(5, 7) === i + 1).reduce((s, t) => s + t.amount, 0));
  return { total: tx.reduce((s, t) => s + t.amount, 0), items: Object.values(by).sort((a, b) => b.total - a.total), months, count: tx.length };
}

/* ---------- gastos que vêm uma vez por ano ---------- */
export const ANNUAL_PRESETS = [
  ['IPVA', 1], ['IPTU', 2], ['Licenciamento do carro', 4], ['Seguro do carro', 6], ['Material escolar', 1], ['Matrícula', 1],
  ['Presentes de fim de ano', 12], ['Anuidade do cartão', 3], ['Viagem de férias', 7], ['Declaração do IR', 4],
];
const ANNUAL_RE = /IPVA|IPTU|LICENCIAMENTO|DETRAN|SEGURO|MATRICULA|ANUIDADE/;

export function annualPlan(data, mk = currentMk()) {
  const list = (data.annual || []).map((a) => {
    const y = +mk.slice(0, 4);
    let due = `${y}-${String(a.month).padStart(2, '0')}`;
    if (due < mk) due = `${y + 1}-${String(a.month).padStart(2, '0')}`;
    const monthsLeft = monthsBetween(mk, due);
    return { ...a, due, monthsLeft, perMonth: a.amount / Math.max(1, monthsLeft || 12) };
  }).sort((a, b) => a.due.localeCompare(b.due));
  const total = list.reduce((s, a) => s + a.amount, 0);
  // gastos anuais vistos no extrato e ainda não cadastrados
  const known = new Set(list.map((a) => strip(a.name)));
  const seen = {};
  data.tx.filter((t) => t.type === 'out' && ANNUAL_RE.test(strip(t.desc)) && monthsBetween(mkOf(t.date), mk) < 12).forEach((t) => {
    const k = t.merchant;
    if ([...known].some((n) => n.includes(strip(k)) || strip(k).includes(n))) return;
    (seen[k] ||= { name: k, amount: 0, month: +t.date.slice(5, 7) }).amount += t.amount;
  });
  return { list, total, perMonth: total / 12, found: Object.values(seen) };
}

/* ---------- metas ---------- */
export function goalStatus(g, mk = currentMk()) {
  const left = Math.max(0, g.target - (g.saved || 0));
  const months = g.deadline ? Math.max(1, monthsBetween(mk, g.deadline) + 1) : null;
  return { left, months, perMonth: months ? left / months : null, ratio: g.target ? Math.min(1, (g.saved || 0) / g.target) : 0, done: left <= 0, late: g.deadline && g.deadline < mk && left > 0 };
}

/* ---------- patrimônio líquido ---------- */
export function netWorth(data) {
  const accounts = (data.accounts || []).filter((a) => a.kind !== 'divida');
  const debts = (data.accounts || []).filter((a) => a.kind === 'divida');
  const cash = accounts.reduce((s, a) => s + a.value, 0);
  const invested = data.inv.reduce((s, x) => s + x.value, 0);
  const parcels = installments(data).owed;
  const debt = debts.reduce((s, a) => s + a.value, 0);
  const assets = cash + invested;
  const liabilities = debt + parcels;
  return { cash, invested, assets, debt, parcels, liabilities, net: assets - liabilities, accounts, debts };
}

/** guarda uma foto do patrimônio por mês para mostrar a evolução */
export function snapshotNetWorth(data) {
  const nw = netWorth(data);
  data.nwHistory ||= {};
  data.nwHistory[currentMk()] = { assets: +nw.assets.toFixed(2), liabilities: +nw.liabilities.toFixed(2), net: +nw.net.toFixed(2) };
}

/* ---------- rendimento x CDI e inflação ---------- */
export function compareRates(inv, settings, mk = currentMk()) {
  const cdi = settings.cdi, ipca = settings.ipca;
  if (!inv.invested || !inv.since) return null;
  const months = Math.max(1, monthsBetween(inv.since, mk));
  const ret = inv.value / inv.invested - 1;
  const years = months / 12;
  const cdiP = cdi ? (1 + cdi / 100) ** years - 1 : null;
  const ipcaP = ipca ? (1 + ipca / 100) ** years - 1 : null;
  return {
    months, ret,
    yearly: (1 + ret) ** (1 / years) - 1,
    pctCdi: cdiP ? ret / cdiP : null,
    real: ipcaP != null ? (1 + ret) / (1 + ipcaP) - 1 : null,
    cdiP, ipcaP,
  };
}

export function portfolioVsBenchmarks(data) {
  const rows = data.inv.map((x) => ({ x, c: compareRates(x, data.settings) })).filter((r) => r.c);
  if (!rows.length) return null;
  const inv = rows.reduce((s, r) => s + r.x.invested, 0);
  const val = rows.reduce((s, r) => s + r.x.value, 0);
  const cdiGain = rows.reduce((s, r) => s + (r.c.cdiP != null ? r.x.invested * r.c.cdiP : 0), 0);
  const ipcaGain = rows.reduce((s, r) => s + (r.c.ipcaP != null ? r.x.invested * r.c.ipcaP : 0), 0);
  return { rows, invested: inv, value: val, gain: val - inv, cdiGain, ipcaGain, pctCdi: cdiGain ? (val - inv) / cdiGain : null };
}

/** Busca CDI (série 4389, % a.a.) e IPCA 12 meses (série 13522) na API pública do Banco Central. */
export async function fetchRates() {
  const get = async (serie) => {
    const r = await fetch(`https://api.bcb.gov.br/dados/serie/bcdata.sgs.${serie}/dados/ultimos/1?formato=json`, { cache: 'no-store' });
    if (!r.ok) throw new Error('Banco Central indisponível');
    const [row] = await r.json();
    return { value: parseFloat(String(row.valor).replace(',', '.')), date: row.data };
  };
  const [cdi, ipca] = await Promise.all([get(4389), get(13522)]);
  return { cdi: cdi.value, ipca: ipca.value, date: cdi.date };
}

/* ---------- imposto de renda ---------- */
const IR_HEALTH = /UNIMED|AMIL|SULAMERICA|SUL AMERICA|BRADESCO SAUDE|HAPVIDA|NOTREDAME|PORTO SAUDE|PREVENT|HOSPITAL|CLINICA|LABORATORIO|ODONTO|DENTISTA|MEDIC[OA]|DR\.? |DRA\.? |PSICOLOG|PSIQUIATR|FISIOTERAP|FONOAUDIOLOG|TERAPEUTA|FLEURY|DASA|LAVOISIER|DELBONI|SABIN|HERMES PARDINI|EXAME/;
const IR_EDU = /ESCOLA|COLEGIO|FACULDADE|UNIVERSIDADE|UNIVERSITARI|EDUCACIONAL|ENSINO|MENSALIDADE ESC|CRECHE|PUC|ESTACIO|ANHANGUERA|UNIP|MACKENZIE|FGV|INSPER/;
const IR_PREV = /PGBL|PREVIDENCIA PRIVADA|BRASILPREV|ICATU PREV|PREV PRIVADA/;
const NOT_DEDUCTIBLE = /FARMACIA|DROGA|DROGASIL|RAIA|PANVEL|PAGUE MENOS|ACADEMIA|SMART ?FIT|ESTETICA|OTICA/;

export function irReport(data, year) {
  const y = String(year);
  const tx = data.tx.filter((t) => t.date.startsWith(y));
  const group = (list) => {
    const by = {};
    list.forEach((t) => { (by[t.merchant] ||= { name: t.merchant, total: 0, count: 0, items: [] }); by[t.merchant].total += t.amount; by[t.merchant].count++; by[t.merchant].items.push(t); });
    return Object.values(by).sort((a, b) => b.total - a.total);
  };
  const tagged = (t, tg) => (t.tags || []).some((x) => x.toLowerCase() === tg);
  const out = tx.filter((t) => t.type === 'out');
  const health = out.filter((t) => tagged(t, 'saude-ir') || (IR_HEALTH.test(strip(t.desc)) && !NOT_DEDUCTIBLE.test(strip(t.desc))));
  const edu = out.filter((t) => tagged(t, 'educacao-ir') || IR_EDU.test(strip(t.desc)));
  const prev = tx.filter((t) => (t.type === 'out' || t.type === 'inv') && IR_PREV.test(strip(t.desc)));
  const income = group(tx.filter((t) => t.type === 'in'));
  const sum = (l) => l.reduce((s, t) => s + t.amount, 0);
  return {
    year: y,
    income, incomeTotal: income.reduce((s, g) => s + g.total, 0),
    health: group(health), healthTotal: sum(health),
    edu: group(edu), eduTotal: sum(edu),
    prev: group(prev), prevTotal: sum(prev),
    goods: data.inv.map((x) => ({ name: x.name, kind: x.kind, value: x.value, invested: x.invested })),
  };
}

/* ---------- fechamento do mês ---------- */
export function closingChecklist(data, mk, budget) {
  const s = summary(data, mk);
  const banks = [...new Set(data.tx.map((t) => t.bank).filter(Boolean))];
  const banksThisMonth = new Set(s.tx.map((t) => t.bank).filter(Boolean));
  const missing = banks.filter((b) => !banksThisMonth.has(b));
  const updatedThisMonth = (list) => list.length > 0 && list.every((x) => x.updated && mkOf(x.updated) >= mk);
  const subs = recurring(data).length;
  const over = budget.rows.filter((r) => r.over);
  return [
    { id: 'import', title: 'Importar os extratos e faturas do mês', done: s.tx.length > 0 && missing.length === 0,
      sub: s.tx.length ? (missing.length ? `Faltam: ${missing.join(', ')}` : `${banksThisMonth.size || 1} banco${banksThisMonth.size > 1 ? 's' : ''} com lançamentos no mês`) : 'Nenhum lançamento neste mês', action: 'import' },
    { id: 'unknown', title: 'Classificar os gastos sem categoria', done: s.unknown.length === 0, sub: s.unknown.length ? `${s.unknown.length} para revisar` : 'Tudo classificado', link: '#gastos?f=outros' },
    { id: 'subs', title: 'Confirmar assinaturas encontradas', done: subs === 0, sub: subs ? `${subs} sugest${subs > 1 ? 'ões' : 'ão'}` : 'Nada pendente', link: '#assinaturas' },
    { id: 'budget', title: 'Conferir o orçamento', done: budget.rows.length > 0 && over.length === 0, sub: !budget.rows.length ? 'Nenhum limite definido' : over.length ? `Acima do limite: ${over.map((r) => CATS[r.cat].name).join(', ')}` : 'Dentro dos limites', link: '#orcamento' },
    { id: 'inv', title: 'Atualizar investimentos e saldos', done: updatedThisMonth(data.inv) && (data.accounts || []).every((a) => a.updated && mkOf(a.updated) >= mk), sub: 'Valores da corretora e saldo das contas', link: '#patrimonio' },
    { id: 'goals', title: 'Guardar o dinheiro das metas', done: (data.goals || []).length > 0 && (data.goals || []).every((g) => g.lastDeposit && mkOf(g.lastDeposit) >= mk), sub: (data.goals || []).length ? 'Registre quanto guardou para cada meta' : 'Nenhuma meta criada', link: '#metas' },
    { id: 'export', title: 'Salvar o relatório no Obsidian', done: !!(data.exported || {})[mk], sub: 'Exporta o mês em Markdown', action: 'export-md' },
  ];
}

export { monthsBetween };
