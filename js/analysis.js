// Cálculos do mês: totais, categorias, lojas, comparação, assinaturas recorrentes e observações.
import { CATS } from './categorize.js';

export const MONTHS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
export const MONTHS_FULL = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

export const mkOf = (date) => date.slice(0, 7);
export function shiftMonth(mk, n) {
  const [y, m] = mk.split('-').map(Number);
  const d = new Date(y, m - 1 + n, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}
export const monthName = (mk) => MONTHS_FULL[+mk.slice(5) - 1];
export const monthShort = (mk) => MONTHS[+mk.slice(5) - 1];
export const monthLabel = (mk) => `${monthName(mk)} ${mk.slice(0, 4)}`;
export const currentMk = () => mkOf(new Date().toISOString());

export function months(data) {
  return [...new Set(data.tx.map((t) => mkOf(t.date)))].sort();
}

export function summary(data, mk) {
  const tx = data.tx.filter((t) => mkOf(t.date) === mk);
  const out = tx.filter((t) => t.type === 'out');
  // reembolso (amigo devolvendo a parte do jantar) abate o gasto da categoria
  const refunds = tx.filter((t) => t.type === 'refund');
  const refunded = refunds.reduce((s, t) => s + t.amount, 0);
  const total = out.reduce((s, t) => s + t.amount, 0) - refunded;
  const incomeTx = tx.filter((t) => t.type === 'in').reduce((s, t) => s + t.amount, 0);
  const income = incomeTx || data.settings.income || 0;
  const invested = tx.filter((t) => t.type === 'inv').reduce((s, t) => s + t.amount, 0);
  const byCat = {};
  const byMerchant = {};
  out.forEach((t) => {
    byCat[t.cat] = (byCat[t.cat] || 0) + t.amount;
    const m = (byMerchant[t.key] ||= { key: t.key, name: t.merchant, cat: t.cat, total: 0, count: 0 });
    m.total += t.amount; m.count += 1;
  });
  refunds.forEach((t) => { if (byCat[t.cat]) byCat[t.cat] = Math.max(0, byCat[t.cat] - t.amount); });
  const prevMk = shiftMonth(mk, -1);
  const prevOut = data.tx.filter((t) => t.type === 'out' && mkOf(t.date) === prevMk);
  const last = prevOut.reduce((s, t) => s + t.amount, 0) - data.tx.filter((t) => t.type === 'refund' && mkOf(t.date) === prevMk).reduce((s, t) => s + t.amount, 0);
  const lastByCat = {};
  prevOut.forEach((t) => { lastByCat[t.cat] = (lastByCat[t.cat] || 0) + t.amount; });
  const cats = Object.entries(byCat).map(([id, value]) => ({ id, value, last: lastByCat[id] || 0 })).sort((a, b) => b.value - a.value);
  const merchants = Object.values(byMerchant).filter((m) => !CATS[m.cat]?.unknown).sort((a, b) => b.total - a.total);
  const unknown = out.filter((t) => CATS[t.cat]?.unknown);
  // só compara com o mês anterior se ele tiver dados suficientes (não só uma ou duas cobranças soltas)
  const comparable = prevOut.length >= 5 && last > 0;
  return { mk, prevMk, tx, out, refunded, total, income, incomeFromTx: !!incomeTx, invested, last, delta: comparable ? (total - last) / last : null, cats, merchants, unknown };
}

export function history(data, mk, n = 6) {
  return Array.from({ length: n }, (_, i) => {
    const m = shiftMonth(mk, i - n + 1);
    return { mk: m, total: data.tx.filter((t) => mkOf(t.date) === m).reduce((s, t) => s + (t.type === 'out' ? t.amount : t.type === 'refund' ? -t.amount : 0), 0) };
  });
}

export function avgSpend(data, mk, n = 3) {
  const h = history(data, mk, n).filter((x) => x.total > 0);
  return h.length ? h.reduce((s, x) => s + x.total, 0) / h.length : 0;
}

/* ---------- assinaturas ---------- */
const median = (a) => { const s = [...a].sort((x, y) => x - y); return s[Math.floor(s.length / 2)]; };

/** Cobranças com valor parecido em meses seguidos e que ainda não viraram assinatura. */
export function recurring(data) {
  const known = new Set([...data.subs.map((s) => s.key), ...data.dismissed]);
  const groups = {};
  // assinatura tem valor fixo: compras do dia a dia (mercado, comida, combustível) ficam de fora
  const daily = new Set(['mercado', 'delivery', 'transporte']);
  data.tx.filter((t) => t.type === 'out' && !known.has(t.key) && !t.key.startsWith('PIX') && !daily.has(t.cat)).forEach((t) => { (groups[t.key] ||= []).push(t); });
  const found = [];
  for (const [key, list] of Object.entries(groups)) {
    const byMonth = {};
    list.forEach((t) => { (byMonth[mkOf(t.date)] ||= []).push(t); });
    const ms = Object.keys(byMonth).sort();
    const isSubCat = list[0].cat === 'assinaturas';
    const need = isSubCat ? 2 : 3;
    if (ms.length < need) continue;
    // maior sequência de meses consecutivos com uma cobrança de valor parecido
    const med = median(list.map((t) => t.amount));
    let run = [], best = [];
    ms.forEach((m, i) => {
      const hit = byMonth[m].find((t) => Math.abs(t.amount - med) / med <= 0.03) && byMonth[m].length <= 2;
      if (hit && (i === 0 || shiftMonth(ms[i - 1], 1) === m) && run.length) run.push(m);
      else run = hit ? [m] : [];
      if (run.length > best.length) best = [...run];
    });
    if (best.length < need) continue;
    const lastTx = byMonth[best[best.length - 1]].find((t) => Math.abs(t.amount - med) / med <= 0.03);
    found.push({ key, name: lastTx.merchant, cat: lastTx.cat, amount: lastTx.amount, day: +lastTx.date.slice(8), months: best.map(monthShort), since: best[0] });
  }
  return found.sort((a, b) => b.amount - a.amount);
}

export function subStatus(data, sub, mk) {
  const hit = data.tx.find((t) => t.type === 'out' && t.key === sub.key && mkOf(t.date) === mk);
  return hit ? { paid: true, date: hit.date, amount: hit.amount } : { paid: false };
}

export const subsTotal = (data) => data.subs.reduce((s, x) => s + x.amount, 0);

/* ---------- observações ---------- */
export function insights(data, mk, fmt) {
  const s = summary(data, mk);
  const list = [];
  if (!s.out.length) return list;

  if (s.delta != null && Math.abs(s.delta) >= 0.08) {
    list.push(s.delta > 0
      ? { tone: 'warn', icon: 'up', title: `Você gastou ${Math.round(s.delta * 100)}% a mais que em ${monthName(s.prevMk).toLowerCase()}.`, sub: `${fmt(s.total - s.last)} acima do mês anterior.` }
      : { tone: 'good', icon: 'downright', title: `Gastos ${Math.round(-s.delta * 100)}% menores que em ${monthName(s.prevMk).toLowerCase()}.`, sub: `${fmt(s.last - s.total)} a menos. Bom mês.` });
  }

  const jump = s.delta != null && s.cats.filter((c) => !CATS[c.id]?.unknown && c.last > 0 && c.value - c.last > 60 && (c.value - c.last) / c.last > 0.2)
    .sort((a, b) => (b.value - b.last) - (a.value - a.last))[0];
  if (jump) {
    const txs = s.out.filter((t) => t.cat === jump.id);
    const top = s.merchants.find((m) => m.cat === jump.id);
    list.push({ tone: 'warn', icon: 'alert', title: `${CATS[jump.id].name} subiu ${Math.round(((jump.value - jump.last) / jump.last) * 100)}% em relação a ${monthName(s.prevMk).toLowerCase()}.`,
      sub: top && top.count > 2 ? `${top.count} compras em ${top.name}, média de ${fmt(top.total / top.count)}.` : `${txs.length} lançamentos, ${fmt(jump.value)} no total.` });
  }

  const sugg = recurring(data)[0];
  if (sugg) list.push({ tone: 'info', icon: 'repeat', title: `${sugg.name} foi cobrado ${sugg.months.length} meses seguidos (${fmt(sugg.amount)}).`, sub: 'Quer registrar como assinatura?', action: { key: sugg.key } });

  if (s.unknown.length) list.push({ tone: 'info', icon: 'question', title: `${s.unknown.length} lançamento${s.unknown.length > 1 ? 's' : ''} sem categoria.`, sub: `${fmt(s.unknown.reduce((a, t) => a + t.amount, 0))} para revisar. Ao classificar, os próximos seguem a mesma regra.`, link: '#gastos?f=outros' });

  if (s.income) {
    const left = s.income - s.total - s.invested;
    if (left < 0) list.push({ tone: 'warn', icon: 'alert', title: `Saiu ${fmt(-left)} a mais do que entrou.`, sub: 'Revise as maiores categorias antes do próximo mês.' });
    else if (left > 100) list.push({ tone: 'good', icon: 'piggy', title: `Sobraram ${fmt(left)} este mês.`, sub: s.invested ? `Você já aplicou ${fmt(s.invested)}. Investir a sobra também leva sua taxa de poupança a ${Math.round(((s.invested + left) / s.income) * 100)}%.` : `Investir essa sobra leva sua taxa de poupança a ${Math.round((left / s.income) * 100)}% da renda.` });
    const subs = subsTotal(data);
    if (subs / s.income > 0.05) list.push({ tone: 'info', icon: 'repeat', title: `Assinaturas somam ${Math.round((subs / s.income) * 100)}% da sua renda.`, sub: `${fmt(subs * 12)} por ano. Vale revisar as que você pouco usa.` });
  }

  const freq = s.merchants.filter((m) => m.count >= 6)[0];
  if (freq && !(jump && freq.cat === jump.id)) list.push({ tone: 'info', icon: 'store', title: `${freq.count} compras em ${freq.name} este mês.`, sub: `${fmt(freq.total)} no total, média de ${fmt(freq.total / freq.count)}.` });

  return list;
}
