# ADR 0034 — Novidades por entrega

## Status

Aceito — 16/11/2026. Substitui o ADR 0021.

## Contexto

O mecanismo por PR não cobre pushes diretos. O usuário pediu um documento geral
de resumos e Markdown separado para os detalhes de cada atualização.

## Decisão

Usar `resources/changelog/index.json` como documento geral da página Novidades.
Cada registro tem identificador único, data, título, mudanças e `details_file`.
Preparar os documentos antes de cada entrega enviada ao GitHub, com todas as
mudanças desde a última nota. Preservar os registros antigos e seus identificadores.
Renderizar os detalhes Markdown sem HTML embutido nem links inseguros.
Desativar a automação de publicação por PR, que escreve fora do documento geral.

## Alternativas e consequências

Manter geração após merge continuaria sem cobrir pushes diretos. Usar um índice
JSON preserva o formato dos resumos existentes e permite leitura sem parser
Markdown próprio. Os detalhes ficam editáveis em Markdown. A atualização passa
a fazer parte da entrega; não depende de runner Codex autenticado.
