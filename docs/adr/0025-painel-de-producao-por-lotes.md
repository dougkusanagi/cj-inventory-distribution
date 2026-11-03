# ADR 0025 — Painel de produção por lotes

## Status

Aceito — 03/11/2026.

## Contexto

A gerência precisa acompanhar peças entre setores da fábrica antes do cadastro
manual dos sacos. O estoque disponível continua representado pelos sacos e suas
movimentações, conforme os ADRs 0016 e 0024.

## Decisão

- O lote representa uma quantidade de um produto em uma etapa atual. As etapas
  são fixas em enum: Corte, Costura, Lavagem, Tinturaria, Acabamento,
  Ensacamento e Concluído, nessa ordem.
- Cada responsável de Produção acessa os setores atribuídos e envia lotes à
  etapa seguinte. O administrador acessa todos os setores. Os avanços são
  registrados em eventos e verificam a versão esperada para evitar sobrescritas.
- O administrador pode desfazer o último avanço com motivo, registrando outro
  evento. A primeira versão não exige confirmação de recebimento.
- Chegar ao Ensacamento ou concluir o lote não cria nem altera sacos, pedidos
  ou movimentações de estoque. O cadastro dos sacos permanece manual.

## Alternativas

- Contar peças separadamente em cada etapa foi descartado para a versão inicial,
  pois o painel parte de lotes com uma etapa atual.
- Etapas configuráveis foram adiadas: a sequência atual é conhecida e completa.

## Consequências

O painel acompanha a produção sem criar um segundo saldo de estoque. Alterações
na sequência exigem mudança de código e, quando necessário, migration. Divisão
de lotes e confirmação de recebimento exigem evolução própria.
