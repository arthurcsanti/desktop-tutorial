// Telas de planejamento: hub, orçamento, essenciais, parcelas, gastos anuais, metas, patrimônio,
// juros e tarifas, etiquetas, imposto de renda, fechamento do mês e lembretes.
import { CATS } from './categorize.js';
import { summary, monthLabel, monthName, monthShort, currentMk, MONTHS, MONTHS_FULL } from './analysis.js';
import * as P from './plan.js';
import * as R from './reminders.js';
import { deliver } from './exports.js';
import { icon, money, moneyShort, pct, esc, uid, parseMoneyInput, barChart, navRow, progress, callout, heroValue, $ } from './ui.js';

const EXPENSE_CATS = Object.keys(CATS).filter((k) => !CATS[k].unknown);
const num = (v) => (v || v === 0 ? Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '');
const back = (href = '#planejar', label = 'Planejar') => `<div class="topbar"><a class="link" href="${href}">‹ ${label}</a><span></span></div>`;
const head = (title, sub) => `<h1 class="page-title">${title}</h1>${sub ? `<p class="page-sub">${sub}</p>` : ''}`;
const section = (title, body, extra = '') => `<div class="section"><div class="section-head"><h2 class="section-title">${title}</h2>${extra}</div>${body}</div>`;
const remindBtns = (kind, id) => `<div class="mini-actions"><button class="btn small" data-action="remind" data-kind="${kind}" data-id="${id}">${icon('bell')} Lembrete</button><button class="btn small" data-action="calendar" data-kind="${kind}" data-id="${id}">${icon('calendar')} Calendário</button></div>`;

export function createPlan(ctx) {
  const D = () => ctx.data;
  const years = () => {
    const ys = new Set(D().tx.map((t) => +t.date.slice(0, 4)));
    ys.add(new Date().getFullYear());
    return [...ys].sort();
  };

  /* ---------- lembretes de cada coisa ---------- */
  function reminderFor(kind, id) {
    const d = D();
    if (kind === 'sub') {
      const s = d.subs.find((x) => x.id === id);
      return s && { title: `${s.name} · ${money(s.amount)}`, notes: 'Assinatura (Lastro)', day: s.day, repeat: 'monthly' };
    }
    if (kind === 'annual') {
      const a = d.annual.find((x) => x.id === id);
      return a && { title: `${a.name} · ${money(a.amount)}`, notes: `Gasto anual. Separe ${money(a.amount / 12)} por mês.`, day: a.day || 5, month: a.month, repeat: 'yearly' };
    }
    if (kind === 'goal') {
      const g = d.goals.find((x) => x.id === id);
      const st = g && P.goalStatus(g, ctx.mk);
      return g && { title: `Guardar para ${g.name}${st.perMonth ? ` · ${money(st.perMonth)}` : ''}`, notes: `Meta: ${money(g.target)}${g.deadline ? ` até ${monthLabel(g.deadline)}` : ''}`, day: d.settings.payday || 5, repeat: 'monthly' };
    }
    if (kind === 'closing') return { title: 'Fechamento do mês no Lastro', notes: 'Importar extratos, revisar gastos e salvar o relatório.', day: d.settings.closingDay || 3, repeat: 'monthly' };
    if (kind === 'bill') {
      const b = (d.bills || []).find((x) => x.id === id);
      return b && { title: `${b.name}${b.amount ? ` · ${money(b.amount)}` : ''}`, notes: 'Conta a pagar (Lastro)', day: b.day, repeat: 'monthly' };
    }
    return null;
  }
  function allReminders() {
    const d = D();
    return [
      ...d.subs.map((s) => reminderFor('sub', s.id)),
      ...(d.bills || []).map((b) => reminderFor('bill', b.id)),
      ...(d.annual || []).map((a) => reminderFor('annual', a.id)),
      ...(d.goals || []).filter((g) => !P.goalStatus(g, ctx.mk).done).map((g) => reminderFor('goal', g.id)),
      reminderFor('closing'),
    ].filter(Boolean);
  }

  /* ================= telas ================= */
  const views = {
    planejar() {
      const d = D(), mk = ctx.mk;
      const bud = P.budgetStatus(d, mk);
      const nw = P.netWorth(d);
      const inst = P.installments(d, mk);
      const ann = P.annualPlan(d, mk);
      const nwv = P.needsWants(d, mk);
      const checks = P.closingChecklist(d, mk, bud);
      const done = checks.filter((c) => c.done).length;
      const fees = P.feesByYear(d, +mk.slice(0, 4));
      const goals = d.goals || [];
      const goalMonthly = goals.map((g) => P.goalStatus(g, mk)).reduce((s, g) => s + (g.perMonth || 0), 0);
      const tags = new Set(d.tx.flatMap((t) => t.tags || []));
      const closed = (d.closed || {})[mk];
      return `${ctx.topbar()}${head('Planejar', `Tudo que ajuda a decidir em ${monthName(mk).toLowerCase()}`)}
        <a class="card closing-card" href="#fechamento">
          <div class="spread"><span><b>Fechamento de ${monthName(mk).toLowerCase()}</b></span><span class="row-val">${closed ? 'Concluído' : `${done} de ${checks.length}`}</span></div>
          ${progress(done / checks.length, closed ? '' : 'ink')}
          <div class="tiny">${closed ? `Fechado em ${new Date(closed).toLocaleDateString('pt-BR')}` : 'Passo a passo de 10 minutos para deixar o mês em dia'}</div>
        </a>
        ${section('Este mês', `<div class="list">
          ${navRow({ href: '#orcamento', icon: 'target', title: 'Orçamento', sub: bud.rows.length ? `${bud.rows.filter((r) => r.over).length} categoria${bud.rows.filter((r) => r.over).length === 1 ? '' : 's'} acima do limite` : 'Defina limites por categoria', value: bud.rows.length ? `${pct(bud.rows.reduce((a, r) => a + r.spent, 0) / (bud.limitTotal || 1))}` : '' })}
          ${navRow({ href: '#essenciais', icon: 'scale', title: 'Essenciais e supérfluos', sub: nwv.income ? `Regra 50/30/20 · ${pct(nwv.needs / nwv.income)} / ${pct(nwv.wants / nwv.income)} / ${pct(nwv.invested / nwv.income)}` : 'Quanto vai para o necessário e para o resto', value: money(nwv.wants) })}
        </div>`)}
        ${section('Futuro', `<div class="list">
          ${navRow({ href: '#parcelas', icon: 'card', title: 'Parcelas a pagar', sub: inst.list.length ? `${inst.list.length} compra${inst.list.length > 1 ? 's' : ''} · ${money(inst.schedule[0].total)} em ${monthShort(inst.schedule[0].mk)}` : 'Nenhuma compra parcelada encontrada', value: money(inst.owed) })}
          ${navRow({ href: '#anuais', icon: 'calendar', title: 'Gastos anuais', sub: ann.list.length ? `Separe ${money(ann.perMonth)} por mês` : 'IPVA, IPTU, seguro, material escolar…', value: ann.list.length ? money(ann.total) : '' })}
          ${navRow({ href: '#metas', icon: 'flag', title: 'Metas', sub: goals.length ? `${goals.length} meta${goals.length > 1 ? 's' : ''} · ${money(goalMonthly)} por mês` : 'Viagem, carro, reserva…', value: '' })}
          ${navRow({ href: '#lembretes', icon: 'bell', title: 'Lembretes no iPhone', sub: 'Contas, assinaturas e metas no Lembretes ou Calendário' })}
        </div>`)}
        ${section('Visão geral', `<div class="list">
          ${navRow({ href: '#patrimonio', icon: 'wallet', title: 'Patrimônio líquido', sub: 'Contas + investimentos − dívidas', value: money(nw.net) })}
          ${navRow({ href: '#taxas', icon: 'receipt', title: 'Juros e tarifas', sub: `Em ${mk.slice(0, 4)}`, value: money(fees.total) })}
          ${navRow({ href: '#etiquetas', icon: 'label', title: 'Etiquetas', sub: tags.size ? `${tags.size} etiqueta${tags.size > 1 ? 's' : ''}` : 'Agrupe gastos de uma viagem, evento ou projeto' })}
          ${navRow({ href: '#ir', icon: 'file', title: 'Imposto de Renda', sub: `Rendimentos e despesas dedutíveis de ${new Date().getFullYear() - 1}` })}
          ${navRow({ href: '#relatorios', icon: 'share', title: 'Relatórios e exportação', sub: 'PDF, planilha, CSV e Obsidian' })}
        </div>`)}`;
    },

    orcamento() {
      const d = D(), mk = ctx.mk;
      const b = P.budgetStatus(d, mk);
      const s = summary(d, mk);
      const spent = Object.fromEntries(s.cats.map((c) => [c.id, c.value]));
      return `${back()}${head('Orçamento', `Limite mensal por categoria · ${monthLabel(mk)}`)}
        ${b.rows.length ? `<div class="card">
          <div class="spread"><span>Gasto com limite definido</span><b class="num">${money(b.rows.reduce((a, r) => a + r.spent, 0))} de ${money(b.limitTotal)}</b></div>
          ${progress(b.rows.reduce((a, r) => a + r.spent, 0) / (b.limitTotal || 1), b.rows.some((r) => r.over) ? 'bad' : '')}
          ${b.isCurrent ? `<div class="tiny">No ritmo atual, ${monthName(mk).toLowerCase()} fecha em <b>${money(b.projectedTotal)}</b> de gastos (dia ${b.elapsed} de ${b.days}).</div>` : ''}
        </div>` : `<div class="callout"><div class="callout-ico">${icon('target')}</div><div><p>Defina quanto quer gastar em cada categoria.</p><p>O app avisa quando passar de 80% e mostra a previsão do mês.</p>
          <div class="callout-actions"><button class="btn small primary" data-action="budget-suggest">Sugerir pelos últimos 3 meses</button></div></div></div>`}
        ${section('Categorias', `<div class="list">${EXPENSE_CATS.map((cat) => {
          const limit = (d.budgets || {})[cat] || 0;
          const r = b.rows.find((x) => x.cat === cat);
          const sp = spent[cat] || 0;
          const tone = r ? (r.over ? 'bad' : r.ratio >= 0.8 || r.willOver ? 'warn' : '') : '';
          return `<div class="budget-row" style="--cat:${CATS[cat].color}">
            <div class="budget-top"><div class="cat-name"><i></i>${CATS[cat].name}</div>
              <input class="inline-input" inputmode="decimal" data-budget="${cat}" value="${limit ? num(limit) : ''}" placeholder="sem limite" aria-label="Limite de ${CATS[cat].name}"></div>
            ${limit ? progress(sp / limit, tone) : ''}
            <div class="budget-meta"><span>Gasto <b>${money(sp)}</b>${r && b.isCurrent && r.willOver && !r.over ? ` · previsão ${money(r.projected)}` : ''}</span><span class="${r?.over ? 'bad' : ''}">${limit ? (r.over ? `${money(sp - limit)} acima` : `restam ${money(limit - sp)}`) : ''}</span></div>
          </div>`;
        }).join('')}</div>`, `<button class="link" data-action="budget-suggest">Sugerir</button>`)}
        <p class="note">${icon('info')} O limite vale para todos os meses. Toque no valor para mudar.</p>`;
    },

    essenciais() {
      const d = D(), mk = ctx.mk;
      const v = P.needsWants(d, mk);
      const total = v.needs + v.wants + v.unknown;
      const inc = v.income;
      const rate = P.hourlyRate(d, mk);
      const s = summary(d, mk);
      const wantsCats = s.cats.filter((c) => !CATS[c.id]?.unknown && !P.isEssential(d, c.id));
      const segs = [['Essenciais', v.needs, 'var(--c1)'], ['Supérfluos', v.wants, 'var(--c2)'], ['Investido', v.invested, 'var(--c3)']];
      return `${back()}${head('Essenciais e supérfluos', `${monthLabel(mk)} · o necessário, o que é escolha e o que foi guardado`)}
        <div class="card">
          <div class="stack">${segs.filter(([, val]) => val > 0).map(([l, val, c]) => `<div style="--cat:${c};flex:${val}" data-tip="${l}|${money(val)}${inc ? ` · ${pct(val / inc)} da renda` : ''}"></div>`).join('')}</div>
          <div class="kv">
            ${segs.map(([l, val, c]) => `<span><span class="legend"><span style="--cat:${c}"><i></i>${l}</span></span></span><b>${money(val)}${inc ? ` <span class="hash">${pct(val / inc)}</span>` : ''}</b>`).join('')}
            ${v.unknown ? `<span>Sem categoria</span><b>${money(v.unknown)}</b>` : ''}
          </div>
          ${inc ? `<p class="tiny">Referência 50/30/20: até ${money(inc * 0.5)} em essenciais, até ${money(inc * 0.3)} em supérfluos e pelo menos ${money(inc * 0.2)} investidos.</p>` : '<p class="tiny">Informe sua renda em Ajustes para comparar com a regra 50/30/20.</p>'}
        </div>
        ${inc && v.wants > inc * 0.3 ? callout({ tone: 'warn', icon: 'alert', title: `Supérfluos passaram ${money(v.wants - inc * 0.3)} do recomendado.`, sub: wantsCats[0] ? `O maior foi ${CATS[wantsCats[0].id].name}: ${money(wantsCats[0].value)}.` : '' }) : ''}
        ${rate ? section('Em horas de trabalho', `<div class="list">${wantsCats.slice(0, 5).map((c) => `<div class="row plain"><div class="row-main"><div class="row-title">${CATS[c.id].name}</div><div class="row-sub">${money(c.value)}</div></div><span class="row-val">${P.hoursText(c.value, rate)}</span></div>`).join('') || '<div class="row plain"><div class="row-main row-sub">Nenhum supérfluo neste mês.</div></div>'}</div>
          <p class="note">${icon('clock')} Sua hora vale ${money(rate)} (renda média ÷ ${d.settings.hoursMonth || 176} h por mês). Ajuste as horas em Ajustes.</p>`) : ''}
        ${section('O que é essencial para você', `<div class="chip-wrap">${EXPENSE_CATS.map((cat) => `<button class="chip${P.isEssential(d, cat) ? ' on' : ''}" style="--cat:${CATS[cat].color}" data-action="toggle-essential" data-cat="${cat}"><i></i>${CATS[cat].name}</button>`).join('')}</div>
          <p class="note">${icon('info')} Marcadas = essenciais. A reserva de emergência é calculada só com elas.</p>`)}`;
    },

    parcelas() {
      const d = D(), mk = ctx.mk;
      const inst = P.installments(d, mk);
      const s = summary(d, mk);
      return `${back()}${head('Parcelas a pagar', 'Compras parceladas que ainda vão chegar nas próximas faturas')}
        <div class="card hero"><div class="hero-label">Ainda falta pagar</div>${heroValue(inst.owed)}
          ${s.income && inst.schedule[0].total ? `<span class="delta-note" style="margin:0">${pct(inst.schedule[0].total / s.income)} da renda de ${monthShort(inst.schedule[0].mk)} já está comprometida</span>` : ''}</div>
        ${inst.list.length ? section('Próximos 12 meses', `<div class="card">${barChart(inst.schedule.map((x, i) => ({ label: monthShort(x.mk), value: x.total, tip: `${monthLabel(x.mk)} · ${x.count} parcela${x.count === 1 ? '' : 's'}`, strong: i === 0 })))}</div>`)
          + section('Compras', `<div class="list">${inst.list.map((g) => `<div class="row"><div class="avatar" style="--cat:${CATS[g.cat]?.color}">${esc(g.name[0])}</div>
            <div class="row-main"><div class="row-title">${esc(g.name)}</div><div class="row-sub">${g.n} de ${g.of} · termina em ${monthShort(g.endMk)}/${g.endMk.slice(2, 4)}</div>${progress(g.n / g.of, 'ink')}</div>
            <div class="row-amt">${money(g.amount)}<small>faltam ${money(g.owed)}</small></div></div>`).join('')}</div>`)
          : `<p class="empty-hint">Nenhuma parcela encontrada. O app reconhece descrições como “LOJA 03/10” ou “Parcela 3 de 10” nas faturas importadas.</p>`}`;
    },

    anuais() {
      const d = D(), mk = ctx.mk;
      const a = P.annualPlan(d, mk);
      const used = new Set(a.list.map((x) => x.name));
      return `${back()}${head('Gastos anuais', 'Contas que aparecem uma vez por ano e pegam de surpresa')}
        ${a.list.length ? `<div class="grid-2"><div class="card stat"><span>Por ano</span><strong>${money(a.total)}</strong><em>${a.list.length} gastos</em></div>
          <div class="card stat"><span>Separar por mês</span><strong>${money(a.perMonth)}</strong><em>para não apertar</em></div></div>` : ''}
        ${a.found.length ? section('Encontrados no extrato', a.found.map((f) => callout({ tone: '', icon: 'calendar', title: `${f.name} · ${money(f.amount)}`, sub: `Pago em ${MONTHS[f.month - 1]}. Cadastrar como gasto anual?`,
          buttons: `<button class="btn small primary" data-action="annual-add-found" data-name="${esc(f.name)}" data-amount="${f.amount}" data-month="${f.month}">Adicionar</button>` })).join('')) : ''}
        ${section('Próximos', a.list.length ? `<div class="list">${a.list.map((x) => `<div class="row plain"><div class="row-main"><button class="row-title link-like" data-action="annual-edit" data-id="${x.id}">${esc(x.name)}</button>
            <div class="row-sub">${MONTHS_FULL[x.month - 1]} · ${x.monthsLeft === 0 ? 'este mês' : `em ${x.monthsLeft} ${x.monthsLeft === 1 ? 'mês' : 'meses'}`} · separe ${money(x.perMonth)}/mês</div>${remindBtns('annual', x.id)}</div>
            <div class="row-amt">${money(x.amount)}</div></div>`).join('')}</div>` : '<p class="empty-hint">Nenhum gasto anual cadastrado.</p>', '<button class="link" data-action="annual-new">+ Novo</button>')}
        ${section('Sugestões', `<div class="chip-wrap">${P.ANNUAL_PRESETS.filter(([n]) => !used.has(n)).map(([n, m]) => `<button class="chip" data-action="annual-new" data-name="${n}" data-month="${m}">+ ${n}</button>`).join('')}</div>`)}`;
    },

    metas() {
      const d = D(), mk = ctx.mk;
      const goals = d.goals || [];
      return `${back()}${head('Metas', 'Quanto guardar por mês para chegar lá no prazo')}
        ${goals.length ? `<div class="list">${goals.map((g) => {
          const st = P.goalStatus(g, mk);
          return `<div class="row plain goal"><div class="row-main">
            <div class="spread"><button class="row-title link-like" data-action="goal-edit" data-id="${g.id}">${esc(g.name)}</button><b class="num">${money(g.saved || 0)} <span class="hash">de ${money(g.target)}</span></b></div>
            ${progress(st.ratio, st.done ? '' : 'ink')}
            <div class="row-sub">${st.done ? 'Meta atingida' : st.late ? `Prazo passou · faltam ${money(st.left)}` : st.perMonth ? `Guarde ${money(st.perMonth)}/mês até ${monthLabel(g.deadline)}` : `Faltam ${money(st.left)}`}</div>
            <div class="mini-actions"><button class="btn small primary" data-action="goal-deposit" data-id="${g.id}">${icon('plus')} Guardar</button><button class="btn small" data-action="remind" data-kind="goal" data-id="${g.id}">${icon('bell')} Lembrete</button></div>
          </div></div>`;
        }).join('')}</div>` : `<div class="card empty"><div class="gate-ico">${icon('flag')}</div><h2>Nenhuma meta</h2><p>Viagem, troca de carro, reserva de emergência, entrada do apartamento…</p><div class="row-actions"><button class="btn primary" data-action="goal-new">Criar meta</button></div></div>`}
        ${goals.length ? `<div class="section"><button class="btn block" data-action="goal-new">${icon('plus')} Nova meta</button></div>` : ''}`;
    },

    patrimonio() {
      const d = D();
      P.snapshotNetWorth(d);
      const nw = P.netWorth(d);
      const hist = Object.entries(d.nwHistory || {}).sort().slice(-12);
      return `${back()}${head('Patrimônio líquido', 'O que você tem menos o que você deve')}
        <div class="card hero"><div class="hero-label">Patrimônio líquido</div>${heroValue(nw.net)}
          <div class="flow"><div><span>Contas</span><strong>${moneyShort(nw.cash)}</strong></div><div><span>Investido</span><strong>${moneyShort(nw.invested)}</strong></div><div><span>Dívidas</span><strong class="${nw.liabilities ? 'neg' : ''}">${moneyShort(nw.liabilities)}</strong></div></div></div>
        ${hist.length > 1 ? section('Evolução', `<div class="card">${barChart(hist.map(([m, v], i) => ({ label: monthShort(m), value: v.net, tip: monthLabel(m), strong: i === hist.length - 1 })))}</div>`) : ''}
        ${section('Contas e saldos', `<div class="list">${nw.accounts.map((a) => accountRow(a)).join('') || '<div class="row plain"><div class="row-main row-sub">Cadastre o saldo de cada conta (Nubank, Inter, Itaú…).</div></div>'}</div>`, '<button class="link" data-action="acct-new" data-kind="conta">+ Conta</button>')}
        ${section('Investimentos', `<div class="list">${navRow({ href: '#investir', icon: 'trend', title: `${d.inv.length} investimento${d.inv.length === 1 ? '' : 's'}`, value: money(nw.invested) })}</div>`)}
        ${section('Dívidas', `<div class="list">${nw.debts.map((a) => accountRow(a)).join('')}
          ${nw.parcels ? navRow({ href: '#parcelas', icon: 'card', title: 'Parcelas futuras do cartão', sub: 'Calculado das faturas', value: money(nw.parcels) }) : ''}
          ${!nw.debts.length && !nw.parcels ? '<div class="row plain"><div class="row-main row-sub">Empréstimos, financiamentos, fatura em aberto…</div></div>' : ''}</div>`, '<button class="link" data-action="acct-new" data-kind="divida">+ Dívida</button>')}
        <p class="note">${icon('info')} Uma foto do patrimônio é guardada a cada mês, sempre que você atualiza saldos ou investimentos.</p>`;
    },

    taxas(params) {
      const d = D();
      const y = +(params.get('y') || ctx.mk.slice(0, 4));
      const f = P.feesByYear(d, y);
      const prev = P.feesByYear(d, y - 1);
      return `${back()}${head('Juros e tarifas', 'Dinheiro que vai para o banco e não volta')}
        <div class="year-nav"><button class="btn small" data-action="goto" data-href="#taxas?y=${y - 1}">‹ ${y - 1}</button><b>${y}</b>${y < new Date().getFullYear() ? `<button class="btn small" data-action="goto" data-href="#taxas?y=${y + 1}">${y + 1} ›</button>` : ''}</div>
        <div class="card hero" style="margin-top:12px"><div class="hero-label">Pago em ${y}</div>${heroValue(f.total)}
          ${prev.total ? `<span class="delta ${f.total > prev.total ? 'up' : 'down'}">${icon(f.total > prev.total ? 'up' : 'downright')}${pct(Math.abs(f.total - prev.total) / prev.total)}</span><span class="delta-note">vs. ${y - 1} (${money(prev.total)})</span>` : ''}</div>
        ${f.count ? section('Por mês', `<div class="card">${barChart(f.months.map((v, i) => ({ label: MONTHS[i][0].toUpperCase(), value: v, tip: `${MONTHS_FULL[i]} ${y}` })))}</div>`)
          + section('Onde', `<div class="list">${f.items.map((x) => `<div class="row plain"><div class="row-main"><div class="row-title">${esc(x.name)}</div><div class="row-sub">${x.count} cobrança${x.count > 1 ? 's' : ''}</div></div><span class="row-val">${money(x.total)}</span></div>`).join('')}</div>`)
          + (f.total > 100 ? callout({ tone: 'warn', icon: 'alert', title: `${money(f.total)} em ${y} daria para ${money(f.total / 12)} a mais por mês no seu bolso.`, sub: 'Peça isenção de anuidade, troque o pacote de tarifas por uma conta digital e evite o rotativo e o parcelamento da fatura.' }) : '')
          : '<p class="empty-hint">Nenhuma tarifa, IOF, anuidade ou juros encontrados neste ano.</p>'}`;
    },

    etiquetas() {
      const d = D();
      const by = {};
      d.tx.forEach((t) => (t.tags || []).forEach((tg) => {
        const g = (by[tg] ||= { tag: tg, out: 0, refund: 0, count: 0, first: t.date, last: t.date });
        if (t.type === 'out') g.out += t.amount; if (t.type === 'refund') g.refund += t.amount;
        g.count++; if (t.date < g.first) g.first = t.date; if (t.date > g.last) g.last = t.date;
      }));
      const list = Object.values(by).sort((a, b) => b.last.localeCompare(a.last));
      return `${back()}${head('Etiquetas', 'Quanto custou uma viagem, um evento ou um projeto')}
        ${list.length ? `<div class="list">${list.map((g) => navRow({ href: `#gastos?q=${encodeURIComponent('#' + g.tag)}&all=1`, icon: 'label', title: `#${esc(g.tag)}`,
          sub: `${g.count} lançamento${g.count > 1 ? 's' : ''} · ${new Date(g.first + 'T12:00').toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' })}${g.refund ? ` · ${money(g.refund)} reembolsados` : ''}`, value: money(g.out - g.refund) })).join('')}</div>`
          : `<p class="empty-hint">Abra um lançamento em Gastos e adicione uma etiqueta, como #viagem-floripa.</p>`}
        ${section('Reembolsos', `<p class="note">${icon('info')} Quando alguém te devolver dinheiro (sua parte do jantar, uma compra feita para outra pessoa), abra a entrada em Gastos e marque o tipo como <b>Reembolso</b>, escolhendo a categoria. O valor sai do gasto daquela categoria em vez de contar como renda.</p>`)}`;
    },

    ir(params) {
      const d = D();
      const y = +(params.get('y') || new Date().getFullYear() - 1);
      const r = P.irReport(d, y);
      const list = (groups, empty) => (groups.length ? `<div class="list">${groups.map((g) => `<div class="row plain"><div class="row-main"><div class="row-title">${esc(g.name)}</div><div class="row-sub">${g.count} pagamento${g.count > 1 ? 's' : ''}</div></div><span class="row-val">${money(g.total)}</span></div>`).join('')}</div>` : `<p class="empty-hint">${empty}</p>`);
      return `${back()}${head('Imposto de Renda', `Resumo do ano-calendário ${y} para a declaração de ${y + 1}`)}
        <div class="year-nav">${years().map((yy) => `<button class="chip${yy === y ? ' on' : ''}" data-action="goto" data-href="#ir?y=${yy}">${yy}</button>`).join('')}</div>
        <div class="grid-2" style="margin-top:12px"><div class="card stat"><span>Rendimentos</span><strong>${money(r.incomeTotal)}</strong><em>entradas no ano</em></div>
          <div class="card stat"><span>Dedutíveis</span><strong>${money(r.healthTotal + r.eduTotal + r.prevTotal)}</strong><em>saúde, educação, PGBL</em></div></div>
        ${section('Rendimentos recebidos', list(r.income, 'Nenhuma entrada no ano.'))}
        ${section(`Saúde · ${money(r.healthTotal)}`, list(r.health, 'Nada encontrado. Farmácia e academia não são dedutíveis.'))}
        ${section(`Educação · ${money(r.eduTotal)}`, list(r.edu, 'Nada encontrado.'))}
        ${r.prev.length ? section(`Previdência PGBL · ${money(r.prevTotal)}`, list(r.prev, '')) : ''}
        ${section('Bens e direitos (posição atual)', r.goods.length ? `<div class="list">${r.goods.map((g) => `<div class="row plain"><div class="row-main"><div class="row-title">${esc(g.name)}</div><div class="row-sub">${esc(g.kind || '')}${g.invested ? ` · aplicado ${money(g.invested)}` : ''}</div></div><span class="row-val">${money(g.value)}</span></div>`).join('')}</div>` : '<p class="empty-hint">Nenhum investimento cadastrado.</p>')}
        <div class="section export-grid">
          <button class="export" data-action="ir-export" data-fmt="md" data-y="${y}"><span class="ext">MD</span><div><strong>Resumo</strong><span>Para o Obsidian</span></div></button>
          <button class="export" data-action="ir-export" data-fmt="csv" data-y="${y}"><span class="ext">CSV</span><div><strong>Planilha</strong><span>Todos os itens</span></div></button>
        </div>
        <p class="note">${icon('info')} Para incluir algo que o app não reconheceu, adicione a etiqueta <b>#saude-ir</b> ou <b>#educacao-ir</b> no lançamento. Confira sempre com os informes de rendimentos e recibos oficiais: este resumo é um apoio, não substitui a declaração.</p>`;
    },

    fechamento() {
      const d = D(), mk = ctx.mk;
      const checks = P.closingChecklist(d, mk, P.budgetStatus(d, mk));
      const done = checks.filter((c) => c.done).length;
      const closed = (d.closed || {})[mk];
      return `${back()}${head(`Fechamento de ${monthName(mk).toLowerCase()}`, 'Uma vez por mês, uns 10 minutos')}
        <div class="card"><div class="spread"><span>${done} de ${checks.length} passos</span><b>${closed ? 'Concluído' : ''}</b></div>${progress(done / checks.length, 'ink')}</div>
        <div class="section"><div class="list">${checks.map((c, i) => `<div class="check${c.done ? ' done' : ''}">
          <div class="check-box">${c.done ? icon('check') : `<span class="hash">${i + 1}</span>`}</div>
          <div class="row-main"><div class="row-title">${c.title}</div><div class="row-sub">${esc(c.sub)}</div>
          ${!c.done ? (c.action === 'import' ? '<button class="btn small" data-action="import">Importar</button>' : c.action === 'export-md' ? '<button class="btn small" data-action="closing-export">Exportar Markdown</button>' : c.link ? `<a class="btn small" href="${c.link}">Abrir</a>` : '') : ''}</div></div>`).join('')}</div></div>
        <div class="section">${closed ? `<p class="empty-hint">Fechado em ${new Date(closed).toLocaleDateString('pt-BR')}.</p><button class="btn block ghost" data-action="closing-reopen">Reabrir</button>`
          : `<button class="btn block primary" data-action="closing-done">Concluir fechamento</button>`}
          <div class="mini-actions" style="justify-content:center;margin-top:12px"><button class="btn small" data-action="remind" data-kind="closing">${icon('bell')} Lembrete todo mês</button><button class="btn small" data-action="calendar" data-kind="closing">${icon('calendar')} Calendário</button></div></div>`;
    },

    lembretes() {
      const d = D();
      const items = [
        ...d.subs.map((s) => ({ kind: 'sub', id: s.id, title: s.name, sub: `Assinatura · dia ${s.day} · ${money(s.amount)}` })),
        ...(d.bills || []).map((b) => ({ kind: 'bill', id: b.id, title: b.name, sub: `Conta · dia ${b.day}${b.amount ? ` · ${money(b.amount)}` : ''}`, edit: true })),
        ...(d.annual || []).map((a) => ({ kind: 'annual', id: a.id, title: a.name, sub: `Anual · ${MONTHS_FULL[a.month - 1]} · ${money(a.amount)}` })),
        ...(d.goals || []).map((g) => ({ kind: 'goal', id: g.id, title: `Guardar para ${g.name}`, sub: 'Meta · todo mês' })),
        { kind: 'closing', id: '', title: 'Fechamento do mês', sub: `Todo dia ${d.settings.closingDay || 3}` },
      ];
      return `${back()}${head('Lembretes no iPhone', 'Contas, assinaturas e metas no app Lembretes ou no Calendário')}
        <div class="callout"><div class="callout-ico">${icon('calendar')}</div><div><p><b>Calendário</b>: funciona na hora, repete todo mês e avisa um dia antes.</p>
          <div class="callout-actions"><button class="btn small primary" data-action="calendar-all">Adicionar tudo ao Calendário</button></div></div></div>
        <div class="callout"><div class="callout-ico">${icon('bell')}</div><div><p><b>Lembretes</b>: cria o lembrete na lista “Finanças”. Precisa de um Atalho, configurado uma vez.</p>
          <div class="callout-actions"><button class="btn small" data-action="shortcut-help">Como configurar</button><button class="btn small" data-action="shortcut-test">Testar</button></div></div></div>
        ${section('Contas a pagar', `<div class="list">${(d.bills || []).map((b) => `<div class="row plain"><div class="row-main"><button class="row-title link-like" data-action="bill-edit" data-id="${b.id}">${esc(b.name)}</button><div class="row-sub">Todo dia ${b.day}${b.amount ? ` · ${money(b.amount)}` : ''}</div></div></div>`).join('') || '<div class="row plain"><div class="row-main row-sub">Fatura do Nubank, aluguel, condomínio, boleto da faculdade…</div></div>'}</div>`, '<button class="link" data-action="bill-new">+ Conta</button>')}
        ${section('Criar lembrete', `<div class="list">${items.map((x) => `<div class="row plain"><div class="row-main"><div class="row-title">${esc(x.title)}</div><div class="row-sub">${esc(x.sub)}</div>${remindBtns(x.kind, x.id)}</div></div>`).join('')}</div>`)}`;
    },
  };

  function accountRow(a) {
    return `<button class="row plain row-btn" data-action="acct-edit" data-id="${a.id}"><div class="row-main"><div class="row-title">${esc(a.name)}</div><div class="row-sub">Atualizado ${a.updated ? new Date(a.updated).toLocaleDateString('pt-BR') : '—'}</div></div><span class="row-val ${a.kind === 'divida' ? 'neg' : ''}">${a.kind === 'divida' ? '−' : ''}${money(a.value)}</span>${icon('chevron')}</button>`;
  }

  /* ================= folhas (formulários) ================= */
  function formSheet({ title, sub, fields, onSubmit, del }) {
    ctx.openSheet(`<h2>${title}</h2>${sub ? `<p class="page-sub">${sub}</p>` : ''}
      <form id="plan-form" class="form">${fields}
        <div class="sheet-foot"><button class="btn block primary" type="submit">Salvar</button>
        ${del ? `<button class="btn block ghost danger" type="button" data-action="${del}">Remover</button>` : ''}</div></form>`);
    $('#plan-form').onsubmit = (e) => { e.preventDefault(); onSubmit(new FormData(e.target)); };
  }
  const field = (label, html) => `<label><span>${label}</span>${html}</label>`;
  const monthSelect = (name, cur) => `<select class="field" name="${name}">${MONTHS_FULL.map((m, i) => `<option value="${i + 1}" ${+cur === i + 1 ? 'selected' : ''}>${m}</option>`).join('')}</select>`;

  function annualSheet(a = {}) {
    formSheet({
      title: a.id ? 'Gasto anual' : 'Novo gasto anual', sub: 'Algo que você paga uma vez por ano',
      fields: field('Nome', `<input class="field" name="name" required value="${esc(a.name || '')}" placeholder="Ex.: IPVA">`)
        + `<div class="grid-2">${field('Valor', `<input class="field" name="amount" inputmode="decimal" required value="${num(a.amount)}" placeholder="0,00">`)}${field('Mês', monthSelect('month', a.month || new Date().getMonth() + 1))}</div>`,
      del: a.id ? `annual-del" data-id="${a.id}` : '',
      onSubmit: (f) => {
        const v = { name: f.get('name').trim(), amount: parseMoneyInput(f.get('amount')), month: +f.get('month') };
        const d = D(); d.annual ||= [];
        const cur = d.annual.find((x) => x.id === a.id);
        if (cur) Object.assign(cur, v); else d.annual.push({ id: uid(), ...v });
        ctx.commit('Gasto anual salvo');
      },
    });
  }

  function goalSheet(g = {}) {
    formSheet({
      title: g.id ? 'Editar meta' : 'Nova meta', sub: 'Defina o valor e, se quiser, um prazo',
      fields: field('Nome', `<input class="field" name="name" required value="${esc(g.name || '')}" placeholder="Ex.: Viagem para o Japão">`)
        + `<div class="grid-2">${field('Valor da meta', `<input class="field" name="target" inputmode="decimal" required value="${num(g.target)}" placeholder="0,00">`)}${field('Já guardado', `<input class="field" name="saved" inputmode="decimal" value="${num(g.saved)}" placeholder="0,00">`)}</div>`
        + field('Prazo', `<input class="field" name="deadline" type="month" value="${g.deadline || ''}" min="${currentMk()}">`),
      del: g.id ? `goal-del" data-id="${g.id}` : '',
      onSubmit: (f) => {
        const v = { name: f.get('name').trim(), target: parseMoneyInput(f.get('target')), saved: parseMoneyInput(f.get('saved')), deadline: f.get('deadline') || null };
        const d = D(); d.goals ||= [];
        const cur = d.goals.find((x) => x.id === g.id);
        if (cur) Object.assign(cur, v); else d.goals.push({ id: uid(), ...v });
        ctx.commit('Meta salva');
      },
    });
  }

  function depositSheet(g) {
    const st = P.goalStatus(g, ctx.mk);
    formSheet({
      title: `Guardar para ${esc(g.name)}`, sub: st.perMonth ? `Sugestão para este mês: ${money(st.perMonth)}` : `Faltam ${money(st.left)}`,
      fields: field('Valor', `<input class="field" name="v" inputmode="decimal" required value="${num(st.perMonth ? Math.ceil(st.perMonth) : '')}" placeholder="0,00">`),
      onSubmit: (f) => {
        g.saved = (g.saved || 0) + parseMoneyInput(f.get('v'));
        g.lastDeposit = new Date().toISOString();
        ctx.commit(P.goalStatus(g, ctx.mk).done ? 'Meta atingida!' : 'Valor guardado');
      },
    });
  }

  function accountSheet(a = {}, kind = 'conta') {
    const k = a.kind || kind;
    formSheet({
      title: a.id ? a.name : k === 'divida' ? 'Nova dívida' : 'Nova conta', sub: k === 'divida' ? 'Quanto ainda falta pagar' : 'Saldo atual da conta',
      fields: field('Nome', `<input class="field" name="name" required value="${esc(a.name || '')}" placeholder="${k === 'divida' ? 'Ex.: Financiamento do carro' : 'Ex.: Nubank'}">`)
        + field(k === 'divida' ? 'Saldo devedor' : 'Saldo', `<input class="field" name="value" inputmode="decimal" required value="${num(a.value)}" placeholder="0,00">`),
      del: a.id ? `acct-del" data-id="${a.id}` : '',
      onSubmit: (f) => {
        const v = { name: f.get('name').trim(), value: parseMoneyInput(f.get('value')), kind: k, updated: new Date().toISOString() };
        const d = D(); d.accounts ||= [];
        const cur = d.accounts.find((x) => x.id === a.id);
        if (cur) Object.assign(cur, v); else d.accounts.push({ id: uid(), ...v });
        P.snapshotNetWorth(d);
        ctx.commit('Salvo');
      },
    });
  }

  function billSheet(b = {}) {
    formSheet({
      title: b.id ? b.name : 'Nova conta a pagar', sub: 'Vencimento que se repete todo mês',
      fields: field('Nome', `<input class="field" name="name" required value="${esc(b.name || '')}" placeholder="Ex.: Fatura Nubank">`)
        + `<div class="grid-2">${field('Dia do vencimento', `<input class="field" name="day" type="number" min="1" max="31" required value="${b.day || 10}">`)}${field('Valor (opcional)', `<input class="field" name="amount" inputmode="decimal" value="${num(b.amount)}" placeholder="0,00">`)}</div>`,
      del: b.id ? `bill-del" data-id="${b.id}` : '',
      onSubmit: (f) => {
        const v = { name: f.get('name').trim(), day: Math.min(31, Math.max(1, +f.get('day'))), amount: parseMoneyInput(f.get('amount')) || null };
        const d = D(); d.bills ||= [];
        const cur = d.bills.find((x) => x.id === b.id);
        if (cur) Object.assign(cur, v); else d.bills.push({ id: uid(), ...v });
        ctx.commit('Conta salva');
      },
    });
  }

  function shortcutHelp() {
    ctx.openSheet(`<h2>Atalho “${R.SHORTCUT_NAME}”</h2><p class="page-sub">Configure uma vez no app Atalhos. Depois, cada botão “Lembrete” cria o lembrete sozinho.</p>
      <ol class="steps">
        <li>No app <b>Lembretes</b>, crie uma lista chamada <b>Finanças</b>.</li>
        <li>Abra o app <b>Atalhos</b>, toque em <b>+</b> e dê o nome <b>${R.SHORTCUT_NAME}</b> (exatamente assim).</li>
        <li>Adicione a ação <b>Obter Dicionário da Entrada</b> e escolha <b>Entrada do Atalho</b>. Se perguntar o que o atalho recebe, escolha <b>Texto</b>.</li>
        <li>Adicione <b>Obter Valor do Dicionário</b> com a chave <b>titulo</b>. Repita para as chaves <b>data</b> e <b>notas</b>.</li>
        <li>Adicione <b>Adicionar Novo Lembrete</b>: no texto, use o valor de <b>titulo</b>; em lista, <b>Finanças</b>.</li>
        <li>Toque na seta da ação, ative <b>Alerta</b> e escolha a variável <b>data</b>. Em notas, use <b>notas</b>.</li>
        <li>Salve. Volte ao Lastro e toque em <b>Testar</b>.</li>
      </ol>
      <p class="note">${icon('info')} O lembrete avisa na próxima data. Para repetir todo mês, abra o lembrete e escolha <b>Repetir → Mensalmente</b>, ou use o botão Calendário, que já repete sozinho.</p>
      <div class="sheet-foot"><button class="btn block primary" data-action="shortcut-test">Testar agora</button><button class="btn block ghost" data-action="close-sheet">Fechar</button></div>`);
  }

  function irExport(fmt, y) {
    const r = P.irReport(D(), y);
    const br = (iso) => iso.split('-').reverse().join('/');
    if (fmt === 'md') {
      const L = ['---', 'tipo: imposto-de-renda', `ano_calendario: ${y}`, `rendimentos: ${r.incomeTotal.toFixed(2)}`, `saude: ${r.healthTotal.toFixed(2)}`, `educacao: ${r.eduTotal.toFixed(2)}`, 'tags: [financas, ir, lastro]', '---', '', `# Imposto de Renda ${y + 1} (ano-calendário ${y})`, ''];
      const block = (title, groups) => {
        L.push(`## ${title}`, '', '| Fonte / prestador | Pagamentos | Total |', '|---|---:|---:|');
        groups.forEach((g) => L.push(`| ${g.name} | ${g.count} | ${money(g.total)} |`));
        L.push('');
        groups.forEach((g) => { L.push(`### ${g.name}`); g.items.forEach((t) => L.push(`- ${br(t.date)} · ${money(t.amount)} · ${t.desc}`)); L.push(''); });
      };
      block('Rendimentos', r.income); block('Despesas médicas', r.health); block('Educação', r.edu);
      if (r.prev.length) block('Previdência PGBL', r.prev);
      L.push('## Bens e direitos (posição atual)', '', '| Ativo | Tipo | Valor |', '|---|---|---:|');
      r.goods.forEach((g) => L.push(`| ${g.name} | ${g.kind || ''} | ${money(g.value)} |`));
      L.push('', '> Apoio para a declaração. Confira com informes de rendimentos e recibos oficiais.', '');
      return deliver(new Blob([L.join('\n')], { type: 'text/markdown' }), `lastro-ir-${y}.md`);
    }
    const q = (v) => `"${String(v).replace(/"/g, '""')}"`;
    const rows = [['Grupo', 'Fonte / prestador', 'Data', 'Descrição', 'Valor']];
    [['Rendimentos', r.income], ['Saúde', r.health], ['Educação', r.edu], ['Previdência', r.prev]].forEach(([grp, gs]) => gs.forEach((g) => g.items.forEach((t) => rows.push([grp, g.name, br(t.date), t.desc, t.amount.toFixed(2).replace('.', ',')]))));
    return deliver(new Blob(['﻿' + rows.map((x) => x.map(q).join(';')).join('\r\n')], { type: 'text/csv' }), `lastro-ir-${y}.csv`);
  }

  /* ================= ações ================= */
  async function action(act, el) {
    const d = D();
    const id = el.dataset.id;
    switch (act) {
      case 'goto': location.hash = el.dataset.href.slice(1); return true;
      case 'budget-suggest': {
        const sug = P.suggestBudgets(d, ctx.mk);
        if (!Object.keys(sug).length) { ctx.toast('Importe alguns meses de extrato primeiro'); return true; }
        d.budgets = { ...sug, ...Object.fromEntries(Object.entries(d.budgets || {}).filter(([, v]) => v > 0)) };
        ctx.commit('Limites sugeridos'); return true;
      }
      case 'toggle-essential': {
        d.settings.essential = { ...P.DEFAULT_ESSENTIAL, ...(d.settings.essential || {}) };
        d.settings.essential[el.dataset.cat] = !P.isEssential(d, el.dataset.cat);
        ctx.commit(); return true;
      }
      case 'annual-new': annualSheet({ name: el.dataset.name, month: el.dataset.month }); return true;
      case 'annual-add-found': (d.annual ||= []).push({ id: uid(), name: el.dataset.name, amount: +el.dataset.amount, month: +el.dataset.month }); ctx.commit('Gasto anual adicionado'); return true;
      case 'annual-edit': annualSheet(d.annual.find((x) => x.id === id)); return true;
      case 'annual-del': d.annual = d.annual.filter((x) => x.id !== id); ctx.commit(); return true;
      case 'goal-new': goalSheet(); return true;
      case 'goal-edit': goalSheet(d.goals.find((x) => x.id === id)); return true;
      case 'goal-del': d.goals = d.goals.filter((x) => x.id !== id); ctx.commit(); return true;
      case 'goal-deposit': depositSheet(d.goals.find((x) => x.id === id)); return true;
      case 'acct-new': accountSheet({}, el.dataset.kind); return true;
      case 'acct-edit': accountSheet(d.accounts.find((x) => x.id === id)); return true;
      case 'acct-del': d.accounts = d.accounts.filter((x) => x.id !== id); P.snapshotNetWorth(d); ctx.commit(); return true;
      case 'bill-new': billSheet(); return true;
      case 'bill-edit': billSheet(d.bills.find((x) => x.id === id)); return true;
      case 'bill-del': d.bills = d.bills.filter((x) => x.id !== id); ctx.commit(); return true;
      case 'remind': {
        const r = reminderFor(el.dataset.kind, id);
        if (r) R.openShortcut(r);
        return true;
      }
      case 'calendar': {
        const r = reminderFor(el.dataset.kind, id);
        if (r) await R.openCalendar([r]);
        return true;
      }
      case 'calendar-all': await R.openCalendar(allReminders()); return true;
      case 'shortcut-help': shortcutHelp(); return true;
      case 'shortcut-test': R.openShortcut({ title: 'Teste do Lastro', notes: 'Se este lembrete apareceu, está tudo certo.', date: new Date(Date.now() + 86400000).toISOString().slice(0, 10), repeat: 'none' }); return true;
      case 'ir-export': await irExport(el.dataset.fmt, +el.dataset.y); return true;
      case 'closing-done': (d.closed ||= {})[ctx.mk] = new Date().toISOString(); ctx.commit(`${monthName(ctx.mk)} fechado`); return true;
      case 'closing-reopen': delete (d.closed || {})[ctx.mk]; ctx.commit(); return true;
      case 'closing-export': await ctx.exportMd(); (d.exported ||= {})[ctx.mk] = true; ctx.commit(); return true;
      default: return false;
    }
  }

  function onChange(el) {
    const cat = el.dataset.budget;
    if (!cat) return false;
    const d = D();
    d.budgets ||= {};
    const v = parseMoneyInput(el.value);
    if (v > 0) d.budgets[cat] = v; else delete d.budgets[cat];
    ctx.commit('Limite salvo');
    return true;
  }

  return { views, action, onChange, reminderFor };
}

// rotas que pertencem à aba Planejar
export const PLAN_ROUTES = ['planejar', 'orcamento', 'essenciais', 'parcelas', 'anuais', 'metas', 'patrimonio', 'taxas', 'etiquetas', 'ir', 'fechamento', 'lembretes', 'relatorios'];
