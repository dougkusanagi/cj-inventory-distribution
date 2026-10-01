# ADR 0021 — Histórico de novidades por PR com Codex CLI

## Status

Accepted — 01/10/2026.

## Contexto

O histórico deve acompanhar PRs mergeados e explicar mudanças funcionais e
internas para qualquer pessoa. A geração deve usar a CLI do Codex, sem chave
de API. O texto precisa ser revisável e rastreável até a mudança original.

## Decisão

- Executar `codex exec` com login ChatGPT em runner Linux dedicado.
- Gerar um comentário por PR destinado à master, atualizado por SHA.
- Aceitar uma nota revisada em bloco JSON `changelog` na descrição do PR.
- Registrar um JSON por PR após merge; a repetição não duplica nem sobrescreve.
- Incluir novidades, melhorias, correções, manutenção e mudanças técnicas,
  traduzindo sua finalidade sem inventar benefícios.
- Servir a página pública a partir dos arquivos do código implantado.
- Executar somente scripts da master; dados do PR entram por stdin. O Codex
  usa sandbox somente leitura, sem configurações pessoais nem token GitHub.
- Falhas de geração/publicação são explícitas e recuperáveis pelo workflow
  manual; não bloquear o merge nem criar notas falsas como fallback.

## Consequências

Não há nova dependência da aplicação nem tabela no banco. Notas têm revisão,
rastreabilidade e disponibilidade vinculada ao deploy. A automação exige um
runner autenticado, disponibilidade da conta Codex e permissão do bot para
registrar conteúdo na master. O responsável deve conferir a publicação antes
do deploy; a data exibida é a data do merge, não uma comprovação de deploy.
