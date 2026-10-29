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
      tx.push({ id: id++, date: `${mk}-${String(day).padStart(2, '0')}`, desc, ...c, amount: Math.abs(+amount.toFixed(2)), src: 'exemplo' });
    };
    FIXED.forEach(([d, desc, v, kind]) => add(d, desc, kind === 'var' ? v * (0.85 + r() * 0.3) : v));
    if (i <= 2) add(18, 'AMAZON PRIME BR', -19.9);
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
      { id: 'i1', name: 'Tesouro Selic 2029', kind: 'Reserva de emergência', value: 12400, invested: 11300 },
      { id: 'i2', name: 'CDB 112% CDI', kind: 'Renda fixa', value: 8200, invested: 7600 },
      { id: 'i3', name: 'Ações e FIIs', kind: 'Renda variável', value: 6150, invested: 6400 },
      { id: 'i4', name: 'IVVB11', kind: 'Exterior', value: 4300, invested: 3800 },
      { id: 'i5', name: 'Bitcoin', kind: 'Cripto', value: 900, invested: 700 },
    ],
    imports: [{ id: 'x', name: 'dados-de-exemplo', kind: 'extrato', count: tx.length, at: new Date().toISOString() }],
  };
}
