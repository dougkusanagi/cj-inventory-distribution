# ADR 0003 — Classificação pertence à oferta de estoque

## Status

Accepted

## Contexto

As classificações:

- Reposição
- Grade Nova
- Grade Furada

descrevem a situação atual de determinada disponibilidade.

Um mesmo produto pode ser uma grade nova hoje e, depois de parte do estoque sair, aparecer em outro contexto.

Armazenar essa classificação diretamente no produto faria uma característica temporária parecer permanente.

## Decisão

A classificação será armazenada em `StockOffer`.

O produto permanece independente da situação atual do estoque.

## Consequências

Vantagens:

- preserva a identidade do produto;
- permite reutilizar o mesmo produto em diferentes disponibilidades;
- prepara o sistema para histórico e movimentações futuras.

Custo:

- adiciona o conceito de oferta de estoque ao domínio.
