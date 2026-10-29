// Estruturas de roteiro. Cada modelo define a ficha, as seções do roteiro
// (com cenas iniciais) e as notas de produção de um roteiro novo.

export const STATUSES = ['Ideia', 'Rascunho', 'Revisão', 'Gravação', 'Edição', 'Publicado'];

export const LEGEND = [
  { code: 'OFF', insert: 'OFF: ', desc: 'Narração em off, sem a pessoa aparecer falando.' },
  { code: 'NOME (ON)', insert: 'NOME (ON): ', desc: 'Fala em cena, com a pessoa na imagem.' },
  { code: '[beat]', insert: '[beat] ', desc: 'Pausa curta para o efeito dramático ou cômico.' },
  { code: '[REVEAL]', insert: '[REVEAL] ', desc: 'Momento em que algo é mostrado pela primeira vez.' },
  { code: 'SOBE SOM / BG', insert: 'SOBE SOM: ', desc: 'Trilha ou som ambiente em destaque. Indique a música ou o efeito.' },
  { code: 'LETTERING', insert: 'LETTERING: ', desc: 'Texto ou gráfico que aparece na tela.' },
];

const FICHA_PADRAO = [
  ['Ideia central', 'Sobre o que é esse vídeo de verdade? Resuma em no máximo 2 frases.'],
  ['Opções de título', 'Opção A:\nOpção B:\nOpção C:'],
  ['Público-alvo', 'Quem vai assistir? O que essa pessoa já sabe sobre o tema?'],
  ['Tom e estilo', 'Humor, documental, íntimo, épico... Referências de ritmo e narração.'],
  ['Duração estimada', '00 min'],
  ['Locações', 'Onde vai gravar? Autorizações necessárias?'],
  ['Elenco e equipe', 'Quem aparece e quem grava, edita e produz.'],
  ['Referências', 'Vídeos, filmes, músicas e links que inspiram este roteiro.'],
];

const NOTAS_PADRAO = [
  ['Equipamento', 'Câmeras, lentes, microfones, baterias, cartões.'],
  ['B-roll e takes extras', 'Imagens de apoio que precisam ser gravadas.'],
  ['Música e SFX', 'Trilhas, efeitos e direitos autorais.'],
  ['Thumbnail', 'Ideia de imagem e texto da capa do vídeo.'],
  ['Descrição e tags', 'Texto de descrição, capítulos, links e palavras-chave.'],
  ['Pendências', 'O que falta definir, autorizar ou gravar.'],
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

export function uid() {
  if (globalThis.crypto?.randomUUID) return crypto.randomUUID();
  return 'id-' + Date.now().toString(36) + Math.random().toString(36).slice(2);
}

export function today() {
  return new Date().toLocaleDateString('pt-BR');
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
    pinned: false,
    deleted: false,
    createdAt: now,
    updatedAt: now,
    cover: {
      subtitle: '', episode: '', author: '', direcao: '', producao: '', edicao: '',
      versao: '1.0', rascunho: '1', data: today(), contato: '',
    },
    ficha: t.ficha.map(([label, hint]) => ({ id: uid(), label, hint, value: '' })),
    sections: t.sections.map((s) => ({
      id: uid(),
      name: s.name,
      hint: s.hint,
      scenes: s.scenes.map(([narration, visual]) => ({ id: uid(), narration: '', visual: '', pn: narration, pv: visual })),
    })),
    fulltext: '',
    notes: NOTAS_PADRAO.map(([label, hint]) => ({ id: uid(), label, hint, value: '' })),
    versions: [{ id: uid(), v: '1.0', date: today(), changes: 'Primeiro rascunho.' }],
  };
}
