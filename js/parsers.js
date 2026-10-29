// Leitura de extratos e faturas no próprio aparelho.
// Formatos: PDF, XLSX/XLS/ODS, CSV/TSV, OFX/QFX, TXT, MD, DOCX.
// Tudo vira uma lista de { date: 'AAAA-MM-DD', desc, amount } com sinal (negativo = saída).

const VENDOR = {
  pdf: ['vendor/pdf.min.js'],
  xlsx: ['vendor/xlsx.full.min.js'],
  docx: ['vendor/mammoth.browser.min.js'],
  jspdf: ['vendor/jspdf.umd.min.js', 'vendor/jspdf.plugin.autotable.min.js'],
};
const loaded = {};
const script = (src) => new Promise((resolve, reject) => {
  const s = document.createElement('script');
  s.src = src; s.onload = resolve; s.onerror = () => reject(new Error(`Falha ao carregar ${src}`));
  document.head.appendChild(s);
});
// carrega só quando precisa, na ordem (o plugin do jsPDF depende do jsPDF)
export function loadLib(name) {
  return (loaded[name] ||= VENDOR[name].reduce((p, src) => p.then(() => script(src)), Promise.resolve()));
}

/* ---------- números e datas ---------- */
const MON = { JAN: 1, FEV: 2, FEB: 2, MAR: 3, ABR: 4, APR: 4, MAI: 5, MAY: 5, JUN: 6, JUL: 7, AGO: 8, AUG: 8, SET: 9, SEP: 9, OUT: 10, OCT: 10, NOV: 11, DEZ: 12, DEC: 12 };
const pad = (n) => String(n).padStart(2, '0');
const iso = (y, m, d) => `${y}-${pad(m)}-${pad(d)}`;
const validDate = (y, m, d) => m >= 1 && m <= 12 && d >= 1 && d <= 31 && y > 1990 && y < 2100;

export function parseAmount(v) {
  if (typeof v === 'number') return v;
  if (v == null) return NaN;
  let s = String(v).trim();
  if (!s || !/\d/.test(s)) return NaN;
  const neg = /^\(.*\)$/.test(s) || /^-|^R\$\s*-|-\s*$|\sD$/i.test(s) || /^-?\s*R?\$?\s*-/.test(s);
  s = s.replace(/[^\d,.]/g, '');
  const lc = s.lastIndexOf(','), ld = s.lastIndexOf('.');
  if (lc > -1 && ld > -1) {
    s = lc > ld ? s.replace(/\./g, '').replace(',', '.') : s.replace(/,/g, '');
  } else if (lc > -1) {
    s = /,\d{1,2}$/.test(s) ? s.replace(/\./g, '').replace(',', '.') : s.replace(/,/g, '');
  } else if (ld > -1) {
    const parts = s.split('.');
    if (parts.length > 2 || (parts[1].length === 3 && parts[0].length <= 3 && parts[0] !== '0')) s = s.replace(/\./g, '');
  }
  const n = parseFloat(s);
  return Number.isFinite(n) ? (neg ? -Math.abs(n) : n) : NaN;
}

export function parseDate(v, fallbackYear) {
  if (v instanceof Date && !isNaN(v)) return iso(v.getFullYear(), v.getMonth() + 1, v.getDate());
  if (typeof v === 'number' && v > 20000 && v < 80000) {
    // data serial do Excel
    const d = new Date(Math.round((v - 25569) * 86400000));
    return iso(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate());
  }
  const s = String(v ?? '').trim().toUpperCase();
  let m = s.match(/(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
  if (m && validDate(+m[1], +m[2], +m[3])) return iso(+m[1], +m[2], +m[3]);
  m = s.match(/(\d{1,2})[/.-](\d{1,2})(?:[/.-](\d{2,4}))?/);
  if (m) {
    let y = m[3] ? +m[3] : fallbackYear;
    if (y < 100) y += 2000;
    if (validDate(y, +m[2], +m[1])) return iso(y, +m[2], +m[1]);
  }
  m = s.match(/(\d{1,2})\s*(?:DE\s+)?([A-Z]{3})[A-Z]*\.?(?:\s*(?:DE\s+)?(\d{4}))?/);
  if (m && MON[m[2]]) {
    const y = m[3] ? +m[3] : fallbackYear;
    if (validDate(y, MON[m[2]], +m[1])) return iso(y, MON[m[2]], +m[1]);
  }
  return null;
}

// datas sem ano: se ficarem muito no futuro, eram do ano anterior
function fixFuture(list) {
  const limit = new Date(); limit.setDate(limit.getDate() + 20);
  list.forEach((t) => {
    if (new Date(t.date) > limit) t.date = `${+t.date.slice(0, 4) - 1}${t.date.slice(4)}`;
  });
  return list;
}

function guessYear(text) {
  const years = (text.match(/\b20\d{2}\b/g) || []).map(Number).filter((y) => y <= new Date().getFullYear() + 1);
  if (!years.length) return new Date().getFullYear();
  const count = {};
  years.forEach((y) => { count[y] = (count[y] || 0) + 1; });
  return +Object.entries(count).sort((a, b) => b[1] - a[1])[0][0];
}

const IGNORE_LINE = /\b(SALDO|TOTAL|SUBTOTAL|LIMITE|VENCIMENTO|PAGAMENTO M[IÍ]NIMO|RESUMO|FATURA ANTERIOR|ENCARGOS PREVISTOS|CET|TAXA DE JUROS)\b/i;
const CARD_CREDIT = /PAGAMENTO|ESTORNO|REEMBOLSO|CR[EÉ]DITO DE|CASHBACK|DEVOLU/i;

// Cartão de crédito costuma listar compras como valores positivos.
// Se nenhum valor veio negativo, consideramos tudo saída (menos pagamentos e estornos).
// Se os únicos negativos forem pagamentos/estornos, é fatura de cartão com sinais invertidos.
function normalizeSigns(list) {
  const negs = list.filter((t) => t.amount < 0);
  const cardBill = list.some((t) => t.amount > 0) && negs.every((t) => CARD_CREDIT.test(t.desc));
  if (cardBill) list.forEach((t) => { t.amount = CARD_CREDIT.test(t.desc) ? Math.abs(t.amount) : -Math.abs(t.amount); });
  return list;
}

/* ---------- tabelas (CSV, XLSX, MD, DOCX) ---------- */
const H = {
  date: /^(data|date|dt|dia)\b/i,
  desc: /(descri|hist[oó]rico|title|t[ií]tulo|estabelecimento|lan[cç]amento|memo|detalhe|loja|nome|benefici|favorecido)/i,
  amount: /^(valor|amount|value|quantia|montante|r\$|pre[cç]o)/i,
  debit: /(d[eé]bito|sa[ií]da)/i,
  credit: /(cr[eé]dito|entrada)/i,
  cat: /^(categoria|category)/i,
  type: /^(tipo|type|natureza)\b/i,
  balance: /saldo|balance/i,
};

function findHeader(rows) {
  for (let i = 0; i < Math.min(rows.length, 40); i++) {
    const cells = rows[i].map((c) => String(c ?? '').trim());
    if (cells.some((c) => H.date.test(c)) && cells.some((c) => H.amount.test(c) || H.debit.test(c) || H.credit.test(c))) return i;
  }
  return -1;
}

export function parseTable(rows, text = '') {
  rows = rows.filter((r) => r && r.some((c) => String(c ?? '').trim() !== ''));
  const year = guessYear(text || rows.flat().join(' '));
  const hi = findHeader(rows);
  const out = [];
  if (hi >= 0) {
    const head = rows[hi].map((c) => String(c ?? '').trim());
    const col = (re, not) => head.findIndex((h) => re.test(h) && !(not && not.test(h)));
    const iDate = col(H.date);
    const iDescs = head.map((h, i) => (H.desc.test(h) && !H.date.test(h) && !H.balance.test(h) ? i : -1)).filter((i) => i >= 0);
    const iAmt = col(H.amount, H.balance);
    const iDeb = iAmt < 0 ? col(H.debit) : -1;
    const iCred = iAmt < 0 ? col(H.credit) : -1;
    const iCat = col(H.cat);
    const iType = col(H.type);
    for (const r of rows.slice(hi + 1)) {
      const date = parseDate(r[iDate], year);
      if (!date) continue;
      let amount;
      if (iAmt >= 0) amount = parseAmount(r[iAmt]);
      else {
        const d = parseAmount(r[iDeb]), c = parseAmount(r[iCred]);
        amount = Number.isFinite(d) && d !== 0 ? -Math.abs(d) : Number.isFinite(c) ? Math.abs(c) : NaN;
      }
      if (!Number.isFinite(amount) || amount === 0) continue;
      if (iType >= 0) {
        const t = String(r[iType] ?? '').toUpperCase();
        if (/^(D|DEB|SA[IÍ]DA|GASTO)/.test(t)) amount = -Math.abs(amount);
        else if (/^(C|CRED|ENTRADA|RECEITA)/.test(t)) amount = Math.abs(amount);
      }
      const desc = iDescs.map((i) => String(r[i] ?? '').trim()).filter(Boolean).join(' · ') || 'Sem descrição';
      if (IGNORE_LINE.test(desc) && /^SALDO/i.test(desc)) continue;
      out.push({ date, desc, amount, cat: iCat >= 0 ? String(r[iCat] ?? '').trim() : undefined });
    }
  } else {
    // sem cabeçalho: procura data, valor e o texto mais longo em cada linha
    for (const r of rows) {
      const cells = r.map((c) => (c instanceof Date ? c : String(c ?? '').trim()));
      const di = cells.findIndex((c) => parseDate(c, year));
      if (di < 0) continue;
      const amounts = cells.map((c, i) => (i !== di && typeof c === 'string' && /\d[.,]\d{2}\b/.test(c) ? i : -1)).filter((i) => i >= 0);
      if (!amounts.length) continue;
      const amount = parseAmount(cells[amounts[0]]);
      const desc = cells.filter((c, i) => i !== di && !amounts.includes(i) && typeof c === 'string').sort((a, b) => b.length - a.length)[0];
      if (!desc || !Number.isFinite(amount)) continue;
      out.push({ date: parseDate(cells[di], year), desc, amount });
    }
  }
  return fixFuture(normalizeSigns(out));
}

/* ---------- texto livre (PDF, TXT, DOCX sem tabela) ---------- */
const MONEY = /(?:[-+]\s?)?(?:R\$\s?)?(?:[-+]\s?)?\d{1,3}(?:\.\d{3})*,\d{2}(?:\s?[-DC](?![A-Za-z]))?/g;
const MONEY_US = /(?:[-+]\s?)?(?:R\$\s?)?\d{1,3}(?:,\d{3})*\.\d{2}(?![\d])/g;
const DATE_TOKEN = /^\s*(\d{1,2}[/.-]\d{1,2}(?:[/.-]\d{2,4})?|\d{4}-\d{2}-\d{2}|\d{1,2}\s*(?:de\s+)?(?:JAN|FEV|MAR|ABR|MAI|JUN|JUL|AGO|SET|OUT|NOV|DEZ)[a-zç]*\.?(?:\s*(?:de\s+)?\d{4})?)\s+/i;

export function parseLines(text) {
  const year = guessYear(text);
  const hasBalanceCol = /\bSALDO\b/i.test(text);
  const out = [];
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.replace(/\s+/g, ' ').trim();
    if (!line) continue;
    const dm = line.match(DATE_TOKEN);
    const date = dm ? parseDate(dm[1], year) : null;
    if (!date) continue;
    const rest = line.slice(dm[0].length);
    let money = rest.match(MONEY) || [];
    if (!money.length) money = rest.match(MONEY_US) || [];
    if (!money.length) continue;
    const token = money.find((m) => /R\$/.test(m)) || (hasBalanceCol && money.length > 1 ? money[money.length - 2] : money[money.length - 1]);
    const amount = parseAmount(token.replace(/\s?C$/, ''));
    let desc = rest;
    money.forEach((m) => { desc = desc.replace(m, ' '); });
    desc = desc.replace(/\bR\$\s?/g, ' ').replace(/\bUSD\b|\bBRL\b/g, ' ').replace(/\s+/g, ' ').replace(/^[-–—|·\s]+|[-–—|·\s]+$/g, '').trim();
    if (!desc || IGNORE_LINE.test(desc) || !Number.isFinite(amount) || amount === 0) continue;
    out.push({ date, desc, amount, explicit: /^[-+]|[-DC]$/.test(token.trim()) });
  }
  return fixFuture(normalizeSigns(out));
}

/* ---------- formatos ---------- */
function parseCSV(text) {
  const first = text.split(/\r?\n/).slice(0, 5).join('\n');
  const delim = [';', '\t', ',', '|'].map((d) => [d, first.split(d).length]).sort((a, b) => b[1] - a[1])[0][0];
  const rows = [];
  let row = [], cell = '', q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) {
      if (c === '"' && text[i + 1] === '"') { cell += '"'; i++; } else if (c === '"') q = false; else cell += c;
    } else if (c === '"') q = true;
    else if (c === delim) { row.push(cell); cell = ''; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(cell); rows.push(row); row = []; cell = '';
    } else cell += c;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  return rows;
}

function parseOFX(text) {
  const out = [];
  const blocks = text.split(/<STMTTRN>/i).slice(1);
  const tag = (b, t) => (b.match(new RegExp(`<${t}>([^<\\r\\n]*)`, 'i')) || [])[1]?.trim();
  for (const b of blocks) {
    const d = tag(b, 'DTPOSTED');
    const amount = parseFloat((tag(b, 'TRNAMT') || '').replace(',', '.'));
    if (!d || !Number.isFinite(amount)) continue;
    const desc = [tag(b, 'NAME'), tag(b, 'MEMO')].filter(Boolean).filter((v, i, a) => a.indexOf(v) === i).join(' · ');
    out.push({ date: iso(d.slice(0, 4), d.slice(4, 6), d.slice(6, 8)), desc: desc || 'Sem descrição', amount, fitid: tag(b, 'FITID') });
  }
  return out;
}

function mdTables(text) {
  const rows = text.split(/\r?\n/).filter((l) => /^\s*\|.*\|\s*$/.test(l) && !/^\s*\|[\s:|-]+\|\s*$/.test(l))
    .map((l) => l.trim().slice(1, -1).split('|').map((c) => c.replace(/\*\*|`/g, '').trim()));
  return rows;
}

async function pdfText(buf, askPassword) {
  await loadLib('pdf');
  const lib = window.pdfjsLib;
  lib.GlobalWorkerOptions.workerSrc = 'vendor/pdf.worker.min.js';
  let password;
  for (;;) {
    try {
      const doc = await lib.getDocument({ data: buf.slice(0), password, isEvalSupported: false }).promise;
      const lines = [];
      for (let p = 1; p <= doc.numPages; p++) {
        const page = await doc.getPage(p);
        const content = await page.getTextContent();
        const rows = new Map();
        for (const it of content.items) {
          if (!it.str.trim()) continue;
          const y = Math.round(it.transform[5] / 3);
          if (!rows.has(y)) rows.set(y, []);
          rows.get(y).push({ x: it.transform[4], s: it.str });
        }
        [...rows.entries()].sort((a, b) => b[0] - a[0]).forEach(([, items]) => {
          lines.push(items.sort((a, b) => a.x - b.x).map((i) => i.s).join(' '));
        });
      }
      return lines.join('\n');
    } catch (e) {
      if (e?.name !== 'PasswordException') throw e;
      password = await askPassword(e.code === 2);
      if (password == null) throw new Error('PDF protegido por senha');
    }
  }
}

async function docxContent(buf) {
  await loadLib('docx');
  const { value: html } = await window.mammoth.convertToHtml({ arrayBuffer: buf });
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const rows = [...doc.querySelectorAll('tr')].map((tr) => [...tr.children].map((td) => td.textContent.trim()));
  const text = [...doc.body.children].filter((el) => el.tagName !== 'TABLE').map((el) => el.textContent).join('\n');
  return { rows, text };
}

async function sheetRows(buf) {
  await loadLib('xlsx');
  const wb = window.XLSX.read(buf, { type: 'array', cellDates: true });
  // escolhe a aba com mais linhas; abas de resumo exportadas pelo próprio app ficam de fora
  const sheets = wb.SheetNames.map((n) => window.XLSX.utils.sheet_to_json(wb.Sheets[n], { header: 1, raw: true, defval: '' }));
  return sheets;
}

const ext = (name) => (name.match(/\.([a-z0-9]+)$/i) || [])[1]?.toLowerCase() || '';

/** Lê o arquivo e retorna lançamentos. */
export async function readStatement(file, { askPassword } = {}) {
  const e = ext(file.name);
  if (['xlsx', 'xls', 'xlsm', 'ods', 'numbers'].includes(e)) {
    const sheets = await sheetRows(await file.arrayBuffer());
    const results = sheets.map((rows) => parseTable(rows));
    return results.sort((a, b) => b.length - a.length)[0] || [];
  }
  if (e === 'pdf') return parseLines(await pdfText(await file.arrayBuffer(), askPassword));
  if (e === 'docx') {
    const { rows, text } = await docxContent(await file.arrayBuffer());
    const fromTable = rows.length ? parseTable(rows, text) : [];
    return fromTable.length ? fromTable : parseLines(text + '\n' + rows.map((r) => r.join(' ')).join('\n'));
  }
  const text = await file.text();
  if (e === 'ofx' || e === 'qfx' || /<OFX>/i.test(text)) return parseOFX(text);
  if (e === 'md' || e === 'markdown') {
    const rows = mdTables(text);
    const t = rows.length ? parseTable(rows, text) : [];
    return t.length ? t : parseLines(text);
  }
  if (e === 'csv' || e === 'tsv') return parseTable(parseCSV(text), text);
  // txt e desconhecidos: tenta tabela, depois texto livre
  const asTable = text.includes(';') || text.includes('\t') ? parseTable(parseCSV(text), text) : [];
  return asTable.length ? asTable : parseLines(text);
}

/* ---------- investimentos ---------- */
const IH = {
  name: /(ativo|produto|nome|papel|ticker|investimento|t[ií]tulo|descri|aplica)/i,
  value: /(valor atual|saldo|posi[cç][aã]o|valor bruto|valor l[ií]quido|total|valor|patrim)/i,
  invested: /(valor aplicado|investido|custo|aplicado)/i,
  kind: /(tipo|classe|categoria|mercado)/i,
};

export async function readInvestments(file, opts = {}) {
  const e = ext(file.name);
  let rows = [];
  let text = '';
  if (['xlsx', 'xls', 'xlsm', 'ods'].includes(e)) rows = (await sheetRows(await file.arrayBuffer())).sort((a, b) => b.length - a.length)[0];
  else if (e === 'pdf') text = await pdfText(await file.arrayBuffer(), opts.askPassword);
  else if (e === 'docx') ({ rows, text } = await docxContent(await file.arrayBuffer()));
  else {
    text = await file.text();
    rows = e === 'md' ? mdTables(text) : (text.includes(';') || text.includes(',') || text.includes('\t')) ? parseCSV(text) : [];
  }
  const out = [];
  const hi = rows.findIndex((r) => r.some((c) => IH.name.test(String(c))) && r.some((c) => IH.value.test(String(c))));
  if (hi >= 0) {
    const head = rows[hi].map((c) => String(c));
    const iName = head.findIndex((h) => IH.name.test(h));
    const iInv = head.findIndex((h) => IH.invested.test(h));
    const iVal = head.findIndex((h, i) => IH.value.test(h) && i !== iInv && i !== iName);
    const iKind = head.findIndex((h, i) => IH.kind.test(h) && i !== iName);
    for (const r of rows.slice(hi + 1)) {
      const name = String(r[iName] ?? '').trim();
      const value = parseAmount(r[iVal]);
      if (!name || !Number.isFinite(value) || /^total/i.test(name)) continue;
      out.push({ name, value: Math.abs(value), invested: iInv >= 0 ? Math.abs(parseAmount(r[iInv])) || undefined : undefined, kind: iKind >= 0 ? String(r[iKind]).trim() : undefined });
    }
  } else {
    for (const raw of text.split(/\r?\n/)) {
      const line = raw.replace(/\s+/g, ' ').trim();
      const money = line.match(MONEY);
      if (!money || IGNORE_LINE.test(line)) continue;
      const name = line.replace(MONEY, ' ').replace(/R\$/g, ' ').replace(/\s+/g, ' ').trim();
      if (name.length < 3 || /^\d/.test(name)) continue;
      out.push({ name, value: Math.abs(parseAmount(money[money.length - 1])) });
    }
  }
  return out;
}
