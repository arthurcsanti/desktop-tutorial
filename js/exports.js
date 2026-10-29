// Exportações: Markdown (Obsidian), CSV, planilha XLSX e PDF. Tudo gerado no aparelho.
import { CATS, TYPES } from './categorize.js';
import { summary, monthLabel, monthName, mkOf, subsTotal, insights, subStatus } from './analysis.js';
import { loadLib } from './parsers.js';

const BRL = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const money = (v) => BRL.format(v).replace(/ /g, ' ');
const pct = (v) => `${Math.round(v * 100)}%`;
const br = (iso) => iso.split('-').reverse().join('/');
const signed = (t) => (t.type === 'out' || t.type === 'inv' ? -t.amount : t.amount);
const monthTx = (data, mk) => data.tx.filter((t) => mkOf(t.date) === mk).sort((a, b) => a.date.localeCompare(b.date));

export function markdown(data, mk) {
  const s = summary(data, mk);
  const notes = insights(data, mk, money).filter((n) => !n.action);
  const inv = data.inv.reduce((a, x) => a + x.value, 0);
  const L = [];
  L.push('---');
  L.push('tipo: relatorio-financeiro');
  L.push(`mes: ${mk}`);
  L.push(`gasto_total: ${s.total.toFixed(2)}`);
  L.push(`entradas: ${s.income.toFixed(2)}`);
  L.push(`assinaturas: ${subsTotal(data).toFixed(2)}`);
  L.push(`patrimonio_investido: ${inv.toFixed(2)}`);
  L.push('tags: [financas, lastro]');
  L.push('---', '');
  L.push(`# ${monthLabel(mk)}`, '');
  L.push(`> Gasto total de **${money(s.total)}**${s.delta != null ? ` (${s.delta > 0 ? '+' : '−'}${pct(Math.abs(s.delta))} vs. ${monthName(s.prevMk).toLowerCase()})` : ''}.`);
  if (s.income) L.push(`> Entradas ${money(s.income)} · investido ${money(s.invested)} · sobra ${money(s.income - s.total - s.invested)}.`);
  L.push('');
  if (notes.length) {
    L.push('## Observações', '');
    notes.forEach((n) => L.push(`- ${n.title} ${n.sub || ''}`.trim()));
    L.push('');
  }
  L.push('## Categorias', '', '| Categoria | Valor | % | Mês anterior |', '|---|---:|---:|---:|');
  s.cats.forEach((c) => L.push(`| ${CATS[c.id]?.name || c.id} | ${money(c.value)} | ${pct(c.value / s.total)} | ${money(c.last)} |`));
  L.push('', '## Onde mais gastei', '', '| Loja | Vezes | Total |', '|---|---:|---:|');
  s.merchants.slice(0, 10).forEach((m) => L.push(`| ${m.name} | ${m.count} | ${money(m.total)} |`));
  if (data.subs.length) {
    L.push('', '## Assinaturas', '', '| Assinatura | Valor | Dia | Este mês |', '|---|---:|---:|---|');
    data.subs.forEach((x) => { const st = subStatus(data, x, mk); L.push(`| ${x.name} | ${money(x.amount)} | ${x.day} | ${st.paid ? `pago ${br(st.date)}` : 'não encontrado'} |`); });
    L.push(`| **Total** | **${money(subsTotal(data))}** | | |`);
  }
  if (data.inv.length) {
    L.push('', '## Investimentos', '', '| Ativo | Tipo | Valor |', '|---|---|---:|');
    data.inv.forEach((x) => L.push(`| ${x.name} | ${x.kind || ''} | ${money(x.value)} |`));
    L.push(`| **Total** | | **${money(inv)}** |`);
  }
  L.push('', '## Lançamentos', '', '| Data | Descrição | Categoria | Valor |', '|---|---|---|---:|');
  monthTx(data, mk).forEach((t) => L.push(`| ${br(t.date)} | ${t.merchant.replace(/\|/g, '/')} | ${t.type === 'out' ? CATS[t.cat]?.name : TYPES[t.type]} | ${money(signed(t))} |`));
  L.push('', `*Gerado pelo Lastro em ${new Date().toLocaleDateString('pt-BR')}.*`, '');
  return L.join('\n');
}

export function csv(data, mk) {
  const q = (v) => `"${String(v).replace(/"/g, '""')}"`;
  const rows = [['Data', 'Descrição', 'Loja', 'Categoria', 'Tipo', 'Valor']];
  monthTx(data, mk).forEach((t) => rows.push([br(t.date), t.desc, t.merchant, CATS[t.cat]?.name || '', TYPES[t.type], signed(t).toFixed(2).replace('.', ',')]));
  return '﻿' + rows.map((r) => r.map(q).join(';')).join('\r\n');
}

export async function xlsx(data, mk) {
  await loadLib('xlsx');
  const X = window.XLSX;
  const s = summary(data, mk);
  const wb = X.utils.book_new();
  const add = (name, rows, widths) => {
    const ws = X.utils.aoa_to_sheet(rows);
    ws['!cols'] = widths.map((w) => ({ wch: w }));
    X.utils.book_append_sheet(wb, ws, name);
  };
  add('Lançamentos', [['Data', 'Descrição', 'Loja', 'Categoria', 'Tipo', 'Valor'],
    ...monthTx(data, mk).map((t) => [new Date(`${t.date}T12:00:00`), t.desc, t.merchant, CATS[t.cat]?.name || '', TYPES[t.type], +signed(t).toFixed(2)])], [12, 40, 24, 18, 12, 12]);
  add('Resumo', [['Mês', monthLabel(mk)], ['Gasto total', +s.total.toFixed(2)], ['Mês anterior', +s.last.toFixed(2)], ['Entradas', +s.income.toFixed(2)], ['Investido no mês', +s.invested.toFixed(2)], ['Assinaturas', +subsTotal(data).toFixed(2)], [],
    ['Categoria', 'Valor', '% do mês', 'Mês anterior'], ...s.cats.map((c) => [CATS[c.id]?.name, +c.value.toFixed(2), +(c.value / s.total).toFixed(4), +c.last.toFixed(2)]), [],
    ['Loja', 'Vezes', 'Total'], ...s.merchants.map((m) => [m.name, m.count, +m.total.toFixed(2)])], [22, 14, 12, 14]);
  add('Assinaturas', [['Assinatura', 'Valor', 'Dia', 'Desde'], ...data.subs.map((x) => [x.name, x.amount, x.day, x.since || ''])], [24, 12, 6, 10]);
  add('Investimentos', [['Ativo', 'Tipo', 'Valor atual', 'Valor aplicado'], ...data.inv.map((x) => [x.name, x.kind || '', x.value, x.invested ?? ''])], [28, 18, 14, 14]);
  const out = X.write(wb, { bookType: 'xlsx', type: 'array', cellDates: true });
  return new Blob([out], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
}

export async function pdf(data, mk) {
  await loadLib('jspdf');
  const { jsPDF } = window.jspdf;
  const s = summary(data, mk);
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const W = doc.internal.pageSize.getWidth();
  const M = 48;
  const ink = [47, 46, 43], muted = [120, 119, 114], line = [234, 233, 229];
  // jsPDF usa Helvetica (Latin-1): troca caracteres fora dela
  const t = (v) => String(v).replace(/[−–—]/g, '-').replace(/[·•]/g, '-').replace(/[^\x00-\xFF]/g, '');

  doc.setFont('times', 'bold'); doc.setFontSize(24); doc.setTextColor(...ink);
  doc.text(t(monthLabel(mk)), M, 70);
  doc.setFont('helvetica', 'normal'); doc.setFontSize(10); doc.setTextColor(...muted);
  doc.text(t(`Relatório mensal - Lastro - gerado em ${new Date().toLocaleDateString('pt-BR')}`), M, 88);

  const props = [['Gasto total', money(s.total)], ['Variação', s.delta != null ? `${s.delta > 0 ? '+' : '-'}${pct(Math.abs(s.delta))} vs. ${monthName(s.prevMk).toLowerCase()}` : '-'],
    ['Entradas', money(s.income)], ['Investido no mês', money(s.invested)], ['Assinaturas', money(subsTotal(data))], ['Sobra', money(s.income - s.total - s.invested)]];
  let y = 118;
  props.forEach(([k, v], i) => {
    const x = M + (i % 3) * ((W - 2 * M) / 3);
    if (i === 3) y += 40;
    doc.setFontSize(9); doc.setTextColor(...muted); doc.text(t(k), x, y);
    doc.setFontSize(13); doc.setTextColor(...ink); doc.setFont('helvetica', 'bold'); doc.text(t(v), x, y + 16); doc.setFont('helvetica', 'normal');
  });
  y += 44;
  doc.setDrawColor(...line); doc.line(M, y, W - M, y);

  // barras por categoria
  y += 26;
  doc.setFontSize(9); doc.setTextColor(...muted); doc.text('POR CATEGORIA', M, y);
  y += 14;
  const max = s.cats[0]?.value || 1;
  const palette = { moradia: [42, 120, 214], mercado: [235, 104, 52], delivery: [27, 175, 122], transporte: [237, 161, 0], assinaturas: [232, 123, 164], saude: [0, 131, 0], compras: [98, 80, 214], lazer: [227, 73, 72] };
  s.cats.slice(0, 8).forEach((c) => {
    doc.setFontSize(10); doc.setTextColor(...ink); doc.text(t(CATS[c.id]?.name || c.id), M, y + 9);
    doc.setFillColor(244, 243, 240); doc.roundedRect(M + 110, y + 2, W - 2 * M - 210, 8, 3, 3, 'F');
    doc.setFillColor(...(palette[c.id] || [168, 167, 162])); doc.roundedRect(M + 110, y + 2, Math.max(4, (W - 2 * M - 210) * (c.value / max)), 8, 3, 3, 'F');
    doc.text(t(money(c.value)), W - M, y + 9, { align: 'right' });
    y += 20;
  });

  const notes = insights(data, mk, money).filter((n) => !n.action);
  if (notes.length) {
    y += 14;
    doc.setFontSize(9); doc.setTextColor(...muted); doc.text('OBSERVAÇÕES', M, y);
    y += 6;
    notes.forEach((n) => {
      const lines = doc.splitTextToSize(t(`${n.title} ${n.sub || ''}`), W - 2 * M - 14);
      doc.setFontSize(10); doc.setTextColor(...ink);
      y += 14; doc.text('-', M, y); doc.text(lines, M + 12, y); y += (lines.length - 1) * 12;
    });
  }

  const table = (title, head, body, align = {}) => {
    doc.autoTable({
      startY: (doc.lastAutoTable?.finalY || y) + 30, head: [head], body, margin: { left: M, right: M },
      styles: { font: 'helvetica', fontSize: 9, textColor: ink, cellPadding: 5, lineColor: line, lineWidth: { bottom: 0.5 } },
      headStyles: { fillColor: false, textColor: muted, fontStyle: 'normal' },
      columnStyles: align, theme: 'plain',
    });
    doc.setFontSize(9); doc.setTextColor(...muted);
    doc.text(title, M, doc.lastAutoTable.settings.startY - 8);
  };
  table('ONDE MAIS GASTEI', ['Loja', 'Vezes', 'Total'], s.merchants.slice(0, 10).map((m) => [t(m.name), m.count, t(money(m.total))]), { 1: { halign: 'right' }, 2: { halign: 'right' } });
  if (data.subs.length) table('ASSINATURAS', ['Assinatura', 'Dia', 'Valor'], data.subs.map((x) => [t(x.name), x.day, t(money(x.amount))]), { 1: { halign: 'right' }, 2: { halign: 'right' } });
  table('LANÇAMENTOS', ['Data', 'Descrição', 'Categoria', 'Valor'], monthTx(data, mk).map((x) => [br(x.date), t(x.merchant), t(x.type === 'out' ? CATS[x.cat]?.name : TYPES[x.type]), t(money(signed(x)))]), { 3: { halign: 'right' } });

  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i); doc.setFontSize(8); doc.setTextColor(...muted);
    doc.text(`${i}/${pages}`, W - M, doc.internal.pageSize.getHeight() - 24, { align: 'right' });
  }
  return doc.output('blob');
}

/** Entrega o arquivo: no iPhone abre a folha de compartilhar (Salvar em Arquivos, Obsidian, AirDrop...). */
export async function deliver(blob, filename) {
  const file = new File([blob], filename, { type: blob.type || 'application/octet-stream' });
  if (navigator.canShare?.({ files: [file] })) {
    try { await navigator.share({ files: [file] }); return; } catch (e) { if (e.name === 'AbortError') return; }
  }
  const url = URL.createObjectURL(blob);
  const a = Object.assign(document.createElement('a'), { href: url, download: filename });
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}
