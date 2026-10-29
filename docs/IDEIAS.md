# Ideias para o melhor app de roteiro

## O princípio: parecer feito à mão, não por IA

Muitos apps hoje têm a mesma cara: gradiente roxo, cantos arredondados, ícone de brilho ✨ e tudo flutuando. Aqui a direção é a oposta:

- **Materiais reais.** Papel com grão, manchas e borda gasta; mesa escura; tinta de fita vermelha nos títulos das seções; botões que parecem carimbos.
- **Tipografia de máquina.** Special Elite nos títulos, Courier Prime no texto. Todo caractere tem a mesma largura, como na datilografia.
- **Sem caixas.** Os campos são invisíveis até você tocar: o texto parece batido direto na folha.
- **Cantos retos, linhas finas e pontilhadas.** Linguagem de formulário impresso, de ficha técnica de produção.
- **Nada se mexe sem motivo.** Sem animações de "mágica", só o som da tecla (opcional) e o "carro" no Enter.

## Já está no app (versão 1)

Veja a lista completa no [README](../README.md). Em resumo:

- 8 estruturas de roteiro;
- o seu modelo do Google Docs transformado em editor;
- pastas, tags, status, busca e lixeira;
- três papéis;
- modo foco e som de máquina;
- exportação em PDF, Markdown, TXT e JSON;
- funciona offline;
- sincroniza com o Google Drive;
- instala no Android, iOS, Windows e Mac.

## Próximos passos sugeridos

### Escrita

- **Teleprompter:** o texto integral rolando em letras grandes, com a velocidade ajustável. Dá para gravar lendo direto do celular ou do tablet.
- **Cronômetro de leitura:** você lê em voz alta e o app marca quanto tempo cada cena realmente leva.
- **Mais rolagem de máquina:** manter a linha atual no centro também nas cenas da tabela, não só no texto integral.
- **Ditado:** falar e o texto aparecer datilografado, letra por letra.
- **Contagem por seção:** tempo estimado de cada ato, para equilibrar o ritmo (um gancho de 2 minutos é um alerta).

### Organização (Notion e Obsidian)

- **Links entre roteiros com `[[colchetes duplos]]`,** como no Obsidian. Por exemplo, ligar um episódio ao anterior ou a uma pesquisa.
- **Notas soltas / caderno de ideias:** folhas rápidas, sem estrutura, para anotar uma ideia na rua e depois transformar em roteiro.
- **Quadro por status (kanban):** colunas Ideia → Rascunho → Gravação → Edição → Publicado, arrastando os cartões.
- **Calendário de publicação:** data prevista de cada vídeo.
- **Mapa de conexões:** um grafo dos roteiros, séries e tags.
- **Séries:** agrupar episódios com capa e numeração automática.
- **Modelos próprios:** salvar qualquer roteiro como estrutura nova.

### Produção

- **Lista de gravação gerada do roteiro:** todos os campos "Visual" viram um checklist de takes.
- **Imagens de referência** coladas na coluna Visual (storyboard simples).
- **Comparar versões:** ver o que mudou entre o rascunho 1 e o 2, como uma folha corrigida à caneta.
- **Exportar para Fountain** (formato padrão de roteiro de cinema) e para legendas (.srt) a partir do texto integral.

### Nuvem e aparelhos

- **Apps nas lojas:** o mesmo código pode ser empacotado com **Capacitor** (Google Play e App Store) e **Tauri** ou **PWABuilder** (Microsoft Store). O PWA de hoje já instala sem loja; as lojas trazem visibilidade e algumas integrações nativas.
- **Conflitos mais inteligentes:** hoje vence a edição mais recente. O próximo passo é juntar as mudanças campo a campo quando dois aparelhos editam o mesmo roteiro offline.
- **Outras nuvens:** Dropbox ou iCloud Drive, além do Google Drive.
- **Cópia legível no Drive:** além do arquivo do app, salvar um `.md` ou Google Doc de cada roteiro para ler fora do app.
- **Colaboração:** compartilhar um roteiro com a equipe (direção, edição) com comentários na margem, como bilhetes na folha.
