// Dados de exemplo: 6 meses de lançamentos fictícios para conhecer o app antes de importar um extrato.
import { classify } from './categorize.js';
import { shiftMonth, currentMk } from './analysis.js';

function rng(seed) {
  return () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
}

const FIXED = [
  [1, 'PIX SALARIO EMPRESA LTDA', 7800, 'in'], [1, 'ALUGUEL IMOBILIARIA LAR', -1650], [1, 'SMART FIT', -129.9],
  [5, 'GOOGLE YOUTUBE PREMIUM', -24.9], [8, 'SPOTIFY', -21.9], [10, 'ENEL SP', -180, 'var'], [14, 'NETFLIX.COM', -44.9],
  [17, 'VIVO FIBRA', -109.99], [27, 'APPLE.COM/BILL ICLOUD', -14.9], [6, 'APLICACAO TESOURO DIRETO', -900, 'inv'],
];
const VARIABLE = [
  ['IFOOD *IFOOD', -55, 6, 3], ['UBER *TRIP', -25, 5, 2], ['PAO DE ACUCAR 1234', -240, 2, 1], ['SHELL BOX', -195, 2, 0],
  ['DROGASIL 221', -70, 1, 1], ['AMAZON MARKETPLACE', -130, 1, 1], ['ASSAI ATACADISTA', -260, 1, 0], ['CINEMARK', -68, 1, 1],
  ['BAR DO ZE', -90, 1, 1], ['MERCADO LIVRE', -95, 1, 1], ['HORTIFRUTI', -70, 1, 1], ['ZARA BRASIL', -240, 0, 1],
  ['COMPRA CARTAO *SQ 4421', -64, 0, 1],
];

export function sampleData() {
  const end = currentMk();
  const r = rng(42);
  const tx = [];
  let id = 1;
  for (let i = 5; i >= 0; i--) {
    const mk = shiftMonth(end, -i);
    const days = i === 0 ? Math.max(3, new Date().getDate()) : 28;
    const add = (day, desc, amount) => {
      if (day > days) return;
      const c = classify(desc, amount);
      const tags = i === 1 && /CINEMARK|BAR DO ZE|CLINICA/.test(desc) ? [/CLINICA/.test(desc) ? 'saude-ir' : 'aniversario-ana'] : undefined;
      const t = { id: id++, date: `${mk}-${String(day).padStart(2, '0')}`, desc, ...c, amount: Math.abs(+amount.toFixed(2)), src: 'exemplo', tags };
      if (/LUCAS PEREIRA/.test(desc)) Object.assign(t, { type: 'refund', cat: 'lazer', tags: ['aniversario-ana'] });
      tx.push(t);
    };
    FIXED.forEach(([d, desc, v, kind]) => add(d, desc, kind === 'var' ? v * (0.85 + r() * 0.3) : v));
    if (i <= 2) add(18, 'AMAZON PRIME BR', -19.9);
    // compras parceladas que seguem nos próximos meses
    if (i <= 3) add(9, `MAGAZINE LUIZA ${String(4 - i).padStart(2, '0')}/10`, -289.9);
    if (i <= 1) add(20, `DECATHLON ${String(2 - i).padStart(2, '0')}/06`, -133.5);
    if (i === 4) add(3, 'IPVA SP 2026 COTA UNICA', -2380.4);
    if (i === 2) add(12, 'TARIFA PACOTE SERVICOS', -39.9);
    add(15, 'IOF COMPRA INTERNACIONAL', -(2 + r() * 6));
    if (i === 1) { add(22, 'CLINICA ODONTO SORRISO', -380); add(23, 'PIX RECEBIDO LUCAS PEREIRA', 85); }
    VARIABLE.forEach(([desc, v, base, spread]) => {
      // delivery cresce nos últimos meses, para o exemplo ter o que observar
      const n = base + Math.floor(r() * (spread + 1)) + (desc.startsWith('IFOOD') && i === 0 ? 2 : 0);
      for (let k = 0; k < n; k++) add(1 + Math.floor(r() * 28), desc, v * (0.7 + r() * 0.6));
    });
  }
  return {
    tx,
    subs: [
      { id: 's1', name: 'Smart Fit', key: 'SMART FIT', amount: 129.9, day: 1, cat: 'saude', since: shiftMonth(end, -5) },
      { id: 's2', name: 'Netflix', key: 'NETFLIX', amount: 44.9, day: 14, cat: 'assinaturas', since: shiftMonth(end, -5) },
      { id: 's3', name: 'YouTube Premium', key: 'YOUTUBE PREMIUM', amount: 24.9, day: 5, cat: 'assinaturas', since: shiftMonth(end, -5) },
      { id: 's4', name: 'Spotify', key: 'SPOTIFY', amount: 21.9, day: 8, cat: 'assinaturas', since: shiftMonth(end, -5) },
      { id: 's5', name: 'iCloud+', key: 'ICLOUD+', amount: 14.9, day: 27, cat: 'assinaturas', since: shiftMonth(end, -5) },
    ],
    inv: [
      { id: 'i1', name: 'Tesouro Selic 2029', kind: 'Reserva de emergência', value: 12400, invested: 11300, since: shiftMonth(end, -12) },
      { id: 'i2', name: 'CDB 112% CDI', kind: 'Renda fixa', value: 8200, invested: 7600, since: shiftMonth(end, -9) },
      { id: 'i3', name: 'Ações e FIIs', kind: 'Renda variável', value: 6150, invested: 6400, since: shiftMonth(end, -14) },
      { id: 'i4', name: 'IVVB11', kind: 'Exterior', value: 4300, invested: 3800 },
      { id: 'i5', name: 'Bitcoin', kind: 'Cripto', value: 900, invested: 700 },
    ],
    imports: [{ id: 'x', name: 'dados-de-exemplo', kind: 'extrato', count: tx.length, at: new Date().toISOString() }],
    budgets: { delivery: 450, mercado: 1100, compras: 900, lazer: 400, transporte: 700 },
    annual: [
      { id: 'a1', name: 'IPVA', amount: 2380.4, month: 1 },
      { id: 'a2', name: 'IPTU', amount: 1450, month: 2 },
      { id: 'a3', name: 'Seguro do carro', amount: 2100, month: 6 },
      { id: 'a4', name: 'Presentes de fim de ano', amount: 900, month: 12 },
    ],
    goals: [
      { id: 'g1', name: 'Viagem para o Chile', target: 9000, saved: 3200, deadline: shiftMonth(end, 8) },
      { id: 'g2', name: 'Troca do celular', target: 4500, saved: 4500, deadline: shiftMonth(end, 1) },
    ],
    accounts: [
      { id: 'c1', name: 'Nubank', kind: 'conta', value: 2340.55, updated: new Date().toISOString() },
      { id: 'c2', name: 'Inter', kind: 'conta', value: 870.1, updated: new Date().toISOString() },
      { id: 'd1', name: 'Financiamento do carro', kind: 'divida', value: 18400, updated: new Date().toISOString() },
    ],
    bills: [{ id: 'b1', name: 'Fatura Nubank', day: 10 }, { id: 'b2', name: 'Fatura Inter', day: 15 }],
    nwHistory: Object.fromEntries([-5, -4, -3, -2, -1].map((k, j) => [shiftMonth(end, k), { net: 9800 + j * 1150, assets: 0, liabilities: 0 }])),
  };
}
