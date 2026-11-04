# ADR 0032 — Grade opcional em lotes de produção

## Status

Aceito — 04/11/2026. Complementa os ADRs 0025 e 0031.

## Contexto

A fábrica pode conhecer a quantidade por tamanho de um lote, mas também precisa
trabalhar quando essa distribuição ainda não foi informada. Ao dividir um lote,
a distribuição conhecida não pode ser perdida nem inventada.

## Decisão

- A grade é opcional e pertence ao lote. Cada tamanho é texto, admite formatos
  numéricos e alfabéticos, e tem uma quantidade inteira não negativa. Quando
  informada, a soma deve ser igual à quantidade de peças do lote.
- Uma pessoa autorizada para o setor, ou o administrador, pode informar ou
  limpar a grade de um lote recebido e não dividido. Cada alteração confere a
  versão e registra no histórico as grades anterior e posterior.
- Ao dividir um lote com grade, quem envia informa a quantidade de cada tamanho
  em cada oficina. O servidor exige tanto a soma de cada filho quanto a soma de
  cada tamanho do original, na mesma transação da divisão. Sem grade no original,
  os filhos permanecem sem grade.
- Itens e eventos preservam o histórico; a grade de produção não cria nem altera
  tamanhos dos sacos de estoque, que continuam cadastrados separadamente.

## Alternativas e consequências

Copiar a grade integral para cada filho duplicaria quantidades. Dividir sem
informar tamanhos perderia informação conhecida. A distribuição por tamanho
exige mais preenchimento somente quando o lote de origem já tem grade.
