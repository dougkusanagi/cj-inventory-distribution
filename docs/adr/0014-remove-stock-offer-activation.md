# ADR 0014 — Remover a ativação independente da oferta de estoque

## Status

Accepted

## Contexto

O estado `is_active` da oferta duplicava decisões já representadas pelo produto,
pelo tipo e pelos sacos disponíveis. No cadastro, o switch podia descartar uma
nova oferta silenciosamente quando estivesse desligado.

## Decisão

`StockOffer` não terá estado ativo/inativo. Uma oferta existe somente quando o
produto possui sacos cadastrados; encerrar o estoque remove a oferta e seus
sacos. A disponibilidade do catálogo depende de produto ativo, tipo diferente
de Grade Nova e saco positivo ainda não reservado nem consumido.

## Consequências

- o cadastro não possui switch para ativar ou pausar estoque;
- a coluna `stock_offers.is_active`, regras de validação e filtros associados
  são removidos;
- não há preservação de sacos para uma reativação posterior; um novo lote é
  cadastrado quando o estoque voltar.
