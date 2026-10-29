// Categorização: limpa a descrição do banco, reconhece a loja e escolhe a categoria.
// Regras do usuário (criadas ao trocar a categoria de um lançamento) têm prioridade.

export const CATS = {
  moradia:     { name: 'Moradia',     color: 'var(--c1)' },
  mercado:     { name: 'Mercado',     color: 'var(--c2)' },
  delivery:    { name: 'Comer fora',  color: 'var(--c3)' },
  transporte:  { name: 'Transporte',  color: 'var(--c4)' },
  assinaturas: { name: 'Assinaturas', color: 'var(--c5)' },
  saude:       { name: 'Saúde',       color: 'var(--c6)' },
  compras:     { name: 'Compras',     color: 'var(--c7)' },
  lazer:       { name: 'Lazer',       color: 'var(--c8)' },
  taxas:       { name: 'Taxas e juros', color: 'var(--c0)' },
  outros:      { name: 'Não identificado', color: 'var(--c0)', unknown: true },
};

// tipos: out = gasto, in = entrada, inv = aplicação, skip = pagamento de fatura / transferência própria
export const TYPES = { out: 'Gasto', in: 'Entrada', inv: 'Investimento', skip: 'Ignorado' };

// [padrão na descrição normalizada, nome exibido, categoria, tipo opcional]
const KNOWN = [
  // ignorados
  ['PAGAMENTO DE FATURA|PAGAMENTO FATURA|PAGTO FATURA|PAG FATURA|PAGAMENTO RECEBIDO|PGTO CARTAO|PAGAMENTO CARTAO|PAGAMENTO EFETUADO|FATURA CARTAO|PAGAMENTO DA FATURA|PAG BOLETO FATURA|INT PAG FATURA|NU PAGAMENTOS|PAGTO DEBITO AUTOMATICO|DEBITO AUTOMATICO FATURA|PAGAMENTOS VALIDOS|ITAU (?:BLACK|PLATINUM|GOLD|UNICLASS|VISA|MASTERCARD|MC|PERSONNALITE|AZUL|LATAM)|SANTANDER (?:CARTAO|CARTOES|SX|UNIQUE|ELITE)|PAGAMENTO CARTAO SANTANDER|MERCADO PAGO FATURA|FATURA MERCADO PAGO', 'Pagamento de fatura', 'outros', 'skip'],
  ['ENTRE CONTAS|MESMA TITULARIDADE|CONTA PROPRIA|MESMO TITULAR|TRANSFERENCIA ENTRE', 'Transferência entre contas', 'outros', 'skip'],
  ['DIVIDENDO|JUROS SOBRE CAPITAL|\\bJCP\\b|PROVENTOS|AMORTIZACAO', 'Proventos', 'outros', 'in'],
  // resgate é o seu próprio dinheiro voltando: não conta como renda
  ['RESGATE', 'Resgate de investimento', 'outros', 'skip'],
  ['APLICACAO|APLIC |CAIXINHA|PORQUINHO|COFRINHO|DINHEIRO GUARDADO|DINHEIRO RESERVADO|RESERVA DE DINHEIRO|TESOURO DIRETO|CDB|LCI|LCA|CORRETORA|XP INVEST|RICO INVEST|CLEAR CORRETORA|BTG PACTUAL|NUINVEST|INTER INVEST|AVENUE|NOMAD', 'Aplicação', 'outros', 'inv'],
  ['SALARIO|PROVENTO|FOLHA DE PAGAMENTO|REMUNERACAO', 'Salário', 'outros', 'in'],
  ['RENDIMENTO|REND PAGO|REMUNERACAO DA CONTA', 'Rendimento', 'outros', 'in'],
  // comer fora (antes de UBER e AMAZON)
  ['IFOOD|IFD\\*|IFD ', 'iFood', 'delivery'],
  ['UBER EATS|UBEREATS', 'Uber Eats', 'delivery'],
  ['RAPPI', 'Rappi', 'delivery'],
  ['ZE DELIVERY', 'Zé Delivery', 'delivery'],
  ['MCDONALD|MC DONALD', "McDonald's", 'delivery'],
  ['BURGER KING|BK BRASIL', 'Burger King', 'delivery'],
  ['STARBUCKS', 'Starbucks', 'delivery'],
  ['OUTBACK', 'Outback', 'delivery'],
  ['SUBWAY', 'Subway', 'delivery'],
  ['HABIB', "Habib's", 'delivery'],
  ['RESTAURANTE|LANCHONETE|PIZZARIA|PADARIA|CAFETERIA|HAMBURGUER|SUSHI|CHURRASCARIA|BISTRO', null, 'delivery'],
  // assinaturas
  ['NETFLIX', 'Netflix', 'assinaturas'],
  ['SPOTIFY', 'Spotify', 'assinaturas'],
  ['YOUTUBE', 'YouTube Premium', 'assinaturas'],
  ['DISNEY', 'Disney+', 'assinaturas'],
  ['HBO|MAX\\.COM|HBOMAX', 'Max', 'assinaturas'],
  ['PRIME VIDEO|PRIMEVIDEO', 'Prime Video', 'assinaturas'],
  ['AMAZON PRIME|AMAZONPRIME|PRIME BR', 'Amazon Prime', 'assinaturas'],
  ['ICLOUD', 'iCloud+', 'assinaturas'],
  ['APPLE\\.COM|APPLE COM BILL|APPLECOMBILL', 'Apple', 'assinaturas'],
  ['GLOBOPLAY', 'Globoplay', 'assinaturas'],
  ['PARAMOUNT', 'Paramount+', 'assinaturas'],
  ['DEEZER', 'Deezer', 'assinaturas'],
  ['CRUNCHYROLL', 'Crunchyroll', 'assinaturas'],
  ['OPENAI|CHATGPT', 'ChatGPT', 'assinaturas'],
  ['ANTHROPIC|CLAUDE\\.AI', 'Claude', 'assinaturas'],
  ['NOTION', 'Notion', 'assinaturas'],
  ['OBSIDIAN', 'Obsidian', 'assinaturas'],
  ['CANVA', 'Canva', 'assinaturas'],
  ['ADOBE', 'Adobe', 'assinaturas'],
  ['MICROSOFT|MSFT', 'Microsoft', 'assinaturas'],
  ['GOOGLE ONE|GOOGLE STORAGE', 'Google One', 'assinaturas'],
  ['XBOX', 'Xbox', 'assinaturas'],
  ['PLAYSTATION|SONY INTERACTIVE', 'PlayStation', 'assinaturas'],
  ['DUOLINGO', 'Duolingo', 'assinaturas'],
  ['TOTALPASS', 'TotalPass', 'saude'],
  ['GYMPASS|WELLHUB', 'Wellhub', 'saude'],
  // transporte
  ['UBER|UBR\\*', 'Uber', 'transporte'],
  ['99 ?APP|99 ?TECNOLOGIA|99 ?POP|99TAXI|\\b99\\b', '99', 'transporte'],
  ['CABIFY', 'Cabify', 'transporte'],
  ['SHELL', 'Shell', 'transporte'],
  ['IPIRANGA', 'Ipiranga', 'transporte'],
  ['PETROBRAS|POSTO BR|BR MANIA', 'Petrobras', 'transporte'],
  ['AUTO POSTO|POSTO ', null, 'transporte'],
  ['SEM PARAR', 'Sem Parar', 'transporte'],
  ['VELOE', 'Veloe', 'transporte'],
  ['CONECTCAR', 'ConectCar', 'transporte'],
  ['ESTACIONAMENTO|ESTAPAR|PARKING', 'Estacionamento', 'transporte'],
  ['METRO|SPTRANS|BILHETE UNICO|RIOCARD|CPTM|TOP SP', 'Transporte público', 'transporte'],
  ['LATAM|GOL LINHAS|AZUL LINHAS|AZUL ', 'Passagem aérea', 'transporte'],
  // mercado
  ['PAO DE ACUCAR|GPA ', 'Pão de Açúcar', 'mercado'],
  ['CARREFOUR', 'Carrefour', 'mercado'],
  ['ASSAI', 'Assaí Atacadista', 'mercado'],
  ['ATACADAO', 'Atacadão', 'mercado'],
  ['EXTRA ', 'Extra', 'mercado'],
  ['OXXO', 'Oxxo', 'mercado'],
  ['HORTIFRUTI|HORTI FRUTI', 'Hortifruti', 'mercado'],
  ['ZONA SUL', 'Zona Sul', 'mercado'],
  ['ST MARCHE|SAINT MARCHE', 'St. Marché', 'mercado'],
  ['GUANABARA', 'Guanabara', 'mercado'],
  ['SAMS CLUB', "Sam's Club", 'mercado'],
  ['SUPERMERC|SUPERMERCADO|MERCADINHO|MINIMERCADO|ATACADISTA|HIPERMERCADO|SACOLAO|ACOUGUE|EMPORIO', null, 'mercado'],
  // saúde
  ['DROGASIL', 'Drogasil', 'saude'],
  ['DROGA RAIA|DROGARAIA|RAIA ', 'Droga Raia', 'saude'],
  ['PAGUE MENOS', 'Pague Menos', 'saude'],
  ['PANVEL', 'Panvel', 'saude'],
  ['SMART ?FIT', 'Smart Fit', 'saude'],
  ['BLUEFIT|BLUE FIT', 'Bluefit', 'saude'],
  ['UNIMED|AMIL|SULAMERICA|BRADESCO SAUDE|HAPVIDA|NOTREDAME', 'Plano de saúde', 'saude'],
  ['DROGARIA|FARMACIA|ACADEMIA|HOSPITAL|LABORATORIO|CLINICA|ODONTO|DENTISTA|FLEURY|DASA', null, 'saude'],
  // moradia
  ['ALUGUEL', 'Aluguel', 'moradia'],
  ['CONDOMINIO', 'Condomínio', 'moradia'],
  ['IMOBILIARIA', null, 'moradia'],
  ['ENEL|LIGHT S|CEMIG|COPEL|CPFL|ELETROPAULO|COELBA|CELPE|NEOENERGIA|EQUATORIAL|ENERGISA', 'Energia', 'moradia'],
  ['SABESP|CEDAE|COPASA|SANEPAR|EMBASA|CAGECE|COMPESA|AGUAS DO', 'Água', 'moradia'],
  ['COMGAS|NATURGY|ULTRAGAZ|LIQUIGAS', 'Gás', 'moradia'],
  ['VIVO|TELEFONICA', 'Vivo', 'moradia'],
  ['CLARO|NET SERVICOS', 'Claro', 'moradia'],
  ['TIM ', 'TIM', 'moradia'],
  ['IPTU', 'IPTU', 'moradia'],
  // compras
  ['MERCADO ?LIVRE|MERCADOLIVRE|MELI|MERCADOPAGO\\*MERCADOLIVRE', 'Mercado Livre', 'compras'],
  ['AMAZON|AMZN', 'Amazon', 'compras'],
  ['SHOPEE', 'Shopee', 'compras'],
  ['SHEIN', 'Shein', 'compras'],
  ['ALIEXPRESS', 'AliExpress', 'compras'],
  ['MAGALU|MAGAZINE LUIZA', 'Magalu', 'compras'],
  ['AMERICANAS', 'Americanas', 'compras'],
  ['CASAS BAHIA', 'Casas Bahia', 'compras'],
  ['ZARA', 'Zara', 'compras'],
  ['RENNER', 'Renner', 'compras'],
  ['C ?& ?A |CEA ', 'C&A', 'compras'],
  ['RIACHUELO', 'Riachuelo', 'compras'],
  ['CENTAURO', 'Centauro', 'compras'],
  ['NETSHOES', 'Netshoes', 'compras'],
  ['KABUM', 'KaBuM!', 'compras'],
  ['DECATHLON', 'Decathlon', 'compras'],
  ['LEROY', 'Leroy Merlin', 'compras'],
  ['IKEA|TOK ?STOK|TOKSTOK', 'Casa', 'compras'],
  ['SEPHORA', 'Sephora', 'compras'],
  ['BOTICARIO', 'O Boticário', 'compras'],
  ['NATURA', 'Natura', 'compras'],
  // lazer
  ['CINEMARK', 'Cinemark', 'lazer'],
  ['KINOPLEX', 'Kinoplex', 'lazer'],
  ['CINEMA|CINEPOLIS|UCI ', 'Cinema', 'lazer'],
  ['INGRESSO|SYMPLA|EVENTIM|TICKET', 'Ingressos', 'lazer'],
  ['STEAM', 'Steam', 'lazer'],
  ['AIRBNB', 'Airbnb', 'lazer'],
  ['BOOKING|HOTEL|POUSADA', 'Hospedagem', 'lazer'],
  ['BAR |BOTECO|CHOPERIA|CERVEJARIA|PUB ', null, 'lazer'],
  // taxas
  ['IOF', 'IOF', 'taxas'],
  ['JUROS|MULTA|ENCARGO|MORA ', 'Juros e multas', 'taxas'],
  ['ANUIDADE', 'Anuidade', 'taxas'],
  ['TARIFA|CESTA DE SERVICOS|PACOTE DE SERVICOS', 'Tarifa bancária', 'taxas'],
].map(([re, name, cat, type]) => ({ re: new RegExp(re), name, cat, type }));

const NOISE = [
  /\b(COMPRA|COMPRAS|CARTAO|CARTAO DE CREDITO|CARTAO DE DEBITO|DEBITO|CREDITO|NO DEBITO|NO CREDITO|ELO|VISA|MASTERCARD|MASTER|PAGAMENTO|PAG|PGTO|TRANSACAO|EFETUADA|APROVADA|NACIONAL|INTERNACIONAL|PARCELA|PARC|BR|SAO PAULO|RIO DE JANEIRO|SP|RJ|MG)\b/g,
  /\b\d{1,2}\/\d{1,2}\b/g, // parcelas 01/10
  /\*+/g,
  /[^A-Z0-9& ]/g,
  /\b\d+\b/g,
];

/** PIX/TED para você mesmo (ex.: Nubank → Inter) não é gasto nem renda. */
export function isOwnTransfer(s, ownName) {
  if (!ownName || !TRANSFER.test(s)) return false;
  const words = strip(ownName).split(/\s+/).filter((w) => w.length > 2 && !SMALL.has(w));
  if (words.length < 2) return false;
  const hits = words.filter((w) => new RegExp(`\\b${w}\\b`).test(s)).length;
  return hits >= Math.min(2, words.length) && new RegExp(`\\b${words[0]}\\b`).test(s);
}

const TRANSFER = /\b(PIX|TED|DOC|TRANSF\w*)\b/;
// "Transferência enviada pelo Pix - JOAO SILVA - 034.***.***-12" → "Joao Silva"
function transferName(s) {
  const name = s.replace(/\b(PIX|TED|DOC|TRANSF\w*|ENVIAD[OA]|RECEBID[OA]|PELO|PARA|DE|QR ?CODE|CHAVE|AGENDAD[OA]|CONTA|CORRENTE|SISPAG)\b/g, ' ')
    .replace(/[\d*./-]+/g, ' ').replace(/[^A-Z ]/g, ' ').replace(/\s+/g, ' ').trim();
  return titleCase(name.split(' ').slice(0, 3).join(' '));
}

// categoria que o próprio banco manda (fatura do Inter, Nubank, XP...) → categoria do app
const BANK_CATS = [
  [/RESTAURANTE|ALIMENTA|LANCHONETE|FAST ?FOOD|DELIVERY|BAR(?:ES)?\b|CAFE/, 'delivery'],
  [/SUPERMERCADO|MERCADO|HIPERMERCADO|PADARIA|ACOUGUE/, 'mercado'],
  [/TRANSPORTE|COMBUSTIVEL|POSTO|ESTACIONAMENTO|PEDAGIO|AUTOMOTIVO|VEICULO|MOBILIDADE/, 'transporte'],
  [/SAUDE|FARMACIA|DROGARIA|HOSPITAL|MEDIC|ODONTO|ACADEMIA|ESPORTE/, 'saude'],
  [/VESTUARIO|ROUPA|LOJA|DEPARTAMENTO|ELETRONICO|COMPRAS|CASA E DECORA|BELEZA|PET/, 'compras'],
  [/ENTRETENIMENTO|LAZER|CULTURA|VIAGE|TURISMO|HOTEL|HOSPEDAGEM|JOGO/, 'lazer'],
  [/ASSINATURA|STREAMING|SERVICOS DIGITAIS|DIGITAL/, 'assinaturas'],
  [/MORADIA|ALUGUEL|CONDOMINIO|ENERGIA|AGUA|TELEFON|INTERNET|CONTAS/, 'moradia'],
  [/JUROS|TARIFA|ENCARGO|IOF|ANUIDADE/, 'taxas'],
];
export function bankCategory(name) {
  const s = strip(name || '');
  return BANK_CATS.find(([re]) => re.test(s))?.[1] || null;
}

export const strip = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase();

/** chave estável da loja: usada para agrupar, criar regras e detectar recorrência */
export function merchantKey(desc) {
  let s = strip(desc);
  const known = KNOWN.find((k) => k.name && k.re.test(s));
  if (known) return known.name.toUpperCase();
  if (TRANSFER.test(s)) return `PIX ${transferName(s).toUpperCase()}`.trim();
  for (const n of NOISE) s = s.replace(n, ' ');
  return s.replace(/\s+/g, ' ').trim().split(' ').slice(0, 3).join(' ') || strip(desc).trim();
}

const SMALL = new Set(['DE', 'DA', 'DO', 'DAS', 'DOS', 'E']);
function titleCase(s) {
  return s.toLowerCase().split(' ').map((w, i) => (i && SMALL.has(w.toUpperCase()) ? w : w.charAt(0).toUpperCase() + w.slice(1))).join(' ');
}

/**
 * Classifica um lançamento.
 * @param {string} desc descrição original do banco
 * @param {number} signed valor com sinal (negativo = saída) ou NaN se desconhecido
 * @param {Array} rules regras do usuário [{key, cat, name?}]
 */
export function classify(desc, signed, rules = [], ownName = '') {
  const s = strip(desc);
  const key = merchantKey(desc);
  const rule = rules.find((r) => r.key === key);
  const known = KNOWN.find((k) => k.re.test(s));
  let type = signed > 0 ? 'in' : 'out';
  if (known?.type) type = known.type;
  // estorno é dinheiro voltando
  if (/ESTORNO|REEMBOLSO|DEVOLUCAO|CASHBACK/.test(s)) type = 'in';
  if (type === 'in' && signed < 0 && !known?.type) type = 'out';
  if (isOwnTransfer(s, ownName)) return { key: 'TRANSFERÊNCIA ENTRE CONTAS', merchant: 'Transferência entre contas', cat: 'outros', type: 'skip' };
  const isPix = !known && TRANSFER.test(s);
  const via = { PIX: 'PIX', TED: 'TED', DOC: 'DOC' }[s.match(TRANSFER)?.[1]] || 'Transferência';
  const name = rule?.name || known?.name || (isPix ? `${via} · ${transferName(s) || 'sem nome'}` : titleCase(key));
  let cat = rule?.cat || (known && !known.type ? known.cat : 'outros');
  if (type !== 'out') cat = rule?.cat || 'outros';
  return { key, merchant: name, cat, type };
}
