# ADR 0007 — Ativação de produto independente da oferta de estoque

## Status

Accepted

## Contexto

Um produto pode continuar cadastrado e utilizável mesmo sem estoque atual. O
estado de ativação do produto não deve depender de uma oferta nem ser alterado
ao criar, encerrar ou ocultar essa oferta.

## Decisão

`Product` possui o campo booleano `is_active`, iniciado como `true`. A oferta
de estoque continua opcional e mantém seu próprio estado `is_active` para
controlar a exibição da oferta.

O catálogo compartilhado só considera ofertas ativas, com quantidade
disponível e cujo produto também esteja ativo.

## Consequências

Vantagens:

- permite cadastrar produtos ativos sem estoque;
- permite ocultar um produto sem apagar sua oferta;
- mantém as regras de produto e oferta independentes.

Custo:

- o catálogo precisa avaliar os dois estados antes de exibir uma oferta.
