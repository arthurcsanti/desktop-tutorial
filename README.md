# Caderno — finanças pessoais

App de finanças pessoais para iPhone, **offline** e com **dados criptografados no próprio aparelho**.
Visual inspirado em Notion e Obsidian: papel claro, grafite no modo escuro, títulos em serifa (New York, a fonte serifada do iOS) e cantos arredondados no padrão do iPhone.

![Prévia das telas](docs/preview.png)

## Etapa atual: estrutura visual

Telas prontas, com dados de exemplo:

| Tela | O que mostra |
|---|---|
| Bloqueio | Código de 4 dígitos (na demo, qualquer código abre) |
| Início | Gasto do mês, comparação com o mês anterior, entradas/saídas/sobra, observações, últimos 6 meses, categorias e lojas |
| Gastos | Lançamentos por dia, busca, filtro por categoria, troca de categoria em cada lançamento |
| Assinaturas | Total mensal e anual, próximas cobranças e sugestões de recorrência encontradas no extrato |
| Investir | Patrimônio, alocação, reserva de emergência, carteira e sugestões |
| Relatórios | Resumo mensal estilo página do Notion e exportação (PDF, XLSX, Markdown para Obsidian, CSV) |
| Importar | PDF, XLSX, CSV, OFX, TXT, MD e DOCX |
| Ajustes | Segurança, tema claro/escuro/automático, dados |

Modo claro e escuro seguem o iPhone automaticamente. No computador, aparece uma barra lateral no estilo Obsidian.

## Próximas etapas

1. Leitura real dos extratos (PDF, Excel, CSV, OFX, TXT, MD, DOCX) direto no aparelho
2. Criptografia AES-256-GCM com chave derivada do código (Web Crypto) e armazenamento local
3. Categorização automática por regras + detecção de assinaturas (mesmo valor, 3 meses seguidos)
4. Exportação de PDF, planilha, CSV e Markdown
5. Importação de posições de investimento

## Como abrir

Ver no computador:

```bash
python3 -m http.server 8000
# abra http://localhost:8000/?demo
```

Instalar no iPhone: publique a pasta (por exemplo, GitHub Pages), abra o link no **Safari** → botão Compartilhar → **Adicionar à Tela de Início**. Depois da primeira abertura o app funciona sem internet.
