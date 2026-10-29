// Estruturas de roteiro e tipos de aba.
// Um roteiro é uma página com abas (como no Notion). Cada aba tem um tipo:
// página de texto, roteiro em cenas, moodboard, referências, tabela ou texto corrido.

import { uid, today } from './core.js';

export const STATUSES = ['Ideia', 'Rascunho', 'Revisão', 'Gravação', 'Edição', 'Publicado'];

export const LEGEND = [
  { code: 'OFF', insert: 'OFF: ', desc: 'Narração em off, sem a pessoa aparecer falando.' },
  { code: 'NOME (ON)', insert: 'NOME (ON): ', desc: 'Fala em cena, com a pessoa na imagem.' },
  { code: '[beat]', insert: '[beat] ', desc: 'Pausa curta para o efeito dramático ou cômico.' },
  { code: '[REVEAL]', insert: '[REVEAL] ', desc: 'Momento em que algo é mostrado pela primeira vez.' },
  { code: 'SOBE SOM / BG', insert: 'SOBE SOM: ', desc: 'Trilha ou som ambiente em destaque. Indique a música ou o efeito.' },
  { code: 'LETTERING', insert: 'LETTERING: ', desc: 'Texto ou gráfico que aparece na tela.' },
];

export const PLANOS = ['Plano geral', 'Plano aberto', 'Plano médio', 'Plano americano', 'Close', 'Superclose', 'Detalhe', 'Plongée', 'Contra-plongée', 'POV', 'Drone', 'Tela / gravação', 'Arquivo'];

export const TAB_TYPES = {
  pagina: { icon: '¶', label: 'Página', desc: 'Texto com títulos, listas, tarefas, citações, imagens e tabelas.' },
  roteiro: { icon: '§', label: 'Roteiro', desc: 'Cenas com narração, visual, plano e frame. Vira storyboard.' },
  moodboard: { icon: '▦', label: 'Moodboard', desc: 'Mural de fotos, cores, notas e links.' },
  referencias: { icon: '↗', label: 'Referências', desc: 'Músicas, vídeos, filmes, artigos e imagens com link.' },
  tabela: { icon: '▤', label: 'Tabela', desc: 'Banco de dados como no Notion: colunas com tipo, ordenação e quadro.' },
  texto: { icon: '≡', label: 'Texto corrido', desc: 'Folha pautada para o roteiro inteiro, sem tabela.' },
};

export const COLUMN_TYPES = {
  texto: 'Texto',
  numero: 'Número',
  selecao: 'Seleção',
  check: 'Caixa de seleção',
  data: 'Data',
  link: 'Link',
};

export const REF_TYPES = ['Música', 'Vídeo', 'Filme / série', 'Imagem', 'Artigo', 'Livro', 'Podcast', 'Pessoa', 'Outro'];

const FICHA_PADRAO = [
  ['Ideia central', 'Sobre o que é esse vídeo de verdade? Resuma em no máximo 2 frases.'],
  ['Opções de título', 'Opção A:\nOpção B:\nOpção C:'],
  ['Público-alvo', 'Quem vai assistir? O que essa pessoa já sabe sobre o tema?'],
  ['Tom e estilo', 'Humor, documental, íntimo, épico... Referências de ritmo e narração.'],
  ['Duração estimada', '00 min'],
  ['Locações', 'Onde vai gravar? Autorizações necessárias?'],
  ['Elenco e equipe', 'Quem aparece e quem grava, edita e produz.'],
];

const V = 'DESCREVA AS IMAGENS DA CENA';

export const TEMPLATES = [
  {
    id: 'youtube-3-atos',
    name: 'YouTube em 3 atos',
    desc: 'O modelo clássico: gancho, três atos e final com chamada para ação.',
    ficha: FICHA_PADRAO,
    sections: [
      { name: 'Gancho', hint: 'Ganhe a atenção da audiência: gere perguntas, interesse genuíno e, se possível, uma amostra do que está por vir.',
        scenes: [['OFF: Escreva aqui a primeira fala. [beat]', V], ['OFF: Próxima fala. [REVEAL]\nNOME (ON): Fala em cena.', V], ['OFF: Fecha o gancho com a pergunta ou o desafio do vídeo.', V]] },
      { name: 'Primeiro ato', hint: 'Contextualize o espectador: introduza a história, os personagens e o desafio, o problema ou o conflito que deverá ser superado.',
        scenes: [['OFF: Apresentação do vídeo, da série ou do tema.', 'CARTELA TÍTULO / IDENTIDADE'], ['OFF: Contexto e personagens.', V]] },
      { name: 'Segundo ato', hint: 'O protagonista lida com obstáculos e conflitos enquanto tenta alcançar o objetivo. O ponto médio, a virada, acontece aqui.',
        scenes: [['OFF: Primeiro obstáculo.', V], ['OFF: Ponto médio: a virada da história.', V]] },
      { name: 'Terceiro ato', hint: 'Resolva os conflitos e traga uma conclusão satisfatória para a história.',
        scenes: [['OFF: Clímax e resolução.', V]] },
      { name: 'Final', hint: 'Responda à pergunta do gancho, deixe a mensagem final e faça a chamada para ação: inscrição, próximo episódio, comentário.',
        scenes: [['OFF: Fechamento e chamada para ação.', 'TELA FINAL / CRÉDITOS / SUGESTÃO DE VÍDEO']] },
    ],
  },
  {
    id: 'vlog',
    name: 'Vlog',
    desc: 'Um dia, uma viagem ou um evento, contado em ordem, com um momento de virada.',
    ficha: [
      ['Ideia central', 'Qual é a história deste dia? O que a pessoa leva embora?'],
      ['Onde e quando', 'Lugares, horários e deslocamentos.'],
      ['Momentos que não podem faltar', 'Lista dos takes obrigatórios.'],
      ['Tom e estilo', 'Leve, contemplativo, caótico, engraçado...'],
      ['Duração estimada', '00 min'],
      ['Opções de título', 'Opção A:\nOpção B:'],
    ],
    sections: [
      { name: 'Abertura', hint: 'O melhor momento do dia, mostrado logo de cara, ou uma pergunta que só o final responde.',
        scenes: [['NOME (ON): Fala de abertura, olhando pra câmera.', 'TAKE MAIS FORTE DO DIA']] },
      { name: 'O plano', hint: 'O que vai acontecer hoje e por que isso importa.',
        scenes: [['NOME (ON): Explica o plano.', 'CÂMERA NA MÃO / SELFIE']] },
      { name: 'Momentos', hint: 'A jornada, em ordem. Um bloco para cada lugar ou situação.',
        scenes: [['OFF: Primeiro momento.', 'B-ROLL DO LUGAR'], ['OFF: Segundo momento.', 'B-ROLL']] },
      { name: 'Imprevisto', hint: 'O que deu errado, ou diferente do plano. É o coração do vlog.',
        scenes: [['NOME (ON): Reação ao imprevisto. [beat]', V]] },
      { name: 'Reflexão', hint: 'O que esse dia ensinou. Um pensamento honesto.',
        scenes: [['NOME (ON): Reflexão.', 'PÔR DO SOL / MOMENTO CALMO']] },
      { name: 'Encerramento', hint: 'Despedida e chamada para ação.',
        scenes: [['NOME (ON): Tchau e chamada para o próximo vídeo.', 'TELA FINAL']] },
    ],
  },
  {
    id: 'tutorial',
    name: 'Tutorial',
    desc: 'Ensinar algo passo a passo: promessa, pré-requisitos, passos e resultado.',
    ficha: [
      ['Promessa', 'Ao final do vídeo, a pessoa vai conseguir...'],
      ['Público-alvo', 'Iniciante, intermediário, avançado? O que já precisa saber?'],
      ['Materiais / pré-requisitos', 'Ferramentas, programas, ingredientes...'],
      ['Duração estimada', '00 min'],
      ['Opções de título', 'Como ... em ... passos\nOpção B:'],
    ],
    sections: [
      { name: 'Gancho', hint: 'Mostre o resultado final primeiro.', scenes: [['OFF: Olha o que a gente vai fazer hoje. [REVEAL]', 'RESULTADO FINAL']] },
      { name: 'Antes de começar', hint: 'O que a pessoa precisa ter em mãos.', scenes: [['OFF: Você vai precisar de...', 'LETTERING: LISTA DE MATERIAIS']] },
      { name: 'Passo 1', hint: '', scenes: [['OFF: Primeiro passo.', 'CLOSE NAS MÃOS / TELA']] },
      { name: 'Passo 2', hint: '', scenes: [['OFF: Segundo passo.', V]] },
      { name: 'Passo 3', hint: '', scenes: [['OFF: Terceiro passo.', V]] },
      { name: 'Erros comuns', hint: 'Onde a maioria trava e como evitar.', scenes: [['OFF: O erro mais comum é...', V]] },
      { name: 'Resultado e próximo passo', hint: 'Recapitule e indique o próximo vídeo.', scenes: [['OFF: Recapitulando...', 'TELA FINAL']] },
    ],
  },
  {
    id: 'curto',
    name: 'Short / Reels / TikTok',
    desc: 'Vídeo vertical de até 60 segundos. Cada segundo conta.',
    ficha: [
      ['Ideia central', 'Uma frase só.'],
      ['Gancho em texto', 'O texto na tela nos primeiros 2 segundos.'],
      ['Áudio / trend', 'Música ou áudio usado.'],
      ['Duração', '00 s'],
      ['Legenda e hashtags', ''],
    ],
    sections: [
      { name: 'Gancho (0–3 s)', hint: 'Pare o dedo da pessoa. Movimento, pergunta ou afirmação forte.', scenes: [['NOME (ON): Frase de impacto.', 'LETTERING: GANCHO EM TEXTO']] },
      { name: 'Desenvolvimento', hint: 'Entregue o conteúdo, sem enrolação. Corte a cada 2–3 s.', scenes: [['OFF: Ponto 1.', V], ['OFF: Ponto 2.', V]] },
      { name: 'Payoff', hint: 'A recompensa: a revelação, a piada, o resultado.', scenes: [['[REVEAL]', V]] },
      { name: 'Loop / CTA', hint: 'Termine de um jeito que puxe o começo de novo, ou peça para seguir.', scenes: [['NOME (ON): Fechamento.', 'VOLTA AO PRIMEIRO FRAME']] },
    ],
  },
  {
    id: 'documentario',
    name: 'Mini-documentário',
    desc: 'Investigação ou história real, com personagem, contexto e revelação.',
    ficha: [
      ['Ideia central', 'Qual é a pergunta que o documentário responde?'],
      ['Personagens / entrevistados', 'Quem fala, e por que essa pessoa?'],
      ['Pesquisa e fontes', 'Arquivos, artigos, dados, imagens de acervo.'],
      ['Tom e estilo', 'Investigativo, poético, observacional...'],
      ['Duração estimada', '00 min'],
      ['Direitos de imagem', 'Autorizações de uso de imagem e arquivo.'],
    ],
    sections: [
      { name: 'Abertura fria', hint: 'Comece no meio da ação ou no momento mais intrigante, antes de qualquer título.', scenes: [['SOBE SOM: ambiente.\nOFF: Primeira frase.', 'IMAGEM DE ARQUIVO / PLANO ABERTO']] },
      { name: 'O personagem', hint: 'Quem é, o que quer, o que está em jogo.', scenes: [['ENTREVISTADO (ON): Apresentação.', 'ENTREVISTA, PLANO MÉDIO']] },
      { name: 'Contexto', hint: 'A história por trás, os dados, a linha do tempo.', scenes: [['OFF: Contexto histórico.', 'LETTERING: ANO / LOCAL']] },
      { name: 'Conflito', hint: 'O problema central e as forças em jogo.', scenes: [['OFF: O problema.', V]] },
      { name: 'Investigação', hint: 'As descobertas, uma de cada vez.', scenes: [['OFF: Descoberta. [REVEAL]', V]] },
      { name: 'Clímax', hint: 'A resposta, ou a falta dela.', scenes: [['ENTREVISTADO (ON): Fala decisiva. [beat]', V]] },
      { name: 'Epílogo', hint: 'Onde estão agora. O que fica.', scenes: [['OFF: Fechamento.', 'CRÉDITOS']] },
    ],
  },
  {
    id: 'review',
    name: 'Review / Análise',
    desc: 'Opinião honesta sobre um produto, filme, livro ou lugar.',
    ficha: [
      ['O que está sendo analisado', 'Nome, versão, preço, onde comprar.'],
      ['Veredito em uma frase', ''],
      ['Público-alvo', 'Para quem é a análise?'],
      ['Duração estimada', '00 min'],
      ['Transparência', 'Foi enviado pela marca? É publicidade? Precisa avisar.'],
    ],
    sections: [
      { name: 'Gancho', hint: 'Dê uma pista do veredito sem entregar tudo.', scenes: [['NOME (ON): Vale a pena? [beat]', 'PRODUTO EM CLOSE']] },
      { name: 'O que é', hint: 'Apresentação rápida e contexto.', scenes: [['OFF: Apresentação.', 'UNBOXING / B-ROLL']] },
      { name: 'Pontos fortes', hint: '', scenes: [['OFF: O que funciona.', V]] },
      { name: 'Pontos fracos', hint: '', scenes: [['OFF: O que não funciona.', V]] },
      { name: 'Para quem é', hint: 'Quem deve comprar, e quem deve fugir.', scenes: [['NOME (ON): Recomendo para...', V]] },
      { name: 'Veredito', hint: 'Responda à pergunta do gancho.', scenes: [['NOME (ON): Veredito final.', 'LETTERING: NOTA']] },
    ],
  },
  {
    id: 'podcast',
    name: 'Podcast / Entrevista',
    desc: 'Pauta de conversa: blocos de perguntas, sem engessar a fala.',
    ficha: [
      ['Convidado(s)', 'Nome, minibio, redes.'],
      ['Objetivo da conversa', 'O que o ouvinte precisa sair sabendo?'],
      ['Pesquisa sobre o convidado', 'Entrevistas anteriores, temas que já falou demais.'],
      ['Duração estimada', '00 min'],
      ['Data e local da gravação', ''],
    ],
    sections: [
      { name: 'Abertura', hint: 'Vinheta e apresentação do episódio.', scenes: [['SOBE SOM: vinheta.\nAPRESENTADOR (ON): Boas-vindas.', 'PLANO DOS DOIS']] },
      { name: 'Apresentação do convidado', hint: '', scenes: [['APRESENTADOR (ON): Quem é o convidado.', 'LETTERING: NOME E CARGO']] },
      { name: 'Bloco 1', hint: 'Perguntas de aquecimento.', scenes: [['Pergunta 1:\nPergunta 2:', '']] },
      { name: 'Bloco 2', hint: 'O tema principal, onde a conversa aprofunda.', scenes: [['Pergunta:\nPergunta de acompanhamento:', '']] },
      { name: 'Perguntas rápidas', hint: 'Ping-pong para fechar com leveza.', scenes: [['1.\n2.\n3.', '']] },
      { name: 'Encerramento', hint: 'Onde encontrar o convidado e chamada para ação.', scenes: [['APRESENTADOR (ON): Agradecimento e CTA.', 'TELA FINAL']] },
    ],
  },
  {
    id: 'branco',
    name: 'Folha em branco',
    desc: 'Só o papel e a máquina. Você monta a estrutura.',
    ficha: FICHA_PADRAO.slice(0, 2),
    sections: [{ name: 'Cena', hint: '', scenes: [['', '']] }],
  },
];


// ---------- conteúdo inicial das abas ----------

function fichaMd(entries) {
  const head = [
    '**Escrito por:** ',
    '**Direção:** — · **Produção:** — · **Edição:** —',
    `**Versão** 1.0 · **Rascunho nº** 1 · ${today()}`,
  ].join('\n');
  const parts = entries.map(([label, hint]) => {
    if (!hint) return `### ${label}`;
    if (hint.includes('\n')) return `### ${label}\n\n` + hint.split('\n').map((l) => `- ${l}`).join('\n');
    return `### ${label}\n\n> [!tip] ${hint}`;
  });
  return [head, ...parts].join('\n\n');
}

const PRODUCAO_MD = `### Equipamento
- [ ] Câmera e lentes
- [ ] Microfones
- [ ] Baterias e cartões
- [ ] Luz

### B-roll e takes extras

> [!tip] Imagens de apoio que precisam ser gravadas.

### Música e SFX

> [!tip] Trilhas, efeitos e direitos autorais. As referências ficam na aba Referências.

### Thumbnail

> [!tip] Ideia de imagem e texto da capa do vídeo.

### Publicação
- [ ] Título final
- [ ] Descrição com capítulos e links
- [ ] Tags e palavras-chave
- [ ] Thumbnail exportada
- [ ] Legendas
- [ ] Agendado

### Pendências
- [ ] 

### Histórico de versões

| Versão | Data | Alterações |
| --- | --- | --- |
| 1.0 | ${'{{hoje}}'} | Primeiro rascunho. |`;

function table(names, types = {}, rowsCount = 1) {
  const columns = names.map((name) => ({ id: uid(), name, type: types[name] || 'texto' }));
  const rows = Array.from({ length: rowsCount }, () => ({
    id: uid(),
    cells: Object.fromEntries(columns.map((c) => [c.id, c.type === 'check' ? false : ''])),
  }));
  return { columns, rows, view: 'tabela' };
}

// Abas que o usuário pode acrescentar a qualquer roteiro.
export const TAB_PRESETS = [
  { name: 'Página em branco', type: 'pagina', make: () => ({ content: '' }) },
  { name: 'Pesquisa', type: 'pagina', make: () => ({ content: '### Perguntas\n\n- \n\n### Fontes\n\n- \n\n### Dados e números\n\n- \n\n### Citações\n\n> ' }) },
  { name: 'Thumbnail e título', type: 'pagina', make: () => ({ content: '### Títulos para testar\n\n- [ ] \n- [ ] \n\n### Ideias de thumbnail\n\n> [!tip] Rosto + emoção + no máximo 3 palavras. Cole aqui rascunhos e fotos.\n\n### Texto da capa\n\n' }) },
  { name: 'Publicação', type: 'pagina', make: () => ({ content: '### Descrição\n\n\n\n### Capítulos\n\n- 00:00 Abertura\n\n### Tags\n\n\n\n### Checklist\n\n- [ ] Legendas\n- [ ] Tela final\n- [ ] Cards\n- [ ] Comentário fixado' }) },
  { name: 'Roteiro', type: 'roteiro', make: () => ({ view: 'tabela', sections: [{ id: uid(), name: 'Cena', hint: '', scenes: [{ id: uid(), narration: '', visual: '', plano: '', image: '' }] }] }) },
  { name: 'Moodboard', type: 'moodboard', make: () => ({ items: [] }) },
  { name: 'Referências', type: 'referencias', make: () => ({ view: 'cartoes', items: [] }) },
  { name: 'Plano de gravação', type: 'tabela', make: () => table(['Cena', 'Local', 'Data', 'Status', 'Gravado'], { Data: 'data', Status: 'selecao', Gravado: 'check' }) },
  { name: 'Lista de takes', type: 'tabela', make: () => table(['Cena', 'Take', 'Plano', 'Bom', 'Nota'], { Take: 'numero', Plano: 'selecao', Bom: 'check' }) },
  { name: 'Personagens e entrevistados', type: 'tabela', make: () => table(['Nome', 'Papel', 'Contato', 'Autorização', 'Notas'], { Papel: 'selecao', Autorização: 'check' }) },
  { name: 'Locações', type: 'tabela', make: () => table(['Local', 'Endereço', 'Melhor horário', 'Autorização', 'Notas'], { Autorização: 'check' }) },
  { name: 'Orçamento', type: 'tabela', make: () => table(['Item', 'Categoria', 'Valor', 'Pago'], { Categoria: 'selecao', Valor: 'numero', Pago: 'check' }) },
  { name: 'Tabela em branco', type: 'tabela', make: () => table(['Nome', 'Notas']) },
  { name: 'Texto corrido', type: 'texto', make: () => ({ content: '' }) },
];

export function makeTab(presetName, name) {
  const p = TAB_PRESETS.find((x) => x.name === presetName) || TAB_PRESETS[0];
  return { id: uid(), type: p.type, name: name || (p.name === 'Página em branco' ? 'Página' : p.name === 'Tabela em branco' ? 'Tabela' : p.name), ...p.make() };
}

function roteiroTab(t) {
  return {
    id: uid(),
    type: 'roteiro',
    name: 'Roteiro',
    view: 'tabela',
    sections: t.sections.map((s) => ({
      id: uid(),
      name: s.name,
      hint: s.hint,
      // pn/pv: texto de exemplo mostrado enquanto a cena está vazia
      scenes: s.scenes.map(([pn, pv]) => ({ id: uid(), narration: '', visual: '', plano: '', image: '', pn, pv })),
    })),
  };
}

export function buildScript(templateId) {
  const t = TEMPLATES.find((x) => x.id === templateId) || TEMPLATES[0];
  const now = Date.now();
  return {
    id: uid(),
    title: '',
    template: t.id,
    folder: '',
    tags: [],
    status: 'Ideia',
    cover: '',
    pinned: false,
    deleted: false,
    createdAt: now,
    updatedAt: now,
    tabs: [
      { id: uid(), type: 'pagina', name: 'Ficha', content: fichaMd(t.ficha) },
      roteiroTab(t),
      makeTab('Moodboard'),
      makeTab('Referências'),
      makeTab('Texto corrido'),
      { id: uid(), type: 'pagina', name: 'Produção', content: PRODUCAO_MD.replace('{{hoje}}', today()) },
      makeTab('Plano de gravação'),
    ],
  };
}

// Roteiros da primeira versão do app (ficha/sections/notes) viram o modelo com abas.
export function migrate(s) {
  if (s.tabs || s.purged) return s;
  const c = s.cover || {};
  const kv = (rows) => (rows || []).map((r) => `### ${r.label}\n\n${r.value || (r.hint ? `> [!tip] ${r.hint.replace(/\n/g, ' ')}` : '')}`).join('\n\n');
  const ficha = [
    `**Subtítulo:** ${c.subtitle || ''} · **Episódio:** ${c.episode || ''}`,
    `**Escrito por:** ${c.author || ''}`,
    `**Direção:** ${c.direcao || '—'} · **Produção:** ${c.producao || '—'} · **Edição:** ${c.edicao || '—'}`,
    `**Versão** ${c.versao || '1.0'} · **Rascunho nº** ${c.rascunho || '1'} · ${c.data || ''}`,
    c.contato ? `**Contato:** ${c.contato}` : '',
    kv(s.ficha),
  ].filter(Boolean).join('\n\n');
  const versions = (s.versions || []).map((v) => [v.v, v.date, v.changes]);
  const producao = kv(s.notes) + (versions.length
    ? '\n\n### Histórico de versões\n\n| Versão | Data | Alterações |\n| --- | --- | --- |\n' + versions.map((r) => '| ' + r.map((x) => String(x || '').replace(/\|/g, '\\|').replace(/\n/g, '<br>')).join(' | ') + ' |').join('\n')
    : '');
  const out = {
    id: s.id, title: s.title || '', template: s.template || '', folder: s.folder || '', tags: s.tags || [],
    status: s.status || 'Ideia', cover: '', pinned: !!s.pinned, deleted: !!s.deleted,
    createdAt: s.createdAt || Date.now(), updatedAt: s.updatedAt || Date.now(),
    tabs: [
      { id: uid(), type: 'pagina', name: 'Ficha', content: ficha },
      { id: uid(), type: 'roteiro', name: 'Roteiro', view: 'tabela', sections: (s.sections || []).map((sec) => ({ ...sec, scenes: sec.scenes.map((x) => ({ plano: '', image: '', ...x })) })) },
      makeTab('Moodboard'),
      makeTab('Referências'),
      { id: uid(), type: 'texto', name: 'Texto corrido', content: s.fulltext || '' },
      { id: uid(), type: 'pagina', name: 'Produção', content: producao },
      makeTab('Plano de gravação'),
    ],
  };
  return out;
}

// Imagem que representa o roteiro na galeria: capa, 1ª foto do moodboard ou 1º frame.
export function coverOf(s) {
  if (s.cover) return s.cover;
  for (const t of s.tabs || []) {
    if (t.type === 'moodboard') { const it = t.items.find((x) => x.kind === 'image'); if (it) return it.src; }
  }
  for (const t of s.tabs || []) {
    if (t.type === 'roteiro') for (const sec of t.sections) for (const c of sec.scenes) if (c.image) return c.image;
  }
  return '';
}
