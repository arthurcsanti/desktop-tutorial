# Máquina de Roteiro

Um app para escrever roteiros como numa máquina de escrever. O papel é envelhecido e a fonte é de datilografia. A organização é parecida com a do Notion e a do Obsidian, e o app traz estruturas prontas para começar um roteiro novo em segundos.

O mesmo app roda no **Android, iPhone, iPad, Windows e Mac**. Os roteiros ficam salvos no aparelho, funcionam sem internet e sincronizam com o seu **Google Drive**.

## O que já funciona

- **Visual de máquina de escrever:** papel com textura e manchas, fonte de datilografia, campos sem caixa (o texto parece batido direto na folha) e som de teclas opcional, com "carro" no Enter.
- **Três papéis:** *envelhecido* (escuro e amarelado, o padrão), *carbono* (folha escura para a noite) e *pergaminho* (mais claro).
- **Estruturas prontas:** YouTube em 3 atos (o seu modelo do Google Docs), Vlog, Tutorial, Short/Reels/TikTok, Mini-documentário, Review, Podcast/Entrevista e Folha em branco.
- **O roteiro como no seu modelo:**
  - capa;
  - ficha do vídeo;
  - legenda;
  - tabela *Cena | Narração | Visual* com seções (Gancho, Atos, Final);
  - notas de produção e histórico de versões.
- **Botões da legenda:** `OFF`, `NOME (ON)`, `[beat]`, `[REVEAL]`, `SOBE SOM`, `LETTERING`. Cada um insere a marcação onde está o cursor.
- **Tempo estimado de fala:** calculado a partir das palavras da narração, a 150 palavras por minuto.
- **Texto integral:** uma folha pautada para o roteiro corrido. Dá para montar o texto automaticamente a partir da narração, e a rolagem de máquina mantém a linha que você está escrevendo no meio da tela.
- **Organização à moda do Notion e do Obsidian:** pastas, tags, status (Ideia → Rascunho → Revisão → Gravação → Edição → Publicado), fixados, busca em todo o texto, lixeira e duplicação.
- **Campos livres:** você pode criar, renomear e remover campos da ficha e das notas.
- **Modo foco:** esconde o arquivo e deixa só o papel.
- **Exportar:** PDF (pela impressão), Markdown (abre direto no Obsidian e importa no Notion), .txt e .json.
- **Cópia de segurança:** baixa todos os roteiros num arquivo só e importa de volta.
- **Google Drive:** cada roteiro vira um arquivo na pasta **Máquina de Roteiro** do seu Drive. Abriu em outro aparelho com a mesma conta, sincronizou.
- **Atalhos:** `Ctrl/⌘ + S` salva e sincroniza; `Ctrl/⌘ + Alt + N` cria uma folha nova; `Esc` sai do modo foco.

## Como testar no computador

```bash
python3 -m http.server 8000
# abra http://localhost:8000
```

## Como publicar (para usar em qualquer aparelho)

O app é um site estático, então dá para hospedar de graça no GitHub Pages:

1. Junte este código ao branch `main`.
2. No GitHub, abra **Settings → Pages** e, em *Source*, escolha **GitHub Actions**.
3. O workflow `.github/workflows/pages.yml` publica o app sozinho a cada push no `main`. O endereço fica parecido com `https://arthurcsanti.github.io/desktop-tutorial/`.

## Como instalar como app

- **Android (Chrome):** abra o endereço, toque em ⋮ e depois em **Instalar app** (ou *Adicionar à tela inicial*).
- **iPhone / iPad (Safari):** toque em Compartilhar e depois em **Adicionar à Tela de Início**.
- **Windows / Mac (Chrome ou Edge):** clique no ícone de instalar, na barra de endereço. O app abre numa janela própria.

Depois de instalado, o app abre mesmo sem internet.

## Como ligar o Google Drive (uma vez só)

O Google exige que cada app tenha um "ID do cliente". É grátis:

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

O app usa a permissão `drive.file`, que só dá acesso aos arquivos que ele mesmo criou. O resto do seu Drive fica invisível para ele.

Por segurança, o Google mantém a conexão aberta por cerca de 1 hora. Depois disso, o indicador no canto inferior esquerdo pede para tocar e reconectar. Enquanto isso, tudo continua salvo no aparelho e é enviado na próxima sincronização.

## Estrutura do código

```text
index.html             layout e diálogos
css/style.css          papel, temas, celular e impressão
js/app.js              editor, arquivo, exportação e sincronização
js/templates.js        estruturas de roteiro (edite aqui para criar novas)
js/db.js               armazenamento local (IndexedDB)
js/drive.js            Google Drive
sw.js                  funcionamento offline
manifest.webmanifest   instalação como app
docs/IDEIAS.md         ideias e próximos passos
```

Não há etapa de build: é HTML, CSS e JavaScript puros.
