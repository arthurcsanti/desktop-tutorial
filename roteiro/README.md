# Máquina de Roteiro

Um app para escrever roteiros como numa máquina de escrever. O papel é envelhecido e a fonte é de datilografia. A organização é parecida com a do Notion, os arquivos são Markdown como no Obsidian, e o app traz estruturas prontas para cada tipo de vídeo.

O mesmo app roda no **Android, iPhone, iPad, Windows e Mac**. Funciona sem internet e sincroniza com o **Google Drive**. Cada roteiro é salvo como um arquivo **`.md`**, então ele também abre no Obsidian, no Notion (importação), no VS Code ou em qualquer editor de texto. Você não fica preso a este app.

## O que tem

### Arquivo de roteiros (como um banco de dados do Notion)
- **Quatro visualizações:** galeria (com capa), lista, tabela (com status, pasta e tags editáveis) e quadro por status (arrastando os cartões de Ideia até Publicado).
- **Organização:** pastas e subpastas (`Canal/Série 1`), tags, status, fixados, lixeira e busca em todo o texto.
- **Ordenação:** por edição, criação, título ou status.

### Cada roteiro é uma página com capa e abas
- **Capa e propriedades:** imagem de capa e um título grande. Pasta, tags, status e estrutura ficam no topo, como as propriedades de uma página do Notion.
- **Abas que você organiza:** dá para renomear, mover, duplicar, apagar e criar novas a partir de modelos.

| Tipo de aba | Para quê |
|---|---|
| ¶ **Página** | Texto com formatação, no estilo Notion e Obsidian (veja abaixo). Usada em Ficha, Produção, Pesquisa, Publicação… |
| § **Roteiro** | Cenas com narração, visual, **plano** (close, plano geral…) e **frame** (imagem). Dá para ver como **tabela** ou como **storyboard**. Mostra o tempo de fala estimado. |
| ▦ **Moodboard** | Mural de cortiça com fotos presas com fita, fichas de anotação, amostras de cor e links (em detalhes abaixo). |
| ↗ **Referências** | Músicas, vídeos, filmes, artigos e imagens com link (em detalhes abaixo). |
| ▤ **Tabela** | Banco de dados como no Notion, para organizar a produção (em detalhes abaixo). |
| ≡ **Texto corrido** | Folha pautada para o roteiro inteiro, que pode ser montada a partir da narração das cenas. |

**O moodboard:**
- Você arrasta fotos para o mural, cola imagens (Ctrl+V) ou adiciona links.
- **Gerar do roteiro** junta sozinho os frames das cenas, as imagens das páginas e as miniaturas das referências, e extrai a **paleta de cores** dessas imagens.

**As referências:**
- Cada link tem um **texto que aparece no lugar do endereço**.
- Cada uma tem também tipo, autor, nota e a cena onde entra.
- Ao colar um link do YouTube, Spotify, Vimeo etc., o app descobre o tipo e busca o título sozinho.
- Dá para ver como cartões (com miniatura) ou como tabela.

**As tabelas:**
- As colunas têm tipo: texto, número, seleção, caixa de seleção, data ou link.
- Dá para ordenar e ver a soma das colunas de número.
- Também há uma visualização em **quadro** (kanban), agrupada por uma coluna de seleção.

**Modelos de aba prontos:** Pesquisa, Thumbnail e título, Publicação, Plano de gravação, Lista de takes, Personagens e entrevistados, Locações, Orçamento, Moodboard, Referências, Roteiro extra e Texto corrido.

### Editor de texto (Notion + Obsidian)
- **Blocos:** texto, títulos 1–3, lista, lista numerada, tarefa (☐), citação, destaque (o *callout* do Obsidian: nota, dica, atenção…), divisória, imagem, tabela e código.
- **Comandos:** digite **`/`** para escolher o bloco, ou use os atalhos de Markdown: `#`, `##`, `-`, `1.`, `[]`, `>`, `---`.
- **Formatação:** **negrito**, *itálico*, ~~riscado~~, ==marca-texto==, `código` e **link com texto**. Atalhos: Ctrl+B, Ctrl+I, Ctrl+K, Ctrl+E, Ctrl+Shift+X e Ctrl+Shift+H.
- **`[[Links entre roteiros]]`**, como no Obsidian. Clicar abre o roteiro ligado, ou oferece criar um com aquele título.
- **Imagens:** dá para colar ou arrastar imagens direto na página.
- **Organização dos blocos:** Tab e Shift+Tab mudam o recuo das listas, e o menu ⋮⋮ de cada bloco transforma, move, duplica ou apaga.

### Planejamento de publicação (YouTube, Instagram, TikTok…)
- **Calendário do mês:** cada publicação aparece como um carimbo da plataforma (YT, IG, TT…). Você arrasta entre os dias para remarcar, e as campanhas aparecem como faixas coloridas no período delas. No celular, basta tocar no dia para ver os detalhes.
- **Ordem de publicação:** a fila das próximas publicações, numerada e agrupada por semana, com as atrasadas destacadas.
  - As setas ↑ ↓ trocam a ordem e, junto, as datas das duas publicações.
  - Abaixo ficam a fila sem data (com "Distribuir nas próximas datas livres"), os roteiros que ainda não têm publicação planejada e o que foi publicado nos últimos 60 dias, com os números.
- **Campanhas:** cada campanha tem objetivo (alcance, engajamento, seguidores, vendas, lançamento…), início e fim, plataformas e uma cor.
  - Também tem uma aba de **Estratégia** (mensagem, público, pilares, chamada para ação) e uma tabela de **Metas** (meta × resultado).
  - O painel da campanha mostra as publicações ligadas, o progresso e a soma de visualizações, curtidas, comentários, compartilhamentos e salvos.
- **Aba Publicações em cada roteiro:** onde e quando cada versão vai ao ar (vídeo longo, Short, Reels, TikTok…), com status de Ideia até Publicado, campanha, link e resultados.
  - O botão **"+ Cortes"** cria de uma vez um Short, um Reels e um TikTok nos dias seguintes.
- **Exportar para o calendário (.ics):** as publicações viram eventos com alarme no app Calendário do iPhone, do Android ou do computador.

### Configurações (personalize o app)
- Abra em **⚙ Configurações**, na barra lateral, ou em **Ajustes → Abrir Configurações**.
- Você pode editar, reordenar, adicionar e remover:
  - status dos roteiros, status das publicações e status das campanhas;
  - objetivos de campanha, tipos de referência e planos de câmera;
  - **plataformas** (nome, sigla do carimbo, cor e formatos);
  - a **legenda do roteiro** (os botões OFF, [beat], LETTERING…).
- **Renomear um item** atualiza também os roteiros, publicações e campanhas que já usavam aquele nome.
- **Som das teclas:** o de máquina de escrever ou um som seu (uma tecla e, se quiser, o retorno do carro no Enter), com volume.
- **Em todos os aparelhos:** com o Drive conectado, as configurações vão no arquivo `configuracoes.json` da pasta do app (o som vai junto, em `anexos/`) e valem em todos os aparelhos da mesma conta.

### A vibe de máquina de escrever
- Papel com textura e manchas, mesa de madeira escura e fonte de datilografia.
- Títulos das seções em vermelho, como a fita da máquina, e status em carimbo.
- Três papéis: **envelhecido** (o padrão), **carbono** (escuro) e **pergaminho** (claro).
- Som de teclas opcional, rolagem de máquina e modo foco.

### Estruturas prontas
YouTube em 3 atos (o seu modelo do Google Docs), Vlog, Tutorial, Short/Reels/TikTok, Mini-documentário, Review, Podcast/Entrevista e Folha em branco. Cada uma já vem com Ficha, Roteiro, Moodboard, Referências, Texto corrido, Produção e Plano de gravação.

### Importar de outros apps
- Abra a área de importação pelo botão **⇪ Importar arquivos** na barra lateral, pelo **⇪ Importar** no topo do arquivo, por Ajustes, ou **soltando os arquivos em qualquer lugar do app**.
- **Formatos:** Word (`.docx`, inclusive Google Docs baixado como .docx), LibreOffice (`.odt`), `.txt`, `.md`, `.html`, `.zip` e `.json`. O `.doc` antigo não é lido; salve como .docx.
- **Modelos de importação:**
  - **Detectar a estrutura do roteiro:** cada parte vai para a sua aba.
    - A capa e a tabela da ficha vão para a Ficha.
    - A tabela de cenas (CENA · NARRAÇÃO · VISUAL), inclusive com células mescladas, vira a aba Roteiro, com seções e cenas.
    - As notas de produção e o histórico de versões vão para Produção.
    - O texto integral vai para Texto corrido.
    - Outros títulos viram páginas.
  - **Como página de texto:** o documento inteiro numa aba, com a formatação.
  - **Como texto corrido:** só o texto, na aba Texto corrido.
- Também dá para escolher a estrutura base do roteiro e a pasta de destino.

### Exportar e importar
- **`.md`:** o formato oficial, que abre no Obsidian, no Notion, no VS Code, no Typora…
- **Pacote para o Obsidian (`.zip`):** o `.md` e a pasta `anexos/` com as imagens. Basta descompactar dentro do cofre do Obsidian.
- **PDF:** você escolhe quais abas entram, e o PDF inclui frames, moodboard e tabelas.
- **`.txt`:** texto puro.
- **Tudo de uma vez:** em Ajustes, o botão baixa todos os roteiros num `.zip` que funciona como um cofre do Obsidian.
- **Importar:** aceita `.md` (inclusive notas comuns do Obsidian), `.zip` e `.json`.

## Privacidade: onde ficam os seus dados

- **No aparelho:** tudo o que você escreve fica guardado dentro do navegador, no celular, no tablet ou no computador. Funciona sem internet.
- **No seu Google Drive (opcional):** se você ligar, os roteiros vão direto do aparelho para a sua conta, como arquivos `.md`. Não passam por nenhum servidor no meio, e o app só enxerga os arquivos que ele mesmo criou.
- **Nunca no GitHub:** o GitHub guarda e entrega só o código do app, igual para todo mundo. O GitHub Pages só envia arquivos, não recebe nada. O app não tem servidor e não tem nenhuma forma de gravar no GitHub.
- **Nada sai do aparelho sem você pedir:** as fontes vêm junto com o app. A busca automática de título e miniatura de links (YouTube, Spotify…) fica **desligada**; para ligar, use Ajustes → Privacidade, e mesmo assim só o endereço do link é enviado.
- **Recomendações:** ative a verificação em duas etapas na sua conta Google. No iPhone, use o app instalado na Tela de Início, pois o Safari pode apagar dados de sites que você não abre há semanas. De vez em quando, baixe a cópia em Ajustes → "Baixar todos os roteiros (.zip)".

## Como os arquivos ficam salvos

```text
Máquina de Roteiro/              (pasta no Google Drive)
├── Roteiros/
│   ├── Um dia na feira.md       (roteiros sem pasta)
│   └── Canal/
│       └── Série 1/
│           └── Como consertei uma máquina.md
├── Campanhas/
│   └── Lançamento da série.md
├── Lixeira/                     (roteiros na lixeira do app)
├── anexos/                      (imagens e sons)
│   ├── 3f9a1c2b7d10.jpg
│   └── 8e21aa04c5f3.png
└── configuracoes.json           (suas listas personalizadas e som)
```

A **Pasta** de cada roteiro no app vira uma pasta de verdade no Drive. Mudou a pasta no app, o arquivo se move no Drive. As imagens funcionam de qualquer subpasta, também no Obsidian. O backup completo em `.zip` segue a mesma organização.

Cada `.md` começa com as propriedades (frontmatter) e tem uma seção `##` por aba:

```markdown
---
titulo: Como consertei uma máquina
status: Rascunho
pasta: Canal/Série 1
tags: [vintage, conserto]
capa: anexos/3f9a1c2b7d10.jpg
---

# Como consertei uma máquina

## Ficha
<!-- aba: pagina -->

### Ideia central
...

## Roteiro
<!-- aba: roteiro -->

### Gancho

| Cena | Narração | Visual | Plano | Frame |
| --- | --- | --- | --- | --- |
| 01 | OFF: Ela ficou 40 anos parada. [beat] | TECLAS EMPOEIRADAS | Close | ![](anexos/8e21aa04c5f3.png) |
```

O comentário `<!-- aba: ... -->` é invisível no Obsidian. É ele que avisa ao app de que tipo é cada aba.

Se você editar o `.md` no Obsidian ou direto no Drive, o app traz a mudança na próxima sincronização. Arquivos `.md` criados *fora* do app não aparecem sozinhos, porque o Google só deixa o app ver os arquivos que ele mesmo criou. Para trazê-los, use **Ajustes → Importar**.

## Como testar no computador

```bash
python3 -m http.server 8000
# abra http://localhost:8000
```

## Como publicar (para usar em qualquer aparelho)

O app fica na pasta `roteiro/` deste repositório e é publicado pelo GitHub Pages junto com o Lastro, a cada push no `main`:

**https://arthurcsanti.github.io/desktop-tutorial/roteiro/**

Os dois apps ficam no mesmo endereço, mas cada um guarda seus dados separadamente no aparelho.

## Como instalar como app

- **Android (Chrome):** abra o endereço, toque em ⋮ e depois em **Instalar app**.
- **iPhone / iPad (Safari):** toque em Compartilhar e depois em **Adicionar à Tela de Início**.
- **Windows / Mac (Chrome ou Edge):** clique no ícone de instalar, na barra de endereço.

## Como ligar o Google Drive (uma vez só)

1. Acesse <https://console.cloud.google.com/> e crie um projeto, por exemplo "Máquina de Roteiro".
2. Em **APIs e serviços → Biblioteca**, ative a **Google Drive API**.
3. Em **Tela de consentimento OAuth**:
   - escolha *Externo*;
   - preencha o nome do app e o seu e-mail;
   - em *Usuários de teste*, adicione o seu e-mail.
4. Em **Credenciais → Criar credenciais → ID do cliente OAuth**:
   - tipo: **Aplicativo da Web**;
   - em *Origens JavaScript autorizadas*, adicione `https://arthurcsanti.github.io` (e `http://localhost:8000` para testar).
5. Copie o ID (termina em `.apps.googleusercontent.com`).
6. No app, abra **Ajustes → Google Drive**, cole o ID e toque em **Conectar ao Drive**.

O app usa a permissão `drive.file`, que só dá acesso aos arquivos que ele mesmo criou. O Google mantém a conexão aberta por cerca de 1 hora. Depois, o indicador no canto inferior esquerdo pede para tocar e reconectar, e enquanto isso tudo continua salvo no aparelho.

**Dica para usar com o Obsidian no computador:** instale o Google Drive para computador e abra a pasta **Máquina de Roteiro** como um cofre no Obsidian. Os roteiros e as imagens aparecem lá, sempre atualizados.

## Estrutura do código

```text
index.html               layout e diálogos
css/style.css            papel, temas, componentes, celular e impressão
fonts/                   fontes de máquina de escrever (guardadas no app)
js/app.js                navegação, página do roteiro, abas, ajustes, sincronização
js/core.js               estado e utilitários de interface
js/model.js              estruturas de roteiro, tipos e modelos de aba
js/markdown.js           formato .md: blocos, tabelas, frontmatter, roteiro <-> arquivo
js/editor.js             editor de páginas em blocos (Notion/Obsidian)
js/views/roteiro.js      cenas em tabela e storyboard
js/views/moodboard.js    mural (fotos, cores, notas, links, paleta)
js/views/referencias.js  referências com link
js/views/tabela.js       banco de dados com tipos de coluna e quadro
js/views/library.js      arquivo: galeria, lista, tabela e quadro
js/views/planner.js      calendário, ordem de publicação e campanhas
js/views/publicacoes.js  aba Publicações de cada roteiro
js/views/config.js       tela de Configurações
js/config.js             listas personalizáveis e som (sincronizados no Drive)
js/files.js              imagens (anexos), miniaturas e paleta de cores
js/export.js             .md, .zip, .txt, PDF e importação
js/importers.js          leitura de Word, .odt, .html, .txt e Markdown e reconhecimento da estrutura
js/zip.js                leitura e gravação de .zip sem bibliotecas
js/db.js                 armazenamento local (IndexedDB)
js/drive.js              Google Drive
sw.js                    funcionamento offline
IDEIAS.md                ideias e próximos passos
```

Não há etapa de build nem dependências: é HTML, CSS e JavaScript puros.
