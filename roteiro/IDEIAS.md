# Ideias para o melhor app de roteiro

## O princípio: parecer feito à mão, não por IA

Muitos apps hoje têm a mesma cara: gradiente roxo, cantos arredondados, ícone de brilho ✨ e tudo flutuando. Aqui a direção é a oposta:

- **Materiais reais.** Papel com grão, manchas e borda gasta; mesa escura; tinta de fita vermelha nos títulos das seções; botões que parecem carimbos.
- **Tipografia de máquina.** Special Elite nos títulos, Courier Prime no texto. Todo caractere tem a mesma largura, como na datilografia.
- **Sem caixas.** Os campos são invisíveis até você tocar: o texto parece batido direto na folha.
- **Cantos retos, linhas finas e pontilhadas.** Linguagem de formulário impresso, de ficha técnica de produção.
- **Nada se mexe sem motivo.** Sem animações de "mágica", só o som da tecla (opcional) e o "carro" no Enter.

## Já está no app (versão 2)

Veja a lista completa no [README](README.md). Em resumo:

- **Arquivo como no Notion:** galeria, lista, tabela e quadro por status; pastas e subpastas, tags, fixados, lixeira e busca.
- **Roteiro como página:** capa, propriedades e abas.
- **Seis tipos de aba:** página, roteiro (tabela ou storyboard), moodboard, referências, tabela e texto corrido. Há 14 modelos de aba prontos.
- **Editor em blocos (Notion + Obsidian):** comando `/`, atalhos de Markdown, destaques, tarefas, imagens, tabelas, links com texto e `[[links entre roteiros]]`.
- **Storyboard:** frame e plano em cada cena.
- **Moodboard:** fotos, notas, cores e links; o "Gerar do roteiro" monta o mural e extrai a paleta de cores.
- **Referências:** cada link com texto próprio, miniatura e título automáticos.
- **Markdown como formato oficial:** cada roteiro é um `.md` com as imagens em `anexos/`. Sincroniza com o Google Drive e abre no Obsidian.
- **Exportação:** PDF com as abas escolhidas, `.zip` para o Obsidian, `.md` e `.txt`. Importa `.md`, `.zip` e `.json`.
- **8 estruturas de roteiro**, três papéis, som de máquina, modo foco e funcionamento offline.

## Abas sugeridas para cada roteiro

Já vêm por padrão: **Ficha · Roteiro · Moodboard · Referências · Texto corrido · Produção · Plano de gravação**.

Pelo botão **+ aba** dá para acrescentar:

- **Pesquisa:** perguntas, fontes, dados e citações.
- **Thumbnail e título:** testes A/B de título e rascunhos de capa.
- **Publicação:** descrição, capítulos, tags e checklist de upload.
- **Lista de takes:** cena, take, plano e se ficou bom.
- **Personagens e entrevistados:** papel, contato e autorização de imagem.
- **Locações:** endereço, melhor horário e autorização.
- **Orçamento:** item, categoria, valor (com soma) e se já foi pago.
- **Roteiro extra:** uma versão alternativa ou o roteiro do Short derivado do vídeo longo.

## Próximos passos sugeridos

### Escrita

- **Teleprompter:** o texto corrido rolando em letras grandes, com a velocidade ajustável. Dá para gravar lendo direto do celular ou do tablet.
- **Cronômetro de leitura:** você lê em voz alta e o app marca quanto tempo cada cena realmente leva.
- **Ditado:** falar e o texto aparecer datilografado, letra por letra.
- **Tempo por seção:** tempo estimado de cada ato, para equilibrar o ritmo (um gancho de 2 minutos é um alerta).

### Organização

- **Painel de menções:** no rodapé de cada roteiro, a lista dos outros roteiros que apontam para ele com `[[ ]]`, como no Obsidian.
- **Mapa de conexões:** um grafo dos roteiros, séries e tags.
- **Calendário de publicação:** data prevista de cada vídeo, com visualização em calendário no arquivo.
- **Séries:** agrupar episódios com capa e numeração automática.
- **Modelos próprios:** salvar qualquer roteiro (com as abas) como estrutura nova.
- **Caderno de ideias rápidas:** um botão para anotar uma ideia na rua, que depois vira roteiro.

### Produção

- **Ordem do dia automática:** os campos Visual e Plano viram a lista de takes, agrupada por locação.
- **Moodboard livre:** arrastar e posicionar os itens no mural à mão, como um quadro de cortiça de verdade.
- **Comparar versões:** ver o que mudou entre o rascunho 1 e o 2, como uma folha corrigida à caneta.
- **Exportar para Fountain** (formato padrão de roteiro de cinema) e para legendas (.srt) a partir do texto corrido.

### Nuvem e aparelhos

- **Apps nas lojas:** o mesmo código pode ser empacotado com **Capacitor** (Google Play e App Store) e **Tauri** ou **PWABuilder** (Microsoft Store). O app de hoje já instala sem loja.
- **Conflitos mais inteligentes:** hoje, quando o mesmo roteiro é editado em dois aparelhos sem internet, vence a edição mais recente. O próximo passo é juntar as mudanças aba por aba.
- **Outras nuvens:** Dropbox ou iCloud Drive, além do Google Drive.
- **Colaboração:** compartilhar um roteiro com a equipe (direção, edição) com comentários na margem, como bilhetes na folha.
